import { db } from '../db.js'
import { decompressBlob } from './blobCompression.js'
import { fromEpoch } from './dates.js'

/* orders.json in the shape POST /api/orders/import reads, and each order's files beside it; never Ask or statistics.
   Each file's bytes are read only as it is written, so the files are never held in memory together. */

const ORDERS_PER_PAGE = 500

const selectOrderPage = db.prepare(`SELECT o.id, o.date, o.kind, o.shipping, o.discount, o.note, o.reference, o.refunded,
	o.exclude_from_stats, v.name AS vendor, s.name AS status, s.type AS status_type
	FROM orders o JOIN vendors v ON v.id = o.vendor_id LEFT JOIN statuses s ON s.user_id = o.user_id AND s.key = o.status
	WHERE o.user_id = @userId AND (o.date, o.id) > (@date, @id) ORDER BY o.date, o.id LIMIT ${ORDERS_PER_PAGE}`)
const selectItemsFor = db.prepare(`SELECT order_id, id, title, quantity, price, retail, note, url FROM order_items
	WHERE order_id IN (SELECT value FROM json_each(?)) ORDER BY order_id, position`)
const selectCategoriesFor = db.prepare(`SELECT oc.order_id, c.name FROM order_categories oc JOIN categories c ON c.id = oc.category_id
	WHERE oc.order_id IN (SELECT value FROM json_each(?)) ORDER BY oc.order_id, c.name`)
// the last date each status type was reached, for the dates the import takes back
const selectStatusDatesFor = db.prepare(`SELECT h.order_id, s.type, MAX(h.date) AS date FROM order_status_history h
	JOIN orders o ON o.id = h.order_id JOIN statuses s ON s.user_id = o.user_id AND s.key = h.status
	WHERE h.order_id IN (SELECT value FROM json_each(?)) AND s.type IN ('delivered', 'returned') GROUP BY h.order_id, s.type`)
// names only: the bytes are read one file at a time, as each is written
const selectFileNamesFor = db.prepare(`SELECT a.id, a.name, COALESCE(a.original_content_type, a.content_type) AS content_type,
	COALESCE(a.order_id, oi.order_id) AS order_id, a.order_item_id
	FROM order_attachments a LEFT JOIN order_items oi ON oi.id = a.order_item_id
	WHERE a.order_id IN (SELECT value FROM json_each(@ids)) OR oi.order_id IN (SELECT value FROM json_each(@ids))
	ORDER BY a.rowid`)
const selectFileBytes = db.prepare(`SELECT COALESCE(original, data) AS data,
	CASE WHEN original IS NOT NULL THEN original_is_compressed ELSE data_is_compressed END AS compressed
	FROM order_attachments WHERE id = ?`)

const groupBy = (rows, key) => {
	const map = new Map()
	for (const row of rows) {
		if (!map.has(row[key])) map.set(row[key], [])
		map.get(row[key]).push(row)
	}
	return map
}

// a name any computer accepts as a file or folder name
const safeName = text => String(text ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 80) || 'file'

/** One name per file in the folder: a second "receipt.pdf" becomes "receipt (2).pdf". */
function uniqueIn(taken, name) {
	if (!taken.has(name)) return taken.add(name), name
	const dot = name.lastIndexOf('.')
	const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, '']
	for (let n = 2; ; n++) {
		const next = `${stem} (${n})${ext}`
		if (!taken.has(next)) return taken.add(next), next
	}
}

/** The account's orders as the import reads them, page by page, with the files each one has. */
function* orderPages(userId) {
	let after = { date: -Infinity, id: '' }
	for (;;) {
		const orders = selectOrderPage.all({ userId, ...after })
		if (!orders.length) return
		const ids = JSON.stringify(orders.map(o => o.id))
		const items = groupBy(selectItemsFor.all(ids), 'order_id')
		const categories = groupBy(selectCategoriesFor.all(ids), 'order_id')
		const dates = groupBy(selectStatusDatesFor.all(ids), 'order_id')
		const files = groupBy(selectFileNamesFor.all({ ids }), 'order_id')
		yield orders.map(o => ({ order: o, items: items.get(o.id) ?? [], categories: categories.get(o.id) ?? [], dates: dates.get(o.id) ?? [], files: files.get(o.id) ?? [] }))
		const last = orders.at(-1)
		after = { date: last.date, id: last.id }
	}
}

/** The files of the .zip, in order: every order's files, then orders.json. */
export async function* accountExportFiles(userId) {
	const orders = []
	const folders = new Set()
	for (const page of orderPages(userId)) {
		for (const { order, items, categories, dates, files } of page) {
			const folder = uniqueIn(folders, safeName(`${fromEpoch(order.date)} ${order.vendor}`))
			const names = new Set()
			const listed = new Map()
			for (const file of files) {
				const path = `files/${folder}/${uniqueIn(names, safeName(file.name))}`
				const row = selectFileBytes.get(file.id)
				if (!row?.data) continue
				yield { name: path, data: decompressBlob(row.data, row.compressed) }
				const owner = file.order_item_id ?? ''
				if (!listed.has(owner)) listed.set(owner, [])
				listed.get(owner).push({ filename: file.name, contentType: file.content_type, file: path })
			}
			const dated = Object.fromEntries(dates.map(d => [d.type, fromEpoch(d.date)]))
			orders.push({
				vendor: order.vendor,
				date: fromEpoch(order.date),
				...(order.status ? { status: order.status } : {}),
				...(dated.delivered ? { deliveredDate: dated.delivered } : {}),
				...(dated.returned ? { returnedDate: dated.returned } : {}),
				kind: order.kind,
				shipping: order.shipping,
				discount: order.discount,
				note: order.note,
				reference: order.reference,
				refunded: Boolean(order.refunded),
				excludeFromStats: Boolean(order.exclude_from_stats),
				categories: categories.map(c => c.name),
				items: items.map(i => ({
					title: i.title, quantity: i.quantity, price: i.price,
					...(i.retail != null ? { retail: i.retail } : {}),
					...(i.note ? { note: i.note } : {}),
					...(i.url ? { url: i.url } : {}),
					...(listed.has(i.id) ? { attachments: listed.get(i.id) } : {})
				})),
				...(listed.has('') ? { attachments: listed.get('') } : {})
			})
		}
		// lets other requests in between pages
		await new Promise(resolve => setImmediate(resolve))
	}
	yield { name: 'orders.json', data: JSON.stringify({ orders }, null, '\t') }
}

/** spendly-export-2026-10-28.zip, named for the day it was made. */
export const accountExportName = today => `spendly-export-${today}.zip`
