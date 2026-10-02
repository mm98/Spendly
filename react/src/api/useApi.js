import { useCallback, useEffect, useRef, useState } from 'react'

/* One hook for every read in the app.

   It does four things, and each of them is a defect somewhere that skips it: it aborts the
   request in flight when the arguments change or the component goes away, so a slow answer
   cannot overwrite a fast one that came after it; it caches by endpoint and arguments, so
   walking back to a page paints from what is already known instead of flashing a skeleton
   at a value that has not changed; it keeps the last good data across a refetch, so the
   layout does not collapse and reflow under the user; and it reports the error rather than
   rendering an empty page that looks like an answer.

   A cached answer is *trusted*, not just painted: within FRESH_MS a hit costs no request at
   all. Every write in the app already invalidates the reads it can change (the grouped
   helpers at the foot of client.js), so re-asking on every mount bought nothing within a tab
   and charged the server a full aggregation per tab switch for it. The horizon exists for
   what invalidation cannot see -- another device editing the account, and the day rolling
   over under a window left open (Home's hero and the stats windows are anchored to today) --
   past it a hit still paints instantly and revalidates in the background, so the cost is at
   most one quiet request per entry per horizon, never a skeleton.

   The cache key is the endpoint's name and its arguments as JSON. That is also why `args`
   need not be memoised at the call site: a fresh array with the same contents is the same
   key, so passing one inline does not re-run the effect on every render. */

const cache = new Map()   // key -> { data, at }

const FRESH_MS = 5 * 60 * 1000

/* A Map with no ceiling is one entry per endpoint-and-arguments combination for the life of
   the tab -- All orders alone reaches one per distinct filter, sort and page reachable through
   the URL. Oldest evicted first once the cache passes this many entries: a Map's iteration
   order is insertion order for keys that were never deleted and reinserted, so `.keys().next()`
   is always the entry that has gone longest without a fresh fetch. A re-fetch after eviction
   costs one round trip, the same one a first visit already pays. */
const MAX_ENTRIES = 200

const evict = () => { while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value) }

const keyOf = (fn, args) => (fn.name || 'anonymous') + ':' + JSON.stringify(args)

// mounted readers, told when a write forgets their answer so what is on screen asks again
const readers = new Set()

export function useApi(fn, args = [], { enabled = true } = {}) {
	const key = enabled ? keyOf(fn, args) : null
	const [state, setState] = useState(() => ({
		data: key !== null ? cache.get(key)?.data : undefined,
		error: null,
		loading: enabled && !(key !== null && cache.has(key))
	}))
	/* The endpoint and its arguments are read at call time rather than being effect
	   dependencies: `fn` is a module function and `args` is usually a fresh literal, so
	   depending on either identity would re-fetch on every render. `key` is the dependency
	   that actually describes the request. */
	const request = useRef({ fn, args })
	request.current = { fn, args }
	const [nonce, setNonce] = useState(0)

	useEffect(() => {
		if (key === null) return
		const hit = cache.get(key)

		/* A fresh hit is the answer -- no request. Opening a view is not a reason to re-ask;
		   only a write (which deletes the entry) or the horizon above is. */
		if (hit && Date.now() - hit.at < FRESH_MS) {
			setState({ data: hit.data, error: null, loading: false })
			return
		}

		const controller = new AbortController()
		let live = true

		if (hit) setState({ data: hit.data, error: null, loading: false })
		else setState(s => ({ data: s.data, error: null, loading: true }))

		const { fn: endpoint, args: params } = request.current
		Promise.resolve()
			.then(() => endpoint(...params, controller.signal))
			.then(data => {
				if (!live) return
				cache.set(key, { data, at: Date.now() })
				evict()
				setState({ data, error: null, loading: false })
			})
			.catch(error => {
				if (!live || error.name === 'AbortError') return
				setState(s => ({ data: s.data, error, loading: false }))
			})

		return () => { live = false; controller.abort() }
	}, [key, nonce])

	useEffect(() => {
		if (key === null) return
		const reader = prefix => { if (prefix === null || key.startsWith(prefix)) setNonce(n => n + 1) }
		readers.add(reader)
		return () => readers.delete(reader)
	}, [key])

	/* Drops the cached answer and asks again -- what a mutation calls once it has changed
	   something the page is showing. */
	const refresh = useCallback(() => {
		if (key !== null) cache.delete(key)
		setNonce(n => n + 1)
	}, [key])

	return { ...state, refresh }
}

/** The cache above, for a caller with no component to hook into -- the route loader that
    guards every page (routes.jsx) runs outside React and needs the same trusted-within-
    FRESH_MS answer useApi gives a page, not a fresh request on every navigation. Same key, same
    Map: a hit recorded here is a hit for a page's own useApi(fn) call and back, so the loader's
    settings read and Settings.jsx's own useApi(getSettings) share one answer instead of two. */
export async function cachedFetch(fn, args = [], signal) {
	const key = keyOf(fn, args)
	const hit = cache.get(key)
	if (hit && Date.now() - hit.at < FRESH_MS) return hit.data
	const data = await fn(...args, signal)
	cache.set(key, { data, at: Date.now() })
	evict()
	return data
}

/** Forgets one endpoint's cached answers, or all of them. Called after a write. */
export function invalidate(fn) {
	const prefix = fn ? (fn.name || 'anonymous') + ':' : null
	if (prefix === null) cache.clear()
	else for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k)
	for (const reader of [...readers]) reader(prefix)
}
