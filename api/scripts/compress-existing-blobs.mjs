// One-off backfill: deflates attachments.data/thumbnail and scan_uploads.data/thumbnail for rows
// written before lib/blobCompression.js existed. New writes compress themselves on the way in
// (lib/images.js) -- this is only for what's already on disk. Safe to run more than once: each
// blob is decompressed first (a no-op if it isn't compressed) and recompressed, and since
// blobCompression's zlib format deflates the same input to the same bytes every time (no
// embedded timestamp, unlike gzip), a row this has already touched -- or one written by the
// live path since -- comes back byte-identical, so it's read back and left alone rather than
// rewritten for nothing.
import { db } from '../src/db.js'
import { compressBlob, decompressBlob } from '../src/lib/blobCompression.js'

function reprocess(buffer) {
	if (!buffer || !buffer.length) return buffer
	return compressBlob(decompressBlob(buffer))
}

const unchanged = (a, b) => (a?.length ?? 0) === (b?.length ?? 0) && (!a || a.equals(b))

function backfillTable(table) {
	const rows = db.prepare(`SELECT id, data, thumbnail FROM ${table}`).all()
	const update = db.prepare(`UPDATE ${table} SET data = ?, thumbnail = ? WHERE id = ?`)

	let changed = 0, beforeBytes = 0, afterBytes = 0
	const run = db.transaction(() => {
		for (const row of rows) {
			const data = reprocess(row.data)
			const thumbnail = reprocess(row.thumbnail)
			beforeBytes += (row.data?.length ?? 0) + (row.thumbnail?.length ?? 0)
			afterBytes += (data?.length ?? 0) + (thumbnail?.length ?? 0)
			if (unchanged(data, row.data) && unchanged(thumbnail, row.thumbnail)) continue
			update.run(data, thumbnail, row.id)
			changed++
		}
	})
	run()

	console.log(`${table}: ${rows.length} rows, ${changed} recompressed, ${beforeBytes} -> ${afterBytes} bytes` +
		(beforeBytes ? ` (${(100 * (1 - afterBytes / beforeBytes)).toFixed(1)}% smaller)` : ''))
}

backfillTable('attachments')
backfillTable('scan_uploads')
