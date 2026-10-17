/* Per-user cache of GET answers, so a read the account just paid for is not recomputed for
   the identical request seconds later. GET /api/categories is a full all-time rollup over
   every order-category link the account has (lib/aggregate.js), cheap to skip and expensive
   to redo on every tab switch when nothing that feeds it can change without a write coming
   through this same process.

   That is the invariant the cache leans on: SQLite, one process, every write an HTTP write
   through this app -- so any non-GET from a user flushes that user's entries, wholesale.
   Flushed before the write is handled and again when it ends: a failed write flushing too
   costs one recompute, while the reverse ordering has a window where a raced read re-caches
   the pre-write answer. A deploy with more than one API process would break the invariant
   and this cache with it -- it would need a shared store or per-process TTL-only mode.

   The TTL is not about writes (the flush handles those); it bounds what no request reports:
   the stats windows are anchored to *today*, so an answer must not outlive
   the day by more than a minute, and a minute is already 60x fewer aggregations than one
   per request under any real usage.

   Only res.json() answers are cached, and only 200s -- binary routes (attachments,
   thumbnails) stream via res.send/sendFile and never enter here, which is right: their
   bytes are large and immutable-by-id anyway. Cached bodies are re-sent by reference; no
   route mutates a response object after sending it, and building responses fresh per
   request is exactly the work this file exists to skip. The X-Cache header says which case
   answered, so a log or a devtools pane can tell a recompute from a replay. */

import { forgetModel } from './categoryModel.js'

const TTL_MS = 60 * 1000
const MAX_URLS_PER_USER = 100
const MAX_USERS = 500

const byUser = new Map()   // userId -> Map(today + originalUrl -> { body, at })

/* Insertion order is eviction order, the same shape useApi.js uses client-side: re-set on
   every store, so `.keys().next()` is always the entry longest unrefreshed. */
const evictInto = (map, max) => { while (map.size > max) map.delete(map.keys().next().value) }

const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** Drops one account's answers, for a write no request carries: a reading that ends with nobody
    asking, or a draft a read makes (routes/scan.js). */
export const forgetReads = userId => { byUser.delete(userId) }

export function readCache(req, res, next) {
	// a question asked with a body writes nothing
	if (req.method === 'POST' && req.path === '/suggestions' && req.baseUrl === '/api/categories') return next()
	if (WRITES.has(req.method)) {
		byUser.delete(req.user.id)
		// a changed order or category changes what the account's category suggestions are learned from
		forgetModel(req.user.id)
		// and again once it ends: a read made while a write awaits caches its half-done state
		res.on('close', () => byUser.delete(req.user.id))
		return next()
	}
	if (req.method !== 'GET') return next()   // HEAD/OPTIONS: neither a write nor cacheable here

	// Keyed by the reader's day too: the same address answers differently either side of midnight.
	const key = `${req.today} ${req.originalUrl}`
	const urls = byUser.get(req.user.id)
	const hit = urls?.get(key)
	if (hit && Date.now() - hit.at < TTL_MS) {
		res.set('X-Cache', 'hit')
		return res.json(hit.body)
	}

	const send = res.json.bind(res)
	res.json = body => {
		// an answer its route marks no-store depends on something outside the account, such as a register's limit
		if (res.statusCode === 200 && !/no-store/.test(res.get('Cache-Control') ?? '')) {
			let urls = byUser.get(req.user.id)
			if (!urls) {
				byUser.set(req.user.id, urls = new Map())
				evictInto(byUser, MAX_USERS)
			}
			urls.delete(key)
			urls.set(key, { body, at: Date.now() })
			evictInto(urls, MAX_URLS_PER_USER)
		}
		res.set('X-Cache', 'miss')
		return send(body)
	}
	next()
}
