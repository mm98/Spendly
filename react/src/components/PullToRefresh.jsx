import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon.jsx'
import { refreshAll } from '../api/useApi.js'

/* Pulling down at the top of the page and letting go, the gesture an iOS list answers by
   asking for what it is showing again. It wraps the sub-tab band and the sheet -- everything
   under the sticky top bar -- and translates that content down as the reader pulls, so the
   spinner surfaces from behind the bar the way a native one does rather than sitting drawn on
   the page at all times. README: Chrome. */

const THRESHOLD = 64
const MAX_PULL = 96
const DRAG_SLOP = 6
const SPIN_MS = 700

export function PullToRefresh({ children }) {
	const [phase, setPhase] = useState('idle') // idle | pulling | armed | refreshing
	const [distance, setDistance] = useState(0)
	const touch = useRef(null)
	const phaseRef = useRef(phase)
	phaseRef.current = phase

	useEffect(() => {
		/* Checked fresh on every touch rather than gating the whole effect once at mount --
		   `(pointer: coarse)` is what every other mobile-only rule in the stylesheet keys off
		   (see CLAUDE.md, "the locale is the harness's to name"), and an external keyboard or
		   a folded tablet can change which pointer is in use without the component remounting. */
		const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches
		const atTop = () => (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0

		const onStart = e => {
			if (phaseRef.current === 'refreshing' || e.touches.length !== 1) return
			if (!isTouchDevice() || !atTop()) return
			const t = e.touches[0]
			touch.current = { x: t.clientX, y: t.clientY, dragging: false }
		}

		const onMove = e => {
			const t = touch.current
			if (!t) return
			const point = e.touches[0]
			const dy = point.clientY - t.y
			const dx = point.clientX - t.x
			if (!t.dragging) {
				/* Under the slop, or more sideways than down, or already scrolling up: not a pull.
				   Letting go here rather than committing on the first pixel is what keeps a swipe
				   meant for something else (a horizontal scroller, an upward scroll) from being
				   read as one. */
				if (Math.abs(dy) < DRAG_SLOP && Math.abs(dx) < DRAG_SLOP) return
				if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) { touch.current = null; return }
				t.dragging = true
			}
			if (!atTop()) { touch.current = null; setPhase('idle'); setDistance(0); return }
			/* Only once the gesture is a committed downward pull at the top: this is what stops
			   the browser's own full-page pull-to-refresh from firing alongside ours, and it is
			   deliberately not called any earlier -- an upward scroll or a sideways swipe must
			   reach the page untouched. */
			e.preventDefault()
			/* Resistance: the indicator travels slower than the finger, and stops well short of
			   the screen edge, the same rubber-band a native list gives a pull past its content. */
			const pulled = Math.min(dy * 0.45, MAX_PULL)
			setDistance(pulled)
			setPhase(pulled >= THRESHOLD ? 'armed' : 'pulling')
		}

		const onEnd = () => {
			const t = touch.current
			touch.current = null
			if (!t?.dragging) return
			if (phaseRef.current !== 'armed') { setPhase('idle'); setDistance(0); return }
			setPhase('refreshing')
			setDistance(THRESHOLD)
			refreshAll()
			setTimeout(() => { setPhase('idle'); setDistance(0) }, SPIN_MS)
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

	const spinning = phase === 'refreshing'
	/* No transition while a finger is actually moving the indicator -- that would lag the drag
	   a frame behind the touch. Released (idle, armed-and-settling, or spinning back to rest),
	   the same two properties ease instead of jumping, which is the snap a native pull gives. */
	const live = phase === 'pulling' || phase === 'armed'
	const transition = live ? 'none' : 'transform .25s ease, opacity .25s ease'
	return (
		<div className="pull-to-refresh">
			<div className={['pull-to-refresh-indicator', spinning && 'is-spinning'].filter(Boolean).join(' ')}
				aria-hidden={phase === 'idle'}
				style={{
					transform: `translate(-50%, ${distance - 36}px)` + (spinning ? '' : ` rotate(${distance * 3}deg)`),
					opacity: Math.min(distance / THRESHOLD, 1),
					transition: spinning ? undefined : transition
				}}>
				<Icon name="refresh" />
			</div>
			<div className="pull-to-refresh-content" aria-busy={spinning || undefined}
				style={{ transform: distance ? `translateY(${distance}px)` : undefined, transition }}>
				{children}
			</div>
		</div>
	)
}
