import { Router } from 'express'
import { db } from '../db.js'
import { decorateOrderListRows } from '../lib/decorate.js'
import { orderTotalsSelectList } from '../lib/orderColumns.js'
import { keyOfType } from '../lib/statuses.js'
import { discardDraft, draftListRow, draftRow, draftsAsOrders, keepForm, makeDraft } from '../lib/orderDrafts.js'

/* Orders not created yet (lib/orderDrafts.js): the form kept as it is edited, Discard, and Home's
   Drafts card, which counts the orders whose status is Draft as drafts too (10a). */
export const router = Router()

const selectDraftOrders = db.prepare(`SELECT ${orderTotalsSelectList()}, created_at, rowid AS seq FROM orders
	WHERE user_id = ? AND status = ? ORDER BY created_at DESC, rowid DESC LIMIT ?`)
const countDraftOrders = db.prepare('SELECT COUNT(*) c FROM orders WHERE user_id = ? AND status = ?')
const MOST = 10

/** The newest drafts, newest started first, and how many there are in all. */
router.get('/', (req, res) => {
	const limit = Math.min(Math.max(1, Number(req.query.limit) || 3), MOST)
	const status = keyOfType(req.user.id, 'draft')
	const kept = draftsAsOrders(req.user.id)
	const orders = selectDraftOrders.all(req.user.id, status, limit)
	const decorated = decorateOrderListRows(orders, { listRows: true })
	// two started in the same second keep the order they were started in
	const rows = [
		...kept.map(d => ({ at: d.sort.created, seq: d.sort.seq, row: draftListRow(d, { listRows: true }) })),
		...orders.map((o, i) => ({ at: o.created_at, seq: o.seq, row: decorated[i] }))
	].sort((a, b) => b.at - a.at || b.seq - a.seq).slice(0, limit).map(r => r.row)
	res.json({ drafts: rows, total: kept.length + countDraftOrders.get(req.user.id, status).c })
})

/** A draft made by hand, at the form's first change (3a): `{ id }`. */
router.post('/', (req, res) => {
	res.status(201).json({ id: makeDraft(req.user.id, req.body?.form) })
})

/** One draft as it was left, to open it again: its form, and its file when it came from a scan. */
router.get('/:id', (req, res) => {
	const row = draftRow(req.user.id, req.params.id)
	if (!row) return res.status(404).json({ error: 'No draft ' + req.params.id })
	let form = null
	try { form = row.form ? JSON.parse(row.form) : null } catch { /* a form that cannot be read opens empty */ }
	res.json({
		id: row.id, form,
		file: row.upload_id ? { key: row.upload_id, name: row.name, kind: row.kind, hasThumbnail: Boolean(row.has_thumbnail) } : null
	})
})

/** The form as it is on screen (3a): written as it is edited, so leaving keeps it. */
router.put('/:id', (req, res) => {
	if (!keepForm(req.user.id, req.params.id, req.body?.form)) return res.status(404).json({ error: 'No draft ' + req.params.id })
	res.json({ id: req.params.id })
})

/** Discard (6d): the draft and its file go. */
router.delete('/:id', (req, res) => {
	if (!discardDraft(req.user.id, req.params.id)) return res.status(404).json({ error: 'No draft ' + req.params.id })
	res.json({ id: req.params.id })
})
