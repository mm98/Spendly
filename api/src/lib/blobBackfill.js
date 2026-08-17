import { compressBlob } from './blobCompression.js'

/** A blob already marked checked is left exactly as stored -- re-running compressBlob on it
    would only re-confirm the same answer, which is the redundant work this flag exists to skip.
    One not yet checked is evaluated now. Either way the result carries its own `checked: true`,
    since after this call it always has been, regardless of outcome. */
function resolve(buffer, alreadyChecked, currentlyCompressed) {
	if (alreadyChecked) return { blob: buffer, compressed: Boolean(currentlyCompressed), checked: true }
	return { ...compressBlob(buffer), checked: true }
}

/** Recompresses every row `select` returns and writes all of them back, via `update` (expected
    shape: UPDATE ... SET data = ?, data_is_compressed = ?, thumbnail = ?,
    thumbnail_is_compressed = ? WHERE id = ? -- the two *_checked columns are the caller's own
    static SQL, always 1, since every row this touches is fully evaluated by the time it's
    written). `select` must return id, data, data_is_compressed, data_checked, thumbnail,
    thumbnail_is_compressed, thumbnail_checked, filtered to rows with at least one *_checked = 0
    -- which rows those are (currently: one account's own, from POST /api/compress-blobs in
    routes/account.js) is entirely the caller's business. Kept apart from that route so the SQL
    that decides *which* rows qualify stays separate from the compression logic itself. */
export function runBlobBackfill(db, select, update, params) {
	const rows = select.all(params)
	let beforeBytes = 0, afterBytes = 0
	db.transaction(() => {
		for (const row of rows) {
			const data = resolve(row.data, row.data_checked, row.data_is_compressed)
			const thumbnail = resolve(row.thumbnail, row.thumbnail_checked, row.thumbnail_is_compressed)
			beforeBytes += (row.data?.length ?? 0) + (row.thumbnail?.length ?? 0)
			afterBytes += (data.blob?.length ?? 0) + (thumbnail.blob?.length ?? 0)
			update.run(data.blob, data.compressed ? 1 : 0, thumbnail.blob, thumbnail.compressed ? 1 : 0, row.id)
		}
	})()
	return { rows: rows.length, beforeBytes, afterBytes }
}
