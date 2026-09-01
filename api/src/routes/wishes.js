import { Router } from 'express'
import multer from 'multer'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { fromEpoch, toEpoch } from '../lib/dates.js'
import { findOrCreateCategory } from '../lib/findOrCreate.js'
import { assertValidWishDraft, normaliseUrl } from '../lib/validate.js'
import { processAttachment } from '../lib/images.js'
import { detectFileType } from '../lib/fileType.js'
import { decompressBlob } from '../lib/blobCompression.js'
import { MAX_PAGE_SIZE } from '../lib/constants.js'
import { MATCHERS, asciiNeedle, escapeLike } from '../lib/textSearch.js'

export const router = Router()

// Same parser settings and the same reason as the order attachments route: one upload, read
// into memory, filenames decoded as UTF-8 rather than latin1.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 }, defParamCharset: 'utf8' })

const notFound = id => Object.assign(new Error('No wish ' + id), { status: 404 })

/* ---- statements ---- */

// The blob columns are never in a list or record read: a photo is fetched by its own two
// routes at the bottom of this file, and a row that carried its bytes would send the picture
// with every list of names.
const WISH_COLUMNS = 'id, name, url, price, archived, created_at, photo_id'
const selectOne = db.prepare(`SELECT ${WISH_COLUMNS} FROM wishes WHERE id = ? AND user_id = ?`)
const countAllWishes = db.prepare('SELECT COUNT(*) c FROM wishes WHERE user_id = ?')
const insert = db.prepare(`INSERT INTO wishes (id, user_id, name, url, price, archived)
	VALUES (@id, @userId, @name, @url, @price, @archived)`)
const update = db.prepare('UPDATE wishes SET name=@name, url=@url, price=@price, archived=@archived WHERE id=@id AND user_id=@userId')
const deleteOne = db.prepare('DELETE FROM wishes WHERE id = ? AND user_id = ?')
const deleteWishCategories = db.prepare('DELETE FROM wish_categories WHERE wish_id = ?')
const insertWishCategory = db.prepare('INSERT INTO wish_categories (wish_id, category_id) VALUES (?, ?)')
const selectCategoryNames = db.prepare(`SELECT c.name FROM categories c
	JOIN wish_categories wc ON wc.category_id = c.id WHERE wc.wish_id = ? ORDER BY c.name`)
const selectCategoryNamesFor = db.prepare(`SELECT wc.wish_id, c.name FROM categories c
	JOIN wish_categories wc ON wc.category_id = c.id
	WHERE wc.wish_id IN (SELECT value FROM json_each(?)) ORDER BY wc.wish_id, c.name`)
const updatePhoto = db.prepare(`UPDATE wishes SET photo_id=@photoId, photo_content_type=@contentType,
	photo_size=@size, photo_data=@data, photo_data_is_compressed=@dataCompressed,
	photo_thumbnail=@thumbnail, photo_thumbnail_is_compressed=@thumbnailCompressed,
	photo_thumbnail_content_type=@thumbnailContentType WHERE id=@id AND user_id=@userId`)
const selectPhoto = db.prepare(
	'SELECT photo_content_type, photo_data, photo_data_is_compressed FROM wishes WHERE id = ? AND user_id = ? AND photo_id = ?')
const selectPhotoThumbnail = db.prepare(
	'SELECT photo_thumbnail, photo_thumbnail_is_compressed, photo_thumbnail_content_type FROM wishes WHERE id = ? AND user_id = ? AND photo_id = ?')

/* ---- the row shape ----
   What the wishlist actually renders: the name, the address, the price, when it was added,
   whether it is archived, the categories by name and the token that addresses its photo. The
   categories are names rather than records because the row prints names and the form edits
   names -- the same shape an order draft carries them in. */

const rowOf = (wish, categories) => ({
	id: wish.id,
	name: wish.name,
	url: wish.url,
	price: wish.price,
	archived: Boolean(wish.archived),
	createdAt: fromEpoch(wish.created_at),
	categories,
	photoId: wish.photo_id
})

const decorateOne = wish => rowOf(wish, selectCategoryNames.all(wish.id).map(c => c.name))

/** One batched child query for the page, rather than one per row -- the same shape
    decorateOrderListRows uses for an order list's categories. */
function decorateRows(wishes) {
	if (!wishes.length) return []
	const byWish = new Map()
	for (const row of selectCategoryNamesFor.all(JSON.stringify(wishes.map(w => w.id)))) {
		const list = byWish.get(row.wish_id)
		if (list) list.push(row.name); else byWish.set(row.wish_id, [row.name])
	}
	return wishes.map(wish => rowOf(wish, byWish.get(wish.id) ?? []))
}

/** The names a write asked for, resolved to category rows and linked. Names rather than ids,
    and looked up or created, so typing a category that does not exist yet works here exactly
    as it does on an order (lib/findOrCreate.js). Case-insensitive duplicates in one request
    resolve to the same id, so the link insert is deduped before it can violate the key. */
const linkCategories = (userId, wishId, names) => {
	deleteWishCategories.run(wishId)
	const ids = new Set()
	for (const name of names ?? []) {
		const clean = String(name ?? '').trim()
		if (clean) ids.add(findOrCreateCategory(userId, clean))
	}
	for (const id of ids) insertWishCategory.run(wishId, id)
}

/* A wish and its category links land together or not at all: a wish saved without the
   categories the reader picked is a record that disagrees with the form that made it. */
const insertWish = db.transaction((userId, wish, categories) => {
	insert.run(wish)
	linkCategories(userId, wish.id, categories)
})
const updateWish = db.transaction((userId, wish, categories) => {
	update.run(wish)
	if (categories !== undefined) linkCategories(userId, wish.id, categories)
})

/* ---- the list ----
   Searched, filtered, sorted and paged in SQL, the same shape the orders list is built in
   (routes/orders.js): the clauses are built once and reused between the COUNT that says how
   many matched and the SELECT that reads the page, so the two can never disagree about which
   rows qualify.

   No index on wishes, deliberately, and the plan check carries that decision blessed: every
   read here scans the account's wishes and sorts them in a temp B-tree, which is the right
   plan for a table that is tens of rows -- a wishlist is what one person still wants, and it
   does not grow the way a ledger does. Measured on this schema, the list read is 0.10ms at
   50 wishes, 0.43ms at 500, 4.6ms at 5,000 and 58ms at 50,000; an index is what the last of
   those would call for, and it would be paid for on every wish written from here on. */

const WISH_SORT_SQL = {
	'added-desc': 'w.created_at DESC, w.id DESC',
	'added-asc': 'w.created_at ASC, w.id ASC',
	'price-desc': 'w.price DESC, w.id DESC',
	'price-asc': 'w.price ASC, w.id ASC',
	'name-asc': 'w.name COLLATE NOCASE ASC, w.id ASC'
}

/** The clauses one request asks for. `filtered` reports whether anything beyond the account's
    own scope was added, so an unfiltered read can reuse the count it already has. */
function buildWishFilter(userId, q) {
	const sortKey = WISH_SORT_SQL[q.sort] ? q.sort : 'added-desc'
	const where = ['w.user_id = @userId']
	const params = { userId }

	/* Archived is a filter with three answers, and the one it takes when nobody asks is "not
	   the archived ones": a wishlist is what you still want, and a list that opened with the
	   things you had already put away would have to be narrowed before it could be read. */
	const archived = ['yes', 'all'].includes(q.archived) ? q.archived : 'no'
	if (archived === 'no') where.push('w.archived = 0')
	else if (archived === 'yes') where.push('w.archived = 1')

	/* The two sorts that also narrow, the same rule the orders list applies to its discount
	   sort: a wish with no price written down is not the cheapest wish, it is a wish the
	   question does not apply to. The predicate lives here so the count and the page agree
	   about it -- a row the page drops is a row the "N matching" line has already stopped
	   counting. */
	if (sortKey.startsWith('price-')) where.push('w.price IS NOT NULL')

	if (q.categoryId === 'none') {
		where.push('NOT EXISTS (SELECT 1 FROM wish_categories wc WHERE wc.wish_id = w.id)')
	} else if (q.categoryId) {
		where.push('w.id IN (SELECT wish_id FROM wish_categories WHERE category_id = @categoryId)')
		params.categoryId = q.categoryId
	}

	/* Finite or absent, never NaN -- the orders list's rule and its reason: better-sqlite3
	   binds NaN as NULL and `created_at >= NULL` matches nothing, so a date that does not
	   parse would silently empty the list instead of being ignored. */
	const from = toEpoch(q.from), to = toEpoch(q.to)
	if (Number.isFinite(from)) { where.push('w.created_at >= @from'); params.from = from }
	// The stored value is a moment, not a day, so an inclusive "to" has to reach the end of
	// that day -- otherwise a wish added this afternoon falls outside a range ending today.
	if (Number.isFinite(to)) { where.push('w.created_at < @to'); params.to = to + 86400 }

	/* What a wish can be found by: its own name, the shop it is from, and the categories it
	   carries. The address is searched as well as shown because the row prints the site under
	   the name, so "zalando" is a thing a reader can see and therefore a thing they will type.
	   Same two matchers as everywhere else -- an ASCII needle goes through LIKE, one carrying a
	   letter LIKE cannot case-fold goes through contains_fold (lib/textSearch.js). */
	const needle = String(q.query ?? '').trim().toLowerCase()
	if (needle) {
		const match = MATCHERS[asciiNeedle(needle) ? 'ascii' : 'fold']
		params.needle = asciiNeedle(needle) ? `%${escapeLike(needle)}%` : needle
		where.push(`(
			${match('w.name')}
			OR ${match('w.url')}
			OR w.id IN (SELECT wc.wish_id FROM wish_categories wc JOIN categories c ON c.id = wc.category_id
				WHERE c.user_id = @userId AND ${match('c.name')})
		)`)
	}

	return { whereSql: where.join(' AND '), params, sortKey, filtered: where.length > 1 }
}

router.get('/', (req, res) => {
	const q = req.query
	const { whereSql, params, sortKey, filtered } = buildWishFilter(req.user.id, q)

	// Every wish the account has, archived ones included: it is what "filtered from N" counts
	// against, and excluding the archived ones would make the default view look unfiltered.
	const total = countAllWishes.get(req.user.id).c
	const matched = filtered
		? db.prepare(`SELECT COUNT(*) c FROM wishes w WHERE ${whereSql}`).get(params).c
		: total

	/* LIMIT/OFFSET go straight into the statement, so a caller-chosen page size is made safe
	   here: SQLite reads a negative LIMIT as "no limit at all" rather than as an error. Same
	   clamp, same ceiling and same reason as the orders list. */
	const requestedSize = Number(q.pageSize) || Number(q.limit) || matched || 1
	const size = Math.min(MAX_PAGE_SIZE, Number.isFinite(requestedSize)
		? Math.max(1, Math.floor(requestedSize)) : Math.max(1, matched))
	const pages = Math.max(1, Math.ceil(matched / size))
	const at = Math.min(Math.max(1, Number(q.page) || 1), pages)

	const rows = db.prepare(`
		SELECT ${WISH_COLUMNS.split(', ').map(c => 'w.' + c).join(', ')} FROM wishes w
		WHERE ${whereSql}
		ORDER BY ${WISH_SORT_SQL[sortKey]}
		LIMIT @limit OFFSET @offset
	`).all({ ...params, limit: size, offset: (at - 1) * size })

	res.json({
		wishes: decorateRows(rows),
		matched, total, page: at, pages,
		from: matched ? (at - 1) * size + 1 : 0,
		to: Math.min(at * size, matched)
	})
})

/* ---- writes ---- */

const priceOf = value => (value == null || value === '' ? null : Number(value))

router.post('/', (req, res) => {
	const draft = req.body ?? {}
	assertValidWishDraft(draft)
	const wish = {
		id: newId('w'), userId: req.user.id,
		name: String(draft.name).trim(), url: normaliseUrl(draft.url),
		price: priceOf(draft.price), archived: draft.archived ? 1 : 0
	}
	insertWish(req.user.id, wish, draft.categories)
	res.status(201).json(decorateOne(selectOne.get(wish.id, req.user.id)))
})

router.patch('/:id', (req, res) => {
	const wish = selectOne.get(req.params.id, req.user.id)
	if (!wish) throw notFound(req.params.id)
	const patch = req.body ?? {}
	/* Archiving is a PATCH like any other field, so the one place a wish is written is this
	   one. An archive press sends nothing but `archived`, and every other column keeps the
	   value the record already has -- which is why each line below reads the patch for
	   "was this field mentioned" rather than for "is it truthy". */
	const draft = {
		name: patch.name !== undefined ? patch.name : wish.name,
		url: patch.url !== undefined ? patch.url : wish.url,
		price: patch.price !== undefined ? patch.price : wish.price,
		categories: patch.categories
	}
	assertValidWishDraft(draft)
	updateWish(req.user.id, {
		id: wish.id, userId: req.user.id,
		name: String(draft.name).trim(), url: normaliseUrl(draft.url), price: priceOf(draft.price),
		archived: patch.archived !== undefined ? (patch.archived ? 1 : 0) : wish.archived
	}, patch.categories)
	res.json(decorateOne(selectOne.get(wish.id, req.user.id)))
})

router.delete('/:id', (req, res) => {
	const result = deleteOne.run(req.params.id, req.user.id)
	if (!result.changes) throw notFound(req.params.id)
	res.json({ id: req.params.id })
})

/* ---- the photo ----
   One picture per wish, on the wish's own row. `photo_id` is regenerated on every upload and
   is part of the URL the browser fetches, so the two routes at the bottom can be cached
   forever without a replaced photo staying stale in a cache that was told never to ask again. */

router.post('/:id/photo', upload.single('file'), async (req, res) => {
	const wish = selectOne.get(req.params.id, req.user.id)
	if (!wish) throw notFound(req.params.id)
	if (!req.file) return res.status(400).json({ error: 'No picture was sent.' })
	/* The bytes have to *be* a picture, which is a stricter question than the one the
	   attachment pipeline asks: an order attachment files anything it cannot recognise under
	   'image' and keeps the original bytes, because there the frame is a tile with a filename
	   under it. Here the frame draws the image itself, so a file no format signature claims
	   would be stored and then fail to render with nothing said about why (lib/fileType.js). */
	if (detectFileType(req.file.buffer)?.kind !== 'image')
		return res.status(400).json({ error: 'That file is not a picture. JPEG, PNG, WebP, GIF, HEIC, TIFF and BMP all work.' })
	const processed = await processAttachment(req.file.buffer, req.file.mimetype, req.file.originalname)
	updatePhoto.run({
		id: wish.id, userId: req.user.id, photoId: newId('p'),
		contentType: processed.contentType ?? req.file.mimetype, size: processed.size,
		data: processed.data, dataCompressed: processed.dataCompressed ? 1 : 0,
		thumbnail: processed.thumbnail, thumbnailCompressed: processed.thumbnailCompressed ? 1 : 0,
		thumbnailContentType: processed.thumbnailContentType
	})
	res.status(201).json(decorateOne(selectOne.get(wish.id, req.user.id)))
})

router.delete('/:id/photo', (req, res) => {
	const wish = selectOne.get(req.params.id, req.user.id)
	if (!wish) throw notFound(req.params.id)
	updatePhoto.run({
		id: wish.id, userId: req.user.id, photoId: null, contentType: null, size: null,
		data: null, dataCompressed: 0, thumbnail: null, thumbnailCompressed: 0, thumbnailContentType: null
	})
	res.json(decorateOne(selectOne.get(wish.id, req.user.id)))
})

router.get('/:id/photo/:photoId/file', (req, res) => {
	const photo = selectPhoto.get(req.params.id, req.user.id, req.params.photoId)
	if (!photo?.photo_data) return res.status(404).json({ error: 'No picture stored for that wish.' })
	res.set('Content-Type', photo.photo_content_type || 'application/octet-stream')
	res.set('Cache-Control', 'private, max-age=31536000, immutable')   // the id in the path changes when the picture does
	res.send(decompressBlob(photo.photo_data, photo.photo_data_is_compressed))
})

router.get('/:id/photo/:photoId/thumbnail', (req, res) => {
	const photo = selectPhotoThumbnail.get(req.params.id, req.user.id, req.params.photoId)
	if (!photo?.photo_thumbnail) return res.status(404).json({ error: 'No picture stored for that wish.' })
	res.set('Content-Type', photo.photo_thumbnail_content_type || 'image/webp')
	res.set('Cache-Control', 'private, max-age=31536000, immutable')
	res.send(decompressBlob(photo.photo_thumbnail, photo.photo_thumbnail_is_compressed))
})
