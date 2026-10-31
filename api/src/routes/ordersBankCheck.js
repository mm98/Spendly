import { Router } from 'express'
import { db } from '../db.js'
import { fromEpoch, nowEpoch, toEpoch } from '../lib/dates.js'
import { MONEY_BACK_KINDS } from '../lib/constants.js'
import { newId } from '../lib/ids.js'
import { vendorKey } from '../lib/names.js'
import { vendorResolver } from '../lib/findOrCreate.js'
import { BUDGET_TEXT, budgetText } from '../lib/validate.js'
import { words } from '../lib/phrases.js'
import { createOrderRecord } from './orders.js'

/* The bank check pointed at orders (Order list 2j): the orders a file's days can match, the vendor
   each bank text suggests, what was left out, and the orders created for payments with none. */
export const router = Router()

const refuse = (status, message) => Object.assign(new Error(message), { status })

// the most days a payment may come after its order, the end of the page's slider (ORDER_MATCH in react/src/api/bankStatement.js)
export const MATCH_DAYS = 10
const DAY = 24 * 60 * 60
const MAX_TEXTS = 5000
const MAX_CREATE = 1000
// a bank text's words shorter than this never suggest a vendor on their own
const MIN_KEY = 3
// Undo of a Create is offered for seconds; past this the orders are ordinary orders
const UNDO_SECONDS = 15 * 60

const isoDay = value => {
	const text = String(value ?? '')
	if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text + 'T00:00:00Z'))) throw refuse(400, words('order.dateNeeded'))
	return text
}

/* ---- what was left out ---- */

const selectLeftOut = db.prepare('SELECT pattern FROM order_bank_left_out WHERE user_id = ?').pluck()
const insertLeftOut = db.prepare('INSERT OR IGNORE INTO order_bank_left_out (user_id, pattern) VALUES (?, ?)')
const deleteLeftOut = db.prepare('DELETE FROM order_bank_left_out WHERE user_id = ? AND pattern = ?')
const leftOut = req => ({ patterns: selectLeftOut.all(req.user.id) })
const patternOf = value => budgetText(value, BUDGET_TEXT.payment)

router.get('/left-out', (req, res) => res.json(leftOut(req)))

router.put('/left-out', (req, res) => {
	const patterns = Array.isArray(req.body?.patterns) ? req.body.patterns.slice(0, MAX_TEXTS).map(patternOf) : []
	db.transaction(() => { for (const p of patterns) insertLeftOut.run(req.user.id, p) })()
	res.json(leftOut(req))
})

router.delete('/left-out', (req, res) => {
	const patterns = Array.isArray(req.body?.patterns) ? req.body.patterns.slice(0, MAX_TEXTS).map(patternOf) : []
	db.transaction(() => { for (const p of patterns) deleteLeftOut.run(req.user.id, p) })()
	res.json(leftOut(req))
})

/* ---- the orders a file can match, and the vendor each text suggests ---- */

const selectOrdersInSpan = db.prepare(`SELECT o.id, o.date, o.total, o.reference, o.item_count, o.reconciled_at, v.name AS vendor
	FROM orders o JOIN vendors v ON v.id = o.vendor_id
	WHERE o.user_id = @userId AND o.date BETWEEN @from AND @to AND o.kind NOT IN (${MONEY_BACK_KINDS.map(k => `'${k}'`).join(', ')})
	ORDER BY o.date DESC, o.id DESC`)
const selectVendorNames = db.prepare('SELECT id, name FROM vendors WHERE user_id = ? AND archived = 0')
const selectAliasNames = db.prepare(`SELECT a.vendor_id AS id, a.name FROM vendor_aliases a JOIN vendors v ON v.id = a.vendor_id
	WHERE a.user_id = ? AND v.archived = 0`)
const selectVendorName = db.prepare('SELECT name FROM vendors WHERE id = ? AND user_id = ?').pluck()

/** Each bank text's suggested vendor, and its `owner` when the text already is a vendor's name or other
    name. A text suggests a vendor whose name its words hold, compared as vendor keys (5h); the longest wins. */
function suggestVendors(userId, texts) {
	const resolve = vendorResolver(userId)
	const names = new Map()
	for (const row of [...selectVendorNames.all(userId), ...selectAliasNames.all(userId)]) {
		const key = vendorKey(row.name)
		if (key && key.length >= MIN_KEY && !names.has(key)) names.set(key, row.id)
	}
	const nameOf = new Map()
	const vendorName = id => {
		if (!nameOf.has(id)) nameOf.set(id, selectVendorName.get(id, userId) ?? null)
		return nameOf.get(id)
	}
	return texts.map(text => {
		const found = resolve(text)
		if (found) return { text, vendor: vendorName(found.id), owner: vendorName(found.id), byAlias: Boolean(found.alias) }
		const parts = vendorKey(text).split(' ').filter(Boolean)
		for (let size = parts.length; size > 0; size--) {
			for (let at = 0; at + size <= parts.length; at++) {
				const id = names.get(parts.slice(at, at + size).join(' '))
				if (id) return { text, vendor: vendorName(id), owner: null, byAlias: false }
			}
		}
		return { text, vendor: null, owner: null, byAlias: false }
	})
}

router.post('/check', (req, res) => {
	const from = isoDay(req.body?.from)
	const to = isoDay(req.body?.to)
	const texts = Array.isArray(req.body?.texts) ? [...new Set(req.body.texts.map(t => String(t ?? '').trim()))].slice(0, MAX_TEXTS) : []
	const orders = selectOrdersInSpan.all({ userId: req.user.id, from: toEpoch(from) - MATCH_DAYS * DAY, to: toEpoch(to) })
		.map(o => ({
			id: o.id, date: fromEpoch(o.date), total: o.total, reference: o.reference, itemCount: o.item_count, vendor: o.vendor,
			reconciled: o.reconciled_at == null ? null : fromEpoch(o.reconciled_at)
		}))
	res.json({ orders, vendors: suggestVendors(req.user.id, texts.filter(Boolean)) })
})

/* ---- the day an order was matched to a payment ---- */

const markReconciled = db.prepare('UPDATE orders SET reconciled_at = ? WHERE id = ? AND user_id = ? AND reconciled_at IS NULL')

router.post('/reconciled', (req, res) => {
	const orders = (Array.isArray(req.body?.orders) ? req.body.orders : []).slice(0, MAX_TEXTS).map(String)
	const day = toEpoch(req.today)
	const marked = db.transaction(() => orders.reduce((n, id) => n + markReconciled.run(day, id, req.user.id).changes, 0))()
	res.json({ marked })
})

/* ---- creating the orders, and its Undo ---- */

const selectDefaults = db.prepare('SELECT default_kind, default_status FROM user_settings WHERE user_id = ?')
const selectVendorDefaults = db.prepare(`SELECT c.name FROM vendor_default_categories d JOIN categories c ON c.id = d.category_id
	WHERE d.vendor_id = ? AND c.user_id = ? ORDER BY c.name`).pluck()
const selectExcludes = db.prepare('SELECT default_exclude_from_stats FROM vendors WHERE id = ? AND user_id = ?').pluck()
const selectOrderVendor = db.prepare('SELECT vendor_id FROM orders WHERE id = ? AND user_id = ?').pluck()
const selectAliasOwner = db.prepare('SELECT vendor_id FROM vendor_aliases WHERE user_id = ? AND lower(name) = lower(?)').pluck()
const insertAlias = db.prepare(`INSERT INTO vendor_aliases (id, user_id, vendor_id, name, matched_at)
	VALUES (?, ?, ?, ?, unixepoch())`)
const moveAlias = db.prepare('UPDATE vendor_aliases SET vendor_id = ? WHERE user_id = ? AND lower(name) = lower(?)')
const deleteAlias = db.prepare('DELETE FROM vendor_aliases WHERE user_id = ? AND vendor_id = ? AND lower(name) = lower(?)')
const selectCreated = db.prepare('SELECT created_at FROM orders WHERE id = ? AND user_id = ?').pluck()
const deleteOrder = db.prepare('DELETE FROM orders WHERE id = ? AND user_id = ?')
const deleteMadeVendor = db.prepare(`DELETE FROM vendors WHERE user_id = ? AND made_by_order = ?
	AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.vendor_id = vendors.id)`)

const createAll = db.transaction((userId, today, payments, keep) => {
	const settings = selectDefaults.get(userId)
	const before = vendorResolver(userId)
	const created = []
	for (const p of payments) {
		const known = before(p.vendor)
		const id = createOrderRecord(userId, {
			vendor: p.vendor, date: p.date, kind: settings?.default_kind ?? 'Expense', status: settings?.default_status ?? undefined,
			categories: known ? selectVendorDefaults.all(known.id, userId) : [],
			excludeFromStats: known ? Boolean(selectExcludes.get(known.id, userId)) : false,
			items: [{ title: p.text.slice(0, 120) || p.vendor, quantity: 1, price: p.total }]
		}, today)
		markReconciled.run(toEpoch(today), id, userId)
		created.push({ id, payment: p.payment, vendorId: selectOrderVendor.get(id, userId) })
	}
	// read again, so a vendor these orders made is found
	const resolve = vendorResolver(userId)
	// a kept text another vendor's own name holds cannot be another name, so it is left as it is
	const names = []
	for (const k of keep) {
		const vendorId = resolve(k.vendor)?.id
		if (!vendorId) continue
		const owner = selectAliasOwner.get(userId, k.text)
		if (owner === vendorId) continue
		const named = resolve(k.text)
		if (named && !named.alias && named.id !== vendorId) continue
		if (owner && !k.move) continue
		if (owner) moveAlias.run(vendorId, userId, k.text)
		else insertAlias.run(newId('va'), userId, vendorId, k.text)
		names.push({ text: k.text, vendorId, from: owner ?? null })
	}
	return { created, names }
})

router.post('/create', (req, res) => {
	const raw = Array.isArray(req.body?.orders) ? req.body.orders : []
	if (!raw.length) throw refuse(400, words('order.chooseOne'))
	if (raw.length > MAX_CREATE) throw refuse(400, words('order.tooMany'))
	const payments = raw.map(p => ({
		payment: String(p?.payment ?? ''), date: isoDay(p?.date), total: Math.round(Math.abs(Number(p?.total)) * 100) / 100,
		vendor: String(p?.vendor ?? '').trim(), text: String(p?.text ?? '').trim()
	}))
	if (payments.some(p => !p.vendor)) throw refuse(400, words('order.vendorMissing'))
	const keep = (Array.isArray(req.body?.keep) ? req.body.keep : []).slice(0, MAX_CREATE)
		.map(k => ({ text: patternOf(k?.text), vendor: String(k?.vendor ?? '').trim(), move: k?.move === true }))
		.filter(k => k.text && k.vendor)
	const { created, names } = createAll(req.user.id, req.today, payments, keep)
	res.status(201).json({
		orders: created.map(c => ({ payment: c.payment, id: c.id })),
		undo: { orders: created.map(c => c.id), names }
	})
})

/* Undo deletes the orders a Create made, the vendors they made, and puts every other name back
   where it was. Only orders made moments ago: an older one is the reader's to delete. */
const undoAll = db.transaction((userId, orders, names) => {
	// names first: a name moved to a vendor these orders made would go with that vendor
	for (const n of names) {
		if (n.from) moveAlias.run(n.from, userId, n.text)
		else deleteAlias.run(userId, n.vendorId, n.text)
	}
	let deleted = 0
	for (const id of orders) {
		const made = selectCreated.get(id, userId)
		if (made == null || nowEpoch() - made > UNDO_SECONDS) continue
		deleted += deleteOrder.run(id, userId).changes
		deleteMadeVendor.run(userId, id)
	}
	return deleted
})

router.post('/undo', (req, res) => {
	const orders = (Array.isArray(req.body?.orders) ? req.body.orders : []).slice(0, MAX_CREATE).map(String)
	const names = (Array.isArray(req.body?.names) ? req.body.names : []).slice(0, MAX_CREATE)
		.map(n => ({ text: String(n?.text ?? ''), vendorId: String(n?.vendorId ?? ''), from: n?.from ? String(n.from) : null }))
		.filter(n => n.text && n.vendorId)
	res.json({ deleted: undoAll(req.user.id, orders, names) })
})
