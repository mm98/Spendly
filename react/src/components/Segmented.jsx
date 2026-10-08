import { join, pick, reject } from './variants.js'

const VARIANT = { default: null, facet: 'sp-segmented--facet', narrow: 'sp-segmented--narrow' }

/** `fixed` is a set that is ordered and never grows, like the twelve months (Budget 21a): it
    stays segments past four, where any other set becomes a Combobox. */
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
