import { Router } from 'express'
import { db } from '../db.js'
import { decorateOrderListRows } from '../lib/decorate.js'
import { orderTotalsSelectList } from '../lib/orderColumns.js'
import { keyOfType } from '../lib/statuses.js'
import { discardDraft, draftListRow, draftsAsOrders, keepForm } from '../lib/orderDrafts.js'

/* Orders not created yet (lib/orderDrafts.js): the form kept as it is edited, Discard, and Home's
   Drafts card, which counts the orders whose status is Draft as drafts too (10a). */
export const router = Router()

const selectDraftOrders = db.prepare(`SELECT ${orderTotalsSelectList()}, created_at FROM orders
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
	const rows = [
		...kept.map(d => ({ at: d.sort.created, row: draftListRow(d, { listRows: true }) })),
		...orders.map((o, i) => ({ at: o.created_at, row: decorated[i] }))
	].sort((a, b) => b.at - a.at).slice(0, limit).map(r => r.row)
	res.json({ drafts: rows, total: kept.length + countDraftOrders.get(req.user.id, status).c })
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
