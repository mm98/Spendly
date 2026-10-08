import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'

/* The page's own furniture: the shell it sits in, the sidebar, the bars that commit
   and the bars that act on a selection.

   The shell is a grid of two tracks, and collapsing it is a track width rather than
   an animation - a grid track that animates reflows every card beside it on every
   frame. The sidebar's rail is the same sidebar at its narrow width, and peeking is
   the rail showing its labels over the page rather than pushing it. */

/**
 * @param {object} props
 * @param {boolean} [props.collapsed] The menu is a rail: 68px, icons only, every
 *   label a tooltip. Collapsing is the track's width and not an animation - an
 *   animated grid track reflows every card beside it on every frame.
 * @param {React.ReactNode} props.children Sidebar, TopBar and ShellContent,
 *   in any order - the shell reads which is which and places them, so the top bar
 *   cannot end up inside the content.
 *
 * Takes no `className` and no `style`.
 */
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

/** The bar above the page: the search, and anything else that belongs to the whole
    screen rather than to what is on it. A sibling of the content, never inside it.

    One bar, on a desktop shell and on a phone. It was two exports - `ShellTopbar`
    here and `PhoneTopBar` in Phone.jsx - rendering the same `.sp-topbar` and
    differing only in `touch` being hardcoded off in one of them. A caller reading
    the export list could not tell them apart, because at the call site there was
    nothing to tell apart: the difference is `touch`, so `touch` is the prop. */
export function TopBar({ touch = false, children, ...rest }) {
	reject(rest, 'TopBar')
	return <div className={join('sp-topbar', touch && 'sp-topbar--touch')} {...rest}>{children}</div>
}

const BODY = { default: null, split: 'sp-shell__body--split', rail: 'sp-shell__body--rail' }

/**
 * The page's body inside the shell.
 *
 * @param {object} props
 * @param {'default'|'split'|'rail'} [props.layout] `rail` puts a facet rail before
 *   the content, `split` puts a panel after it.
 */
export function ShellContent({ layout = 'default', children, ...rest }) {
	reject(rest, 'ShellContent')
	return <div className={join('sp-shell__body', pick(BODY, layout, 'layout', 'ShellContent'))} {...rest}>{children}</div>
}

/* peek is the rail opened over the page, so it carries both names: the rail rules
   are what make it a rail, and --peek is what exempts it from losing its labels and
   lets it float. One without the other is half a state. */
const SIDEBAR = {
	default: null,
	rail: 'sp-sidebar--rail',
	peek: 'sp-sidebar--rail sp-sidebar--peek',
	'slide-in': 'sp-sidebar--slide-in',
	'slide-out': 'sp-sidebar--slide-out'
}

/**
 * @param {object} props
 * @param {'default'|'rail'|'peek'|'slide-in'|'slide-out'} [props.variant] `rail` is
 *   the same sidebar at its narrow width; `peek` shows its labels over the page
 *   rather than pushing it.
 * @param {React.ReactNode} props.children A SidebarBrand, then NavItems,
 *   SidebarGroup titles, SidebarDividers and a SidebarGrip, all as direct
 *   children - the menu's column is what spaces them, so nothing may sit between it
 *   and a row.
 */
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

/**
 * The title that starts a group - "Orders", "Settings". It is a title and not a
 * wrapper: the rows are the sidebar's own children, sitting directly in its column,
 * because that column is what holds them --sp-6 apart and what keeps every row's
 * padding equal. Wrapping them in anything takes both away - they inherit the
 * title's side padding and lose the gap, so a selected row touches the one below it.
 */
export function SidebarGroup({ children, ...rest }) {
	reject(rest, 'SidebarGroup')
	return <div className="sp-sidebar__group" {...rest}>{children}</div>
}

/**
 * The grip on the menu's right edge, and the only thing that collapses it. Its
 * aria-expanded is the menu's state, so a reader is told what the bar will do
 * rather than having to try it.
 *
 * @param {object} props
 * @param {boolean} props.expanded
 * @param {() => void} props.onClick
 */
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

/**
 * A destination, or the action at the menu's foot.
 *
 * @param {object} props
 * @param {'default'|'action'|'light'|'edited'} [props.variant] `light` is the same
 *   row on a light ground - a sheet, a phone's menu. `edited` marks a saved view
 *   whose filters have been changed since it was saved.
 * @param {string} [props.icon] An Icon name. It sits in a fixed slot, so every
 *   label starts on one line.
 * @param {React.ReactNode} [props.count] The records behind the row.
 * @param {'warning'} [props.countColor] A count that is a backlog.
 * @param {React.ReactNode} [props.sub] A second line - the account row's address.
 * @param {boolean} [props.current] The page the reader is on.
 * @param {string} [props.to]
 * @param {() => void} [props.onClick]
 */
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
	if (to) return <a className={classes} href={to} data-go={to} {...state}>{body}</a>
	return <button type="button" className={classes} onClick={onClick} {...state}>{body}</button>
}

/** The dimmed page a sheet or a dialog sits over. It fills the frame it is in. */
export function Scrim({ dialog = false, children, ...rest }) {
	reject(rest, 'Scrim')
	return <div className={join('sp-scrim', dialog && 'sp-scrim--dialog')} {...rest}>{children}</div>
}

