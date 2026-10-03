import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'
import { Fab, TabBar } from './Touch.jsx'
import { SearchInput } from './Inputs.jsx'
import { Kbd } from './Utilities.jsx'
import { Button } from './Button.jsx'

/** Whether the page sits in the touch shell: what a part that changes its form on touch reads. */
export const ShellTouch = createContext(false)

/** `viewport` fills the window; `touch` is the shell below 640: top bar, content, tab bar, one
    floating action. `cover` owns the whole touch screen (7b's search), the page mounted under it. */
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
	// sheets, dialogs and the viewer render on the body, so the touch sizes have to reach it too
	useEffect(() => {
		if (!touch) return
		document.body.classList.add('sp-touch')
		return () => document.body.classList.remove('sp-touch')
	}, [touch])
	/* Both shapes keep the page in the same slot of the same tree, so crossing 640 re-styles
	   the page rather than mounting it again and losing what the reader had not saved. */
	return (
		<ShellTouch.Provider value={touch}>
			<div className={touch ? 'sp-shell--touch sp-touch' : join('sp-shell', collapsed && 'sp-shell--collapsed', viewport && 'sp-shell--viewport')} {...rest}>
				{touch ? null : menu}
				<div className="sp-shell__page" hidden={touch && !!cover}>
					{topbar}
					{content}
				</div>
				{touch && cover ? <div className="sp-shell__page">{cover}</div> : null}
				{touch && !cover ? fab : null}
				{touch && !cover ? tabbar : null}
			</div>
		</ShellTouch.Provider>
	)
}

export function TopBar({ touch = false, children, ...rest }) {
	reject(rest, 'TopBar')
	return <div className={join('sp-topbar', touch && 'sp-topbar--touch')} {...rest}>{children}</div>
}

const BODY = { default: null, split: 'sp-shell__body--split', rail: 'sp-shell__body--rail' }

export function ShellContent({ layout = 'default', children, ...rest }) {
	reject(rest, 'ShellContent')
	return <main className={join('sp-shell__body', pick(BODY, layout, 'layout', 'ShellContent'))} {...rest}>{children}</main>
}

const SIDEBAR = {
	default: null,
	rail: 'sp-sidebar--rail',
	peek: 'sp-sidebar--rail sp-sidebar--peek',
	'slide-in': 'sp-sidebar--slide-in',
	'slide-out': 'sp-sidebar--slide-out'
}

const MOTION = { in: 'sp-sidebar--slide-in', out: 'sp-sidebar--slide-out' }

/** `motion` runs the labels in as the column opens, or out before it closes (9i). */
export function Sidebar({ variant = 'default', motion, children, ...rest }) {
	reject(rest, 'Sidebar')
	return (
		<nav className={join('sp-sidebar', 'sp-scrolls', pick(SIDEBAR, variant, 'variant', 'Sidebar'), motion && pick(MOTION, motion, 'motion', 'Sidebar'))} {...rest}>
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
			{/* a light row holds its current, bold label's room in every state, as Segmented does */}
			{variant === 'light' && typeof children === 'string'
				? <span className="sp-grow" data-label={children}><span>{children}</span></span>
				: <span className="sp-grow">{children}</span>}
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

/** The account at the sidebar's foot (9c). `menu` shows while `expanded`, fixed to the window so the
    sidebar cannot clip it; `onDismiss` is a press outside both, Escape or Tab. */
export function SidebarAccount({ name, email, expanded = false, onClick, onDismiss, menu, tip, ...rest }) {
	reject(rest, 'SidebarAccount')
	const [hint, tipEvents] = useTip(expanded ? null : tip)
	const block = useRef(null)
	const panel = useRef(null)
	// which end of the menu an arrow on the closed button asked for (c9: Up opens on the last item)
	const end = useRef('first')
	const [at, setAt] = useState(null)
	useLayoutEffect(() => {
		if (!expanded) { setAt(null); return }
		const place = () => {
			const r = block.current.getBoundingClientRect()
			const side = !!block.current.closest('.sp-shell--collapsed .sp-sidebar:not(.sp-sidebar--peek), .sp-sidebar--rail:not(.sp-sidebar--peek)')
			setAt({ side, left: r.left, top: r.top, width: r.width, height: r.height })
		}
		place()
		window.addEventListener('resize', place)
		return () => window.removeEventListener('resize', place)
	}, [expanded])
	const shown = !!at
	useEffect(() => {
		if (!shown) return
		const items = panel.current?.querySelectorAll('.sp-menu__item:not(:disabled)') ?? []
		;(end.current === 'last' ? items[items.length - 1] : items[0])?.focus()
		end.current = 'first'
		const away = ev => {
			if (!block.current?.contains(ev.target) && !panel.current?.contains(ev.target)) onDismiss?.()
		}
		document.addEventListener('pointerdown', away)
		return () => document.removeEventListener('pointerdown', away)
	}, [shown, onDismiss])
	const keys = ev => {
		const items = [...panel.current.querySelectorAll('.sp-menu__item:not(:disabled)')]
		const i = items.indexOf(document.activeElement)
		if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
			ev.preventDefault()
			items[(i + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
		} else if (ev.key === 'Escape' || ev.key === 'Tab') {
			// Tab goes on from the block, where the menu sits in the reading order
			if (ev.key === 'Escape') ev.preventDefault()
			block.current?.focus()
			onDismiss?.()
		}
	}
	const split = email.lastIndexOf('@')
	const address = (
		<span className="sp-nav-item__sub sp-nav-item__sub--email">
			<span className="sp-nav-item__local">{split > 0 ? email.slice(0, split) : email}</span>
			{split > 0 ? <span className="sp-nav-item__domain">{email.slice(split)}</span> : null}
		</span>
	)
	return (
		<>
			<button type="button" className="sp-nav-item" ref={block} onClick={onClick} aria-haspopup="menu"
				aria-expanded={expanded ? 'true' : 'false'} {...tipEvents}
				onKeyDown={ev => {
					if (expanded || (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp')) return
					ev.preventDefault()
					end.current = ev.key === 'ArrowUp' ? 'last' : 'first'
					onClick?.(ev)
				}}
				{...rest}>
				<Mark size="medium" fill="solid">{name || (split > 0 ? email.slice(0, split) : email)}</Mark>
				<span className="sp-stack sp-grow">
					{name ? <span className="sp-truncate">{name}</span> : null}
					{address}
				</span>
				<span className="sp-combobox__chevron"><Icon name="chevron-up" size={14} /></span>
				{hint}
			</button>
			{at && menu
				? createPortal(
					<div ref={panel} className={join('sp-sidebar__menu', at.side ? 'sp-sidebar__menu--side' : 'sp-sidebar__menu--up')}
						style={{ left: at.left, top: at.top, width: at.width, height: at.height }} onKeyDown={keys}>
						{menu}
					</div>,
					document.body)
				: null}
		</>
	)
}

/* The rail's label where [data-tip] draws it, but fixed to the window so the sidebar's scroll cannot
   clip it, and held inside the window's edge. Only its position is set here. */
function useTip(tip) {
	const [at, setAt] = useState(null)
	const box = useRef(null)
	useEffect(() => { if (!tip) setAt(null) }, [tip])
	useLayoutEffect(() => {
		const el = box.current
		if (!at || !el) return
		const edge = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sp-8'))
		const half = el.offsetWidth / 2
		const left = Math.min(Math.max(at.left, edge + half), window.innerWidth - edge - half)
		if (left !== at.left) setAt({ ...at, left })
	}, [at])
	if (!tip) return [null, {}]
	const show = ev => {
		const r = ev.currentTarget.getBoundingClientRect()
		setAt({ left: r.left + r.width / 2, top: r.top })
	}
	const hide = () => setAt(null)
	const hint = at
		? createPortal(<span ref={box} className="sp-tip sp-tip--float" role="tooltip" style={{ left: at.left, top: at.top }}>{tip}</span>, document.body)
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
    fills a phone (7b): the search field with `onCancel` beside it, rows without figures or keys. */
export function Palette({ screen = false, value, onChange, onCancel, count, activeId, inputRef, placeholder, label, foot, children, ...rest }) {
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
						? (
							<>
								<SearchInput value={value} onChange={onChange} inputRef={inputRef} placeholder={placeholder} {...term} />
								{onCancel ? <Button variant="text" onClick={onCancel}>Cancel</Button> : null}
							</>
						)
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

/** One record or one action. `icon` or `thumb` leads it (a small mark on a phone, filled for an
    `action`), `match` is marked in the name, `value` and `kbd` end it; a phone drops both (7b). */
export function PaletteRow({ icon, thumb = false, plain = false, action = false, match, meta, value, kbd, selected = false, children, ...rest }) {
	reject(rest, 'PaletteRow')
	const screen = useContext(PaletteScreen)
	const trail = !screen && (value != null || kbd)
	let lead = null
	if (thumb) lead = <span className="sp-palette__thumb" aria-hidden="true" />
	else if (icon && screen) lead = <Mark size="small" fill={action ? 'solid' : 'none'} aria-hidden="true" aria-label={icon}><Icon name={icon} size={14} /></Mark>
	else if (icon) lead = <span className="sp-palette__icon"><Icon name={icon} size={15} /></span>
	return (
		<button type="button" className="sp-palette__row" role="option" aria-selected={selected ? 'true' : 'false'} tabIndex={-1} {...rest}>
			{lead}
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

