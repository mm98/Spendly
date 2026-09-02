import { Router } from 'express'
import multer from 'multer'
import { createHash } from 'crypto'
import { db } from '../db.js'
import { cardRowsFor } from '../lib/prefs.js'
import { newId } from '../lib/ids.js'
import { getDecoratedOrder } from '../lib/decorate.js'
import { sep, fileSizeLabel } from '../lib/copy.js'
import { processAttachment } from '../lib/images.js'
import { decompressBlob } from '../lib/blobCompression.js'
import { findVendorIdByAnyName } from '../lib/findOrCreate.js'
import { parseReceipt } from '../lib/scanParse.js'
import { toEpoch, fromEpoch, todayIso, nowEpoch } from '../lib/dates.js'
import { msUntilEndOfDay } from '../lib/backup.js'

export const router = Router()
// See orders.js's own upload instance for why defParamCharset is set -- busboy decodes
// multipart filenames as latin1 unless told otherwise, and browsers never say otherwise.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 }, defParamCharset: 'utf8' })

const insertUpload = db.prepare(`INSERT INTO scan_uploads
	(id, user_id, name, size, kind, sha256, content_type, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type, expires_at)
	VALUES (@id, @userId, @name, @size, @kind, @sha256, @contentType, @data, @dataCompressed, @thumbnail, @thumbnailCompressed, @thumbnailContentType, @expiresAt)`)
/* A pending upload nobody came back to (DISCARD, or a tab just closed) -- and, since attach below
   no longer deletes the row either, one that already became an order's attachment too -- is swept
   by scheduleDailyUploadCleanup once its own expires_at passes, not deleted on the spot. Set once
   at upload time, same shape as sessions.expires_at (migrations/001_init.sql, lib/auth.js), rather
   than recomputed from created_at on every sweep: the row's lifetime -- and so the hash lookup
   below, which trusts any row that has not yet expired -- survives whatever happens to any order
   it went on to help create. Delete that order and scan the same receipt again before expires_at,
   and the hash still matches the original row, still holding its cached AI read. */
const UPLOAD_TTL_SECONDS = 7 * 24 * 60 * 60
const deleteExpiredUploads = db.prepare('DELETE FROM scan_uploads WHERE expires_at <= ?')
/* Swept once a day rather than opportunistically on the write path that grows the table -- a
   week-long retention window means most uploads in the table are still well within it on any
   given write, so sweeping on every upload would mostly re-run a DELETE that matches nothing.
   Same shape as scheduleDailyBackups (lib/backup.js): a sweep at startup catches up a container
   that was stopped over a day boundary, then one timer fires just before local midnight and
   re-arms itself every 24 hours after that -- the exact second doesn't carry any meaning here
   the way it does for the backup's date-stamped filename, but sharing msUntilEndOfDay keeps the
   app's two daily jobs on one clock instead of two. */
function cleanupExpiredUploads() {
	deleteExpiredUploads.run(nowEpoch())
}
export function scheduleDailyUploadCleanup() {
	cleanupExpiredUploads()
	const timer = setTimeout(function runAndReschedule() {
		cleanupExpiredUploads()
		setInterval(cleanupExpiredUploads, 24 * 60 * 60 * 1000).unref()
	}, msUntilEndOfDay())
	timer.unref()
	return timer
}
/* The same bytes, uploaded again before the row from last time expires -- a second click on the
   same file, a photo re-exported from the camera roll under a new name, a receipt dropped twice
   by habit, or the same document scanned again after the order it first produced was deleted.
   The existing row is the answer either way: same id, same cached ai_read_json if the first
   upload's draft was already opened, no second resize and no second model call for a document
   this account has already paid to read once. */
const selectUploadByHash = db.prepare(`
	SELECT id, kind, size, (thumbnail IS NOT NULL) AS has_thumbnail
	FROM scan_uploads WHERE user_id = ? AND sha256 = ? AND expires_at > ?
	ORDER BY created_at DESC LIMIT 1`)
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
// Everything parseReceipt needs (the bytes) plus everything the draft response needs (name,
// size, kind, thumbnail) plus the cached read, in one row -- the draft handler either has an
// AI read already or is about to go make one, and both branches want the same row.
const selectUploadForRead = db.prepare(`SELECT id, name, size, kind, content_type, data, data_is_compressed,
	(thumbnail IS NOT NULL) AS has_thumbnail, ai_read_json FROM scan_uploads WHERE id = ? AND user_id = ?`)
const saveAiRead = db.prepare('UPDATE scan_uploads SET ai_read_json = @json WHERE id = @id AND user_id = @userId')
const selectVendorName = db.prepare('SELECT name FROM vendors WHERE id = ? AND user_id = ?')
/* A possible duplicate: the same vendor, within two weeks either side of the read date -- close
   enough to catch a receipt scanned twice, or a paper copy of an order already entered by hand,
   without flagging every other order from a vendor the account buys from often. Nearest date
   first, since that is the likeliest actual duplicate when more than one falls in the window. */
const selectPossibleDuplicate = db.prepare(`
	SELECT id, date, item_count, total FROM orders
	WHERE user_id = @userId AND vendor_id = @vendorId AND date BETWEEN @from AND @to
	ORDER BY ABS(date - @target) ASC LIMIT 1`)

/** A dropped receipt, kept until review turns it into an order. There is no OCR behind this —
    see getDraft below — so nothing here reads the file's contents beyond resizing it (an image
    gets a display copy and a thumbnail; a PDF's bytes are kept as-is with a rendered-first-page
    thumbnail — lib/images.js — same processing a direct order attachment upload gets). */
router.post('/documents', upload.single('file'), async (req, res) => {
	const file = req.file
	if (!file) return res.status(400).json({ error: 'No file was uploaded.' })

	// The source bytes' own hash, before any resizing -- two uploads of the same file hash the
	// same regardless of what processAttachment below would make of either.
	const sha256 = createHash('sha256').update(file.buffer).digest('hex')
	const existing = selectUploadByHash.get(req.user.id, sha256, nowEpoch())
	if (existing) {
		return res.status(200).json({
			key: existing.id, name: file.originalname, kind: existing.kind,
			hasThumbnail: Boolean(existing.has_thumbnail),
			meta: `${existing.kind === 'pdf' ? 'PDF' : 'Image'}${sep}${fileSizeLabel(existing.size)}`
		})
	}

	// The kind the bytes declare, not the one the filename claims -- see lib/fileType.js.
	const processed = await processAttachment(file.buffer, file.mimetype, file.originalname)
	const kind = processed.kind
	const id = newId('su')
	insertUpload.run({
		id, userId: req.user.id, name: file.originalname, size: processed.size, kind, sha256,
		contentType: processed.contentType ?? file.mimetype,
		data: processed.data, dataCompressed: processed.dataCompressed ? 1 : 0,
		thumbnail: processed.thumbnail, thumbnailCompressed: processed.thumbnailCompressed ? 1 : 0,
		thumbnailContentType: processed.thumbnailContentType,
		expiresAt: nowEpoch() + UPLOAD_TTL_SECONDS
	})
	res.status(201).json({
		key: id, name: file.originalname, kind, hasThumbnail: Boolean(processed.thumbnail),
		meta: `${kind === 'pdf' ? 'PDF' : 'Image'}${sep}${fileSizeLabel(processed.size)}`
	})
})

/** Discards a pending upload outright, cached AI read included -- the escape hatch for a
    document the model read wrong. With the row gone, re-uploading the identical file afterwards
    cannot match selectUploadByHash above, so it gets a fresh id and a fresh parseReceipt call
    instead of the misread cached one. */
router.delete('/documents/:key', (req, res) => {
	const result = deleteUpload.run(req.params.key, req.user.id)
	if (!result.changes) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	res.status(204).end()
})

/** The review step's starting point. Reads the document once via Claude's vision
    (lib/scanParse.js) and caches the result on the upload row, so a reload of step 2 or 3 --
    both fetch this for the same key -- never pays for a second read. Falls back to the same
    honest blank draft this route always returned when no ANTHROPIC_API_KEY is configured, or
    when the read fails: today's date, the account's own defaults, no invented vendor or lines,
    same as a manual "New order" opens on, with the upload attached for reference. */
router.get('/draft/:key', async (req, res) => {
	const upload = selectUploadForRead.get(req.params.key, req.user.id)
	if (!upload) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	const settings = selectDraftDefaults.get(req.user.id)

	const hadCachedRead = upload.ai_read_json != null
	let read = hadCachedRead ? JSON.parse(upload.ai_read_json) : await parseReceipt(upload)
	if (!hadCachedRead) saveAiRead.run({ id: upload.id, userId: req.user.id, json: JSON.stringify(read) })

	const file = {
		key: upload.id, name: upload.name, kind: upload.kind, hasThumbnail: Boolean(upload.has_thumbnail),
		meta: `${upload.kind === 'pdf' ? 'PDF' : 'Image'}${sep}${fileSizeLabel(upload.size)}`
	}

	if (!read) {
		return res.json({
			documentKey: upload.id, file,
			vendor: '', vendorMatched: false, date: todayIso(),
			status: settings?.default_status ?? 'Delivered', kind: settings?.default_kind ?? 'Expense',
			deliveredDate: todayIso(), returnedDate: todayIso(),
			shipping: 0, discount: 0, linesRead: 0, lines: [], remainder: null, total: 0,
			reconciled: process.env.ANTHROPIC_API_KEY
				? 'This document could not be read automatically. Add the line items and totals below yourself.'
				: 'This document has not been read automatically. Add the line items and totals below yourself.',
			checks: [], duplicate: null
		})
	}

	const vendorId = findVendorIdByAnyName(req.user.id, read.vendor)
	const vendorMatched = Boolean(vendorId)
	const vendorName = vendorId ? selectVendorName.get(vendorId, req.user.id)?.name : null

	let duplicate = null
	if (vendorId && read.date) {
		const target = toEpoch(read.date)
		const row = selectPossibleDuplicate.get({
			userId: req.user.id, vendorId, target, from: target - 14 * 86400, to: target + 14 * 86400
		})
		if (row) duplicate = {
			orderId: row.id, title: fromEpoch(row.date),
			meta: `${row.item_count} item${row.item_count === 1 ? '' : 's'}`, total: row.total
		}
	}

	const linesTotal = read.lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
	const total = read.total ?? (linesTotal + read.shipping - read.discount)

	res.json({
		documentKey: upload.id, file,
		// The document's own spelling once reached the review screen even when the vendor
		// matched -- a receipt printing "BILKA" against a vendor named "Bilka" showed the
		// document's casing on a field the picker's "matched" chip claimed was already right.
		// A match means the vendor record is the answer; the scanned string only speaks where
		// there was no vendor to match it to.
		vendor: vendorMatched ? vendorName : read.vendor, vendorMatched,
		date: read.date ?? todayIso(),
		status: settings?.default_status ?? 'Delivered', kind: settings?.default_kind ?? 'Expense',
		deliveredDate: read.date ?? todayIso(), returnedDate: todayIso(),
		shipping: read.shipping, discount: read.discount, linesRead: read.lines.length,
		lines: read.lines.map(l => ({
			id: newId('l'), title: l.title, quantity: l.quantity, price: l.price,
			uncertain: l.uncertain, meta: l.uncertain ? 'Not clearly printed -- check this line.' : undefined
		})),
		remainder: null, total,
		reconciled: read.total != null
			? 'Matched against the document’s own printed total.'
			: 'No printed total was found on the document to check the lines against.',
		checks: [
			{
				id: 'vendor', warning: !vendorMatched,
				title: vendorMatched ? `Matched to ${vendorName}` : 'New vendor — will be created',
				meta: read.vendor
			},
			{
				id: 'total', warning: read.total == null,
				title: read.total != null ? 'Printed total found' : 'No printed total found',
				meta: read.total != null ? undefined : 'The lines below are all that was read.'
			},
			// pricesAsPrintedIncludeVat is a fact about the source document, not a decision
			// about the numbers above -- those are always VAT-inclusive already, converted by
			// the model itself (lib/scanParse.js). null means it couldn't tell either way,
			// which is worth a warning: nothing here converted a figure that may have needed it.
			read.pricesAsPrintedIncludeVat === null
				? { id: 'vat', warning: true, title: 'Could not tell if VAT was included',
					meta: 'Check the line prices against the document.' }
				: {
					id: 'vat', warning: false,
					title: read.pricesAsPrintedIncludeVat
						? 'Prices already included VAT'
						: `Converted from ex-VAT prices${read.vatRate != null ? ` at ${read.vatRate}%` : ''}`
				}
		],
		duplicate
	})
})

/** Turns a reviewed draft into the new order's own attachment, so the browser doesn't have to
    upload the same file a second time -- an INSERT ... SELECT, so the bytes go table-to-table
    inside SQLite instead of surfacing into a JS Buffer just to be handed straight back. The
    scan_uploads row is left in place rather than deleted: its sha256 and cached ai_read_json go
    on answering a later re-upload of the same bytes -- including one after this very order gets
    deleted -- until the row's own expires_at retires it (scheduleDailyUploadCleanup above). */
const copyUploadToAttachment = db.prepare(`INSERT INTO attachments
	(id, order_id, name, kind, meta, content_type, size, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type)
	SELECT @id, @orderId, name, kind, @meta, content_type, size, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type
	FROM scan_uploads WHERE id = @uploadId AND user_id = @userId`)

router.post('/documents/:key/attach/:orderId', (req, res) => {
	const upload = selectUploadMeta.get(req.params.key, req.user.id)
	if (!upload) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	const order = selectOrderExists.get(req.params.orderId, req.user.id)
	if (!order) return res.status(404).json({ error: 'No order ' + req.params.orderId })

	copyUploadToAttachment.run({ id: newId('a'), orderId: order.id,
		meta: `Scanned today${sep}${fileSizeLabel(upload.size)}`, uploadId: upload.id, userId: req.user.id })
	res.json(getDecoratedOrder(req.user.id, order.id))
})

router.get('/documents/:key/thumbnail', (req, res) => {
	const upload = selectUploadThumbnail.get(req.params.key, req.user.id)
	if (!upload || !upload.thumbnail) return res.status(404).json({ error: 'No thumbnail for that document.' })
	res.set('Content-Type', upload.thumbnail_content_type || 'image/webp')
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
