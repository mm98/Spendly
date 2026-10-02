import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router'

/* Each section's list address as last shown (c11), and per history step the window's scroll and
   each list's loaded pages, so Back returns to the same rows at the same place. */

const STORE = 'spendly:places'
// history steps remembered; the oldest go first
const KEEP = 100

const load = () => {
	try { return JSON.parse(sessionStorage.getItem(STORE)) ?? {} } catch { return {} }
}
const saved = load()
const lists = new Map(Object.entries(saved.lists ?? {}))
const scrolls = new Map(Object.entries(saved.scrolls ?? {}))
const pageCounts = new Map(Object.entries(saved.pages ?? {}))

const trim = map => { while (map.size > KEEP) map.delete(map.keys().next().value) }
const keep = (map, key, value) => { map.delete(key); map.set(key, value); trim(map) }

const persist = () => {
	try {
		sessionStorage.setItem(STORE, JSON.stringify({
			lists: Object.fromEntries(lists), scrolls: Object.fromEntries(scrolls), pages: Object.fromEntries(pageCounts)
		}))
	} catch { /* storage denied: this tab's memory only */ }
}
addEventListener('pagehide', persist)
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist() })

/** Notes a section's list address as it is shown. The shell calls it. */
export const rememberList = (section, address) => keep(lists, section, address)

/** A section's list address as last shown, or undefined before it has been opened. */
export const rememberedList = section => lists.get(section)

/** A section's list as the reader last left it, with its sort, search and filters; the bare list
    when it has not been opened. What an edit page's Cancel, Save and Archive go back to. */
export function useListReturn(section) {
	return lists.get(section) ?? '/' + section
}

/* ---- the window's scroll, per history step ---- */

let current = null          // the history step on screen
let pending = null          // a scroll waiting for the page to grow tall enough: { key, y, timer }
const waiting = new Map()   // history step -> lists on it whose rows are not drawn yet
// a restore is given up after this long, so a page that never grows does not jump later
const GIVE_UP_MS = 3000

const drop = () => {
	if (pending) clearTimeout(pending.timer)
	pending = null
}

function settle() {
	if (!pending || waiting.get(pending.key)) return
	if (document.documentElement.scrollHeight - innerHeight < pending.y) return
	scrollTo(0, pending.y)
	drop()
}

const release = key => {
	const left = (waiting.get(key) ?? 1) - 1
	if (left > 0) waiting.set(key, left)
	else waiting.delete(key)
}

const grow = new ResizeObserver(() => settle())

/** The shell's half: a new step starts at the top of a new page, and Back or a reload puts the
    window where that step was left, once the page is tall enough to hold it. */
export function useScrollMemory() {
	const { key, pathname } = useLocation()
	const navigation = useNavigationType()
	const shown = useRef(null)

	useLayoutEffect(() => {
		history.scrollRestoration = 'manual'
		grow.observe(document.body)
		const note = () => { if (!pending && current) keep(scrolls, current, Math.round(scrollY)) }
		// the reader moving the page themselves ends the wait
		const moved = ['wheel', 'touchstart', 'keydown', 'pointerdown']
		addEventListener('scroll', note, { passive: true })
		for (const ev of moved) addEventListener(ev, drop, { passive: true })
		return () => {
			grow.disconnect()
			removeEventListener('scroll', note)
			for (const ev of moved) removeEventListener(ev, drop)
		}
	}, [])

	useLayoutEffect(() => {
		const from = shown.current
		if (from?.key === key) return
		shown.current = { key, pathname }
		current = key
		drop()
		if (navigation === 'POP') {
			const y = scrolls.get(key)
			if (y) { pending = { key, y, timer: setTimeout(drop, GIVE_UP_MS) }; settle() }
			return
		}
		// another page opens at its top; the same page with other filters stays where it was
		if (!from || from.pathname !== pathname) scrollTo(0, 0)
		keep(scrolls, key, Math.round(scrollY))
	}, [key, pathname, navigation])
}

/** How many pages a list had loaded at this history step, given back on Back. Call `restored()`
    once the rows for `pages` are drawn; the window then returns to where it was. */
export function useListMemory(name) {
	const { key } = useLocation()
	const id = key + '\n' + name
	const [own, setOwn] = useState(() => ({ id, pages: pageCounts.get(id) ?? 1 }))
	const pages = own.id === id ? own.pages : pageCounts.get(id) ?? 1
	const drawn = useRef(false)

	useLayoutEffect(() => {
		drawn.current = false
		waiting.set(key, (waiting.get(key) ?? 0) + 1)
		return () => {
			if (!drawn.current) release(key)
			settle()
		}
	}, [key])

	const setPages = useCallback(next => setOwn(was => {
		const before = was.id === id ? was.pages : pageCounts.get(id) ?? 1
		const n = typeof next === 'function' ? next(before) : next
		keep(pageCounts, id, n)
		return { id, pages: n }
	}), [id])

	const restored = useCallback(() => {
		if (drawn.current) return
		drawn.current = true
		release(key)
		settle()
	}, [key])

	return { pages, setPages, restored }
}
