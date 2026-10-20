import { cloneElement, useId } from 'react'
import { join, pick, reject } from './variants.js'
import { Choice, FieldGroup } from './Choice.jsx'

/* The field: a label, a control, and at most one message under it.

   It does not render the control. That is the whole point of it - a field that fell
   back to building its own input was a second TextField, with its own variant map to
   keep in agreement, and a caller could pass input props to the wrapper and never
   notice which one they had reached. The control comes in as the child, and this
   owns only what sits around it.

   What it does own is the wiring a caller should not have to repeat. The label is
   bound to the control by an id it generates; the message is bound by
   `aria-describedby`; and the message's colour travels onto the control - a danger
   message makes it invalid, a warning colours it and does not, since nothing is
   wrong and the save proceeds.

   The input's padding follows its slots. A lead icon, a trail control, a unit or a
   chevron each reserve their own room, so passing the slot is enough and there is no
   separate variant to remember.

   A choice is never a native select. Options in this system carry marks, meta and a
   check, which a native option cannot hold, so the choosing control is the Combobox
   and it arrives as the child like any other.

   Three messages exist and each has one name: a hint is always true and stays when
   the value is right, a warning is something the reader may pass, and a danger
   message stops the save. */

/* The three messages, named for what they are rather than for the colour they take:
   they are named for the colour they take, because the system has exactly two words
   for these - warning and danger - and a third name for the same red is a third
   thing to keep in agreement. */
const MESSAGE = { hint: null, warning: 'warning', danger: 'danger' }

/**
 * @param {object} props
 * @param {React.ReactNode} props.label
 * @param {React.ReactElement} props.children Any control in the library: a
 *   TextField, a Combobox, a Stepper, a Check, a Switch, a Segmented, a Picker. The
 *   AmountField, a Combobox, a Stepper, a Check, a Radio, a Switch. Required: a
 *   field with nothing in it is a label.
 *
 *   A box is laid out differently from a value, and the field works out which it
 *   has. A control you type or pick a value in takes its label above it, bound by
 *   id. A box takes its label beside it, inside a `<label>` that wraps it, because
 *   the text is the thing you click - so the field renders a Choice around it rather
 *   than stacking a bare box under a heading. The caller writes the same Field
 *   either way.
 * @param {string} [props.id] Bound to the control. Generated when omitted.
 * @param {React.ReactNode} [props.lead] An icon inside the control's head.
 * @param {React.ReactNode} [props.trail] A control inside its tail.
 * @param {React.ReactNode} [props.unit] A unit inside its tail.
 * @param {React.ReactNode} [props.kbd] A shortcut hint inside its tail.
 * @param {React.ReactNode} [props.chevron] A chevron inside its tail, for a control
 *   that opens rather than accepts typing.
 * @param {boolean} [props.required] Marks the label and sets `required` on the
 *   control, so the browser and a screen reader both know. The marker is quiet ink,
 *   not red: a field not yet filled in is not a field that failed.
 * @param {React.ReactNode} [props.message] At most one, under the control.
 * @param {'hint'|'warning'|'danger'} [props.messageType]
 *
 * Takes no `className` and no `style`, and no input props - those belong to the
 * control, which is the child.
 */
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

	if (!children) {
		console.error('<Field> needs a control as its child - a field with nothing in it is a label')
		return null
	}

	// the binding is the field's job, so the control is handed it rather than asked
	// for it: an id, the message it is described by, and the colour that message implies
	/* Which label this control needs is the control's to say - `fieldRole` on the
	   component - because it follows from what the control is, not from the page. A
	   value takes a label bound by id; a box takes a label wrapping it; a set of
	   inputs takes a legend, since a label can only point at one control. */
	const role = (children.type && children.type.fieldRole) || 'value'
	/* A control that builds names from the label - the Stepper's two buttons - says so
	   with `fieldLabel` on the component, as it says its role. Only that control is
	   handed the text: the others pass unknown props on to their element, where a
	   label prop would be an attribute nobody asked for. Only plain text is handed,
	   since a button name cannot hold markup; with any other label the control keeps
	   its own aria-label. */
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

	/* A box's label is the row it sits in, so there is no second label above it and
	   nothing for `htmlFor` to point at - the wrapping label is the binding. The
	   message still sits under it, and still describes and colours the box, because
	   that part is the same question whatever the control is. */
	if (role === 'box') return (
		<div className="sp-field">
			<Choice control={control}>
				{label}
				{required ? <span className="sp-field__required" aria-hidden="true"> *</span> : null}
			</Choice>
			{message
				? <span id={messageId} className="sp-field__help" {...(color ? { 'data-color': color } : {})}>{message}</span>
				: null}
		</div>
	)

	/* A set of inputs is named by a legend, and the set is what the message describes,
	   so the describedby sits on the fieldset rather than on any one input inside it. */
	if (role === 'group') return (
		<FieldGroup legend={label} aria-describedby={messageId}>
			{children}
			{message
				? <span id={messageId} className="sp-field__help" {...(color ? { 'data-color': color } : {})}>{message}</span>
				: null}
		</FieldGroup>
	)

	return (
		<div className="sp-field">
			<label className="sp-field__label" htmlFor={fieldId}>
				{label}
				{required ? <span className="sp-field__required" aria-hidden="true"> *</span> : null}
			</label>
			{wrapped}
			{message
				? <span id={messageId} className="sp-field__help" {...(color ? { 'data-color': color } : {})}>{message}</span>
				: null}
		</div>
	)
}
