import { join, pick, reject } from './variants.js'

/* Segmented: two to four choices, all visible, one picked.

   It is radios in a bordered shell, not buttons - so the arrow keys move between
   the options and a form reads it without any JavaScript. The label is measured at
   its selected weight, which is what stops the row shifting as the pick moves, so
   every item needs its label as a string. */

/**
 * @param {object} props
 * @param {string} props.name Groups the radios.
 * @param {Array<{value: string, label: string, disabled?: boolean}>} props.options
 * @param {string} [props.value] Controlled.
 * @param {string} [props.defaultValue]
 * @param {(value: string) => void} [props.onChange]
 * @param {'default'|'facet'} [props.variant] `facet` spans its column with equal
 *   shares and no border of its own, for the switch at the head of a facet panel.
 *
 * Takes no `className` and no `style`.
 */
const VARIANT = { default: null, facet: 'sp-segmented--facet' }

export function Segmented({ name, options = [], value, defaultValue, onChange, variant = 'default', ...rest }) {
	reject(rest, 'Segmented')
	if (options.length > 4) console.error('<Segmented> more than four options is a Combobox')
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
