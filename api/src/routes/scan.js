import { Router } from 'express'
import multer from 'multer'
import { db } from '../db.js'
import { cardRowsFor } from '../lib/prefs.js'
import { newId } from '../lib/ids.js'
import { getDecoratedOrder } from '../lib/decorate.js'
import { sep, fileSizeLabel } from '../lib/copy.js'
import { processAttachment } from '../lib/images.js'
import { decompressBlob } from '../lib/blobCompression.js'

export const router = Router()
// See orders.js's own upload instance for why defParamCharset is set -- busboy decodes
// multipart filenames as latin1 unless told otherwise, and browsers never say otherwise.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 }, defParamCharset: 'utf8' })

const insertUpload = db.prepare(`INSERT INTO scan_uploads
	(id, user_id, name, size, kind, content_type, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type)
	VALUES (@id, @userId, @name, @size, @kind, @contentType, @data, @dataCompressed, @thumbnail, @thumbnailCompressed, @thumbnailContentType)`)
/* Split by what each reader draws, like attachments' own statements in routes/orders.js: the
   draft screen wants the row's facts and whether a thumbnail exists, the file route wants the
   display bytes, the thumbnail route its own -- one shared SELECT pulled both BLOBs (display
   image and thumbnail) into JS for every reader, megabytes decoded to answer a metadata
   question. */
const selectUploadMeta = db.prepare(
	'SELECT id, name, size, kind, (thumbnail IS NOT NULL) AS has_thumbnail FROM scan_uploads WHERE id = ? AND user_id = ?')
const selectUploadFile = db.prepare(
	'SELECT data, data_is_compressed, content_type FROM scan_uploads WHERE id = ? AND user_id = ?')
const selectUploadThumbnail = db.prepare('SELECT thumbnail, thumbnail_is_compressed, thumbnail_content_type FROM scan_uploads WHERE id = ? AND user_id = ?')
const deleteUpload = db.prepare('DELETE FROM scan_uploads WHERE id = ? AND user_id = ?')
const selectDraftDefaults = db.prepare('SELECT default_status, default_kind FROM settings WHERE user_id = ?')
const selectOrderExists = db.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?')

/** A dropped receipt, kept until review turns it into an order. There is no OCR behind this —
    see getDraft below — so nothing here reads the file's contents beyond resizing it (an image
    gets a display copy and a thumbnail; a PDF's bytes are kept as-is with a rendered-first-page
    thumbnail — lib/images.js — same processing a direct order attachment upload gets). */
router.post('/documents', upload.single('file'), async (req, res) => {
	const file = req.file
	if (!file) return res.status(400).json({ error: 'No file was uploaded.' })
	// The kind the bytes declare, not the one the filename claims -- see lib/fileType.js.
	const processed = await processAttachment(file.buffer, file.mimetype, file.originalname)
	const kind = processed.kind
	const id = newId('su')
	insertUpload.run({
		id, userId: req.user.id, name: file.originalname, size: processed.size, kind,
		contentType: processed.contentType ?? file.mimetype,
		data: processed.data, dataCompressed: processed.dataCompressed ? 1 : 0,
		thumbnail: processed.thumbnail, thumbnailCompressed: processed.thumbnailCompressed ? 1 : 0,
		thumbnailContentType: processed.thumbnailContentType
	})
	res.status(201).json({ key: id, name: file.originalname, kind, meta: `${kind === 'pdf' ? 'PDF' : 'Image'}${sep}${fileSizeLabel(processed.size)}` })
})

/** The review step's starting point. Honest about not having read the file: no vendor guess,
    no invented line items — just today's date and the account's own defaults, the same draft a
    manual "New order" opens on, with the upload attached for reference. Real receipt parsing
    would replace this function's body; nothing else in the review flow would need to change,
    since it already edits whatever draft this returns. */
router.get('/draft/:key', (req, res) => {
	const upload = selectUploadMeta.get(req.params.key, req.user.id)
	if (!upload) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	const settings = selectDraftDefaults.get(req.user.id)
	res.json({
		documentKey: upload.id,
		file: {
			key: upload.id, name: upload.name, kind: upload.kind, hasThumbnail: Boolean(upload.has_thumbnail),
			meta: `${upload.kind === 'pdf' ? 'PDF' : 'Image'}${sep}${fileSizeLabel(upload.size)}`
		},
		vendor: '', vendorMatched: false, date: new Date().toISOString().slice(0, 10),
		status: settings?.default_status ?? 'Delivered', kind: settings?.default_kind ?? 'Expense',
		shipping: 0, linesRead: 0, lines: [], remainder: null, total: 0,
		reconciled: 'This document has not been read automatically. Add the line items and totals below yourself.',
		checks: [], duplicate: null
	})
})

/** Turns a reviewed draft into the new order's own attachment, so the browser doesn't have to
    upload the same file a second time. Deletes the pending upload once it's copied over. */
/* INSERT ... SELECT, so the bytes go table-to-table inside SQLite instead of surfacing into a
   JS Buffer just to be handed straight back -- and one transaction with the delete, so "the
   upload became the order's attachment" cannot half-happen: run separately, a failure between
   them either duplicated the document (inserted but not deleted) or would have lost it in the
   other order. */
const copyUploadToAttachment = db.prepare(`INSERT INTO attachments
	(id, order_id, name, kind, meta, content_type, size, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type)
	SELECT @id, @orderId, name, kind, @meta, content_type, size, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type
	FROM scan_uploads WHERE id = @uploadId AND user_id = @userId`)
const attachUpload = db.transaction(row => {
	copyUploadToAttachment.run(row)
	deleteUpload.run(row.uploadId, row.userId)
})

router.post('/documents/:key/attach/:orderId', (req, res) => {
	const upload = selectUploadMeta.get(req.params.key, req.user.id)
	if (!upload) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	const order = selectOrderExists.get(req.params.orderId, req.user.id)
	if (!order) return res.status(404).json({ error: 'No order ' + req.params.orderId })

	attachUpload({ id: newId('a'), orderId: order.id,
		meta: `Scanned today${sep}${fileSizeLabel(upload.size)}`, uploadId: upload.id, userId: req.user.id })
	res.json(getDecoratedOrder(req.user.id, order.id))
})

router.get('/documents/:key/thumbnail', (req, res) => {
	const upload = selectUploadThumbnail.get(req.params.key, req.user.id)
	if (!upload || !upload.thumbnail) return res.status(404).json({ error: 'No thumbnail for that document.' })
	res.set('Content-Type', upload.thumbnail_content_type || 'image/jpeg')
	res.send(decompressBlob(upload.thumbnail, upload.thumbnail_is_compressed))
})

/** The full (1600px) display image — for a bigger preview than the 200px thumbnail is worth
    rendering, e.g. the review screen's own "OPEN" state. */
router.get('/documents/:key/file', (req, res) => {
	const upload = selectUploadFile.get(req.params.key, req.user.id)
	if (!upload || !upload.data) return res.status(404).json({ error: 'No file stored for that document.' })
	res.set('Content-Type', upload.content_type || 'application/octet-stream')
	res.send(decompressBlob(upload.data, upload.data_is_compressed))
})

/** Recently completed scans — the account's own orders that carry an attachment, newest first.
    Real history, not the phantom store's two hardcoded rows. Cut to the account's
    entries-per-card setting, like every other card holding a list. */
/* Driven from the attachments side, pinned there with CROSS JOIN: an account has a handful
   of attachments (none at all until the first upload) against tens of thousands of orders,
   and the orders-driven shape probed attachments once per order and temp-sorted the lot --
   ~11ms to answer a card over zero attachments at 50,000 orders, ~101ms with the account
   dense with them; attachments-first is 0.02-0.09ms in every realistic state and still 2x
   ahead at the dense extreme. MIN() because GROUP BY with a bare column hands back whichever
   attachment the walk met first -- an arbitrary label when an order carries several. */
const selectRecentScans = db.prepare(`
	SELECT o.id AS orderId, MIN(a.name) AS name, MIN(a.meta) AS meta, o.total, o.created_at
	FROM attachments a
	CROSS JOIN orders o ON o.id = a.order_id
	WHERE o.user_id = @userId
	GROUP BY o.id
	ORDER BY o.created_at DESC
	LIMIT @limit
`)
router.get('/recent', (req, res) => {
	const rows = selectRecentScans.all({ userId: req.user.id, limit: cardRowsFor(req.user.id) })
	res.json(rows.map(r => ({ id: r.orderId, name: r.name, meta: r.meta, total: r.total, orderId: r.orderId })))
})
