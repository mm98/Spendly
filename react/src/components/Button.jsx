import { Link } from 'react-router'
import { Icon } from './Icon.jsx'
import { join, pick, reject } from './variants.js'

const STYLE = { solid: null, outline: 'sp-btn--outline', text: 'sp-btn--text' }
const COLOR = { primary: true, warning: true, danger: true }
// on touch xsmall renders at the small size
const SIZE = { standard: null, small: 'sp-btn--small', xsmall: 'sp-btn--xsmall' }

const BORDER = { line: null, inherit: 'sp-btn--border-inherit' }

/**
 * @param {object} props
 * @param {keyof typeof STYLE} [props.variant] How the button is drawn: `solid` is filled, `outline` has a border and no fill, `text` has neither.
 * @param {keyof typeof COLOR} [props.color] The colour of the fill or the ink: `primary`, `warning`, or `danger` for an action that removes something.
 * @param {keyof typeof SIZE} [props.size] `standard` for most buttons, `small` in a row or a card head, `xsmall` beside a field label or a rail heading. On touch, `xsmall` draws at the small size.
 * @param {keyof typeof BORDER} [props.border] `line` is the usual border. `inherit` takes the border colour from `color`.
 * @param {boolean} [props.fullWidth] The button spans the width of its column.
 * @param {string} [props.to] An address inside the app. The button is drawn as a link.
 * @param {string} [props.href] An address outside the app. The button is drawn as a link that leaves the app.
 * @param {import('./Icon.jsx').IconName} [props.iconStart] An icon before the label.
 * @param {import('./Icon.jsx').IconName} [props.iconEnd] An icon after the label.
 * @param {import('react').ReactNode} [props.children] The label.
 */
export function Button({
	variant = 'solid',
	color = 'primary',
	size = 'standard',
	border = 'line',
	fullWidth = false,
	to,
	href,
	iconStart,
	iconEnd,
	children,
	...rest
}) {
	reject(rest, 'Button')
	pick(COLOR, color, 'color', 'Button')
	const classes = join(
		'sp-btn',
		pick(STYLE, variant, 'variant', 'Button'),
		pick(SIZE, size, 'size', 'Button'),
		pick(BORDER, border, 'border', 'Button'),
		fullWidth && 'sp-btn--block'
	)
	const paint = color === 'primary' ? {} : { 'data-color': color }
	const content = (
		<>
			{iconStart ? <Icon name={iconStart} /> : null}
			{children}
			{iconEnd ? <Icon name={iconEnd} /> : null}
		</>
	)
	if (to) return <Link className={classes} to={to} data-go={to} {...paint} {...rest}>{content}</Link>
	if (href) return <a className={classes} href={href} {...paint} {...rest}>{content}</a>
	return <button type="button" className={classes} {...paint} {...rest}>{content}</button>
}

const ICON_STYLE = { bare: null, outline: 'sp-icon-btn--outline', quiet: 'sp-icon-btn--quiet' }
const ICON_SIZE = { row: null, small: 'sp-icon-btn--small', field: 'sp-icon-btn--field', xsmall: 'sp-icon-btn--xsmall' }

/** @param {object} props
    @param {import('./Icon.jsx').IconName | import('react').ReactElement} props.icon The icon: a name from the icon set, or an icon already drawn.
    @param {keyof typeof ICON_STYLE} [props.variant] `bare` has no border, `outline` has a border, `quiet` has no border and lighter ink.
    @param {keyof typeof ICON_SIZE} [props.size] `row` fits a list row, `small` and `xsmall` are smaller, `field` fits inside a text field.
    @param {boolean} [props.danger] An action that removes something: the icon is drawn in red.
    @param {string} [props.to] An address inside the app. The button is drawn as a link.
    @param {string} [props.href] An address outside the app. The button is drawn as a link that leaves the app. */
export function IconButton({
	icon,
	variant = 'bare',
	size = 'row',
	danger = false,
	to,
	href,
	...rest
}) {
	reject(rest, 'IconButton')
	if (!rest['aria-label']) console.error('<IconButton> needs an aria-label: a glyph names nothing')
	const classes = join(
		'sp-icon-btn',
		pick(ICON_STYLE, variant, 'variant', 'IconButton'),
		pick(ICON_SIZE, size, 'size', 'IconButton'),
		danger && 'sp-ink-danger'
	)
	// an element passes through; a string is a name the register knows
	const glyph = typeof icon === 'string' ? <Icon name={icon} /> : icon
	if (to) return <Link className={classes} to={to} data-go={to} {...rest}>{glyph}</Link>
	if (href) return <a className={classes} href={href} {...rest}>{glyph}</a>
	return <button type="button" className={classes} {...rest}>{glyph}</button>
}
