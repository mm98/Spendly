import { Router } from 'express'
import multer from 'multer'
import { db } from '../db.js'
import { cardRowsFor } from '../lib/prefs.js'
import { newId } from '../lib/ids.js'
import { getDecoratedOrder } from '../lib/decorate.js'
import { processAttachment } from '../lib/images.js'

export const router = Router()
// See orders.js's own upload instance for why defParamCharset is set -- busboy decodes
// multipart filenames as latin1 unless told otherwise, and browsers never say otherwise.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 }, defParamCharset: 'utf8' })

const fileSizeLabel = bytes => {
	const kb = Math.max(1, Math.round((bytes ?? 0) / 1024))
	return kb > 1024 ? (kb / 1024).toFixed(1).replace('.', ',') + ' MB' : kb + ' KB'
}

const insertUpload = db.prepare(`INSERT INTO scan_uploads (id, user_id, name, size, kind, content_type, data, thumbnail, thumbnail_content_type)
	VALUES (@id, @userId, @name, @size, @kind, @contentType, @data, @thumbnail, @thumbnailContentType)`)
const selectUpload = db.prepare('SELECT id, name, size, kind, content_type, data, thumbnail, thumbnail_content_type FROM scan_uploads WHERE id = ? AND user_id = ?')
const selectUploadThumbnail = db.prepare('SELECT thumbnail, thumbnail_content_type FROM scan_uploads WHERE id = ? AND user_id = ?')
const deleteUpload = db.prepare('DELETE FROM scan_uploads WHERE id = ? AND user_id = ?')

/** A dropped receipt, kept until review turns it into an order. There is no OCR behind this —
    see getDraft below — so nothing here reads the file's contents beyond resizing it (an image
    gets a display copy and a thumbnail; a PDF's bytes are kept as-is with a rendered-first-page
    thumbnail — lib/images.js — same processing a direct order attachment upload gets). */
router.post('/documents', upload.single('file'), async (req, res) => {
	const file = req.file
	if (!file) return res.status(400).json({ error: 'No file was uploaded.' })
	const kind = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname) ? 'pdf' : 'image'
	const processed = await processAttachment(kind, file.buffer, file.mimetype)
	const id = newId('su')
	insertUpload.run({
		id, userId: req.user.id, name: file.originalname, size: processed.size, kind,
		contentType: processed.contentType ?? file.mimetype, data: processed.data,
		thumbnail: processed.thumbnail, thumbnailContentType: processed.thumbnailContentType
	})
	res.status(201).json({ key: id, name: file.originalname, kind, meta: `${kind === 'pdf' ? 'PDF' : 'Image'} · ${fileSizeLabel(processed.size)}` })
})

/** The review step's starting point. Honest about not having read the file: no vendor guess,
    no invented line items — just today's date and the account's own defaults, the same draft a
    manual "New order" opens on, with the upload attached for reference. Real receipt parsing
    would replace this function's body; nothing else in the review flow would need to change,
    since it already edits whatever draft this returns. */
router.get('/draft/:key', (req, res) => {
	const upload = selectUpload.get(req.params.key, req.user.id)
	if (!upload) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	const settings = db.prepare('SELECT default_status, default_kind FROM settings WHERE user_id = ?').get(req.user.id)
	res.json({
		documentKey: upload.id,
		file: {
			key: upload.id, name: upload.name, kind: upload.kind, hasThumbnail: Boolean(upload.thumbnail),
			meta: `${upload.kind === 'pdf' ? 'PDF' : 'Image'} · ${fileSizeLabel(upload.size)}`
		},
		vendor: '', vendorMatched: false, date: new Date().toISOString().slice(0, 10),
		status: settings?.default_status ?? 'Delivered', kind: settings?.default_kind ?? 'Expense',
		shipping: 0, linesRead: 0, lines: [], remainder: null, total: 0,
		reconciled: 'This document has not been read automatically — add the line items and totals below yourself.',
		checks: [], duplicate: null
	})
})

/** Turns a reviewed draft into the new order's own attachment, so the browser doesn't have to
    upload the same file a second time. Deletes the pending upload once it's copied over. */
router.post('/documents/:key/attach/:orderId', (req, res) => {
	const upload = selectUpload.get(req.params.key, req.user.id)
	if (!upload) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	const order = db.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?').get(req.params.orderId, req.user.id)
	if (!order) return res.status(404).json({ error: 'No order ' + req.params.orderId })

	db.prepare(`INSERT INTO attachments (id, order_id, name, kind, meta, content_type, size, data, thumbnail, thumbnail_content_type)
		VALUES (@id, @orderId, @name, @kind, @meta, @contentType, @size, @data, @thumbnail, @thumbnailContentType)`).run({
		id: newId('a'), orderId: order.id, name: upload.name, kind: upload.kind,
		meta: `Scanned today · ${fileSizeLabel(upload.size)}`, contentType: upload.content_type, size: upload.size, data: upload.data,
		thumbnail: upload.thumbnail, thumbnailContentType: upload.thumbnail_content_type
	})
	deleteUpload.run(upload.id, req.user.id)
	res.json(getDecoratedOrder(req.user.id, order.id))
})

router.get('/documents/:key/thumbnail', (req, res) => {
	const upload = selectUploadThumbnail.get(req.params.key, req.user.id)
	if (!upload || !upload.thumbnail) return res.status(404).json({ error: 'No thumbnail for that document.' })
	res.set('Content-Type', upload.thumbnail_content_type || 'image/jpeg')
	res.send(upload.thumbnail)
})

/** The full (1600px) display image — for a bigger preview than the 200px thumbnail is worth
    rendering, e.g. the review screen's own "OPEN" state. */
router.get('/documents/:key/file', (req, res) => {
	const upload = selectUpload.get(req.params.key, req.user.id)
	if (!upload || !upload.data) return res.status(404).json({ error: 'No file stored for that document.' })
	res.set('Content-Type', upload.content_type || 'application/octet-stream')
	res.send(upload.data)
})

/** Recently completed scans — the account's own orders that carry an attachment, newest first.
    Real history, not the phantom store's two hardcoded rows. Cut to the account's
    entries-per-card setting, like every other card holding a list. */
const selectRecentScans = db.prepare(`
	SELECT o.id AS orderId, a.name, a.meta, ot.total, o.created_at
	FROM orders o
	JOIN order_totals ot ON ot.id = o.id
	JOIN attachments a ON a.order_id = o.id
	WHERE o.user_id = @userId
	GROUP BY o.id
	ORDER BY o.created_at DESC
	LIMIT @limit
`)
router.get('/recent', (req, res) => {
	const rows = selectRecentScans.all({ userId: req.user.id, limit: cardRowsFor(req.user.id) })
	res.json(rows.map(r => ({ id: r.orderId, name: r.name, meta: r.meta, total: r.total, orderId: r.orderId })))
})
