import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigationType, useSearchParams } from 'react-router'

/* Each section's list address as last shown (c11), and per history step the window's scroll, so Back
   returns to the same rows at the same place. A list's loaded pages are in its address. */

const STORE = 'spendly:places'
// history steps remembered; the oldest go first
const KEEP = 100

const load = () => {
	try { return JSON.parse(sessionStorage.getItem(STORE)) ?? {} } catch { return {} }
}
const saved = load()
const lists = new Map(Object.entries(saved.lists ?? {}))
const scrolls = new Map(Object.entries(saved.scrolls ?? {}))

const trim = map => { while (map.size > KEEP) map.delete(map.keys().next().value) }
const keep = (map, key, value) => { map.delete(key); map.set(key, value); trim(map) }

const persist = () => {
	try {
		sessionStorage.setItem(STORE, JSON.stringify({
			lists: Object.fromEntries(lists), scrolls: Object.fromEntries(scrolls)
		}))
	} catch { /* storage denied: this tab's memory only */ }
}
addEventListener('pagehide', persist)
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist() })

/** Notes a section's list address as it is shown. The shell calls it. */
export const rememberList = (section, address) => keep(lists, section, address)

/** A section's list address as last shown, or undefined before it has been opened. */
export const rememberedList = section => lists.get(section)

/** The period chosen on Statistics, put on the order list as it next opens from the shell (c14).
    A saved view stays as it was saved, so the dates go on All orders instead. */
export function carryPeriod(from, to) {
	const [path, query = ''] = (lists.get('orders') ?? '/orders').split('?')
	const params = new URLSearchParams(query)
	const view = params.get('saved')
	const next = view && view !== 'all' ? new URLSearchParams({ saved: 'all' }) : params
	next.delete('period')
	next.set('from', from)
	next.set('to', to)
	keep(lists, 'orders', `${path}?${next}`)
}

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

/** A list's loaded pages, held in its address as `pages`; a page writing its own filters drops it.
    Call `restored()` once the rows for `pages` are drawn; the window then returns to where it was. */
export function useListMemory() {
	const { key } = useLocation()
	const [params, setParams] = useSearchParams()
	const pages = Math.max(1, Math.floor(Number(params.get('pages'))) || 1)
	const drawn = useRef(false)

	useLayoutEffect(() => {
		drawn.current = false
		waiting.set(key, (waiting.get(key) ?? 0) + 1)
		return () => {
			if (!drawn.current) release(key)
			settle()
		}
	}, [key])

	// from the address itself, so a filter written just before is not undone
	const setPages = useCallback(n => {
		const next = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
		if (n > 1) next.set('pages', String(n))
		else next.delete('pages')
		setParams(next, { replace: true })
	}, [setParams])

	const restored = useCallback(() => {
		if (drawn.current) return
		drawn.current = true
		release(key)
		settle()
	}, [key])

	return { pages, setPages, restored }
}
