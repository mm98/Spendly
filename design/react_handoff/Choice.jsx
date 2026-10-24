import { cloneElement, useEffect, useRef } from 'react'
import { join, pick, reject } from './variants.js'

/* The boxes: checkbox, radio and switch, and the row of label plus box that is a
   Choice.

   Each box is the input itself, restyled - not a span pretending to be one - so
   hover, focus, checked, indeterminate and disabled are the element's own states
   and nothing here simulates them. That is also why they work in a form without
   any JavaScript.

   A switch applies at once; a checkbox waits for the form to be saved. That is the
   difference between them, and it is why they are not one control with a variant. */

/**
 * @param {object} props
 * @param {boolean} [props.indeterminate] Some of the set, not all.
 */
export function Check({ indeterminate = false, ...rest }) {
	reject(rest, 'Check')
	const box = useRef(null)
	/* Indeterminate is a property, not an attribute: there is no HTML for it, so
	   React cannot render it and the browser draws the dash only when the property is
	   set. The attribute is the library's own drawn state and styles it; without both
	   a header check looked unticked while the table said otherwise. */
	useEffect(() => { if (box.current) box.current.indeterminate = indeterminate }, [indeterminate])
	return (
		<input
			ref={box}
			type="checkbox"
			className="sp-check"
			{...(indeterminate ? { 'data-indeterminate': 'true' } : {})}
			{...rest}
		/>
	)
}

/**
 * One of a set, where picking one unpicks the others. Needs a `name`.
 */
export function Radio({ ...rest }) {
	reject(rest, 'Radio')
	return <input type="radio" className="sp-radio" {...rest} />
}

/**
 * A checkbox whose change applies at once, so the form has nothing to save.
 */
export function Switch({ ...rest }) {
	reject(rest, 'Switch')
	return <input type="checkbox" className="sp-switch" {...rest} />
}

const CHOICE = { default: null, row: 'sp-choice--row', described: 'sp-choice--described' }

/**
 * A box and its label, as one target. The label is the hit area, so the box needs
 * no `id` and no `htmlFor`.
 *
 *
 *
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {keyof typeof CHOICE} [props.variant] `row` is a choice that is a row in a list, filled when it is the one chosen. `described` carries a second line under its label.
 * @param {import('react').ReactElement} props.control A Check, Radio or Switch. A Field around this Choice hands down an id, a description and a colour; they are forwarded to the control, since that is the element they have to land on.
 * @param {import('react').ReactNode} props.children The label.
 * @param {import('react').ReactNode} [props.description] The second line. Described variant.
 */
export function Choice({ variant = 'default', control, children, description, ...rest }) {
	reject(rest, 'Choice')
	if (description && variant !== 'described')
		console.error('<Choice> a description needs variant="described"')
	/* A Field hands its child the wiring it owns: the id its own label points at, the
	   id of the message, and the colour that message implies. All of it belongs on the
	   input, not on this label - an id on a <label> is an id the field's `for` cannot
	   resolve, so the binding silently does nothing and the message is never
	   announced. So the wiring is forwarded to the control, and a Field with a Choice
	   inside it works the way a Field with a TextField inside it does.

	   The slot flags are dropped rather than forwarded: they reserve padding for a
	   lead or a trail, and a choice has neither. */
	const wiring = {}
	for (const key of ['id', 'aria-describedby', 'aria-invalid', 'data-color', 'required'])
		if (key in rest) { wiring[key] = rest[key]; delete rest[key] }
	for (const slot of ['lead', 'trail', 'unit']) delete rest[slot]
	const wired = control && Object.keys(wiring).length ? cloneElement(control, wiring) : control
	return (
		<label className={join('sp-choice', pick(CHOICE, variant, 'variant', 'Choice'))} {...rest}>
			{wired}
			{description
				? (
					<span className="sp-choice__text">
						<strong>{children}</strong>
						<span className="sp-subtitle">{description}</span>
					</span>
				)
				: children}
		</label>
	)
}

/**
 * A named set of controls: the legend is what makes them a set, and a legend rather
 * than a label because a label can only point at one control.
 *
 * It is not only for choices, which is why it is not called Choices - it holds a
 * group of checkboxes, a segmented control, a facet's counted values, a pair of
 * bounds. It is also not called Fieldset: that names the HTML tag it happens to
 * render, not the job it does, and the tag is an implementation detail the caller
 * should not have to know.
 *
 * The rail's filter groups were a second class with the same rules - same reset,
 * same axis, same 12/600 legend - so they are this component now, with the group's
 * gap settled at the field's 6.
 *
 *
 *
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.legend What the set is.
 * @param {import('react').ReactNode} props.children The controls.
 */
export function FieldGroup({ legend, children, ...rest }) {
	reject(rest, 'FieldGroup')
	return (
		<fieldset className="sp-field-group" {...rest}>
			<legend>{legend}</legend>
			{children}
		</fieldset>
	)
}

/**
 * A group of cells, one of which is chosen. The cell is a fixed square - an icon is
 * the same size everywhere it is shown - so the row holds as many as the field fits
 * and the rest wrap.
 *
 * One component for both groups the product needs: pass `swatches` and each cell is
 * a colour, pass `icons` and each cell is a glyph.
 *
 * A swatch is either a name from the library's set - `green-3`, `amber-ink` - which
 * the stylesheet already paints, or any colour value, which the cell carries in the
 * custom property its rule reads. So a caller with its own palette passes it
 * straight in, and a caller using the system's set does not have to know the hex.
 *
 * A colour group may also offer a colour outside the set. That is the one place a
 * native colour input is right: it brings the platform's own picker. The chosen
 * colour is then the group's value like any other - the custom cell wears it and is
 * marked as chosen - because a colour that cannot be seen or unpicked is not a
 * choice, it is a dialog that happened.
 *
 *
 *
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {string[]} [props.swatches] Names from the library's set, or colour values.
 * @param {{ name: string, label?: string, loading?: boolean }[]} [props.icons]
 * @param {string} props.value The chosen swatch, colour value or icon name.
 * @param {(value: string) => void} props.onChange
 * @param {boolean} [props.custom] Offer a colour outside the set. Colour groups only.
 * @param {import('react').ReactNode} [props.customIcon] An Icon for the custom cell when nothing outside the set has been chosen yet.
 */
export function Picker({ swatches, icons, value, onChange, custom = false, customIcon, ...rest }) {
	reject(rest, 'Picker')
	if (swatches && icons) console.error('<Picker> takes swatches or icons, not both')
	if (custom && !swatches) console.error('<Picker> a custom colour belongs to a colour group')

	// a name is painted by the stylesheet; a value has to be carried to it
	const named = s => /^[a-z][a-z0-9-]*$/.test(s)
	const paint = s => named(s) ? { 'data-swatch': s } : { style: { '--swatch': s } }
	const chosenOutside = custom && value && !named(value) && !(swatches ?? []).includes(value)

	return (
		<span className="sp-options" role="group" {...rest}>
			{(swatches ?? []).map(swatch => (
				<button
					type="button"
					className="sp-option sp-option--swatch"
					aria-label={swatch}
					aria-pressed={value === swatch ? 'true' : 'false'}
					onClick={() => onChange?.(swatch)}
					key={swatch}
					{...paint(swatch)}
				/>
			))}
			{(icons ?? []).map(option => (
				<button
					type="button"
					className="sp-option"
					aria-label={option.name}
					aria-pressed={value === option.name ? 'true' : 'false'}
					onClick={() => onChange?.(option.name)}
					key={option.name}
				>
					{option.icon}
				</button>
			))}
			{custom
				? (
					<label
						className={join('sp-option', 'sp-option--swatch', !chosenOutside && 'sp-option--custom')}
						aria-label={chosenOutside ? `The colour ${value}` : 'A colour of your own'}
						aria-pressed={chosenOutside ? 'true' : 'false'}
						{...(chosenOutside ? { style: { '--swatch': value } } : {})}
					>
						{chosenOutside ? null : customIcon}
						<input
							type="color"
							value={chosenOutside ? value : '#1d4d33'}
							onChange={ev => onChange?.(ev.target.value)}
						/>
					</label>
				)
				: null}
		</span>
	)
}

/* What kind of label each of these needs, read by Field.

   A box's text is its label and clicking it toggles, so the label wraps the control
   and there is no id to bind. A group of boxes cannot be labelled at all - a <label>
   points at one control - so it takes a legend. Field renders the right HTML from
   this rather than the caller picking a different component per case. Stated here
   because the control is what knows, and it costs Field no import and no load order. */
Check.fieldRole = 'box'
Radio.fieldRole = 'box'
Switch.fieldRole = 'box'
Picker.fieldRole = 'group'
