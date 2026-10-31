import { db } from '../db.js'
import { newId } from './ids.js'
import { processImage } from './images.js'
import { createHash } from 'node:crypto'
import { sep, fileSizeLabel } from './copy.js'
import { photoFinderOf, productKey } from './photoFinders/index.js'
import { forgetReads } from './readCache.js'

/* Find photos (Order editing layouts 1a): one line at a time for the whole server, held in memory,
   so a restart ends a search and the lines it had not reached stay empty. */

const DONE_STILL_REPORTED_MS = 5 * 60_000

const selectOrder = db.prepare(`SELECT o.id, v.photo_finder FROM orders o LEFT JOIN vendors v ON v.id = o.vendor_id
	WHERE o.id = ? AND o.user_id = ?`)
const selectLinesWithoutPhoto = db.prepare(`SELECT oi.id, oi.title FROM order_items oi
	WHERE oi.order_id = ? AND NOT EXISTS (SELECT 1 FROM order_attachments a WHERE a.order_item_id = oi.id)
	ORDER BY oi.position`)
const selectLineStillEmpty = db.prepare(`SELECT oi.title FROM order_items oi JOIN orders o ON o.id = oi.order_id
	WHERE oi.id = ? AND o.user_id = ? AND NOT EXISTS (SELECT 1 FROM order_attachments a WHERE a.order_item_id = oi.id)`)
const selectFound = db.prepare('SELECT image, wide, square FROM found_photos WHERE finder = ? AND product_key = ?')
const insertFound = db.prepare(`INSERT OR REPLACE INTO found_photos (finder, product_key, image, content_type, source_url, found_at)
	VALUES (?, ?, ?, ?, ?, ?)`)
const updateFoundCopies = db.prepare('UPDATE found_photos SET wide = ?, square = ? WHERE finder = ? AND product_key = ?')
const insertLinePhoto = db.prepare(`INSERT INTO order_attachments
	(id, order_id, order_item_id, name, kind, meta, content_type, size, data, data_is_compressed, thumbnail, thumbnail_is_compressed, thumbnail_content_type, sha256, pages)
	VALUES (@id, NULL, @orderItemId, @name, 'image', @meta, @contentType, @size, @data, @dataCompressed, @thumbnail, @thumbnailCompressed, @thumbnailContentType, @sha256, NULL)`)

/** Every search a reader has, running or lately finished, by `${userId} ${orderId}`. */
const searches = new Map()
/** The lines waiting their turn, across every reader: `{ search, itemId }`. */
const queue = []
let working = false

const keyOf = (userId, orderId) => `${userId} ${orderId}`

/** `{ waiting: [itemId] }` for an order's lines with no photo, empty when its vendor has no finder;
    a search already running for the order is answered as it stands, never started twice. */
export function startFindingPhotos(userId, orderId) {
	const order = selectOrder.get(orderId, userId)
	if (!order) return null
	const running = searches.get(keyOf(userId, orderId))
	if (running && !running.done) return { waiting: [...running.waiting] }
	const finder = photoFinderOf(order.photo_finder)
	const lines = finder ? selectLinesWithoutPhoto.all(orderId) : []
	if (!lines.length) return { waiting: [] }
	const search = { userId, orderId, finder, waiting: new Set(lines.map(l => l.id)), of: lines.length, found: 0, done: false, doneAt: 0 }
	searches.set(keyOf(userId, orderId), search)
	for (const line of lines) queue.push({ search, itemId: line.id })
	work()
	return { waiting: [...search.waiting] }
}

/** The reader's searches: `[{ orderId, waiting: [itemId], found, of, done }]`. */
export function findingFor(userId) {
	const now = Date.now()
	const answer = []
	for (const [key, s] of searches) {
		if (s.done && now - s.doneAt > DONE_STILL_REPORTED_MS) { searches.delete(key); continue }
		if (s.userId === userId) answer.push({ orderId: s.orderId, waiting: [...s.waiting], found: s.found, of: s.of, done: s.done })
	}
	return answer
}

async function work() {
	if (working) return
	working = true
	try {
		while (queue.length) {
			const { search, itemId } = queue.shift()
			try {
				if (await fillLine(search, itemId)) search.found++
			} catch (error) {
				console.error('Find photos: a line failed', error?.message ?? error)
			}
			search.waiting.delete(itemId)
			if (!search.waiting.size) { search.done = true; search.doneAt = Date.now() }
		}
	} finally {
		working = false
	}
}

/** Puts a found photo on one line, unless the line was given one or removed meanwhile. */
async function fillLine(search, itemId) {
	const line = selectLineStillEmpty.get(itemId, search.userId)
	if (!line) return false
	const key = productKey(line.title)
	if (!key) return false
	let photo = selectFound.get(search.finder.key, key)
	if (!photo) {
		const found = await search.finder.find(line.title)
		if (!found) return false
		insertFound.run(search.finder.key, key, found.image, found.contentType, found.sourceUrl, Date.now())
		photo = { image: found.image, wide: null, square: null }
	}
	// the copies are made once per product: making them is the slow part of a line
	if (!photo.wide || !photo.square) {
		const made = await processImage(photo.image)
		if (!made) {
			console.error(`Find photos: the photo for "${key}" could not be read`)
			return false
		}
		photo = { ...photo, wide: made.data, square: made.thumbnail }
		updateFoundCopies.run(photo.wide, photo.square, search.finder.key, key)
	}
	// the line is read again after the wait: a photo added by hand meanwhile wins
	if (!selectLineStillEmpty.get(itemId, search.userId)) return false
	insertLinePhoto.run({
		id: newId('a'), orderItemId: itemId, name: `${line.title}.webp`,
		meta: `Added today${sep}${fileSizeLabel(photo.wide.length)}`,
		contentType: 'image/webp', size: photo.wide.length,
		data: photo.wide, dataCompressed: 0,
		thumbnail: photo.square, thumbnailCompressed: 0,
		thumbnailContentType: 'image/webp',
		sha256: createHash('sha256').update(photo.image).digest('hex')
	})
	// written outside a request, so the reader's kept answers are dropped here
	forgetReads(search.userId)
	return true
}
