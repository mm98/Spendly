import sharp from 'sharp'
import * as mupdf from 'mupdf'

// A malformed upload (wrong extension, truncated file) is an expected failure here, not an
// exceptional one — mupdf's own "repairing PDF document" chatter would otherwise spam the
// server's stdout on every one, ahead of processPdfThumbnail below returning null for it.
mupdf.setLog(() => {})

/* Every image attachment (a manual upload or a scan) is resized on the way in, not stored at
   whatever resolution the source produced — a phone photo is routinely 4000x3000 and several
   megabytes; nothing here ever needs more than a receipt's worth of detail. A PDF's own bytes
   are never touched — there's no "resize" for a document, and the /file download is still the
   real artifact — but its first page is rendered to a thumbnail the same way a photo's is, via
   mupdf (a WASM build: no native compile step and no system binary like poppler to install
   outside npm, unlike the other two common ways to rasterize a PDF in Node). */

const DISPLAY_MAX = 1600
const THUMBNAIL_MAX = 200
const PDF_RENDER_LONG_EDGE = 480   // rendered once, then downscaled by sharp same as a photo would be

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

/** A thumbnail for a PDF's first page, or null if it couldn't be rendered (encrypted, corrupt,
    zero pages) — the caller falls back to the plain document icon exactly the way it already
    does for an image sharp couldn't decode. The PDF's own bytes are never touched; only a
    raster of page one is generated, resized down through the same JPEG pipeline as a photo's
    thumbnail. mupdf's WASM objects hold native heap outside JS's GC, so each is explicitly
    destroyed rather than left for the finalizer to get to eventually. */
export async function processPdfThumbnail(buffer) {
	let doc, page, pixmap
	try {
		doc = mupdf.Document.openDocument(buffer, 'application/pdf')
		if (doc.needsPassword() || doc.countPages() < 1) return null
		page = doc.loadPage(0)
		const [x0, y0, x1, y1] = page.getBounds()
		const scale = PDF_RENDER_LONG_EDGE / Math.max(x1 - x0, y1 - y0, 1)
		pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, false)
		const png = Buffer.from(pixmap.asPNG())
		const thumbnail = await resizeTo(png, THUMBNAIL_MAX)
		return { thumbnail, thumbnailContentType: 'image/jpeg' }
	} catch {
		return null
	} finally {
		pixmap?.destroy(); page?.destroy(); doc?.destroy()
	}
}

/** { data, contentType, size, thumbnail, thumbnailContentType } for any uploaded attachment —
    the one place this branches by kind (image → resized copies; pdf → original bytes plus a
    rendered-page thumbnail where that succeeds), used by every upload path (a direct attachment,
    a scan, a bulk import) so the three can't drift into different rules for what "processed"
    for a given kind actually means. */
export async function processAttachment(kind, buffer, mimetype) {
	if (kind === 'image') return processImage(buffer)
	const pdfThumb = kind === 'pdf' ? await processPdfThumbnail(buffer) : null
	return {
		data: buffer, contentType: mimetype ?? null, size: buffer.length,
		thumbnail: pdfThumb?.thumbnail ?? null, thumbnailContentType: pdfThumb?.thumbnailContentType ?? null
	}
}
