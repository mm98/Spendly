import { Link } from 'react-router'
import { reject } from './variants.js'
import { Icon } from './Icon.jsx'

/** The surface's destinations, at the bottom where a thumb reaches. */
export function TabBar({ children, ...rest }) {
	reject(rest, 'TabBar')
	return <nav className="sp-tabbar" {...rest}>{children}</nav>
}

/** One destination in that bar: a link when it has a `to`, since a destination navigates. */
export function TabBarItem({ icon, current = false, to, onClick, children, ...rest }) {
	reject(rest, 'TabBarItem')
	const body = <>{icon ? <Icon name={icon} size={18} /> : null}{children}</>
	const state = { ...(current ? { 'aria-current': 'page' } : {}), ...rest }
	if (to) return <Link className="sp-tabbar__item" to={to} data-go={to} onClick={onClick} {...state}>{body}</Link>
	return <button type="button" className="sp-tabbar__item" onClick={onClick} {...state}>{body}</button>
}

export function Sheet({ handle = true, children, ...rest }) {
	reject(rest, 'Sheet')
	return (
		<div className="sp-sheet" {...rest}>
			{handle ? <span className="sp-sheet__handle" /> : null}
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
