import { Router } from 'express'
import { upload } from '../lib/upload.js'
import { createHash } from 'crypto'
import { db } from '../db.js'
import { requireConfirmed } from '../lib/auth.js'
import { newId } from '../lib/ids.js'
import { getDecoratedOrder } from '../lib/decorate.js'
import { sep, fileSizeLabel } from '../lib/copy.js'
import { processAttachment } from '../lib/images.js'
import { decompressBlob } from '../lib/blobCompression.js'
import { parseReceipt } from '../lib/scanParse.js'
import { inAccountCurrency } from '../lib/exchange.js'
import { listedNames } from '../lib/categorySuggest.js'
import { pageCount, pageImage } from '../lib/filePages.js'
import { fromEpoch, nowEpoch } from '../lib/dates.js'
import { assertImageOrPdf, fileDisposition } from '../lib/fileType.js'
import { UPLOAD_TTL_SECONDS, answerOf, discardDraft, draftOfUpload, draftRow, draftsAsOrders, heldBy, readings } from '../lib/orderDrafts.js'
import { forgetReads } from '../lib/readCache.js'
import { paidReadWait } from '../lib/rateLimit.js'

export const router = Router()

const insertUpload = db.prepare(`INSERT INTO uploads
	(id, user_id, name, size, kind, sha256, content_type, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type, expires_at, pages,
		original, original_is_compressed, original_content_type, ai_read_json, read_at)
	VALUES (@id, @userId, @name, @size, @kind, @sha256, @contentType, @data, @dataCompressed, @thumbnail, @thumbnailCompressed, @thumbnailContentType, @expiresAt, @pages,
		@original, @originalCompressed, @originalContentType, @readJson, @readAt)`)
/* A reading is kept with its file: on the scan while it lasts, then on the order's own file. Bytes read
   before are not paid for again while either holds them. */
const selectScanReading = db.prepare(`SELECT ai_read_json AS read_json, read_at FROM uploads
	WHERE user_id = @userId AND sha256 = @sha256 AND ai_read_json IS NOT NULL LIMIT 1`)
const selectFileReading = db.prepare(`SELECT a.read_json, a.read_at FROM order_attachments a JOIN orders o ON o.id = a.order_id
	WHERE a.sha256 = @sha256 AND o.user_id = @userId AND a.read_json IS NOT NULL LIMIT 1`)
const readingOf = (userId, sha256) => selectScanReading.get({ userId, sha256 }) ?? selectFileReading.get({ userId, sha256 })
/* The orders that already hold a file with these bytes as their own attachment, newest first (3c). */
const selectOrdersWithFile = db.prepare(`
	SELECT o.id, o.reference, o.date, o.item_count, o.status, o.total, v.name AS vendor, a.id AS attachment_id, a.name AS file_name, a.kind AS file_kind
	FROM order_attachments a JOIN orders o ON o.id = a.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE a.sha256 = @sha256 AND o.user_id = @userId
	ORDER BY o.date DESC, o.created_at DESC`)

// a draft scanned from these bytes
const selectDraftWithFile = db.prepare(`SELECT d.id FROM uploads u JOIN order_drafts d ON d.upload_id = u.id
	WHERE u.user_id = ? AND u.sha256 = ? LIMIT 1`)

/** What is already known about these bytes: when they were read, the orders that hold them and the
    draft scanned from them (3c). Nothing is known of a file that was never read and no draft holds. */
function seenBefore(userId, sha256) {
	const orders = selectOrdersWithFile.all({ sha256, userId })
	const read = readingOf(userId, sha256)
	const holder = selectDraftWithFile.get(userId, sha256)?.id
	const [draft] = holder ? draftsAsOrders(userId, holder) : []
	if (!read && !draft) return null
	return {
		readAt: read ? new Date(read.read_at * 1000).toISOString() : null,
		draft: draft ? { id: draft.id, vendor: draft.vendor?.name ?? null, file: draft.draft.file, scanned: draft.draft.scanned, total: draft.total } : null,
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
/* An upload nobody holds, or one that already became an order's attachment, is swept once
   expires_at passes (lib/orderDrafts.js sets the lifetime); one a draft holds stays while it does. */
const deleteExpiredUploads = db.prepare(`DELETE FROM uploads WHERE expires_at <= ?
	AND id NOT IN (SELECT upload_id FROM order_drafts WHERE upload_id IS NOT NULL)
	AND id NOT IN (SELECT upload_id FROM order_draft_files)`)
export const dropExpiredUploads = () => deleteExpiredUploads.run(nowEpoch())
/* The same bytes, uploaded again before the row from last time expires -- a second click on the
   same file, a re-export from the camera roll, a receipt dropped twice, or the same document
   scanned again after the order it first produced was deleted. The existing row is the answer
   either way: same id, same cached ai_read_json if the draft was already opened, no second
   resize and no second model call for a document this account has already paid to read once.
   A draft's own file is never the answer: it goes with the draft, so the new upload is its own. */
const selectUploadByHash = db.prepare(`
	SELECT id, kind, size, pages, sha256, (thumbnail IS NOT NULL) AS has_thumbnail
	FROM uploads u WHERE user_id = ? AND sha256 = ? AND expires_at > ?
		AND NOT EXISTS (SELECT 1 FROM order_drafts d WHERE d.upload_id = u.id)
	ORDER BY created_at DESC LIMIT 1`)
/* Split by what each reader draws: the draft screen wants the row's facts, the thumbnail route
   its own bytes -- never both BLOBs decoded to answer a metadata question. */
const selectUploadMeta = db.prepare(`SELECT id, name, size, kind, (thumbnail IS NOT NULL) AS has_thumbnail,
	CASE WHEN original IS NULL THEN size ELSE length(data) END AS display_size FROM uploads WHERE id = ? AND user_id = ?`)
const selectUploadThumbnail = db.prepare('SELECT thumbnail, thumbnail_is_compressed, thumbnail_content_type FROM uploads WHERE id = ? AND user_id = ?')
const selectAccountCurrency = db.prepare('SELECT currency FROM user_settings WHERE user_id = ?')
const selectOrderExists = db.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?')
// Everything parseReceipt needs (the bytes) plus everything the draft response needs (name,
// size, kind, thumbnail) plus the cached read, in one row -- the draft handler either has an
// AI read already or is about to go make one, and both branches want the same row.
const selectUploadForRead = db.prepare(`SELECT id, user_id, name, size, kind, content_type, data, data_is_compressed,
	(thumbnail IS NOT NULL) AS has_thumbnail, ai_read_json, sha256, pages FROM uploads WHERE id = ? AND user_id = ?`)
const saveAiRead = db.prepare('UPDATE uploads SET ai_read_json = @json, read_at = unixepoch() WHERE id = @id AND user_id = @userId')

/** A file kept until a save files it: an image gets a display copy and a thumbnail, a PDF keeps its
    bytes and gets a thumbnail of its first page (lib/images.js). `?scan=1` makes it a scan (3a): a
    file not seen before becomes a draft, and is read whether or not anyone waits. */
router.post('/documents', requireConfirmed, upload.single('file'), async (req, res) => {
	const file = req.file
	if (!file) return res.status(400).json({ error: 'No file was uploaded.' })
	assertImageOrPdf([file])

	// The source bytes' own hash, before any resizing -- two uploads of the same file hash the
	// same regardless of what processAttachment below would make of either.
	const sha256 = createHash('sha256').update(file.buffer).digest('hex')
	const existing = selectUploadByHash.get(req.user.id, sha256, nowEpoch())
	if (existing) return res.status(200).json(scanned(req, uploadAnswer(existing, file.originalname, req.user.id)))

	// The kind the bytes declare, not the one the filename claims -- see lib/fileType.js.
	// kept for an order's own file; attaching it to a line leaves the full size behind
	const processed = await processAttachment(file.buffer, file.mimetype, file.originalname, { keepOriginal: true })
	const kind = processed.kind
	const id = newId('su')
	const known = readingOf(req.user.id, sha256)
	insertUpload.run({
		id, userId: req.user.id, name: file.originalname, size: processed.size, kind, sha256,
		contentType: processed.contentType ?? file.mimetype,
		data: processed.data, dataCompressed: processed.dataCompressed ? 1 : 0,
		thumbnail: processed.thumbnail, thumbnailCompressed: processed.thumbnailCompressed ? 1 : 0,
		thumbnailContentType: processed.thumbnailContentType,
		expiresAt: nowEpoch() + UPLOAD_TTL_SECONDS, pages: processed.pages ?? null,
		original: processed.original, originalCompressed: processed.originalCompressed ? 1 : 0, originalContentType: processed.originalContentType,
		readJson: known?.read_json ?? null, readAt: known?.read_at ?? null
	})
	res.status(201).json(scanned(req, uploadAnswer({
		id, kind, size: processed.size, pages: processed.pages, sha256, has_thumbnail: processed.thumbnail != null
	}, file.originalname, req.user.id)))
})

function scanned(req, answer) {
	if (req.query.scan !== '1' || answer.seen) return answer
	const draftId = draftOfUpload(req.user.id, answer.key)
	const row = selectUploadForRead.get(answer.key, req.user.id)
	if (process.env.ANTHROPIC_API_KEY && row.ai_read_json == null) readOnce(req.user.id, row, req.today).catch(() => {})
	return { ...answer, draftId }
}

/** A stored upload's own bytes: an image's display copy, or the PDF as it arrived. */
const selectUploadFile = db.prepare('SELECT name, content_type, data, data_is_compressed FROM uploads WHERE id = ? AND user_id = ?')
const selectUploadOriginal = db.prepare('SELECT name, original, original_is_compressed, original_content_type FROM uploads WHERE id = ? AND user_id = ?')
router.get('/documents/:key/file', (req, res) => {
	const full = req.query.download === '1' ? selectUploadOriginal.get(req.params.key, req.user.id) : null
	if (full?.original) {
		res.set('Content-Type', full.original_content_type)
		res.set('Content-Disposition', fileDisposition(full.name, full.original_content_type, { download: true }))
		return res.send(decompressBlob(full.original, full.original_is_compressed))
	}
	const upload = selectUploadFile.get(req.params.key, req.user.id)
	if (!upload || !upload.data) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	res.set('Content-Type', upload.content_type || 'application/octet-stream')
	res.set('Content-Disposition', fileDisposition(upload.name, upload.content_type))
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
// a draft keeps the reading it was opened with
const clearUploadReading = db.prepare(`UPDATE uploads SET ai_read_json = NULL WHERE user_id = ? AND sha256 = ?
	AND NOT EXISTS (SELECT 1 FROM order_drafts d WHERE d.upload_id = uploads.id)`)
const forgetReading = db.prepare(`UPDATE order_attachments SET read_json = NULL, read_at = NULL WHERE sha256 = @sha256
	AND order_id IN (SELECT id FROM orders WHERE user_id = @userId)`)
const selectUploadHash = db.prepare('SELECT sha256 FROM uploads WHERE id = ? AND user_id = ?')
router.post('/documents/:key/reread', (req, res) => {
	const upload = selectUploadHash.get(req.params.key, req.user.id)
	if (!upload) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	db.transaction(() => {
		clearUploadReading.run(req.user.id, upload.sha256)
		forgetReading.run({ sha256: upload.sha256, userId: req.user.id })
	})()
	res.json({ key: req.params.key })
})

/** Throws an upload away now rather than when it expires. The reading of it is kept. A scanned file
    is its draft's: the draft goes with it (6d). One a draft holds as an added file stays. */
const deleteUpload = db.prepare('DELETE FROM uploads WHERE id = ? AND user_id = ?')
const heldAsFile = db.prepare(`SELECT 1 FROM order_drafts d JOIN order_draft_files f ON f.draft_id = d.id
	WHERE d.user_id = ? AND f.upload_id = ? LIMIT 1`)
router.delete('/documents/:key', (req, res) => {
	const holder = heldBy(req.user.id, req.params.key)
	if (holder) {
		discardDraft(req.user.id, holder)
		return res.json({ key: req.params.key })
	}
	if (heldAsFile.get(req.user.id, req.params.key)) return res.status(409).json({ error: 'This file belongs to a draft. Discard the draft to remove it.' })
	deleteUpload.run(req.params.key, req.user.id)
	res.json({ key: req.params.key })
})

/** The review step's starting point. Reads the document once via Claude's vision
    (lib/scanParse.js) and caches the result on the upload row, so a reload of step 2 or 3 --
    both fetch this for the same key -- never pays for a second read. Falls back to the same
    honest blank draft this route always returned when no ANTHROPIC_API_KEY is configured, or
    when the read fails. `?draft=1` is the scan's review (3a): the file is a draft from then on, and the
    answer names it and the form as it was left. A receipt compared with an order (3d) makes none. */
router.get('/draft/:key', async (req, res) => {
	const upload = selectUploadForRead.get(req.params.key, req.user.id)
	if (!upload) return res.status(404).json({ error: 'No uploaded document ' + req.params.key })
	const made = req.query.draft === '1' && !heldBy(req.user.id, upload.id)
	const draft = req.query.draft === '1' ? draftRow(req.user.id, draftOfUpload(req.user.id, upload.id)) : null
	if (made) forgetReads(req.user.id)

	/* ?progress=stream answers in NDJSON: `{ progress: { found, lines } }` lines while the file is
	   read (3a step 2), then `{ draft }`, the same object the plain answer is. */
	const streaming = req.query.progress === 'stream'
	if (streaming) {
		res.status(200).set({ 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' })
		res.flushHeaders()
	}
	const { read, failure } = upload.ai_read_json != null
		? { read: JSON.parse(upload.ai_read_json), failure: null }
		: await readOnce(req.user.id, upload, req.today, progress => { if (streaming && !res.writableEnded) res.write(JSON.stringify({ progress }) + '\n') }, res)
	const answer = {
		...answerOf({ userId: req.user.id, today: draft ? fromEpoch(draft.created_at) : req.today }, upload, read, failure),
		draftId: draft?.id ?? null, form: draft?.form ? JSON.parse(draft.form) : null
	}
	if (streaming) res.end(JSON.stringify({ draft: answer }) + '\n')
	else res.json(answer)
})

/* One reading per upload, however many ask, each hearing its progress. `res` is an asker waiting
   for the answer; the reading goes on without one. */
function readOnce(userId, upload, today, onProgress, res) {
	let reading = readings.get(upload.id)
	if (!reading) {
		const listeners = new Set()
		const original = upload.kind === 'image' ? selectUploadOriginal.get(upload.id, userId) : null
		const toRead = { ...upload, original: original?.original, original_is_compressed: original?.original_is_compressed }
		// past the account's paid reads for the day, the file stays and is not read, as when a read fails
		const promise = (paidReadWait(userId) ? Promise.resolve({ read: null, failure: 'failed' })
			: parseReceipt(toRead, today, progress => { for (const fn of listeners) fn(progress) }, listedNames(userId)))
			// restated before it is kept, so a reload never asks for the rate again
			.then(async result => result.read
				? { ...result, read: await inAccountCurrency(result.read, selectAccountCurrency.get(userId)?.currency ?? 'DKK') }
				: result)
			.then(result => {
				// Only an answer is kept: a call that failed cost nothing, and keeping it would block the retry.
				if (!result.failure && result.read?.lines.length) {
					saveAiRead.run({ id: upload.id, userId, json: JSON.stringify(result.read) })
				}
				return result
			})
			// the reading's end changes how the draft reads in the lists, with no request to say so
			.finally(() => { readings.delete(upload.id); forgetReads(userId) })
		reading = { promise, listeners }
		readings.set(upload.id, reading)
		promise.catch(error => console.error('Receipt read failed:', error.message))
	}
	if (onProgress) {
		reading.listeners.add(onProgress)
		res?.on('close', () => reading.listeners.delete(onProgress))
	}
	return reading.promise
}

/** Turns a reviewed draft into the new order's own attachment, so the browser doesn't have to
    upload the same file a second time -- an INSERT ... SELECT, so the bytes go table-to-table
    inside SQLite instead of surfacing into a JS Buffer just to be handed straight back. The
    order's own file takes the reading with it. */
const copyUploadToAttachment = db.prepare(`INSERT INTO order_attachments
	(id, order_id, order_item_id, name, kind, meta, content_type, size, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type, sha256, pages, from_scan,
		original, original_is_compressed, original_content_type, read_json, read_at)
	SELECT @id, @orderId, @itemId, COALESCE(@name, name), kind, @meta, content_type, @size, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type, sha256, pages, @fromScan,
		CASE WHEN @itemId IS NULL THEN original END, CASE WHEN @itemId IS NULL THEN original_is_compressed ELSE 0 END, CASE WHEN @itemId IS NULL THEN original_content_type END,
		CASE WHEN @itemId IS NULL THEN ai_read_json END, CASE WHEN @itemId IS NULL THEN read_at END
	FROM uploads WHERE id = @uploadId AND user_id = @userId`)
/* Filed, the scan has handed on all it held, its reading included; it goes at the next nightly
   clean-up, after a margin for the rest of the same save to file it too. */
const FILED_MARGIN_SECONDS = 10 * 60
const expireUpload = db.prepare('UPDATE uploads SET expires_at = MIN(expires_at, @at) WHERE id = @id AND user_id = @userId')
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
		expireUpload.run({ id: upload.id, userId: req.user.id, at: nowEpoch() + FILED_MARGIN_SECONDS })
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
