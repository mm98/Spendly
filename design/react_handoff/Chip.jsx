import { join, pick, reject } from './variants.js'

/* The chip: a short piece of state that can usually be acted on. `variant` is its
   structure, `color` is the one set it can paint with.

   A facet chip is the selectable kind: its input is visually hidden, the label
   carries the checked look, and the text reserves the bold width so selecting it
   does not move its neighbours - so that variant needs its text as a plain string. */

/* What the chip is, rather than how it is drawn.

   `static` is not here. A chip that states a value rather than offering one is a
   chip with nothing to click, and the component can see that for itself - being told
   was a second way to say the same thing, and a chip could be given the pointer of a
   control it did not have. It keeps the whole box either way: a value in a chip is
   not plain text, it is a chip that cannot be acted on. */
const VARIANT = {
	outline: null,
	solid: 'sp-chip--solid',
	dashed: 'sp-chip--dashed',
	pill: 'sp-chip--pill',
	facet: 'sp-chip--facet'
}

const COLOR = { default: null, danger: 'danger' }

/**
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {keyof typeof VARIANT} [props.variant] Appearance on the style axis, and the same words Button uses: `outline` has a border and no ground, `solid` a ground and no border, `dashed` an open border. `pill` is the small round one the reader taps; `facet` the one they tick. A chip with no `onClick` states a value and cannot be acted on, which the component works out for itself.
 * @param {keyof typeof COLOR} [props.color]
 * @param {import('react').ReactNode} [props.trail] A control at the chip's tail - the remove on a value in a set. A chip with one is a span carrying a button, never a button inside a button.
 * @param {'checkbox' | 'radio'} [props.inputType] Facet only.
 * @param {string} [props.name] Facet only, and required for a radio: it is what makes a set of them one group.
 * @param {string} [props.value] Facet only. What the chip stands for, when that is not the words on it - "In progress" shown, 'progress' stored. Defaults to the text, and reaches `onSelect` as its second argument.
 * @param {boolean} [props.selected] Controlled. Omit for uncontrolled.
 * @param {boolean} [props.defaultSelected] Uncontrolled starting state.
 * @param {(selected: boolean, value: string) => void} [props.onSelect]
 * @param {() => void} [props.onClick] Renders a button.
 * @param {import('react').ReactNode} props.children The text. The facet variant needs it as a plain string, since it reserves its selected width from a copy of it.
 */
export function Chip({
	variant = 'outline',
	color = 'default',
	trail,
	inputType = 'checkbox',
	name,
	value,
	selected,
	defaultSelected,
	onSelect,
	onClick,
	children,
	...rest
}) {
	reject(rest, 'Chip')
	const acts = !!onClick || variant === 'facet'
	const classes = join(
		'sp-chip',
		pick(VARIANT, variant, 'variant', 'Chip'),
		// nothing to click, so nothing that looks clickable
		!acts && 'sp-chip--static'
	)
	const paint = color === 'default' ? {} : { 'data-color': pick(COLOR, color, 'color', 'Chip') }
	const text = children

	if (variant === 'facet') {
		if (typeof children !== 'string') console.error('<Chip variant="facet"> needs its text as a plain string: the selected width is reserved from a copy of it')
		if (inputType === 'radio' && !name) console.error('<Chip inputType="radio"> needs a name: without one each radio is its own group and none unpicks another')
		const controlled = selected !== undefined
		/* The value the chip stands for, which is not always the words on it - "In
		   progress" is shown but 'progress' is stored. It goes on the input, so a form
		   submits something meaningful and a radio group can say which one was picked;
		   onSelect gets it as its second argument, since a boolean alone tells a group
		   of three nothing. The text is the fallback, so the simple case needs nothing. */
		const stored = value ?? children
		return (
			<label className={classes} {...paint} {...rest}>
				<input
					type={inputType}
					name={name}
					value={stored}
					{...(controlled
						? { checked: selected, onChange: e => onSelect?.(e.target.checked, stored) }
						: { defaultChecked: defaultSelected, onChange: e => onSelect?.(e.target.checked, stored) })}
				/>
				<span data-label={children}>{children}</span>
			</label>
		)
	}
	if (trail) {
		if (onClick) console.error('<Chip> a chip with a trail is not itself a control')
		return <span className={classes} {...paint} {...rest}><span>{text}</span>{trail}</span>
	}
	if (onClick) return <button type="button" className={classes} onClick={onClick} {...paint} {...rest}>{text}</button>
	return <span className={classes} {...paint} {...rest}>{text}</span>
}
