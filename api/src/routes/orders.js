import { Router } from 'express'
import multer from 'multer'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { toEpoch } from '../lib/dates.js'
import { getDecoratedOrder, decorateOrderRows } from '../lib/decorate.js'
import { assertValidOrderDraft, validateOrderDraft } from '../lib/validate.js'
import { findOrCreateVendor, findOrCreateCategory } from '../lib/findOrCreate.js'
import { orderTotalsSelectList } from '../lib/orderColumns.js'

export const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

const notFound = id => Object.assign(new Error('No order ' + id), { status: 404 })

/* ---- statements, prepared once at module load rather than per request ---- */

const selectOrderExists = db.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?')
const selectDraftDefaults = db.prepare('SELECT default_status, default_kind FROM settings WHERE user_id = ?')
const countAllOrders = db.prepare('SELECT COUNT(*) c FROM orders WHERE user_id = ?')
const deleteOrder = db.prepare('DELETE FROM orders WHERE id = ? AND user_id = ?')
const deleteOrderCategories = db.prepare('DELETE FROM order_categories WHERE order_id = ?')
const deleteOrderItems = db.prepare('DELETE FROM order_items WHERE order_id = ?')
const insertOrder = db.prepare(`INSERT INTO orders (id, user_id, vendor_id, date, status, kind, shipping, note, reference, refunded)
	VALUES (@id, @userId, @vendorId, @date, @status, @kind, @shipping, @note, @reference, @refunded)`)
const insertOrderCategory = db.prepare('INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)')
const insertOrderItem = db.prepare(`INSERT INTO order_items (id, order_id, position, title, quantity, price, retail, note)
	VALUES (@id, @orderId, @position, @title, @quantity, @price, @retail, @note)`)
const insertAttachment = db.prepare(`INSERT INTO attachments (id, order_id, name, kind, meta, content_type, size, data)
	VALUES (@id, @orderId, @name, @kind, @meta, @contentType, @size, @data)`)
const selectExistingAttachmentNames = db.prepare('SELECT lower(name) n FROM attachments WHERE order_id = ?')
const deleteAttachment = db.prepare('DELETE FROM attachments WHERE id = ? AND order_id = ?')
const selectAttachment = db.prepare('SELECT name, content_type, data FROM attachments WHERE id = ? AND order_id = ?')
const selectLatestOrders = db.prepare(
	`SELECT ${orderTotalsSelectList()} FROM order_totals WHERE user_id = @userId ORDER BY date DESC, id DESC LIMIT @count`
)

/* ---- overview / draft ---- */

/** "Latest N orders" — N is the caller's choice (default 4, matching the Home/Orders-overview
    cards), not a number baked into the query. Clamped to a sane range so a client can't ask for
    an unbounded scan. */
router.get('/overview', (req, res) => {
	const count = Math.min(Math.max(1, Number(req.query.count) || 4), 100)
	const totalsRows = selectLatestOrders.all({ userId: req.user.id, count })
	res.json({ latest: decorateOrderRows(totalsRows), total: countAllOrders.get(req.user.id).c })
})

router.get('/draft', (req, res) => {
	const settings = selectDraftDefaults.get(req.user.id)
	res.json({
		vendor: '', date: new Date().toISOString().slice(0, 10),
		status: settings?.default_status ?? 'Delivered', kind: settings?.default_kind ?? 'Expense',
		categories: [], shipping: 0, reference: '', note: '', items: []
	})
})

router.get('/:id/draft', (req, res) => {
	const order = getDecoratedOrder(req.user.id, req.params.id)
	if (!order) return res.status(404).json({ error: 'No order ' + req.params.id })
	res.json({
		vendor: order.vendor?.name ?? '', date: order.date, status: order.status, kind: order.kind,
		categories: order.categories.map(c => c.name), shipping: order.shipping,
		reference: order.reference, note: order.note,
		items: order.items.map(i => ({ title: i.title, quantity: i.quantity, price: i.price, retail: i.retail ?? null, note: i.note ?? '' }))
	})
})

/* ---- list: real SQL filter/sort/paginate over the order_totals view ----
   Built as parameterized clauses reused between the COUNT (matched) and the SELECT (page), so
   the two can never disagree about which rows qualify. LIMIT/OFFSET does the paging in SQLite
   rather than in JS, and only the resulting page (not the whole table) is passed to
   decorateOrderRows for its 4 batched child-row queries. */

const SORT_SQL = {
	'date-desc': 'ot.date DESC, ot.id DESC',
	'date-asc': 'ot.date ASC, ot.id ASC',
	'amount-desc': 'ot.total DESC, ot.id DESC',
	'amount-asc': 'ot.total ASC, ot.id ASC',
	'vendor-asc': 'v.name COLLATE NOCASE ASC, ot.id ASC'
}

function buildOrderFilter(userId, q) {
	const where = ['ot.user_id = @userId']
	const params = { userId }

	if (q.vendorId) { where.push('ot.vendor_id = @vendorId'); params.vendorId = q.vendorId }
	if (q.categoryId) {
		where.push('EXISTS (SELECT 1 FROM order_categories oc WHERE oc.order_id = ot.id AND oc.category_id = @categoryId)')
		params.categoryId = q.categoryId
	}
	if (q.status && q.status !== 'Any') { where.push('ot.status = @status'); params.status = q.status }
	if (q.kind) { where.push('ot.kind = @kind'); params.kind = q.kind }
	if (q.from) { where.push('ot.date >= @from'); params.from = toEpoch(q.from) }
	if (q.to) { where.push('ot.date <= @to'); params.to = toEpoch(q.to) }
	if (q.minAmount != null && q.minAmount !== '') { where.push('ot.total >= @minAmount'); params.minAmount = Number(q.minAmount) }
	if (q.maxAmount != null && q.maxAmount !== '') { where.push('ot.total <= @maxAmount'); params.maxAmount = Number(q.maxAmount) }

	const needle = String(q.query ?? '').trim().toLowerCase()
	if (needle) {
		params.needle = `%${needle}%`
		where.push(`(
			lower(v.name) LIKE @needle
			OR lower(ot.note) LIKE @needle
			OR EXISTS (SELECT 1 FROM order_categories oc JOIN categories c ON c.id = oc.category_id
				WHERE oc.order_id = ot.id AND lower(c.name) LIKE @needle)
			OR EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = ot.id AND lower(oi.title) LIKE @needle)
		)`)
	}

	return { whereSql: where.join(' AND '), params }
}

router.get('/', (req, res) => {
	const q = req.query
	const { whereSql, params } = buildOrderFilter(req.user.id, q)
	const orderSql = SORT_SQL[q.sort] ?? SORT_SQL['date-desc']

	const matched = db.prepare(`
		SELECT COUNT(*) c FROM order_totals ot JOIN vendors v ON v.id = ot.vendor_id WHERE ${whereSql}
	`).get(params).c

	const size = Number(q.pageSize) || Number(q.limit) || matched || 1
	const pages = Math.max(1, Math.ceil(matched / Math.max(1, size)))
	const at = Math.min(Math.max(1, Number(q.page) || 1), pages)

	const totalsRows = db.prepare(`
		SELECT ${orderTotalsSelectList('ot')} FROM order_totals ot JOIN vendors v ON v.id = ot.vendor_id
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
		shipping: Number(draft.shipping) || 0, note: draft.note || '', reference: draft.reference || '',
		refunded: draft.refunded ? 1 : 0
	})
	for (const categoryId of categoryIds) insertOrderCategory.run(id, categoryId)
	draft.items.forEach((item, position) => insertOrderItem.run({
		id: newId('i'), orderId: id, position, title: String(item.title).trim(),
		quantity: Number(item.quantity), price: Number(item.price),
		retail: item.retail != null && item.retail !== '' ? Number(item.retail) : null,
		note: item.note || null
	}))
})

router.post('/', (req, res) => {
	const draft = req.body ?? {}
	assertValidOrderDraft(draft)
	const id = newId('o')
	insertOrderRows(req.user.id, id, draft)
	res.status(201).json(getDecoratedOrder(req.user.id, id))
})

router.put('/:id', (req, res) => {
	if (!selectOrderExists.get(req.params.id, req.user.id)) throw notFound(req.params.id)
	const draft = req.body ?? {}
	assertValidOrderDraft(draft)

	/* The edit replaces the order's own categories and items wholesale — an edit that retyped
	   the lines makes the lines the truth again. Attachments are untouched: they're edited
	   through their own endpoints below, not through this form, and share the same order id. */
	db.transaction(() => {
		deleteOrderCategories.run(req.params.id)
		deleteOrderItems.run(req.params.id)
		deleteOrder.run(req.params.id, req.user.id)
		insertOrderRows(req.user.id, req.params.id, draft)
	})()

	res.json(getDecoratedOrder(req.user.id, req.params.id))
})

router.delete('/:id', (req, res) => {
	const result = deleteOrder.run(req.params.id, req.user.id)
	if (!result.changes) throw notFound(req.params.id)
	res.json({ id: req.params.id })
})

/* ---- attachments ---- */

const fileSizeLabel = bytes => {
	const kb = Math.max(1, Math.round((bytes ?? 0) / 1024))
	return kb > 1024 ? (kb / 1024).toFixed(1).replace('.', ',') + ' MB' : kb + ' KB'
}

router.post('/:id/attachments', upload.array('files'), (req, res) => {
	if (!selectOrderExists.get(req.params.id, req.user.id)) throw notFound(req.params.id)
	const orderId = req.params.id

	const existingNames = new Set(selectExistingAttachmentNames.all(orderId).map(r => r.n))
	const added = [], skipped = []
	for (const file of req.files ?? []) {
		if (existingNames.has(file.originalname.toLowerCase())) { skipped.push(file.originalname); continue }
		existingNames.add(file.originalname.toLowerCase())
		const kind = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname) ? 'pdf' : 'image'
		const attachment = {
			id: newId('a'), orderId, name: file.originalname, kind,
			meta: `Added today · ${fileSizeLabel(file.size)}`, contentType: file.mimetype, size: file.size, data: file.buffer
		}
		insertAttachment.run(attachment)
		added.push({ id: attachment.id, name: attachment.name, kind: attachment.kind, meta: attachment.meta })
	}
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
	res.send(attachment.data)
})

/* ---- bulk import ----
   One program handing Spendly a whole expense history in one call: vendor and category names
   are resolved the same lookup-or-create way a manual order does (lib/findOrCreate.js), and
   each order is its own transaction so one malformed row doesn't sink the batch. Attachment
   images travel as base64 in the JSON body (see app.js for the raised body-size limit on this
   route) — the exporter is another program, not a browser form, so one JSON array is simpler
   for it to produce than a multipart request naming which files belong to which order. */

router.post('/import', (req, res) => {
	const orders = Array.isArray(req.body?.orders) ? req.body.orders : []
	if (!orders.length) return res.status(400).json({ error: 'Provide a non-empty "orders" array.' })

	const imported = [], failed = []
	orders.forEach((draft, index) => {
		try {
			const errors = validateOrderDraft(draft)
			if (Object.keys(errors).length) throw new Error(Object.values(errors)[0])

			const id = newId('o')
			db.transaction(() => {
				insertOrderRows(req.user.id, id, draft)
				for (const a of draft.attachments ?? []) {
					if (!a?.data) continue
					const buffer = Buffer.from(a.data, 'base64')
					insertAttachment.run({
						id: newId('a'), orderId: id, name: a.filename || 'attachment',
						kind: a.contentType === 'application/pdf' ? 'pdf' : 'image',
						meta: `Imported · ${fileSizeLabel(buffer.length)}`,
						contentType: a.contentType || 'application/octet-stream', size: buffer.length, data: buffer
					})
				}
			})()
			imported.push(getDecoratedOrder(req.user.id, id))
		} catch (e) {
			failed.push({ index, error: e.message })
		}
	})

	res.status(failed.length && !imported.length ? 400 : 200).json({ imported: imported.length, orders: imported, failed })
})
