import {
	addItemAttachments, addVendorAlias, attachScanDocument, copyItemAttachment, createOrder, failureMessage, getCurrentUser, invalidateOrderData,
	invalidateVendorData, lostConnection, removeAttachment, removeItemAttachment, sendFile, updateOrder
} from '../api/client.js'
import { plural } from '../api/format.js'
import { peek } from '../api/useApi.js'
import { MAX_FILE_MB } from '../components/FileDrop.jsx'
import { languageCode, phrase } from '../language/phrases.js'

/* One save of the order form as a plan, carried out now or once the connection returns (6d). Its
   files (`file`, `sent`, `sending`) live in this tab only; the rest is kept in the browser too. */

export const newSaveKey = () => `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase()
// the server keeps one file per name on a line, so a replacement with the old one's name is sent under another
const renamedName = name => name.replace(/(\.[^.]*)?$/, ' (2)$1')
const renamed = file => new File([file], renamedName(file.name), { type: file.type })
/** A typed name inside a sentence, cut at a word and ended in "…" past `most` letters, so a long
    one never stretches a notice or a toast to many lines. */
export const shortened = (name, most = 32) => {
	const text = String(name ?? '')
	return text.length <= most ? text : `${text.slice(0, most).replace(/\s+\S*$/, '').replace(/[\s,.;:-]+$/, '')}…`
}
/** "a.pdf", "a.pdf and b.jpg", "a.pdf, b.jpg and c.png" */
export const names = list => new Intl.ListFormat(languageCode() ?? 'en', { type: 'conjunction' }).format(list)
// the server's own words for the two refusals, for a file the form refused before sending it
const refusalOf = f => (f.problem === phrase('file.tooLarge') ? phrase('file.refused.tooLarge', { most: MAX_FILE_MB }) : phrase('file.refused.type', { name: f.name }))

/* A receipt's vendor line that was filed under another name becomes that vendor's alias,
   so the next receipt with it matches on its own. */
const learnAlias = (read, order) => {
	const scanned = String(read ?? '').trim()
	if (scanned && order.vendor?.id && scanned.toLowerCase() !== order.vendor.name.toLowerCase())
		addVendorAlias(order.vendor.id, scanned).then(invalidateVendorData).catch(() => {})
}

/** Carries a plan out. Answers `{ kind }`: 'saved' (with `order`, and `lapse`, the sentence for what
    did not go with it), 'offline', 'conflict' (with `theirs`), 'gone' or 'refused' (with `message`). */
export async function writeOrder(plan) {
	let order
	try {
		const body = { ...plan.body, clientKey: plan.key, ...(plan.revision ? { revision: plan.revision } : {}) }
		order = plan.creating ? await createOrder(body) : await updateOrder(plan.orderId, body)
	} catch (e) {
		if (lostConnection(e)) return { kind: 'offline' }
		if (e.status === 409 && e.body?.order) return { kind: 'conflict', theirs: e.body.order }
		// a deleted order stays deleted: the form says so where it stays in view, and offers no second try
		if (e.gone && !plan.creating) return { kind: 'gone', message: e.message }
		return { kind: 'refused', message: failureMessage(e, phrase('order.notSaved')) }
	}
	// the files follow one at a time, each kept or missed on its own (17b); a refusal's own
	// sentence says why, and one without (no connection) is worth trying again
	const missed = []
	const reasons = new Set()
	let retry = false
	const refused = (name, e) => {
		missed.push(name)
		const said = e && failureMessage(e, '')
		if (said) reasons.add(said)
		else if (!e?.signedOut) retry = true
		return null
	}
	let receiptMissed = false, notRemoved = 0
	if (plan.scan) await attachScanDocument(plan.scan.documentKey, order.id).catch(() => { receiptMissed = true })
	// the server keeps one file per name, so a removed one goes before its namesake arrives
	await Promise.all(plan.gone.map(id => removeAttachment(order.id, id).catch(() => { notRemoved++ })))
	// a new photo is stored before the old one goes, so a failed upload leaves the old one (17a)
	await Promise.all(plan.photos.map(async p => {
		const saved = order.items[p.index]
		if (!saved) return
		if (p.copy) {
			const { name, ...from } = p.copy
			await copyItemAttachment(order.id, saved.id, from).catch(e => refused(name, e))
			return
		}
		if (p.name) {
			const twin = p.oldName && sameName(p.oldName, p.name)
			// the photo sent when it was chosen is filed from there; one that did not arrive is sent now
			const upload = p.upload ?? (p.sent ? await p.sent : null)
			if (upload) {
				const put = await attachScanDocument(upload.key, order.id, { as: 'file', item: saved.id, name: twin ? renamedName(p.name) : p.name })
					.catch(e => refused(p.name, e))
				if (!put) return
			} else if (p.file) {
				const sent = await addItemAttachments(order.id, saved.id, [twin ? renamed(p.file) : p.file]).catch(e => refused(p.name, e))
				if (!sent) return
				if (!sent.added?.length) return refused(p.name)
			} else return refused(p.name)
			if (p.oldId) await removeItemAttachment(order.id, saved.id, p.oldId).catch(() => { notRemoved++ })
		} else if (p.oldId && p.drop) await removeItemAttachment(order.id, saved.id, p.oldId).catch(() => { notRemoved++ })
	}))
	for (const f of plan.files) {
		if (f.problem) { missed.push(f.name); reasons.add(refusalOf(f)); continue }
		// one still on its way is waited for; one that did not arrive is sent once more
		let upload = f.upload ?? (f.sending ? await f.sending : null)
		if (!upload && f.file) upload = await sendFile(f.file).catch(() => null)
		if (!upload) { refused(f.name); continue }
		await attachScanDocument(upload.key, order.id, { as: 'file', name: f.name }).catch(e => refused(f.name, e))
	}
	if (plan.scan) learnAlias(plan.scan.vendor, order)
	invalidateOrderData()
	const lapses = [
		missed.length ? phrase('order.lapse.notAdded', { count: missed.length, names: names(missed) }) : null,
		receiptMissed ? phrase('order.lapse.receipt') : null,
		notRemoved ? phrase('order.lapse.notRemoved', { count: notRemoved, files: plural(notRemoved, 'file') }) : null
	].filter(Boolean)
	if (receiptMissed || notRemoved) retry = true
	const lapse = lapses.length
		? [phrase('order.savedBut', { lapses: names(lapses) }), ...reasons, retry ? phrase('order.tryFromEdit') : null].filter(Boolean).join(' ')
		: null
	return { kind: 'saved', order, lapse }
}

/* ---- saves waiting for the connection ---- */

const STORE = 'spendly:outbox:'
const RETRY_MS = 20000
const user = () => peek(getCurrentUser)?.id ?? null
let waiting = []
let loadedFor = null
let flushing = null
let timer = 0
// the open form that answers for a save, by its key; with none, the shell's toast does (SavedLater.jsx)
const owners = new Map()
const watchers = new Set()

// what survives a closed tab: no file bytes and no promise, only what the server already holds
const storable = plan => ({
	...plan,
	photos: plan.photos.map(({ file, sent, ...p }) => p),
	files: plan.files.map(({ file, sending, ...f }) => f)
})
const store = () => {
	const who = user()
	if (!who) return
	try {
		const mine = waiting.filter(w => w.user === who).map(w => ({ ...w, plan: storable(w.plan) }))
		if (mine.length) localStorage.setItem(STORE + who, JSON.stringify(mine))
		else localStorage.removeItem(STORE + who)
	} catch { /* storage denied: kept in this tab only */ }
}
const load = () => {
	const who = user()
	if (!who || loadedFor === who) return
	loadedFor = who
	try {
		const kept = JSON.parse(localStorage.getItem(STORE + who)) ?? []
		for (const entry of kept) if (!waiting.some(w => w.key === entry.key)) waiting.push({ ...entry, state: 'waiting' })
	} catch { /* nothing kept */ }
}
const changed = () => { store(); for (const fn of watchers) fn() }
const later = () => {
	clearTimeout(timer)
	if (waiting.some(w => w.state === 'waiting')) timer = setTimeout(flushOutbox, RETRY_MS)
}

/** Keeps a save that found no connection until it can be sent. Its photos and files still on
    their way are waited for first, so what is kept names what the server holds. */
export async function queueSave(plan) {
	waiting = waiting.filter(w => w.key !== plan.key && !(plan.orderId && w.plan.orderId === plan.orderId && w.state !== 'sending'))
	waiting.push({ key: plan.key, user: user(), plan, state: 'waiting', at: Date.now() })
	changed()
	later()
	const photos = await Promise.all(plan.photos.map(async p => ({ ...p, upload: p.upload ?? (p.sent ? await p.sent : null) })))
	const files = await Promise.all(plan.files.map(async f => ({ ...f, upload: f.upload ?? (f.sending ? await f.sending : null) })))
	const entry = waiting.find(w => w.key === plan.key)
	if (entry) { entry.plan = { ...entry.plan, photos, files }; store() }
}

/** Drops a waiting save: its form saved again, or the reader threw it away. */
export function dropSave(key) {
	waiting = waiting.filter(w => w.key !== key)
	changed()
}

/** The saves waiting for this account, oldest first: 'waiting', 'sending', or 'stuck' on a newer copy. */
export const waitingSaves = () => { load(); return waiting.filter(w => w.user === user()) }

/** A change to `orderId` that met a newer copy while no form was open, to be asked about (6d). */
export const stuckSaveFor = orderId => waitingSaves().find(w => w.state === 'stuck' && w.plan.orderId === orderId) ?? null

/** `fn(outcome)` hears how the waiting save `key` went, instead of the shell; returns the way to stop. */
export function ownSave(key, fn) {
	owners.set(key, fn)
	return () => { if (owners.get(key) === fn) owners.delete(key) }
}

/** `fn({ key, plan, outcome })` hears a save sent with no form to answer for it. */
const orphans = new Set()
export function onOrphanSaved(fn) {
	orphans.add(fn)
	return () => orphans.delete(fn)
}

/** `fn()` hears when the waiting saves change. */
export function watchOutbox(fn) {
	watchers.add(fn)
	return () => watchers.delete(fn)
}

/** Sends every waiting save of this account, oldest first; stops at the first that still finds no
    connection. Answers once they are all tried. */
export function flushOutbox() {
	if (flushing) return flushing
	load()
	flushing = (async () => {
		for (const entry of waitingSaves()) {
			if (entry.state !== 'waiting') continue
			entry.state = 'sending'
			changed()
			const outcome = await writeOrder(entry.plan)
			if (outcome.kind === 'offline') { entry.state = 'waiting'; changed(); break }
			const owner = owners.get(entry.key)
			// with no form open, a change that meets a newer copy is kept until its form opens and asks
			if (outcome.kind === 'conflict' && !owner) entry.state = 'stuck'
			else waiting = waiting.filter(w => w !== entry)
			changed()
			if (owner) owner(outcome)
			else for (const fn of orphans) fn({ key: entry.key, plan: entry.plan, outcome })
		}
	})().finally(() => { flushing = null; later() })
	return flushing
}

if (typeof window !== 'undefined') window.addEventListener('online', () => { flushOutbox() })
