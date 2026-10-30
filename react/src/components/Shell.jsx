import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { EmailLine } from './EmailLine.jsx'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Mark, initialsOf } from './Mark.jsx'
import { Fab, TabBar } from './Touch.jsx'
import { SearchInput } from './Inputs.jsx'
import { Kbd } from './Utilities.jsx'
import { PRESENCE, animate, glide, m, slideLabels, useGoing, useRow, useStill } from './motion.js'
import { Reorder, itemOf, useMovingRow } from './Reorder.jsx'
import { Button } from './Button.jsx'
import { usePhrase } from '../language/phrases.js'

/* The current row's ground, by kind (the dark sidebar, the light lists): the row it was last drawn on and
   where on that row, kept as it leaves so the next ground starts there. Both rows are read at one moment,
   so a page scroll, the menu's own scroll or a page drawn in between never reads as movement. */
const grounds = new Map()

function NavGround({ kind }) {
	const ground = useRef(null)
	const still = useStill()
	useLayoutEffect(() => {
		const el = ground.current
		const row = el.parentElement
		const last = grounds.get(kind)
		// a ground slides only inside one box of rows: the menu's scrolling region clips what comes from outside
		// it and grows a scroll bar for it, and another page's list is another place
		const list = r => r.closest('.sp-scrolls, .sp-nav-list')
		if (!still && last && last.row !== row && last.row.isConnected && list(last.row) === list(row)) {
			const from = last.row.getBoundingClientRect()
			const to = row.getBoundingClientRect()
			animate(el, { y: [from.top + last.top - to.top, 0], scaleY: [last.height / to.height, 1] }, glide())
		}
		return () => {
			const r = row.getBoundingClientRect()
			const g = el.getBoundingClientRect()
			grounds.set(kind, { row, top: g.top - r.top, height: g.height })
		}
	}, [kind, still])
	return <span ref={ground} className="sp-marker" aria-hidden="true" />
}

/** Whether the page sits in the touch shell: what a part that changes its form on touch reads. */
export const ShellTouch = createContext(false)
// on a phone, the top bar's slot: a selection bar takes it, edge to edge (c11, c12)
export const ShellHead = createContext(null)
// whether the menu is the narrow rail, where a row's words are hidden and the row has to carry its name
const SidebarRail = createContext(false)

/** `viewport` fills the window; `touch` is the shell below 640: top bar, content, tab bar, one
    floating action. `cover` owns the whole touch screen (7b's search), the page mounted under it.
    @param {object} props
    @param {boolean} [props.collapsed] The menu is a rail: 68px, icons only, every label a tooltip.
    @param {boolean} [props.viewport] Fill the window.
    @param {boolean} [props.touch] The phone form: top bar, content, tab bar and one round button.
    @param {import('react').ReactNode} [props.cover] A part that covers the whole phone screen, such as the search, with the page kept under it.
    @param {import('react').ReactNode} [props.children] The Sidebar, the TopBar and the ShellContent, in any order. */
export function Shell({ collapsed = false, viewport = false, touch = false, cover, children, ...rest }) {
	const [head, setHead] = useState(null)
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
		<SidebarRail.Provider value={!touch && collapsed}>
		<ShellHead.Provider value={touch ? head : null}>
			<div className={touch ? 'sp-shell--touch sp-touch' : join('sp-shell', collapsed && 'sp-shell--collapsed', viewport && 'sp-shell--viewport')} {...rest}>
				{touch ? null : menu}
				<div className="sp-shell__page" hidden={touch && !!cover}>
					{topbar}
					{/* no box of its own, so the bar it holds sticks to the page, not to this wrapper */}
					{touch ? <div ref={setHead} style={{ display: 'contents' }} /> : null}
					{content}
				</div>
				{touch && cover ? <div className="sp-shell__page">{cover}</div> : null}
				{touch && !cover ? fab : null}
				{touch && !cover ? tabbar : null}
			</div>
		</ShellHead.Provider>
		</SidebarRail.Provider>
		</ShellTouch.Provider>
	)
}

/** @param {object} props
    @param {boolean} [props.touch] The phone form.
    @param {import('react').ReactNode} [props.children] What the top bar holds: the search and the buttons. */
export function TopBar({ touch = false, children, ...rest }) {
	reject(rest, 'TopBar')
	return <div className={join('sp-topbar', touch && 'sp-topbar--touch')} {...rest}>{children}</div>
}

const BODY = { default: null, split: 'sp-shell__body--split', rail: 'sp-shell__body--rail', fill: 'sp-shell__body--fill' }

/** @param {object} props
    @param {keyof typeof BODY} [props.layout] `default`; `rail` puts a filter rail before the content; `split` puts a panel after it; `fill` fills the height.
    @param {import('react').ReactNode} [props.children] The page. A page switch replaces it at once:
    the body stays mounted, nothing fades or rises, and only the sidebar's marker moves. */
export function ShellContent({ layout = 'default', children, ...rest }) {
	reject(rest, 'ShellContent')
	const classes = join('sp-shell__body', pick(BODY, layout, 'layout', 'ShellContent'))
	return <main className={classes} {...rest}>{children}</main>
}

const SIDEBAR = {
	default: null,
	rail: 'sp-sidebar--rail',
	peek: 'sp-sidebar--rail sp-sidebar--peek'
}

const MOTION = { in: 'in', out: 'out' }

/** `motion` runs the labels in as the column opens, or out before it closes (9i); `onMotionEnd` is
    called when the run is over, which is when the shell narrows the column after `out`.
    @param {object} props
    @param {keyof typeof SIDEBAR} [props.variant] `default`; `rail` is narrow, with icons only; `peek` shows the labels over the page.
    @param {keyof typeof MOTION} [props.motion] Run the labels in as the menu opens (`in`), or out before it closes (`out`).
    @param {() => void} [props.onMotionEnd] Called once the labels have run in or out.
    @param {import('react').Ref<HTMLElement>} [props.ref]
    @param {import('react').ReactNode} [props.children] The brand, the menu rows, group titles, dividers and the grip. */
export function Sidebar({ variant = 'default', motion, onMotionEnd, ref, children, ...rest }) {
	reject(rest, 'Sidebar')
	const box = useRef(null)
	const still = useStill()
	// a rail hides the words, a peek shows them over the page; a default sidebar follows the shell
	const shellRail = useContext(SidebarRail)
	const rail = variant === 'rail' ? true : variant === 'peek' ? false : shellRail
	const ended = useRef(onMotionEnd)
	ended.current = onMotionEnd
	const bind = useCallback(el => {
		box.current = el
		if (typeof ref === 'function') ref(el)
		else if (ref) ref.current = el
	}, [ref])
	useLayoutEffect(() => {
		if (!motion || !box.current) return
		pick(MOTION, motion, 'motion', 'Sidebar')
		return slideLabels(box.current, motion, still, () => ended.current?.())
	}, [motion, still])
	return (
		<SidebarRail.Provider value={rail}>
			<nav className={join('sp-sidebar', 'sp-scrolls', pick(SIDEBAR, variant, 'variant', 'Sidebar'))} ref={bind} {...rest}>
				{children}
			</nav>
		</SidebarRail.Provider>
	)
}

/** The product's own mark and name, as the menu's top block.
    @param {object} props
    @param {import('react').ReactNode} [props.children] The product's mark and name. */
export function SidebarBrand({ children, ...rest }) {
	reject(rest, 'SidebarBrand')
	return <div className="sp-sidebar__brand" {...rest}>{children}</div>
}

/** @param {object} props
    @param {import('react').ReactNode} [props.children] The group's title. */
export function SidebarGroup({ children, ...rest }) {
	reject(rest, 'SidebarGroup')
	return <div className="sp-sidebar__group" {...rest}>{children}</div>
}

/** @param {object} props
    @param {boolean} [props.expanded] The menu is open: the grip closes it.
    @param {() => void} [props.onClick] */
export function SidebarGrip({ expanded = true, onClick, ...rest }) {
	reject(rest, 'SidebarGrip')
	const phrase = usePhrase()
	return (
		<button
			type="button"
			className="sp-sidebar__grip"
			aria-label={phrase(expanded ? 'shell.collapseMenu' : 'shell.expandMenu')}
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

/**
 * The nav beside a page's pane (c35, Settings 11a): a heading over light NavItem rows, one per
 * section, in a 224 column that stays in place while the pane scrolls.
 *
 * @param {object} props
 * @param {string} props.label The heading, such as Settings. Also names the nav.
 * @param {import('react').ReactNode} [props.children] NavItem rows with `variant="light"`, and `<MenuSeparator variant="divider" />` between groups.
 */
export function SectionNav({ label, children, ...rest }) {
	reject(rest, 'SectionNav')
	return (
		<nav className="sp-section-nav" aria-label={label} {...rest}>
			<span className="sp-section-label sp-section-nav__head">{label.toUpperCase()}</span>
			<div className="sp-nav-list">{children}</div>
		</nav>
	)
}

// edited is a light row whose saved view differs from the list (2g), so it carries both classes;
// carried and picked are a light row being moved, wearing the list rows' own moving states (c1)
const NAV = {
	default: null,
	action: 'sp-nav-item--action',
	light: 'sp-nav-item--light',
	edited: 'sp-nav-item--light sp-nav-item--edited',
	carried: 'sp-nav-item--light sp-list-item--carried',
	picked: 'sp-nav-item--light sp-list-item--picked'
}

/** `tip` is the label shown while the row's own is hidden, on the rail; `control` is a Switch
    at the row's end, which makes the row its label. `handle` takes the icon's slot with a grip that
    moves the row, and `trail` takes the count's slot, so a row in edit mode keeps its height (2g).
    @param {object} props
    @param {keyof typeof NAV} [props.variant] `default`; `action` is the filled row for the main action; `light` on a light ground; `edited` a saved view whose filters changed; `carried` and `picked` while being moved.
    @param {import('./Icon.jsx').IconName} [props.icon] The icon at the start.
    @param {import('react').ReactNode} [props.mark] A mark in place of the icon.
    @param {import('react').ReactNode} [props.handle] A drag handle in the icon's place, so the row can be moved.
    @param {string} [props.handleLabel] What the drag handle says it moves.
    @param {number} [props.count] How many records are behind the row.
    @param {'warning' | 'danger'} [props.countColor] A count that is a backlog: `warning` or `danger`.
    @param {import('react').ReactNode} [props.trail] A part in the count's place, such as a menu button.
    @param {import('react').ReactNode} [props.sub] A second line, such as the account's address.
    @param {boolean} [props.current] This is the page the reader is on.
    @param {string} [props.to] The page it opens.
    @param {() => void} [props.onClick]
    @param {string} [props.tip] The label shown as a tooltip when the menu is a narrow rail.
    @param {import('react').ReactNode} [props.control] A Switch at the end. The row is then its label.
    @param {import('react').Ref<HTMLElement>} [props.ref] The row's own element: its button, link or label.
    @param {import('react').ReactNode} [props.children] The row's label. */
export function NavItem({ variant = 'default', icon, mark, handle, handleLabel, count, countColor, trail, sub, current = false, to, onClick, tip, control, ref, children, ...rest }) {
	reject(rest, 'NavItem')
	const phrase = usePhrase()
	/* A row with words is named by what it draws, its words and its count, and carries no name of its
	   own: a given name never matches the drawn text exactly ("All orders 441" against "All orders441").
	   The rail hides the words, so only there the row carries them as its name. */
	const rail = useContext(SidebarRail)
	const words = typeof children === 'string' || typeof children === 'number' ? [children, count].filter(v => v != null).join(' ') : null
	if (words && 'aria-label' in rest) { console.error('<NavItem> is named by the words it draws and its count: an aria-label is not taken'); delete rest['aria-label'] }
	if (rail && words && !control && !(handle && (to || onClick))) rest['aria-label'] = words
	const [hint, tipEvents] = useTip(tip)
	// a saved view in a ReorderList is carried by its handle, or picked up from the keyboard
	const moving = useMovingRow()
	// and arrives and leaves as the ReorderList's other rows do
	const moves = useRow()
	if (moving?.state) variant = moving.state
	const grip = moving ? moving.handle : {}
	const classes = join('sp-nav-item', pick(NAV, variant, 'variant', 'NavItem'))
	const body = (
		<>
			{handle
				? <span className="sp-nav-item__icon"><button type="button" className="sp-list-item__handle" aria-label={handleLabel ?? phrase('listItem.reorder')} {...grip}>{handle}</button></span>
				: mark ?? (icon ? <span className="sp-nav-item__icon"><Icon name={icon} /></span> : null)}
			{/* a long name ends in an ellipsis on one line (9f); an empty box would push the sub text away */}
			{children != null ? <span className="sp-grow sp-truncate">{children}</span> : null}
			{sub ? <span className="sp-nav-item__sub">{sub}</span> : null}
			{count != null
				? <span className="sp-nav-item__count" {...(countColor ? { 'data-color': countColor } : {})}>{count}</span>
				: null}
			{trail}
			{control}
			{hint}
		</>
	)
	// the current row's ground slides from the row left to the row reached (NavGround); dark and light rows move apart
	const light = variant !== 'default' && variant !== 'action'
	const here = current ? <NavGround kind={light ? 'light' : 'dark'} /> : null
	const state = { ...(current ? { 'aria-current': 'page' } : {}), ...tipEvents, ...rest, ref }
	// a row that opens and also moves: the handle and the open target side by side (Components, Ordering by hand)
	if (handle && !control && (to || onClick)) {
		const inside = (
			<>
				{children != null ? <span className="sp-grow sp-truncate">{children}</span> : null}
				{sub ? <span className="sp-nav-item__sub">{sub}</span> : null}
				{count != null
					? <span className="sp-nav-item__count" {...(countColor ? { 'data-color': countColor } : {})}>{count}</span>
					: null}
				{trail}
			</>
		)
		const page = current ? { 'aria-current': 'page' } : {}
		const row = inner => moving
			? <Reorder.Item as="span" {...itemOf(moving, moves)} className={classes} {...state}>{inner}</Reorder.Item>
			: <span className={classes} {...state}>{inner}</span>
		return row(
			<>
				{here}
				<span className="sp-nav-item__icon"><button type="button" className="sp-list-item__handle" aria-label={handleLabel ?? phrase('listItem.reorder')} {...grip}>{handle}</button></span>
				{to
					? <Link className="sp-list-item__open" to={to} data-go={to} onClick={onClick} {...page}>{inside}</Link>
					: <button type="button" className="sp-list-item__open" onClick={onClick}>{inside}</button>}
				{hint}
			</>
		)
	}
	// any other moving row is a Reorder.Item too, as ListItem's box() is: without one the grip starts
	// drag controls nothing listens to (a saved view in edit mode: grip, name and menu, no link)
	if (control) return moving
		? <Reorder.Item as="label" {...itemOf(moving, moves)} className={classes} {...state}>{here}{body}</Reorder.Item>
		: <label className={classes} {...state}>{here}{body}</label>
	if (to) return <Link className={classes} to={to} data-go={to} onClick={onClick} {...state}>{here}{body}</Link>
	if (!onClick) return moving
		? <Reorder.Item as="span" {...itemOf(moving, moves)} className={classes} {...state}>{here}{body}</Reorder.Item>
		: <span className={classes} {...state}>{here}{body}</span>
	return <button type="button" className={classes} onClick={onClick} {...state}>{here}{body}</button>
}

/* A menu a sidebar row opens, fixed to the window so the sidebar's scroll cannot clip it, placed against
   `block`; Up and Down on its button open it at either end (c9), a press outside, Escape or Tab dismisses it. */
function useSidebarMenu({ expanded, onClick, onDismiss }) {
	const block = useRef(null)
	const button = useRef(null)
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
			// Tab goes on from the button, where the menu sits in the reading order
			if (ev.key === 'Escape') ev.preventDefault()
			button.current?.focus()
			onDismiss?.()
		}
	}
	const opener = ev => {
		if (expanded || (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp')) return
		ev.preventDefault()
		end.current = ev.key === 'ArrowUp' ? 'last' : 'first'
		onClick?.(ev)
	}
	// the menu opens above the block at its width, or beside the avatar on the rail (9c)
	const drawn = menu => (at && menu
		? createPortal(
			<div ref={panel} className={join('sp-sidebar__menu', at.side ? 'sp-sidebar__menu--side' : 'sp-sidebar__menu--up')}
				style={{ left: at.left, top: at.top, width: at.width, height: at.height }} onKeyDown={keys}>
				{menu}
			</div>,
			document.body)
		: null)
	return { block, button, opener, drawn }
}

/** The account at the sidebar's foot (9c): a NavItem whose whole row opens `menu`, shown while
    `expanded`; `onDismiss` is a press outside both, Escape or Tab. Named by the words on it.
    @param {object} props
    @param {string} props.name
    @param {string} [props.picture] the picture's address
    @param {string} props.email The account's address.
    @param {boolean} [props.expanded] The account menu is open.
    @param {() => void} [props.onClick]
    @param {() => void} [props.onDismiss]
    @param {import('react').ReactNode} [props.menu] The menu that opens over the account.
    @param {string} [props.tip] The tooltip when the menu is a narrow rail. */
export function SidebarAccount({ name, picture, email, expanded = false, onClick, onDismiss, menu, tip, ...rest }) {
	reject(rest, 'SidebarAccount')
	// named by the words it draws, in their order, and no name of its own;
	// on the rail, where none are drawn, the same words are its name
	const rail = useContext(SidebarRail)
	if ('aria-label' in rest) { console.error('<SidebarAccount> is named by the name and email it draws: an aria-label is not taken'); delete rest['aria-label'] }
	const named = [name, email].filter(Boolean).join(' ')
	const { block, button, opener, drawn } = useSidebarMenu({ expanded, onClick, onDismiss })
	const bind = useCallback(el => { block.current = el; button.current = el }, [block, button])
	const split = email.lastIndexOf('@')
	const mark = picture
		? <Mark size="medium" fill="photo" round aria-hidden="true" aria-label={name || email}><img src={picture} alt="" /></Mark>
		: <Mark size="medium" fill="solid" swatch="primary-3" round aria-hidden="true" aria-label={name || email}><>{initialsOf(name || (split > 0 ? email.slice(0, split) : email))}</></Mark>
	const label = (
		<span className="sp-stack">
			{name ? <span className="sp-truncate">{name}</span> : null}
			<EmailLine email={email} tone="nav" />
		</span>
	)
	const chevron = <span className="sp-combobox__chevron" aria-hidden="true"><Icon name="chevron-up" size={14} /></span>
	return (
		<>
			<NavItem ref={bind} mark={mark} tip={expanded ? null : tip} onClick={onClick} aria-haspopup="menu" {...(rail ? { 'aria-label': named } : {})}
				aria-expanded={expanded ? 'true' : 'false'} onKeyDown={opener} trail={chevron}
				{...rest}>
				{label}
			</NavItem>
			{drawn(menu)}
		</>
	)
}

/* The rail's label, on the window so the sidebar's scroll cannot clip it; only its position is set here. */
function useTip(tip) {
	const [at, setAt] = useState(null)
	useEffect(() => { if (!tip) setAt(null) }, [tip])
	if (!tip) return [null, {}]
	// the label stands to the right of the icon, 6 clear and centred on it (9b, 9f)
	const show = ev => {
		const r = ev.currentTarget.getBoundingClientRect()
		const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sp-6'))
		setAt({ left: r.right + gap, top: r.top + r.height / 2 })
	}
	const hide = () => setAt(null)
	const hint = at
		? createPortal(<span className="sp-tip sp-tip--float" role="tooltip" style={{ left: at.left, top: at.top }}>{tip}</span>, document.body)
		: null
	return [hint, { onMouseEnter: show, onMouseLeave: hide, onFocus: show, onBlur: hide }]
}

/** The dimmed page a sheet or a dialog sits over. It fills the frame it is in.
    @param {object} props
    @param {boolean} [props.dialog] It sits under a dialog, not a sheet.
    @param {import('react').ReactNode} [props.children] The sheet or the dialog. */
export function Scrim({ dialog = false, children, ...rest }) {
	reject(rest, 'Scrim')
	// under a Leaving (Overlays.jsx) the dimmed page fades with what it holds, and takes no more presses
	const leaving = useGoing()
	return <m.div className={join('sp-scrim', dialog && 'sp-scrim--dialog')} {...PRESENCE.scrim()} {...(leaving ? { inert: true } : {})} {...rest}>{children}</m.div>
}

/* ---------- command palette (c24) ---------- */

const PaletteScreen = createContext(false)

/** The command palette (c24): query line, results as one listbox, keys at its foot. `screen`
    fills a phone (7b): the search field with `onCancel` beside it, rows without figures or keys.
    @param {object} props
    @param {boolean} [props.screen] The phone form: it fills the screen, and the rows have no figures or keys.
    @param {string} props.value The words typed.
    @param {(value: string) => void} props.onChange
    @param {() => void} [props.onCancel]
    @param {number} [props.count] How many results there are, read out.
    @param {string} [props.activeId] The id of the row the arrow keys are on.
    @param {import('react').Ref<HTMLInputElement>} [props.inputRef]
    @param {string} [props.placeholder] Grey words while nothing is typed.
    @param {string} props.label The search's name, for a screen reader.
    @param {string[]} [props.foot] the keys named at its foot
    @param {import('react').ReactNode} [props.children] The groups of results. */
export function Palette({ screen = false, value, onChange, onCancel, count, activeId, inputRef, placeholder, label, foot, children, ...rest }) {
	reject(rest, 'Palette')
	const phrase = usePhrase()
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
			<div className={join('sp-palette', screen && 'sp-palette--screen')} role="dialog" aria-modal="true" aria-label={label} {...rest}>
				<div className="sp-palette__search">
					{screen
						? (
							<>
								<SearchInput value={value} onChange={onChange} inputRef={inputRef} placeholder={placeholder} {...term} />
								{onCancel ? <Button variant="text" onClick={onCancel}>{phrase('action.cancel')}</Button> : null}
							</>
						)
						: (
							<>
								<span className="sp-palette__icon"><Icon name="search" /></span>
								<input ref={inputRef} className="sp-palette__term" type="search" name="search" value={value}
									onChange={ev => onChange?.(ev.target.value)} placeholder={placeholder} {...term} />
								{count ? <span className="sp-note" aria-live="polite">{count}</span> : null}
							</>
						)}
				</div>
				<div className="sp-palette__body" id={list} role="listbox" aria-label={phrase('shell.results')}>{children}</div>
				{!screen && foot?.length
					? <div className="sp-palette__foot">{foot.map(key => <span key={key}>{key}</span>)}</div>
					: null}
			</div>
		</PaletteScreen.Provider>
	)
}

/** The label over a group of rows.
    @param {object} props
    @param {import('react').ReactNode} [props.children] The group's title. */
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

/** One record or one action, led by `icon` or `thumb` (a picture's address, or true for the empty box).
    `match` is marked in the name; an amount (`value`), a `note` or `kbd` end it, and a phone drops them (7b).
    @param {object} props
    @param {import('./Icon.jsx').IconName} [props.icon] The icon at the start.
    @param {string | boolean} [props.thumb] A picture at the start: its address, or true for an empty box.
    @param {boolean} [props.plain] The name in regular weight, not bold.
    @param {boolean} [props.action] The row does something: the icon sits on a filled mark.
    @param {string} [props.match] The typed words, marked in the name.
    @param {import('react').ReactNode} [props.meta] A grey line under the name.
    @param {string} [props.value] An amount at the end.
    @param {import('react').ReactNode} [props.note] A word at the end, such as Open.
    @param {import('react').ReactNode} [props.kbd] A keyboard shortcut at the end, such as N.
    @param {boolean} [props.selected] The arrow keys are on this row.
    @param {import('react').ReactNode} [props.children] The record's or the action's name. */
export function PaletteRow({ icon, thumb = false, plain = false, action = false, match, meta, value, note, kbd, selected = false, children, ...rest }) {
	reject(rest, 'PaletteRow')
	const screen = useContext(PaletteScreen)
	const trail = !screen && (value != null || note || kbd)
	let lead = null
	if (thumb) lead = <span className="sp-palette__thumb" aria-hidden="true" />
	else if (icon) lead = <Mark size="small" fill={action ? 'solid' : 'none'} aria-hidden="true" aria-label={icon}><Icon name={icon} size={14} /></Mark>
	return (
		<button type="button" className="sp-palette__row" role="option" aria-selected={selected ? 'true' : 'false'} tabIndex={-1} {...rest}>
			{lead}
			{/* truncated, so a long name keeps the row one line and the list from scrolling sideways */}
			<span className={join('sp-palette__name', plain && 'sp-palette__name--plain', 'sp-truncate')}>{marked(children, match)}</span>
			{meta ? <span className="sp-meta sp-truncate">{meta}</span> : null}
			{trail ? <span className="sp-grow" /> : null}
			{trail && value != null ? <span className="sp-amount">{value}</span> : null}
			{trail && note ? <span className="sp-meta">{note}</span> : null}
			{trail && kbd ? <Kbd>{kbd}</Kbd> : null}
		</button>
	)
}

/** The way from a group to the rest of its records, in their own list.
    @param {object} props
    @param {boolean} [props.selected] The arrow keys are on this row.
    @param {import('react').ReactNode} [props.children] The words, such as All 24 orders. */
export function PaletteAll({ selected = false, children, ...rest }) {
	reject(rest, 'PaletteAll')
	return (
		<button type="button" className="sp-palette__all" role="option" aria-selected={selected ? 'true' : 'false'} tabIndex={-1} {...rest}>
			{children}
		</button>
	)
}

