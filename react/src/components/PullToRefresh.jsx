import { useEffect, useRef, useState } from 'react'

/* Pull down at the top of the page to reload it.

   The standard mobile gesture (Tweetie, 2008; UIRefreshControl since): drag past the top of the
   content, a spinner appears, and letting go reloads. This app needs it because a web app opened
   from the home screen has no browser chrome left to pull down for a reload.

   Three numbers keep it deliberate rather than accidental. Nothing at all happens until the
   finger has moved SLOP, so scrolling to the top is never intercepted; the page only reloads if
   the pull reached THRESHOLD; and it has to have been held MIN_HOLD_MS, so a fast flick that
   flies through the same distance scrolls instead of throwing the page away under the reader.

   The spinner fades in and turns with the pull, which is what makes a hidden gesture
   discoverable -- it shows its own progress before it commits to anything. Once it does commit
   it spins until the reload replaces the document, so it is never showing "done" early. */

const SLOP = 8
const THRESHOLD = 60
const MIN_HOLD_MS = 500

export function PullToRefresh({ children }) {
	const [pull, setPull] = useState(0)
	const [refreshing, setRefreshing] = useState(false)
	/* The gesture lives entirely in a ref: it is read and written from listeners that are
	   attached once, so state here would only ever be stale. `pull` is the render of it. */
	const drag = useRef(null)
	const done = useRef(false)

	useEffect(() => {
		const atTop = () => (document.scrollingElement?.scrollTop ?? 0) <= 0

		const onStart = e => {
			if (done.current || e.touches.length !== 1 || !atTop()) return
			const t = e.touches[0]
			drag.current = { x: t.clientX, y: t.clientY, pulling: false, since: 0, distance: 0 }
		}

		const onMove = e => {
			const d = drag.current
			if (!d) return
			const dx = e.touches[0].clientX - d.x
			const dy = e.touches[0].clientY - d.y
			if (!d.pulling) {
				if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return
				/* Sideways, or upward -- an ordinary scroll. Drop the gesture without touching
				   the event, so the page scrolls exactly as it always did. */
				if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) { drag.current = null; return }
				d.pulling = true
				d.since = Date.now()
			}
			/* Taking the gesture over: this is the first moment a pull and a scroll differ. */
			e.preventDefault()
			/* Halved, uncapped -- the page trails the finger instead of tracking it. No ceiling
			   of our own: iOS already rubber-bands the overscroll itself, so a second, JS-side
			   limit only fights the one the platform already applies. */
			d.distance = dy / 2
			setPull(d.distance)
		}

		const onEnd = () => {
			const d = drag.current
			drag.current = null
			if (!d?.pulling) return
			if (d.distance < THRESHOLD || Date.now() - d.since < MIN_HOLD_MS) { setPull(0); return }
			done.current = true
			setRefreshing(true)
			setPull(THRESHOLD)
			/* One beat for the spinner to paint before the reload blocks the main thread --
			   without it the gesture ends looking like nothing happened. It keeps spinning from
			   there until the new document replaces this one. */
			setTimeout(() => window.location.reload(), 150)
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
	}, [])

	/* No transition under a moving finger -- that would lag the page a frame behind the touch.
	   Released, the same properties ease, which is the snap back. */
	const dragging = pull > 0 && !refreshing
	const ease = dragging ? 'none' : 'transform .2s ease, opacity .2s ease'

	return (
		<>
			<div className="pull-to-refresh-indicator" aria-hidden={!pull}
				style={{
					transform: `translateX(-50%) translateY(${pull * 0.4}px)`,
					opacity: Math.min(pull / THRESHOLD, 1),
					transition: ease
				}}>
				{/* The turn is inline while dragging and a CSS animation once refreshing, so the
				    two never fight over the same property. */}
				<span className={['pull-to-refresh-spinner', refreshing && 'is-spinning'].filter(Boolean).join(' ')}
					style={refreshing ? undefined : { transform: `rotate(${pull * 4}deg)` }} />
			</div>
			<div style={{ transform: pull ? `translateY(${pull}px)` : undefined, transition: ease }}>
				{children}
			</div>
		</>
	)
}
