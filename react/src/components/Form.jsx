import { useCallback, useRef, useState } from 'react'
import { Icon } from './Icon.jsx'

/* Fields, and the one place a rejection is drawn.

   Two forms in this app reject values -- the order form on step 1 of New order and the item
   form on step 2 -- and a rejection has to look identical on both: the message under its
   field, the red edge on the shell, aria-invalid and aria-describedby on the input, and one
   sentence in the form's own status line. That marking is written once, in `Field` and
   `useFieldErrors` below, and each form owns nothing but its own rules. A second copy of it
   is the near-miss the uniformity rule is about: the two would agree until the day one of
   them was fixed. README: Fields and Forms.

   aria-describedby is set with the message and removed with it. Left in place it points at
   a hidden span, which is announced by no engine and audited as a dangling reference by
   some. */

const join = (...parts) => parts.filter(Boolean).join(' ')

/** A labelled field: its label, its control, its error and its help text, in that order.
    Rendered as a <label> when it wraps exactly one control, and as a <div> when it wraps a
    group -- a label around a segmented control labels nothing and confuses every engine.

    `htmlFor` stops being optional the moment anything labelable sits *before* the field's own
    control. A <label> with no `for` labels its first labelable descendant, and the chips in
    the categories field are real buttons -- so the label pointed at "Remove category
    Household", and every tap inside the field that was not itself a control fired it. Two
    categories in, going back for a third took one away. See ../pages/NewOrder.jsx. */
export function Field({ label, error, errorId, help, group, htmlFor, children, className, ...rest }) {
	const Tag = group ? 'div' : 'label'
	return (
		<Tag className={join('field', className)} htmlFor={group ? undefined : htmlFor} {...rest}>
			<span>{label}</span>
			{children}
			{/* The id is what the control's aria-describedby points at, so it is not optional
			    when there is a message: a description that is not there is announced by no
			    engine and audited as a dangling reference by some. */}
			{error ? <span className="field-error" id={errorId}>{error}</span> : null}
			{help ? <span className="field-help">{help}</span> : null}
		</Tag>
	)
}

/** The bordered box a control sits in. Takes the icons, units and trailing chips that ride
    inside the border with it. */
export const FieldShell = ({ variant, children, className, as: Tag = 'div', ...rest }) =>
	<Tag className={join('field-shell', variant, className)} {...rest}>{children}</Tag>

export const FieldPair = ({ variant, children }) =>
	<div className={join('field-pair', variant)}>{children}</div>

export const FieldUnit = ({ children }) => <span className="field-unit">{children}</span>

/** The plain text input. Nothing here is input[type=number] and nothing should be: Danish
    decimals use a comma, which type=number rejects -- `value` comes back empty and
    min/max/step never run. `inputMode` gets the numeric keyboard; the parsing is ours. */
export function TextInput({ value, onChange, invalid, describedBy, ...rest }) {
	return (
		<input type="text" value={value} onChange={e => onChange?.(e.target.value)}
			aria-invalid={invalid ? 'true' : undefined}
			aria-describedby={invalid ? describedBy : undefined} {...rest} />
	)
}

/** A date field with the glyph that opens the picker.

   No native affordance survives the stylesheet, so the glyph opens the picker itself. Where
   showPicker() is missing (iOS < 16) nothing is bound at all -- a dead listener would
   swallow the tap the label forwards to the input. Alt+Down keeps it off the mouse. README: Honest Affordances, iOS and WebKit. */
export function DateInput({ value, onChange, invalid, describedBy, trail, label, ...rest }) {
	const ref = useRef(null)

	const openPicker = useCallback(() => {
		const input = ref.current
		if (!input || typeof input.showPicker !== 'function') return
		input.focus()
		// Chrome throws if the call is not carried by a user gesture; both callers are.
		try { input.showPicker() } catch { /* the field still types */ }
	}, [])

	const hasPicker = typeof HTMLInputElement !== 'undefined'
		&& typeof HTMLInputElement.prototype.showPicker === 'function'

	return (
		<FieldShell variant="field-shell-date">
			<input ref={ref} type="date" value={value} aria-label={label}
				onChange={e => onChange?.(e.target.value)}
				aria-invalid={invalid ? 'true' : undefined}
				aria-describedby={invalid ? describedBy : undefined}
				onKeyDown={e => {
					if (!e.altKey || e.key !== 'ArrowDown') return
					e.preventDefault()
					openPicker()
				}}
				{...rest} />
			<span className="field-date-trail"
				onClick={hasPicker ? e => { e.preventDefault(); openPicker() } : undefined}>
				{trail ? <span className="field-unit">{trail}</span> : null}
				<Icon name="calendar" />
			</span>
		</FieldShell>
	)
}

export const TextArea = ({ value, onChange, ...rest }) => (
	<FieldShell variant="field-shell-area">
		<textarea value={value} onChange={e => onChange?.(e.target.value)} {...rest} />
	</FieldShell>
)

/* ---- segmented control ----
   It looks and announces like tabs, so it behaves like them: selection follows the click,
   arrows move it, and only the selected button is in the tab order.

   Read the options left to right before shipping one. The status control read Delivered /
   Ordered / Returned in all three places it appeared, pixel-perfect in every engine, and
   said an order was delivered before it was placed. Geometry has no opinion about the order
   of labels. README: Honest Affordances. */
export function Segmented({ options, value, onChange, label, compact = true, tablist = true }) {
	const refs = useRef([])
	const index = Math.max(0, options.indexOf(value))

	const select = i => {
		onChange?.(options[i])
		refs.current[i]?.focus()
	}

	return (
		<div className={join('segmented', compact && 'segmented-compact')}
			role={tablist ? 'tablist' : undefined} aria-label={label}>
			{options.map((option, i) => (
				<button key={option} type="button" ref={el => { refs.current[i] = el }}
					role={tablist ? 'tab' : undefined}
					aria-selected={tablist ? option === value : undefined}
					className={option === value ? 'is-on' : undefined}
					tabIndex={i === index ? 0 : -1}
					onClick={() => select(i)}
					onKeyDown={e => {
						const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
						if (!step) return
						e.preventDefault()
						select((i + step + options.length) % options.length)
					}}>{option}</button>
			))}
		</div>
	)
}

/* ---- switch ----
   The switch owns the panel under it. It shipped drawn on, announced on, and toggling
   nothing -- the decorative control with its state already painted, which is the form no
   screenshot can fail, since the only wrong frame is the one after a click.

   Both states have to be visible, not just announced: without a :not(:checked)
   rule the track stays green and the knob stays right, so a probe that flips the state
   and reads it back goes green on a control that renders identically either way. The
   stylesheet carries that rule; this component carries the state it reads.

   A checkbox rather than a button, so the text beside it can be a real <label htmlFor>:
   clicking the label toggles the control natively, with nothing to wire. Every call
   site passes an id and renders its text as a label pointing at it. README: Honest Affordances. */
export function Switch({ checked, onChange, label, controls, id }) {
	return (
		<input type="checkbox" className="switch" role="switch" id={id}
			checked={checked} aria-controls={controls} aria-label={label}
			onChange={e => onChange?.(e.target.checked)} />
	)
}

/** A bordered group of fields, with the optional disclosure the switch above it owns. */
export const FilterSection = ({ children, id, ...rest }) =>
	<div className="filter-section" id={id} {...rest}>{children}</div>

export const FilterSectionBody = ({ children, id, hidden }) =>
	<div className="filter-section-body" id={id} hidden={hidden}>{children}</div>

/* ---- the form's own verdict ----
   role="status" is on the element, so writing to it announces and shows in one move --
   there is no second, hidden copy to keep in step.

   A verdict off screen is the defect this line exists to fix, so its position is not left
   to luck: under the button it sits where an iOS keyboard lands, above the fields it is
   above the fold whenever the tap had to scroll down to reach the button -- measured at
   59px below and at -70px in WebKit respectively. `nearest` is a no-op when it is already
   in view, so nothing jumps in the common case. */
export function FormStatus({ message, good }) {
	const ref = useRef(null)
	const previous = useRef('')
	if (message && message !== previous.current) {
		previous.current = message
		queueMicrotask(() => ref.current?.scrollIntoView({ block: 'nearest' }))
	}
	if (!message) previous.current = ''
	return (
		<p ref={ref} className={join('form-status', !good && 'form-status-negative')} role="status">
			{message}
		</p>
	)
}

export const FormActions = ({ split, children }) =>
	<div className={join('form-actions', split && 'form-actions-split')}>{children}</div>

export const Form = ({ wide = true, children, ...rest }) =>
	<div className={join('form', wide && 'form-wide')} {...rest}>{children}</div>

/* ---- validation ----

   One rule per field, each returning the message or ''. The same list drives the marking,
   the focus and what gets announced, so a field cannot be checked in one place and not
   another.

   `check()` marks every field and hands back only the ones that failed, so a caller cannot
   check a field without marking it or mark one without checking it. */
export function useFieldErrors(fields, values) {
	const [errors, setErrors] = useState({})
	const valuesRef = useRef(values)
	valuesRef.current = values

	/* The message element's id is the control's id with -error on it, the convention the
	   prototype uses. Deriving it means the control and the span cannot be given different
	   ids and leave aria-describedby pointing at nothing. */
	const errorId = useCallback(name => name + '-error', [])

	const check = useCallback(() => {
		const current = valuesRef.current
		const next = {}
		const failed = []
		for (const field of fields) {
			const message = field.check(String(current[field.name] ?? '').trim())
			if (message) { next[field.name] = message; failed.push(field) }
		}
		setErrors(next)
		return failed
	}, [fields])

	/* Re-checked on every keystroke, but only once it has been rejected: checking a field
	   the user has not finished typing into prints "How many did you buy?" over a field they
	   are halfway through answering. */
	/* The new value is passed in rather than read back out of state. React has not re-rendered
	   when the change handler runs, so `values` is still the value from before this keystroke --
	   re-checking against it clears the message one character late, every time. */
	const recheck = useCallback((name, nextValue) => {
		setErrors(prev => {
			if (!prev[name]) return prev
			const field = fields.find(f => f.name === name)
			const raw = nextValue !== undefined ? nextValue : valuesRef.current[name]
			const message = field ? field.check(String(raw ?? '').trim()) : ''
			if (message === prev[name]) return prev
			const next = { ...prev }
			if (message) next[name] = message; else delete next[name]
			return next
		})
	}, [fields])

	const clear = useCallback(() => setErrors({}), [])

	/* Everything a Field and its control need in order to draw a rejection identically. */
	const propsFor = useCallback(name => ({
		error: errors[name],
		invalid: Boolean(errors[name]),
		describedBy: errorId(name),
		errorId: errorId(name)
	}), [errors, errorId])

	return { errors, check, recheck, clear, propsFor }
}

/** "Quantity and Price paid need fixing", "Vendor, Date and Kind need fixing" -- the status
    line names the fields rather than repeating the messages already sitting under them,
    because on a phone the field focus jumps to can be behind the keyboard and this line is
    the one thing the user can be sure of. */
export function needFixing(failed) {
	const names = failed.map(f => f.label)
	const list = names.length < 2 ? names[0]
		: names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
	return list + (names.length > 1 ? ' need' : ' needs') + ' fixing.'
}

/** Focus the first field that failed. The element is found by the id the form gave it, so a
    form cannot say a field is wrong and then send focus somewhere else. */
export function focusField(name) {
	queueMicrotask(() => document.getElementById(name)?.focus())
}
