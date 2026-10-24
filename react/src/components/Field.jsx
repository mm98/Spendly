import { cloneElement, useId } from 'react'
import { pick, reject } from './variants.js'
import { Choice, FieldGroup } from './Choice.jsx'

const MESSAGE = { hint: null, quiet: null, warning: 'warning', danger: 'danger' }
const NOTE = { hint: null, success: 'success', warning: 'warning' }

/** @param {object} props
    @param {import('react').ReactNode} [props.label] The words above the control. They name it for a screen reader too.
    @param {string} [props.id] Bound to the control.
    @param {import('react').ReactNode} [props.lead] An icon at the start of the control.
    @param {import('react').ReactNode} [props.trail] A small control at the end, such as a clear button.
    @param {import('react').ReactNode} [props.unit] A unit at the end of the control, such as the currency sign.
    @param {import('react').ReactNode} [props.kbd] A keyboard shortcut at the end of the control, such as "S".
    @param {import('react').ReactNode} [props.chevron] A small arrow at the end, for a control that opens a list rather than taking typed words.
    @param {import('react').ReactNode} [props.message] One line under the control: a hint, or what is wrong.
    @param {keyof typeof MESSAGE} [props.messageType] How the message reads: `hint`, `quiet` (lighter), `warning` or `danger`. A danger message also marks the control as wrong.
    @param {import('react').ReactNode} [props.labelAction] A small button at the right end of the label, such as Forgot it?
    @param {import('react').ReactNode} [props.note] A word beside the label about where the value came from, such as matched existing vendor.
    @param {keyof typeof NOTE} [props.noteType] How the note reads: `hint`, `success` or `warning`.
    @param {import('react').ReactNode} [props.after] What the message offers to do, drawn under it.
    @param {boolean} [props.required] Marks the label and sets `required` on the control, so the browser and a screen reader both know.
    @param {import('react').ReactNode} props.children The control: one text field, list, date field, switch or other input. */
export function Field({
	label,
	id,
	lead,
	trail,
	unit,
	kbd,
	chevron,
	message,
	messageType = 'hint',
	// a small button at the label's right end: sign in's Forgot it? (20a)
	labelAction,
	// a word beside the label about where the value came from (3a: "matched existing vendor")
	note,
	noteType = 'hint',
	// what the message offers to do, under it: the alias another vendor holds (5h)
	after,
	required = false,
	children,
	...rest
}) {
	reject(rest, 'Field')
	const auto = useId()
	const fieldId = id ?? auto
	const messageId = message ? `${fieldId}-message` : undefined
	const color = pick(MESSAGE, messageType, 'messageType', 'Field')
	const isDanger = messageType === 'danger'
	// quiet is the help under a drop-down on Settings (11a): the lighter second-line tone
	const helpClass = messageType === 'quiet' ? 'sp-meta' : 'sp-field__help'

	if (!children) {
		console.error('<Field> needs a control as its child - a field with nothing in it is a label')
		return null
	}

	// the binding is the field's job, so the control is handed it rather than asked
	// for it: an id, the message it is described by, and the colour that message implies
	const role = (children.type && children.type.fieldRole) || 'value'
	// only a control that builds names from the label is handed it, and only as plain text
	const wantsLabel = children.type && children.type.fieldLabel && typeof label === 'string'
	const control = cloneElement(children, {
		id: fieldId,
		'aria-describedby': messageId,
		...(isDanger ? { 'aria-invalid': 'true' } : {}),
		...(color && !isDanger ? { 'data-color': color } : {}),
		...(required ? { required: true } : {}),
		...(wantsLabel ? { fieldLabel: label } : {}),
		// the padding a slot reserves is the field's knowledge, not the control's
		lead: lead ? true : undefined,
		trail: trail || kbd ? true : undefined,
		unit: unit ? true : undefined
	})

	const wrapped = lead || trail || unit || kbd || chevron
		? (
			<span className="sp-field__wrap">
				{lead ? <span className="sp-field__lead">{lead}</span> : null}
				{control}
				{unit ? <span className="sp-field__unit">{unit}</span> : null}
				{trail ? <span className="sp-field__trail">{trail}</span> : null}
				{kbd ? <span className="sp-field__kbd">{kbd}</span> : null}
				{chevron ? <span className="sp-field__chevron">{chevron}</span> : null}
			</span>
		)
		: control

	if (role === 'box') return (
		<div className="sp-field">
			<Choice control={control}>
				{label}
				{required ? <span className="sp-field__required" aria-hidden="true"> *</span> : null}
			</Choice>
			{message
				? <span id={messageId} className={helpClass} {...(color ? { 'data-color': color } : {})}>{message}</span>
				: null}
			{after}
		</div>
	)

	/* A set of inputs is named by a legend, and the set is what the message describes,
	   so the describedby sits on the fieldset rather than on any one input inside it. */
	if (role === 'group') return (
		<FieldGroup legend={label} aria-describedby={messageId}>
			{children}
			{message
				? <span id={messageId} className={helpClass} {...(color ? { 'data-color': color } : {})}>{message}</span>
				: null}
			{after}
		</FieldGroup>
	)

	const labelled = (
		<label className="sp-field__label" htmlFor={fieldId} id={fieldId + '-label'}>
			{label}
			{required ? <span className="sp-field__required" aria-hidden="true"> *</span> : null}
		</label>
	)
	const noteColor = note ? pick(NOTE, noteType, 'noteType', 'Field') : null
	return (
		<div className="sp-field">
			{labelAction
				? <div className="sp-field__head">{labelled}<span className="sp-grow" />{labelAction}</div>
				: note
					? (
						<div className="sp-row-flex sp-gap-8">
							{labelled}
							<span className="sp-field__help" {...(noteColor ? { 'data-color': noteColor } : {})}>{note}</span>
						</div>
					)
					: labelled}
			{wrapped}
			{message
				? <span id={messageId} className={helpClass} {...(color ? { 'data-color': color } : {})}>{message}</span>
				: null}
			{after}
		</div>
	)
}
