// One-off backfill: deflates attachments.data/thumbnail and scan_uploads.data/thumbnail for rows
// written before lib/blobCompression.js existed. New writes compress themselves on the way in
// (lib/images.js) -- this is only for what's already on disk.
//
// Driven entirely off the *_compressed columns (migrations/005), never off the blob's own
// bytes: a row with data_compressed = 0 is guaranteed-original, so it's compressed and, only if
// that actually shrank it, written back with the flag set to 1. A row already flagged 1 is left
// alone untouched. That makes re-running this safe on its own terms -- nothing here revisits a
// row it (or the live path) already finished with -- though a blob that didn't compress the
// first time stays flagged 0 and is re-attempted on the next run; harmless, since the outcome
// (kept as-is) is the same every time, just a repeated no-op deflate call on an already-small
// table of rows.
import { db } from '../src/db.js'
import { compressBlob } from '../src/lib/blobCompression.js'

function backfillTable(table) {
	const rows = db.prepare(
		`SELECT id, data, data_compressed, thumbnail, thumbnail_compressed FROM ${table}
		 WHERE (data IS NOT NULL AND data_compressed = 0) OR (thumbnail IS NOT NULL AND thumbnail_compressed = 0)`
	).all()
	const update = db.prepare(`UPDATE ${table} SET data = ?, data_compressed = ?, thumbnail = ?, thumbnail_compressed = ? WHERE id = ?`)

	let changed = 0, beforeBytes = 0, afterBytes = 0
	const run = db.transaction(() => {
		for (const row of rows) {
			const data = row.data_compressed ? { blob: row.data, compressed: true } : compressBlob(row.data)
			const thumbnail = row.thumbnail_compressed ? { blob: row.thumbnail, compressed: true } : compressBlob(row.thumbnail)
			beforeBytes += (row.data?.length ?? 0) + (row.thumbnail?.length ?? 0)
			afterBytes += (data.blob?.length ?? 0) + (thumbnail.blob?.length ?? 0)
			if (data.compressed === Boolean(row.data_compressed) && thumbnail.compressed === Boolean(row.thumbnail_compressed)) continue
			update.run(data.blob, data.compressed ? 1 : 0, thumbnail.blob, thumbnail.compressed ? 1 : 0, row.id)
			changed++
		}
	})
	run()

	console.log(`${table}: ${rows.length} candidate rows, ${changed} recompressed, ${beforeBytes} -> ${afterBytes} bytes` +
		(beforeBytes ? ` (${(100 * (1 - afterBytes / beforeBytes)).toFixed(1)}% smaller)` : ''))
}

backfillTable('attachments')
backfillTable('scan_uploads')
