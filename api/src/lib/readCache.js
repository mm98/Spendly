/* Per-user cache of GET answers, so a read the account just paid for is not recomputed for
   the identical request seconds later. GET /api/categories is a full all-time rollup over
   every order-category link the account has (lib/aggregate.js), cheap to skip and expensive
   to redo on every tab switch when nothing that feeds it can change without a write coming
   through this same process.

   That is the invariant the cache leans on: SQLite, one process, every write an HTTP write
   through this app -- so any non-GET from a user flushes that user's entries, wholesale.
   Flushed before the write is handled, not after it succeeds: a failed write flushing too
   costs one recompute, while the reverse ordering has a window where a raced read re-caches
   the pre-write answer. A deploy with more than one API process would break the invariant
   and this cache with it -- it would need a shared store or per-process TTL-only mode.

   The TTL is not about writes (the flush handles those); it bounds what no request reports:
   the stats windows and Home's hero are anchored to *today*, so an answer must not outlive
   the day by more than a minute, and a minute is already 60x fewer aggregations than one
   per request under any real usage.

   Only res.json() answers are cached, and only 200s -- binary routes (attachments,
   thumbnails) stream via res.send/sendFile and never enter here, which is right: their
   bytes are large and immutable-by-id anyway. Cached bodies are re-sent by reference; no
   route mutates a response object after sending it, and building responses fresh per
   request is exactly the work this file exists to skip. The X-Cache header says which case
   answered, so a log or a devtools pane can tell a recompute from a replay. */

const TTL_MS = 60 * 1000
const MAX_URLS_PER_USER = 100
const MAX_USERS = 500

const byUser = new Map()   // userId -> Map(originalUrl -> { body, at })

/* Insertion order is eviction order, the same shape useApi.js uses client-side: re-set on
   every store, so `.keys().next()` is always the entry longest unrefreshed. */
const evictInto = (map, max) => { while (map.size > max) map.delete(map.keys().next().value) }

const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function readCache(req, res, next) {
	if (WRITES.has(req.method)) {
		byUser.delete(req.user.id)
		return next()
	}
	if (req.method !== 'GET') return next()   // HEAD/OPTIONS: neither a write nor cacheable here

	const urls = byUser.get(req.user.id)
	const hit = urls?.get(req.originalUrl)
	if (hit && Date.now() - hit.at < TTL_MS) {
		res.set('X-Cache', 'hit')
		return res.json(hit.body)
	}

	const send = res.json.bind(res)
	res.json = body => {
		if (res.statusCode === 200) {
			let urls = byUser.get(req.user.id)
			if (!urls) {
				byUser.set(req.user.id, urls = new Map())
				evictInto(byUser, MAX_USERS)
			}
			urls.delete(req.originalUrl)
			urls.set(req.originalUrl, { body, at: Date.now() })
			evictInto(urls, MAX_URLS_PER_USER)
		}
		res.set('X-Cache', 'miss')
		return send(body)
	}
	next()
}
