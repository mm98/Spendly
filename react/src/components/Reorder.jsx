import { createContext, useContext, useRef, useState } from 'react'
import { Reorder, useDragControls } from 'motion/react'
import { Announce } from './ListItem.jsx'
import { Rows } from './motion.js'

// Components, Ordering by hand: a touch drags after holding still, a pointer once it moves
const HOLD_MS = 200
// a touch that travels this far before the hold is up is a scroll, not a pickup
const SCROLLED = 8
// a pointer moves this far before a drag begins, so a loose click on the handle does not move the row
const THRESHOLD = 4

const Moving = createContext(null)

/** What a row in a ReorderList needs to move: its value, the controls its handle starts, and whether
    it is carried or picked up. ListItem and NavItem read it. Internal. */
export const useMovingRow = () => useContext(Moving)

/** The one way to move rows by hand, for every list that has them (c1, Ordering by hand): a row is
    carried by its handle and the others make room as it passes, or picked up from the keyboard with
    Space, moved with the arrows and put down with Space, Escape putting it back. `onMove(items, item, to)`
    gets the new order once, when `item` is put down somewhere new, at `to`. It draws no box of its own:
    it goes inside the page's list element, and each row is a ListItem or NavItem with a `handle`.
    Its rows arrive and leave as any list's do (Rows): one added drops in, one removed fades and the
    rest glide up. The page puts no `Rows` around it.
    @param {object} props
    @param {any[]} props.items The rows' records, in their saved order.
    @param {(item: any) => string | number} props.keyOf A record's key.
    @param {(item: any) => string} props.nameOf What a record is called, read out as it moves.
    @param {(items: any[], item: any, to: number) => void} props.onMove The new order, once.
    @param {(item: any) => import('react').ReactNode} props.children Draws one row. */
export function ReorderList({ items, keyOf, nameOf, onMove, children }) {
	const keys = items.map(i => String(keyOf(i)))
	const byKey = new Map(items.map(i => [String(keyOf(i)), i]))
	const [live, setLive] = useState(null)
	const [held, setHeld] = useState(null)
	const [carried, setCarried] = useState(null)
	const [said, setSaid] = useState('')
	const order = live ? [...live.filter(k => keys.includes(k)), ...keys.filter(k => !live.includes(k))] : keys
	const now = useRef(null)
	now.current = { order, keys, byKey, held }

	const tell = (key, word, within = now.current.order) =>
		setSaid(`${nameOf(now.current.byKey.get(key))}${word ? `, ${word}` : ''}, position ${within.indexOf(key) + 1} of ${within.length}`)
	// putting a row down where it was is not a change: nothing is saved
	const commit = (next, key) => {
		setLive(null)
		const { keys, byKey } = now.current
		if (next.join('\n') !== keys.join('\n')) onMove(next.map(k => byKey.get(k)), byKey.get(key), next.indexOf(key))
	}
	const pickUp = key => {
		if (now.current.held) commit(now.current.order, now.current.held.key)
		setHeld({ key, from: now.current.order })
		setLive(now.current.order)
		tell(key, 'picked up')
	}
	const drop = key => { setHeld(null); commit(now.current.order, key); tell(key, 'dropped') }
	const keysOf = key => ev => {
		// only the handle takes the keys: a field in the row keeps its Space and arrows
		if (!ev.target.closest?.('.sp-list-item__handle')) return
		const holding = now.current.held?.key === key
		if (ev.key === ' ' || (ev.key === 'Enter' && !holding)) { ev.preventDefault(); return holding ? drop(key) : pickUp(key) }
		if (!holding) return
		if (ev.key === 'Escape') {
			ev.preventDefault()
			ev.stopPropagation()
			setLive(null)
			setHeld(null)
			return tell(key, 'put back', now.current.held.from)
		}
		const at = now.current.order.indexOf(key)
		const to = at + (ev.key === 'ArrowUp' ? -1 : ev.key === 'ArrowDown' ? 1 : 0)
		if (to === at) return
		ev.preventDefault()
		if (to < 0 || to >= now.current.order.length) return
		const next = now.current.order.filter(k => k !== key)
		next.splice(to, 0, key)
		setLive(next)
		tell(key, null, next)
	}
	// a held row that focus leaves, by Tab or a click elsewhere, is put down where it is shown
	const blur = key => ev => { if (now.current.held?.key === key && !ev.currentTarget.contains(ev.relatedTarget)) drop(key) }

	const row = key => ({
		value: key,
		state: carried === key ? 'carried' : held?.key === key ? 'picked' : null,
		onKeyDown: keysOf(key),
		onBlur: blur(key),
		// a press that does not drag picks the row up for the arrows; a second puts it down
		onPress: () => (now.current.held?.key === key ? drop(key) : pickUp(key)),
		onDragStart: () => { if (now.current.held) drop(now.current.held.key); setLive(now.current.order); setCarried(key) },
		onDragEnd: () => { setCarried(null); commit(now.current.order, key) }
	})
	return (
		<>
			<Reorder.Group as="div" axis="y" className="sp-reorder" values={order} onReorder={setLive}>
				<Rows count={order.length}>
					{order.map(key => <Slot key={key} {...row(key)}>{children(byKey.get(key))}</Slot>)}
				</Rows>
			</Reorder.Group>
			<Announce>{said}</Announce>
		</>
	)
}

/* one row's drag controls: the handle starts the drag, at once for a pointer, after a still hold for a touch */
function Slot({ children, onPress, ...row }) {
	const controls = useDragControls()
	const hold = useRef(null)
	// the click that ends a drag picks nothing up
	const moved = useRef(false)
	const handle = {
		onPointerDown: ev => {
			if (ev.button > 0) return
			const start = ev.nativeEvent
			if (ev.pointerType !== 'touch') { ev.preventDefault(); return controls.start(start, { distanceThreshold: THRESHOLD }) }
			const x0 = ev.clientX, y0 = ev.clientY
			const move = e => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > SCROLLED) stop() }
			const stop = () => { clearTimeout(hold.current); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop) }
			hold.current = setTimeout(() => { stop(); navigator.vibrate?.(10); controls.start(start, { distanceThreshold: THRESHOLD }) }, HOLD_MS)
			window.addEventListener('pointermove', move)
			window.addEventListener('pointerup', stop)
		},
		onClick: () => { if (moved.current) { moved.current = false; return } onPress() }
	}
	const value = { ...row, onDragStart: () => { moved.current = true; row.onDragStart() }, controls, handle }
	return <Moving.Provider value={value}>{children}</Moving.Provider>
}

/** What a moving row spreads on Motion's `Reorder.Item`, which it is drawn as: the row's presence
    from `useRow()` (its way in and out, and no presses while it leaves), then the drag, whose layout
    always wins, so a row still glides as it is carried. Internal. */
export function itemOf(moving, moves = {}) {
	const { value, controls, onDragStart, onDragEnd, onKeyDown, onBlur } = moving
	return { ...moves, value, dragListener: false, dragControls: controls, layout: 'position', onDragStart, onDragEnd, onKeyDown, onBlur }
}

export { Reorder }
