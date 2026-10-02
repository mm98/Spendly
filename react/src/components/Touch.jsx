import { Link } from 'react-router'
import { reject } from './variants.js'
import { Icon } from './Icon.jsx'

/** The surface's destinations, at the bottom where a thumb reaches. */
export function TabBar({ children, ...rest }) {
	reject(rest, 'TabBar')
	return <nav className="sp-tabbar" {...rest}>{children}</nav>
}

/** One destination in that bar. */
export function TabBarItem({ icon, current = false, onClick, children, ...rest }) {
	reject(rest, 'TabBarItem')
	return (
		<button
			type="button"
			className="sp-tabbar__item"
			onClick={onClick}
			{...(current ? { 'aria-current': 'page' } : {})}
			{...rest}
		>
			{icon ? <Icon name={icon} /> : null}
			<span>{children}</span>
		</button>
	)
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
