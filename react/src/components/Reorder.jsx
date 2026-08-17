import { useCallback, useEffect, useRef, useState } from 'react'
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
   the layout goes to such lengths for. `touch-action: none` on the handle is what stops the
   browser scrolling instead -- without it the first move gesture is a scroll and the drag
   never starts.

   The moves and the release are listened for on the window, not through
   `setPointerCapture` on the handle. Capture is the tidier-looking answer and it does not
   survive this: lifting the row re-renders it, and the browser fires `lostpointercapture`
   the moment it does -- measured, right after `pointerdown`, before a single move. The drag
   then ran on events that were still arriving and ended on a `pointerup` that never reached
   the handle, so the row stayed stuck to the cursor. The window hears all of it regardless of
   what React does to the tree underneath.

   What a drag has to show is *what* is moving and *where it will land*. The first version
   showed neither well: the row was dimmed to 55% and left in the list, so the thing under the
   finger was the faintest thing on screen and the slot it would drop into was indistinguishable
   from the rows shuffling around it.

   So the row lifts. While it is held it leaves the flow, follows the pointer, and carries a
   card background and a real shadow -- it is the one thing on screen that is raised. In the
   space it came from, a dashed box opens at exactly its size, and that box moves through the
   list as the pointer crosses each row: it is the landing slot, shown rather than implied.

   The list still reorders live behind the box, so letting go changes nothing that was not
   already on screen -- the box is where the row already is.

   The keyboard half is not a lesser path. The handle is a real <button>, so it is in the tab
   order; Up and Down move the item, Home and End take it to the ends, and every move is
   announced, because a list that reorders silently tells a screen-reader user nothing. */

export function useReorder({ items, onReorder, describe, onAnnounce }) {
	const listRef = useRef(null)
	const [draggingId, setDraggingId] = useState(null)
	/* Where the lifted row is drawn. State rather than a ref, because this is the one thing
	   in the drag that has to re-render on every move. */
	const [held, setHeld] = useState(null)
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
	   dashboard's cards run across it, and the same hook drives both. Hard-coding y would make
	   the dashboard drag jump to the last card on the first move.

	   One axis is not enough, though, and a wrapping grid is what says so. The dashboard's cards
	   are three across and wrap, so with six of them the list is two axes at once -- and reading
	   the first two boxes as "these overlap vertically, so this list runs across" then compared x
	   alone. Every card in a column shares its column's x, so the pointer over position 4 matched
	   position 1's half of the track and the sixth card snapped to the top row; positions 4 and 5
	   were not reachable at all, from any pointer position on the page.

	   So the boxes are grouped into the rows they visually make up first, and the answer is the
	   cell within a row rather than a position along one line. A list that does not wrap comes
	   back as one band (a row) or as one cell per band (a column), and both of those keep exactly
	   the single-axis arithmetic they had. */
	const indexAt = (clientX, clientY) => {
		/* The held row is out of the flow and pinned to the pointer, so measuring it would be
		   measuring the cursor. The dashed box stands in its place and is measured instead --
		   it sits at the held row's index, so the arithmetic below is unchanged. */
		const rows = [...(listRef.current?.querySelectorAll(
			'[data-reorder-row]:not([data-reorder-held]), [data-reorder-slot]') ?? [])]
		if (rows.length < 2) return 0
		const boxes = rows.map(r => r.getBoundingClientRect())

		/* A band is one visual row: boxes are in list order, so a new band starts at the first
		   box that does not overlap the band before it vertically. */
		const bands = []
		for (let i = 0; i < boxes.length; i++) {
			const band = bands[bands.length - 1]
			if (band && boxes[i].top < band.bottom - 1) {
				band.to = i
				band.bottom = Math.max(band.bottom, boxes[i].bottom)
			} else bands.push({ from: i, to: i, bottom: boxes[i].bottom })
		}

		const cellIn = (from, to) => {
			for (let i = from; i <= to; i++)
				if (clientX < boxes[i].left + boxes[i].width / 2) return i
			return to
		}
		// One band holding everything: a row. One cell per band: a column. Neither wraps.
		if (bands.length === 1) return cellIn(0, boxes.length - 1)
		if (bands.every(b => b.from === b.to)) {
			for (let i = 0; i < boxes.length; i++)
				if (clientY < boxes[i].top + boxes[i].height / 2) return i
			return boxes.length - 1
		}
		/* A grid: the band the pointer is inside, then the cell inside that band. The band is
		   picked by its bottom edge rather than by a midline, because a card is tall -- half of
		   one is 230px, and a midline would throw the card into the next row while the pointer
		   was still well inside the row it is over. */
		const band = bands.find(b => clientY < b.bottom) ?? bands[bands.length - 1]
		return cellIn(band.from, band.to)
	}

	/* `move` and `announce` are rebuilt on every render; the listeners below are bound once per
	   drag. Reading them through a ref is what keeps a drag that started three renders ago
	   working against the current list rather than the one it began with. */
	const latest = useRef(null)
	latest.current = { move, announce }

	const onPointerDown = (e, index, item) => {
		// Secondary buttons open menus and start selections; only a primary press is a drag.
		if (e.button != null && e.button !== 0) return
		const row = e.currentTarget.closest('[data-reorder-row]')
		if (!row) return
		e.preventDefault()

		/* The listeners go on now, in the same tick as the press -- not in an effect keyed on
		   the dragging state. An effect runs after the render that state schedules, so a move
		   arriving in the same tick as the press lands before anything is listening. A finger
		   is unlikely to be that quick; a synthetic one is, and so is a fast flick. */
		const onMove = event => {
			if (!drag.current || event.pointerId !== drag.current.pointerId) return
			if (event.cancelable) event.preventDefault()
			setHeld(h => (h ? { ...h, x: event.clientX, y: event.clientY } : h))
			const to = indexAt(event.clientX, event.clientY)
			if (to === drag.current.index) return
			if (latest.current.move(drag.current.index, to)) drag.current.index = to
		}

		const onUp = event => {
			if (!drag.current || event.pointerId !== drag.current.pointerId) return
			const { item: held_, index: at, stop } = drag.current
			drag.current = null
			stop()
			setDraggingId(null)
			setHeld(null)
			latest.current.announce(held_, at)
		}

		const stop = () => {
			window.removeEventListener('pointermove', onMove)
			window.removeEventListener('pointerup', onUp)
			window.removeEventListener('pointercancel', onUp)
		}
		window.addEventListener('pointermove', onMove, { passive: false })
		window.addEventListener('pointerup', onUp)
		window.addEventListener('pointercancel', onUp)

		/* Where the pointer holds the thing it has picked up.

		   The grip is a corner of what it moves, and a card is not a corner-sized object: held
		   by the exact point it was grabbed, a 373x439 card hangs down and to the left of the
		   cursor and reads as a page that has come loose rather than as a card being carried.

		   So the pointer takes the middle of the container along every axis the list can move
		   it in, and keeps the grab point on the axis it cannot. A card in a row is held at its
		   centre. A row in a column is held at its vertical middle and stays where it is
		   horizontally -- centring that too would swing a panel-wide row half its own width to
		   the left of the list it belongs to. */
		const box = row.getBoundingClientRect()
		const across = horizontalList()
		drag.current = {
			pointerId: e.pointerId, index, item, stop,
			offsetX: across ? box.width / 2 : e.clientX - box.left,
			offsetY: box.height / 2,
			width: box.width, height: box.height
		}
		setDraggingId(item.id)
		setHeld({ x: e.clientX, y: e.clientY, ...drag.current })
	}

	/* A component that goes away mid-drag takes its listeners with it. */
	useEffect(() => () => drag.current?.stop?.(), [])

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

	/** Goes on the element that wraps the rows, so the drag can find them. While a row is held
	    the list stops selecting text, which is what a pointer dragged across a list otherwise
	    does. */
	const listProps = {
		ref: listRef,
		style: held ? { userSelect: 'none', cursor: 'grabbing' } : undefined
	}

	/** Goes on each row. The held one leaves the flow and follows the pointer, raised on a card
	    with a shadow under it -- it is the thing being moved, so it is the thing that looks
	    picked up. */
	const rowProps = item => {
		if (draggingId !== item.id || !held) return { 'data-reorder-row': item.id }
		return {
			'data-reorder-row': item.id,
			'data-reorder-held': '',
			style: {
				position: 'fixed',
				left: Math.round(held.x - held.offsetX),
				top: Math.round(held.y - held.offsetY),
				/* Both are pinned, not just the width. A grid item that leaves the flow stops
				   being stretched by its track and collapses to its content -- the dashboard's
				   cards measured 439px in the row and 335px in the air, so the thing being
				   dragged was visibly smaller than the hole it came out of. */
				width: Math.round(held.width),
				height: Math.round(held.height),
				margin: 0,
				zIndex: 60,
				background: 'var(--bg-card)',
				borderRadius: 12,
				boxShadow: '0 18px 38px rgb(11 26 18 / .22)',
				cursor: 'grabbing'
			}
		}
	}

	/** The dashed box the row will drop into, at exactly the size it left behind. Rendered by
	    the host beside each row; it is null for every row but the held one. */
	const placeholder = item => (draggingId === item.id && held ? (
		<div data-reorder-slot="" aria-hidden="true"
			style={{
				height: Math.round(held.height),
				width: horizontalList() ? Math.round(held.width) : undefined,
				border: '2px dashed var(--green)',
				borderRadius: 12,
				background: 'rgb(20 172 114 / .06)',
				boxSizing: 'border-box'
			}} />
	) : null)

	/* Which way this list runs, for the placeholder's own sizing. The rows answer it, so a
	   list that is a column on a phone and a row on a desktop needs telling twice as often as
	   it needs asking. */
	const horizontalList = () => {
		const rows = [...(listRef.current?.querySelectorAll('[data-reorder-row]') ?? [])]
		if (rows.length < 2) return false
		const a = rows[0].getBoundingClientRect()
		const b = rows[1].getBoundingClientRect()
		return b.top < a.bottom - 1
	}

	/** The handle itself.

	    The stylesheet's `.item-row-grip` was written for a <span>, so it sets a colour and a
	    cursor and nothing else. This is a <button> -- it has to be, to be focusable and to
	    announce itself -- so the UA's border, background, padding and font are reset here
	    rather than in app.css, since no other element needs this reset and a rule for one
	    button is not a rule the shared stylesheet should carry. The `touch-action` is not
	    cosmetic: without it the first move gesture scrolls the page and the drag never
	    starts. */
	const handle = (item, index) => (
		<button type="button" data-reorder-handle={item.id}
			className={['item-row-grip', draggingId === item.id && 'is-dragging'].filter(Boolean).join(' ')}
			aria-label={`Reorder ${describe(item)}, ${index + 1} of ${items.length}. Drag, or use the arrow keys.`}
			onPointerDown={e => onPointerDown(e, index, item)}
			onKeyDown={e => onKeyDown(e, index, item)}>
			<Icon name="grip" />
		</button>
	)

	/** For a host with nowhere else to say it. Hosts that pass `onAnnounce` do not render this. */
	const liveRegion = onAnnounce
		? null
		: <p className="screenreader-only" role="status" aria-live="polite">{message}</p>

	return { listProps, rowProps, placeholder, handle, liveRegion, draggingId }
}
