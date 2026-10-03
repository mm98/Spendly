import { Link } from 'react-router'
import { Icon } from './Icon.jsx'
import { join, pick, reject } from './variants.js'

/* Which element renders is decided by what the button does: `to` is an in-app
   route and renders a react-router link, `href` is a URL outside the app and
   renders an anchor, neither renders a <button>.

   `variant` and `size` ride in the class, `color` in `data-color`. */

const STYLE = { solid: null, outline: 'sp-btn--outline', text: 'sp-btn--text' }
const COLOR = { primary: true, warning: true, danger: true }
const SIZE = { standard: null, small: 'sp-btn--small', xsmall: 'sp-btn--xsmall' }

/** Where the border takes its colour. Omitted it is the grey line, as everywhere
    else; `inherit` takes it from the button's own `color`, for a button on a tinted
    ground where a grey border does not read. No colour can be named, so no pairing of
    a fill from one colour and a border from another can be invented. */
const BORDER = { line: null, inherit: 'sp-btn--border-inherit' }

/**
 * @param {object} props
 * @param {'solid'|'outline'|'text'} [props.variant]
 * @param {'primary'|'warning'|'danger'} [props.color]
 * @param {'standard'|'small'|'xsmall'} [props.size] `xsmall` is for a rail section
 *   header; on touch it renders at the small size.
 * @param {'line'|'inherit'} [props.border] `inherit` takes the border from `color`.
 * @param {boolean} [props.fullWidth]
 * @param {string} [props.to] An in-app route. Renders a link.
 * @param {string} [props.href] A URL outside the app. Renders an anchor.
 * @param {string} [props.iconStart] An Icon name before the label.
 * @param {string} [props.iconEnd] An Icon name after the label.
 * @param {React.ReactNode} [props.children] The label.
 *
 * Takes no `className` and no `style`.
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

/**
 * `aria-label` is required: an icon alone is silent to a screen reader. It is
 * spelled as the attribute rather than as `label`, because that is where it goes -
 * a prop called label that never appears on screen is a prop that misleads.
 *
 * @param {object} props
 * @param {React.ReactNode} props.icon The glyph. An element, as every other slot in
 *   this library takes - Combobox's lead, a Field's lead and trail, a Mark's text,
 *   a ListItem's chevron. A name string is accepted too, since this component's own
 *   first form took one.
 * @param {string} props['aria-label'] What the control does.
 * @param {'bare'|'outline'|'quiet'} [props.variant]
 * @param {'row'|'small'|'field'|'xsmall'} [props.size]
 * @param {boolean} [props.danger] An action that removes something: the red ink,
 *   on the same outline. The same state MenuItem has.
 * @param {string} [props.to] An in-app route. Renders a link.
 * @param {string} [props.href] A URL outside the app. Renders an anchor.
 *
 * Takes no `className` and no `style`.
 */
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
