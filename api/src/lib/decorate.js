import { db } from '../db.js'
import { fromEpoch } from './dates.js'
import { orderTotalsSelectList } from './orderColumns.js'

/* The order math (client.js:104-125's `decorate`, now real aggregation) lives in the
   order_totals SQL view (see migrations/001_init.sql) — one formula, computed by SQLite, that
   every reader here shares. Nothing in this file recomputes subtotal/total/saved in JS. Every
   query below selects only the columns its caller actually reads, not `SELECT *`. */

const selectTotals = db.prepare(`SELECT ${orderTotalsSelectList()} FROM order_totals WHERE id = ? AND user_id = ?`)
const selectItems = db.prepare('SELECT id, title, quantity, price, retail, note FROM order_items WHERE order_id = ? ORDER BY position')
const selectAttachments = db.prepare(`
	SELECT id, name, kind, meta, (thumbnail IS NOT NULL) AS has_thumbnail FROM attachments WHERE order_id = ?
`)
const selectItemAttachments = db.prepare(`
	SELECT a.order_item_id, a.id, a.name, a.kind, a.meta, (a.thumbnail IS NOT NULL) AS has_thumbnail
	FROM attachments a JOIN order_items oi ON oi.id = a.order_item_id
	WHERE oi.order_id = ?
`)
/* ORDER BY name, because without one SQLite is free to return these in whatever order the
   join happens to walk, and it does: the same two categories on the same order came back
   "Household, Groceries" for one account and "Groceries, Household" for another, since the
   row ids differ. Stable within an account, arbitrary between them -- so no reader would ever
   catch it, and a screenshot of the orders list was not reproducible run to run. `position`
   is what order_items uses for the same reason; categories have no such column and no order
   the user chose, so the name is the one stable answer available. */
const selectCategories = db.prepare(`
	SELECT c.id, c.name, c.colour, c.icon FROM categories c
	JOIN order_categories oc ON oc.category_id = c.id
	WHERE oc.order_id = ?
	ORDER BY c.name
`)
const selectVendor = db.prepare('SELECT id, name, initials, colour FROM vendors WHERE id = ?')

// hasThumbnail tells the client whether GET .../thumbnail will 404 (a PDF, or an image sharp
// couldn't decode) — never the bytes themselves, so an order's JSON stays small.
const mapAttachment = a => ({ id: a.id, name: a.name, kind: a.kind, meta: a.meta, hasThumbnail: Boolean(a.has_thumbnail) })

const mapItem = (i, itemAttachments) => ({
	id: i.id, title: i.title, quantity: i.quantity, price: i.price,
	...(i.retail != null ? { retail: i.retail } : {}),
	...(i.note ? { note: i.note } : {}),
	attachments: (itemAttachments?.get(i.id) ?? []).map(mapAttachment)
})

/** Turns one order_totals row plus its already-fetched child rows into the shape the frontend
    expects from client.js. Pure — callers decide how the child rows were fetched (one order at
    a time, or batched for a whole page, see decorateOrderRows below). */
export function decorateOrder(totals, { items, attachments, itemAttachments, categories, vendor }) {
	return {
		id: totals.id,
		vendorId: totals.vendor_id,
		date: fromEpoch(totals.date),
		status: totals.status,
		kind: totals.kind,
		categoryIds: categories.map(c => c.id),
		shipping: totals.shipping,
		note: totals.note,
		reference: totals.reference,
		refunded: Boolean(totals.refunded),
		items: items.map(i => mapItem(i, itemAttachments)),
		attachments: attachments.map(mapAttachment),
		vendor: vendor ? { id: vendor.id, name: vendor.name, initials: vendor.initials, colour: vendor.colour } : null,
		categories,
		itemCount: totals.item_count,
		subtotal: totals.subtotal,
		total: totals.total,
		saved: totals.saved,
		savedPercent: totals.saved_percent
	}
}

/** One order, fully decorated. Scoped to the owning user so an id from another account can
    never be read. Returns null if missing. Six small indexed queries — fine for a single
    record; decorateOrderRows below is the batched version a list of many orders should use
    instead of calling this in a loop. */
export function getDecoratedOrder(userId, id) {
	const totals = selectTotals.get(id, userId)
	if (!totals) return null
	return decorateOrder(totals, {
		items: selectItems.all(id),
		attachments: selectAttachments.all(id),
		itemAttachments: groupBy(selectItemAttachments.all(id), 'order_item_id'),
		categories: selectCategories.all(id),
		vendor: selectVendor.get(totals.vendor_id)
	})
}

const selectItemsFor = db.prepare(`
	SELECT order_id, id, title, quantity, price, retail, note FROM order_items
	WHERE order_id IN (SELECT value FROM json_each(?)) ORDER BY order_id, position
`)
const selectAttachmentsFor = db.prepare(`
	SELECT id, order_id, name, kind, meta, (thumbnail IS NOT NULL) AS has_thumbnail
	FROM attachments WHERE order_id IN (SELECT value FROM json_each(?))
`)
const selectItemAttachmentsFor = db.prepare(`
	SELECT oi.order_id, a.order_item_id, a.id, a.name, a.kind, a.meta, (a.thumbnail IS NOT NULL) AS has_thumbnail
	FROM attachments a JOIN order_items oi ON oi.id = a.order_item_id
	WHERE oi.order_id IN (SELECT value FROM json_each(?))
`)
// Same ordering as selectCategories above, or one order reads differently in a list than it
// does on its own page -- the batched query is the list's and the single one is the record's.
const selectCategoriesFor = db.prepare(`
	SELECT oc.order_id, c.id, c.name, c.colour, c.icon FROM categories c
	JOIN order_categories oc ON oc.category_id = c.id
	WHERE oc.order_id IN (SELECT value FROM json_each(?))
	ORDER BY oc.order_id, c.name
`)
const selectVendorsFor = db.prepare(`SELECT id, name, initials, colour FROM vendors WHERE id IN (SELECT value FROM json_each(?))`)

const groupBy = (rows, key) => {
	const map = new Map()
	for (const row of rows) {
		const list = map.get(row[key])
		if (list) list.push(row); else map.set(row[key], [row])
	}
	return map
}

/** Decorates many order_totals rows (a page of the order list) in a fixed 4 queries total,
    instead of the 4-per-order it would cost to call getDecoratedOrder in a loop — the same N+1
    a page of 20 orders would otherwise turn into 80 round trips for. */
export function decorateOrderRows(totalsRows) {
	if (!totalsRows.length) return []
	const ids = JSON.stringify(totalsRows.map(t => t.id))
	const vendorIds = JSON.stringify([...new Set(totalsRows.map(t => t.vendor_id))])

	const itemsByOrder = groupBy(selectItemsFor.all(ids), 'order_id')
	const attachmentsByOrder = groupBy(selectAttachmentsFor.all(ids), 'order_id')
	const itemAttachmentsByOrder = groupBy(selectItemAttachmentsFor.all(ids), 'order_id')
	const categoriesByOrder = groupBy(selectCategoriesFor.all(ids), 'order_id')
	const vendorById = new Map(selectVendorsFor.all(vendorIds).map(v => [v.id, v]))

	return totalsRows.map(totals => decorateOrder(totals, {
		items: (itemsByOrder.get(totals.id) ?? []).map(({ order_id, ...i }) => i),
		attachments: (attachmentsByOrder.get(totals.id) ?? []).map(mapAttachment),
		itemAttachments: groupBy(itemAttachmentsByOrder.get(totals.id) ?? [], 'order_item_id'),
		categories: (categoriesByOrder.get(totals.id) ?? []).map(({ order_id, ...c }) => c),
		vendor: vendorById.get(totals.vendor_id)
	}))
}
