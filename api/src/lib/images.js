import sharp from 'sharp'
import { Worker } from 'node:worker_threads'
import { fileURLToPath } from 'node:url'
import { compressBlob } from './blobCompression.js'
import { cleanOriginal } from './cleanImage.js'
import { detectFileType, detectKind } from './fileType.js'
import { refusal } from './phrases.js'
import { log } from './log.js'

/* Every image attachment (a manual upload or a scan) is resized on the way in, not stored at
   whatever resolution the source produced — a phone photo is routinely 4000x3000 and several
   megabytes; nothing here ever needs more than a receipt's worth of detail. A PDF's own bytes
   are never touched — there's no "resize" for a document, and the /file download is still the
   real artifact — but its first page is rendered to a thumbnail the same way a photo's is, via
   mupdf (a WASM build: no native compile step and no system binary like poppler to install
   outside npm, unlike the other two common ways to rasterize a PDF in Node). */

/* The two sizes every picture is kept at (Images and files 17a): a square for every small slot, and
   a wide copy for every larger view. WebP cannot hold a side past 16383, so a very tall page stops there. */
const SQUARE = 256
const WIDE = 1080
const WEBP_MAX = 16383

/** Turned upright from EXIF and encoded as WebP, which also leaves every piece of metadata behind. */
const encode = image => image.webp({ quality: 85, effort: 6 }).toBuffer()
// a square is cut around what the picture is of (strong colour, contrast, skin), never larger than its shorter side
export async function toSquare(buffer) {
	const { width = SQUARE, height = SQUARE } = await sharp(buffer).metadata()
	const side = Math.min(SQUARE, width, height)
	return encode(sharp(buffer).rotate().resize(side, side, { fit: 'cover', position: sharp.strategy.attention }))
}
export const toWide = buffer => encode(sharp(buffer).rotate().resize({ width: WIDE, height: WEBP_MAX, fit: 'inside', withoutEnlargement: true }))
/* The light copy: a wide copy made smaller and lighter, for a picture drawn small on a phone. Made when
   asked for and not kept, as the browser keeps it; a lower effort than encode's, as the reader waits. */
const LIGHT = 720
export async function toLight(wide, contentType) {
	const light = await sharp(wide).resize({ width: LIGHT, height: WEBP_MAX, fit: 'inside', withoutEnlargement: true }).webp({ quality: 75, effort: 4 }).toBuffer()
	return light.length < wide.length ? { image: light, contentType: 'image/webp' } : { image: wide, contentType }
}
// PNG for a drawn page: a lossy pass blurs the edges of its text
export const toSize = (buffer, width, height, { png = false } = {}) => {
	const image = sharp(buffer).rotate().resize(width, height, { fit: 'fill' })
	return png ? image.png().toBuffer() : encode(image)
}

/** { data, contentType, size, thumbnail, thumbnailContentType } for a stored image attachment,
    or null when sharp cannot open it. Both sizes come from the source, never one from the other. */
export async function processImage(buffer) {
	try {
		const [display, thumbnail] = await Promise.all([toWide(buffer), toSquare(buffer)])
		return { data: display, contentType: 'image/webp', size: display.length, thumbnail, thumbnailContentType: 'image/webp' }
	} catch (error) {
		log.error('picture', `An uploaded picture could not be read: ${error.message}`)
		return null
	}
}

// mupdf renders on a worker thread: its WASM objects hold native heap outside JS's GC
const PDF_WORKER = fileURLToPath(new URL('./pdfPage.worker.js', import.meta.url))
/* A rendering that has not finished by now is not going to be waited for. The worst measured
   parse is 411ms on a 25MB file -- the largest multer accepts -- so this is two orders of
   magnitude of headroom, and its job is to bound a pathological file rather than to trim a
   slow one. On expiry the worker is terminated and the upload keeps its document icon. */
const PDF_RENDER_TIMEOUT_MS = 15_000

/** One page of a PDF (from 0), rendered to a PNG on a worker thread: `{ png, pages }`. `png` is
    null for a page that cannot be rendered (encrypted, corrupt, past the end, not a PDF); the
    whole answer is null for a render that outruns the timeout. */
export async function renderPdfPage(buffer, index = 0) {
	const message = await inPdfWorker({ buffer, width: WIDE, maxHeight: WEBP_MAX, page: index })
	return message && { png: message.png ? Buffer.from(message.png) : null, pages: message.pages ?? null }
}

/** The words and pictures of a PDF's first `count` pages, as mupdf's structured text (`{ json, width,
    height, shown, hidden }` per page): `{ text, pages }`, `text` null when none can be read; null on a timeout. */
export async function pdfText(buffer, count) {
	const message = await inPdfWorker({ buffer, textPages: count })
	return message && { text: message.text ?? null, pages: message.pages ?? null }
}

function inPdfWorker(workerData) {
	return new Promise(resolve => {
		let settled = false
		const settle = value => { if (!settled) { settled = true; clearTimeout(timer); resolve(value) } }
		const worker = new Worker(PDF_WORKER, { workerData })
		/* A worker that has already posted its result is left to exit on its own rather than
		   force-terminated here. mupdf's own module has a top-level await (WASM instantiation),
		   and calling worker.terminate() in the same turn as its 'message' event races V8's
		   still-settling async-module bookkeeping for that import -- not the postMessage, which
		   has already completed by the time this fires. Losing that race doesn't fail the
		   render; it kills the whole process with a "Check failed: (location_) != nullptr"
		   fatal error in AsyncModuleExecutionFulfilled, taking every other request on the box
		   down with it. A worker that already sent its message exits by itself within
		   milliseconds regardless, so nothing here waits on terminate() for that case. Only a
		   genuinely hung worker -- the timeout below -- still needs it. */
		const timer = setTimeout(() => {
			log.error('picture', `A PDF page was not drawn within ${PDF_RENDER_TIMEOUT_MS / 1000} seconds`)
			worker.terminate()
			settle(null)
		}, PDF_RENDER_TIMEOUT_MS)
		worker.on('message', message => {
			if (message?.error) log.error('picture', `A PDF page could not be drawn: ${message.error}`)
			settle(message)
		})
		worker.on('error', error => {
			log.error('picture', `The PDF drawing stopped: ${error.message}`)
			settle(null)
		})
		worker.on('exit', () => settle(null))
	})
}

/** The square of a PDF's first page, or null when it cannot be rendered (encrypted, corrupt, no
    pages): the caller then draws the document icon. The PDF's own bytes are never touched. */
export async function processPdfThumbnail(buffer) {
	// Not a PDF by its own first bytes: mupdf would spend the whole parse discovering that, and
	// on a 25MB file that is 411ms of a blocked thread to answer a question four bytes settle.
	if (detectFileType(buffer)?.type !== 'application/pdf') return null
	const { png, pages } = await renderPdfPage(buffer) ?? {}
	if (!png) return null
	try {
		return { thumbnail: await toSquare(png), thumbnailContentType: 'image/webp', pages }
	} catch (error) {
		log.error('picture', `The first page of a PDF could not be made small: ${error.message}`)
		return null
	}
}

/** One page of a PDF (counted from 0) at the display size, with the document's page count:
    `{ image, contentType, pages }`, or `{ image: null, pages }` when that page cannot be drawn. */
export async function processPdfPage(buffer, index) {
	if (detectFileType(buffer)?.type !== 'application/pdf') return { image: null, pages: 0 }
	const { png, pages } = await renderPdfPage(buffer, index) ?? {}
	if (!png) return { image: null, pages: pages ?? 0 }
	try {
		return { image: await toWide(png), contentType: 'image/webp', pages }
	} catch (error) {
		log.error('picture', `Page ${index + 1} of a PDF could not be shown: ${error.message}`)
		return { image: null, pages }
	}
}

/** { thumbnail, thumbnailCompressed, wide, wideCompressed, contentType } for a bookmark picture,
    or null when the bytes are not a decodable image. */
export async function processPicture(buffer) {
	let square, wide
	try { [square, wide] = await Promise.all([toSquare(buffer), toWide(buffer)]) } catch (error) {
		log.error('picture', `A bookmark picture could not be read: ${error.message}`)
		return null
	}
	const [s, w] = await Promise.all([compressBlob(square, 'image/webp'), compressBlob(wide, 'image/webp')])
	return { thumbnail: s.blob, thumbnailCompressed: s.compressed, wide: w.blob, wideCompressed: w.compressed, contentType: 'image/webp' }
}

const refuseUnreadable = name => {
	throw name == null ? refusal(415, 'upload.pictureUnreadable') : refusal(415, 'upload.namedPictureUnreadable', { name })
}

/** { data, dataCompressed, contentType, size, thumbnail, thumbnailCompressed, thumbnailContentType }
    for any uploaded attachment — the one place this branches by kind (image → resized copies;
    pdf → original bytes plus a rendered-page thumbnail where that succeeds), used by every
    upload path (a direct attachment, a scan, a bulk import) so the three can't drift into
    different rules for what "processed" for a given kind actually means. Also the one place the
    stored bytes are deflated -- every write path funnels through here, so the read side
    (orders.js/scan.js) only has to know how to reverse it, not which upload produced a given
    row. `size` stays the uncompressed byte count: it's what the UI shows as the file's size, and
    that should describe the upload, not how this happened to store it. `keepOriginal`: a picture
    also keeps its cleaned full size (lib/cleanImage.js), and `size` is then that copy's. */
export async function processAttachment(buffer, mimetype, name, { keepOriginal = false } = {}) {
	/* The kind is read off the bytes here rather than taken from the caller, and returned, so
	   the three upload paths (an attachment, a scan, an import) cannot each arrive at a
	   different answer for one file -- which they did, from the filename and the mimetype, both
	   of which the caller writes. lib/fileType.js has the signatures and what it cost.

	   `detected` also gives the stored content type its value -- the bytes' own type, never
	   whatever the caller claimed -- and it is served straight back as a Content-Type header. */
	const detected = detectFileType(buffer)
	const kind = detectKind(buffer, mimetype, name)
	// a picture is only ever kept as the copies made from it, so one that cannot be opened is refused
	const processed = kind === 'image' ? await processImage(buffer) ?? refuseUnreadable(name) : await (async () => {
		const pdfThumb = await processPdfThumbnail(buffer)
		return {
			data: buffer, contentType: detected?.type ?? 'application/octet-stream', size: buffer.length,
			thumbnail: pdfThumb?.thumbnail ?? null, thumbnailContentType: pdfThumb?.thumbnailContentType ?? null,
			pages: pdfThumb?.pages ?? null
		}
	})()
	/* Each blob compressed against its own content type, so the pipeline's own JPEGs are
	   recognised as already-compressed and skipped rather than deflated for a loss. Both at
	   once: they are independent, and the threadpool can take them together. */
	const clean = kind === 'image' && keepOriginal ? await cleanOriginal(buffer, detected?.type) : null
	const [data, thumbnail, original] = await Promise.all([
		compressBlob(processed.data, processed.contentType),
		compressBlob(processed.thumbnail, processed.thumbnailContentType),
		compressBlob(clean?.data ?? null, clean?.contentType)
	])
	return {
		...processed,
		kind,
		size: clean ? clean.data.length : processed.size,
		data: data.blob, dataCompressed: data.compressed,
		thumbnail: thumbnail.blob, thumbnailCompressed: thumbnail.compressed,
		original: original.blob ?? null, originalCompressed: original.compressed, originalContentType: clean?.contentType ?? null
	}
}
