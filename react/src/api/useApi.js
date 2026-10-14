import { useCallback, useEffect, useRef, useState } from 'react'

/* One hook for every read: it aborts a request whose arguments changed, caches by endpoint and
   arguments, keeps the last good data across a refetch, and reports the error (never a signed-out one).

   A cached answer is trusted for FRESH_MS with no request: every write invalidates the reads it
   can change (the groups at the foot of client.js). Past it a hit paints at once and asks again
   quietly, for what invalidation cannot see: another device, or the day rolling over.

   The key is the endpoint's name and its arguments as JSON, so `args` need not be memoised. */

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

/** Gives `wrapper` the key of the read `as`, so a write that forgets `as` forgets the wrapper's answers
    too. Taken from `as` at run time: a built bundle renames functions, and a literal name would not match. */
export const readAs = (as, wrapper) => Object.defineProperty(wrapper, 'name', { value: as.name })

// mounted readers, told when a write forgets their answer so what is on screen asks again
const readers = new Set()

/* One request per key at a time, shared by every reader of it and aborted when its last reader
   leaves; a request a write forgot never writes its answer into the cache. */
const inflight = new Map()   // key -> { promise, controller, waiters }

function join(key, start) {
	let entry = inflight.get(key)
	if (!entry) {
		const controller = new AbortController()
		entry = { controller, waiters: 0 }
		const own = entry
		entry.promise = Promise.resolve()
			.then(() => start(controller.signal))
			.then(data => {
				if (inflight.get(key) === own) {
					cache.set(key, { data, at: Date.now() })
					evict()
				}
				return data
			})
			.finally(() => { if (inflight.get(key) === own) inflight.delete(key) })
		inflight.set(key, entry)
	}
	entry.waiters++
	const own = entry
	let left = false
	return {
		promise: own.promise,
		leave: () => {
			if (left) return
			left = true
			if (--own.waiters > 0) return
			own.controller.abort()
			if (inflight.get(key) === own) inflight.delete(key)
		}
	}
}

const forgetInflight = prefix => {
	for (const k of [...inflight.keys()]) if (prefix === null || k.startsWith(prefix)) inflight.delete(k)
}

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

		let live = true

		if (hit) setState({ data: hit.data, error: null, loading: false })
		else setState(s => ({ data: s.data, error: null, loading: true }))

		const { fn: endpoint, args: params } = request.current
		const shared = join(key, signal => endpoint(...params, signal))
		shared.promise
			.then(data => {
				if (!live) return
				setState({ data, error: null, loading: false })
			})
			.catch(error => {
				// a session that ended is the shell's to say: the page keeps its last data, or its loading frame
				if (!live || error.name === 'AbortError' || error.signedOut) return
				setState(s => ({ data: s.data, error, loading: false }))
			})

		return () => { live = false; shared.leave() }
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
		if (key !== null) { cache.delete(key); inflight.delete(key) }
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

/** Asks the server even when the cache holds an answer, and keeps what it says: for a record
    about to be offered as live. A record that is gone leaves the cache. */
export async function freshFetch(fn, args = [], signal) {
	const key = keyOf(fn, args)
	try {
		const data = await fn(...args, signal)
		cache.set(key, { data, at: Date.now() })
		evict()
		return data
	} catch (error) {
		if (error?.gone) cache.delete(key)
		throw error
	}
}

/** What the cache holds for a read, however old, without asking. */
export const peek = (fn, args = []) => cache.get(keyOf(fn, args))?.data

/** Forgets one cached answer received before `since` (a Date.now()), so its next reader asks. */
export function forgetOlder(fn, args, since) {
	const key = keyOf(fn, args)
	if ((cache.get(key)?.at ?? Infinity) < since) cache.delete(key)
}

/** Forgets every cached answer without telling the readers on screen to ask again. */
export function forgetAll() {
	cache.clear()
	forgetInflight(null)
}

/** Forgets one endpoint's cached answers, or all of them. Called after a write. */
export function invalidate(fn) {
	const prefix = fn ? (fn.name || 'anonymous') + ':' : null
	if (prefix === null) cache.clear()
	else for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k)
	forgetInflight(prefix)
	for (const reader of [...readers]) reader(prefix)
}
