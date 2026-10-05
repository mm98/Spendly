import { deflate, inflateSync } from 'node:zlib'
import { promisify } from 'node:util'

const deflateAsync = promisify(deflate)

/* Formats whose bytes are already compressed. Deflating one of these is not a small win, it is
   a measured loss: the display copy of a photograph is 878 KB of JPEG that deflates to 0.02%
   *larger* after 19.9ms of work, and the thumbnail beside it is a kilobyte. Every image this
   pipeline stores is one of them, because processImage re-encodes everything it can decode as
   JPEG -- so the common upload spent its entire compression budget proving that a JPEG is a
   JPEG. A PDF is deliberately not on this list: most are internally deflated already and fall
   out at the margin below, but one written with uncompressed streams still shrinks a lot, and
   that is a real win to keep. */
const ALREADY_COMPRESSED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])

/* How much smaller the deflated copy has to be before it is worth storing. Gated at 10% rather
   than any saving at all: below that, the inflate cost paid on every future serve outweighs the
   storage saved once. A tenth is the point where the saving outlives the cost of unpacking it. */
const MIN_SAVING = 0.1

/** Deflates a buffer for storage as a raw zlib (RFC 1950) stream, when that is actually worth
    doing -- see the two constants above for what "worth" means and what it cost to learn.

    Asynchronous, and that is the point rather than a detail: deflateSync on a 25MB upload
    blocked this process for 589ms, during which every other request on the server -- every
    page load, every list, every unrelated account -- waited, to save -0.03% on bytes that were
    already compressed. The same work through the threadpool leaves the loop free.

    Returns { blob, compressed } rather than just the bytes: `compressed` is meant to be stored
    alongside `blob` in its own column (attachments/scan_uploads' *_compressed columns) and read
    back to decompressBlob, never re-derived by inspecting the bytes. A stored PDF is the
    document exactly as received, so no header signature can be trusted to mean "this blob is a
    zlib stream" without an occasional false match on real content that happens to start the
    same way. */
export async function compressBlob(buffer, contentType) {
	if (!buffer || !buffer.length) return { blob: buffer, compressed: false }
	if (ALREADY_COMPRESSED.has(contentType)) return { blob: buffer, compressed: false }
	const deflated = await deflateAsync(buffer, { level: 9 })
	return deflated.length <= buffer.length * (1 - MIN_SAVING)
		? { blob: deflated, compressed: true }
		: { blob: buffer, compressed: false }
}

/** The inverse of compressBlob, keyed off the flag it returned (stored, e.g., as a row's
    data_is_compressed/thumbnail_is_compressed column) -- never off the bytes themselves. `compressed`
    falsy is a plain pass-through, so this is safe to call over every row uniformly, compressed
    or not.

    Still synchronous, and still correct to be: the routes that serve bytes are synchronous
    handlers, and after the two rules above almost nothing reaching them is compressed at all --
    what is, is a payload that shrank by at least a tenth, which is the case where unpacking is
    cheap relative to what was saved. Rows written before those rules existed decompress exactly
    as they always did; the flag is per row, so no stored blob needs rewriting. */
export function decompressBlob(buffer, compressed) {
	if (!buffer || !compressed) return buffer
	return inflateSync(buffer)
}
