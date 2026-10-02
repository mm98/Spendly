import { join, reject } from './variants.js'

const COLORS = ['default', 'success', 'danger']

export function Pill({ color = 'default', state, children, ...rest }) {
	reject(rest, 'Pill')
	if (!COLORS.includes(color)) console.error(`<Pill> color="${color}" is not one of: ${COLORS.join(' | ')}`)
	if (state && state !== 'progress') console.error('<Pill> state is progress or nothing')
	if (state && color !== 'default') console.error('<Pill> a pill in progress states no colour')
	return (
		<span
			className={join('sp-pill')}
			{...(color === 'default' ? {} : { 'data-color': color })}
			{...(state ? { 'data-state': state } : {})}
			{...rest}
		>
			{children}
		</span>
	)
}
