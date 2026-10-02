import { join, reject } from './variants.js'

/* The pill: a state, stated. It is never a control, so it renders a span and takes
   no handler.

   `color` says how the state reads; `state` says the thing is still in flight,
   which is not the same claim - a pill in progress is not a pill in trouble, so it
   is its own attribute rather than a fourth colour. */

const COLORS = ['default', 'success', 'danger']

/**
 * @param {object} props
 * @param {'default'|'success'|'danger'} [props.color]
 * @param {'progress'} [props.state]
 * @param {React.ReactNode} props.children
 *
 * Takes no `className` and no `style`.
 */
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
