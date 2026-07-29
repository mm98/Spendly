import { useCallback, useRef, useState } from 'react'
import { Icon } from './Icon.jsx'

/* Reordering a list, by pointer and by keyboard, through one control.

   The grip in the stylesheet carries `cursor:grab`, and a cursor is a promise: the row said
   it could be dragged and it could not. Two chevron buttons did the reordering instead --
   which meant three controls on every row for one job, pointing sideways in a list that runs
   down the page.

   So the grip is the control. It drags with a pointer and it moves with the arrow keys, and
   there is nothing else on the row for reordering.

   Pointer Events rather than HTML5 drag-and-drop: `dragstart` never fires from a touch, so a
   DnD implementation is a drag that works on a laptop and silently does nothing on the phone
   the layout goes to such lengths for. `setPointerCapture` keeps the moves coming to the
   handle even when the pointer leaves it, and `touch-action: none` on the handle is what
   stops the browser scrolling the page instead -- without it the first move gesture is a
   scroll and the drag never starts.

   The list reorders live under the pointer rather than showing a drop indicator: the row
   under your finger is where the item will land, which needs no second thing to read.

   The keyboard half is not a lesser path. The handle is a real <button>, so it is in the tab
   order; Up and Down move the item, Home and End take it to the ends, and every move is
   announced, because a list that reorders silently tells a screen-reader user nothing. */

export function useReorder({ items, onReorder, describe, onAnnounce }) {
	const listRef = useRef(null)
	const [draggingId, setDraggingId] = useState(null)
	const [message, setMessage] = useState('')
	const drag = useRef(null)

	/* Where the move is announced is the host's business. A page that already has a status
	   line passes `onAnnounce` and keeps one live region; two regions on one screen is two
	   things reading over each other, and the second one is the one nobody knew was there. */
	const announce = useCallback((item, to) => {
		const said = `${describe(item)} moved to position ${to + 1} of ${items.length}.`
		if (onAnnounce) onAnnounce(said); else setMessage(said)
	}, [describe, items.length, onAnnounce])

	const move = useCallback((from, to) => {
		if (to < 0 || to >= items.length || to === from) return false
		onReorder(from, to)
		return true
	}, [items.length, onReorder])

	/* Which row the pointer is over now. Read fresh on every move, because the rows have just
	   been reordered under it and a cached set of rectangles describes the list as it was.

	   The axis is measured rather than declared: an item list runs down the page and the
	   dashboard's cards run across it, and the same hook drives both. Two boxes that overlap
	   vertically are side by side, so the comparison is on x; otherwise it is on y. Hard-coding
	   y would make the dashboard drag jump to the last card on the first move. */
	const indexAt = (clientX, clientY) => {
		const rows = [...(listRef.current?.querySelectorAll('[data-reorder-row]') ?? [])]
		if (rows.length < 2) return 0
		const boxes = rows.map(r => r.getBoundingClientRect())
		const horizontal = boxes[1].top < boxes[0].bottom - 1
		for (let i = 0; i < boxes.length; i++) {
			const box = boxes[i]
			const middle = horizontal ? box.left + box.width / 2 : box.top + box.height / 2
			if ((horizontal ? clientX : clientY) < middle) return i
		}
		return boxes.length - 1
	}

	const onPointerDown = (e, index, item) => {
		// Secondary buttons open menus and start selections; only a primary press is a drag.
		if (e.button != null && e.button !== 0) return
		e.preventDefault()
		e.currentTarget.setPointerCapture(e.pointerId)
		drag.current = { pointerId: e.pointerId, index, item }
		setDraggingId(item.id)
	}

	const onPointerMove = e => {
		if (!drag.current || e.pointerId !== drag.current.pointerId) return
		const to = indexAt(e.clientX, e.clientY)
		if (to === drag.current.index) return
		if (move(drag.current.index, to)) drag.current.index = to
	}

	const onPointerUp = e => {
		if (!drag.current || e.pointerId !== drag.current.pointerId) return
		const { item, index } = drag.current
		drag.current = null
		setDraggingId(null)
		e.currentTarget.releasePointerCapture?.(e.pointerId)
		announce(item, index)
	}

	const onKeyDown = (e, index, item) => {
		/* Both axes move it, so the same handle works whichever way the list is laid out and
		   nobody has to know which arrow this particular list listens to. */
		const to = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? index - 1
			: e.key === 'ArrowDown' || e.key === 'ArrowRight' ? index + 1
			: e.key === 'Home' ? 0
			: e.key === 'End' ? items.length - 1
			: null
		if (to === null) return
		e.preventDefault()
		if (!move(index, to)) return
		announce(item, to)
		/* React moves the DOM node with the item, so focus rides along -- except when the row
		   is re-created rather than moved. Putting it back by hand costs nothing and covers it. */
		queueMicrotask(() =>
			listRef.current?.querySelector(`[data-reorder-handle="${item.id}"]`)?.focus())
	}

	/** Goes on the element that wraps the rows, so the drag can find them. */
	const listProps = { ref: listRef }

	/** Goes on each row: marks it as a target and dims it while it is the one being dragged. */
	const rowProps = item => ({
		'data-reorder-row': item.id,
		style: draggingId === item.id ? { opacity: 0.55 } : undefined
	})

	/** The handle itself.

	    The stylesheet's `.item-row-grip` was written for a <span>, so it sets a colour and a
	    cursor and nothing else. This is a <button> -- it has to be, to be focusable and to
	    announce itself -- so the UA's border, background, padding and font are reset here
	    rather than in spendly.css: that file is the prototype's and is synced from it, and a
	    rule added on this side only would drift from the file it is copied out of. The
	    `touch-action` is not cosmetic: without it the first move gesture scrolls the page and
	    the drag never starts. */
	const handle = (item, index) => (
		<button type="button" className="item-row-grip" data-reorder-handle={item.id}
			aria-label={`Reorder ${describe(item)}, ${index + 1} of ${items.length}. Drag, or use the arrow keys.`}
			style={{
				font: 'inherit', background: 'none', border: 0, padding: 0,
				display: 'inline-flex', alignItems: 'center', flex: 'none',
				touchAction: 'none', cursor: draggingId === item.id ? 'grabbing' : 'grab'
			}}
			onPointerDown={e => onPointerDown(e, index, item)}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
			onKeyDown={e => onKeyDown(e, index, item)}>
			<Icon name="grip" />
		</button>
	)

	/** For a host with nowhere else to say it. Hosts that pass `onAnnounce` do not render this. */
	const liveRegion = onAnnounce
		? null
		: <p className="screenreader-only" role="status" aria-live="polite">{message}</p>

	return { listProps, rowProps, handle, liveRegion, draggingId }
}
