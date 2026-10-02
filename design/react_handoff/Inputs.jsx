import { useRef, useState } from 'react'
import { IconButton } from './Button.jsx'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { formatNumber, parseNumber } from './format.js'

/* The inputs, as the library's API page names them.

   Every one of them is controlled: `value` and `onChange`, no internal copy of the
   value. The order draft is the single source of truth, and a control keeping its
   own copy is how a field silently disagrees with what gets saved. The exception is
   the text being typed into an amount, which is not the value - it is a
   half-written number on its way to becoming one.

   None of them takes a colour set. The red state is a boolean and a message, never a
   variant a caller can apply for decoration: pass `danger` and the field goes
   invalid and describes itself.

   Each renders only its own box. The label, the message and the spacing belong to
   Field, which every one of these is meant to sit in.

   The date field lives in DatePickers.jsx with the calendar it opens, because on
   desktop it is that calendar and only on touch is it the native control.

   INTERNAL, AND WHY. Every field below did the same four things - build the class,
   turn `danger` into `aria-invalid`, wire `value` and `onChange`, and refuse a
   `className` - so those four live in `Box` and the fields are what is left: a
   type, a slot, a format. Nothing is exported from here twice, and a field that
   needs a fifth thing states only that. */

const TEXT = {
	default: null,
	empty: 'sp-input--empty',
	readonly: 'sp-input--readonly',
	stretch: 'sp-input--stretch'
}

/** The box every field is. Internal: the fields below are its arguments. */
function Box({ as = 'input', type = 'text', value, onChange, danger = false, classes, component, inputRef, lead, trail, unit, ...rest }) {
	reject(rest, component)
	const shared = {
		/* the room a slot needs is the field's knowledge - it is the one that knows a
		   lead icon or a unit is there - so it hands the flag down and this turns it
		   into the padding */
		className: join('sp-input', classes, lead && 'sp-input--lead', trail && 'sp-input--trail', unit && 'sp-input--unit'),
		value,
		onChange: ev => onChange?.(ev.target.value),
		...(danger ? { 'aria-invalid': 'true' } : {}),
		...rest
	}
	// ref, not a prop: a function component does not forward one, so the fields that
	// need the element - the date field opening the platform picker - pass it by name
	if (as === 'textarea') return <textarea ref={inputRef} {...shared} className={join('sp-textarea', classes)} />
	return <input type={type} ref={inputRef} {...shared} />
}

/** A field with something in its trailing slot. Internal: the wrap and the slot are
    the same three lines in a password and a date. Not the search field - that one's
    box is `.sp-picker__search`, which is also the hook its container sizes it by. */
function Trailed({ lead, trail, kbd, chevron, children }) {
	return (
		<span className="sp-field__wrap">
			{lead ? <span className="sp-field__lead">{lead}</span> : null}
			{children}
			{trail}
			{kbd ? <span className="sp-field__kbd">{kbd}</span> : null}
			{chevron ? <span className="sp-field__chevron">{chevron}</span> : null}
		</span>
	)
}

/** The control in a field's trailing slot. Internal. */
function Trail({ label, onClick, pressed, children }) {
	return (
		<button
			type="button"
			className="sp-field__trail"
			aria-label={label}
			{...(pressed === undefined ? {} : { 'aria-pressed': pressed ? 'true' : 'false' })}
			onClick={onClick}
		>
			{children}
		</button>
	)
}

/**
 * Text, and multiline text. The same control: `multiline` caps its lines and then
 * scrolls, rather than growing without end.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {'text'|'email'|'tel'|'url'} [props.type] A native type, for the keyboard
 *   and the validation that comes with it. Not `number` - a quantity is a Stepper
 *   and money is an NumberField, neither of which a number input can render in
 *   every locale. Not `search` either: that is SearchInput, which carries its clear.
 * @param {string} [props.id] Bound by the Field around it.
 * @param {boolean} [props.danger] The value cannot be saved.
 * @param {string} [props.placeholder]
 * @param {number} [props.maxLength]
 * @param {boolean} [props.readOnly]
 * @param {boolean} [props.multiline]
 * @param {number} [props.rows] Multiline only. The line cap.
 * @param {'default'|'empty'|'readonly'|'stretch'} [props.variant]
 *
 * Takes no `className` and no `style`. Prefix and suffix are Field's `lead` and
 * `unit` slots - a control does not own what sits beside it.
 */
export function TextField({ type = 'text', multiline = false, rows = 3, variant = 'default', ...rest }) {
	const TYPES = ['text', 'email', 'tel', 'url']
	if (!TYPES.includes(type)) console.error(`<TextField> type="${type}" is not one of: ${TYPES.join(' | ')}`)
	if (multiline) return <Box as="textarea" rows={rows} component="TextField" {...rest} />
	return <Box type={type} classes={pick(TEXT, variant, 'variant', 'TextField')} component="TextField" {...rest} />
}

/**
 * A password, with its reveal. The reveal is built in and never optional, which is
 * what replaces a confirm field; paste is never blocked.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {'current-password'|'new-password'} props.autoComplete Which password this
 *   is, so a manager offers the right thing.
 * @param {boolean} [props.danger]
 *
 * The eye is the component's own: a password field shows one control, and which
 * glyph it is was never a caller's decision. Worth knowing: the register has `eye`
 * and no struck-through counterpart, so the button states which way it is through
 * `aria-pressed` and its label rather than through a second glyph.
 */
export function PasswordField({ ...rest }) {
	const [shown, setShown] = useState(false)
	return (
		<Trailed
			trail={
				<Trail
					label={shown ? 'Hide the password' : 'Show the password'}
					pressed={shown}
					onClick={() => setShown(!shown)}
				>
					<Icon name="eye" />
				</Trail>
			}
		>
			<Box type={shown ? 'text' : 'password'} classes="sp-input--trail" component="PasswordField" {...rest} />
		</Trailed>
	)
}

/**
 * A number, in the reader's own notation - `1.320,00` where that is how numbers
 * are written. A native number input cannot render that, so this is a text input
 * with a decimal input mode: formatted on blur, and both separators accepted while
 * typing. The value stays a number; only the text is localised.
 *
 * It is not only for money - `decimals` is 2 for an amount and 3 for a quantity -
 * so the currency is not its concern: that sits in the field's `unit` slot beside
 * it, which is also how a quantity gets no unit at all.
 *
 * The figure sits where every other field's value sits. An amount is right-aligned
 * in a table, where a column of figures is read against itself and the separators
 * must line up; a field is read on its own, next to its label.
 *
 * @param {object} props
 * @param {number|null} props.value
 * @param {(value: number|null) => void} props.onChange
 * @param {number} [props.decimals] Two for money, three for a quantity.
 * @param {number} [props.min]
 * @param {string} [props.locale] Defaults to the browser's.
 * @param {boolean} [props.computed] A figure the design works out rather than one
 *   the reader types. Read-only and tinted.
 * @param {boolean} [props.danger]
 * @param {boolean} [props.expected] A planned figure rather than a real one: the grey
 *   an expected amount has everywhere in the budget.
 */
export function NumberField({ value, onChange, decimals = 2, min, locale, computed = false, expected = false, ...rest }) {
	const [typing, setTyping] = useState(null)
	return (
		<Box
			type="text"
			inputMode="decimal"
			classes={join('sp-number', computed && 'sp-input--readonly', expected && 'sp-ink-5')}
			component="NumberField"
			readOnly={computed}
			value={typing ?? formatNumber(value, { locale, decimals })}
			onChange={text => {
				setTyping(text)
				const n = parseNumber(text, { locale })
				if (n === null) return onChange?.(null)
				onChange?.(min !== undefined && n < min ? min : n)
			}}
			onBlur={() => setTyping(null)}
			{...rest}
		/>
	)
}

/**
 * Search. A field with a leading icon and a clear, and it reports as you type -
 * debouncing is the caller's, since only the caller knows what the typing costs.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {React.ReactNode} [props.kbd] The shortcut that focuses it.
 * @param {string} [props.placeholder]
 *
 * The clear is the control's own and appears whenever there is something to clear -
 * not a caller's to supply, since a search field that cannot be emptied in one
 * click is a search field the reader has to backspace out of.
 *
 * Its box is `.sp-picker__search`, not the `.sp-field__wrap` the other fields use.
 * That is what all 64 drawn search fields are: one relative box holding the lead and
 * the input, and the hook each container sizes it by - the controls bar gives it the
 * width that is left, a touch bar gives it the whole row. It used to render the wrap
 * and a second export bolted this box around it, which made two boxes where the
 * design has one, and two names a caller could not choose between.
 */
/* The lead is the register's search glyph and the clear is the register's x. Neither
   is a caller's decision: a search field with a different lead is not a search
   field, and one that cannot be emptied in a click is one the reader backspaces out
   of. */
export function SearchInput({ value, onChange, kbd, ...rest }) {
	const clearable = !!value
	return (
		<span className="sp-picker__search">
			<span className="sp-field__lead"><Icon name="search" /></span>
			{/* The trail's room is reserved whether or not the clear is in it. The input
			    is width:100% and never sizes to its text, but where its container is
			    auto-width - a flex item in a controls bar - that container takes the
			    input's max-content size, which counts the padding. So padding that came
			    and went with the clear moved the whole box by 32px the moment the
			    reader typed. */}
			<Box
				type="search"
				classes={join('sp-input--search', 'sp-input--lead', kbd && 'sp-input--search-kbd', 'sp-input--trail')}
				component="SearchInput"
				value={value}
				onChange={onChange}
				{...rest}
			/>
			{clearable
				? <Trail label="Clear the search" onClick={() => onChange?.('')}><Icon name="x" /></Trail>
				: null}
			{!clearable && kbd ? <span className="sp-field__kbd">{kbd}</span> : null}
		</span>
	)
}

/**
 * A pair of bounds over one rail: the coarse control, with the two fields that set
 * the same two numbers exactly. They are one value seen twice.
 *
 * A live position is the one thing that cannot come from a class. The library's own
 * track positions itself from static rules, which is right for a drawn page; a real
 * control has a value no stylesheet can have seen, so the component writes the
 * percentage into the custom property the rail already reads.
 *
 * @param {object} props
 * @param {[number, number]} props.value
 * @param {(value: [number, number]) => void} props.onChange
 * @param {number} props.min
 * @param {number} props.max
 * @param {number} [props.step]
 * @param {string} props.label What is being bounded.
 * @param {(n: number) => string} [props.format] How a bound reads in its field.
 */
export function RangeSlider({ value, onChange, min, max, step = 1, label, format, ...rest }) {
	reject(rest, 'RangeSlider')
	// two bounds, in order - a third would be read as nothing
	if (!Array.isArray(value) || value.length !== 2)
		console.error('<RangeSlider> value is two bounds, [low, high] - got ' + JSON.stringify(value))
	const rail = useRef(null)
	const [low, high] = value
	const pct = n => ((n - min) / (max - min)) * 100

	const move = (which, n) => {
		const snapped = Math.round(n / step) * step
		const bounded = Math.min(max, Math.max(min, snapped))
		onChange?.(which === 'low' ? [Math.min(bounded, high), high] : [low, Math.max(bounded, low)])
	}

	/* A handle is dragged, and a rail is 4px tall - so the pointer is captured on
	   the handle itself rather than tracked on the rail, which is what lets a drag
	   continue past the rail's own box and off the end of it. */
	const grab = ev => {
		ev.currentTarget.setPointerCapture(ev.pointerId)
		ev.preventDefault()
	}
	const drag = which => ev => {
		if (!ev.currentTarget.hasPointerCapture(ev.pointerId)) return
		const box = rail.current?.getBoundingClientRect()
		if (!box || !box.width) return
		move(which, min + ((ev.clientX - box.left) / box.width) * (max - min))
	}

	/* The fields step like the handles do, because they hold the same number: a field
	   of digits that ignores its arrows reads as text rather than as a value. Shift
	   takes ten steps, which is what a reader reaches for on a long scale. */
	const stepKeys = (which, n) => ev => {
		const by = ev.key === 'ArrowUp' ? step : ev.key === 'ArrowDown' ? -step : 0
		if (!by) return
		ev.preventDefault()
		move(which, n + by * (ev.shiftKey ? 10 : 1))
	}

	const handle = (which, n) => (
		<button
			type="button"
			className="sp-track__handle"
			style={{ '--p': pct(n) }}
			role="slider"
			aria-label={`${label}, ${which === 'low' ? 'from' : 'to'}`}
			aria-valuemin={which === 'low' ? min : low}
			aria-valuemax={which === 'low' ? high : max}
			aria-valuenow={n}
			onPointerDown={grab}
			onPointerMove={drag(which)}
			onKeyDown={ev => {
				const by = ev.key === 'ArrowRight' || ev.key === 'ArrowUp' ? step
					: ev.key === 'ArrowLeft' || ev.key === 'ArrowDown' ? -step
					: ev.key === 'Home' ? min - n
					: ev.key === 'End' ? max - n
					: 0
				if (!by) return
				ev.preventDefault()
				const jump = ev.shiftKey && Math.abs(by) === step ? 10 : 1
				move(which, n + by * jump)
			}}
		/>
	)

	return (
		<>
			{/* the rail takes a click too: a reader who clicks a point on it expects
			    the nearer bound to come to that point rather than nothing happening */}
			<span
				className="sp-track"
				ref={rail}
				onPointerDown={ev => {
					if (ev.target !== ev.currentTarget) return
					const box = ev.currentTarget.getBoundingClientRect()
					const at = min + ((ev.clientX - box.left) / box.width) * (max - min)
					move(Math.abs(at - low) <= Math.abs(at - high) ? 'low' : 'high', at)
				}}
			>
				<span className="sp-track__span" style={{ '--a': pct(low), '--b': pct(high) }} />
				{handle('low', low)}
				{handle('high', high)}
			</span>
			<span className="sp-bounds">
				<Box
					classes="sp-number"
					component="RangeSlider"
					inputMode="decimal"
					aria-label={`${label}, from`}
					value={format ? format(low) : low}
					onChange={text => move('low', Number(text))}
					onKeyDown={stepKeys('low', low)}
				/>
				<Box
					classes="sp-number"
					component="RangeSlider"
					inputMode="decimal"
					aria-label={`${label}, to`}
					value={format ? format(high) : high}
					onChange={text => move('high', Number(text))}
					onKeyDown={stepKeys('high', high)}
				/>
			</span>
		</>
	)
}

/**
 * Several values in one field - a set of vendors, a set of statuses. The field is
 * the box, each value is a Chip that can be removed, and the trailing input adds
 * the next one.
 *
 * @param {object} props
 * @param {string[]} props.value
 * @param {(value: string[]) => void} props.onChange
 * @param {string} props['aria-label'] What the set holds.
 * @param {string} [props.placeholder] Shown in the add field when the set is empty.
 * @param {React.ReactNode} props.remove An Icon for a value's remove control.
 * @param {boolean} [props.danger]
 *
 * Takes no `className` and no `style`.
 */
export function TokensField({ value = [], onChange, placeholder, danger = false, id, ...rest }) {
	reject(rest, 'TokensField')
	const [typed, setTyped] = useState('')
	const add = () => {
		const next = typed.trim()
		if (!next) return
		if (!value.includes(next)) onChange?.([...value, next])
		setTyped('')
	}
	return (
		<span className="sp-tokens" {...rest}>
			{value.map(token => (
				<Chip
					variant="solid"
					key={token}
					trail={
						<IconButton
							icon="x"
							aria-label={`Remove ${token}`}
							size="small"
							onClick={() => onChange?.(value.filter(t => t !== token))}
						/>
					}
				>
					{token}
				</Chip>
			))}
			<input
				id={id}
				className="sp-tokens__add"
				aria-label={rest['aria-label']}
				placeholder={value.length ? undefined : placeholder}
				value={typed}
				{...(danger ? { 'aria-invalid': 'true' } : {})}
				onChange={ev => setTyped(ev.target.value)}
				onKeyDown={ev => {
					if (ev.key === 'Enter' || ev.key === ',') { ev.preventDefault(); add() }
					// backspace in an empty field removes the last value, which is what
					// every token field does and what a reader will try first
					if (ev.key === 'Backspace' && !typed && value.length) onChange?.(value.slice(0, -1))
				}}
				onBlur={add}
			/>
		</span>
	)
}

// two bounds over one rail: a set, so it takes a legend rather than a label
RangeSlider.fieldRole = 'group'
