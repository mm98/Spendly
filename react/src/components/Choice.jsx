import { cloneElement, useEffect, useRef } from 'react'
import { join, pick, reject } from './variants.js'
import { SearchInput } from './Inputs.jsx'

export function Check({ indeterminate = false, ...rest }) {
	reject(rest, 'Check')
	const box = useRef(null)
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

/** One of a set, where picking one unpicks the others. Needs a `name`. */
export function Radio({ ...rest }) {
	reject(rest, 'Radio')
	return <input type="radio" className="sp-radio" {...rest} />
}

/** A checkbox whose change applies at once, so the form has nothing to save. */
export function Switch({ ...rest }) {
	reject(rest, 'Switch')
	return <input type="checkbox" className="sp-switch" {...rest} />
}

const CHOICE = { default: null, row: 'sp-choice--row', described: 'sp-choice--described' }

export function Choice({ variant = 'default', control, children, description, ...rest }) {
	reject(rest, 'Choice')
	if (description && variant !== 'described')
		console.error('<Choice> a description needs variant="described"')
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

export function FieldGroup({ legend, children, ...rest }) {
	reject(rest, 'FieldGroup')
	return (
		<fieldset className="sp-field-group" {...rest}>
			<legend>{legend}</legend>
			{children}
		</fieldset>
	)
}

/** `search` with `onSearch` puts the tile picker's search above the cells; `more` is the
    "+N" cell that shows the rest, with `onMore` (c7). */
export function Picker({ swatches, icons, value, onChange, custom = false, customIcon, search, onSearch, searchLabel, more, onMore, ...rest }) {
	reject(rest, 'Picker')
	if (swatches && icons) console.error('<Picker> takes swatches or icons, not both')
	if (custom && !swatches) console.error('<Picker> a custom colour belongs to a colour group')
	if (onSearch && !icons) console.error('<Picker> a search belongs to a tile group')

	// a name is painted by the stylesheet; a value has to be carried to it
	const named = s => /^[a-z][a-z0-9-]*$/.test(s)
	const paint = s => named(s) ? { 'data-swatch': s } : { style: { '--swatch': s } }
	const chosenOutside = custom && value && !named(value) && !(swatches ?? []).includes(value)

	const cells = (
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
			{more ? <button type="button" className="sp-option sp-ink-5" onClick={onMore}>{more}</button> : null}
		</span>
	)
	if (!onSearch) return cells
	return (
		<div className="sp-picker">
			<SearchInput value={search ?? ''} onChange={onSearch} placeholder={searchLabel} aria-label={searchLabel} />
			{cells}
		</div>
	)
}

Check.fieldRole = 'box'
Radio.fieldRole = 'box'
Switch.fieldRole = 'box'
Picker.fieldRole = 'group'
