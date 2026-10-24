import { useEffect, useRef, useState } from 'react'

// a duration token in milliseconds: the built stylesheet writes 180ms as .18s
const inMs = time => (parseFloat(time) || 0) * (/\d\s*s\s*$/.test(time) && !/ms\s*$/.test(time) ? 1000 : 1)

/* data-added and data-leaving on a list's rows. One row arriving alone is the reader's; many at once
   is a load or a scan filling the list, which does not animate. */

const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const outMs = () => inMs(getComputedStyle(document.documentElement).getPropertyValue('--motion-out'))

/** `items` with each removed row kept in its place for `--motion-out`; `row(item)` gives a row its
    marks, spread on the row element. */
export function useRowMotion(items, keyOf) {
	const keys = items.map(i => String(keyOf(i)))
	const joined = keys.join('\n')
	// the last render's rows, so a removed one can still be drawn
	const drawn = useRef(new Map())
	const [before, setBefore] = useState({ joined, keys })
	const [leaving, setLeaving] = useState([])
	const [added, setAdded] = useState(() => new Set())
	if (before.joined !== joined) {
		const fresh = keys.filter(k => !before.keys.includes(k))
		if (fresh.length === 1) setAdded(was => new Set(was).add(fresh[0]))
		const gone = before.keys.filter(k => !keys.includes(k) && drawn.current.has(k))
			.map(k => ({ key: k, item: drawn.current.get(k), at: before.keys.indexOf(k) }))
		if (gone.length && !still()) setLeaving(was => [...was.filter(l => !gone.some(g => g.key === l.key)), ...gone])
		setBefore({ joined, keys })
	}
	useEffect(() => { drawn.current = new Map(items.map(i => [String(keyOf(i)), i])) })

	useEffect(() => {
		if (!leaving.length) return
		const timer = setTimeout(() => setLeaving([]), outMs())
		return () => clearTimeout(timer)
	}, [leaving])

	const ghosts = leaving.filter(l => l.item && !keys.includes(l.key))
	const all = [...items]
	for (const { item, at } of ghosts) all.splice(Math.min(at, all.length), 0, item)
	const ghostKeys = new Set(ghosts.map(l => l.key))
	return {
		items: all,
		/** whether this row is one being removed, which takes no part in moving rows */
		leaving: item => ghostKeys.has(String(keyOf(item))),
		row: item => {
			const key = String(keyOf(item))
			if (ghostKeys.has(key)) return { 'data-leaving': 'true', 'aria-hidden': 'true', inert: true }
			return added.has(key) ? { 'data-added': 'true' } : {}
		}
	}
}
