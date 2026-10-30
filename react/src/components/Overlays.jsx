import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Scrim, ShellTouch } from './Shell.jsx'
import { Sheet } from './Touch.jsx'
import { roomOf, usePanelPlace, usePanelRest } from './Combobox.jsx'
import { menuTrigger, own, useFocusTrap, within } from './Utilities.jsx'
import { PRESENCE, Presence, m, useGoing, usePanelMotion } from './motion.js'
import { usePhrase } from '../language/phrases.js'

const MENU = {
	floating: 'sp-menu--floating',
	sub: 'sp-menu__sub',
	row: 'sp-menu--row',
	plain: 'sp-menu--plain',
	// these place a floating panel, so each carries the floating class it modifies
	up: 'sp-menu--floating sp-menu--up',
	start: 'sp-menu--floating sp-menu--start',
	'side-left': 'sp-menu--floating sp-menu--side-left',
	'side-right': 'sp-menu--floating sp-menu--side-right'
}

// a menu's own items, not its submenu's: the arrow keys walk one level at a time
const itemsOf = menu => [...(menu?.querySelectorAll(':scope > li > .sp-menu__item:not(:disabled)') ?? [])]

// the control a floating menu belongs to (Anchor, a record's menu): whether it is open, and its box
const MenuHost = createContext(null)
const FLOATS = ['floating', 'up', 'start']

/** The provider an Anchor or a record's menu wraps its menu in. Internal.
    @param {object} props
    @param {boolean} props.open Whether the menu is open.
    @param {import('react').RefObject<HTMLElement>} props.box The control the menu belongs to.
    @param {import('react').ReactNode} [props.children] The menu. */
export function MenuHostOf({ open, box, children }) {
	const value = useMemo(() => ({ open, box }), [open, box])
	return <MenuHost.Provider value={value}>{children}</MenuHost.Provider>
}

/** Places a host's floating menu where it can be read (c9): the one positioner every overlay uses.
    Internal. */
export function useMenuPlace(box, open) {
	const touch = useContext(ShellTouch)
	const menu = useMemo(() => ({ get current() { return box.current?.querySelector(':scope > .sp-menu--floating') ?? null } }), [box])
	// a scroll of the page closes it, as its own button would (c9)
	usePanelPlace(box, menu, open && !touch, undefined, () => menuTrigger(menu.current)?.click())
	// the menu fades out as it closes, where it stood: the host spreads data-closing so it stays drawn until then
	const closing = usePanelMotion(menu, open && !touch)
	usePanelRest(menu, open && !touch, closing)
	return closing
}

/** On touch a floating menu is the c13 sheet from the bottom edge (c9), holding the same items.
    A press on the backdrop is a press on the menu's own button, so the press lands on nothing under it. */
function MenuSheet({ owner, children }) {
	const sheet = useRef(null)
	useLayoutEffect(() => own(sheet.current, owner.current), [owner])
	useFocusTrap(sheet, true, '.sp-menu__item:not(:disabled)')
	const bare = ev => ev.target === ev.currentTarget
	return createPortal(
		<Scrim dialog
			onPointerDown={ev => { if (bare(ev)) ev.stopPropagation() }}
			onMouseDown={ev => { if (bare(ev)) ev.preventDefault() }}
			onClick={ev => { if (bare(ev)) menuTrigger(sheet.current?.querySelector('.sp-menu'))?.click() }}>
			<Sheet ref={sheet} data-surface="" data-menu-open="true">{children}</Sheet>
		</Scrim>,
		document.body
	)
}

/** @param {object} props
    @param {keyof typeof MENU} [props.position] Where the menu sits: `floating` under its button, `up` above it, `start` from the left edge, `side-left` or `side-right` beside it, `sub` inside a menu row, `row` under a row's menu button at the right, `plain` with no panel of its own.
    @param {boolean} [props.scrolls] Caps its height and scrolls, for a list whose length the page does not know.
    @param {import('react').ReactNode} [props.children] The MenuItems, labels and separators. */
export function Menu({ position, scrolls = false, children, ...rest }) {
	reject(rest, 'Menu')
	const host = useContext(MenuHost)
	const touch = useContext(ShellTouch)
	const sheet = touch && !!host && FLOATS.includes(position)
	const keys = ev => {
		const items = itemsOf(ev.currentTarget)
		if (!items.length) return
		const at = items.indexOf(document.activeElement)
		const to = { ArrowDown: at < 0 ? 0 : at + 1, ArrowUp: at < 0 ? -1 : at - 1, Home: 0, End: -1 }[ev.key]
		if (to === undefined) return
		ev.preventDefault()
		ev.stopPropagation()
		items[(to + items.length) % items.length].focus()
	}
	// a submenu hands the keys back to its item; the open menu's own Escape listens on a box above it
	const box = useRef(null)
	useEffect(() => {
		const sub = box.current
		if (position !== 'sub' || !sub) return
		const back = ev => {
			if (ev.key !== 'ArrowLeft' && ev.key !== 'Escape') return
			// in the submenu's search field the left arrow moves the caret until it is at the start
			if (ev.key === 'ArrowLeft' && ev.target.selectionStart > 0) return
			ev.preventDefault()
			ev.stopPropagation()
			sub.parentElement?.querySelector(':scope > .sp-menu__item')?.focus()
		}
		sub.addEventListener('keydown', back)
		return () => sub.removeEventListener('keydown', back)
	}, [position])
	const menu = (
		<menu
			ref={box}
			className={join('sp-menu', sheet ? 'sp-menu--plain' : position && pick(MENU, position, 'position', 'Menu'), scrolls && !sheet && 'sp-menu--scrolls')}
			role="menu"
			onKeyDown={keys}
			{...rest}
		>
			{children}
		</menu>
	)
	if (!sheet) return menu
	// on touch the menu is a sheet, which slides back down as it closes
	return <Presence>{host.open ? <MenuSheet owner={host.box}>{menu}</MenuSheet> : null}</Presence>
}

/** What a menu's button needs from the keyboard (c9): Enter, Space or Down opens it on its first
    item, Up on its last. `open` is the page's, so the menu is opened by pressing its own button. */
export function useMenuButton(box, open) {
	const want = useRef(null)
	useEffect(() => {
		if (!open || !want.current) return
		const items = itemsOf(box.current?.querySelector('.sp-menu'))
		;(want.current === 'last' ? items.at(-1) : items[0])?.focus()
		want.current = null
	}, [box, open])
	const trigger = target => {
		const button = target?.closest?.('[aria-haspopup="menu"]')
		return button && !button.closest('.sp-menu') && box.current?.contains(button) ? button : null
	}
	return {
		onKeyDown: ev => {
			const button = trigger(ev.target)
			if (!button || (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp')) return
			ev.preventDefault()
			want.current = ev.key === 'ArrowUp' ? 'last' : 'first'
			if (!open) return button.click()
			const items = itemsOf(box.current.querySelector('.sp-menu'))
			;(want.current === 'last' ? items.at(-1) : items[0])?.focus()
			want.current = null
		},
		// a click with no pointer behind it came from Enter or Space, unless an arrow sent it
		onClickCapture: ev => { if (ev.detail === 0 && !open && trigger(ev.target) && !want.current) want.current = 'first' }
	}
}

/* A submenu opens level with its item and moves up as far as it must to end inside the window; only
   one taller than the window scrolls. It is laid out while hidden, so it measures before it shows. */
function fitSubmenu(item) {
	const sub = item.parentElement?.querySelector(':scope > .sp-menu__sub')
	if (!sub) return
	for (const prop of ['top', 'max-height', 'overflow-y']) sub.style.removeProperty(prop)
	const edge = roomOf(item)
	const room = edge.bottom - edge.top - 16
	const r = sub.getBoundingClientRect()
	const lift = Math.min(r.bottom - (edge.bottom - 8), Math.max(0, r.top - edge.top - 8))
	if (lift > 0) sub.style.top = parseFloat(getComputedStyle(sub).top) - lift + 'px'
	if (r.height > room) Object.assign(sub.style, { maxHeight: room + 'px', overflowY: 'auto' })
}

/** @param {object} props
    @param {import('./Icon.jsx').IconName} [props.icon] The icon at the start.
    @param {string} [props.to] The page it opens. The item is drawn as a link.
    @param {() => void} [props.onClick]
    @param {boolean} [props.disabled] The item cannot be chosen.
    @param {boolean} [props.danger] The action that removes something.
    @param {'draft' | 'progress' | 'done' | 'returned' | 'cancelled'} [props.dot] A status dot at the start: draft, progress, done, returned or cancelled.
    @param {boolean} [props.selected] The status this record already has.
    @param {import('react').ReactNode} [props.children] The label, and a Menu under it for a submenu. */
export function MenuItem({ icon, to, onClick, disabled = false, danger = false, dot, selected, children, ...rest }) {
	reject(rest, 'MenuItem')
	// the nested menu is a child, not a prop: one of these children is a Menu and the
	// rest is the label, which is how the markup reads and how the DOM nests it
	const kids = [].concat(children ?? []).flat()
	const submenu = kids.find(c => c && typeof c === 'object' && c.type === Menu)
	const label = kids.filter(c => c !== submenu)
	/* A submenu opens on hover and on focus, and the item says so - the stylesheet
	   reveals it from the item's own aria-expanded, so the state has to be real. */
	const [subOpen, setSubOpen] = useState(false)
	if (dot && !['draft', 'progress', 'done', 'returned', 'cancelled'].includes(dot))
		console.error(`<MenuItem> dot="${dot}" is not a status the system has`)
	// the item is hidden once it acts, so focus goes back to the menu's button first: whatever
	// the page opens next (a dialog) then returns there rather than to nothing
	const act = ev => {
		if (!submenu) menuTrigger(ev.currentTarget)?.focus()
		onClick?.(ev)
	}
	const enter = ev => {
		if (ev.key !== 'ArrowRight' && ev.key !== 'Enter') return
		ev.preventDefault()
		ev.stopPropagation()
		fitSubmenu(ev.currentTarget)
		setSubOpen(true)
		// the key opens it at once, without the wait a passing pointer gets; hidden, it takes no focus
		const sub = ev.currentTarget.nextElementSibling
		sub.getAnimations().forEach(a => a.finish())
		sub.querySelector(':scope > li > input, :scope > li > * > input, :scope > li > .sp-menu__item:not(:disabled)')?.focus()
	}
	const body = <>
		{dot ? <span className="sp-combobox__dot" data-dot={dot} /> : null}
		{typeof icon === 'string' ? <Icon name={icon} size={15} /> : icon ?? null}
		{label}
		{selected ? <><span className="sp-grow" /><span className="sp-combobox__check"><Icon name="check" size={13} /></span></> : null}
	</>
	// a page the item goes to is a link, so a middle click or a new tab works; Space acts like on the button.
	if (to && !submenu && !disabled) return (
		<li role="none">
			<Link to={to} className={join('sp-menu__item', danger && 'sp-ink-danger')} role="menuitem" onClick={act}
				onKeyDown={ev => { if (ev.key === ' ') { ev.preventDefault(); ev.currentTarget.click() } }} {...rest}>
				{body}
			</Link>
		</li>
	)
	return (
		<li className={submenu ? 'sp-anchor' : undefined} role="none">
			<button
				type="button"
				className={join('sp-menu__item', danger && 'sp-ink-danger')}
				role="menuitem"
				onClick={act}
				disabled={disabled}
				{...(submenu ? { 'aria-haspopup': 'menu', 'aria-expanded': subOpen ? 'true' : 'false' } : {})}
				{...(submenu ? { onMouseEnter: ev => { fitSubmenu(ev.currentTarget); setSubOpen(true) }, onMouseLeave: () => setSubOpen(false), onFocus: ev => { fitSubmenu(ev.currentTarget); setSubOpen(true) }, onKeyDown: enter } : {})}
				{...(selected === undefined ? {} : { 'aria-selected': selected ? 'true' : 'false' })}
				{...rest}
			>
				{body}
			</button>
			{submenu}
		</li>
	)
}

/** The heading over a group of items.
    @param {object} props
    @param {import('react').ReactNode} [props.children] The words over a group of items. */
export function MenuLabel({ children, ...rest }) {
	reject(rest, 'MenuLabel')
	return <li className="sp-menu__label" role="presentation" {...rest}>{children}</li>
}

const SEPARATOR = { menu: null, divider: 'sp-menu__sep--divider' }

/**
 * A rule between groups: in a menu, or between groups of rows in a SectionNav.
 *
 * @param {object} props
 * @param {keyof typeof SEPARATOR} [props.variant] `menu`, an item of a Menu; `divider`, the darker rule between groups of nav rows (c35).
 */
export function MenuSeparator({ variant = 'menu', ...rest }) {
	reject(rest, 'MenuSeparator')
	const cls = join('sp-menu__sep', pick(SEPARATOR, variant, 'variant', 'MenuSeparator'))
	return variant === 'divider'
		? <span className={cls} role="separator" {...rest} />
		: <li className={cls} role="separator" {...rest} />
}

const POPOVER = { default: null, start: 'sp-popover--start', end: 'sp-popover--end', static: 'sp-popover--static' }

/** @param {object} props
    @param {keyof typeof POPOVER} [props.position] Which edge it hangs from: `default`, `start`, `end`, or `static` drawn in place.
    @param {import('react').ReactNode} [props.head] A title, and any word about what this does.
    @param {import('react').ReactNode} [props.search] A search at the top of the panel.
    @param {import('react').ReactNode} [props.children] What the panel holds, such as the choices.
    @param {import('react').ReactNode} [props.summary] What applying will do, such as a count.
    @param {import('react').ReactNode} [props.note] A grey line at the foot of the panel.
    @param {import('react').ReactNode} [props.actions] The Cancel and Apply buttons. */
export function Popover({ position = 'default', head, search, children, summary, note, actions, ...rest }) {
	reject(rest, 'Popover')
	const leaving = useGoing()
	return (
		<m.div className={join('sp-popover', pick(POPOVER, position, 'position', 'Popover'))} {...PRESENCE.panel(false)} {...(leaving ? { inert: true } : {})} {...rest}>
			{head ? <div className="sp-popover__head">{head}</div> : null}
			{search ?? null}
			{children ? <div className="sp-popover__list">{children}</div> : null}
			{summary ? <div className="sp-popover__summary">{summary}</div> : null}
			{note ? <div className="sp-popover__note">{note}</div> : null}
			{actions ? <div className="sp-popover__actions">{actions}</div> : null}
		</m.div>
	)
}

/** The element a floating panel hangs from. Open, it lets its menu out of a card that clips
    (`data-menu-open`), places it above when the room below is short, and on touch makes it a sheet.
    @param {object} props
    @param {boolean} [props.open] Whether the panel inside it is showing.
    @param {import('react').Ref<HTMLDivElement>} [props.ref]
    @param {import('react').ReactNode} [props.children] The button and the panel it opens. */
export function Anchor({ open, ref, children, ...rest }) {
	reject(rest, 'Anchor')
	const box = useRef(null)
	const keys = useMenuButton(box, open)
	const closing = useMenuPlace(box, !!open)
	// stable, or each render empties box.current until after the menu sheet has read it in its own layout effect
	const bind = useCallback(el => {
		box.current = el
		if (typeof ref === 'function') ref(el)
		else if (ref) ref.current = el
	}, [ref])
	return (
		<span className="sp-anchor" ref={bind} {...keys}
			{...(open === undefined ? {} : { 'data-open': open ? 'true' : 'false', 'data-menu-open': open || closing ? 'true' : undefined })}
			{...(closing ? { 'data-closing': 'true' } : {})} {...rest}>
			<MenuHostOf open={!!open} box={box}>{children}</MenuHostOf>
		</span>
	)
}

/** Keeps a Dialog, Sheet or Popover drawn while its way out runs, after its child goes:
    `<Leaving>{open ? <Dialog ...> : null}</Leaving>`. Motion's presence: the part's own exit runs,
    and it takes no more presses meanwhile. Under reduced motion only its fade runs.
    @param {object} props
    @param {() => void} [props.onClosed] Called once the part has gone, such as to return focus.
    @param {import('react').ReactNode} [props.children] The open part, or nothing once it closes. */
export function Leaving({ onClosed, children }) {
	return <Presence onGone={onClosed}>{children}</Presence>
}

// the dialog is named by its title and described by its body, whichever ids those parts take
const DialogParts = createContext(null)

function useDialogPart(kind) {
	const register = useContext(DialogParts)
	const id = useId()
	useLayoutEffect(() => register?.(kind, id), [register, kind, id])
	return register ? id : undefined
}

const isActions = c => c && typeof c === 'object' && c.type === DialogActions

/** `onCancel` is what Escape and a press on the backdrop do: the dialog's own way out (c13). A page
    that spaces its blocks wider than the dialog does passes them, the actions last, in one stack of its own (6d).
    @param {object} props
    @param {import('react').ReactNode} [props.children] A DialogTitle, then the body (a DialogBody or plain words), then DialogActions.
    @param {boolean} [props.scrim] Draw it over the dimmed page, as it appears in use.
    @param {() => void} [props.onCancel] */
export function Dialog({ children, scrim = true, onCancel, ...rest }) {
	reject(rest, 'Dialog')
	const box = useRef(null)
	const backdrop = useRef(null)
	const pressed = useRef(false)
	// closing under a Leaving, it answers nothing more
	const leaving = useGoing()
	const gone = useRef(leaving)
	gone.current = leaving
	const [parts, setParts] = useState({ title: [], body: [] })
	const register = useCallback((kind, id) => {
		setParts(p => ({ ...p, [kind]: [...p[kind], id] }))
		return () => setParts(p => ({ ...p, [kind]: p[kind].filter(x => x !== id) }))
	}, [])
	useFocusTrap(box, scrim, '.sp-dialog__actions button:not(:disabled)')
	const keys = ev => { if (ev.key === 'Escape' && onCancel && !gone.current) { ev.stopPropagation(); onCancel() } }
	// Escape with focus outside the box (on the page's body) still answers as cancel
	const cancel = useRef(onCancel)
	useEffect(() => { cancel.current = onCancel })
	useEffect(() => {
		if (!scrim) return
		const key = ev => {
			if (ev.key !== 'Escape' || !cancel.current || gone.current) return
			if (ev.target !== document.body && !within(backdrop.current, ev.target)) return
			cancel.current()
		}
		document.addEventListener('keydown', key)
		return () => document.removeEventListener('keydown', key)
	}, [scrim])
	const kids = [].concat(children ?? []).flat()
	const actions = kids.find(isActions)
	const elements = kids.filter(c => c && typeof c === 'object')
	const stacked = elements.length === 1 && [].concat(elements[0].props?.children ?? []).flat().some(isActions)
	// plain words passed straight to the dialog are the body, so the common case
	// stays one sentence rather than a wrapper around one sentence
	const above = kids.filter(c => c !== actions).map((c, i) =>
		typeof c === 'string' ? <DialogBody key={'body' + i}>{c}</DialogBody> : c)
	if (!actions && !stacked) console.error('<Dialog> has no <DialogActions>: a decision with no way out cannot be answered')
	const named = rest['aria-label'] || !parts.title.length ? {} : { 'aria-labelledby': parts.title.join(' ') }
	// below 640 a dialog is a sheet, anchored to the bottom (Layout rules, Responsive reference 18a)
	const touch = useContext(ShellTouch)
	const panel = (
		<DialogParts.Provider value={register}>
			<m.div className={touch ? 'sp-sheet' : 'sp-dialog'} role="dialog" aria-modal="true" ref={box} tabIndex={-1} onKeyDown={keys}
				{...(touch ? PRESENCE.sheet() : PRESENCE.dialog())}
				{...named} {...(parts.body.length ? { 'aria-describedby': parts.body.join(' ') } : {})} {...rest}>
				{above}
				{actions}
			</m.div>
		</DialogParts.Provider>
	)
	if (!scrim) return panel
	// a press on the backdrop keeps focus in the dialog, and cancels it once it is let go there too
	return createPortal(
		<Scrim dialog ref={backdrop}
			onMouseDown={ev => { if (ev.target === ev.currentTarget) ev.preventDefault() }}
			onPointerDown={ev => { pressed.current = ev.target === ev.currentTarget }}
			onClick={ev => { if (pressed.current && ev.target === ev.currentTarget && !leaving) onCancel?.(); pressed.current = false }}>
			{panel}
		</Scrim>,
		document.body
	)
}

/** What the dialog asks, as its heading. It names the dialog.
    @param {object} props
    @param {import('react').ReactNode} [props.children] The dialog's question or title. */
export function DialogTitle({ children, ...rest }) {
	reject(rest, 'DialogTitle')
	const id = useDialogPart('title')
	return <span className="sp-heading" id={id} {...rest}>{children}</span>
}

/** What the decision costs, stated in full. It is read with the dialog's name.
    @param {object} props
    @param {import('react').ReactNode} [props.children] What happens, in the reader's words. */
export function DialogBody({ children, ...rest }) {
	reject(rest, 'DialogBody')
	const id = useDialogPart('body')
	return <span className="sp-dialog__body" id={id} {...rest}>{children}</span>
}

/** The way out and the commit. It spaces and aligns its own buttons.
    @param {object} props
    @param {import('react').ReactNode} [props.children] The buttons. */
export function DialogActions({ children, ...rest }) {
	reject(rest, 'DialogActions')
	return <div className="sp-dialog__actions" {...rest}>{children}</div>
}

const TOAST_COLOR = { default: null, danger: 'danger' }

/** `title` makes the message its second line, and `seconds` is how long its Undo lasts (6d). An
    `asks` toast is a notice that stays until answered: `mark` stands for the icon, `actions` answer. */
/** `list` is a short list under the words of a toast that asks, read out as `listLabel` (6d).
    @param {object} props
    @param {import('./Icon.jsx').IconName} [props.icon] The icon at the start.
    @param {import('react').ReactNode} [props.mark] A sign in a round mark, for a toast that asks.
    @param {import('react').ReactNode} [props.title] The first line, in bold. The message is then the second line.
    @param {keyof typeof TOAST_COLOR} [props.color] `default`, or `danger` for something that went wrong.
    @param {boolean} [props.compact] The smaller one, for a count or a status.
    @param {boolean} [props.asks] It needs an answer, so it does not take itself away.
    @param {import('react').ReactNode} [props.actions] The buttons that answer a toast that asks.
    @param {import('react').ReactNode[]} [props.list] A short list under the words of a toast that asks.
    @param {string} [props.listLabel] What the list is, read out.
    @param {number} [props.seconds] How many seconds are left to undo, shown beside Undo.
    @param {import('react').ReactNode} [props.children] The message, and a ToastUndo where there is a way back. */
export function Toast({ icon, mark, title, color = 'default', compact = false, asks = false, actions, list, listLabel, seconds, children, ...rest }) {
	reject(rest, 'Toast')
	// the way back is a child, not a prop: it is the last thing in the row, which is
	// where it is written, and a page cannot put a plain link there by accident
	const kids = [].concat(children ?? []).flat()
	const undo = kids.find(c => c && typeof c === 'object' && c.type === ToastUndo)
	const message = kids.filter(c => c !== undo)
	if (actions && !asks) console.error('<Toast> answers belong to a toast that asks: any other toast has at most its way back')
	return (
		<div
			className={join('sp-toast', compact && 'sp-toast--compact', asks && 'sp-toast--asks')}
			role="status"
			{...(color === 'default' ? {} : { 'data-color': pick(TOAST_COLOR, color, 'color', 'Toast') })}
			{...rest}
		>
			{mark ? <span className="sp-step" data-color="warning" aria-hidden="true">{mark}</span>
				: icon ? <span className="sp-toast__icon"><Icon name={icon} /></span> : null}
			{title
				? (
					<>
						<div className="sp-stack sp-gap-6">
							<span className="sp-title">{title}</span>
							<span className={join('sp-subtitle', asks ? 'sp-ink-warning' : 'sp-ink-inverse')}>{message}</span>
							{list?.length
								? <ul className="sp-toast__changes sp-ink-warning" aria-label={listLabel}>{list.map((item, i) => <li key={i}>{item}</li>)}</ul>
								: null}
						</div>
						<span className="sp-grow" />
					</>
				)
				: <span>{message}</span>}
			{actions}
			{undo}
			{/* not read out: a live region would say it again every second */}
			{undo && seconds != null ? <span className="sp-meta sp-number" aria-hidden="true">{seconds}s</span> : null}
		</div>
	)
}

/** The way back out of what a toast reports, or its one way on (Retry now).
    @param {object} props
    @param {import('react').ReactNode} [props.children] The button's words, such as Undo.
    @param {() => void} [props.onClick] */
export function ToastUndo({ children, onClick, ...rest }) {
	reject(rest, 'ToastUndo')
	return <button type="button" className="sp-toast__undo sp-nowrap" onClick={onClick} {...rest}>{children}</button>
}

const ALERT_COLOR = { warning: null, danger: 'danger', success: 'success' }

/** `action` is one button at the row's far end, after a spacer (3a, 3b); `below` puts it under the
    words instead, where a phone's row is too narrow to hold both.
    @param {object} props
    @param {keyof typeof ALERT_COLOR} [props.color] `warning`, `danger` or `success`.
    @param {import('react').ReactNode} [props.mark] The glyph in its own round mark.
    @param {import('react').ReactNode} [props.title] The first line, in bold.
    @param {import('react').ReactNode} [props.action] One button at the far end of the row.
    @param {boolean} [props.below] Put the button under the words, where a phone's row is too narrow for both.
    @param {import('react').ReactNode} [props.children] What it means for the reader, in their terms. */
export function Alert({ color = 'warning', mark, title, action, below = false, children, ...rest }) {
	reject(rest, 'Alert')
	return (
		<div
			className="sp-alert"
			{...(color === 'warning' ? {} : { 'data-color': pick(ALERT_COLOR, color, 'color', 'Alert') })}
			{...rest}
		>
			{mark ? <span className="sp-alert__mark" aria-hidden="true">{mark}</span> : null}
			<span className="sp-alert__body">
				{title ? <span className="sp-alert__title">{title}</span> : null}
				{children ? <span className="sp-alert__note">{children}</span> : null}
				{action && below ? <span className="sp-row-flex">{action}</span> : null}
			</span>
			{action && !below ? <><span className="sp-grow" />{action}</> : null}
		</div>
	)
}

/* One toast at a time, bottom centre, for six seconds, its Undo showing the seconds left (6d); a second
   replaces it, hover or focus holds it, Escape dismisses it and Cmd/Ctrl+Z is its Undo (c18). */
const TOAST_MS = 6000
const ToastContext = createContext(() => {})
const UNDER = '.sp-tabbar, .sp-savebar, .sp-list-item--sticky, .sp-fab, .sp-btn:not(.sp-btn--outline, .sp-btn--text)'

/** Shows a toast: `show({ message, title, icon, color, undo: { label, onClick } })`. */
export const useToast = () => useContext(ToastContext)

/** `notice` is a notice that stays until answered (6d), held in the same place above any toast.
    @param {object} props
    @param {import('react').ReactNode} [props.notice] A toast that asks, held above any other toast until it is answered.
    @param {import('react').ReactNode} [props.children] The page. */
export function Toaster({ notice, children }) {
	const phrase = usePhrase()
	const [toast, setToast] = useState(null)
	const [hovered, setHovered] = useState(false)
	const [focused, setFocused] = useState(false)
	// where focus was before it came into the toast, so it has somewhere to go when the toast goes
	const before = useRef(null)
	const region = useRef(null)
	// a toast with nothing to say is not shown: a page that has no words for a failure (a session that
	// ended) leaves the speaking to whatever does
	const show = useCallback(next => { if (next?.message) setToast({ ...next, key: Date.now() }) }, [])
	const dismiss = useCallback(() => setToast(null), [])
	// the time left, which a hold stops and the end of the hold carries on from
	const [left, setLeft] = useState(TOAST_MS)
	const leftNow = useRef(TOAST_MS)
	useLayoutEffect(() => { leftNow.current = TOAST_MS; setLeft(TOAST_MS) }, [toast])
	useEffect(() => {
		if (!toast || hovered || focused) return
		const from = leftNow.current
		const start = Date.now()
		const tick = () => {
			leftNow.current = from - (Date.now() - start)
			if (leftNow.current <= 0) dismiss()
			else setLeft(leftNow.current)
		}
		const timer = setInterval(tick, 200)
		return () => clearInterval(timer)
	}, [toast, hovered, focused, dismiss])
	useLayoutEffect(() => {
		if (toast || !focused) return
		setFocused(false)
		const lost = document.activeElement === document.body || !document.activeElement
		if (lost && before.current?.isConnected) before.current.focus()
	}, [toast, focused])
	// a bar pinned along the bottom, or a solid button the toast would land on, lifts it to 12 above;
	// placed again whenever the page under it changes, so it never takes a click meant for a button
	useLayoutEffect(() => {
		const el = region.current
		if ((!toast && !notice) || !el) return
		const place = () => {
			el.style.removeProperty('bottom')
			const boxes = [...el.children].map(c => c.getBoundingClientRect())
			if (!boxes.length) return
			const shown = {
				top: Math.min(...boxes.map(b => b.top)), bottom: Math.max(...boxes.map(b => b.bottom)),
				left: Math.min(...boxes.map(b => b.left)), right: Math.max(...boxes.map(b => b.right))
			}
			const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sp-12'))
			const under = [...document.querySelectorAll(UNDER)]
				.filter(o => !el.contains(o) && o.checkVisibility?.() !== false)
				.map(o => o.getBoundingClientRect())
				.filter(r => r.height && r.left < shown.right && r.right > shown.left && r.top < innerHeight)
			let top = shown.top
			let bottom = shown.bottom
			for (let moved = true; moved && top > 0;) {
				moved = false
				for (const r of under) {
					if (r.top < bottom + gap && r.bottom > top) {
						const lift = bottom + gap - r.top
						top -= lift
						bottom -= lift
						moved = true
					}
				}
			}
			// never past the window's middle: a page full of buttons keeps the toast at its edge
			if (bottom === shown.bottom || top < innerHeight / 2) return
			el.style.bottom = parseFloat(getComputedStyle(el).bottom) + shown.bottom - bottom + 'px'
		}
		let frame = 0
		const later = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place) }
		const watch = new MutationObserver(list => { if (list.some(m => !el.contains(m.target))) later() })
		watch.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'disabled'] })
		place()
		window.addEventListener('scroll', place, true)
		window.addEventListener('resize', place)
		return () => {
			cancelAnimationFrame(frame)
			watch.disconnect()
			window.removeEventListener('scroll', place, true)
			window.removeEventListener('resize', place)
		}
	}, [toast, notice])
	useEffect(() => {
		if (!toast) return
		const key = ev => {
			if (ev.key === 'Escape') dismiss()
			if (toast.undo && ev.key === 'z' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); toast.undo.onClick(); dismiss() }
		}
		document.addEventListener('keydown', key)
		return () => document.removeEventListener('keydown', key)
	}, [toast, dismiss])
	return (
		<ToastContext.Provider value={show}>
			{children}
			<div className="sp-toast-region" aria-live="polite" ref={region}
				onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
				onFocus={ev => { if (!focused) before.current = ev.relatedTarget; setFocused(true) }}
				onBlur={ev => { if (!region.current?.contains(ev.relatedTarget)) setFocused(false) }}>
				{notice}
				{toast
					? (
						<Toast key={toast.key} icon={toast.icon ?? (toast.color === 'danger' ? 'alert-circle' : 'check')} color={toast.color ?? 'default'}
							title={toast.title}
							// the seconds belong to an Undo; a way on (Retry now, Open) is not counted down
							seconds={(toast.undo?.label ?? phrase('action.undo')) === phrase('action.undo') ? Math.ceil(left / 1000) : undefined}>
							{toast.message}
							{toast.undo ? <ToastUndo onClick={() => { toast.undo.onClick(); dismiss() }}>{toast.undo.label ?? phrase('action.undo')}</ToastUndo> : null}
						</Toast>
					)
					: null}
			</div>
		</ToastContext.Provider>
	)
}
