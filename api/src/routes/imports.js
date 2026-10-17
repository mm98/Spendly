import { Router } from 'express'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { nowEpoch, toEpoch } from '../lib/dates.js'
import { findVendorIdByAnyName } from '../lib/findOrCreate.js'

/* The imports an account has run (Settings 11b): the list under the file picker, the record an
   import's orders are tagged with, its undo and what the undo deletes, a line removed from the list,
   and the check for orders already in the account. */
export const router = Router()

// undo is offered this long after an import; after that its orders are ordinary orders
export const UNDO_SECONDS = 24 * 60 * 60
const RECENT = 5
const MAX_MAPPING = 20000

const selectRecent = db.prepare(`SELECT id, file_name, mapping, orders, lines, skipped, vendors, created_at, undone_at
	FROM order_imports WHERE user_id = ? AND hidden_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT ?`)
const selectOne = db.prepare('SELECT id, file_name, orders, created_at, undone_at FROM order_imports WHERE id = ? AND user_id = ?')
const insertImport = db.prepare(`INSERT INTO order_imports (id, user_id, file_name, mapping, skipped, created_at) VALUES (?, ?, ?, ?, ?, ?)`)

const undoable = row => !row.undone_at && row.orders > 0 && nowEpoch() - row.created_at < UNDO_SECONDS

const toApi = row => ({
	id: row.id, fileName: row.file_name, mapping: row.mapping ? JSON.parse(row.mapping) : null,
	orders: row.orders, lines: row.lines, skipped: row.skipped, vendors: row.vendors,
	createdAt: row.created_at, undone: Boolean(row.undone_at), undoable: undoable(row)
})

router.get('/', (req, res) => {
	res.json(selectRecent.all(req.user.id, RECENT).map(toApi))
})

// one import by id, for the order list's chip (2b): its date, however old it is, and hidden or not
router.get('/:id', (req, res) => {
	const row = selectOne.get(req.params.id, req.user.id)
	if (!row) return res.status(404).json({ error: 'That import is not in this account.' })
	res.json({ id: row.id, createdAt: row.created_at })
})

router.post('/', (req, res) => {
	const fileName = String(req.body?.fileName ?? '').trim().slice(0, 200) || 'Imported file'
	const mapping = req.body?.mapping != null ? JSON.stringify(req.body.mapping) : null
	if (mapping && mapping.length > MAX_MAPPING) return res.status(400).json({ error: 'That column mapping is too large to keep.' })
	// rows the page could not read at all; the ones the server refuses are added as they come
	const skipped = Math.max(0, Math.floor(Number(req.body?.skipped) || 0))
	const id = newId('im')
	insertImport.run(id, req.user.id, fileName, mapping, skipped, nowEpoch())
	res.status(201).json({ id })
})

/* A line removed from Previous imports, or put back by its toast's Undo. A line still offering its
   own Undo keeps it: it can be removed once that has gone. */
const setHidden = db.prepare('UPDATE order_imports SET hidden_at = ? WHERE id = ?')
router.patch('/:id', (req, res) => {
	const row = selectOne.get(req.params.id, req.user.id)
	if (!row) return res.status(404).json({ error: 'That import is not in this account.' })
	if (typeof req.body?.hidden !== 'boolean') return res.status(400).json({ error: 'Say whether the import is hidden.' })
	if (req.body.hidden && undoable(row)) return res.status(409).json({ error: 'That import can still be undone. It can be removed from the list after 24 hours.' })
	setHidden.run(req.body.hidden ? nowEpoch() : null, row.id)
	res.status(204).end()
})

/* What an undo deletes, counted now, for the question Undo asks first: the vendors and categories
   counted are those nothing outside the import uses. */
const countUndoOrders = db.prepare(`SELECT COUNT(*) AS orders, COALESCE(SUM(item_count), 0) AS lines,
	COALESCE(SUM(revision > import_revision), 0) AS changed
	FROM orders WHERE user_id = ? AND import_id = ?`)
const countUndoVendors = db.prepare(`SELECT COUNT(*) FROM vendors WHERE user_id = @userId AND import_id = @id
	AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.vendor_id = vendors.id AND o.import_id IS NOT @id)`).pluck()
const countUndoCategories = db.prepare(`SELECT COUNT(*) FROM categories WHERE user_id = @userId AND import_id = @id
	AND NOT EXISTS (SELECT 1 FROM order_categories oc JOIN orders o ON o.id = oc.order_id
		WHERE oc.category_id = categories.id AND o.import_id IS NOT @id)
	AND NOT EXISTS (SELECT 1 FROM bookmark_categories bc WHERE bc.category_id = categories.id)`).pluck()
router.get('/:id/undo', (req, res) => {
	const row = selectOne.get(req.params.id, req.user.id)
	if (!row) return res.status(404).json({ error: 'That import is not in this account.' })
	const counts = countUndoOrders.get(req.user.id, row.id)
	const vendors = countUndoVendors.get({ userId: req.user.id, id: row.id })
	const categories = countUndoCategories.get({ userId: req.user.id, id: row.id })
	res.json({ fileName: row.file_name, createdAt: row.created_at, undoable: undoable(row), ...counts, vendors, categories })
})

/* Undo: the orders the import wrote, then the vendors and categories it created that nothing
   else uses now. Within UNDO_SECONDS only. */
const deleteOrders = db.prepare('DELETE FROM orders WHERE user_id = ? AND import_id = ?')
const deleteVendors = db.prepare(`DELETE FROM vendors WHERE user_id = ? AND import_id = ?
	AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.vendor_id = vendors.id)`)
const deleteCategories = db.prepare(`DELETE FROM categories WHERE user_id = ? AND import_id = ?
	AND NOT EXISTS (SELECT 1 FROM order_categories oc WHERE oc.category_id = categories.id)
	AND NOT EXISTS (SELECT 1 FROM bookmark_categories bc WHERE bc.category_id = categories.id)`)
const markUndone = db.prepare('UPDATE order_imports SET undone_at = ? WHERE id = ?')
const undo = db.transaction((userId, id) => {
	const orders = deleteOrders.run(userId, id).changes
	const vendors = deleteVendors.run(userId, id).changes
	const categories = deleteCategories.run(userId, id).changes
	markUndone.run(nowEpoch(), id)
	return { orders, vendors, categories }
})

router.delete('/:id', (req, res) => {
	const row = selectOne.get(req.params.id, req.user.id)
	if (!row) return res.status(404).json({ error: 'That import is not in this account.' })
	if (row.undone_at) return res.status(409).json({ error: 'That import was already undone.' })
	if (nowEpoch() - row.created_at >= UNDO_SECONDS)
		return res.status(409).json({ error: 'That import is more than 24 hours old. Its orders are now ordinary orders.' })
	res.json(undo(req.user.id, row.id))
})

/* Which of the file's orders look like ones the account has: the same vendor, the same day and
   the same total. Each is { vendor, date, total }; the answer is their positions. */
const MAX_CHECK = 50000
const sameOrder = db.prepare(`SELECT 1 FROM orders WHERE user_id = ? AND date = ? AND vendor_id = ?
	AND abs(total - ?) < 0.005 LIMIT 1`)
router.post('/check', (req, res) => {
	const orders = Array.isArray(req.body?.orders) ? req.body.orders.slice(0, MAX_CHECK) : []
	const vendorIds = new Map()
	const vendorOf = name => {
		const key = String(name ?? '').trim().toLowerCase()
		if (!vendorIds.has(key)) vendorIds.set(key, key ? findVendorIdByAnyName(req.user.id, key) ?? null : null)
		return vendorIds.get(key)
	}
	const duplicates = []
	orders.forEach((o, index) => {
		const vendorId = vendorOf(o?.vendor)
		const date = /^\d{4}-\d{2}-\d{2}$/.test(String(o?.date)) ? toEpoch(o.date) : null
		const total = Number(o?.total)
		if (vendorId && date != null && Number.isFinite(total) && sameOrder.get(req.user.id, date, vendorId, total)) duplicates.push(index)
	})
	res.json({ duplicates })
})
