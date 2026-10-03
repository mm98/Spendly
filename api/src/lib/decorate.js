import { db } from '../db.js'
import { fromEpoch } from './dates.js'
import { orderTotalsSelectList } from './orderColumns.js'
import { ORDER_STATUSES } from './constants.js'

/* The order math lives in the orders table itself: stored columns maintained by the
   order_items triggers (see migrations/001_init.sql) — one formula, applied by SQLite at write
   time, that every reader here shares. Nothing in this file recomputes subtotal/total/saved in
   JS. Every query below selects only the columns its caller actually reads, not `SELECT *`. */

const selectTotals = db.prepare(`SELECT ${orderTotalsSelectList()} FROM orders WHERE id = ? AND user_id = ?`)
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
// No ORDER BY: at most 3 rows, sorted in JS below by workflow order rather than asking SQLite
// to sort what the index (order_id, status) can't answer without its own temp B-tree.
const selectOrderStatuses = db.prepare('SELECT status, date FROM order_statuses WHERE order_id = ?')

// hasThumbnail tells the client whether GET .../thumbnail will 404 (a PDF, or an image sharp
// couldn't decode) — never the bytes themselves, so an order's JSON stays small.
const mapAttachment = a => ({ id: a.id, name: a.name, kind: a.kind, meta: a.meta, hasThumbnail: Boolean(a.has_thumbnail) })

const mapItem = (i, itemAttachments) => ({
	id: i.id, title: i.title, quantity: i.quantity, price: i.price,
	...(i.retail != null ? { retail: i.retail } : {}),
	...(i.note ? { note: i.note } : {}),
	attachments: (itemAttachments?.get(i.id) ?? []).map(mapAttachment)
})

/** Turns one orders row plus its already-fetched child rows into the full order shape a
    single-order reader needs (the order detail/edit page — the one place every field here is
    read). A list of orders never wants this whole shape; see decorateOrderListRows and
    decorateOrderSearchRows below for the leaner ones each list actually renders. */
export function decorateOrder(totals, { items, attachments, itemAttachments, categories, vendor, statuses }) {
	return {
		id: totals.id,
		vendorId: totals.vendor_id,
		date: fromEpoch(totals.date),
		status: totals.status,
		// Chronological -- a returned item can be replaced and delivered again, so a status
		// can recur. Same-day ties keep workflow order (Returned can't sort before Delivered).
		statusHistory: statuses
			.sort((a, b) => a.date - b.date || ORDER_STATUSES.indexOf(a.status) - ORDER_STATUSES.indexOf(b.status))
			.map(s => ({ status: s.status, date: fromEpoch(s.date) })),
		kind: totals.kind,
		categoryIds: categories.map(c => c.id),
		shipping: totals.shipping,
		discount: totals.discount,
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
    record; the batched decorators below are what a list of many orders should use instead of
    calling this in a loop. */
export function getDecoratedOrder(userId, id) {
	const totals = selectTotals.get(id, userId)
	if (!totals) return null
	return decorateOrder(totals, {
		items: selectItems.all(id),
		attachments: selectAttachments.all(id),
		itemAttachments: groupBy(selectItemAttachments.all(id), 'order_item_id'),
		categories: selectCategories.all(id),
		vendor: selectVendor.get(totals.vendor_id),
		statuses: selectOrderStatuses.all(id)
	})
}

// id and title only -- what the command palette's item-line search matches against, and the
// names the copy picker's rows list. A list of orders never wants a whole order's item detail.
const selectItemTitlesFor = db.prepare(`
	SELECT order_id, id, title FROM order_items
	WHERE order_id IN (SELECT value FROM json_each(?)) ORDER BY order_id, position
`)
// Same ordering as selectCategories above, or one order reads differently in a list than it
// does on its own page -- the batched query is the list's and the single one is the record's.
const selectCategoriesFor = db.prepare(`
	SELECT oc.order_id, c.id, c.name FROM categories c
	JOIN order_categories oc ON oc.category_id = c.id
	WHERE oc.order_id IN (SELECT value FROM json_each(?))
	ORDER BY oc.order_id, c.name
`)
const selectVendorsFor = db.prepare(`SELECT id, name FROM vendors WHERE id IN (SELECT value FROM json_each(?))`)
// An order row's pictures, for the thumbnail and the count; the first is chosen in code, which
// spares the page a sort over every photo it carries
const selectLinePhotosFor = db.prepare(`
	SELECT oi.order_id, oi.position, a.rowid AS seq, a.order_item_id, a.id FROM order_items oi
	JOIN attachments a ON a.order_item_id = oi.id
	WHERE oi.order_id IN (SELECT value FROM json_each(?)) AND a.kind = 'image'
`)
const firstPhoto = photos => photos.reduce((first, p) =>
	(p.position < first.position || (p.position === first.position && p.seq < first.seq) ? p : first))

const groupBy = (rows, key) => {
	const map = new Map()
	for (const row of rows) {
		const list = map.get(row[key])
		if (list) list.push(row); else map.set(row[key], [row])
	}
	return map
}

// The copy picker's row names this many of an order's lines, first by position (3b).
const ITEM_TITLES_SHOWN = 3

/** The row shape the order lists render (pages/Orders.jsx, Home's recent orders, Statistics'
    slice, a vendor's recent orders, the palette and the copy picker): the row's facts, its
    reference and note line, and its first line photo with the count. `itemTitles` adds the
    first line names, which only the copy picker asks for. */
export function decorateOrderListRows(totalsRows, { itemTitles = false } = {}) {
	if (!totalsRows.length) return []
	const ids = JSON.stringify(totalsRows.map(t => t.id))
	const vendorIds = JSON.stringify([...new Set(totalsRows.map(t => t.vendor_id))])

	const categoriesByOrder = groupBy(selectCategoriesFor.all(ids), 'order_id')
	const vendorById = new Map(selectVendorsFor.all(vendorIds).map(v => [v.id, v]))
	const photosByOrder = groupBy(selectLinePhotosFor.all(ids), 'order_id')
	const itemsByOrder = itemTitles ? groupBy(selectItemTitlesFor.all(ids), 'order_id') : null

	return totalsRows.map(totals => {
		const vendor = vendorById.get(totals.vendor_id)
		const photos = photosByOrder.get(totals.id) ?? []
		return {
			id: totals.id,
			date: fromEpoch(totals.date),
			status: totals.status,
			reference: totals.reference,
			note: totals.note,
			photo: photos.length ? (p => ({ itemId: p.order_item_id, attachmentId: p.id }))(firstPhoto(photos)) : null,
			photoCount: photos.length,
			vendor: vendor ? { name: vendor.name } : null,
			categories: (categoriesByOrder.get(totals.id) ?? []).map(({ order_id, ...c }) => c),
			itemCount: totals.item_count,
			total: totals.total,
			saved: totals.saved,
			...(itemsByOrder ? { itemTitles: (itemsByOrder.get(totals.id) ?? []).slice(0, ITEM_TITLES_SHOWN).map(i => i.title) } : {})
		}
	})
}

/** The row shape the command palette links from (api/client.js searchRecords(), driven by
    routes/search.js): id, date, reference, vendor name and each item's id/title -- what its item
    rows draw. One item query (titles only) and one vendor query instead of getDecoratedOrder's five. */
export function decorateOrderSearchRows(totalsRows) {
	if (!totalsRows.length) return []
	const ids = JSON.stringify(totalsRows.map(t => t.id))
	const vendorIds = JSON.stringify([...new Set(totalsRows.map(t => t.vendor_id))])

	const itemsByOrder = groupBy(selectItemTitlesFor.all(ids), 'order_id')
	const vendorById = new Map(selectVendorsFor.all(vendorIds).map(v => [v.id, v]))

	return totalsRows.map(totals => {
		const vendor = vendorById.get(totals.vendor_id)
		return {
			id: totals.id,
			date: fromEpoch(totals.date),
			reference: totals.reference,
			vendor: vendor ? { name: vendor.name } : null,
			items: (itemsByOrder.get(totals.id) ?? []).map(i => ({ id: i.id, title: i.title }))
		}
	})
}
