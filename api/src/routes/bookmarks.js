import { Router } from 'express'
import multer from 'multer'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { fromEpoch, toEpoch } from '../lib/dates.js'
import { findOrCreateCategory } from '../lib/findOrCreate.js'
import { assertValidBookmarkDraft, normaliseUrl } from '../lib/validate.js'
import { processAttachment, processImage } from '../lib/images.js'
import { detectFileType } from '../lib/fileType.js'
import { fetchImage, fetchPagePreview } from '../lib/pageTitle.js'
import { decompressBlob } from '../lib/blobCompression.js'
import { MAX_PAGE_SIZE } from '../lib/constants.js'
import { MATCHERS, asciiNeedle, escapeLike } from '../lib/textSearch.js'

export const router = Router()

// Same parser settings and the same reason as the order attachments route: one upload, read
// into memory, filenames decoded as UTF-8 rather than latin1.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 }, defParamCharset: 'utf8' })

const notFound = id => Object.assign(new Error('No bookmark ' + id), { status: 404 })

/* ---- statements ---- */

// No blob column: the picture has its own route at the foot of this file.
const BOOKMARK_COLUMNS = 'id, name, url, price, archived, created_at, photo_id'
const selectOne = db.prepare(`SELECT ${BOOKMARK_COLUMNS} FROM bookmarks WHERE id = ? AND user_id = ?`)
const countAllBookmarks = db.prepare('SELECT COUNT(*) c FROM bookmarks WHERE user_id = ?')
const insert = db.prepare(`INSERT INTO bookmarks (id, user_id, name, url, price, archived)
	VALUES (@id, @userId, @name, @url, @price, @archived)`)
const update = db.prepare('UPDATE bookmarks SET name=@name, url=@url, price=@price, archived=@archived WHERE id=@id AND user_id=@userId')
const deleteOne = db.prepare('DELETE FROM bookmarks WHERE id = ? AND user_id = ?')
const deleteBookmarkCategories = db.prepare('DELETE FROM bookmark_categories WHERE bookmark_id = ?')
const insertBookmarkCategory = db.prepare('INSERT INTO bookmark_categories (bookmark_id, category_id) VALUES (?, ?)')
const selectCategoryNames = db.prepare(`SELECT c.name FROM categories c
	JOIN bookmark_categories bc ON bc.category_id = c.id WHERE bc.bookmark_id = ? ORDER BY c.name`)
const selectCategoryNamesFor = db.prepare(`SELECT bc.bookmark_id, c.name FROM categories c
	JOIN bookmark_categories bc ON bc.category_id = c.id
	WHERE bc.bookmark_id IN (SELECT value FROM json_each(?)) ORDER BY bc.bookmark_id, c.name`)
const updatePhoto = db.prepare(`UPDATE bookmarks SET photo_id=@photoId,
	photo_thumbnail=@thumbnail, photo_thumbnail_is_compressed=@thumbnailCompressed,
	photo_thumbnail_content_type=@thumbnailContentType WHERE id=@id AND user_id=@userId`)
const selectPhotoThumbnail = db.prepare(
	'SELECT photo_thumbnail, photo_thumbnail_is_compressed, photo_thumbnail_content_type FROM bookmarks WHERE id = ? AND user_id = ? AND photo_id = ?')

/* Categories are names rather than records: the row prints names and the form edits them, the
   shape an order draft carries them in. */

const rowOf = (bookmark, categories) => ({
	id: bookmark.id,
	name: bookmark.name,
	url: bookmark.url,
	price: bookmark.price,
	archived: Boolean(bookmark.archived),
	createdAt: fromEpoch(bookmark.created_at),
	categories,
	photoId: bookmark.photo_id
})

const decorateOne = bookmark => rowOf(bookmark, selectCategoryNames.all(bookmark.id).map(c => c.name))

/** One batched child query for the page, rather than one per row -- the same shape
    decorateOrderListRows uses for an order list's categories. */
function decorateRows(bookmarks) {
	if (!bookmarks.length) return []
	const byBookmark = new Map()
	for (const row of selectCategoryNamesFor.all(JSON.stringify(bookmarks.map(b => b.id)))) {
		const list = byBookmark.get(row.bookmark_id)
		if (list) list.push(row.name); else byBookmark.set(row.bookmark_id, [row.name])
	}
	return bookmarks.map(bookmark => rowOf(bookmark, byBookmark.get(bookmark.id) ?? []))
}

/** Looked up or created, so a category typed here works as it does on an order. Deduped by
    id, since two spellings of one name resolve to the same row (lib/findOrCreate.js). */
const linkCategories = (userId, bookmarkId, names) => {
	deleteBookmarkCategories.run(bookmarkId)
	const ids = new Set()
	for (const name of names ?? []) {
		const clean = String(name ?? '').trim()
		if (clean) ids.add(findOrCreateCategory(userId, clean))
	}
	for (const id of ids) insertBookmarkCategory.run(bookmarkId, id)
}

/* A bookmark and its category links land together or not at all: a bookmark saved without the
   categories the reader picked is a record that disagrees with the form that made it. */
const insertBookmark = db.transaction((userId, bookmark, categories) => {
	insert.run(bookmark)
	linkCategories(userId, bookmark.id, categories)
})
const updateBookmark = db.transaction((userId, bookmark, categories) => {
	update.run(bookmark)
	if (categories !== undefined) linkCategories(userId, bookmark.id, categories)
})

/* One set of clauses for the COUNT and the page, so the two cannot disagree about which rows
   qualify. No index: the scan is the right plan at the size of one account's bookmarks (docs/defects.md). */

const BOOKMARK_SORT_SQL = {
	'added-desc': 'b.created_at DESC, b.id DESC',
	'added-asc': 'b.created_at ASC, b.id ASC',
	'price-desc': 'b.price DESC, b.id DESC',
	'price-asc': 'b.price ASC, b.id ASC',
	'name-asc': 'b.name COLLATE NOCASE ASC, b.id ASC'
}

/** The clauses one request asks for. `filtered` reports whether anything beyond the account's
    own scope was added, so an unfiltered read can reuse the count it already has. */
function buildBookmarkFilter(userId, q) {
	const sortKey = BOOKMARK_SORT_SQL[q.sort] ? q.sort : 'added-desc'
	const where = ['b.user_id = @userId']
	const params = { userId }

	// Two states, and unasked it takes "not archived": a bookmark you still want is not archived.
	where.push(q.archived === 'yes' ? 'b.archived = 1' : 'b.archived = 0')

	// A bookmark with no price is not the cheapest one. Here, not in the ORDER BY, so the count
	// and the page agree about which rows the sort dropped.
	if (sortKey.startsWith('price-')) where.push('b.price IS NOT NULL')

	if (q.categoryId === 'none') {
		where.push('NOT EXISTS (SELECT 1 FROM bookmark_categories bc WHERE bc.bookmark_id = b.id)')
	} else if (q.categoryId) {
		where.push('b.id IN (SELECT bookmark_id FROM bookmark_categories WHERE category_id = @categoryId)')
		params.categoryId = q.categoryId
	}

	// Finite or absent, never NaN: better-sqlite3 binds NaN as NULL and `created_at >= NULL`
	// matches nothing, so a date that will not parse would silently empty the list.
	const from = toEpoch(q.from), to = toEpoch(q.to)
	if (Number.isFinite(from)) { where.push('b.created_at >= @from'); params.from = from }
	// The stored value is a moment, not a day: an inclusive "to" reaches the end of that day.
	if (Number.isFinite(to)) { where.push('b.created_at < @to'); params.to = to + 86400 }

	/* Name, shop and category name -- the address is searched because the row prints it. Same
	   two matchers as everywhere else (lib/textSearch.js). */
	const needle = String(q.query ?? '').trim().toLowerCase()
	if (needle) {
		const match = MATCHERS[asciiNeedle(needle) ? 'ascii' : 'fold']
		params.needle = asciiNeedle(needle) ? `%${escapeLike(needle)}%` : needle
		where.push(`(
			${match('b.name')}
			OR ${match('b.url')}
			OR b.id IN (SELECT bc.bookmark_id FROM bookmark_categories bc JOIN categories c ON c.id = bc.category_id
				WHERE c.user_id = @userId AND ${match('c.name')})
		)`)
	}

	return { whereSql: where.join(' AND '), params, sortKey, filtered: where.length > 1 }
}

router.get('/', (req, res) => {
	const q = req.query
	const { whereSql, params, sortKey, filtered } = buildBookmarkFilter(req.user.id, q)

	// Every bookmark the account has, archived ones included: it is what "filtered from N" counts
	// against, and excluding the archived ones would make the default view look unfiltered.
	const total = countAllBookmarks.get(req.user.id).c
	const matched = filtered
		? db.prepare(`SELECT COUNT(*) c FROM bookmarks b WHERE ${whereSql}`).get(params).c
		: total

	// SQLite reads a negative LIMIT as "no limit at all", so a caller's page size is clamped
	// here. Same clamp and ceiling as the orders list.
	const requestedSize = Number(q.pageSize) || Number(q.limit) || matched || 1
	const size = Math.min(MAX_PAGE_SIZE, Number.isFinite(requestedSize)
		? Math.max(1, Math.floor(requestedSize)) : Math.max(1, matched))
	const pages = Math.max(1, Math.ceil(matched / size))
	const at = Math.min(Math.max(1, Number(q.page) || 1), pages)

	const rows = db.prepare(`
		SELECT ${BOOKMARK_COLUMNS.split(', ').map(c => 'b.' + c).join(', ')} FROM bookmarks b
		WHERE ${whereSql}
		ORDER BY ${BOOKMARK_SORT_SQL[sortKey]}
		LIMIT @limit OFFSET @offset
	`).all({ ...params, limit: size, offset: (at - 1) * size })

	res.json({
		bookmarks: decorateRows(rows),
		matched, total, page: at, pages,
		from: matched ? (at - 1) * size + 1 : 0,
		to: Math.min(at * size, matched)
	})
})

/** Always 200 and always `{ title, image, thumbnail }`, any of them null. The picture is
    fetched, not pointed at: a shop's CDN turns away a browser without its page as referer. */
async function previewThumbnail(imageUrl) {
	const fetched = await fetchImage(imageUrl)
	if (!fetched || detectFileType(fetched.buffer)?.kind !== 'image') return null
	const processed = await processImage(fetched.buffer)
	if (!processed.thumbnail) return null
	return `data:${processed.thumbnailContentType};base64,${processed.thumbnail.toString('base64')}`
}

router.get('/preview', async (req, res) => {
	const { title, image } = await fetchPagePreview(String(req.query.url ?? ''))
	const thumbnail = image ? await previewThumbnail(image) : null
	// No thumbnail, no picture on offer: the address alone is a promise this cannot keep.
	res.json({ title, image: thumbnail ? image : null, thumbnail })
})

/** One bookmark, for the page that edits it. Before the writes below; nothing else answers a
    bare id. */
router.get('/:id', (req, res) => {
	const bookmark = selectOne.get(req.params.id, req.user.id)
	if (!bookmark) throw notFound(req.params.id)
	res.json(decorateOne(bookmark))
})

/* ---- writes ---- */

const priceOf = value => (value == null || value === '' ? null : Number(value))

router.post('/', (req, res) => {
	const draft = req.body ?? {}
	assertValidBookmarkDraft(draft)
	const bookmark = {
		id: newId('bm'), userId: req.user.id,
		name: String(draft.name).trim(), url: normaliseUrl(draft.url),
		price: priceOf(draft.price), archived: draft.archived ? 1 : 0
	}
	insertBookmark(req.user.id, bookmark, draft.categories)
	res.status(201).json(decorateOne(selectOne.get(bookmark.id, req.user.id)))
})

router.patch('/:id', (req, res) => {
	const bookmark = selectOne.get(req.params.id, req.user.id)
	if (!bookmark) throw notFound(req.params.id)
	const patch = req.body ?? {}
	// Each line reads the patch for "was this mentioned", not "is it truthy": an archive press
	// sends nothing but `archived` and every other column keeps what it has.
	const draft = {
		name: patch.name !== undefined ? patch.name : bookmark.name,
		url: patch.url !== undefined ? patch.url : bookmark.url,
		price: patch.price !== undefined ? patch.price : bookmark.price,
		categories: patch.categories
	}
	assertValidBookmarkDraft(draft)
	updateBookmark(req.user.id, {
		id: bookmark.id, userId: req.user.id,
		name: String(draft.name).trim(), url: normaliseUrl(draft.url), price: priceOf(draft.price),
		archived: patch.archived !== undefined ? (patch.archived ? 1 : 0) : bookmark.archived
	}, patch.categories)
	res.json(decorateOne(selectOne.get(bookmark.id, req.user.id)))
})

router.delete('/:id', (req, res) => {
	const result = deleteOne.run(req.params.id, req.user.id)
	if (!result.changes) throw notFound(req.params.id)
	res.json({ id: req.params.id })
})

/* `photo_id` is regenerated on every upload and rides in the URL, so a thumbnail can be cached
   forever. An address that will not fetch is refused silently; a chosen file says so. */
router.post('/:id/photo', upload.single('file'), async (req, res) => {
	const bookmark = selectOne.get(req.params.id, req.user.id)
	if (!bookmark) throw notFound(req.params.id)

	if (!req.file && req.body?.url) {
		const fetched = await fetchImage(String(req.body.url))
		if (!fetched || detectFileType(fetched.buffer)?.kind !== 'image')
			return res.json(decorateOne(bookmark))
		const processed = await processAttachment(fetched.buffer, fetched.contentType, 'picture')
		updatePhoto.run({
			id: bookmark.id, userId: req.user.id, photoId: newId('p'),
			thumbnail: processed.thumbnail, thumbnailCompressed: processed.thumbnailCompressed ? 1 : 0,
			thumbnailContentType: processed.thumbnailContentType
		})
		return res.status(201).json(decorateOne(selectOne.get(bookmark.id, req.user.id)))
	}

	if (!req.file) return res.status(400).json({ error: 'No picture was sent.' })
	// Stricter than the attachment pipeline, which files anything unrecognised under 'image':
	// here the frame draws the picture, so an unclaimed file would store and then not render.
	if (detectFileType(req.file.buffer)?.kind !== 'image')
		return res.status(400).json({ error: 'That file is not a picture. JPEG, PNG, WebP, GIF, HEIC, TIFF and BMP all work.' })
	const processed = await processAttachment(req.file.buffer, req.file.mimetype, req.file.originalname)
	updatePhoto.run({
		id: bookmark.id, userId: req.user.id, photoId: newId('p'),
		thumbnail: processed.thumbnail, thumbnailCompressed: processed.thumbnailCompressed ? 1 : 0,
		thumbnailContentType: processed.thumbnailContentType
	})
	res.status(201).json(decorateOne(selectOne.get(bookmark.id, req.user.id)))
})

router.delete('/:id/photo', (req, res) => {
	const bookmark = selectOne.get(req.params.id, req.user.id)
	if (!bookmark) throw notFound(req.params.id)
	updatePhoto.run({
		id: bookmark.id, userId: req.user.id, photoId: null,
		thumbnail: null, thumbnailCompressed: 0, thumbnailContentType: null
	})
	res.json(decorateOne(selectOne.get(bookmark.id, req.user.id)))
})

router.get('/:id/photo/:photoId/thumbnail', (req, res) => {
	const photo = selectPhotoThumbnail.get(req.params.id, req.user.id, req.params.photoId)
	if (!photo?.photo_thumbnail) return res.status(404).json({ error: 'No picture stored for that bookmark.' })
	res.set('Content-Type', photo.photo_thumbnail_content_type || 'image/webp')
	res.set('Cache-Control', 'private, max-age=31536000, immutable')   // the id in the path changes when the picture does
	res.send(decompressBlob(photo.photo_thumbnail, photo.photo_thumbnail_is_compressed))
})
