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
import { findVendorIdForReceipt } from '../lib/findOrCreate.js'
import { parseReceipt } from '../lib/scanParse.js'
import { describe, listedNames } from '../lib/categorySuggest.js'
import { keyOfType } from '../lib/statuses.js'
import { pageCount, pageImage } from '../lib/filePages.js'
import { toEpoch, fromEpoch, nowEpoch } from '../lib/dates.js'
import { assertImageOrPdf } from '../lib/fileType.js'
import { MAX_UPLOAD_MB } from '../lib/constants.js'
import { createOrderRecord } from './orders.js'
import { forgetReads } from '../lib/readCache.js'

export const router = Router()
// See orders.js's own upload instance for why defParamCharset is set -- busboy decodes
// multipart filenames as latin1 unless told otherwise, and browsers never say otherwise.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 }, defParamCharset: 'utf8' })

const insertUpload = db.prepare(`INSERT INTO scan_uploads
	(id, user_id, name, size, kind, sha256, content_type, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type, expires_at, pages,
		original, original_is_compressed, original_content_type, ai_read_json)
	VALUES (@id, @userId, @name, @size, @kind, @sha256, @contentType, @data, @dataCompressed, @thumbnail, @thumbnailCompressed, @thumbnailContentType, @expiresAt, @pages,
		@original, @originalCompressed, @originalContentType,
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

/** What is already known about these bytes: when they were read and the orders that hold them, if
    any. Nothing is known of a file that was never read, so there is nothing to offer for it. */
function seenBefore(userId, sha256) {
	const orders = selectOrdersWithFile.all({ sha256, userId })
	const read = selectReadingTime.get(userId, sha256)
	if (!read) return null
	return {
		readAt: new Date(read.read_at * 1000).toISOString(),
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
   swept by scheduleUploadCleanup once expires_at passes, not deleted on the spot. Set once
   at upload time, same shape as sessions.expires_at (migrations/001_init.sql, lib/auth.js), rather
   than recomputed from created_at on every sweep: the row's lifetime -- and so the hash lookup
   below, which trusts any row that has not yet expired -- survives whatever happens to any order
   it went on to help create. Its reading outlives it in scan_readings, keyed by the same hash.
   The 3c and 17a screens promise the reader this lifetime: 24 hours. */
const UPLOAD_TTL_SECONDS = 24 * 60 * 60
const deleteExpiredUploads = db.prepare('DELETE FROM scan_uploads WHERE expires_at <= ?')
/* Swept every hour rather than on the write path that grows the table, so an upload goes within
   an hour of its 24, and a sweep at startup catches up a server that was stopped meanwhile. */
const SWEEP_MS = 60 * 60 * 1000
function cleanupExpiredUploads() {
	deleteExpiredUploads.run(nowEpoch())
}
export function scheduleUploadCleanup() {
	cleanupExpiredUploads()
	const timer = setInterval(cleanupExpiredUploads, SWEEP_MS)
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
const selectUploadMeta = db.prepare(`SELECT id, name, size, kind, (thumbnail IS NOT NULL) AS has_thumbnail,
	CASE WHEN original IS NULL THEN size ELSE length(data) END AS display_size FROM scan_uploads WHERE id = ? AND user_id = ?`)
const selectUploadThumbnail = db.prepare('SELECT thumbnail, thumbnail_is_compressed, thumbnail_content_type FROM scan_uploads WHERE id = ? AND user_id = ?')
const selectDraftDefaults = db.prepare('SELECT default_status, default_kind, scan_overrides FROM settings WHERE user_id = ?')

// what each kind of document sets when the account lets a scan override its defaults (Settings, Defaults)
const FROM_DOCUMENT = {
	receipt: { status: 'delivered' }, order_confirmation: { status: 'ordered' },
	return: { status: 'returned' }, sale: { kind: 'Sold' }
}

/** The new order's status and kind: the account's defaults, or what the document shows when the
    account lets a scan override them. A status the account has deleted keeps the default. */
function startingValues(userId, settings, read) {
	const own = { status: settings?.default_status ?? keyOfType(userId, 'delivered'), kind: settings?.default_kind ?? 'Expense' }
	const found = FROM_DOCUMENT[read?.documentType]
	if (!found || (settings && !settings.scan_overrides)) return own
	return { status: (found.status && keyOfType(userId, found.status)) || own.status, kind: found.kind ?? own.kind }
}
const selectOrderExists = db.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?')
// Everything parseReceipt needs (the bytes) plus everything the draft response needs (name,
// size, kind, thumbnail) plus the cached read, in one row -- the draft handler either has an
// AI read already or is about to go make one, and both branches want the same row.
const selectUploadForRead = db.prepare(`SELECT id, user_id, name, size, kind, content_type, data, data_is_compressed,
	(thumbnail IS NOT NULL) AS has_thumbnail, ai_read_json, sha256, pages, draft_order_id FROM scan_uploads WHERE id = ? AND user_id = ?`)
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
	// kept for an order's own file; attaching it to a line leaves the full size behind
	const processed = await processAttachment(file.buffer, file.mimetype, file.originalname, { keepOriginal: true })
	const kind = processed.kind
	const id = newId('su')
	insertUpload.run({
		id, userId: req.user.id, name: file.originalname, size: processed.size, kind, sha256,
		contentType: processed.contentType ?? file.mimetype,
		data: processed.data, dataCompressed: processed.dataCompressed ? 1 : 0,
		thumbnail: processed.thumbnail, thumbnailCompressed: processed.thumbnailCompressed ? 1 : 0,
		thumbnailContentType: processed.thumbnailContentType,
		expiresAt: nowEpoch() + UPLOAD_TTL_SECONDS, pages: processed.pages ?? null,
		original: processed.original, originalCompressed: processed.originalCompressed ? 1 : 0, originalContentType: processed.originalContentType
	})
	res.status(201).json(uploadAnswer({
		id, kind, size: processed.size, pages: processed.pages, sha256, has_thumbnail: processed.thumbnail != null
	}, file.originalname, req.user.id))
})

/** A stored upload's own bytes: an image's display copy, or the PDF as it arrived. */
const selectUploadFile = db.prepare('SELECT name, content_type, data, data_is_compressed FROM scan_uploads WHERE id = ? AND user_id = ?')
const selectUploadOriginal = db.prepare('SELECT name, original, original_is_compressed, original_content_type FROM scan_uploads WHERE id = ? AND user_id = ?')
router.get('/documents/:key/file', (req, res) => {
	const full = req.query.download === '1' ? selectUploadOriginal.get(req.params.key, req.user.id) : null
	if (full?.original) {
		res.set('Content-Type', full.original_content_type)
		res.set('Content-Disposition', `attachment; filename="${full.name.replace(/"/g, '')}"`)
		return res.send(decompressBlob(full.original, full.original_is_compressed))
	}
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
	// the reader is here to see the reading, so it is theirs to save, not a draft's to become
	clearLeave.run(upload.id, req.user.id)

	/* ?progress=stream answers in NDJSON: `{ progress: { found, lines } }` lines while the file is
	   read (3a step 2), then `{ draft }`, the same object the plain answer is. */
	const streaming = req.query.progress === 'stream'
	if (streaming) {
		res.status(200).set({ 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' })
		res.flushHeaders()
	}
	const drafted = draftedOrder(upload)
	if (drafted) {
		// left while it was read, and already a Draft order: that order is the answer
		const answer = { documentKey: upload.id, draftOrderId: drafted }
		return streaming ? res.end(JSON.stringify({ draft: answer }) + '\n') : res.json(answer)
	}
	const { read, failure } = upload.ai_read_json != null
		? { read: JSON.parse(upload.ai_read_json), failure: null }
		: await readOnce(req.user.id, upload, req.today, progress => { if (streaming && !res.writableEnded) res.write(JSON.stringify({ progress }) + '\n') }, res)
	const draft = draftOf(req, upload, read, failure)
	if (streaming) res.end(JSON.stringify({ draft }) + '\n')
	else res.json(draft)
})

/* ---- a reading the reader left (6e, 3a step 2): it finishes, and becomes a Draft order ---- */

const clearLeave = db.prepare('UPDATE scan_uploads SET leave_as_draft = 0 WHERE id = ? AND user_id = ?')
const setLeave = db.prepare('UPDATE scan_uploads SET leave_as_draft = 1 WHERE id = ? AND user_id = ?')
const selectLeave = db.prepare('SELECT leave_as_draft, draft_order_id FROM scan_uploads WHERE id = ?')
const claimDraft = db.prepare('UPDATE scan_uploads SET draft_order_id = ?, leave_as_draft = 0 WHERE id = ? AND draft_order_id IS NULL AND leave_as_draft = 1')
const selectOrderOf = db.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?')
const draftedOrder = upload => (upload.draft_order_id && selectOrderOf.get(upload.draft_order_id, upload.user_id) ? upload.draft_order_id : null)

/* One reading per upload, however many ask, each hearing its progress. `res` is an asker waiting
   for the answer; with none left, a reading its reader left becomes a draft when it ends. */
const readings = new Map()
function readOnce(userId, upload, today, onProgress, res) {
	let reading = readings.get(upload.id)
	if (!reading) {
		const listeners = new Set()
		const waiting = new Set()
		const promise = parseReceipt(upload, today, progress => { for (const fn of listeners) fn(progress) }, listedNames(userId))
			.then(result => {
				// Only an answer is kept: a call that failed cost nothing, and keeping it would block the retry.
				if (!result.failure && result.read?.lines.length) {
					saveAiRead.run({ id: upload.id, userId, json: JSON.stringify(result.read) })
					if (upload.sha256) keepReading.run(userId, upload.sha256, JSON.stringify(result.read))
				}
				return result
			})
		reading = { promise, listeners, waiting }
		readings.set(upload.id, reading)
		const own = reading
		promise.then(result => { if (!own.waiting.size) draftIfLeft(userId, upload, result, today) })
			.catch(error => console.error('Receipt read failed:', error.message))
			.finally(() => readings.delete(upload.id))
	}
	if (onProgress) reading.listeners.add(onProgress)
	if (res) {
		const own = reading
		own.waiting.add(res)
		res.on('close', () => { own.waiting.delete(res); if (onProgress) own.listeners.delete(onProgress) })
	}
	return reading.promise
}

/** Files what was read as a Draft order with the receipt on it, once, if the reader left. A
    reading that found no vendor files it under "Unknown vendor", for the reader to change. */
function draftIfLeft(userId, upload, { read, failure }, today) {
	const flag = selectLeave.get(upload.id)
	if (!flag?.leave_as_draft || flag.draft_order_id) return null
	// a reading that gave nothing leaves nothing behind: no order, no stored file
	if (!read?.lines.length) return null
	const found = draftOf({ user: { id: userId }, today }, upload, read, failure)
	const body = {
		vendor: String(found.vendor || 'Unknown vendor').trim().slice(0, 80), date: found.date, status: keyOfType(userId, 'draft'), kind: found.kind,
		shipping: Number(found.shipping) || 0, discount: Number(found.discount) || 0, reference: found.reference ?? '', note: '',
		categories: [],
		items: found.lines.map(l => ({ title: String(l.title ?? '').trim().slice(0, 120), quantity: l.quantity, price: l.price }))
	}
	try {
		const made = createOrderRecord(userId, body, today, id => {
			if (!claimDraft.run(id, upload.id).changes) throw Object.assign(new Error('Already drafted'), { drafted: true })
			const attachment = newId('a')
			copyUploadToAttachment.run({ id: attachment, orderId: id, itemId: null, name: null, size: upload.size,
				meta: `Scanned today${sep}${fileSizeLabel(upload.size)}`, fromScan: 1, uploadId: upload.id, userId })
			copyUploadPages.run({ id: attachment, uploadId: upload.id })
			markVendorScanned.run({ order: id, userId })
		})
		// no request carried this write, so the account's cached answers do not know of it yet
		forgetReads(userId)
		return made
	} catch (error) {
		if (!error.drafted) console.error('A reading left by its reader was not filed as a draft:', error.message)
		return null
	}
}

/** The reader left while the file was read: when the reading ends it becomes a Draft order, and
    the answer, sent then, names it. */
router.post('/documents/:key/leave', async (req, res) => {
	const upload = selectUploadForRead.get(req.params.key, req.user.id)
	if (!upload) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	const drafted = draftedOrder(upload)
	if (drafted) return res.json({ key: upload.id, orderId: drafted })
	setLeave.run(upload.id, req.user.id)
	let reading = readings.get(upload.id)
	if (!reading && upload.ai_read_json != null)
		return res.json({ key: upload.id, orderId: draftIfLeft(req.user.id, upload, { read: JSON.parse(upload.ai_read_json), failure: null }, req.today) })
	if (!reading && process.env.ANTHROPIC_API_KEY) {
		readOnce(req.user.id, upload, req.today)
		reading = readings.get(upload.id)
	}
	// the reading's own end files the draft before this answer is sent
	if (reading) await reading.promise.catch(() => null)
	res.json({ key: upload.id, orderId: selectLeave.get(upload.id)?.draft_order_id ?? null })
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
		const partial = read ? findVendorIdForReceipt(req.user.id, read) : null
		return {
			documentKey: upload.id, file,
			vendor: read ? (partial ? selectVendorName.get(partial, req.user.id)?.name : read.vendor) : '',
			vendorMatched: Boolean(partial), date: read?.date ?? req.today,
			...startingValues(req.user.id, settings, read),
			deliveredDate: req.today, returnedDate: req.today, reference: read?.reference ?? '',
			shipping: 0, discount: 0, linesRead: 0, lines: [], remainder: null, total: null,
			failure: read ? 'empty' : failure === 'billing' ? 'billing' : process.env.ANTHROPIC_API_KEY ? 'failed' : 'unread',
			found: read ? { vendor: read.vendor, date: read.date } : null,
			reconciled: failure === 'billing'
				? 'This document was not read: the reading service reports a billing problem, such as no credits left. Add the line items and totals below yourself, or upload it again once that is fixed.'
				: process.env.ANTHROPIC_API_KEY
					? 'This document could not be read automatically. Add the line items and totals below yourself.'
					: 'This document has not been read automatically. Add the line items and totals below yourself.',
			checks: [], unclear: [], duplicate: null, suggestions: []
		}
	}

	const vendorId = findVendorIdForReceipt(req.user.id, read)
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
		// the scan's own category suggestions, as they stand against the account's categories now
		suggestions: describe(req.user.id, read.suggestions ?? []),
		reference: read.reference ?? '', unclear: read.unclear ?? [],
		// The document's own spelling once reached the review screen even when the vendor
		// matched -- a receipt printing "BILKA" against a vendor named "Bilka" showed the
		// document's casing on a field the picker's "matched" chip claimed was already right.
		// A match means the vendor record is the answer; the scanned string only speaks where
		// there was no vendor to match it to.
		vendor: vendorMatched ? vendorName : read.vendor, vendorMatched,
		date: read.date ?? req.today,
		...startingValues(req.user.id, settings, read),
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
				// all three things a receipt is matched by (5h), as it printed them
				meta: [read.vendor, read.vatNumber ? `CVR ${read.vatNumber}` : null, read.website].filter(Boolean).join(sep)
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
    deleted -- until the row's own expires_at retires it (scheduleUploadCleanup above). */
const copyUploadToAttachment = db.prepare(`INSERT INTO attachments
	(id, order_id, order_item_id, name, kind, meta, content_type, size, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type, sha256, pages, from_scan,
		original, original_is_compressed, original_content_type)
	SELECT @id, @orderId, @itemId, COALESCE(@name, name), kind, @meta, content_type, @size, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type, sha256, pages, @fromScan,
		CASE WHEN @itemId IS NULL THEN original END, CASE WHEN @itemId IS NULL THEN original_is_compressed ELSE 0 END, CASE WHEN @itemId IS NULL THEN original_content_type END
	FROM scan_uploads WHERE id = @uploadId AND user_id = @userId`)
const copyUploadPages = db.prepare(`INSERT INTO attachment_pages (attachment_id, page, image, content_type)
	SELECT @id, page, image, content_type FROM scan_upload_pages WHERE upload_id = @uploadId`)
const selectItemOfOrder = db.prepare('SELECT id FROM order_items WHERE id = ? AND order_id = ?')
const markVendorScanned = db.prepare(`UPDATE vendors SET origin = 'scan'
	WHERE id = (SELECT vendor_id FROM orders WHERE id = @order) AND made_by_order = @order AND user_id = @userId`)

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
	const scanned = req.query.as !== 'file'
	db.transaction(() => {
		// a line keeps only the copies it is drawn with, so its size is theirs
		const size = itemId ? upload.display_size : upload.size
		copyUploadToAttachment.run({ id, orderId: itemId ? null : order.id, itemId, size,
			name, meta: `${scanned ? 'Scanned' : 'Added'} today${sep}${fileSizeLabel(size)}`,
			fromScan: scanned ? 1 : 0, uploadId: upload.id, userId: req.user.id })
		copyUploadPages.run({ id, uploadId: upload.id })
		// the receipt this order was created from: a vendor that order's save made came from the scan (5a)
		if (scanned && !itemId) markVendorScanned.run({ order: order.id, userId: req.user.id })
	})()
	res.json({ ...getDecoratedOrder(req.user.id, order.id), attached: id })
})

router.get('/documents/:key/thumbnail', (req, res) => {
	const upload = selectUploadThumbnail.get(req.params.key, req.user.id)
	if (!upload || !upload.thumbnail) return res.status(404).json({ error: 'No thumbnail for that document.' })
	res.set('Content-Type', upload.thumbnail_content_type || 'image/webp')
	res.send(decompressBlob(upload.thumbnail, upload.thumbnail_is_compressed))
})
