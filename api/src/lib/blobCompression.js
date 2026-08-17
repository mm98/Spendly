import { deflateSync, inflateSync } from 'node:zlib'

/** Deflates a buffer for storage as a raw zlib (RFC 1950) stream, only when that's actually
    smaller -- an already-compressed format (a JPEG display/thumbnail copy, most PDFs) gains
    nothing from a second pass, and the header can lose a few bytes on anything tiny, so the
    original bytes go out unchanged rather than paying that for nothing.

    Returns { blob, compressed } rather than just the bytes: `compressed` is meant to be stored
    alongside `blob` in its own column (attachments/scan_uploads' *_compressed columns) and read
    back to decompressBlob, never re-derived by inspecting the bytes. An attachment's content
    can be anything a browser uploads -- including a file sharp couldn't decode as an image,
    stored exactly as received -- so no header signature can be trusted to mean "this blob is a
    zlib stream" without an occasional false match on real content that happens to start the
    same way. */
export function compressBlob(buffer) {
	if (!buffer || !buffer.length) return { blob: buffer, compressed: false }
	const deflated = deflateSync(buffer, { level: 9 })
	return deflated.length < buffer.length ? { blob: deflated, compressed: true } : { blob: buffer, compressed: false }
}

/** The inverse of compressBlob, keyed off the flag it returned (stored, e.g., as a row's
    data_is_compressed/thumbnail_is_compressed column) -- never off the bytes themselves. `compressed`
    falsy is a plain pass-through, so this is safe to call over every row uniformly, compressed
    or not. */
export function decompressBlob(buffer, compressed) {
	if (!buffer || !compressed) return buffer
	return inflateSync(buffer)
}
