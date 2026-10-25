import { join, pick, reject } from './variants.js'
import { m, useRow } from './motion.js'

const VARIANT = {
	outline: null,
	solid: 'sp-chip--solid',
	dashed: 'sp-chip--dashed',
	suggestion: 'sp-chip--dashed sp-chip--suggestion',
	pill: 'sp-chip--pill',
	facet: 'sp-chip--facet'
}

const COLOR = { default: null, danger: 'danger', success: 'success' }

/** @param {object} props
    @param {keyof typeof VARIANT} [props.variant] `outline` has a border, `solid` a fill, `dashed` a dashed border, `suggestion` the dashed chip a reader taps to add a value under a field (36px on touch, with a 48px tap area), `pill` is the small round one a reader taps, `facet` the one they tick in a filter.
    @param {keyof typeof COLOR} [props.color] `default`, or `danger` and `success` for a value that is wrong or done.
    @param {import('react').ReactNode} [props.trail] A small control at the end of the chip, such as the button that removes the value.
    @param {'checkbox' | 'radio'} [props.inputType] Facet only. `checkbox` lets several chips be picked, `radio` only one in the group.
    @param {string} [props.name] Facet only, and required for a radio: it is what makes a set of them one group.
    @param {string} [props.value] Facet only. The value the chip stands for, when it differs from its words. Defaults to the words.
    @param {boolean} [props.selected] Facet only. Whether the chip is picked. Leave it out to let the chip keep its own state.
    @param {boolean} [props.defaultSelected] Facet only. Whether the chip starts picked, when it keeps its own state.
    @param {(selected: boolean, value: string) => void} [props.onSelect]
    @param {() => void} [props.onClick] Renders a button.
    @param {boolean} [props.disabled] The chip cannot be picked.
    @param {number} [props.count] Facet only. How many records have this value, drawn after the words.
    @param {import('react').ReactNode} [props.children] The words on the chip. */
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
	// a facet value with nothing behind it: in its place, greyed, not hidden (c12)
	disabled = false,
	// a facet value's live count, after its name (Order list 2b)
	count,
	children,
	...rest
}) {
	reject(rest, 'Chip')
	// a value in a field grows in as it is added and shrinks out as it is removed (Combobox multiple)
	const moves = useRow()
	if (disabled && variant !== 'facet') console.error('<Chip> disabled belongs to a facet chip: any other chip is text or a button that acts')
	const acts = !!onClick || variant === 'facet'
	const classes = join(
		'sp-chip',
		pick(VARIANT, variant, 'variant', 'Chip'),
		// nothing to click, so nothing that looks clickable
		!acts && 'sp-chip--static'
	)
	const paint = color === 'default' ? {} : { 'data-color': pick(COLOR, color, 'color', 'Chip') }
	// plain words are cut with "…" where the chip runs out of room, not mid-letter
	const text = typeof children === 'string' ? <span className="sp-truncate">{children}</span> : children

	if (variant === 'facet') {
		if (typeof children !== 'string') console.error('<Chip variant="facet"> needs its text as a plain string: the selected width is reserved from a copy of it')
		if (inputType === 'radio' && !name) console.error('<Chip inputType="radio"> needs a name: without one each radio is its own group and none unpicks another')
		const controlled = selected !== undefined
		const stored = value ?? children
		return (
			<m.label className={classes} {...paint} {...moves} {...rest}>
				<input
					type={inputType}
					name={name}
					value={stored}
					disabled={disabled}
					{...(controlled
						? { checked: selected, onChange: e => onSelect?.(e.target.checked, stored) }
						: { defaultChecked: defaultSelected, onChange: e => onSelect?.(e.target.checked, stored) })}
				/>
				<span data-label={children}><span>{children}</span></span>
				{trail}
				{count != null ? <span data-label={count}>{count}</span> : null}
			</m.label>
		)
	}
	if (trail) {
		if (onClick) console.error('<Chip> a chip with a trail is not itself a control')
		return <m.span className={classes} {...paint} {...moves} {...rest}>{typeof children === 'string' ? text : <span>{children}</span>}{trail}</m.span>
	}
	if (onClick) return <m.button type="button" className={classes} onClick={onClick} {...paint} {...moves} {...rest}>{text}</m.button>
	return <m.span className={classes} {...paint} {...moves} {...rest}>{text}</m.span>
}
