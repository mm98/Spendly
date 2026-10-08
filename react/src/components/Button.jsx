import { Link } from 'react-router'
import { Icon } from './Icon.jsx'
import { join, pick, reject } from './variants.js'

const STYLE = { solid: null, outline: 'sp-btn--outline', text: 'sp-btn--text' }
const COLOR = { primary: true, warning: true, danger: true }
// on touch xsmall renders at the small size
const SIZE = { standard: null, small: 'sp-btn--small', xsmall: 'sp-btn--xsmall' }

const BORDER = { line: null, inherit: 'sp-btn--border-inherit' }

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
