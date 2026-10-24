import { join, pick, reject } from './variants.js'

/* The note row: a mark, a piece of text and sometimes a trailing control, inset so
   it lines up with the line rows it sits beside.

   `variant` is its structure - outline, primary, stacked, top-aligned - and
   `color` is the set it paints with. A row that can be acted on renders a button
   or a link and takes the hover and focus the stylesheet gives those elements;
   a row that only states something stays a div and takes neither. */

const VARIANT = {
	default: null,
	outline: 'sp-list-item--outline',
	primary: 'sp-list-item--primary',
	stack: 'sp-list-item--stack',
	top: 'sp-list-item--top',
	add: 'sp-list-item--add',
	carried: 'sp-list-item--carried',
	// picked up from the keyboard and not yet dropped: the selected-row tint
	picked: 'sp-list-item--picked',
	card: 'sp-list-item--card',
	// the card row that stays put while the page scrolls under it, lifted off what it
	// covers and a little taller - which is what a form's commit bar is
	sticky: 'sp-list-item--sticky'
}

const COLOR = { default: null, warning: 'warning', danger: 'danger', success: 'success' }

/**
 * @param {object} props
 * @param {keyof typeof VARIANT} [props.variant] `card` puts the row on a surface ground with a surface's edge and padding, for a list with no columns to align. Which body a list shows is a question about the list's own width, answered by a container query - not about a device, and never a second component.
 * @param {keyof typeof COLOR} [props.color]
 * @param {import('react').ReactNode} [props.mark] Leads the row.
 * @param {import('react').ReactNode} [props.handle] A drag grip, for a row in a set the user reorders.
 * @param {import('react').ReactNode} [props.actions] Controls at the row's tail. Wrap one in `ListItemRemove` for the control that appears on hover.
 * @param {number} [props.count] A count at the row's tail.
 * @param {import('react').ReactNode} [props.chevron] Shown when the row opens something.
 * @param {boolean} [props.selected] Outline and card variants, in a set the user picks from.
 * @param {() => void} [props.onClick] Renders a button.
 * @param {string} [props.to] Renders a link.
 * @param {import('react').ReactNode} props.children Takes no `className` and no `style`.
 */
export function ListItem({
	variant = 'default',
	color = 'default',
	mark,
	handle,
	actions,
	count,
	chevron,
	selected,
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
		pick(VARIANT, variant, 'variant', 'ListItem')
	)
	const attrs = {
		...(color === 'default' ? {} : { 'data-color': pick(COLOR, color, 'color', 'ListItem') }),
		...(selected !== undefined ? { 'aria-selected': selected ? 'true' : 'false' } : {}),
		...rest
	}
	const body = (
		<>
			{handle ? <button type="button" className="sp-list-item__handle" aria-label="Reorder">{handle}</button> : null}
			{mark}
			{children}
			{actions ? <div className="sp-list-item__actions">{actions}</div> : null}
			{count != null ? <span className="sp-list-item__count">{count}</span> : null}
			{chevron ? <span className="sp-list-item__chevron">{chevron}</span> : null}
		</>
	)
	if (to) return <a className={classes} href={to} data-go={to} {...attrs}>{body}</a>
	if (onClick || variant === 'add')
		return <button type="button" className={classes} onClick={onClick} {...attrs}>{body}</button>
	return <div className={classes} {...attrs}>{body}</div>
}

/**
 * Where a carried row will land. Belongs to the drag, not to the data.
 */
export function Insertion(props) {
	reject(props, 'Insertion')
	return <span className="sp-list-item__insertion" {...props} />
}

/**
 * A control that appears when its row is hovered or focused, and stays put on touch.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 */
export function ListItemRemove({ children, ...rest }) {
	reject(rest, 'ListItemRemove')
	return <span className="sp-list-item__remove" {...rest}>{children}</span>
}


