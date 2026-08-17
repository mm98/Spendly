import { gzipSync, gunzipSync } from 'node:zlib'

const GZIP_MAGIC_0 = 0x1f
const GZIP_MAGIC_1 = 0x8b

/** Gzips a buffer for storage, but only when it actually comes out smaller -- an
    already-compressed format (a JPEG display/thumbnail copy, most PDFs) gains nothing from a
    second pass, and gzip's own header can lose a few bytes on anything tiny, so the original
    bytes go in unchanged rather than paying that cost for nothing. decompressBlob tells the two
    apart by gzip's own magic number, so no extra column is needed to remember which one a row
    holds. */
export function compressBlob(buffer) {
	if (!buffer || !buffer.length) return buffer
	const gzipped = gzipSync(buffer, { level: 9 })
	return gzipped.length < buffer.length ? gzipped : buffer
}

/** The inverse of compressBlob, and safe to run over a blob that was never compressed -- stored
    bytes that don't start with gzip's magic number are returned as-is. That also covers every
    row written before this existed: nothing here rewrites existing data, so blobs already on
    disk keep reading exactly as they did before. */
export function decompressBlob(buffer) {
	if (!buffer || buffer.length < 2 || buffer[0] !== GZIP_MAGIC_0 || buffer[1] !== GZIP_MAGIC_1) return buffer
	return gunzipSync(buffer)
}
