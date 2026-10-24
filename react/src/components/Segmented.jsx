import { join, pick, reject } from './variants.js'

const VARIANT = { default: null, facet: 'sp-segmented--facet', narrow: 'sp-segmented--narrow', fill: 'sp-segmented--fill' }

/** `fixed` is a set that is ordered and never grows, like the twelve months (Budget 21a): it
    stays segments past four, where any other set becomes a Combobox.
    @param {object} props
    @param {string} props.name Groups the radios.
    @param {{ value: string, label: string, disabled?: boolean }[]} [props.options] The segments, in order: the value each stands for, its label, and whether it is turned off.
    @param {string} [props.value] The chosen value. Leave it out to let the control keep its own state.
    @param {string} [props.defaultValue] The value chosen at first, when the control keeps its own state.
    @param {(value: string) => void} [props.onChange]
    @param {keyof typeof VARIANT} [props.variant] `default`, `facet` for the switch at the head of a filter panel, `narrow` no wider than a field, `fill` spans its column with equal segments.
    @param {boolean} [props.fixed] A set that is ordered and never grows, like the twelve months. It stays segments past four options. */
export function Segmented({ name, options = [], value, defaultValue, onChange, variant = 'default', fixed = false, ...rest }) {
	reject(rest, 'Segmented')
	if (options.length > 4 && !fixed) console.error('<Segmented> more than four options is a Combobox')
	const controlled = value !== undefined
	return (
		<div className={join('sp-segmented', pick(VARIANT, variant, 'variant', 'Segmented'))} {...rest}>
			{options.map(option => (
				<label className="sp-segmented__item" data-label={option.label} key={option.value}>
					<input
						type="radio"
						name={name}
						value={option.value}
						disabled={option.disabled}
						{...(controlled
							? { checked: value === option.value }
							: { defaultChecked: defaultValue === option.value })}
						onChange={() => onChange?.(option.value)}
					/>
					<span className="sp-label">{option.label}</span>
				</label>
			))}
		</div>
	)
}

// radios in a shell: a set, so it takes a legend rather than a label - see Field
Segmented.fieldRole = 'group'
