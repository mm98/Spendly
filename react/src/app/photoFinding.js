import { useSyncExternalStore } from 'react'
import { findLinePhotos, getPhotoFinding, invalidateOrderData } from '../api/client.js'

/* Find photos (Order editing layouts 1a): the searches this page started, followed app-wide until
   they end, since a search goes on when the reader leaves the order. */

const POLL_MS = 500
const NONE = Object.freeze(new Set())

/** orderId -> Set of itemIds still waiting */
let waiting = new Map()
const listeners = new Set()
const doneListeners = new Set()
let timer = null

const emit = () => { for (const l of listeners) l() }

function set(orderId, ids) {
	const next = new Map(waiting)
	if (ids.length) next.set(orderId, new Set(ids))
	else next.delete(orderId)
	waiting = next
	emit()
}

async function poll() {
	timer = null
	let answer
	try { answer = await getPhotoFinding() } catch { answer = null }
	if (answer) {
		let filled = false
		for (const orderId of [...waiting.keys()]) {
			const search = answer.searches.find(s => s.orderId === orderId)
			const before = waiting.get(orderId)
			// a search the server does not know ended with a restart: its lines stay as they are
			const now = search && !search.done ? search.waiting : []
			if (now.length < before.size) filled = true
			set(orderId, now)
			if (search?.done) for (const l of doneListeners) l({ orderId, found: search.found, of: search.of })
		}
		if (filled) invalidateOrderData()
	}
	if (waiting.size) timer = setTimeout(poll, POLL_MS)
}

/** Starts finding photos for an order and follows it. Nothing happens when its vendor has no finder
    or every line has a photo. */
export async function findPhotos(orderId) {
	const started = await findLinePhotos(orderId)
	if (!started?.waiting?.length) return
	set(orderId, started.waiting)
	if (!timer) timer = setTimeout(poll, POLL_MS)
}

const subscribe = l => { listeners.add(l); return () => listeners.delete(l) }

/** The lines of an order still waiting for a photo, as a Set of item ids. */
export const useWaitingPhotos = orderId => useSyncExternalStore(subscribe, () => waiting.get(orderId) ?? NONE)

/** Calls back with `{ orderId, found, of }` when a followed search is done. */
export function onPhotosFound(listener) {
	doneListeners.add(listener)
	return () => doneListeners.delete(listener)
}
