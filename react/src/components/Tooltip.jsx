import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** The app's one hover label: a rectangle to point at, words to say. Drawn into `document.body`,
    since a caller that scrolls or rounds its corners cuts it off. Sides tried in this order. */
const SIDES = ['n', 's', 'e', 'w']

const positions = (anchor, tip) => ({
	n: { left: anchor.left + anchor.width / 2 - tip.width / 2, top: anchor.top - tip.height - tip.gap },
	s: { left: anchor.left + anchor.width / 2 - tip.width / 2, top: anchor.bottom + tip.gap },
	e: { left: anchor.right + tip.gap, top: anchor.top + anchor.height / 2 - tip.height / 2 },
	w: { left: anchor.left - tip.width - tip.gap, top: anchor.top + anchor.height / 2 - tip.height / 2 }
})

/* How far the label would sit inside the viewport on that side -- negative means it hangs off
   the edge. The larger number is the better side when every one of them is negative. */
const roomOn = (side, at, tip, view) => Math.min(
	side === 'n' || side === 's' ? Math.min(at.top, view.height - at.top - tip.height) : view.height,
	side === 'e' || side === 'w' ? Math.min(at.left, view.width - at.left - tip.width) : view.width
)

function place(anchor, tip, view) {
	const all = positions(anchor, tip)
	const fits = SIDES.find(side => {
		const at = all[side]
		return at.top >= 0 && at.left >= 0
			&& at.top + tip.height <= view.height && at.left + tip.width <= view.width
	})
	const side = fits ?? SIDES.reduce((best, s) =>
		roomOn(s, all[s], tip, view) > roomOn(best, all[best], tip, view) ? s : best)
	const at = all[side]
	/* Sliding along the free axis keeps a label beside its anchor when a corner leaves no side
	   with room -- the alternative is one that points at nothing. */
	return {
		left: Math.max(tip.gap, Math.min(at.left, view.width - tip.width - tip.gap)),
		top: Math.max(tip.gap, Math.min(at.top, view.height - tip.height - tip.gap)),
		side
	}
}

export function Tooltip({ anchor, title, children }) {
	const ref = useRef(null)
	const [tip, setTip] = useState(null)

	/* The offset is --gap-tooltip on the element itself, so the stylesheet owns the spacing and
	   this file owns only which side it goes on. */
	useLayoutEffect(() => {
		const node = ref.current
		if (!node) return
		const { offsetWidth: width, offsetHeight: height } = node
		const gap = parseFloat(getComputedStyle(node).getPropertyValue('--gap-tooltip')) || 0
		setTip(was => (was?.width === width && was?.height === height && was?.gap === gap
			? was
			: { width, height, gap }))
	}, [anchor, title, children])

	if (!anchor) return null
	const view = { width: window.innerWidth, height: window.innerHeight }
	const at = tip ? place(anchor, tip, view) : null

	return createPortal(
		<span ref={ref} role="tooltip" className="tooltip tooltip-floating"
			data-side={at?.side}
			/* Measured before it is placed, so the first frame would otherwise land at 0,0. */
			style={at ? { left: at.left, top: at.top } : { left: 0, top: 0, visibility: 'hidden' }}>
			{title ? <span className="tooltip-title">{title}</span> : null}
			{children}
		</span>,
		document.body
	)
}
