import { useLayoutEffect, useRef, useState } from 'react'

// Components, Ordering by hand: a touch drags after holding still, a pointer after a few pixels
const HOLD_MS = 200
const THRESHOLD = 4
// a touch that travels this far before the hold is up is a scroll, not a pickup
const SCROLLED = 8
const SHIFT = 'translate 150ms ease'

const handleIn = target => target?.closest?.('.sp-list-item__handle')
const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
// where an element is laid out, whatever it is drawn shifted by
const laidAt = el => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y }
const swallow = ev => { ev.preventDefault(); ev.stopPropagation() }

/** One way to move rows by hand, for every list that has them (Components, Ordering by hand). Only
    the handle starts it: a pointer drags the row, which follows it while the rows around it make room;
    a touch does the same after a held moment; the keyboard picks the row up with Space or Enter, moves
    it with the arrows, drops it with Space and puts it back with Escape, each step read out.
    `onMove(items)` gets the new order once, when the row is dropped somewhere new. */
export function useReorder({ items, keyOf, nameOf, onMove }) {
	const list = useRef(null)
	const [order, setOrder] = useState(null)
	const [carried, setCarried] = useState(null)
	const [held, setHeld] = useState(null)
	const [said, setSaid] = useState('')
	const press = useRef(null)
	const tops = useRef(new Map())
	const shifting = useRef(false)
	const dropped = useRef(null)
	const refocus = useRef(null)

	const keys = items.map(i => String(keyOf(i)))
	const live = order ? [...order.filter(k => keys.includes(k)), ...keys.filter(k => !order.includes(k))] : keys
	const byKey = new Map(items.map(i => [String(keyOf(i)), i]))
	const now = useRef(null)
	now.current = { keys, live, byKey, held, nameOf, onMove }

	const act = useRef(null)
	if (!act.current) {
		const rowOf = key => list.current?.querySelector(`[data-reorder="${CSS.escape(key)}"]`)
		const inList = el => laidAt(el) - laidAt(list.current)
		const place = (key, to) => { const next = now.current.live.filter(k => k !== key); next.splice(to, 0, key); return next }
		const tell = (key, word, within = now.current.live) =>
			setSaid(`${now.current.nameOf(now.current.byKey.get(key))}${word ? `, ${word}` : ''}, position ${within.indexOf(key) + 1} of ${within.length}`)
		// dropping in the same place is not a change: nothing is saved
		const commit = next => {
			shifting.current = true
			setOrder(null)
			if (next.join('\n') !== now.current.keys.join('\n')) now.current.onMove(next.map(k => now.current.byKey.get(k)))
		}

		const follow = () => {
			const p = press.current
			const row = p?.live ? rowOf(p.key) : null
			if (!row) return
			p.top = p.y - list.current.getBoundingClientRect().top - p.grab
			row.style.transition = 'none'
			row.style.translate = `0 ${p.top - inList(row)}px`
		}
		const land = () => {
			const p = press.current
			const pointer = p.y - list.current.getBoundingClientRect().top
			let to = 0
			for (const row of list.current.querySelectorAll('[data-reorder]'))
				if (row.dataset.reorder !== p.key && pointer > inList(row) + row.offsetHeight / 2) to++
			if (to === now.current.live.indexOf(p.key)) return
			shifting.current = true
			setOrder(place(p.key, to))
		}
		const begin = () => {
			const p = press.current
			const row = p && rowOf(p.key)
			if (!row) return end()
			p.live = true
			p.grab = p.y0 - list.current.getBoundingClientRect().top - inList(row)
			try { p.handle.setPointerCapture(p.id) } catch { /* the pointer is already gone */ }
			if (p.touch) navigator.vibrate?.(10)
			shifting.current = true
			setOrder(now.current.live)
			setCarried(p.key)
		}
		const end = () => {
			const p = press.current
			if (!p) return
			clearTimeout(p.timer)
			window.removeEventListener('pointermove', move)
			window.removeEventListener('pointerup', up)
			window.removeEventListener('pointercancel', cancel)
			window.removeEventListener('touchmove', block)
			window.removeEventListener('contextmenu', swallow)
			press.current = null
		}
		const move = ev => {
			const p = press.current
			if (!p || ev.pointerId !== p.id) return
			p.y = ev.clientY
			const far = Math.hypot(ev.clientX - p.x0, ev.clientY - p.y0)
			if (!p.live) {
				if (p.touch && far > SCROLLED) end()
				else if (!p.touch && far >= THRESHOLD) begin()
				return
			}
			land()
			follow()
		}
		const up = ev => {
			const p = press.current
			if (!p || ev.pointerId !== p.id) return
			if (p.live) {
				dropped.current = { key: p.key, top: p.top }
				setCarried(null)
				commit(now.current.live)
				// the click that ends a drag opens nothing
				window.addEventListener('click', swallow, { capture: true, once: true })
				setTimeout(() => window.removeEventListener('click', swallow, true))
			}
			end()
		}
		const cancel = ev => {
			const p = press.current
			if (!p || ev.pointerId !== p.id) return
			if (p.live) {
				dropped.current = { key: p.key, top: p.top }
				shifting.current = true
				setCarried(null)
				setOrder(null)
			}
			end()
		}
		const block = ev => { if (press.current?.live) ev.preventDefault() }

		const onPointerDown = ev => {
			const row = handleIn(ev.target)?.closest('[data-reorder]')
			if (!row || !list.current?.contains(row) || ev.button > 0 || press.current || now.current.held) return
			const touch = ev.pointerType === 'touch'
			press.current = { key: row.dataset.reorder, id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, y: ev.clientY, touch, live: false, handle: handleIn(ev.target) }
			if (touch) press.current.timer = setTimeout(begin, HOLD_MS)
			else ev.preventDefault()
			window.addEventListener('pointermove', move)
			window.addEventListener('pointerup', up)
			window.addEventListener('pointercancel', cancel)
			window.addEventListener('touchmove', block, { passive: false })
			if (touch) window.addEventListener('contextmenu', swallow)
		}
		const onKeyDown = ev => {
			const row = handleIn(ev.target)?.closest('[data-reorder]')
			if (!row || press.current) return
			const key = row.dataset.reorder
			const { live, held } = now.current
			const holding = held?.key === key
			if (ev.key === ' ' || (ev.key === 'Enter' && !holding)) {
				ev.preventDefault()
				if (holding) {
					setHeld(null)
					commit(live)
					tell(key, 'dropped')
					return
				}
				if (held) commit(live)
				setHeld({ key, from: live })
				setOrder(live)
				tell(key, 'picked up')
				return
			}
			if (!holding) return
			if (ev.key === 'Escape') {
				ev.preventDefault()
				ev.stopPropagation()
				shifting.current = true
				refocus.current = key
				setOrder(null)
				setHeld(null)
				tell(key, 'put back', held.from)
				return
			}
			const to = live.indexOf(key) + (ev.key === 'ArrowUp' ? -1 : ev.key === 'ArrowDown' ? 1 : 0)
			if (to === live.indexOf(key)) return
			ev.preventDefault()
			if (to < 0 || to >= live.length) return
			const next = place(key, to)
			shifting.current = true
			refocus.current = key
			setOrder(next)
			tell(key, null, next)
		}

		// a row that moved slides from where it was drawn to its new place
		const settle = () => {
			const box = list.current
			if (!box) return
			const animate = shifting.current && !still()
			shifting.current = false
			const was = tops.current
			const at = new Map()
			for (const row of box.querySelectorAll('[data-reorder]')) {
				const key = row.dataset.reorder
				const top = inList(row)
				at.set(key, top)
				const from = dropped.current?.key === key ? dropped.current.top : was.get(key)
				if (key === press.current?.key && press.current.live) continue
				if (!animate || from == null || from === top) { if (dropped.current?.key === key) row.style.translate = ''; continue }
				row.style.transition = 'none'
				row.style.translate = `0 ${from - top}px`
				row.getBoundingClientRect()
				row.style.transition = SHIFT
				row.style.translate = ''
			}
			tops.current = at
			dropped.current = null
			follow()
			const back = refocus.current && rowOf(refocus.current)?.querySelector('.sp-list-item__handle')
			refocus.current = null
			if (back && document.activeElement !== back) back.focus()
		}
		act.current = { onPointerDown, onKeyDown, settle, end }
	}

	useLayoutEffect(() => act.current.settle())
	useLayoutEffect(() => () => act.current.end(), [])

	return {
		items: live.map(k => byKey.get(k)),
		list: { ref: list, onPointerDown: act.current.onPointerDown, onKeyDown: act.current.onKeyDown },
		row: item => ({ 'data-reorder': String(keyOf(item)) }),
		// carried by a pointer, or picked up from the keyboard; else the row's own
		variant: (item, rest = 'default') => (carried === String(keyOf(item)) ? 'carried' : held?.key === String(keyOf(item)) ? 'picked' : rest),
		// the line that marks where the carried row lands stands just above it
		lands: item => carried === String(keyOf(item)),
		said
	}
}
