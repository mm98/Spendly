import { Router } from 'express'
import multer from 'multer'
import { db } from '../db.js'
import { cardRowsFor } from '../lib/prefs.js'
import { newId } from '../lib/ids.js'
import { toEpoch } from '../lib/dates.js'
import { getDecoratedOrder, decorateOrderRows } from '../lib/decorate.js'
import { assertValidOrderDraft, validateOrderDraft } from '../lib/validate.js'
import { findOrCreateVendor, findOrCreateCategory } from '../lib/findOrCreate.js'
import { orderTotalsSelectList } from '../lib/orderColumns.js'
import { MAX_PAGE_SIZE } from '../lib/constants.js'
import { processAttachment } from '../lib/images.js'
import { decompressBlob } from '../lib/blobCompression.js'
import { sep, fileSizeLabel } from '../lib/copy.js'

export const router = Router()
// defParamCharset: busboy (multer's parser) decodes every multipart header as latin1 by
// default, so a filename typed with a non-ASCII character crosses the wire as UTF-8 bytes and
// comes back mojibake ("rengÃ¸ringsplaner.pdf" for "rengøringsplaner.pdf") -- browsers never
// send the RFC 5987 encoding that would tell busboy otherwise. Declaring the charset here
// decodes it correctly at the source, for every field this instance parses.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 }, defParamCharset: 'utf8' })

const notFound = id => Object.assign(new Error('No order ' + id), { status: 404 })

/* ---- statements, prepared once at module load rather than per request ---- */

const selectOrderExists = db.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?')
const selectItemExists = db.prepare('SELECT id FROM order_items WHERE id = ? AND order_id = ?')
const selectDraftDefaults = db.prepare('SELECT default_status, default_kind FROM settings WHERE user_id = ?')
const countAllOrders = db.prepare('SELECT COUNT(*) c FROM orders WHERE user_id = ?')
const deleteOrder = db.prepare('DELETE FROM orders WHERE id = ? AND user_id = ?')
const deleteOrderCategories = db.prepare('DELETE FROM order_categories WHERE order_id = ?')
const insertOrder = db.prepare(`INSERT INTO orders (id, user_id, vendor_id, date, status, kind, shipping, discount, note, reference, refunded)
	VALUES (@id, @userId, @vendorId, @date, @status, @kind, @shipping, @discount, @note, @reference, @refunded)`)
const updateOrderRow = db.prepare(`UPDATE orders SET vendor_id=@vendorId, date=@date, status=@status, kind=@kind,
	shipping=@shipping, discount=@discount, note=@note, reference=@reference, refunded=@refunded WHERE id=@id AND user_id=@userId`)
const insertOrderCategory = db.prepare('INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)')
const selectItemIds = db.prepare('SELECT id FROM order_items WHERE order_id = ?')
const insertOrderItem = db.prepare(`INSERT INTO order_items (id, order_id, position, title, quantity, price, retail, note)
	VALUES (@id, @orderId, @position, @title, @quantity, @price, @retail, @note)`)
const updateOrderItem = db.prepare(`UPDATE order_items SET position=@position, title=@title, quantity=@quantity,
	price=@price, retail=@retail, note=@note WHERE id=@id AND order_id=@orderId`)
const deleteOrderItem = db.prepare('DELETE FROM order_items WHERE id = ? AND order_id = ?')
const insertAttachment = db.prepare(`INSERT INTO attachments
	(id, order_id, order_item_id, name, kind, meta, content_type, size, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type)
	VALUES (@id, @orderId, @orderItemId, @name, @kind, @meta, @contentType, @size, @data, @dataCompressed, @thumbnail, @thumbnailCompressed, @thumbnailContentType)`)
const selectExistingAttachmentNames = db.prepare('SELECT lower(name) n FROM attachments WHERE order_id = ?')
const selectExistingItemAttachmentNames = db.prepare('SELECT lower(name) n FROM attachments WHERE order_item_id = ?')
const deleteAttachment = db.prepare('DELETE FROM attachments WHERE id = ? AND order_id = ?')
const deleteItemAttachment = db.prepare('DELETE FROM attachments WHERE id = ? AND order_item_id = ?')
const selectAttachment = db.prepare('SELECT name, content_type, data, data_is_compressed FROM attachments WHERE id = ? AND order_id = ?')
const selectItemAttachment = db.prepare('SELECT name, content_type, data, data_is_compressed FROM attachments WHERE id = ? AND order_item_id = ?')
const selectAttachmentThumbnail = db.prepare('SELECT thumbnail, thumbnail_is_compressed, thumbnail_content_type FROM attachments WHERE id = ? AND order_id = ?')
const selectItemAttachmentThumbnail = db.prepare('SELECT thumbnail, thumbnail_is_compressed, thumbnail_content_type FROM attachments WHERE id = ? AND order_item_id = ?')
const selectLatestOrders = db.prepare(
	`SELECT ${orderTotalsSelectList()} FROM orders WHERE user_id = @userId ORDER BY date DESC, id DESC LIMIT @count`
)

/* ---- overview / draft ---- */

/** "Latest N orders" — N defaults to the account's entries-per-card setting, which is what
    every card holding a list of things is cut to. It used to default to 4 and be passed as 3 by
    one caller and 4 by the other, so the same card on two pages was two lengths for no reason
    either page could state. A caller may still ask for a specific count (the scan flow wants a
    handful regardless), and it is clamped so nobody can ask for an unbounded scan. */
router.get('/overview', (req, res) => {
	const asked = Number(req.query.count)
	const count = Math.min(Math.max(1, asked || cardRowsFor(req.user.id)), 100)
	const totalsRows = selectLatestOrders.all({ userId: req.user.id, count })
	// `latestOrders`, not `latest`: the two pages that read this each hold four other lists,
	// and a field whose name is only an adjective is one they all answer to.
	res.json({ latestOrders: decorateOrderRows(totalsRows), total: countAllOrders.get(req.user.id).c })
})

router.get('/draft', (req, res) => {
	const settings = selectDraftDefaults.get(req.user.id)
	res.json({
		vendor: '', date: new Date().toISOString().slice(0, 10),
		status: settings?.default_status ?? 'Delivered', kind: settings?.default_kind ?? 'Expense',
		categories: [], shipping: 0, discount: 0, reference: '', note: '', items: []
	})
})

/* ---- list: real SQL filter/sort/paginate over the orders table's stored totals ----
   Built as parameterized clauses reused between the COUNT (matched) and the SELECT (page), so
   the two can never disagree about which rows qualify. LIMIT/OFFSET does the paging in SQLite
   rather than in JS, and only the resulting page (not the whole table) is passed to
   decorateOrderRows for its 4 batched child-row queries. */

const SORT_SQL = {
	'date-desc': 'ot.date DESC, ot.id DESC',
	'date-asc': 'ot.date ASC, ot.id ASC',
	'amount-desc': 'ot.total DESC, ot.id DESC',
	'amount-asc': 'ot.total ASC, ot.id ASC',
	'discount-desc': 'ot.discount DESC, ot.id DESC',
	'discount-asc': 'ot.discount ASC, ot.id ASC',
	'vendor-asc': 'v.name COLLATE NOCASE ASC, ot.id ASC'
}

function buildOrderFilter(userId, q) {
	const where = ['ot.user_id = @userId']
	const params = { userId }

	if (q.vendorId) { where.push('ot.vendor_id = @vendorId'); params.vendorId = q.vendorId }
	if (q.categoryId === 'none') {
		// The sentinel every "Without category" row links with. Real ids are newId()-prefixed,
		// so nothing an account creates can collide with it. category_count is the stored,
		// trigger-maintained column the split's own remainder is computed from (lib/stats.js),
		// so the rows this matches are exactly the orders that remainder added up.
		where.push('ot.category_count = 0')
	} else if (q.categoryId) {
		// IN driven from the category's own (indexed, covering) links rather than an EXISTS
		// probe per order row: the filter reads the few thousand rows the category actually
		// has, not every order the account has. 250ms -> 3ms at 50k orders, same rows.
		where.push('ot.id IN (SELECT order_id FROM order_categories WHERE category_id = @categoryId)')
		params.categoryId = q.categoryId
	}
	if (q.status && q.status !== 'Any') { where.push('ot.status = @status'); params.status = q.status }
	if (q.kind) { where.push('ot.kind = @kind'); params.kind = q.kind }
	if (q.from) { where.push('ot.date >= @from'); params.from = toEpoch(q.from) }
	if (q.to) { where.push('ot.date <= @to'); params.to = toEpoch(q.to) }
	if (q.minAmount != null && q.minAmount !== '') { where.push('ot.total >= @minAmount'); params.minAmount = Number(q.minAmount) }
	if (q.maxAmount != null && q.maxAmount !== '') { where.push('ot.total <= @maxAmount'); params.maxAmount = Number(q.maxAmount) }

	/* One LIKE over the order's trigger-maintained search_text (its note and item titles --
	   see migrations/002) instead of a correlated scan of order_items per order row, plus the
	   two renameable names reached through their own small tables: matching vendors and
	   categories resolve to id sets first (a dozen rows and ten), and the orders side is an
	   indexed IN. Byte-identical results to the old four-way OR, measured across item-title,
	   note, vendor and no-match needles; ~660ms -> ~100ms per search at 50k orders. LIKE is
	   already case-insensitive for ASCII, which is exactly what lower() gave (SQLite's lower()
	   never folded non-ASCII either), so the needle stays lowercased and the columns are
	   compared as stored. */
	const needle = String(q.query ?? '').trim().toLowerCase()
	if (needle) {
		params.needle = `%${needle}%`
		where.push(`(
			ot.search_text LIKE @needle
			OR ot.vendor_id IN (SELECT id FROM vendors WHERE user_id = @userId AND name LIKE @needle)
			OR ot.id IN (SELECT oc.order_id FROM order_categories oc JOIN categories c ON c.id = oc.category_id
				WHERE c.user_id = @userId AND c.name LIKE @needle)
		)`)
	}

	return { whereSql: where.join(' AND '), params }
}

router.get('/', (req, res) => {
	const q = req.query
	const { whereSql, params } = buildOrderFilter(req.user.id, q)
	const orderSql = SORT_SQL[q.sort] ?? SORT_SQL['date-desc']

	/* The vendors join exists for exactly one reader: the vendor-name sort. The filter above
	   never references v (search reaches vendors through its own subquery), so the COUNT is
	   always index-only on orders, and the page joins only when its ORDER BY needs the name --
	   an unconditional join cost the COUNT a vendors probe per counted row. */
	const vendorJoin = orderSql.includes('v.name') ? 'JOIN vendors v ON v.id = ot.vendor_id' : ''

	const matched = db.prepare(`
		SELECT COUNT(*) c FROM orders ot WHERE ${whereSql}
	`).get(params).c

	// LIMIT/OFFSET go straight into the query below, so this is the one place a caller-chosen
	// pageSize has to be made safe before it reaches SQL: SQLite treats any negative LIMIT as
	// "no limit at all" (not an error, and not clamped to 1 the way this code used to assume),
	// so `pageSize=-3` silently returned every matched row while the page/pages fields in the
	// response still claimed a 3-row page -- the metadata and the data disagreed. The ceiling
	// bounds the other direction: an oversized ask (or none, which used to mean "everything")
	// is a whole account decorated into one response, so it pages like any other reader.
	const requestedSize = Number(q.pageSize) || Number(q.limit) || matched || 1
	const size = Math.min(MAX_PAGE_SIZE, Number.isFinite(requestedSize)
		? Math.max(1, Math.floor(requestedSize)) : Math.max(1, matched))
	const pages = Math.max(1, Math.ceil(matched / size))
	const at = Math.min(Math.max(1, Number(q.page) || 1), pages)

	const totalsRows = db.prepare(`
		SELECT ${orderTotalsSelectList('ot')} FROM orders ot ${vendorJoin}
		WHERE ${whereSql}
		ORDER BY ${orderSql}
		LIMIT @limit OFFSET @offset
	`).all({ ...params, limit: size, offset: (at - 1) * size })

	res.json({
		orders: decorateOrderRows(totalsRows),
		matched, total: countAllOrders.get(req.user.id).c, page: at, pages,
		from: matched ? (at - 1) * size + 1 : 0,
		to: Math.min(at * size, matched)
	})
})

router.get('/:id', (req, res) => {
	const order = getDecoratedOrder(req.user.id, req.params.id)
	if (!order) return res.status(404).json({ error: 'No order ' + req.params.id })
	res.json(order)
})

/* ---- create / update / delete ---- */

/** Turns a validated draft into inserted rows. Shared by manual create, update (which first
    clears whatever it's replacing) and import. */
const insertOrderRows = db.transaction((userId, id, draft) => {
	const vendorId = findOrCreateVendor(userId, draft.vendor)
	const categoryIds = (draft.categories ?? []).map(name => findOrCreateCategory(userId, name))

	insertOrder.run({
		id, userId, vendorId, date: toEpoch(draft.date),
		status: draft.status || 'Delivered', kind: draft.kind || 'Expense',
		shipping: Number(draft.shipping) || 0, discount: Number(draft.discount) || 0,
		note: draft.note || '', reference: draft.reference || '',
		refunded: draft.refunded ? 1 : 0
	})
	for (const categoryId of categoryIds) insertOrderCategory.run(id, categoryId)
	// Returned in draft order so a caller that also has per-item attachments to insert (import)
	// can match them back up to the row each one landed in -- create/update never read this
	// return value, since neither ever carries item attachments through the draft itself.
	return draft.items.map((item, position) => {
		const itemId = newId('i')
		insertOrderItem.run({
			id: itemId, orderId: id, position, title: String(item.title).trim(),
			quantity: Number(item.quantity), price: Number(item.price),
			retail: item.retail != null && item.retail !== '' ? Number(item.retail) : null,
			note: item.note || null
		})
		return itemId
	})
})

router.post('/', (req, res) => {
	const draft = req.body ?? {}
	assertValidOrderDraft(draft)
	const id = newId('o')
	insertOrderRows(req.user.id, id, draft)
	res.status(201).json(getDecoratedOrder(req.user.id, id))
})

/** Update: the order row itself is UPDATEd in place rather than deleted and reinserted with the
    same id -- attachments.order_id (like order_items.order_id) is ON DELETE CASCADE, so deleting
    the row a save is meant to be editing quietly took every receipt on it with it, whether or not
    the edit touched attachments at all. Items are matched against what's already in the database
    by id: one already there is updated in place, keeping its id (and with it, anything keyed to
    that id -- an item's own attachment); a line added during this edit is inserted fresh, same as
    create; a line dropped from the submitted set is deleted. Categories stay delete-and-reinsert
    -- nothing else references an order_categories row, so there is no id for that shortcut to
    orphan anything against. */
const updateOrderRows = db.transaction((userId, id, draft) => {
	const vendorId = findOrCreateVendor(userId, draft.vendor)
	const categoryIds = (draft.categories ?? []).map(name => findOrCreateCategory(userId, name))

	updateOrderRow.run({
		id, userId, vendorId, date: toEpoch(draft.date),
		status: draft.status || 'Delivered', kind: draft.kind || 'Expense',
		shipping: Number(draft.shipping) || 0, discount: Number(draft.discount) || 0,
		note: draft.note || '', reference: draft.reference || '',
		refunded: draft.refunded ? 1 : 0
	})

	deleteOrderCategories.run(id)
	for (const categoryId of categoryIds) insertOrderCategory.run(id, categoryId)

	const existingItemIds = new Set(selectItemIds.all(id).map(r => r.id))
	const keptItemIds = new Set()
	draft.items.forEach((item, position) => {
		const row = {
			id: existingItemIds.has(item.id) ? item.id : newId('i'), orderId: id, position,
			title: String(item.title).trim(), quantity: Number(item.quantity), price: Number(item.price),
			retail: item.retail != null && item.retail !== '' ? Number(item.retail) : null,
			note: item.note || null
		}
		if (existingItemIds.has(item.id)) { keptItemIds.add(item.id); updateOrderItem.run(row) }
		else insertOrderItem.run(row)
	})
	for (const existingId of existingItemIds) if (!keptItemIds.has(existingId)) deleteOrderItem.run(existingId, id)
})

router.put('/:id', (req, res) => {
	if (!selectOrderExists.get(req.params.id, req.user.id)) throw notFound(req.params.id)
	const draft = req.body ?? {}
	assertValidOrderDraft(draft)

	updateOrderRows(req.user.id, req.params.id, draft)

	res.json(getDecoratedOrder(req.user.id, req.params.id))
})

router.delete('/:id', (req, res) => {
	const result = deleteOrder.run(req.params.id, req.user.id)
	if (!result.changes) throw notFound(req.params.id)
	res.json({ id: req.params.id })
})

/* ---- attachments ----
   An attachment belongs to the order as a whole (its receipt) or to one of its own items (a
   photo, or a PDF, of that particular product) -- never both. saveAttachments below is the one
   place a file becomes a stored row either way; the routes just decide which owner column it
   gets and which existing names it's deduped against. */

async function saveAttachments(files, owner, existingNames) {
	const added = [], skipped = []
	for (const file of files ?? []) {
		if (existingNames.has(file.originalname.toLowerCase())) { skipped.push(file.originalname); continue }
		existingNames.add(file.originalname.toLowerCase())
		const kind = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname) ? 'pdf' : 'image'
		// Images get a display copy and a thumbnail; a PDF's own bytes are kept exactly as
		// uploaded, with a rendered-first-page thumbnail added where that succeeds (lib/images.js).
		const processed = await processAttachment(kind, file.buffer, file.mimetype)
		const attachment = {
			id: newId('a'), orderId: owner.orderId ?? null, orderItemId: owner.orderItemId ?? null,
			name: file.originalname, kind,
			meta: `Added today${sep}${fileSizeLabel(processed.size)}`,
			contentType: processed.contentType ?? file.mimetype, size: processed.size,
			data: processed.data, dataCompressed: processed.dataCompressed ? 1 : 0,
			thumbnail: processed.thumbnail, thumbnailCompressed: processed.thumbnailCompressed ? 1 : 0,
			thumbnailContentType: processed.thumbnailContentType
		}
		insertAttachment.run(attachment)
		added.push({ id: attachment.id, name: attachment.name, kind: attachment.kind, meta: attachment.meta })
	}
	return { added, skipped }
}

router.post('/:id/attachments', upload.array('files'), async (req, res) => {
	if (!selectOrderExists.get(req.params.id, req.user.id)) throw notFound(req.params.id)
	const orderId = req.params.id
	const existingNames = new Set(selectExistingAttachmentNames.all(orderId).map(r => r.n))
	const { added, skipped } = await saveAttachments(req.files, { orderId }, existingNames)
	res.status(201).json({ order: getDecoratedOrder(req.user.id, orderId), added, skipped })
})

router.delete('/:id/attachments/:attachmentId', (req, res) => {
	if (!selectOrderExists.get(req.params.id, req.user.id)) throw notFound(req.params.id)
	deleteAttachment.run(req.params.attachmentId, req.params.id)
	res.json(getDecoratedOrder(req.user.id, req.params.id))
})

router.get('/:id/attachments/:attachmentId/file', (req, res) => {
	if (!selectOrderExists.get(req.params.id, req.user.id)) throw notFound(req.params.id)
	const attachment = selectAttachment.get(req.params.attachmentId, req.params.id)
	if (!attachment || !attachment.data) return res.status(404).json({ error: 'No file stored for that attachment.' })
	res.set('Content-Type', attachment.content_type || 'application/octet-stream')
	res.set('Content-Disposition', `inline; filename="${attachment.name.replace(/"/g, '')}"`)
	res.send(decompressBlob(attachment.data, attachment.data_is_compressed))
})

router.get('/:id/attachments/:attachmentId/thumbnail', (req, res) => {
	if (!selectOrderExists.get(req.params.id, req.user.id)) throw notFound(req.params.id)
	const attachment = selectAttachmentThumbnail.get(req.params.attachmentId, req.params.id)
	if (!attachment || !attachment.thumbnail) return res.status(404).json({ error: 'No thumbnail for that attachment.' })
	res.set('Content-Type', attachment.thumbnail_content_type || 'image/jpeg')
	res.set('Cache-Control', 'private, max-age=31536000, immutable')   // a thumbnail's bytes never change once made
	res.send(decompressBlob(attachment.thumbnail, attachment.thumbnail_is_compressed))
})

/* ---- item attachments ----
   The same shape as the order's own attachments above, one level down: a photo (or a PDF) of a
   single line item rather than the whole receipt. Nested under the order in the URL because an
   item id alone doesn't say which user's data it belongs to -- the order lookup is what proves
   ownership before the item lookup even runs. */

router.post('/:id/items/:itemId/attachments', upload.array('files'), async (req, res) => {
	if (!selectOrderExists.get(req.params.id, req.user.id)) throw notFound(req.params.id)
	if (!selectItemExists.get(req.params.itemId, req.params.id)) throw notFound(req.params.itemId)
	const itemId = req.params.itemId
	const existingNames = new Set(selectExistingItemAttachmentNames.all(itemId).map(r => r.n))
	const { added, skipped } = await saveAttachments(req.files, { orderItemId: itemId }, existingNames)
	res.status(201).json({ order: getDecoratedOrder(req.user.id, req.params.id), added, skipped })
})

router.delete('/:id/items/:itemId/attachments/:attachmentId', (req, res) => {
	if (!selectOrderExists.get(req.params.id, req.user.id)) throw notFound(req.params.id)
	if (!selectItemExists.get(req.params.itemId, req.params.id)) throw notFound(req.params.itemId)
	deleteItemAttachment.run(req.params.attachmentId, req.params.itemId)
	res.json(getDecoratedOrder(req.user.id, req.params.id))
})

router.get('/:id/items/:itemId/attachments/:attachmentId/file', (req, res) => {
	if (!selectOrderExists.get(req.params.id, req.user.id)) throw notFound(req.params.id)
	if (!selectItemExists.get(req.params.itemId, req.params.id)) throw notFound(req.params.itemId)
	const attachment = selectItemAttachment.get(req.params.attachmentId, req.params.itemId)
	if (!attachment || !attachment.data) return res.status(404).json({ error: 'No file stored for that attachment.' })
	res.set('Content-Type', attachment.content_type || 'application/octet-stream')
	res.set('Content-Disposition', `inline; filename="${attachment.name.replace(/"/g, '')}"`)
	res.send(decompressBlob(attachment.data, attachment.data_is_compressed))
})

router.get('/:id/items/:itemId/attachments/:attachmentId/thumbnail', (req, res) => {
	if (!selectOrderExists.get(req.params.id, req.user.id)) throw notFound(req.params.id)
	if (!selectItemExists.get(req.params.itemId, req.params.id)) throw notFound(req.params.itemId)
	const attachment = selectItemAttachmentThumbnail.get(req.params.attachmentId, req.params.itemId)
	if (!attachment || !attachment.thumbnail) return res.status(404).json({ error: 'No thumbnail for that attachment.' })
	res.set('Content-Type', attachment.thumbnail_content_type || 'image/jpeg')
	res.set('Cache-Control', 'private, max-age=31536000, immutable')
	res.send(decompressBlob(attachment.thumbnail, attachment.thumbnail_is_compressed))
})

/* ---- bulk import ----
   One program handing Spendly a whole expense history in one call: vendor and category names
   are resolved the same lookup-or-create way a manual order does (lib/findOrCreate.js), and
   each order is its own transaction so one malformed row doesn't sink the batch. Attachment
   images travel as base64 in the JSON body (see app.js for the raised body-size limit on this
   route) — the exporter is another program, not a browser form, so one JSON array is simpler
   for it to produce than a multipart request naming which files belong to which order. An item
   can carry its own `attachments` array the same shape as the order's -- a product photo, not
   the receipt -- landing on `order_item_id` instead, same as a manual upload through
   POST /:id/items/:itemId/attachments would. */

/** Resized outside the transaction: better-sqlite3's db.transaction() is synchronous and can't
    await sharp's promise-based resize. Shared by the order-level and each item-level list, since
    an import attachment is processed identically regardless of which row it ends up owned by. */
async function processImportAttachments(list) {
	const out = []
	for (const a of list ?? []) {
		if (!a?.data) continue
		const buffer = Buffer.from(a.data, 'base64')
		const kind = a.contentType === 'application/pdf' ? 'pdf' : 'image'
		const processed = await processAttachment(kind, buffer, a.contentType || 'application/octet-stream')
		out.push({ name: a.filename || 'attachment', kind, ...processed })
	}
	return out
}

const insertImportedAttachment = (a, owner) => insertAttachment.run({
	id: newId('a'), orderId: owner.orderId ?? null, orderItemId: owner.orderItemId ?? null,
	name: a.name, kind: a.kind, meta: `Imported${sep}${fileSizeLabel(a.size)}`,
	contentType: a.contentType, size: a.size, data: a.data, dataCompressed: a.dataCompressed ? 1 : 0,
	thumbnail: a.thumbnail, thumbnailCompressed: a.thumbnailCompressed ? 1 : 0, thumbnailContentType: a.thumbnailContentType
})

router.post('/import', async (req, res) => {
	const orders = Array.isArray(req.body?.orders) ? req.body.orders : []
	if (!orders.length) return res.status(400).json({ error: 'Provide a non-empty "orders" array.' })

	/* ?progress=stream turns the response into NDJSON: a {done, total} line as rows land --
	   at most ~100 of them however big the batch, so a 25k-row import is not spent writing
	   progress -- closed by the same result object the plain response carries. The status is
	   always 200 once streaming starts, the headers being long gone, so a streaming caller
	   reads the final line for the verdict; a script that posts without the flag keeps the
	   documented one-object response and its 400 when nothing imported. */
	const streaming = req.query.progress === 'stream'
	const step = Math.max(1, Math.ceil(orders.length / 100))
	if (streaming) {
		res.status(200).set({ 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' })
		res.flushHeaders()
	}

	const imported = [], failed = []
	for (const [index, draft] of orders.entries()) {
		try {
			const errors = validateOrderDraft(draft)
			if (Object.keys(errors).length) throw new Error(Object.values(errors)[0])

			const attachments = await processImportAttachments(draft.attachments)
			const itemAttachments = []
			for (const item of draft.items) itemAttachments.push(await processImportAttachments(item.attachments))

			const id = newId('o')
			db.transaction(() => {
				const itemIds = insertOrderRows(req.user.id, id, draft)
				for (const a of attachments) insertImportedAttachment(a, { orderId: id })
				itemIds.forEach((itemId, position) => {
					for (const a of itemAttachments[position]) insertImportedAttachment(a, { orderItemId: itemId })
				})
			})()
			imported.push(getDecoratedOrder(req.user.id, id))
		} catch (e) {
			failed.push({ index, error: e.message })
		}
		if (streaming && ((index + 1) % step === 0 || index + 1 === orders.length))
			res.write(JSON.stringify({ done: index + 1, total: orders.length }) + '\n')
	}

	const result = { imported: imported.length, orders: imported, failed }
	if (streaming) res.end(JSON.stringify(result) + '\n')
	else res.status(failed.length && !imported.length ? 400 : 200).json(result)
})
