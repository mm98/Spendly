import { deflateSync, inflateSync } from 'node:zlib'

/** Deflates a buffer for storage as a raw zlib (RFC 1950) stream rather than gzip -- gzip's
    header carries an mtime, so re-deflating byte-identical content produces byte-different
    output every time, which the backfill script (scripts/compress-existing-blobs.mjs) depends
    on NOT happening: it re-derives every row and only writes the ones that actually changed.
    zlib's own header has no clock in it, so the same input always deflates to the same bytes.
    Only kept when it's actually smaller -- an already-compressed format (a JPEG display/
    thumbnail copy, most PDFs) gains nothing from a second pass, and the header can lose a few
    bytes on anything tiny, so the original goes in unchanged rather than paying that for
    nothing. decompressBlob tells the two apart from the stream's own header, so no extra column
    is needed to remember which one a row holds. */
export function compressBlob(buffer) {
	if (!buffer || !buffer.length) return buffer
	const deflated = deflateSync(buffer, { level: 9 })
	return deflated.length < buffer.length ? deflated : buffer
}

/** The inverse of compressBlob, and safe to run over a blob that was never compressed. A zlib
    stream is recognised the standard way: the low nibble of byte 0 names the compression method
    (8 = deflate) and the first two bytes, read big-endian, are always a multiple of 31 -- the
    format's own check bits. JPEG (0xFFD8...), PDF ("%PDF"...) and PNG (0x8950...) headers all
    fail the method check, so this doesn't misfire on anything this app actually stores -- and
    that also covers every row written before this existed: nothing here rewrites existing data,
    so a blob already on disk keeps reading exactly as it did before. */
export function decompressBlob(buffer) {
	if (!buffer || buffer.length < 2) return buffer
	const cmf = buffer[0], flg = buffer[1]
	if ((cmf & 0x0f) !== 8 || (cmf * 256 + flg) % 31 !== 0) return buffer
	return inflateSync(buffer)
}
