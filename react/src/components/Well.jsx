import { join, pick, reject } from './variants.js'

const VARIANT = { default: null, quiet: 'sp-well--quiet', snippet: 'sp-well--snippet' }
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

/** Two columns of equal width, each keeping its own height: two wells in one card (Budget 21a), two
    fields, two cards. */
export function Halves({ children, ...rest }) {
	reject(rest, 'Halves')
	return <div className="sp-halves" {...rest}>{children}</div>
}
