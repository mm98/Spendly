import { Router } from 'express'
import multer from 'multer'
import { createHash } from 'crypto'
import { db } from '../db.js'
import { requireConfirmed } from '../lib/auth.js'
import { newId } from '../lib/ids.js'
import { toEpoch } from '../lib/dates.js'
import { getDecoratedOrder, decorateOrderListRows } from '../lib/decorate.js'
import { assertValidOrderDraft, validateOrderDraft } from '../lib/validate.js'
import { findOrCreateVendor, findOrCreateCategory, findVendorIdByAnyName } from '../lib/findOrCreate.js'
import { orderTotalsSelectList } from '../lib/orderColumns.js'
import { MAX_PAGE_SIZE, MAX_UPLOAD_MB } from '../lib/constants.js'
import { resolveStatus, statusKeys } from '../lib/statuses.js'
import { processAttachment } from '../lib/images.js'
import { assertImageOrPdf } from '../lib/fileType.js'
import { decompressBlob } from '../lib/blobCompression.js'
import { pageCount, pageImage } from '../lib/filePages.js'
import { restoreOrder, trashOrder } from '../lib/orderTrash.js'
import { sep, fileSizeLabel } from '../lib/copy.js'
import { MATCHERS, asciiNeedle, escapeLike, vendorIdsMatching } from '../lib/textSearch.js'

export const router = Router()
// defParamCharset: busboy (multer's parser) decodes every multipart header as latin1 by
// default, so a filename typed with a non-ASCII character crosses the wire as UTF-8 bytes and
// comes back mojibake ("rengÃ¸ringsplaner.pdf" for "rengøringsplaner.pdf") -- browsers never
// send the RFC 5987 encoding that would tell busboy otherwise. Declaring the charset here
// decodes it correctly at the source, for every field this instance parses.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 }, defParamCharset: 'utf8' })

const isStatus = (userId, status) => statusKeys(userId).includes(status)
// a status written as its name or in any case is stored as the account's key for it
const keyed = (userId, draft) => (draft.status ? { ...draft, status: resolveStatus(userId, draft.status) ?? draft.status } : draft)

const notFound = id => Object.assign(new Error('No order ' + id), { status: 404 })

/* ---- statements, prepared once at module load rather than per request ---- */

const selectOrderExists = db.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?')
const selectItemExists = db.prepare('SELECT id FROM order_items WHERE id = ? AND order_id = ?')
const selectDraftDefaults = db.prepare('SELECT default_status, default_kind FROM settings WHERE user_id = ?')
const countAllOrders = db.prepare('SELECT COUNT(*) c FROM orders WHERE user_id = ?')
const deleteOrderCategories = db.prepare('DELETE FROM order_categories WHERE order_id = ?')
const insertOrder = db.prepare(`INSERT INTO orders (id, user_id, vendor_id, date, status, kind, shipping, discount, note, reference, refunded)
	VALUES (@id, @userId, @vendorId, @date, @status, @kind, @shipping, @discount, @note, @reference, @refunded)`)
const updateOrderRow = db.prepare(`UPDATE orders SET vendor_id=@vendorId, date=@date, status=@status, kind=@kind,
	shipping=@shipping, discount=@discount, note=@note, reference=@reference, refunded=@refunded WHERE id=@id AND user_id=@userId`)
const insertOrderCategory = db.prepare('INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)')
const deleteOrderStatuses = db.prepare('DELETE FROM order_statuses WHERE order_id = ?')
const insertOrderStatus = db.prepare('INSERT INTO order_statuses (id, order_id, status, date) VALUES (?, ?, ?, ?)')
const selectItemIds = db.prepare('SELECT id FROM order_items WHERE order_id = ?')
const insertOrderItem = db.prepare(`INSERT INTO order_items (id, order_id, position, title, quantity, price, retail, note)
	VALUES (@id, @orderId, @position, @title, @quantity, @price, @retail, @note)`)
const updateOrderItem = db.prepare(`UPDATE order_items SET position=@position, title=@title, quantity=@quantity,
	price=@price, retail=@retail, note=@note WHERE id=@id AND order_id=@orderId`)
const deleteOrderItem = db.prepare('DELETE FROM order_items WHERE id = ? AND order_id = ?')
const insertAttachment = db.prepare(`INSERT INTO attachments
	(id, order_id, order_item_id, name, kind, meta, content_type, size, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type, sha256, pages)
	VALUES (@id, @orderId, @orderItemId, @name, @kind, @meta, @contentType, @size, @data, @dataCompressed, @thumbnail, @thumbnailCompressed, @thumbnailContentType, @sha256, @pages)`)
/** The hash of a file's bytes as they arrived, before any resizing. */
export const sourceHash = buffer => createHash('sha256').update(buffer).digest('hex')
const selectExistingAttachmentNames = db.prepare('SELECT lower(name) n FROM attachments WHERE order_id = ?')
const selectExistingItemAttachmentNames = db.prepare('SELECT lower(name) n FROM attachments WHERE order_item_id = ?')
const deleteAttachment = db.prepare('DELETE FROM attachments WHERE id = ? AND order_id = ?')
const deleteItemAttachment = db.prepare('DELETE FROM attachments WHERE id = ? AND order_item_id = ?')
const selectAttachment = db.prepare('SELECT name, content_type, data, data_is_compressed FROM attachments WHERE id = ? AND order_id = ?')
const selectItemAttachment = db.prepare('SELECT name, content_type, data, data_is_compressed FROM attachments WHERE id = ? AND order_item_id = ?')
const selectAttachmentThumbnail = db.prepare('SELECT thumbnail, thumbnail_is_compressed, thumbnail_content_type FROM attachments WHERE id = ? AND order_id = ?')
const selectItemAttachmentThumbnail = db.prepare('SELECT thumbnail, thumbnail_is_compressed, thumbnail_content_type FROM attachments WHERE id = ? AND order_item_id = ?')
/* ---- draft ---- */

router.get('/draft', (req, res) => {
	const settings = selectDraftDefaults.get(req.user.id)
	res.json({
		vendor: '', date: req.today,
		status: settings?.default_status ?? 'Delivered', kind: settings?.default_kind ?? 'Expense',
		deliveredDate: req.today, returnedDate: req.today,
		categories: [], shipping: '', discount: '', reference: '', note: '', items: []
	})
})

/* ---- list: real SQL filter/sort/paginate over the orders table's stored totals ----
   Built as parameterized clauses reused between the COUNT (matched) and the SELECT (page), so
   the two can never disagree about which rows qualify. LIMIT/OFFSET does the paging in SQLite
   rather than in JS, and only the resulting page (not the whole table) is passed to
   decorateOrderListRows for its batched child-row queries. */

/* A day holds several orders, so the day's own ties go to when each was added, then the rowid
   (insertion order, since created_at has whole seconds): "newest" means the one added last. */
const SORT_SQL = {
	'date-desc': 'ot.date DESC, ot.created_at DESC, ot.rowid DESC',
	'date-asc': 'ot.date ASC, ot.created_at ASC, ot.rowid ASC',
	'amount-desc': 'ot.total DESC, ot.id DESC',
	'amount-asc': 'ot.total ASC, ot.id ASC',
	'discount-desc': 'ot.discount DESC, ot.id DESC',
	'discount-asc': 'ot.discount ASC, ot.id ASC',
	'vendor-asc': 'v.name COLLATE NOCASE ASC, ot.id ASC'
}

/* The sort is resolved here as well as ordered on below, because one sort narrows the set
   rather than only ordering it: an order with no discount is not an order "with the lowest
   discount", it is an order the question does not apply to, so ranking by discount is over
   discounted orders only. That predicate has to live in this builder and nowhere else -- the
   COUNT and the page are both built from what it returns, so a row the page drops is a row
   the "N matching" line above it has already stopped counting. And the resolution itself
   happens once, on the key the ORDER BY will actually use: reading raw q.sort here while the
   ORDER BY fell back to date-desc let an unknown `discount-x` narrow to discounted orders
   while sorting by date -- two readers of one parameter, disagreeing.

   `filtered` reports whether any clause beyond the account's own was added, so the route can
   reuse its unconditional COUNT instead of running the identical query twice. */
function buildOrderFilter(userId, q, except = null) {
	const sortKey = SORT_SQL[q.sort] ? q.sort : 'date-desc'
	const where = ['ot.user_id = @userId']
	const params = { userId }

	if (sortKey.startsWith('discount-')) where.push('ot.discount > 0')

	// a facet takes several values, comma-separated; `except` leaves one facet out, for its own counts
	const vendorIds = listOf(q.vendorId)
	if (vendorIds.length && except !== 'vendor') {
		if (vendorIds.length === 1) { where.push('ot.vendor_id = @vendorId'); params.vendorId = vendorIds[0] }
		else { where.push('ot.vendor_id IN (SELECT value FROM json_each(@vendorIds))'); params.vendorIds = JSON.stringify(vendorIds) }
	}
	const categoryIds = listOf(q.categoryId)
	if (categoryIds.length && except !== 'category') {
		const parts = []
		// The sentinel every "Without category" row links with. Real ids are newId()-prefixed,
		// so nothing an account creates can collide with it. category_count is the stored,
		// trigger-maintained column the split's own remainder is computed from (lib/stats.js),
		// so the rows this matches are exactly the orders that remainder added up.
		if (categoryIds.includes('none')) parts.push('ot.category_count = 0')
		// IN driven from the category's own (indexed, covering) links rather than an EXISTS
		// probe per order row: the filter reads the rows the category actually has.
		const real = categoryIds.filter(id => id !== 'none')
		if (real.length === 1) {
			parts.push('ot.id IN (SELECT order_id FROM order_categories WHERE category_id = @categoryId)')
			params.categoryId = real[0]
		} else if (real.length) {
			parts.push('ot.id IN (SELECT order_id FROM order_categories WHERE category_id IN (SELECT value FROM json_each(@categoryIds)))')
			params.categoryIds = JSON.stringify(real)
		}
		where.push(parts.length > 1 ? `(${parts.join(' OR ')})` : parts[0])
	}
	const statuses = listOf(q.status).filter(s => s !== 'Any')
	if (statuses.length && except !== 'status') {
		if (statuses.length === 1) { where.push('ot.status = @status'); params.status = statuses[0] }
		else { where.push('ot.status IN (SELECT value FROM json_each(@statuses))'); params.statuses = JSON.stringify(statuses) }
	}
	if (q.kind) { where.push('ot.kind = @kind'); params.kind = q.kind }

	// the receipt is a file on the order itself; both values chosen is no filter at all
	const receipt = listOf(q.receipt).filter(r => r === 'attached' || r === 'missing')
	if (receipt.length === 1 && except !== 'receipt')
		where.push(`${receipt[0] === 'missing' ? 'NOT ' : ''}EXISTS (SELECT 1 FROM attachments a WHERE a.order_id = ot.id)`)
	// any file at all: the order's own, or one on any of its lines
	if (q.files === '1') where.push(`(EXISTS (SELECT 1 FROM attachments a WHERE a.order_id = ot.id)
		OR EXISTS (SELECT 1 FROM order_items oi JOIN attachments a ON a.order_item_id = oi.id WHERE oi.order_id = ot.id))`)
	if (q.discounted === '1') where.push('ot.saved > 0')

	/* Finite or absent -- never NaN. better-sqlite3 binds NaN as NULL, and `date >= NULL`
	   matches nothing, so `?from=2020/01/01` (toEpoch answers NaN for a date it cannot parse,
	   same for `?minAmount=abc`) silently emptied the whole list while every count read 0. A
	   bound that does not parse is a bound that was not given. */
	const from = toEpoch(q.from), to = toEpoch(q.to)
	const minAmount = q.minAmount != null && q.minAmount !== '' ? Number(q.minAmount) : NaN
	const maxAmount = q.maxAmount != null && q.maxAmount !== '' ? Number(q.maxAmount) : NaN
	if (Number.isFinite(from)) { where.push('ot.date >= @from'); params.from = from }
	if (Number.isFinite(to)) { where.push('ot.date <= @to'); params.to = to }
	if (Number.isFinite(minAmount)) { where.push('ot.total >= @minAmount'); params.minAmount = minAmount }
	if (Number.isFinite(maxAmount)) { where.push('ot.total <= @maxAmount'); params.maxAmount = maxAmount }

	/* One LIKE over the order's trigger-maintained search_text (its note and item titles --
	   see migrations/002) and one over its reference, instead of a correlated scan of
	   order_items per order row, plus the
	   two renameable names reached through their own small tables: matching vendors and
	   categories resolve to id sets first (a dozen rows and ten), and the orders side is an
	   indexed IN. LIKE is already case-insensitive for ASCII, which is exactly what lower()
	   gives (SQLite's lower() never folds non-ASCII either), so the needle stays lowercased and
	   the columns are compared as stored -- with % and _ escaped so the needle is the literal
	   text the search box holds, and a needle carrying a non-ASCII letter (which LIKE cannot
	   case-fold) matches through contains_fold instead; lib/textSearch.js holds both halves. */
	/* The vendor half composes lib/textSearch.js's one vendor-match fragment rather than
	   restating it: matching must go through that shared vendor-matching logic, or it can
	   disagree with the palette about the same account. Categories stay inline because a
	   category has one name and nothing else answers for it; the day that changes, its clause
	   moves to the lib the same way. */
	const needle = String(q.query ?? '').trim().toLowerCase()
	if (needle) {
		const match = MATCHERS[asciiNeedle(needle) ? 'ascii' : 'fold']
		params.needle = asciiNeedle(needle) ? `%${escapeLike(needle)}%` : needle
		where.push(`(
			${match('ot.search_text')}
			OR ${match('ot.reference')}
			OR ot.vendor_id IN (${vendorIdsMatching(match)})
			OR ot.id IN (SELECT oc.order_id FROM order_categories oc JOIN categories c ON c.id = oc.category_id
				WHERE c.user_id = @userId AND ${match('c.name')})
		)`)
	}

	return { whereSql: where.join(' AND '), params, sortKey, filtered: where.length > 1 }
}

/** How many orders a list request matches: a saved view's live count (routes/views.js). */
export function countMatching(userId, q) {
	const { whereSql, params } = buildOrderFilter(userId, q)
	return db.prepare(`SELECT COUNT(*) c FROM orders ot WHERE ${whereSql}`).get(params).c
}

const listOf = v => [...new Set([].concat(v ?? []).flatMap(x => String(x).split(',')).map(x => x.trim()).filter(Boolean))]

/* with=facets: each facet's counts under every other filter (what ticking a value would add), and
   the matched set's sum and saving without cancelled orders, which never count toward spend. */
function orderFacets(userId, q) {
	const counts = (except, select, group, join = '') => {
		const { whereSql, params } = buildOrderFilter(userId, q, except)
		return db.prepare(`SELECT ${select} FROM orders ot ${join} WHERE ${whereSql}${group ? ` GROUP BY ${group}` : ''}`).all(params)
	}
	const byKey = (rows, key) => Object.fromEntries(rows.map(r => [r[key], r.n]))
	const [receipt] = counts('receipt', 'COUNT(*) n, COALESCE(SUM(EXISTS (SELECT 1 FROM attachments a WHERE a.order_id = ot.id)), 0) attached')
	const [sum] = counts(null, `COALESCE(SUM(CASE WHEN ot.status = 'Cancelled' THEN 0 ELSE ot.total END), 0) total,
		COALESCE(SUM(CASE WHEN ot.status = 'Cancelled' THEN 0 ELSE MAX(ot.saved, 0) END), 0) saved`)
	return {
		summary: { total: sum.total, saved: sum.saved },
		facets: {
			status: byKey(counts('status', 'ot.status, COUNT(*) n', 'ot.status'), 'status'),
			vendor: byKey(counts('vendor', 'ot.vendor_id, COUNT(*) n', 'ot.vendor_id'), 'vendor_id'),
			category: byKey(counts('category', 'oc.category_id, COUNT(*) n', 'oc.category_id', 'JOIN order_categories oc ON oc.order_id = ot.id'), 'category_id'),
			receipt: { attached: receipt.attached, missing: receipt.n - receipt.attached }
		}
	}
}

router.get('/', (req, res) => {
	const q = req.query
	const { whereSql, params, sortKey, filtered } = buildOrderFilter(req.user.id, q)
	const orderSql = SORT_SQL[sortKey]

	/* The vendors side exists for exactly one reader: the vendor-name sort. The filter above
	   never references v (search reaches vendors through its own subquery), so the COUNT is
	   always index-only on orders, and the page brings vendors in only when its ORDER BY needs
	   the name -- an unconditional join cost the COUNT a vendors probe per counted row. When it
	   does, vendors leads and CROSS JOIN pins it there: idx_vendors_user_name hands the page
	   the name order and each vendor's orders come off the widened vendor index, instead of a
	   temp B-tree re-sorting every one of the account's rows on every page (18.5ms -> 2.9ms a
	   page at 50,000 orders, identical rows -- and settings.sort can make this sort an
	   account's every-load default). */
	const vendorSort = orderSql.includes('v.name')
	const fromSql = vendorSort ? 'vendors v CROSS JOIN orders ot ON ot.vendor_id = v.id' : 'orders ot'
	const pageWhereSql = vendorSort ? `v.user_id = @userId AND ${whereSql}` : whereSql

	// An unfiltered request's "matched" is the account's own count, already queried below for
	// `total` on every response -- only a narrowed set is a second question.
	const total = countAllOrders.get(req.user.id).c
	const matched = filtered ? db.prepare(`
		SELECT COUNT(*) c FROM orders ot WHERE ${whereSql}
	`).get(params).c : total

	// LIMIT/OFFSET go straight into the query below, so this is the one place a caller-chosen
	// pageSize has to be made safe before it reaches SQL: SQLite treats any negative LIMIT as
	// "no limit at all", not an error, so a negative or missing pageSize is clamped to at least
	// 1 here rather than passed through, keeping the page/pages fields honest about the data.
	// The ceiling bounds the other direction: an oversized ask (or none) is clamped so it pages
	// like any other reader instead of decorating a whole account into one response.
	const requestedSize = Number(q.pageSize) || Number(q.limit) || matched || 1
	const size = Math.min(MAX_PAGE_SIZE, Number.isFinite(requestedSize)
		? Math.max(1, Math.floor(requestedSize)) : Math.max(1, matched))
	const pages = Math.max(1, Math.ceil(matched / size))
	const at = Math.min(Math.max(1, Number(q.page) || 1), pages)

	const totalsRows = db.prepare(`
		SELECT ${orderTotalsSelectList('ot')} FROM ${fromSql}
		WHERE ${pageWhereSql}
		ORDER BY ${orderSql}
		LIMIT @limit OFFSET @offset
	`).all({ ...params, limit: size, offset: (at - 1) * size })

	// `with=itemTitles` is the copy picker's: each row's first line names. The order list asks
	// `with=rows` for what only its rows and cards draw, and `with=facets` for its rail and sum.
	const wants = listOf(q.with)
	res.json({
		orders: decorateOrderListRows(totalsRows, { itemTitles: wants.includes('itemTitles'), listRows: wants.includes('rows') }),
		matched, total, pages,
		...(wants.includes('facets') ? orderFacets(req.user.id, q) : {})
	})
})

/* "You order these often" (3b): the latest 1,000 orders grouped by vendor and item names, where
   a group came back twice or more; each answers with its newest order, the one a copy starts from. */
const selectShapes = db.prepare(`
	SELECT o.id, o.vendor_id, o.date,
		(SELECT group_concat(t, char(31)) FROM (SELECT lower(trim(title)) AS t FROM order_items WHERE order_id = o.id ORDER BY t)) AS shape
	FROM orders o WHERE o.user_id = ? AND o.item_count > 0
	ORDER BY o.date DESC, o.created_at DESC LIMIT 1000`)
const selectTotalsRow = db.prepare(`SELECT ${orderTotalsSelectList('ot')} FROM orders ot WHERE ot.id = ? AND ot.user_id = ?`)
router.get('/often', (req, res) => {
	const groups = new Map()
	for (const row of selectShapes.all(req.user.id)) {
		const key = row.vendor_id + '\u0000' + row.shape
		const group = groups.get(key)
		if (group) group.times++
		else groups.set(key, { newest: row.id, last: row.date, times: 1 })
	}
	const often = [...groups.values()].filter(g => g.times > 1)
		.sort((a, b) => b.times - a.times || b.last - a.last).slice(0, 3)
	const rows = decorateOrderListRows(often.map(g => selectTotalsRow.get(g.newest, req.user.id)), { itemTitles: true })
	res.json({ orders: rows.map((order, i) => ({ ...order, times: often[i].times })) })
})

/* The monthly limits a saved order counts against (8b): each named category's limit and what its
   month spent without this order, an order's total shared between its categories as in statistics,
   where a draft or a cancelled order spends nothing. */
const selectCategoryLimit = db.prepare('SELECT id, name, budget FROM categories WHERE user_id = ? AND name = ? COLLATE NOCASE AND budget > 0')
const selectCategoryMonthSpend = db.prepare(`
	SELECT COALESCE(SUM(ot.total * 1.0 / ot.category_count), 0) FROM order_categories oc
	JOIN orders ot ON ot.id = oc.order_id
	WHERE oc.category_id = @categoryId AND ot.user_id = @userId AND ot.date >= @from AND ot.date < @to AND ot.id <> @exclude
		AND ot.status NOT IN ('Cancelled', 'Draft')`).pluck()
router.get('/limits', (req, res) => {
	const day = String(req.query.date ?? '')
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ error: 'A date is needed, as YYYY-MM-DD.' })
	const [year, month] = day.split('-').map(Number)
	const from = Date.UTC(year, month - 1, 1) / 1000, to = Date.UTC(year, month, 1) / 1000
	const names = [req.query.categories ?? []].flat().map(String).filter(Boolean).slice(0, 50)
	const limits = names.map(name => selectCategoryLimit.get(req.user.id, name)).filter(Boolean).map(c => ({
		name: c.name, budget: c.budget,
		spend: selectCategoryMonthSpend.get({ categoryId: c.id, userId: req.user.id, from, to, exclude: String(req.query.exclude ?? '') })
	}))
	res.json({ month: day.slice(0, 7), limits })
})

router.get('/:id', (req, res) => {
	const order = getDecoratedOrder(req.user.id, req.params.id)
	if (!order) return res.status(404).json({ error: 'No order ' + req.params.id })
	res.json(order)
})

/* ---- create / update / delete ---- */

/** order_statuses is a log: Ordered from the order's own date, Delivered/Returned only when
    supplied. Delete-and-reinsert like order_categories below -- today's form edits only the latest. */
function saveOrderStatuses(orderId, draft) {
	deleteOrderStatuses.run(orderId)
	insertOrderStatus.run(newId('os'), orderId, 'Ordered', toEpoch(draft.date))
	if (draft.deliveredDate && (draft.status === 'Delivered' || draft.status === 'Returned'))
		insertOrderStatus.run(newId('os'), orderId, 'Delivered', toEpoch(draft.deliveredDate))
	if (draft.returnedDate && draft.status === 'Returned')
		insertOrderStatus.run(newId('os'), orderId, 'Returned', toEpoch(draft.returnedDate))
}

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
	saveOrderStatuses(id, draft)
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

/* An order saved without a reference gets the account's next number. The first one counts on
   from the orders the account already has, so it reads like the ledger's own position. */
const nextReference = db.prepare(`INSERT INTO order_reference_counters (user_id, last)
	VALUES (@userId, (SELECT COUNT(*) FROM orders WHERE user_id = @userId) + 1)
	ON CONFLICT (user_id) DO UPDATE SET last = last + 1
	RETURNING last`).pluck()
export const REFERENCE_PREFIX = 'SPENDLY-'

router.post('/', (req, res) => {
	const draft = keyed(req.user.id, req.body ?? {})
	assertValidOrderDraft(draft, req.today, statusKeys(req.user.id))
	const id = newId('o')
	db.transaction(() => {
		const reference = String(draft.reference ?? '').trim() || REFERENCE_PREFIX + nextReference.get({ userId: req.user.id })
		insertOrderRows(req.user.id, id, { ...draft, reference })
	})()
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
	saveOrderStatuses(id, draft)

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
	const draft = keyed(req.user.id, req.body ?? {})
	assertValidOrderDraft(draft, req.today, statusKeys(req.user.id))

	updateOrderRows(req.user.id, req.params.id, draft)

	res.json(getDecoratedOrder(req.user.id, req.params.id))
})

// `undo` names the kept copy that POST /trash/:undo/restore puts back (6d)
router.delete('/:id', (req, res) => {
	const undo = trashOrder(req.user.id, req.params.id)
	if (!undo) throw notFound(req.params.id)
	res.json({ id: req.params.id, undo })
})

router.post('/trash/:trashId/restore', (req, res) => {
	const id = restoreOrder(req.user.id, req.params.trashId)
	res.json(getDecoratedOrder(req.user.id, id))
})

/* ---- several orders at once (2a, 2e): one transaction, so a bulk edit never half-lands ----
   A status keeps the log true: Delivered and Returned gain their events, dated today. */

const selectOrderForBulk = db.prepare('SELECT id, date, status FROM orders WHERE id = ? AND user_id = ?')
const updateOrderStatus = db.prepare('UPDATE orders SET status = ? WHERE id = ?')
const selectStatusEvent = db.prepare('SELECT id, date FROM order_statuses WHERE order_id = ? AND status = ?')
const deleteStatusEvents = db.prepare('DELETE FROM order_statuses WHERE order_id = ? AND status = ?')
const insertOrderCategoryOnce = db.prepare('INSERT OR IGNORE INTO order_categories (order_id, category_id) VALUES (?, ?)')
const deleteOrderCategory = db.prepare('DELETE FROM order_categories WHERE order_id = ? AND category_id = ?')

const applyBulk = db.transaction((userId, ids, change, today) => {
	const day = Math.max(toEpoch(today), 0)
	const categoryIds = (change.addCategories ?? []).map(name => findOrCreateCategory(userId, name))
	let changed = 0
	for (const id of ids) {
		const order = selectOrderForBulk.get(id, userId)
		if (!order) continue
		changed++
		if (change.delete) { deleteOrder.run(id, userId); continue }
		if (change.status) {
			updateOrderStatus.run(change.status, id)
			const at = Math.max(day, order.date)
			const event = (status, move) => {
				const had = selectStatusEvent.get(id, status)
				if (had && !move) return
				deleteStatusEvents.run(id, status)
				insertOrderStatus.run(newId('os'), id, status, at)
			}
			if (change.status === 'Ordered') { deleteStatusEvents.run(id, 'Delivered'); deleteStatusEvents.run(id, 'Returned') }
			if (change.status === 'Delivered') { deleteStatusEvents.run(id, 'Returned'); event('Delivered', !!change.deliveredToday) }
			if (change.status === 'Returned') { event('Delivered', false); event('Returned', false) }
		}
		for (const categoryId of categoryIds) insertOrderCategoryOnce.run(id, categoryId)
		for (const categoryId of change.removeCategories ?? []) deleteOrderCategory.run(id, categoryId)
	}
	return changed
})

router.post('/bulk', (req, res) => {
	const body = req.body ?? {}
	const ids = [...new Set(Array.isArray(body.ids) ? body.ids.map(String) : [])]
	if (!ids.length) return res.status(400).json({ error: 'Choose at least one order.' })
	if (ids.length > MAX_PAGE_SIZE * 10) return res.status(400).json({ error: 'Too many orders at once. Choose fewer orders.' })
	const change = {
		delete: body.delete === true,
		status: body.status ? String(body.status) : null,
		deliveredToday: body.deliveredToday === true,
		addCategories: Array.isArray(body.addCategories) ? body.addCategories.map(n => String(n).trim()).filter(Boolean) : [],
		removeCategories: Array.isArray(body.removeCategories) ? body.removeCategories.map(String) : []
	}
	if (change.status && !isStatus(req.user.id, change.status)) return res.status(400).json({ error: 'That status does not exist.' })
	const changed = applyBulk(req.user.id, ids, change, req.today)
	res.json({ changed })
})

/* ---- attachments ----
   An attachment belongs to the order as a whole (its receipt) or to one of its own items (a
   photo, or a PDF, of that particular product) -- never both. saveAttachments below is the one
   place a file becomes a stored row either way; the routes just decide which owner column it
   gets and which existing names it's deduped against. */

/* Processing first, then every row in one transaction -- the same split the import path
   makes, and for the same two reasons: db.transaction is synchronous so sharp's awaits cannot
   sit inside it, and inserting per-file as each finished processing committed per-file, so a
   failure partway stored some of one upload's files while the response reported none of them. */
const insertAttachmentRows = db.transaction(rows => { for (const row of rows) insertAttachment.run(row) })

async function saveAttachments(files, owner, existingNames) {
	const rows = [], skipped = []
	for (const file of files ?? []) {
		if (existingNames.has(file.originalname.toLowerCase())) { skipped.push(file.originalname); continue }
		existingNames.add(file.originalname.toLowerCase())
		// Images get a display copy and a thumbnail; a PDF's own bytes are kept exactly as
		// uploaded, with a rendered-first-page thumbnail added where that succeeds. The kind is
		// the one the bytes declare (lib/fileType.js), not the one the filename or the browser's
		// mimetype claims -- a receipt saved as .jpg is still a PDF and is filed as one.
		const processed = await processAttachment(file.buffer, file.mimetype, file.originalname)
		rows.push({
			id: newId('a'), orderId: owner.orderId ?? null, orderItemId: owner.orderItemId ?? null,
			name: file.originalname, kind: processed.kind,
			meta: `Added today${sep}${fileSizeLabel(processed.size)}`,
			contentType: processed.contentType ?? file.mimetype, size: processed.size,
			data: processed.data, dataCompressed: processed.dataCompressed ? 1 : 0,
			thumbnail: processed.thumbnail, thumbnailCompressed: processed.thumbnailCompressed ? 1 : 0,
			thumbnailContentType: processed.thumbnailContentType,
			sha256: sourceHash(file.buffer), pages: processed.pages ?? null
		})
	}
	insertAttachmentRows(rows)
	return { added: rows.map(a => ({ id: a.id, name: a.name, kind: a.kind, meta: a.meta })), skipped }
}

router.post('/:id/attachments', upload.array('files'), async (req, res) => {
	if (!selectOrderExists.get(req.params.id, req.user.id)) throw notFound(req.params.id)
	const orderId = req.params.id
	assertImageOrPdf(req.files ?? [])
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
	res.set('Content-Type', attachment.thumbnail_content_type || 'image/webp')
	res.set('Cache-Control', 'private, max-age=31536000, immutable')   // a thumbnail's bytes never change once made
	res.send(decompressBlob(attachment.thumbnail, attachment.thumbnail_is_compressed))
})

/* A file's pages for the viewer (12b): `{ pages }`, then each page as an image. The file may be
   the order's own or one of its lines' photos. */
const selectAttachmentOwner = db.prepare(`SELECT a.id FROM attachments a
	LEFT JOIN order_items oi ON oi.id = a.order_item_id
	WHERE a.id = @id AND (a.order_id = @orderId OR oi.order_id = @orderId)`)
const ownedAttachment = req => {
	if (!selectOrderExists.get(req.params.id, req.user.id)) throw notFound(req.params.id)
	if (!selectAttachmentOwner.get({ id: req.params.attachmentId, orderId: req.params.id })) throw notFound(req.params.attachmentId)
	return req.params.attachmentId
}

router.get('/:id/attachments/:attachmentId/pages', async (req, res) => {
	res.json({ pages: await pageCount('attachment', ownedAttachment(req)) })
})

router.get('/:id/attachments/:attachmentId/pages/:page', async (req, res) => {
	const page = await pageImage('attachment', ownedAttachment(req), Number(req.params.page))
	if (!page) return res.status(404).json({ error: 'No such page.' })
	res.set('Content-Type', page.contentType)
	res.set('Cache-Control', 'private, max-age=31536000, immutable')
	res.send(page.image)
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
	assertImageOrPdf(req.files ?? [])
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
	res.set('Content-Type', attachment.thumbnail_content_type || 'image/webp')
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
		const processed = await processAttachment(buffer, a.contentType || 'application/octet-stream', a.filename)
		out.push({ name: a.filename || 'attachment', ...processed, sha256: sourceHash(buffer) })
	}
	return out
}

const insertImportedAttachment = (a, owner) => insertAttachment.run({
	id: newId('a'), orderId: owner.orderId ?? null, orderItemId: owner.orderItemId ?? null,
	name: a.name, kind: a.kind, meta: `Imported${sep}${fileSizeLabel(a.size)}`,
	contentType: a.contentType, size: a.size, data: a.data, dataCompressed: a.dataCompressed ? 1 : 0,
	thumbnail: a.thumbnail, thumbnailCompressed: a.thumbnailCompressed ? 1 : 0, thumbnailContentType: a.thumbnailContentType,
	sha256: a.sha256, pages: a.pages ?? null
})

const selectImport = db.prepare('SELECT id, undone_at FROM imports WHERE id = ? AND user_id = ?')
const selectCategoryByName = db.prepare('SELECT id FROM categories WHERE user_id = ? AND lower(name) = lower(?)')
const tagOrder = db.prepare('UPDATE orders SET import_id = ? WHERE id = ?')
const tagVendor = db.prepare('UPDATE vendors SET import_id = ? WHERE user_id = ? AND lower(name) = lower(?) AND import_id IS NULL')
const tagCategory = db.prepare('UPDATE categories SET import_id = ? WHERE user_id = ? AND lower(name) = lower(?) AND import_id IS NULL')
const countImport = db.prepare(`UPDATE imports SET orders = orders + @orders, lines = lines + @lines,
	skipped = skipped + @skipped, vendors = vendors + @vendors WHERE id = @id`)

router.post('/import', requireConfirmed, async (req, res) => {
	const orders = Array.isArray(req.body?.orders) ? req.body.orders : []
	if (!orders.length) return res.status(400).json({ error: 'Provide a non-empty "orders" array.' })
	// ?importId= tags what this batch writes with an import record, so the import can be undone
	const importId = req.query.importId ? String(req.query.importId) : null
	const importRow = importId ? selectImport.get(importId, req.user.id) : null
	if (importId && (!importRow || importRow.undone_at)) return res.status(400).json({ error: 'That import is not open any more. Start it again.' })

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
	let createdVendors = 0, lines = 0
	for (const [index, raw] of orders.entries()) {
		const draft = raw && typeof raw === 'object' ? keyed(req.user.id, raw) : raw
		try {
			const errors = validateOrderDraft(draft, req.today, statusKeys(req.user.id))
			if (Object.keys(errors).length) throw new Error(Object.values(errors)[0])

			const attachments = await processImportAttachments(draft.attachments)
			const itemAttachments = []
			for (const item of draft.items) itemAttachments.push(await processImportAttachments(item.attachments))

			const id = newId('o')
			db.transaction(() => {
				const newVendor = importId && !findVendorIdByAnyName(req.user.id, draft.vendor)
				const newCategories = importId ? (draft.categories ?? []).filter(name => !selectCategoryByName.get(req.user.id, String(name).trim())) : []
				const itemIds = insertOrderRows(req.user.id, id, draft)
				if (importId) {
					tagOrder.run(importId, id)
					if (newVendor) { tagVendor.run(importId, req.user.id, String(draft.vendor).trim()); createdVendors++ }
					for (const name of newCategories) tagCategory.run(importId, req.user.id, String(name).trim())
					lines += draft.items.length
				}
				for (const a of attachments) insertImportedAttachment(a, { orderId: id })
				itemIds.forEach((itemId, position) => {
					for (const a of itemAttachments[position]) insertImportedAttachment(a, { orderItemId: itemId })
				})
			})()
			imported.push(getDecoratedOrder(req.user.id, id))
		} catch (e) {
			failed.push({ index, error: e.message })
		}
		if (streaming && ((index + 1) % step === 0 || index + 1 === orders.length)) {
			res.write(JSON.stringify({ done: index + 1, total: orders.length }) + '\n')
			// A write leaves the socket only once the loop yields; without this every line lands at the end.
			await new Promise(resolve => setImmediate(resolve))
		}
	}

	if (importId) countImport.run({ id: importId, orders: imported.length, lines, skipped: failed.length, vendors: createdVendors })
	const result = { imported: imported.length, orders: imported, failed }
	if (streaming) res.end(JSON.stringify(result) + '\n')
	else res.status(failed.length && !imported.length ? 400 : 200).json(result)
})
