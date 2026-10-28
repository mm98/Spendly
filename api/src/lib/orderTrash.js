import { db } from '../db.js'
import { newId } from './ids.js'

/* A deleted order is kept in memory a while so its toast can undo the delete (6d): never written
   anywhere, so a restart meanwhile only means the order cannot be brought back. Every stored column
   goes back as it was, except the generated ones SQLite computes itself. */
const KEEP_MS = 10 * 60 * 1000   // the toast lasts seconds, but a held one waits for its reader

const writable = table => db.prepare(`SELECT name FROM pragma_table_xinfo('${table}') WHERE hidden = 0`).pluck().all()

const selectOrder = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
const selectItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?')
const selectCategories = db.prepare('SELECT * FROM order_categories WHERE order_id = ?')
const selectStatuses = db.prepare('SELECT * FROM order_status_history WHERE order_id = ?')
const selectFiles = db.prepare(`SELECT a.* FROM order_attachments a WHERE a.order_id = @id
	UNION ALL SELECT a.* FROM order_attachments a JOIN order_items oi ON oi.id = a.order_item_id WHERE oi.order_id = @id`)
const deleteOrderRow = db.prepare('DELETE FROM orders WHERE id = ? AND user_id = ?')
const orderExists = db.prepare('SELECT 1 FROM orders WHERE id = ?')
const vendorExists = db.prepare('SELECT 1 FROM vendors WHERE id = ? AND user_id = ?')
const categoryExists = db.prepare('SELECT 1 FROM categories WHERE id = ? AND user_id = ?')

const restoreValidation = db.prepare('UPDATE orders SET validated_by = ? WHERE id = ?')

const kept = new Map()
// past this many bytes held in all, the oldest copies go, so deleting orders cannot fill the server's memory
const MAX_KEPT_BYTES = 256 * 1024 * 1024
let keptBytes = 0
const bytesOf = rows => rows.files.reduce((sum, file) =>
	sum + Object.values(file).reduce((n, value) => n + (Buffer.isBuffer(value) ? value.length : 0), 0), 0)
const forget = id => {
	const copy = kept.get(id)
	if (!copy) return
	keptBytes -= copy.bytes
	kept.delete(id)
}

/** Deletes the order and keeps a copy to undo it from. Returns the copy's id, or null when there
    was no such order. */
export const trashOrder = db.transaction((userId, orderId) => {
	const order = selectOrder.get(orderId, userId)
	if (!order) return null
	const rows = {
		order,
		items: selectItems.all(orderId),
		categories: selectCategories.all(orderId),
		statuses: selectStatuses.all(orderId),
		files: selectFiles.all({ id: orderId })
	}
	deleteOrderRow.run(orderId, userId)
	const id = newId('t')
	const bytes = bytesOf(rows)
	kept.set(id, { userId, rows, bytes })
	keptBytes += bytes
	while (keptBytes > MAX_KEPT_BYTES && kept.size > 1) forget(kept.keys().next().value)
	setTimeout(() => forget(id), KEEP_MS).unref()
	return id
})

const insertRow = (table, row) => {
	const columns = writable(table).filter(c => c in row)
	db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(c => '@' + c).join(', ')})`).run(row)
}

/** Puts a deleted order back as it was: a 404 when the copy is gone, a 409 when its vendor is. */
export const restoreOrder = db.transaction((userId, trashId) => {
	const copy = kept.get(trashId)
	if (!copy || copy.userId !== userId) throw Object.assign(new Error('This order can no longer be brought back.'), { status: 404 })
	const { rows } = copy
	if (orderExists.get(rows.order.id)) { forget(trashId); return rows.order.id }
	if (!vendorExists.get(rows.order.vendor_id, userId))
		throw Object.assign(new Error('The order could not be brought back: its vendor was deleted.'), { status: 409 })
	// the file it names is put back below, so the validation follows it
	insertRow('orders', { ...rows.order, validated_by: null })
	for (const item of rows.items) insertRow('order_items', item)
	for (const link of rows.categories) if (categoryExists.get(link.category_id, userId)) insertRow('order_categories', link)
	for (const status of rows.statuses) insertRow('order_status_history', status)
	for (const file of rows.files) insertRow('order_attachments', file)
	if (rows.order.validated_by) restoreValidation.run(rows.order.validated_by, rows.order.id)
	forget(trashId)
	return rows.order.id
})

/** Drops every copy the account's deleted orders left to undo from. */
export function forgetTrashOf(userId) {
	for (const [id, copy] of kept) if (copy.userId === userId) forget(id)
}
