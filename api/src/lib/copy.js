/* Strings the API writes into payloads and stored rows.

   `sep` is the copy separator (README: Language and Formats), the same character the client's
   react/src/api/format.js exports -- the two state the same character or one of them is
   wrong. Stored attachment metas bake it in at write time, so changing it here needs a
   migration for existing rows (see 006_meta_separator and 007_bullet_separator).

   `fileSizeLabel` sat as an identical local in both routes that build metas; one copy now. */
export const sep = ' • '

export const fileSizeLabel = bytes => {
	const kb = Math.max(1, Math.round((bytes ?? 0) / 1024))
	return kb > 1024 ? (kb / 1024).toFixed(1).replace('.', ',') + ' MB' : kb + ' KB'
}
