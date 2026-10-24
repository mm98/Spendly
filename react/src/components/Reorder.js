import { useLayoutEffect, useRef, useState } from 'react'

// Components, Ordering by hand: a touch drags after holding still, a pointer after a few pixels
const HOLD_MS = 200
const THRESHOLD = 4
// a touch that travels this far before the hold is up is a scroll, not a pickup
const SCROLLED = 8
const SHIFT = 'translate var(--motion-in) var(--ease-enter)'

const handleIn = target => target?.closest?.('.sp-list-item__handle')
const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
// where an element is laid out, whatever it is drawn shifted by
const laidAt = el => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y }
const swallow = ev => { ev.preventDefault(); ev.stopPropagation() }

/** One way to move rows by hand, for every list that has them (c1, Ordering by hand). `onMove(items,
    item, to)` gets the new order once, when `item` is dropped somewhere new, at `to`. */
export function useReorder({ items, keyOf, nameOf, onMove }) {
	const list = useRef(null)
	const [order, setOrder] = useState(null)
	const [carried, setCarried] = useState(null)
	const [held, setHeld] = useState(null)
	const [said, setSaid] = useState('')
	const press = useRef(null)
	// where each row was drawn just before a move, so it can slide from there
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
		const snap = () => {
			const top = list.current?.getBoundingClientRect().top ?? 0
			tops.current = new Map([...(list.current?.querySelectorAll('[data-reorder]') ?? [])].map(r => [r.dataset.reorder, r.getBoundingClientRect().top - top]))
			shifting.current = true
		}
		const place = (key, to) => { const next = now.current.live.filter(k => k !== key); next.splice(to, 0, key); return next }
		const tell = (key, word, within = now.current.live) =>
			setSaid(`${now.current.nameOf(now.current.byKey.get(key))}${word ? `, ${word}` : ''}, position ${within.indexOf(key) + 1} of ${within.length}`)
		// dropping in the same place is not a change: nothing is saved
		const commit = (next, key) => {
			snap()
			setOrder(null)
			const { keys, byKey, onMove } = now.current
			if (next.join('\n') !== keys.join('\n')) onMove(next.map(k => byKey.get(k)), byKey.get(key), next.indexOf(key))
		}
		// picking a row up puts down the one already held, where it is shown
		const pickUp = key => {
			const { live, held } = now.current
			if (held) commit(live, held.key)
			setHeld({ key, from: live })
			setOrder(live)
			tell(key, 'picked up')
		}
		const drop = key => {
			setHeld(null)
			commit(now.current.live, key)
			tell(key, 'dropped')
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
			snap()
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
			if (now.current.held) drop(now.current.held.key)
			snap()
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
				commit(now.current.live, p.key)
				// the click that ends a drag opens nothing
				window.addEventListener('click', swallow, { capture: true, once: true })
				setTimeout(() => window.removeEventListener('click', swallow, true))
			} else if (now.current.held?.key === p.key) drop(p.key)
			else {
				// a press that does not drag selects the row, so ↑ ↓ move it; the press itself takes no focus
				if (now.current.held) refocus.current = p.key
				pickUp(p.key)
				p.handle.focus()
			}
			end()
		}
		const cancel = ev => {
			const p = press.current
			if (!p || ev.pointerId !== p.id) return
			if (p.live) {
				snap()
				dropped.current = { key: p.key, top: p.top }
				setCarried(null)
				setOrder(null)
			}
			end()
		}
		const block = ev => { if (press.current?.live) ev.preventDefault() }

		const onPointerDown = ev => {
			const row = handleIn(ev.target)?.closest('[data-reorder]')
			if (!row || !list.current?.contains(row) || ev.button > 0 || press.current) return
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
				if (holding) drop(key)
				else pickUp(key)
				return
			}
			if (!holding) return
			if (ev.key === 'Escape') {
				ev.preventDefault()
				ev.stopPropagation()
				snap()
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
			snap()
			refocus.current = key
			setOrder(next)
			tell(key, null, next)
		}

		// a held row that focus leaves, by Tab or a click elsewhere, is put down where it is shown.
		// Moving a row can blur its handle for a moment; settle gives focus back before this looks.
		const onBlur = () => setTimeout(() => {
			const { held } = now.current
			if (held && document.activeElement !== rowOf(held.key)?.querySelector('.sp-list-item__handle')) drop(held.key)
		})

		// a row that moved slides from where it was drawn to its new place
		const settle = () => {
			const box = list.current
			if (!box || !shifting.current) return follow()
			shifting.current = false
			const animate = !still()
			for (const row of box.querySelectorAll('[data-reorder]')) {
				const key = row.dataset.reorder
				if (key === press.current?.key && press.current.live) continue
				const from = dropped.current?.key === key ? dropped.current.top : tops.current.get(key)
				const shift = animate && from != null ? from - inList(row) : 0
				row.style.transition = 'none'
				row.style.translate = Math.abs(shift) < 0.5 ? '' : `0 ${shift}px`
				if (Math.abs(shift) < 0.5) continue
				row.getBoundingClientRect()
				row.style.transition = SHIFT
				row.style.translate = ''
			}
			dropped.current = null
			follow()
			const back = refocus.current && rowOf(refocus.current)?.querySelector('.sp-list-item__handle')
			refocus.current = null
			if (back && document.activeElement !== back) back.focus()
		}
		act.current = { onPointerDown, onKeyDown, onBlur, settle, end }
	}

	useLayoutEffect(() => act.current.settle())
	useLayoutEffect(() => () => act.current.end(), [])

	return {
		items: live.map(k => byKey.get(k)),
		list: { ref: list, onPointerDown: act.current.onPointerDown, onKeyDown: act.current.onKeyDown, onBlur: act.current.onBlur, 'data-reordering': carried || held ? 'true' : undefined },
		row: item => ({ 'data-reorder': String(keyOf(item)) }),
		// carried by a pointer, or picked up from the keyboard; else the row's own
		variant: (item, rest = 'default') => (carried === String(keyOf(item)) ? 'carried' : held?.key === String(keyOf(item)) ? 'picked' : rest),
		// the line that marks where the carried row lands stands just above it
		lands: item => carried === String(keyOf(item)),
		said
	}
}
