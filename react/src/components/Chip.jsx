import { join, pick, reject } from './variants.js'

const VARIANT = {
	outline: null,
	solid: 'sp-chip--solid',
	dashed: 'sp-chip--dashed',
	pill: 'sp-chip--pill',
	facet: 'sp-chip--facet'
}

const COLOR = { default: null, danger: 'danger', success: 'success' }

/** @param {object} props
    @param {keyof typeof VARIANT} [props.variant]
    @param {keyof typeof COLOR} [props.color]
    @param {import('react').ReactNode} [props.trail]
    @param {'checkbox' | 'radio'} [props.inputType]
    @param {string} [props.name]
    @param {string} [props.value]
    @param {boolean} [props.selected]
    @param {boolean} [props.defaultSelected]
    @param {(selected: boolean, value: string) => void} [props.onSelect]
    @param {() => void} [props.onClick]
    @param {boolean} [props.disabled]
    @param {number} [props.count]
    @param {import('react').ReactNode} [props.children] */
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
			<label className={classes} {...paint} {...rest}>
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
			</label>
		)
	}
	if (trail) {
		if (onClick) console.error('<Chip> a chip with a trail is not itself a control')
		return <span className={classes} {...paint} {...rest}>{typeof children === 'string' ? text : <span>{children}</span>}{trail}</span>
	}
	if (onClick) return <button type="button" className={classes} onClick={onClick} {...paint} {...rest}>{text}</button>
	return <span className={classes} {...paint} {...rest}>{text}</span>
}
