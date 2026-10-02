import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Scrim } from './Shell.jsx'

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

export function Menu({ position, scrolls = false, children, ...rest }) {
	reject(rest, 'Menu')
	return (
		<menu
			className={join('sp-menu', position && pick(MENU, position, 'position', 'Menu'), scrolls && 'sp-menu--scrolls')}
			{...rest}
		>
			{children}
		</menu>
	)
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
	return (
		<li className={submenu ? 'sp-anchor' : undefined}>
			<button
				type="button"
				className={join('sp-menu__item', danger && 'sp-ink-danger')}
				onClick={onClick}
				disabled={disabled}
				{...(submenu ? { 'aria-haspopup': 'menu', 'aria-expanded': subOpen ? 'true' : 'false' } : {})}
				{...(submenu ? { onMouseEnter: () => setSubOpen(true), onMouseLeave: () => setSubOpen(false), onFocus: () => setSubOpen(true) } : {})}
				{...(selected === undefined ? {} : { 'aria-selected': selected ? 'true' : 'false' })}
				{...rest}
			>
				{dot ? <span className="sp-combobox__dot" data-dot={dot} /> : null}
				{icon ? <Icon name={icon} /> : null}
				{label}
				{selected ? <><span className="sp-grow" /><Icon name="check" /></> : null}
			</button>
			{submenu}
		</li>
	)
}

/** The heading over a group of items. */
export function MenuLabel({ children, ...rest }) {
	reject(rest, 'MenuLabel')
	return <li className="sp-menu__label" {...rest}>{children}</li>
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
			<div className="sp-popover__list">{children}</div>
			{summary ? <div className="sp-popover__summary">{summary}</div> : null}
			{note ? <div className="sp-popover__note">{note}</div> : null}
			{actions ? <div className="sp-popover__actions">{actions}</div> : null}
		</div>
	)
}

export function Anchor({ open, children, ...rest }) {
	reject(rest, 'Anchor')
	return (
		<span className="sp-anchor" {...(open === undefined ? {} : { 'data-open': open ? 'true' : 'false' })} {...rest}>
			{children}
		</span>
	)
}

/** `onCancel` is what Escape does: the dialog's own way out. */
export function Dialog({ children, scrim = true, onCancel, ...rest }) {
	reject(rest, 'Dialog')
	const box = useRef(null)
	useEffect(() => {
		if (!scrim) return
		const back = document.activeElement
		const first = box.current?.querySelector('.sp-dialog__actions button')
		;(first ?? box.current)?.focus()
		return () => back?.focus?.()
	}, [scrim])
	const keys = ev => {
		if (ev.key === 'Escape' && onCancel) { ev.stopPropagation(); onCancel() }
		if (ev.key !== 'Tab') return
		const stops = [...box.current.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')]
		if (!stops.length) return
		const [head, tail] = [stops[0], stops.at(-1)]
		if (ev.shiftKey && document.activeElement === head) { ev.preventDefault(); tail.focus() }
		else if (!ev.shiftKey && document.activeElement === tail) { ev.preventDefault(); head.focus() }
	}
	const kids = [].concat(children ?? []).flat()
	const actions = kids.find(c => c && typeof c === 'object' && c.type === DialogActions)
	// plain words passed straight to the dialog are the body, so the common case
	// stays one sentence rather than a wrapper around one sentence
	const above = kids.filter(c => c !== actions).map((c, i) =>
		typeof c === 'string' ? <DialogBody key={'body' + i}>{c}</DialogBody> : c)
	if (!actions) console.error('<Dialog> has no <DialogActions>: a decision with no way out cannot be answered')
	const panel = (
		<div className="sp-dialog" role="dialog" aria-modal="true" ref={box} tabIndex={-1} onKeyDown={keys} {...rest}>
			<div className="sp-stack sp-gap-6">{above}</div>
			{actions}
		</div>
	)
	if (!scrim) return panel
	return createPortal(<Scrim dialog>{panel}</Scrim>, document.body)
}

/** What the dialog asks, as its heading. */
export function DialogTitle({ children, ...rest }) {
	reject(rest, 'DialogTitle')
	return <span className="sp-heading" {...rest}>{children}</span>
}

/** What the decision costs, stated in full. */
export function DialogBody({ children, ...rest }) {
	reject(rest, 'DialogBody')
	return <span className="sp-dialog__body" {...rest}>{children}</span>
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
				<span className="sp-alert__title">{title}</span>
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
