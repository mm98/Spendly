import { join, reject } from './variants.js'

const COLORS = ['default', 'success', 'danger']

/** @param {object} props
    @param {'default' | 'success' | 'danger'} [props.color]
    @param {'progress'} [props.state]
    @param {boolean} [props.truncate]
    @param {import('react').ReactNode} [props.children] */
export function Pill({ color = 'default', state, truncate = false, children, ...rest }) {
	reject(rest, 'Pill')
	if (!COLORS.includes(color)) console.error(`<Pill> color="${color}" is not one of: ${COLORS.join(' | ')}`)
	if (state && state !== 'progress') console.error('<Pill> state is progress or nothing')
	if (state && color !== 'default') console.error('<Pill> a pill in progress states no colour')
	return (
		<span
			className={join('sp-pill', truncate && 'sp-pill--truncate')}
			{...(color === 'default' ? {} : { 'data-color': color })}
			{...(state ? { 'data-state': state } : {})}
			{...rest}
		>
			{children}
		</span>
	)
}
