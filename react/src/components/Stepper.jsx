import { useState } from 'react'
import { reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { formatNumber, parseNumber, round } from './format.js'

export function Stepper({
	value,
	defaultValue = 1,
	onChange,
	min,
	max,
	step = 1,
	locale,
	// the field's label points at the value, not at the group around it
	id,
	...rest
}) {
	reject(rest, 'Stepper')
	const [held, setHeld] = useState(defaultValue)
	const [typing, setTyping] = useState(null)
	const controlled = value !== undefined
	const current = controlled ? value : held

	// the decimals the step implies: 0.25 is two, 1 is none
	const decimals = (String(step).split('.')[1] || '').length
	const fractional = decimals > 0

	const clamp = n => {
		if (n === null || Number.isNaN(n)) return current
		if (min !== undefined && n < min) return min
		if (max !== undefined && n > max) return max
		return round(n, decimals)
	}
	const set = next => {
		const n = clamp(next)
		if (!controlled) setHeld(n)
		if (n !== current) onChange?.(n)
		return n
	}

	const shown = typing ?? (fractional ? formatNumber(current, { locale, decimals }) : String(current))

	return (
		<div className="sp-stepper" {...rest}>
			<button
				type="button"
				className="sp-stepper__btn"
				aria-label={`One step fewer ${rest['aria-label']}`}
				disabled={min !== undefined && current <= min}
				onClick={() => { setTyping(null); set(current - step) }}
			>
				<Icon name="minus" />
			</button>
			<input
				type={fractional ? 'text' : 'number'}
				inputMode="decimal"
				size={4}
				id={id}
				className="sp-stepper__value"
				aria-label={rest['aria-label']}
				role={fractional ? 'spinbutton' : undefined}
				aria-valuenow={fractional ? current : undefined}
				aria-valuemin={fractional ? min : undefined}
				aria-valuemax={fractional ? max : undefined}
				min={min}
				max={max}
				step={step}
				value={shown}
				onChange={ev => {
					const text = ev.target.value
					// held while the field is being typed in, so a half-written number
					// is not reformatted under the cursor
					setTyping(text)
					const n = parseNumber(text, { locale })
					if (n !== null) set(n)
				}}
				onBlur={() => setTyping(null)}
				onKeyDown={ev => {
					if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return
					if (!fractional) return   // the number input does this itself
					ev.preventDefault()
					setTyping(null)
					set(current + (ev.key === 'ArrowUp' ? step : -step))
				}}
			/>
			<button
				type="button"
				className="sp-stepper__btn"
				aria-label={`One step more ${rest['aria-label']}`}
				disabled={max !== undefined && current >= max}
				onClick={() => { setTyping(null); set(current + step) }}
			>
				<Icon name="plus" />
			</button>
		</div>
	)
}
