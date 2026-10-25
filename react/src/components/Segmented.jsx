import { useId, useState } from 'react'
import { join, pick, reject } from './variants.js'
import { glide, m } from './motion.js'

const VARIANT = { default: null, facet: 'sp-segmented--facet', narrow: 'sp-segmented--narrow' }
const SIZE = { default: null, small: 'sp-segmented--small' }

/** `fixed` is a set that is ordered and never grows, like the twelve months (Budget 21a): it
    stays segments past four, where any other set becomes a Combobox. The green is drawn once, on the
    chosen segment, and moves to the one picked next.
    @param {object} props
    @param {string} props.name Groups the radios.
    @param {{ value: string | number, label: string, disabled?: boolean }[]} [props.options] The segments, in order: the value each stands for, its label, and whether it is turned off.
    @param {string | number} [props.value] The chosen value, of the options' own kind, such as a month's number. Leave it out to let the control keep its own state.
    @param {string | number} [props.defaultValue] The value chosen at first, when the control keeps its own state.
    @param {(value: string | number) => void} [props.onChange]
    @param {keyof typeof VARIANT} [props.variant] `default`, `facet` for the switch at the head of a filter panel, `narrow` no wider than a field.
    @param {boolean} [props.fullWidth] Take all the room the control is given, the segments sharing it equally.
    @param {keyof typeof SIZE} [props.size] `default` at the field height, `small` at the small button's, for a card head or beside small buttons.
    @param {boolean} [props.fixed] A set that is ordered and never grows, like the twelve months. It stays segments past four options. */
export function Segmented({ name, options = [], value, defaultValue, onChange, variant = 'default', size = 'default', fixed = false, fullWidth = false, ...rest }) {
	reject(rest, 'Segmented')
	if (options.length > 4 && !fixed) console.error('<Segmented> more than four options is a Combobox')
	const controlled = value !== undefined
	const marker = useId()
	// the chosen segment, held here too when the control keeps its own state, so the green can move to it
	const [own, setOwn] = useState(defaultValue)
	const chosen = controlled ? value : own
	return (
		<div className={join('sp-segmented', pick(VARIANT, variant, 'variant', 'Segmented'), pick(SIZE, size, 'size', 'Segmented'), fullWidth && 'sp-segmented--fill')} {...rest}>
			{options.map(option => (
				<label className="sp-segmented__item" data-label={option.label} key={option.value}>
					{chosen === option.value
						? <m.span className="sp-marker" layoutId={marker} transition={glide()} aria-hidden="true" />
						: null}
					<input
						type="radio"
						name={name}
						value={option.value}
						disabled={option.disabled}
						{...(controlled
							? { checked: value === option.value }
							: { defaultChecked: defaultValue === option.value })}
						onChange={() => { setOwn(option.value); onChange?.(option.value) }}
					/>
					<span className="sp-label">{option.label}</span>
				</label>
			))}
		</div>
	)
}

// radios in a shell: a set, so it takes a legend rather than a label - see Field
Segmented.fieldRole = 'group'
