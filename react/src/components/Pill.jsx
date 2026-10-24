import { join, reject } from './variants.js'

const COLORS = /** @type {const} */ (['default', 'success', 'danger'])

/** @param {object} props
    @param {typeof COLORS[number]} [props.color] `default`, or `success` and `danger` for a status that is done or wrong.
    @param {'progress'} [props.state] `progress` draws the pill as a status that is still going on. A pill in progress has no colour.
    @param {boolean} [props.truncate] Cut long words with an ellipsis instead of wrapping.
    @param {import('react').ReactNode} [props.children] The words on the pill. */
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
