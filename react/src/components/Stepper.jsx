import { useRef, useState } from 'react'
import { reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { formatNumber, parseNumber, round } from './format.js'

/** `step` is what minus and plus move by; `decimals` how many places a typed value keeps, the step's
    own when absent (14a). A value with places is typed and read in `locale`, shown without trailing zeros.
    @param {object} props
    @param {number} [props.value] The number. Leave it out to let the stepper keep its own value.
    @param {number} [props.defaultValue] The number at first, when the stepper keeps its own value.
    @param {(value: number) => void} [props.onChange]
    @param {number} [props.min] The lowest number. Minus turns off there.
    @param {number} [props.max] The highest number. Plus turns off there.
    @param {number} [props.step] How much minus and plus change the number.
    @param {number} [props.decimals] How many decimal places a typed number keeps. Read from the step when left out.
    @param {string} [props.locale] How numbers are written, such as da-DK. The browser's when left out.
    @param {string} [props.id]
    @param {string} [props.fieldLabel] Handed by Field, never written by a caller: the field's label text. */
export function Stepper({
	value,
	defaultValue = 1,
	onChange,
	min,
	max,
	step = 1,
	decimals: places,
	locale,
	// the field's label points at the value, not at the group around it
	id,
	// handed by Field, never written by a caller: the label names the value, and the buttons are named from it
	fieldLabel,
	...rest
}) {
	reject(rest, 'Stepper')
	const name = fieldLabel ?? rest['aria-label']
	if (!name) console.error('<Stepper> needs a name: put it in a Field with a text label, or pass aria-label')
	// what Field hands the control belongs on the value, the element that takes focus
	const { 'aria-describedby': describedBy, 'aria-invalid': invalid, required, ...box } = rest
	const input = useRef(null)
	const [held, setHeld] = useState(defaultValue)
	const [typing, setTyping] = useState(null)
	const controlled = value !== undefined
	const current = controlled ? value : held

	// the decimals the step implies when none are named: 0.25 is two, 1 is none
	const decimals = places ?? (String(step).split('.')[1] || '').length
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

	// minus and plus move by whole steps only: a step that would cross a bound is not offered
	const fewer = round(current - step, decimals)
	const more = round(current + step, decimals)
	const noFewer = min !== undefined && fewer < min
	const noMore = max !== undefined && more > max

	const shown = typing ?? (fractional
		? (places === undefined ? formatNumber(current, { locale, decimals }) : new Intl.NumberFormat(locale, { maximumFractionDigits: decimals }).format(current))
		: String(current))

	return (
		<div className="sp-stepper" {...box}>
			<button
				type="button"
				className="sp-stepper__btn"
				aria-label={`One step fewer ${name}`}
				disabled={noFewer}
				onClick={() => {
					setTyping(null)
					// a button that disables itself at the bound would drop focus to the page
					const n = set(fewer)
					if (min !== undefined && round(n - step, decimals) < min) input.current?.focus()
				}}
			>
				<Icon name="minus" size={13} />
			</button>
			<input
				type={fractional ? 'text' : 'number'}
				inputMode="decimal"
				size={4}
				id={id}
				ref={input}
				className="sp-stepper__value"
				aria-describedby={describedBy}
				aria-invalid={invalid}
				required={required}
				aria-label={fieldLabel ? undefined : rest['aria-label']}
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
					if (ev.key === 'ArrowUp' ? !noMore : !noFewer) set(ev.key === 'ArrowUp' ? more : fewer)
				}}
			/>
			<button
				type="button"
				className="sp-stepper__btn"
				aria-label={`One step more ${name}`}
				disabled={noMore}
				onClick={() => {
					setTyping(null)
					const n = set(more)
					if (max !== undefined && round(n + step, decimals) > max) input.current?.focus()
				}}
			>
				<Icon name="plus" size={13} />
			</button>
		</div>
	)
}

// Field hands this control its label text, since the buttons are named from it
Stepper.fieldLabel = true
