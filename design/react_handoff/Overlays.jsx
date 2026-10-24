import { useState } from 'react'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Scrim } from './Shell.jsx'

/* The surfaces that appear over a page, and the two rows that tell the reader
   something.

   A Menu acts on click: every item is a button that does its thing and closes. A
   Popover waits: it holds a decision and a Cancel / Apply pair, so nothing happens
   until the reader applies it. A Dialog interrupts: it takes the whole screen's
   attention and cannot be dismissed by ignoring it. They are three components
   because those are three different promises to the reader, not three sizes.

   A Toast reports what already happened and takes itself away. An Alert states a
   condition that persists - something over its limit, something that failed - and
   stays until the condition does. */

const MENU = {
	floating: 'sp-menu--floating',
	sub: 'sp-menu__sub',
	row: 'sp-menu--row',
	plain: 'sp-menu--plain',
	up: 'sp-menu--up',
	start: 'sp-menu--start',
	'side-left': 'sp-menu--side-left',
	'side-right': 'sp-menu--side-right'
}

/**
 * A list of actions, each of which acts at once.
 *
 *
 *
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {keyof typeof MENU} [props.position] `sub` is a menu inside a menu item, opening to the side of its row. Where the panel sits against its trigger. `plain` is a menu with no panel of its own, for one inside a sheet or a dialog where the surface is already there.
 * @param {boolean} [props.scrolls] Caps its height and scrolls, for a list whose length the page does not know.
 * @param {import('react').ReactNode} props.children The label, and a nested `<Menu>` where the row opens one - written beneath the label, the way the markup nests it: an item with a submenu is a button and a menu inside one list item. The item reads which of its children is the menu, so there is no prop for it. MenuItems, MenuLabels and MenuSeparators.
 */
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

/**
 * One action. A real button, so Enter and Space work and a disabled one is
 * genuinely unreachable.
 *
 * @param {object} props
 * @param {string} [props.icon] An Icon name.
 * @param {() => void} [props.onClick]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.danger] The action that removes something. One per menu, and last, under a separator - a destructive item among ordinary ones is how it gets clicked by accident.
 * @param {'draft' | 'progress' | 'done' | 'returned' | 'cancelled'} [props.dot] A status dot before the label: draft, progress, done, returned, cancelled. The same dot the combobox uses, since it is the same thing.
 * @param {boolean} [props.selected] The status this record already has.
 * @param {import('react').ReactNode} props.children The label, and a nested `<Menu>` where the row opens one - written beneath the label, the way the markup nests it: an item with a submenu is a button and a menu inside one list item. The item reads which of its children is the menu, so there is no prop for it.
 */
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

/**
 * The heading over a group of items.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 */
export function MenuLabel({ children, ...rest }) {
	reject(rest, 'MenuLabel')
	return <li className="sp-menu__label" {...rest}>{children}</li>
}

/**
 * A rule between groups.
 */
export function MenuSeparator(props) {
	reject(props, 'MenuSeparator')
	return <li className="sp-menu__sep" role="separator" {...props} />
}

const POPOVER = { default: null, start: 'sp-popover--start', end: 'sp-popover--end', static: 'sp-popover--static' }

/**
 * A panel that asks for a decision before it applies. Not a Menu: a menu item acts
 * on click, this one waits for Apply.
 *
 *
 *
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {keyof typeof POPOVER} [props.position] Which edge it hangs from. `static` is one drawn in place rather than over the page.
 * @param {import('react').ReactNode} props.head A title, and any word about what this does.
 * @param {import('react').ReactNode} props.children The label, and a nested `<Menu>` where the row opens one - written beneath the label, the way the markup nests it: an item with a submenu is a button and a menu inside one list item. The item reads which of its children is the menu, so there is no prop for it. The choices.
 * @param {import('react').ReactNode} [props.summary] What applying will do, in the reader's terms - a count, a total.
 * @param {import('react').ReactNode} [props.note] A quiet line at the panel's foot.
 * @param {import('react').ReactNode} props.actions The Cancel and Apply pair.
 */
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

/**
 * The element a panel hangs from. Without it the panel measures itself against the
 * page instead of its trigger.
 *
 * @param {object} props
 * @param {boolean} [props.open] Whether the panel inside it is showing. The anchor carries this, not the trigger: the stylesheet reads `[data-open]` here to show the panel, so a page that only sets `aria-expanded` on its button gets a menu that renders and never appears.
 * @param {import('react').ReactNode} [props.children]
 */
export function Anchor({ open, children, ...rest }) {
	reject(rest, 'Anchor')
	return (
		<span className="sp-anchor" {...(open === undefined ? {} : { 'data-open': open ? 'true' : 'false' })} {...rest}>
			{children}
		</span>
	)
}

/**
 * A decision that interrupts. It spaces its own contents, so a use cannot forget to:
 * every part - the title, the body, a note, the action row - sits straight in
 * `.sp-dialog`, 12 apart, as the dialogs are drawn (Settings and import 11b, States
 * and confirmations 6d). Nothing above the actions is wrapped in a stack of its own,
 * so the title and the body are 12 apart, not 6.
 *
 * Its parts are written as children, the way the markup nests them: a title, what
 * the decision costs, and the actions. The dialog reads which of its children is the
 * action row and puts the rest above it, so the order on the page is the order in
 * the call and a use cannot pass a button where a sentence goes.
 *
 *
 *
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children A `<DialogTitle>`, the body - a `<DialogBody>` or plain words - and a `<DialogActions>`. A dialog that asks without saying what happens is a dialog nobody can answer.
 * @param {boolean} [props.scrim] Draw it over the dimmed page, as it appears in use. A dialog with no scrim is one being shown rather than used.
 */
export function Dialog({ children, scrim = true, ...rest }) {
	reject(rest, 'Dialog')
	const kids = [].concat(children ?? []).flat()
	const actions = kids.find(c => c && typeof c === 'object' && c.type === DialogActions)
	// plain words passed straight to the dialog are the body, so the common case
	// stays one sentence rather than a wrapper around one sentence
	const above = kids.filter(c => c !== actions).map((c, i) =>
		typeof c === 'string' ? <DialogBody key={'body' + i}>{c}</DialogBody> : c)
	if (!actions) console.error('<Dialog> has no <DialogActions>: a decision with no way out cannot be answered')
	const panel = (
		<div className="sp-dialog" role="dialog" aria-modal="true" {...rest}>
			{above}
			{actions}
		</div>
	)
	if (!scrim) return panel
	return <Scrim dialog>{panel}</Scrim>
}

/**
 * What the dialog asks, as its heading.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 */
export function DialogTitle({ children, ...rest }) {
	reject(rest, 'DialogTitle')
	return <span className="sp-heading" {...rest}>{children}</span>
}

/**
 * What the decision costs, stated in full.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 */
export function DialogBody({ children, ...rest }) {
	reject(rest, 'DialogBody')
	return <span className="sp-dialog__body" {...rest}>{children}</span>
}

/**
 * The way out and the commit. It spaces and aligns its own buttons.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 */
export function DialogActions({ children, ...rest }) {
	reject(rest, 'DialogActions')
	return <div className="sp-dialog__actions" {...rest}>{children}</div>
}

const TOAST_COLOR = { default: null, danger: 'danger' }

/**
 * What already happened, with the way back if there is one. It reports; it does not
 * ask - a toast that needs an answer is the `asks` variant, which stays on the
 * page's own surface so it does not read as something that will disappear.
 *
 *
 *
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {string} [props.icon] An Icon name.
 * @param {keyof typeof TOAST_COLOR} [props.color]
 * @param {boolean} [props.compact] The smaller one, for a count or a status.
 * @param {boolean} [props.asks] It needs an answer, so it does not take itself away.
 * @param {import('react').ReactNode} props.children What happened, and a `<ToastUndo>` where there is a way back - written after the message, the way the markup nests it. The toast reads which of its children is the undo, so there is no prop for it.
 */
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

/**
 * The way back out of what a toast reports.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 * @param {() => void} [props.onClick]
 */
export function ToastUndo({ children, onClick, ...rest }) {
	reject(rest, 'ToastUndo')
	return <button type="button" className="sp-toast__undo" onClick={onClick} {...rest}>{children}</button>
}

const ALERT_COLOR = { warning: null, danger: 'danger', success: 'success' }

/**
 * A condition that persists, stated where it applies. Warning is the default,
 * because that is what an alert is for: something the reader may proceed past.
 *
 *
 *
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {keyof typeof ALERT_COLOR} [props.color]
 * @param {import('react').ReactNode} [props.mark] The glyph in its own round mark.
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} [props.children] What it means for the reader, in their terms.
 */
export function Alert({ color = 'warning', mark, title, children, ...rest }) {
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
		</div>
	)
}
