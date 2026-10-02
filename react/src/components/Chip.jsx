import { join, pick, reject } from './variants.js'

const VARIANT = {
	outline: null,
	solid: 'sp-chip--solid',
	dashed: 'sp-chip--dashed',
	pill: 'sp-chip--pill',
	facet: 'sp-chip--facet'
}

const COLOR = { default: null, danger: 'danger' }

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
