import { db } from '../db.js'
import { DIM, FALLBACK_ID, embedder } from './embed.js'
import { resolveVendor } from './findOrCreate.js'
import { foldName } from './names.js'

/* The categories an account files items like these under, learned from its own orders: an item name is
   a vector, and a new item takes the labels of its nearest neighbours, backed only as far as a held-out check allows. */

export const SHOWN = 3
// the most recent orders learned from, however large the ledger is
const RECENT_ORDERS = 3000
const MAX_EXAMPLES = 6000
// neighbours that vote, and the weight of a vote nobody casts: far-off neighbours add little
const NEIGHBOURS = 10
const DOUBT = 0.3
const SAME_VENDOR = 1.5
// below this many labelled items there is nothing to learn from
const MIN_EXAMPLES = 30
// the held-out check: this many items, and the share of its suggestions that must be right
const CHECKED = 150
const TARGET_PRECISION = 0.8
const MIN_SUGGESTED = 15
const BATCH = 32
const KEY_MAX = 120
const FRESH_MS = 5 * 60 * 1000
const MAX_ACCOUNTS = 8

const selectRecentOrders = db.prepare('SELECT id FROM orders WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ?')
const selectVendorsOf = db.prepare('SELECT id, vendor_id FROM orders WHERE user_id = ? AND id IN (SELECT value FROM json_each(?))')
const selectItemsOf = db.prepare(`SELECT oi.order_id, oi.title FROM order_items oi JOIN orders o ON o.id = oi.order_id
	WHERE o.user_id = ? AND oi.order_id IN (SELECT value FROM json_each(?))`)
const selectLabelsOf = db.prepare(`SELECT oc.order_id, oc.category_id FROM order_categories oc
	JOIN categories c ON c.id = oc.category_id WHERE c.user_id = ? AND oc.order_id IN (SELECT value FROM json_each(?))`)
const selectVectors = db.prepare('SELECT key, vec FROM title_vectors WHERE user_id = ? AND model = ? AND key IN (SELECT value FROM json_each(?))')
const insertVector = db.prepare('INSERT OR REPLACE INTO title_vectors (user_id, model, key, vec) VALUES (?, ?, ?, ?)')
const selectVectorUsers = db.prepare('SELECT DISTINCT user_id FROM title_vectors')
const deleteVectorsBut = db.prepare(`DELETE FROM title_vectors WHERE user_id = @userId
	AND (model <> @model OR key NOT IN (SELECT value FROM json_each(@keys)))`)
const selectNames = db.prepare('SELECT id, name FROM categories WHERE user_id = ? AND id IN (SELECT value FROM json_each(?))')

const keyOf = title => foldName(title).slice(0, KEY_MAX)
const toBlob = v => Buffer.from(v.buffer, v.byteOffset, v.byteLength)
const fromBlob = b => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
const breathe = () => new Promise(resolve => setImmediate(resolve))

// one thing is embedded at a time, so a first run over a long ledger does not take every core
let queue = Promise.resolve()
const inQueue = job => { const run = queue.then(job, job); queue = run.catch(() => {}); return run }

/** The vectors of these names (key → vector), embedding and keeping the ones not kept yet. */
async function vectorsOf(userId, emb, titles) {
	const found = new Map()
	const keys = [...titles.keys()]
	for (const row of selectVectors.all(userId, emb.id, JSON.stringify(keys))) found.set(row.key, fromBlob(row.vec))
	const missing = keys.filter(k => !found.has(k))
	for (let i = 0; i < missing.length; i += BATCH) {
		const chunk = missing.slice(i, i + BATCH)
		const vectors = await inQueue(() => emb.embed(chunk.map(k => titles.get(k))))
		db.transaction(() => chunk.forEach((k, j) => insertVector.run(userId, emb.id, k, toBlob(vectors[j]))))()
		chunk.forEach((k, j) => found.set(k, vectors[j]))
	}
	return found
}

const warming = new Set()
/** Embeds the names an account has not had embedded yet, off the request, and drops its state when done. */
function warm(userId, emb, titles) {
	const id = `${userId} ${emb.id}`
	if (warming.has(id) || !titles.size) return
	warming.add(id)
	vectorsOf(userId, emb, titles)
		.catch(error => console.error('Embedding item names failed:', error.message))
		.finally(() => { warming.delete(id); forgetModel(userId) })
}

/** The items an account learns from: the labelled lines of its most recent orders, with their labels. */
function examplesOf(userId) {
	const orders = selectRecentOrders.all(userId, RECENT_ORDERS)
	const ids = JSON.stringify(orders.map(o => o.id))
	const labels = new Map()
	for (const r of selectLabelsOf.all(userId, ids)) (labels.get(r.order_id) ?? labels.set(r.order_id, []).get(r.order_id)).push(r.category_id)
	const items = selectItemsOf.all(userId, ids).filter(r => labels.has(r.order_id) && keyOf(r.title)).slice(0, MAX_EXAMPLES)
	return { ids, labels, items }
}

// the model the suggestions last ran on; the word shapes stand in only while it loads
let modelInUse = null

/** Drops the kept vectors no account learns from any more: titles past its examples, or another model's. */
export function pruneVectors() {
	if (!modelInUse) return
	for (const { user_id: userId } of selectVectorUsers.all()) {
		const keys = [...new Set(examplesOf(userId).items.map(r => keyOf(r.title)))]
		deleteVectorsBut.run({ userId, model: modelInUse, keys: JSON.stringify(keys) })
	}
}

/** One account's examples as one block of numbers: row i is item i, labelled by its order's categories. */
async function buildState(userId, emb) {
	if (emb.id !== FALLBACK_ID) modelInUse = emb.id
	const { ids, labels, items } = examplesOf(userId)
	const vendorOf = new Map(selectVendorsOf.all(userId, ids).map(o => [o.id, o.vendor_id]))
	const titles = new Map(items.map(r => [keyOf(r.title), r.title]))
	const known = new Map()
	for (const row of selectVectors.all(userId, emb.id, JSON.stringify([...titles.keys()]))) known.set(row.key, fromBlob(row.vec))
	// what is not embedded yet is embedded in the background, and the account learns from the rest meanwhile
	warm(userId, emb, new Map([...titles].filter(([k]) => !known.has(k))))
	const rows = items.filter(r => known.has(keyOf(r.title)))
	const state = {
		n: rows.length, flat: new Float32Array(rows.length * DIM), labels: [], vendor: [], order: [], threshold: null, checked: null
	}
	rows.forEach((r, i) => {
		state.flat.set(known.get(keyOf(r.title)), i * DIM)
		state.labels.push(new Set(labels.get(r.order_id)))
		state.vendor.push(vendorOf.get(r.order_id) ?? null)
		state.order.push(r.order_id)
	})
	if (state.n >= MIN_EXAMPLES) await calibrate(state)
	return state
}

/** How strongly the account's examples back each category for an item vector: category → 0..1. */
function backing(state, vec, vendorId, skipOrder) {
	const top = []
	for (let i = 0; i < state.n; i++) {
		if (state.order[i] === skipOrder) continue
		let dot = 0
		const base = i * DIM
		for (let d = 0; d < DIM; d++) dot += state.flat[base + d] * vec[d]
		if (top.length < NEIGHBOURS || dot > top[top.length - 1][0]) {
			let at = top.length
			while (at > 0 && top[at - 1][0] < dot) at--
			top.splice(at, 0, [dot, i])
			if (top.length > NEIGHBOURS) top.pop()
		}
	}
	const votes = new Map()
	let total = DOUBT
	for (const [sim, i] of top) {
		const weight = Math.max(0, sim) ** 4 * (vendorId && state.vendor[i] === vendorId ? SAME_VENDOR : 1)
		total += weight
		for (const c of state.labels[i]) votes.set(c, (votes.get(c) ?? 0) + weight)
	}
	for (const [c, v] of votes) votes.set(c, v / total)
	return votes
}

const best = (votes, n) => [...votes].sort((a, b) => b[1] - a[1]).slice(0, n)

/** The held-out check: items from other orders predict each checked item, and the lowest backing at
    which at least TARGET_PRECISION of what was suggested was right becomes the account's bar. */
async function calibrate(state) {
	const pairs = []
	const step = Math.max(1, Math.floor(state.n / CHECKED))
	for (let i = 0, done = 0; i < state.n; i += step, done++) {
		if (done % 10 === 9) await breathe()
		const votes = backing(state, state.flat.subarray(i * DIM, (i + 1) * DIM), state.vendor[i], state.order[i])
		for (const [c, score] of best(votes, SHOWN)) pairs.push([score, state.labels[i].has(c)])
	}
	pairs.sort((a, b) => b[0] - a[0])
	let right = 0, bar = null, rightAtBar = 0
	pairs.forEach(([score, ok], k) => {
		if (ok) right++
		if (k + 1 >= MIN_SUGGESTED && right / (k + 1) >= TARGET_PRECISION) { bar = score; rightAtBar = right }
	})
	state.threshold = bar
	state.checked = { items: Math.ceil(state.n / step), suggested: bar === null ? 0 : pairs.filter(p => p[0] >= bar).length, right: rightAtBar }
}

/** Resolves once nothing is being embedded in the background. */
export async function idle() {
	while (warming.size) await new Promise(resolve => setTimeout(resolve, 20))
	await queue
}

const states = new Map()
/** Drops what an account's model was learned from, once an order or category has changed. */
export const forgetModel = userId => { states.delete(userId) }

async function stateFor(userId, emb) {
	const held = states.get(userId)
	if (held && held.model === emb.id && Date.now() - held.at < FRESH_MS) return held.state
	const state = await buildState(userId, emb)
	states.delete(userId)
	states.set(userId, { model: emb.id, at: Date.now(), state })
	while (states.size > MAX_ACCOUNTS) states.delete(states.keys().next().value)
	return state
}

/** The state an account's model stands in, for the check script: what it learned from and how sure it can be. */
export async function standing(userId) {
	const emb = await embedder()
	const state = await stateFor(userId, emb)
	return { embedder: emb.id, examples: state.n, threshold: state.threshold, checked: state.checked }
}

/** Up to SHOWN category names for these item names, the ones the account's own orders back strongly enough. */
export async function suggestFromHistory(userId, { items, vendor, exclude }) {
	const wanted = new Map()
	for (const t of Array.isArray(items) ? items : []) { const key = keyOf(String(t ?? '')); if (key) wanted.set(key, String(t)) }
	if (!wanted.size) return []
	const emb = await embedder()
	const state = await stateFor(userId, emb)
	if (state.threshold === null) return []
	const vendorId = vendor ? resolveVendor(userId, vendor)?.id ?? null : null
	const vectors = await vectorsOf(userId, emb, wanted)
	const strongest = new Map()
	for (const key of wanted.keys()) {
		for (const [c, s] of backing(state, vectors.get(key), vendorId, null)) if (s >= state.threshold) strongest.set(c, Math.max(strongest.get(c) ?? 0, s))
	}
	const skip = new Set((Array.isArray(exclude) ? exclude : []).map(n => foldName(String(n ?? ''))))
	const named = new Map(selectNames.all(userId, JSON.stringify([...strongest.keys()])).map(r => [r.id, r.name]))
	return best(strongest, strongest.size).map(([c]) => named.get(c)).filter(n => n && !skip.has(foldName(n))).slice(0, SHOWN)
}
