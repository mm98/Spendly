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
