import { db } from '../db.js'
import { newId } from './ids.js'

/* A deleted order's rows are kept a while so the delete can be undone (6d). Every stored column
   goes back as it was, except the generated ones SQLite computes itself. */
const KEEP_SECONDS = 60 * 60   // long enough for the toast and a slow reader

const writable = table => db.prepare(`SELECT name FROM pragma_table_xinfo('${table}') WHERE hidden = 0`).pluck().all()

const selectOrder = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
const selectItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?')
const selectCategories = db.prepare('SELECT * FROM order_categories WHERE order_id = ?')
const selectStatuses = db.prepare('SELECT * FROM order_statuses WHERE order_id = ?')
const selectValidation = db.prepare('SELECT * FROM order_validations WHERE order_id = ?')
const selectFiles = db.prepare(`SELECT a.* FROM attachments a WHERE a.order_id = @id
	UNION ALL SELECT a.* FROM attachments a JOIN order_items oi ON oi.id = a.order_item_id WHERE oi.order_id = @id`)
const insertTrash = db.prepare('INSERT INTO order_trash (id, user_id, order_id, rows) VALUES (?, ?, ?, ?)')
const insertTrashFile = db.prepare('INSERT INTO order_trash_files (trash_id, attachment_id, data, thumbnail, original) VALUES (?, ?, ?, ?, ?)')
const deleteOrderRow = db.prepare('DELETE FROM orders WHERE id = ? AND user_id = ?')
const sweep = db.prepare('DELETE FROM order_trash WHERE deleted_at < ?')
const selectTrash = db.prepare('SELECT id, order_id, rows FROM order_trash WHERE id = ? AND user_id = ?')
const selectTrashFiles = db.prepare('SELECT attachment_id, data, thumbnail, original FROM order_trash_files WHERE trash_id = ?')
const deleteTrash = db.prepare('DELETE FROM order_trash WHERE id = ?')
const orderExists = db.prepare('SELECT 1 FROM orders WHERE id = ?')
const vendorExists = db.prepare('SELECT 1 FROM vendors WHERE id = ? AND user_id = ?')
const categoryExists = db.prepare('SELECT 1 FROM categories WHERE id = ? AND user_id = ?')

const withoutBlobs = ({ data, thumbnail, original, ...rest }) => rest

/** Deletes the order and keeps a copy to undo it from. Returns the copy's id, or null when there
    was no such order. */
export const trashOrder = db.transaction((userId, orderId) => {
	sweep.run(Math.floor(Date.now() / 1000) - KEEP_SECONDS)
	const order = selectOrder.get(orderId, userId)
	if (!order) return null
	const files = selectFiles.all({ id: orderId })
	const rows = {
		order,
		items: selectItems.all(orderId),
		categories: selectCategories.all(orderId),
		statuses: selectStatuses.all(orderId),
		files: files.map(withoutBlobs),
		validation: selectValidation.get(orderId) ?? null
	}
	const id = newId('t')
	insertTrash.run(id, userId, orderId, JSON.stringify(rows))
	for (const f of files) insertTrashFile.run(id, f.id, f.data, f.thumbnail, f.original)
	deleteOrderRow.run(orderId, userId)
	return id
})

const insertRow = (table, row) => {
	const columns = writable(table).filter(c => c in row)
	db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(c => '@' + c).join(', ')})`).run(row)
}

/** Puts a deleted order back as it was: a 404 when the copy is gone, a 409 when its vendor is. */
export const restoreOrder = db.transaction((userId, trashId) => {
	const trash = selectTrash.get(trashId, userId)
	if (!trash) throw Object.assign(new Error('This order can no longer be brought back.'), { status: 404 })
	const rows = JSON.parse(trash.rows)
	if (orderExists.get(trash.order_id)) { deleteTrash.run(trash.id); return trash.order_id }
	if (!vendorExists.get(rows.order.vendor_id, userId))
		throw Object.assign(new Error('The order could not be brought back: its vendor was deleted.'), { status: 409 })
	insertRow('orders', rows.order)
	for (const item of rows.items) insertRow('order_items', item)
	for (const link of rows.categories) if (categoryExists.get(link.category_id, userId)) insertRow('order_categories', link)
	for (const status of rows.statuses) insertRow('order_statuses', status)
	const blobs = new Map(selectTrashFiles.all(trash.id).map(f => [f.attachment_id, f]))
	for (const file of rows.files)
		insertRow('attachments', { ...file, data: blobs.get(file.id)?.data ?? null, thumbnail: blobs.get(file.id)?.thumbnail ?? null, original: blobs.get(file.id)?.original ?? null })
	if (rows.validation) insertRow('order_validations', rows.validation)
	deleteTrash.run(trash.id)
	return trash.order_id
})
