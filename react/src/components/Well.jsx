import { join, pick, reject } from './variants.js'

const VARIANT = { default: null, quiet: 'sp-well--quiet' }
const COLOR = { default: null, warning: 'warning', danger: 'danger' }

export function Well({ variant = 'default', color = 'default', children, ...rest }) {
	reject(rest, 'Well')
	return (
		<div
			className={join('sp-well', pick(VARIANT, variant, 'variant', 'Well'))}
			{...(color === 'default' ? {} : { 'data-color': pick(COLOR, color, 'color', 'Well') })}
			{...rest}
		>
			{children}
		</div>
	)
}

/** Two columns of equal width: two wells in one card (Budget 21a), two fields, two cards. `cards` is a
    row of cards, which share one height (15a); fields and wells keep their own. */
export function Halves({ cards = false, children, ...rest }) {
	reject(rest, 'Halves')
	return <div className={join('sp-halves', cards && 'sp-halves--cards')} {...rest}>{children}</div>
}
