import { db } from '../db.js'
import { decompressBlob } from './blobCompression.js'
import { processPdfPage } from './images.js'

/* A PDF's pages for the viewer's page rail (12b): each page is drawn when it is opened and not kept,
   since a file is looked at a few times at most. A count missing from an older file is taken on first ask. */
export const MAX_DRAWN_PAGES = 40   // pages past this are not drawn; the count still says how many

const stores = {
	attachment: {
		file: db.prepare('SELECT kind, data, data_is_compressed, pages FROM order_attachments WHERE id = ?'),
		setPages: db.prepare('UPDATE order_attachments SET pages = ? WHERE id = ?')
	},
	upload: {
		file: db.prepare('SELECT kind, data, data_is_compressed, pages FROM uploads WHERE id = ?'),
		setPages: db.prepare('UPDATE uploads SET pages = ? WHERE id = ?')
	}
}

/** How many pages the stored file has: 1 for an image, the PDF's own count, 0 when unreadable. */
export async function pageCount(kind, id) {
	const store = stores[kind]
	const row = store.file.get(id)
	if (!row) return null
	if (row.kind !== 'pdf') return 1
	if (row.pages != null) return row.pages
	const { pages } = await processPdfPage(decompressBlob(row.data, row.data_is_compressed), 0)
	store.setPages.run(pages ?? 0, id)
	return pages ?? 0
}

/** One page (from 0) as `{ image, contentType }`; null when there is none. */
export async function pageImage(kind, id, index) {
	const store = stores[kind]
	if (!Number.isInteger(index) || index < 0 || index >= MAX_DRAWN_PAGES) return null
	const row = store.file.get(id)
	if (!row || row.kind !== 'pdf') return null
	const { image, contentType, pages } = await processPdfPage(decompressBlob(row.data, row.data_is_compressed), index)
	if (row.pages == null && pages != null) store.setPages.run(pages, id)
	return image ? { image, contentType } : null
}
