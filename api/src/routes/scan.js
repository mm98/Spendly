import { Router } from 'express'
import multer from 'multer'
import { createHash } from 'crypto'
import { db } from '../db.js'
import { requireConfirmed } from '../lib/auth.js'
import { newId } from '../lib/ids.js'
import { getDecoratedOrder } from '../lib/decorate.js'
import { sep, fileSizeLabel } from '../lib/copy.js'
import { processAttachment } from '../lib/images.js'
import { decompressBlob } from '../lib/blobCompression.js'
import { findVendorIdByAnyName } from '../lib/findOrCreate.js'
import { parseReceipt } from '../lib/scanParse.js'
import { pageCount, pageImage } from '../lib/filePages.js'
import { toEpoch, fromEpoch, nowEpoch } from '../lib/dates.js'
import { msUntilEndOfDay } from '../lib/backup.js'
import { assertImageOrPdf } from '../lib/fileType.js'
import { MAX_UPLOAD_MB } from '../lib/constants.js'

export const router = Router()
// See orders.js's own upload instance for why defParamCharset is set -- busboy decodes
// multipart filenames as latin1 unless told otherwise, and browsers never say otherwise.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 }, defParamCharset: 'utf8' })

const insertUpload = db.prepare(`INSERT INTO scan_uploads
	(id, user_id, name, size, kind, sha256, content_type, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type, expires_at, pages, ai_read_json)
	VALUES (@id, @userId, @name, @size, @kind, @sha256, @contentType, @data, @dataCompressed, @thumbnail, @thumbnailCompressed, @thumbnailContentType, @expiresAt, @pages,
		(SELECT read_json FROM scan_readings WHERE user_id = @userId AND sha256 = @sha256))`)
const keepReading = db.prepare(`INSERT INTO scan_readings (user_id, sha256, read_json) VALUES (?, ?, ?)
	ON CONFLICT (user_id, sha256) DO UPDATE SET read_json = excluded.read_json, read_at = unixepoch()`)
const selectReadingTime = db.prepare('SELECT read_at FROM scan_readings WHERE user_id = ? AND sha256 = ?')
/* The orders that already hold a file with these bytes as their own attachment, newest first (3c). */
const selectOrdersWithFile = db.prepare(`
	SELECT o.id, o.reference, o.date, o.item_count, o.status, o.total, v.name AS vendor, a.id AS attachment_id, a.name AS file_name, a.kind AS file_kind
	FROM attachments a JOIN orders o ON o.id = a.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE a.sha256 = @sha256 AND o.user_id = @userId
	ORDER BY o.date DESC, o.created_at DESC`)

/** What is already known about these bytes: the orders that hold them and when they were read. */
function seenBefore(userId, sha256) {
	const orders = selectOrdersWithFile.all({ sha256, userId })
	if (!orders.length) return null
	const read = selectReadingTime.get(userId, sha256)
	return {
		readAt: read ? new Date(read.read_at * 1000).toISOString() : null,
		count: orders.length,
		orders: orders.slice(0, 3).map(o => ({
			id: o.id, reference: o.reference, date: fromEpoch(o.date), itemCount: o.item_count, status: o.status,
			total: o.total, vendor: o.vendor, file: { id: o.attachment_id, name: o.file_name, kind: o.file_kind }
		}))
	}
}
const uploadAnswer = (row, name, userId) => ({
	key: row.id, name, kind: row.kind, hasThumbnail: Boolean(row.has_thumbnail), pages: row.pages ?? null,
	meta: `${row.kind === 'pdf' ? 'PDF' : 'Image'}${sep}${fileSizeLabel(row.size)}`,
	sha256: row.sha256, seen: seenBefore(userId, row.sha256)
})
/* A pending upload nobody came back to (DISCARD, or a tab just closed), or one that already
   became an order's attachment (attach below leaves the row in place either way) -- both are
   swept by scheduleDailyUploadCleanup once expires_at passes, not deleted on the spot. Set once
   at upload time, same shape as sessions.expires_at (migrations/001_init.sql, lib/auth.js), rather
   than recomputed from created_at on every sweep: the row's lifetime -- and so the hash lookup
   below, which trusts any row that has not yet expired -- survives whatever happens to any order
   it went on to help create. Delete that order and scan the same receipt again before expires_at,
   and the hash still matches that same row, still holding its cached AI read. */
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
   same file, a re-export from the camera roll, a receipt dropped twice, or the same document
   scanned again after the order it first produced was deleted. The existing row is the answer
   either way: same id, same cached ai_read_json if the draft was already opened, no second
   resize and no second model call for a document this account has already paid to read once. */
const selectUploadByHash = db.prepare(`
	SELECT id, kind, size, pages, sha256, (thumbnail IS NOT NULL) AS has_thumbnail
	FROM scan_uploads WHERE user_id = ? AND sha256 = ? AND expires_at > ?
	ORDER BY created_at DESC LIMIT 1`)
/* Split by what each reader draws: the draft screen wants the row's facts, the thumbnail route
   its own bytes -- never both BLOBs decoded to answer a metadata question. */
const selectUploadMeta = db.prepare(
	'SELECT id, name, size, kind, (thumbnail IS NOT NULL) AS has_thumbnail FROM scan_uploads WHERE id = ? AND user_id = ?')
const selectUploadThumbnail = db.prepare('SELECT thumbnail, thumbnail_is_compressed, thumbnail_content_type FROM scan_uploads WHERE id = ? AND user_id = ?')
const selectDraftDefaults = db.prepare('SELECT default_status, default_kind FROM settings WHERE user_id = ?')
const selectOrderExists = db.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?')
// Everything parseReceipt needs (the bytes) plus everything the draft response needs (name,
// size, kind, thumbnail) plus the cached read, in one row -- the draft handler either has an
// AI read already or is about to go make one, and both branches want the same row.
const selectUploadForRead = db.prepare(`SELECT id, name, size, kind, content_type, data, data_is_compressed,
	(thumbnail IS NOT NULL) AS has_thumbnail, ai_read_json, sha256, pages FROM scan_uploads WHERE id = ? AND user_id = ?`)
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
router.post('/documents', requireConfirmed, upload.single('file'), async (req, res) => {
	const file = req.file
	if (!file) return res.status(400).json({ error: 'No file was uploaded.' })
	assertImageOrPdf([file])

	// The source bytes' own hash, before any resizing -- two uploads of the same file hash the
	// same regardless of what processAttachment below would make of either.
	const sha256 = createHash('sha256').update(file.buffer).digest('hex')
	const existing = selectUploadByHash.get(req.user.id, sha256, nowEpoch())
	if (existing) return res.status(200).json(uploadAnswer(existing, file.originalname, req.user.id))

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
		expiresAt: nowEpoch() + UPLOAD_TTL_SECONDS, pages: processed.pages ?? null
	})
	res.status(201).json(uploadAnswer({
		id, kind, size: processed.size, pages: processed.pages, sha256, has_thumbnail: processed.thumbnail != null
	}, file.originalname, req.user.id))
})

/** A stored upload's own bytes: an image's display copy, or the PDF as it arrived. */
const selectUploadFile = db.prepare('SELECT name, content_type, data, data_is_compressed FROM scan_uploads WHERE id = ? AND user_id = ?')
router.get('/documents/:key/file', (req, res) => {
	const upload = selectUploadFile.get(req.params.key, req.user.id)
	if (!upload || !upload.data) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	res.set('Content-Type', upload.content_type || 'application/octet-stream')
	res.set('Content-Disposition', `inline; filename="${upload.name.replace(/"/g, '')}"`)
	res.send(decompressBlob(upload.data, upload.data_is_compressed))
})

const ownUpload = req => {
	if (!selectUploadMeta.get(req.params.key, req.user.id))
		throw Object.assign(new Error('No uploaded document ' + req.params.key), { status: 404 })
	return req.params.key
}
router.get('/documents/:key/pages', async (req, res) => {
	res.json({ pages: await pageCount('upload', ownUpload(req)) })
})
router.get('/documents/:key/pages/:page', async (req, res) => {
	const page = await pageImage('upload', ownUpload(req), Number(req.params.page))
	if (!page) return res.status(404).json({ error: 'No such page.' })
	res.set('Content-Type', page.contentType)
	res.set('Cache-Control', 'private, max-age=31536000, immutable')
	res.send(page.image)
})

/** Forget the reading of these bytes, so the next opening of the draft reads the file again (3c). */
const clearUploadReading = db.prepare('UPDATE scan_uploads SET ai_read_json = NULL WHERE user_id = ? AND sha256 = ?')
const forgetReading = db.prepare('DELETE FROM scan_readings WHERE user_id = ? AND sha256 = ?')
const selectUploadHash = db.prepare('SELECT sha256 FROM scan_uploads WHERE id = ? AND user_id = ?')
router.post('/documents/:key/reread', (req, res) => {
	const upload = selectUploadHash.get(req.params.key, req.user.id)
	if (!upload) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	db.transaction(() => {
		clearUploadReading.run(req.user.id, upload.sha256)
		forgetReading.run(req.user.id, upload.sha256)
	})()
	res.json({ key: req.params.key })
})

/** Throws an upload away now rather than when it expires. The reading of it is kept. */
const deleteUpload = db.prepare('DELETE FROM scan_uploads WHERE id = ? AND user_id = ?')
router.delete('/documents/:key', (req, res) => {
	deleteUpload.run(req.params.key, req.user.id)
	res.json({ key: req.params.key })
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

	/* ?progress=stream answers in NDJSON: `{ progress: { found, lines } }` lines while the file is
	   read (3a step 2), then `{ draft }`, the same object the plain answer is. */
	const streaming = req.query.progress === 'stream'
	if (streaming) {
		res.status(200).set({ 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' })
		res.flushHeaders()
	}
	const hadCachedRead = upload.ai_read_json != null
	const { read, failure } = hadCachedRead
		? { read: JSON.parse(upload.ai_read_json), failure: null }
		: await parseReceipt(upload, req.today, progress => { if (streaming) res.write(JSON.stringify({ progress }) + '\n') })
	// Only an answer is kept: a call that failed cost nothing, and keeping it would block the retry.
	if (!hadCachedRead && !failure && read?.lines.length) {
		saveAiRead.run({ id: upload.id, userId: req.user.id, json: JSON.stringify(read) })
		if (upload.sha256) keepReading.run(req.user.id, upload.sha256, JSON.stringify(read))
	}
	const draft = draftOf(req, upload, read, failure)
	if (streaming) res.end(JSON.stringify({ draft }) + '\n')
	else res.json(draft)
})

/** The review form's starting values, or the blank draft when nothing was read. `failure` says why
    there are no lines: 'billing', 'failed', 'unread' (no reading service) or 'empty' (no lines found). */
function draftOf(req, upload, read, failure) {
	const settings = selectDraftDefaults.get(req.user.id)
	const file = {
		key: upload.id, name: upload.name, kind: upload.kind, hasThumbnail: Boolean(upload.has_thumbnail), pages: upload.pages ?? null,
		meta: `${upload.kind === 'pdf' ? 'PDF' : 'Image'}${sep}${fileSizeLabel(upload.size)}`
	}

	if (!read?.lines.length) {
		const partial = read ? findVendorIdByAnyName(req.user.id, read.vendor) : null
		return {
			documentKey: upload.id, file,
			vendor: read ? (partial ? selectVendorName.get(partial, req.user.id)?.name : read.vendor) : '',
			vendorMatched: Boolean(partial), date: read?.date ?? req.today,
			status: settings?.default_status ?? 'Delivered', kind: settings?.default_kind ?? 'Expense',
			deliveredDate: req.today, returnedDate: req.today, reference: read?.reference ?? '',
			shipping: 0, discount: 0, linesRead: 0, lines: [], remainder: null, total: null,
			failure: read ? 'empty' : failure === 'billing' ? 'billing' : process.env.ANTHROPIC_API_KEY ? 'failed' : 'unread',
			found: read ? { vendor: read.vendor, date: read.date } : null,
			reconciled: failure === 'billing'
				? 'This document was not read: the reading service reports a billing problem, such as no credits left. Add the line items and totals below yourself, or upload it again once that is fixed.'
				: process.env.ANTHROPIC_API_KEY
					? 'This document could not be read automatically. Add the line items and totals below yourself.'
					: 'This document has not been read automatically. Add the line items and totals below yourself.',
			checks: [], unclear: [], duplicate: null
		}
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

	return {
		documentKey: upload.id, file, failure: null, found: null,
		reference: read.reference ?? '', unclear: read.unclear ?? [],
		// The document's own spelling once reached the review screen even when the vendor
		// matched -- a receipt printing "BILKA" against a vendor named "Bilka" showed the
		// document's casing on a field the picker's "matched" chip claimed was already right.
		// A match means the vendor record is the answer; the scanned string only speaks where
		// there was no vendor to match it to.
		vendor: vendorMatched ? vendorName : read.vendor, vendorMatched,
		date: read.date ?? req.today,
		status: settings?.default_status ?? 'Delivered', kind: settings?.default_kind ?? 'Expense',
		deliveredDate: read.date ?? req.today, returnedDate: req.today,
		shipping: read.shipping, discount: read.discount, linesRead: read.lines.length,
		lines: read.lines.map(l => ({
			id: newId('l'), title: l.title, quantity: l.quantity, price: l.price,
			uncertain: l.uncertain, unclearPart: l.unclearPart ?? null,
			meta: l.uncertain ? 'Not clearly printed -- check this line.' : undefined
		})),
		// The printed total or null, never the lines' own sum: the review checks the lines against it.
		remainder: null, total: read.total,
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
	}
}

/** Turns a reviewed draft into the new order's own attachment, so the browser doesn't have to
    upload the same file a second time -- an INSERT ... SELECT, so the bytes go table-to-table
    inside SQLite instead of surfacing into a JS Buffer just to be handed straight back. The
    scan_uploads row is left in place rather than deleted: its sha256 and cached ai_read_json go
    on answering a later re-upload of the same bytes -- including one after this very order gets
    deleted -- until the row's own expires_at retires it (scheduleDailyUploadCleanup above). */
const copyUploadToAttachment = db.prepare(`INSERT INTO attachments
	(id, order_id, order_item_id, name, kind, meta, content_type, size, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type, sha256, pages)
	SELECT @id, @orderId, @itemId, COALESCE(@name, name), kind, @meta, content_type, size, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type, sha256, pages
	FROM scan_uploads WHERE id = @uploadId AND user_id = @userId`)
const copyUploadPages = db.prepare(`INSERT INTO attachment_pages (attachment_id, page, image, content_type)
	SELECT @id, page, image, content_type FROM scan_upload_pages WHERE upload_id = @uploadId`)
const selectItemOfOrder = db.prepare('SELECT id FROM order_items WHERE id = ? AND order_id = ?')

/* Also commits a file a form staged on drop (17a): `?as=file` files it as added, `?item=` puts it
   on one line, `?name=` keeps the name it was chosen under (equal bytes share one upload row). */
router.post('/documents/:key/attach/:orderId', (req, res) => {
	const upload = selectUploadMeta.get(req.params.key, req.user.id)
	if (!upload) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	const order = selectOrderExists.get(req.params.orderId, req.user.id)
	if (!order) return res.status(404).json({ error: 'No order ' + req.params.orderId })
	const itemId = req.query.item ? selectItemOfOrder.get(String(req.query.item), order.id)?.id : null
	if (req.query.item && !itemId) return res.status(404).json({ error: 'No item ' + req.query.item })
	const name = typeof req.query.name === 'string' && req.query.name.trim() ? req.query.name.trim().slice(0, 200) : null

	const id = newId('a')
	db.transaction(() => {
		copyUploadToAttachment.run({ id, orderId: itemId ? null : order.id, itemId,
			name, meta: `${req.query.as === 'file' ? 'Added' : 'Scanned'} today${sep}${fileSizeLabel(upload.size)}`,
			uploadId: upload.id, userId: req.user.id })
		copyUploadPages.run({ id, uploadId: upload.id })
	})()
	res.json({ ...getDecoratedOrder(req.user.id, order.id), attached: id })
})

router.get('/documents/:key/thumbnail', (req, res) => {
	const upload = selectUploadThumbnail.get(req.params.key, req.user.id)
	if (!upload || !upload.thumbnail) return res.status(404).json({ error: 'No thumbnail for that document.' })
	res.set('Content-Type', upload.thumbnail_content_type || 'image/webp')
	res.send(decompressBlob(upload.thumbnail, upload.thumbnail_is_compressed))
})
