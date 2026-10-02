import { createContext, useContext, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'
import { Fab, TabBar } from './Touch.jsx'
import { SearchInput } from './Inputs.jsx'
import { Kbd } from './Utilities.jsx'

/** `viewport` fills the browser window where the drawn shell is a framed one; `touch` is the
    shell below 640 - top bar, content, tab bar and the one floating action. `cover` is a
    surface that owns the whole touch screen (7b's search): the page stays mounted under it. */
export function Shell({ collapsed = false, viewport = false, touch = false, cover, children, ...rest }) {
	reject(rest, 'Shell')
	let menu = null, topbar = null, content = null, tabbar = null, fab = null
	for (const child of [].concat(children ?? []).flat()) {
		if (!child || typeof child !== 'object') continue
		if (child.type === Sidebar) menu = child
		else if (child.type === TopBar) topbar = child
		else if (child.type === ShellContent) content = child
		else if (child.type === TabBar) tabbar = child
		else if (child.type === Fab) fab = child
		else console.error('<Shell> takes Sidebar, TopBar, ShellContent, TabBar and Fab - nothing else')
	}
	if (touch) return (
		<div className="sp-shell--touch sp-touch" {...rest}>
			<div className="sp-shell__page" hidden={!!cover}>
				{topbar}
				{content}
			</div>
			{cover ? <div className="sp-shell__page">{cover}</div> : null}
			{cover ? null : fab}
			{cover ? null : tabbar}
		</div>
	)
	return (
		<div className={join('sp-shell', collapsed && 'sp-shell--collapsed', viewport && 'sp-shell--viewport')} {...rest}>
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

/** `tip` is the label shown while the row's own is hidden, on the rail; `control` is a Switch
    at the row's end, which makes the row its label. */
export function NavItem({ variant = 'default', icon, count, countColor, sub, current = false, to, onClick, tip, control, children, ...rest }) {
	reject(rest, 'NavItem')
	const [hint, tipEvents] = useTip(tip)
	const classes = join('sp-nav-item', pick(NAV, variant, 'variant', 'NavItem'))
	const body = (
		<>
			{icon ? <span className="sp-nav-item__icon"><Icon name={icon} /></span> : null}
			<span className="sp-grow">{children}</span>
			{sub ? <span className="sp-nav-item__sub">{sub}</span> : null}
			{count != null
				? <span className="sp-nav-item__count" {...(countColor ? { 'data-color': countColor } : {})}>{count}</span>
				: null}
			{control}
			{hint}
		</>
	)
	const state = { ...(current ? { 'aria-current': 'page' } : {}), ...tipEvents, ...rest }
	if (control) return <label className={classes} {...state}>{body}</label>
	if (to) return <Link className={classes} to={to} data-go={to} {...state}>{body}</Link>
	if (!onClick) return <span className={classes} {...state}>{body}</span>
	return <button type="button" className={classes} onClick={onClick} {...state}>{body}</button>
}

/** The account at the sidebar's foot: the mark, the name over the email, and the chevron
    of the menu it opens. The domain never truncates; the local part does. */
export function SidebarAccount({ name, email, expanded = false, onClick, tip, ...rest }) {
	reject(rest, 'SidebarAccount')
	const [hint, tipEvents] = useTip(tip)
	const at = email.lastIndexOf('@')
	const address = (
		<span className="sp-nav-item__sub sp-nav-item__sub--email">
			<span className="sp-nav-item__local">{at > 0 ? email.slice(0, at) : email}</span>
			{at > 0 ? <span className="sp-nav-item__domain">{email.slice(at)}</span> : null}
		</span>
	)
	return (
		<button type="button" className="sp-nav-item" onClick={onClick} aria-haspopup="menu"
			aria-expanded={expanded ? 'true' : 'false'} {...tipEvents} {...rest}>
			<Mark size="medium" fill="solid">{name || (at > 0 ? email.slice(0, at) : email)}</Mark>
			<span className="sp-stack sp-grow">
				{name ? <span className="sp-truncate">{name}</span> : null}
				{address}
			</span>
			<Icon name="chevron-up" />
			{hint}
		</button>
	)
}

/* The rail's label, drawn where [data-tip] draws it but fixed to the window, so the
   sidebar's own scrolling cannot clip it. Only its position is set here. */
function useTip(tip) {
	const [at, setAt] = useState(null)
	if (!tip) return [null, {}]
	const show = ev => {
		const r = ev.currentTarget.getBoundingClientRect()
		setAt({ left: r.left + r.width / 2, top: r.top })
	}
	const hide = () => setAt(null)
	const hint = at
		? createPortal(<span className="sp-tip sp-tip--float" role="tooltip" style={{ left: at.left, top: at.top }}>{tip}</span>, document.body)
		: null
	return [hint, { onMouseEnter: show, onMouseLeave: hide, onFocus: show, onBlur: hide }]
}

/** The dimmed page a sheet or a dialog sits over. It fills the frame it is in. */
export function Scrim({ dialog = false, children, ...rest }) {
	reject(rest, 'Scrim')
	return <div className={join('sp-scrim', dialog && 'sp-scrim--dialog')} {...rest}>{children}</div>
}

/* ---------- command palette (c24) ---------- */

const PaletteScreen = createContext(false)

/** The command palette (c24): query line, results as one listbox, keys at its foot. `screen`
    fills a phone (7b): the query line is the search field and rows drop figures and key caps. */
export function Palette({ screen = false, value, onChange, count, activeId, inputRef, placeholder, label, foot, children, ...rest }) {
	reject(rest, 'Palette')
	const list = useId()
	const term = {
		role: 'combobox',
		'aria-expanded': 'true',
		'aria-controls': list,
		'aria-label': label,
		...(activeId ? { 'aria-activedescendant': activeId } : {})
	}
	return (
		<PaletteScreen.Provider value={screen}>
			<div className={join('sp-palette', screen && 'sp-palette--screen')} role="dialog" aria-modal="true" {...rest}>
				<div className="sp-palette__search">
					{screen
						? <SearchInput value={value} onChange={onChange} inputRef={inputRef} placeholder={placeholder} {...term} />
						: (
							<>
								<span className="sp-palette__icon"><Icon name="search" /></span>
								<input ref={inputRef} className="sp-palette__term" type="search" value={value}
									onChange={ev => onChange?.(ev.target.value)} placeholder={placeholder} {...term} />
								{count ? <span className="sp-note" aria-live="polite">{count}</span> : null}
							</>
						)}
				</div>
				<div className="sp-palette__body" id={list} role="listbox" aria-label="Results">{children}</div>
				{!screen && foot?.length
					? <div className="sp-palette__foot">{foot.map(key => <span key={key}>{key}</span>)}</div>
					: null}
			</div>
		</PaletteScreen.Provider>
	)
}

/** The label over a group of rows. */
export function PaletteGroup({ children, ...rest }) {
	reject(rest, 'PaletteGroup')
	return <span className="sp-palette__group" role="presentation" {...rest}>{children}</span>
}

/** The rule between two groups. */
export function PaletteRule(props) {
	reject(props, 'PaletteRule')
	return <div className="sp-palette__rule" role="presentation" {...props} />
}

/* The typed text inside a name, at the start of a word where it sits at one, otherwise wherever
   it first appears: a Danish compound puts the match mid-word. */
function marked(text, match) {
	if (typeof text !== 'string' || !match) return text
	const hay = text.toLowerCase()
	const needle = match.toLowerCase()
	if (hay.length !== text.length) return text
	let at = -1
	for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + 1))
		if (i === 0 || /[\s\-/(]/.test(hay[i - 1])) { at = i; break }
	if (at < 0) at = hay.indexOf(needle)
	if (at < 0) return text
	return <>{text.slice(0, at)}<mark>{text.slice(at, at + needle.length)}</mark>{text.slice(at + needle.length)}</>
}

/** One record or one action. `icon` or `thumb` leads it, `match` is the typed text marked in the
    name, `value` the figure at its end and `kbd` an action's key; a phone drops both (7b). */
export function PaletteRow({ icon, thumb = false, plain = false, match, meta, value, kbd, selected = false, children, ...rest }) {
	reject(rest, 'PaletteRow')
	const screen = useContext(PaletteScreen)
	const trail = !screen && (value != null || kbd)
	return (
		<button type="button" className="sp-palette__row" role="option" aria-selected={selected ? 'true' : 'false'} tabIndex={-1} {...rest}>
			{thumb
				? <span className="sp-palette__thumb" aria-hidden="true" />
				: icon ? <span className="sp-palette__icon"><Icon name={icon} size={15} /></span> : null}
			{/* truncated, so a long name keeps the row one line and the list from scrolling sideways */}
			<span className={join('sp-palette__name', plain && 'sp-palette__name--plain', 'sp-truncate')}>{marked(children, match)}</span>
			{meta ? <span className="sp-meta sp-truncate">{meta}</span> : null}
			{trail ? <span className="sp-grow" /> : null}
			{trail && value != null ? <span className="sp-data">{value}</span> : null}
			{trail && kbd ? <Kbd>{kbd}</Kbd> : null}
		</button>
	)
}

/** The way from a group to the rest of its records, in their own list. */
export function PaletteAll({ selected = false, children, ...rest }) {
	reject(rest, 'PaletteAll')
	return (
		<button type="button" className="sp-palette__all" role="option" aria-selected={selected ? 'true' : 'false'} tabIndex={-1} {...rest}>
			{children}
		</button>
	)
}

