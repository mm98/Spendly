import { useRef } from 'react'
import { Link } from 'react-router'
import { reject } from './variants.js'
import { Icon } from './Icon.jsx'

/** The surface's destinations, at the bottom where a thumb reaches; over a home bar band its items sit lower (brief 28). */
export function TabBar({ children, ...rest }) {
	reject(rest, 'TabBar')
	return <nav className="sp-tabbar sp-tabbar--band" {...rest}>{children}</nav>
}

/** One destination in that bar: a link when it has a `to`, since a destination navigates. */
export function TabBarItem({ icon, current = false, to, onClick, children, ...rest }) {
	reject(rest, 'TabBarItem')
	const body = <>{icon ? <Icon name={icon} size={18} /> : null}{children}</>
	const state = { ...(current ? { 'aria-current': 'page' } : {}), ...rest }
	if (to) return <Link className="sp-tabbar__item" to={to} data-go={to} onClick={onClick} {...state}>{body}</Link>
	return <button type="button" className="sp-tabbar__item" onClick={onClick} {...state}>{body}</button>
}

// how far the handle is pulled before a release closes the sheet, or how fast a short pull has to be
const CLOSE_PX = 96
const FLICK_PX_PER_MS = 0.5
// a press that moves less than this is a press, not a pull (c1)
const PULL_START_PX = 4

/** A sheet from the bottom edge (c13). Its handle dragged down far enough closes it and discards, as
    `onDismiss` or else a press on the dimmed page under it does; short of that it goes back. */
export function Sheet({ handle = true, onDismiss, ref, children, ...rest }) {
	reject(rest, 'Sheet')
	const box = useRef(null)
	const pull = useRef(null)
	const bind = el => {
		box.current = el
		if (typeof ref === 'function') ref(el)
		else if (ref) ref.current = el
	}
	const close = () => {
		if (onDismiss) return onDismiss()
		const under = box.current?.parentElement
		if (under?.classList.contains('sp-scrim')) under.click()
	}
	const grip = {
		onPointerDown: ev => {
			if (ev.button !== 0) return
			ev.currentTarget.setPointerCapture(ev.pointerId)
			pull.current = { y: ev.clientY, at: ev.timeStamp, by: 0 }
		},
		onPointerMove: ev => {
			const p = pull.current
			if (!p) return
			const by = Math.max(0, ev.clientY - p.y)
			if (!p.moving && by < PULL_START_PX) return
			p.moving = true
			p.by = by
			box.current.style.transition = 'none'
			box.current.style.transform = `translateY(${by}px)`
		},
		onPointerUp: ev => {
			const p = pull.current
			pull.current = null
			const sheet = box.current
			if (!p?.moving || !sheet) return
			const fast = p.by / Math.max(1, ev.timeStamp - p.at) > FLICK_PX_PER_MS
			sheet.style.removeProperty('transition')
			if (p.by >= Math.min(CLOSE_PX, sheet.offsetHeight / 3) || (fast && p.by > CLOSE_PX / 3)) close()
			else sheet.style.removeProperty('transform')
		},
		onPointerCancel: () => {
			pull.current = null
			box.current?.style.removeProperty('transition')
			box.current?.style.removeProperty('transform')
		}
	}
	return (
		<div className="sp-sheet" ref={bind} {...rest}>
			{handle ? <span className="sp-sheet__handle" {...grip} /> : null}
			{children}
		</div>
	)
}

export function SaveBar({ children, ...rest }) {
	reject(rest, 'SaveBar')
	return <div className="sp-savebar" {...rest}>{children}</div>
}

/** The one floating action (7a): New order, above the tab bar. Its label is required, since
    a glyph names nothing. */
export function Fab({ icon = 'plus', to, onClick, ...rest }) {
	reject(rest, 'Fab')
	if (!rest['aria-label']) console.error('<Fab> needs an aria-label: a glyph names nothing')
	if (to) return <Link className="sp-fab" to={to} data-go={to} {...rest}><Icon name={icon} size={24} /></Link>
	return <button type="button" className="sp-fab" onClick={onClick} {...rest}><Icon name={icon} size={24} /></button>
}
