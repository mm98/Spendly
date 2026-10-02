import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Scrim } from './Shell.jsx'
import { menuTrigger, useFocusTrap } from './Utilities.jsx'

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

export function Menu({ position, scrolls = false, children, ...rest }) {
	reject(rest, 'Menu')
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
	return (
		<menu
			className={join('sp-menu', position && pick(MENU, position, 'position', 'Menu'), scrolls && 'sp-menu--scrolls')}
			role="menu"
			onKeyDown={keys}
			{...rest}
		>
			{children}
		</menu>
	)
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
		// a click with no pointer behind it came from Enter or Space
		onClickCapture: ev => { if (ev.detail === 0 && !open && trigger(ev.target)) want.current = 'first' }
	}
}

export function MenuItem({ icon, onClick, disabled = false, danger = false, dot, selected, children, ...rest }) {
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
	return (
		<li className={submenu ? 'sp-anchor' : undefined} role="none">
			<button
				type="button"
				className={join('sp-menu__item', danger && 'sp-ink-danger')}
				role="menuitem"
				onClick={act}
				disabled={disabled}
				{...(submenu ? { 'aria-haspopup': 'menu', 'aria-expanded': subOpen ? 'true' : 'false' } : {})}
				{...(submenu ? { onMouseEnter: () => setSubOpen(true), onMouseLeave: () => setSubOpen(false), onFocus: () => setSubOpen(true) } : {})}
				{...(selected === undefined ? {} : { 'aria-selected': selected ? 'true' : 'false' })}
				{...rest}
			>
				{dot ? <span className="sp-combobox__dot" data-dot={dot} /> : null}
				{icon ? <Icon name={icon} size={15} /> : null}
				{label}
				{selected ? <><span className="sp-grow" /><span className="sp-combobox__check"><Icon name="check" size={13} /></span></> : null}
			</button>
			{submenu}
		</li>
	)
}

/** The heading over a group of items. */
export function MenuLabel({ children, ...rest }) {
	reject(rest, 'MenuLabel')
	return <li className="sp-menu__label" role="presentation" {...rest}>{children}</li>
}

/** A rule between groups. */
export function MenuSeparator(props) {
	reject(props, 'MenuSeparator')
	return <li className="sp-menu__sep" role="separator" {...props} />
}

const POPOVER = { default: null, start: 'sp-popover--start', end: 'sp-popover--end', static: 'sp-popover--static' }

export function Popover({ position = 'default', head, children, summary, note, actions, ...rest }) {
	reject(rest, 'Popover')
	return (
		<div className={join('sp-popover', pick(POPOVER, position, 'position', 'Popover'))} {...rest}>
			{head ? <div className="sp-popover__head">{head}</div> : null}
			{children ? <div className="sp-popover__list">{children}</div> : null}
			{summary ? <div className="sp-popover__summary">{summary}</div> : null}
			{note ? <div className="sp-popover__note">{note}</div> : null}
			{actions ? <div className="sp-popover__actions">{actions}</div> : null}
		</div>
	)
}

export function Anchor({ open, ref, children, ...rest }) {
	reject(rest, 'Anchor')
	const own = useRef(null)
	const keys = useMenuButton(own, open)
	const bind = el => {
		own.current = el
		if (typeof ref === 'function') ref(el)
		else if (ref) ref.current = el
	}
	return (
		<span className="sp-anchor" ref={bind} {...keys} {...(open === undefined ? {} : { 'data-open': open ? 'true' : 'false' })} {...rest}>
			{children}
		</span>
	)
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

/** `onCancel` is what Escape does: the dialog's own way out. A page that spaces its blocks wider
    than the dialog does passes them, the actions last, in one stack of its own (6d). */
export function Dialog({ children, scrim = true, onCancel, ...rest }) {
	reject(rest, 'Dialog')
	const box = useRef(null)
	const [parts, setParts] = useState({ title: [], body: [] })
	const register = useCallback((kind, id) => {
		setParts(p => ({ ...p, [kind]: [...p[kind], id] }))
		return () => setParts(p => ({ ...p, [kind]: p[kind].filter(x => x !== id) }))
	}, [])
	useFocusTrap(box, scrim, '.sp-dialog__actions button:not(:disabled)')
	const keys = ev => { if (ev.key === 'Escape' && onCancel) { ev.stopPropagation(); onCancel() } }
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
	const panel = (
		<DialogParts.Provider value={register}>
			<div className="sp-dialog" role="dialog" aria-modal="true" ref={box} tabIndex={-1} onKeyDown={keys}
				{...named} {...(parts.body.length ? { 'aria-describedby': parts.body.join(' ') } : {})} {...rest}>
				<div className="sp-stack sp-gap-6">
					{above}
					{actions}
				</div>
			</div>
		</DialogParts.Provider>
	)
	if (!scrim) return panel
	return createPortal(<Scrim dialog>{panel}</Scrim>, document.body)
}

/** What the dialog asks, as its heading. It names the dialog. */
export function DialogTitle({ children, ...rest }) {
	reject(rest, 'DialogTitle')
	const id = useDialogPart('title')
	return <span className="sp-heading" id={id} {...rest}>{children}</span>
}

/** What the decision costs, stated in full. It is read with the dialog's name. */
export function DialogBody({ children, ...rest }) {
	reject(rest, 'DialogBody')
	const id = useDialogPart('body')
	return <span className="sp-dialog__body" id={id} {...rest}>{children}</span>
}

/** The way out and the commit. It spaces and aligns its own buttons. */
export function DialogActions({ children, ...rest }) {
	reject(rest, 'DialogActions')
	return <div className="sp-dialog__actions" {...rest}>{children}</div>
}

const TOAST_COLOR = { default: null, danger: 'danger' }

export function Toast({ icon, color = 'default', compact = false, asks = false, children, ...rest }) {
	reject(rest, 'Toast')
	// the way back is a child, not a prop: it is the last thing in the row, which is
	// where it is written, and a page cannot put a plain link there by accident
	const kids = [].concat(children ?? []).flat()
	const undo = kids.find(c => c && typeof c === 'object' && c.type === ToastUndo)
	const message = kids.filter(c => c !== undo)
	return (
		<div
			className={join('sp-toast', compact && 'sp-toast--compact', asks && 'sp-toast--asks')}
			role="status"
			{...(color === 'default' ? {} : { 'data-color': pick(TOAST_COLOR, color, 'color', 'Toast') })}
			{...rest}
		>
			{icon ? <span className="sp-toast__icon"><Icon name={icon} /></span> : null}
			<span>{message}</span>
			{undo}
		</div>
	)
}

/** The way back out of what a toast reports. */
export function ToastUndo({ children, onClick, ...rest }) {
	reject(rest, 'ToastUndo')
	return <button type="button" className="sp-toast__undo" onClick={onClick} {...rest}>{children}</button>
}

const ALERT_COLOR = { warning: null, danger: 'danger', success: 'success' }

/** `action` is one button at the row's far end, after a spacer (3a, 3b). */
export function Alert({ color = 'warning', mark, title, action, children, ...rest }) {
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
			</span>
			{action ? <><span className="sp-grow" />{action}</> : null}
		</div>
	)
}

/* One toast at a time, bottom centre, for six seconds; a second replaces the first and
   restarts the time, hovering holds it, Escape dismisses it and Cmd/Ctrl+Z is its Undo (c18). */
const ToastContext = createContext(() => {})

/** Shows a toast: `show({ message, icon, color, undo: { label, onClick } })`. */
export const useToast = () => useContext(ToastContext)

export function Toaster({ children }) {
	const [toast, setToast] = useState(null)
	const [held, setHeld] = useState(false)
	const show = useCallback(next => setToast({ ...next, key: Date.now() }), [])
	const dismiss = useCallback(() => setToast(null), [])
	useEffect(() => {
		if (!toast || held) return
		const timer = setTimeout(dismiss, 6000)
		return () => clearTimeout(timer)
	}, [toast, held, dismiss])
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
			<div className="sp-toast-region" aria-live="polite" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}>
				{toast
					? (
						<Toast key={toast.key} icon={toast.icon ?? (toast.color === 'danger' ? 'alert-circle' : 'check')} color={toast.color ?? 'default'}>
							{toast.message}
							{toast.undo ? <ToastUndo onClick={() => { toast.undo.onClick(); dismiss() }}>{toast.undo.label ?? 'Undo'}</ToastUndo> : null}
						</Toast>
					)
					: null}
			</div>
		</ToastContext.Provider>
	)
}
