import { useEffect, useRef, useState } from 'react'

/* On a touchscreen there is no browser chrome to pull down for a reload, so this is the one
   that stands in for it: hold a downward drag from the top of the page and it reloads, same
   as tapping refresh in a browser tab -- nothing here re-asks the API on the page's behalf,
   it just reloads the document.

   Below the DRAG_SLOP a touch is left alone entirely, so an ordinary scroll to the top is
   never intercepted -- only a drag that continues past it, at scroll position 0, is read as a
   pull. And reaching the distance is not enough on its own: MIN_HOLD_MS is what "pull should
   require a bit of effort" means here, so a fast flick that happens to cross the distance
   while flying past does not reload the page underneath the reader. */

const THRESHOLD = 60
const MAX_PULL = 90
const DRAG_SLOP = 8
const MIN_HOLD_MS = 300

export function PullToRefresh({ children }) {
	const [distance, setDistance] = useState(0)
	const [spinning, setSpinning] = useState(false)
	const touch = useRef(null)
	/* onEnd is one closure for the life of the gesture, and it has to read the distance at the
	   very end of the drag -- well after the render that last set it -- so a ref mirrors the
	   state rather than the effect closing over a stale value from when it was attached. */
	const distanceRef = useRef(distance)
	distanceRef.current = distance

	useEffect(() => {
		const atTop = () => (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0

		const onStart = e => {
			if (spinning || e.touches.length !== 1 || !atTop()) return
			const t = e.touches[0]
			touch.current = { x: t.clientX, y: t.clientY, dragging: false, since: 0 }
		}

		const onMove = e => {
			const t = touch.current
			if (!t) return
			const point = e.touches[0]
			const dy = point.clientY - t.y
			const dx = point.clientX - t.x
			if (!t.dragging) {
				if (Math.abs(dy) < DRAG_SLOP && Math.abs(dx) < DRAG_SLOP) return
				/* Sideways, or upward (scrolling toward the top the normal way): not a pull.
				   Bail without touching the event so the page's own scrolling handles it. */
				if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) { touch.current = null; return }
				t.dragging = true
				t.since = Date.now()
			}
			if (!atTop()) { touch.current = null; setDistance(0); return }
			/* Committed: this is the point a normal scroll and a pull diverge, so this is the
			   latest it can wait to take over the gesture. */
			e.preventDefault()
			setDistance(Math.min(dy * 0.5, MAX_PULL))
		}

		const onEnd = () => {
			const t = touch.current
			touch.current = null
			if (!t?.dragging) return
			const held = Date.now() - t.since
			if (distanceRef.current >= THRESHOLD && held >= MIN_HOLD_MS) {
				setSpinning(true)
				setDistance(THRESHOLD)
				/* The spinner gets a beat on screen before the reload tears the page down --
				   otherwise the gesture registers as nothing happening at all. */
				setTimeout(() => window.location.reload(), 250)
				return
			}
			setDistance(0)
		}

		document.addEventListener('touchstart', onStart, { passive: true })
		document.addEventListener('touchmove', onMove, { passive: false })
		document.addEventListener('touchend', onEnd, { passive: true })
		document.addEventListener('touchcancel', onEnd, { passive: true })
		return () => {
			document.removeEventListener('touchstart', onStart)
			document.removeEventListener('touchmove', onMove)
			document.removeEventListener('touchend', onEnd)
			document.removeEventListener('touchcancel', onEnd)
		}
	}, [spinning])

	const live = distance > 0 && !spinning
	return (
		<>
			<div className="pull-to-refresh-indicator" aria-hidden={distance === 0}
				style={{ opacity: Math.min(distance / THRESHOLD, 1), transition: live ? 'none' : 'opacity .2s ease' }}>
				<span className={['pull-to-refresh-spinner', spinning && 'is-spinning'].filter(Boolean).join(' ')} />
			</div>
			<div style={{ transform: distance ? `translateY(${distance}px)` : undefined, transition: live ? 'none' : 'transform .2s ease' }}>
				{children}
			</div>
		</>
	)
}
