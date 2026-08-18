import sharp from 'sharp'
import { Worker } from 'node:worker_threads'
import { fileURLToPath } from 'node:url'
import { compressBlob } from './blobCompression.js'
import { detectFileType, detectKind } from './fileType.js'

/* Every image attachment (a manual upload or a scan) is resized on the way in, not stored at
   whatever resolution the source produced — a phone photo is routinely 4000x3000 and several
   megabytes; nothing here ever needs more than a receipt's worth of detail. A PDF's own bytes
   are never touched — there's no "resize" for a document, and the /file download is still the
   real artifact — but its first page is rendered to a thumbnail the same way a photo's is, via
   mupdf (a WASM build: no native compile step and no system binary like poppler to install
   outside npm, unlike the other two common ways to rasterize a PDF in Node). */

const DISPLAY_MAX = 1600
const THUMBNAIL_MAX = 200
// A PDF has no separate "display" bytes the way an image does -- the /file download is always
// the original PDF, so its one raster (the "thumbnail" column) is the only preview that will
// ever exist for it, at any size. Rendered at DISPLAY_MAX rather than THUMBNAIL_MAX so the
// expanded attachment preview -- a wide panel, not a row icon -- has more than 200px stretched
// across it to show.
const PDF_RENDER_LONG_EDGE = DISPLAY_MAX

/** Resizes to fit within max x max (never upscales), auto-orients from EXIF (a sideways phone
    photo would otherwise stay sideways), and re-encodes as JPEG — which also strips EXIF, so a
    photo's embedded GPS coordinates don't travel into the database as a side effect of nobody
    asking for them to. Returns null (falls back to storing the original) if the buffer isn't a
    decodable image at all, rather than failing the whole upload over it. */
async function resizeTo(buffer, max) {
	return sharp(buffer)
		.rotate()
		.resize(max, max, { fit: 'inside', withoutEnlargement: true })
		.jpeg({ quality: max === THUMBNAIL_MAX ? 70 : 85 })
		.toBuffer()
}

/** { data, contentType, size, thumbnail, thumbnailContentType } for a stored image attachment.
    Both sizes come from the same source buffer, not one derived from the other, so the display
    image never limits the thumbnail's crop or vice versa. */
export async function processImage(buffer) {
	try {
		const [display, thumbnail] = await Promise.all([resizeTo(buffer, DISPLAY_MAX), resizeTo(buffer, THUMBNAIL_MAX)])
		return { data: display, contentType: 'image/jpeg', size: display.length, thumbnail, thumbnailContentType: 'image/jpeg' }
	} catch {
		// Not a decodable image (a mislabeled file, a format sharp doesn't read) — keep the
		// original bytes rather than losing the upload over a thumbnail that couldn't be made.
		return { data: buffer, contentType: null, size: buffer.length, thumbnail: null, thumbnailContentType: null }
	}
}

/** A DISPLAY_MAX-sized raster of a PDF's first page, or null if it couldn't be rendered
    (encrypted, corrupt, zero pages) — the caller falls back to the plain document icon exactly
    the way it already does for an image sharp couldn't decode. The PDF's own bytes are never
    touched; only a raster of page one is generated, resized down through the same JPEG pipeline
    a photo's own copies go through (see the PDF_RENDER_LONG_EDGE note above for why this reuses
    the display size, not the thumbnail size, despite the column it's still stored in). mupdf's
    WASM objects hold native heap outside JS's GC, so each is explicitly destroyed rather than
    left for the finalizer to get to eventually. */
const PDF_WORKER = fileURLToPath(new URL('./pdfPage.worker.js', import.meta.url))
/* A rendering that has not finished by now is not going to be waited for. The worst measured
   parse is 411ms on a 25MB file -- the largest multer accepts -- so this is two orders of
   magnitude of headroom, and its job is to bound a pathological file rather than to trim a
   slow one. On expiry the worker is terminated and the upload keeps its document icon. */
const PDF_RENDER_TIMEOUT_MS = 15_000

/** The first page of a PDF, rendered to a PNG on a worker thread. Resolves null for anything
    that cannot be rendered (encrypted, corrupt, zero pages, not a PDF) and for a render that
    outruns the timeout -- every one of which the caller already handles by falling back to the
    plain document icon. */
function renderPdfFirstPage(buffer) {
	return new Promise(resolve => {
		let settled = false
		const finish = value => { if (!settled) { settled = true; clearTimeout(timer); worker.terminate(); resolve(value) } }
		const worker = new Worker(PDF_WORKER, {
			workerData: { buffer, longEdge: PDF_RENDER_LONG_EDGE }
		})
		const timer = setTimeout(() => finish(null), PDF_RENDER_TIMEOUT_MS)
		worker.on('message', message => finish(message.png ? Buffer.from(message.png) : null))
		worker.on('error', () => finish(null))
		worker.on('exit', () => finish(null))
	})
}

/** A DISPLAY_MAX-sized raster of a PDF's first page, or null if it couldn't be rendered
    (encrypted, corrupt, zero pages) — the caller falls back to the plain document icon exactly
    the way it already does for an image sharp couldn't decode. The PDF's own bytes are never
    touched; only a raster of page one is generated, resized down through the same JPEG pipeline
    a photo's own copies go through (see the PDF_RENDER_LONG_EDGE note above for why this reuses
    the display size, not the thumbnail size, despite the column it's still stored in).

    The rendering itself happens on a worker thread (pdfPage.worker.js) because mupdf is
    synchronous WASM and blocked this process for the whole parse; the resize below stays here,
    since sharp is asynchronous already. */
export async function processPdfThumbnail(buffer) {
	// Not a PDF by its own first bytes: mupdf would spend the whole parse discovering that, and
	// on a 25MB file that is 411ms of a blocked thread to answer a question four bytes settle.
	if (detectFileType(buffer)?.type !== 'application/pdf') return null
	const png = await renderPdfFirstPage(buffer)
	if (!png) return null
	try {
		return { thumbnail: await resizeTo(png, DISPLAY_MAX), thumbnailContentType: 'image/jpeg' }
	} catch {
		return null
	}
}

/** { data, dataCompressed, contentType, size, thumbnail, thumbnailCompressed, thumbnailContentType }
    for any uploaded attachment — the one place this branches by kind (image → resized copies;
    pdf → original bytes plus a rendered-page thumbnail where that succeeds), used by every
    upload path (a direct attachment, a scan, a bulk import) so the three can't drift into
    different rules for what "processed" for a given kind actually means. Also the one place the
    stored bytes are deflated -- every write path funnels through here, so the read side
    (orders.js/scan.js) only has to know how to reverse it, not which upload produced a given
    row. `size` stays the uncompressed byte count: it's what the UI shows as the file's size, and
    that should describe the upload, not how this happened to store it. */
export async function processAttachment(buffer, mimetype, name) {
	/* The kind is read off the bytes here rather than taken from the caller, and returned, so
	   the three upload paths (an attachment, a scan, an import) cannot each arrive at a
	   different answer for one file -- which they did, from the filename and the mimetype, both
	   of which the caller writes. lib/fileType.js has the signatures and what it cost.

	   `detected` also gives the stored content type its value: for a PDF that used to be
	   whatever was claimed, and it is served straight back as a Content-Type header. */
	const detected = detectFileType(buffer)
	const kind = detectKind(buffer, mimetype, name)
	const processed = kind === 'image' ? await processImage(buffer) : await (async () => {
		const pdfThumb = await processPdfThumbnail(buffer)
		return {
			data: buffer, contentType: detected?.type ?? mimetype ?? null, size: buffer.length,
			thumbnail: pdfThumb?.thumbnail ?? null, thumbnailContentType: pdfThumb?.thumbnailContentType ?? null
		}
	})()
	/* Each blob compressed against its own content type, so the pipeline's own JPEGs are
	   recognised as already-compressed and skipped rather than deflated for a loss. Both at
	   once: they are independent, and the threadpool can take them together. */
	const [data, thumbnail] = await Promise.all([
		compressBlob(processed.data, processed.contentType),
		compressBlob(processed.thumbnail, processed.thumbnailContentType)
	])
	return {
		...processed,
		kind,
		data: data.blob, dataCompressed: data.compressed,
		thumbnail: thumbnail.blob, thumbnailCompressed: thumbnail.compressed
	}
}
