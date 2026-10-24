import { useState } from 'react'
import { reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { formatNumber, parseNumber, round } from './format.js'

/* Stepper: a quantity, and the two buttons that change it by one step.

   One bordered control with its buttons divided by a rule, so it reads as a single
   field rather than three controls in a row. The centring is what marks it as a
   stepper: a typed value is regular weight in every other field, and a quantity is
   no more important than a price.

   `min`, `max` and `step` are the native attributes and they are passed through, so
   the browser's own validation and keyboard stepping work. The buttons step by the
   same `step`, and every result is rounded to the decimals that step implies -
   stepping 0.1 three times is 0.30000000000000004 in binary floating point, which
   is not a quantity anyone typed.

   A whole-number stepper stays a native number input: the browser writes and
   accepts the separator its own locale uses. A stepper with decimals switches to a
   text input with a decimal input mode, because a number input cannot render
   `0,25` - its value is always dot-decimal - and a reader who writes commas would
   see their own quantity in a notation they do not use. Both separators are
   accepted on the way in. */

/**
 * The two glyphs are the component's own, not a caller's: a stepper steps by one, so
 * its buttons are the register's minus and plus. They used to be required props, and
 * a caller who left them out got two blank buttons with no error - the same defect
 * the search field's lead and clear were fixed for.
 *
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {number} [props.value] Controlled. Omit and the component holds it.
 * @param {number} [props.defaultValue]
 * @param {(value: number) => void} [props.onChange]
 * @param {number} [props.min] Native.
 * @param {number} [props.max] Native.
 * @param {number} [props.step] Native. Also what the buttons step by. Default 1.
 * @param {string} [props.locale] Defaults to the browser's.
 * @param {string} [props.id]
 * @param {string} [props.fieldLabel] Handed by Field, never written by a caller: the field's label text. Inside a Field it is what is being counted, and the label is the value input's one name, so the page writes the word once.
 */
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
	fieldLabel,
	...rest
}) {
	reject(rest, 'Stepper')
	/* One name, from one place. Inside a Field the label names the value input
	   through its id, so a second aria-label there would be the same word typed twice,
	   and the first to go stale when the label is renamed. */
	const name = fieldLabel ?? rest['aria-label']
	if (!name) console.error('<Stepper> needs a name: put it in a Field with a text label, or pass aria-label')
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
				aria-label={`One step fewer ${name}`}
				disabled={min !== undefined && current <= min}
				onClick={() => { setTyping(null); set(current - step) }}
			>
				<Icon name="minus" />
			</button>
			<input
				type={fractional ? 'text' : 'number'}
				inputMode="decimal"
				/* A text input's intrinsic width is about twenty characters and a number
				   input's is far narrower, so switching type for a fractional step would
				   otherwise change the control's width - the value is flex: 1, and that
				   intrinsic width sets the stepper wherever nothing around it constrains
				   the width. Stated for both types, so the two are the same control. */
				size={4}
				id={id}
				className="sp-stepper__value"
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
					set(current + (ev.key === 'ArrowUp' ? step : -step))
				}}
			/>
			<button
				type="button"
				className="sp-stepper__btn"
				aria-label={`One step more ${name}`}
				disabled={max !== undefined && current >= max}
				onClick={() => { setTyping(null); set(current + step) }}
			>
				<Icon name="plus" />
			</button>
		</div>
	)
}

// Field hands this control its label text, since the buttons are named from it
Stepper.fieldLabel = true
