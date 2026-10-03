import { db } from '../db.js'
import { decompressBlob } from './blobCompression.js'
import { processPdfPage } from './images.js'

/* A PDF's pages for the viewer's page rail (12b): each page is rendered the first time it is
   opened, then kept. A count missing from an older file is taken on first ask. */
export const MAX_DRAWN_PAGES = 40   // pages past this are not drawn; the count still says how many

const stores = {
	attachment: {
		file: db.prepare('SELECT kind, data, data_is_compressed, pages FROM attachments WHERE id = ?'),
		setPages: db.prepare('UPDATE attachments SET pages = ? WHERE id = ?'),
		page: db.prepare('SELECT image, content_type FROM attachment_pages WHERE attachment_id = ? AND page = ?'),
		keep: db.prepare('INSERT OR REPLACE INTO attachment_pages (attachment_id, page, image, content_type) VALUES (?, ?, ?, ?)')
	},
	upload: {
		file: db.prepare('SELECT kind, data, data_is_compressed, pages FROM scan_uploads WHERE id = ?'),
		setPages: db.prepare('UPDATE scan_uploads SET pages = ? WHERE id = ?'),
		page: db.prepare('SELECT image, content_type FROM scan_upload_pages WHERE upload_id = ? AND page = ?'),
		keep: db.prepare('INSERT OR REPLACE INTO scan_upload_pages (upload_id, page, image, content_type) VALUES (?, ?, ?, ?)')
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

/** One page (from 0) as `{ image, contentType }`, rendered once and kept; null when there is none. */
export async function pageImage(kind, id, index) {
	const store = stores[kind]
	if (!Number.isInteger(index) || index < 0 || index >= MAX_DRAWN_PAGES) return null
	const kept = store.page.get(id, index)
	if (kept) return { image: kept.image, contentType: kept.content_type }
	const row = store.file.get(id)
	if (!row || row.kind !== 'pdf') return null
	const { image, contentType, pages } = await processPdfPage(decompressBlob(row.data, row.data_is_compressed), index)
	if (row.pages == null && pages != null) store.setPages.run(pages, id)
	if (!image) return null
	store.keep.run(id, index, image, contentType)
	return { image, contentType }
}
