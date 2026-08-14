import sharp from 'sharp'

/* Every image attachment (a manual upload or a scan) is resized on the way in, not stored at
   whatever resolution the source produced — a phone photo is routinely 4000x3000 and several
   megabytes; nothing here ever needs more than a receipt's worth of detail. PDFs are untouched:
   there's no "resize" for a document, and a rendered-page thumbnail is a separate feature this
   doesn't attempt. */

const DISPLAY_MAX = 1600
const THUMBNAIL_MAX = 200

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
