import { Link } from 'react-router'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'

export function Shell({ collapsed = false, children, ...rest }) {
	reject(rest, 'Shell')
	let menu = null, topbar = null, content = null
	for (const child of [].concat(children ?? []).flat()) {
		if (!child || typeof child !== 'object') continue
		if (child.type === Sidebar) menu = child
		else if (child.type === TopBar) topbar = child
		else if (child.type === ShellContent) content = child
		else console.error('<Shell> takes Sidebar, TopBar and ShellContent - nothing else')
	}
	return (
		<div className={join('sp-shell', collapsed && 'sp-shell--collapsed')} {...rest}>
			{menu}
			<div className="sp-shell__page">
				{topbar}
				{content}
			</div>
		</div>
	)
}

export function TopBar({ touch = false, children, ...rest }) {
	reject(rest, 'TopBar')
	return <div className={join('sp-topbar', touch && 'sp-topbar--touch')} {...rest}>{children}</div>
}

const BODY = { default: null, split: 'sp-shell__body--split', rail: 'sp-shell__body--rail' }

export function ShellContent({ layout = 'default', children, ...rest }) {
	reject(rest, 'ShellContent')
	return <div className={join('sp-shell__body', pick(BODY, layout, 'layout', 'ShellContent'))} {...rest}>{children}</div>
}

const SIDEBAR = {
	default: null,
	rail: 'sp-sidebar--rail',
	peek: 'sp-sidebar--rail sp-sidebar--peek',
	'slide-in': 'sp-sidebar--slide-in',
	'slide-out': 'sp-sidebar--slide-out'
}

export function Sidebar({ variant = 'default', children, ...rest }) {
	reject(rest, 'Sidebar')
	return (
		<nav className={join('sp-sidebar', 'sp-scrolls', pick(SIDEBAR, variant, 'variant', 'Sidebar'))} {...rest}>
			{children}
		</nav>
	)
}

/** The product's own mark and name, as the menu's top block. */
export function SidebarBrand({ children, ...rest }) {
	reject(rest, 'SidebarBrand')
	return <div className="sp-sidebar__brand" {...rest}>{children}</div>
}

export function SidebarGroup({ children, ...rest }) {
	reject(rest, 'SidebarGroup')
	return <div className="sp-sidebar__group" {...rest}>{children}</div>
}

export function SidebarGrip({ expanded = true, onClick, ...rest }) {
	reject(rest, 'SidebarGrip')
	return (
		<button
			type="button"
			className="sp-sidebar__grip"
			aria-label={expanded ? 'Collapse the menu' : 'Expand the menu'}
			aria-expanded={expanded ? 'true' : 'false'}
			onClick={onClick}
			{...rest}
		/>
	)
}

/** The rule between the destinations and the pinned zone at the bottom. */
export function SidebarDivider(props) {
	reject(props, 'SidebarDivider')
	return <span className="sp-sidebar__divider" {...props} />
}

const NAV = { default: null, action: 'sp-nav-item--action', light: 'sp-nav-item--light', edited: 'sp-nav-item--edited' }

export function NavItem({ variant = 'default', icon, count, countColor, sub, current = false, to, onClick, children, ...rest }) {
	reject(rest, 'NavItem')
	const classes = join('sp-nav-item', pick(NAV, variant, 'variant', 'NavItem'))
	const body = (
		<>
			{icon ? <span className="sp-nav-item__icon"><Icon name={icon} /></span> : null}
			<span className="sp-grow">{children}</span>
			{sub ? <span className="sp-nav-item__sub">{sub}</span> : null}
			{count != null
				? <span className="sp-nav-item__count" {...(countColor ? { 'data-color': countColor } : {})}>{count}</span>
				: null}
		</>
	)
	const state = current ? { 'aria-current': 'page' } : {}
	if (to) return <Link className={classes} to={to} data-go={to} {...state}>{body}</Link>
	return <button type="button" className={classes} onClick={onClick} {...state}>{body}</button>
}

/** The dimmed page a sheet or a dialog sits over. It fills the frame it is in. */
export function Scrim({ dialog = false, children, ...rest }) {
	reject(rest, 'Scrim')
	return <div className={join('sp-scrim', dialog && 'sp-scrim--dialog')} {...rest}>{children}</div>
}

