import { Link } from 'react-router'
import { join, pick, reject } from './variants.js'

const VARIANT = {
	default: null,
	outline: 'sp-list-item--outline',
	primary: 'sp-list-item--primary',
	stack: 'sp-list-item--stack',
	top: 'sp-list-item--top',
	add: 'sp-list-item--add',
	carried: 'sp-list-item--carried',
	// picked up from the keyboard, waiting for Space to drop it
	picked: 'sp-list-item--picked',
	card: 'sp-list-item--card',
	// the card row that stays put while the page scrolls under it, lifted off what it
	// covers and a little taller - which is what a form's commit bar is
	sticky: 'sp-list-item--sticky'
}

const COLOR = { default: null, warning: 'warning', danger: 'danger', success: 'success' }

/** @param {object} props
    @param {keyof typeof VARIANT} [props.variant] The row's form: `default`, `outline`, `primary`, `stack` (lines under each other), `top` (aligned to the top), `add` (a row that adds one), `carried` and `picked` (while being moved), `card` (a row on its own surface), `sticky` (stays put while the page scrolls).
    @param {keyof typeof COLOR} [props.color] The row's tint for something that needs attention: `warning` (amber), `danger` or `success`.
    @param {import('react').ReactNode} [props.mark] The part at the start of the row: a mark, a photo or an icon.
    @param {import('react').ReactNode} [props.handle] A drag handle, so the row can be moved.
    @param {string} [props.handleLabel] What the drag handle says it moves, such as Move Housing.
    @param {import('react').ReactNode} [props.actions] Controls at the end of the row.
    @param {number} [props.count] A count at the end of the row.
    @param {import('react').ReactNode} [props.chevron] An arrow at the end, for a row that opens something.
    @param {boolean} [props.selected] The row is the picked one in a set. Outline and card rows only.
    @param {boolean} [props.opens] The row opens something when clicked: the pointer and the hover fill show it.
    @param {boolean} [props.editable] The row turns into a field: it keeps one height at rest and while editing.
    @param {boolean} [props.setting] The row holds a setting: it keeps its ground when an option in it is ticked.
    @param {() => void} [props.onClick] Renders a button.
    @param {string} [props.to] An address inside the app. The row is drawn as a link.
    @param {import('react').ReactNode} [props.children] What the row says. */
export function ListItem({
	variant = 'default',
	color = 'default',
	mark,
	handle,
	// what the handle says it moves: a row of several, each named, is one a reader can tell apart
	handleLabel = 'Reorder',
	actions,
	count,
	chevron,
	selected,
	// a row that opens on a click its list handles: the pointer and the hover fill of one that does (c15)
	opens = false,
	// a row that turns into a field (rename, edit): one height at rest and while editing (Settings 11a)
	editable = false,
	// a row that holds a setting keeps its ground when an option in it is checked (7a, 11b)
	setting = false,
	onClick,
	to,
	children,
	...rest
}) {
	reject(rest, 'ListItem')
	if (selected !== undefined && !['outline', 'card'].includes(variant))
		console.error('<ListItem> selected belongs to the outline and card variants')
	// sticky is the card variant and then some, so it carries the card's class as well
	const classes = join(
		'sp-list-item',
		variant === 'sticky' && 'sp-list-item--card',
		pick(VARIANT, variant, 'variant', 'ListItem'),
		opens && 'sp-list-item--opens',
		editable && 'sp-list-item--editable',
		setting && 'sp-list-item--setting'
	)
	const attrs = {
		...(color === 'default' ? {} : { 'data-color': pick(COLOR, color, 'color', 'ListItem') }),
		...(selected !== undefined ? { 'aria-selected': selected ? 'true' : 'false' } : {}),
		...rest
	}
	const body = (
		<>
			{/* an add row holds the handle's column empty, so it lines up under rows that can move */}
			{handle && variant === 'add' ? <span className="sp-list-item__handle" aria-hidden="true" />
				: handle ? <button type="button" className="sp-list-item__handle" aria-label={handleLabel}>{handle}</button> : null}
			{mark}
			{/* the count leads what it counts, as the attention row draws it (Components) */}
			{count != null ? <span className="sp-list-item__count">{count}</span> : null}
			{children}
			{actions ? <div className="sp-list-item__actions">{actions}</div> : null}
			{chevron ? <span className="sp-list-item__chevron">{chevron}</span> : null}
		</>
	)
	if (to) return <Link className={classes} to={to} data-go={to} {...attrs}>{body}</Link>
	if (onClick || variant === 'add')
		return <button type="button" className={classes} onClick={onClick} {...attrs}>{body}</button>
	return <div className={classes} {...attrs}>{body}</div>
}

/** The heading over a set of rows that carries a total (c33, sp-list-head): on the rows' inset,
    so the label starts on their first column and the total ends on their amounts.
    @param {object} props
    @param {string} props.label The heading's words.
    @param {string} props.amount The total, at the end, lined up with the rows' amounts. */
export function ListItemHead({ label, amount, ...rest }) {
	reject(rest, 'ListItemHead')
	return (
		<div className="sp-list-head" {...rest}>
			<span className="sp-section-label">{label}</span>
			<span className="sp-grow" />
			<span className="sp-amount">{amount}</span>
		</div>
	)
}

/** What a reorder by keyboard says after each move, read out and not drawn (c1 Ordering by hand).
    @param {object} props
    @param {import('react').ReactNode} [props.children] What is read out after each move. It is not drawn. */
export function Announce({ children, ...rest }) {
	reject(rest, 'Announce')
	return <span className="sp-announce" aria-live="polite" {...rest}>{children}</span>
}

/** Where a carried row will land. Belongs to the drag, not to the data. */
export function Insertion(props) {
	reject(props, 'Insertion')
	return <span className="sp-list-item__insertion" {...props} />
}

/** A control that appears when its row is hovered or focused, and stays put on touch.
    @param {object} props
    @param {import('react').ReactNode} [props.children] The control that appears when the row is hovered or focused. */
export function ListItemRemove({ children, ...rest }) {
	reject(rest, 'ListItemRemove')
	return <span className="sp-list-item__remove" {...rest}>{children}</span>
}

