import { join, pick, reject } from './variants.js'

/* The well: a bordered box inside a card, for content that belongs to the card but
   reads as its own thing. `quiet` is the tighter grey one that carries a pair of
   lines rather than a block.

   A well directly above a card footer drops the footer's rule, since two
   separators with nothing between them is one too many. The stylesheet does that
   from the structure, so nothing here states it. */

const VARIANT = { default: null, quiet: 'sp-well--quiet' }
const COLOR = { default: null, warning: 'warning', danger: 'danger' }

/**
 * @param {object} props
 * @param {'default'|'quiet'} [props.variant]
 * @param {'default'|'warning'|'danger'} [props.color]
 * @param {React.ReactNode} props.children
 *
 * Takes no `className` and no `style`.
 */
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
