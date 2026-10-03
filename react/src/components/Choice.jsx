import { cloneElement, useEffect, useRef, useState } from 'react'
import { join, pick, reject } from './variants.js'
import { SearchInput } from './Inputs.jsx'
import { Icon } from './Icon.jsx'
import { countOf } from './Combobox.jsx'

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
						<span className="sp-meta">{description}</span>
					</span>
				)
				: children}
		</label>
	)
}

/* The facet groups a reader folded, by name, kept for the next visit on this device */
const FOLDED = 'spendly:folded-facets'
const foldedNow = () => { try { return JSON.parse(localStorage.getItem(FOLDED)) ?? [] } catch { return [] } }
const keepFolded = (name, folded) => {
	try { localStorage.setItem(FOLDED, JSON.stringify([...foldedNow().filter(n => n !== name), ...(folded ? [name] : [])])) } catch { /* this visit only */ }
}

/** `facet` is the group as a filter rail draws it (c12): its head, a `count` at its end, folds it (16a).
    A facet whose controls name themselves, as a range does, has a head row, its `meta` at the right. */
export function FieldGroup({ legend, facet = false, count, meta, children, ...rest }) {
	reject(rest, 'FieldGroup')
	if ((count !== undefined || meta !== undefined) && !facet) console.error('<FieldGroup> a count or a meta belongs to a facet head')
	const named = typeof legend === 'string' ? legend : null
	const [open, setOpen] = useState(() => !(facet && named && foldedNow().includes(named)))
	const fold = () => { setOpen(!open); if (named) keepFolded(named, open) }
	const head = end => (
		<button type="button" className="sp-field-group__fold" aria-expanded={open ? 'true' : 'false'} onClick={fold}>
			{legend}
			<span className="sp-grow" />
			{end}
			<span className="sp-card__chevron"><Icon name="chevron-down" size={14} /></span>
		</button>
	)
	if (meta !== undefined)
		return (
			<div className="sp-field-group" {...rest}>
				<div className="sp-field-group__head">{head(<span className="sp-meta">{meta}</span>)}</div>
				{open ? children : null}
			</div>
		)
	return (
		<fieldset className="sp-field-group" {...rest}>
			{facet
				? <legend className="sp-field-group__head">{head(count !== undefined ? <span className="sp-field-group__count">{count}</span> : null)}</legend>
				: <legend>{legend}</legend>}
			{!facet || open ? children : null}
		</fieldset>
	)
}

/** A facet's values: however many there are, they scroll inside the group past --list-max (16a). */
export function FieldGroupValues({ children, ...rest }) {
	reject(rest, 'FieldGroupValues')
	return <div className="sp-field-group__values" {...rest}>{children}</div>
}

/** Shows the rest of a facet's values (c12). */
export function FieldGroupMore({ onClick, children, ...rest }) {
	reject(rest, 'FieldGroupMore')
	return <button type="button" className="sp-field-group__more" onClick={onClick} {...rest}>{children}</button>
}

/** What a facet opens under its values, as the date facet's Custom range (c12, Order list 2d). */
export function FieldGroupPanel({ children, ...rest }) {
	reject(rest, 'FieldGroupPanel')
	return <div className="sp-field-group__panel" {...rest}>{children}</div>
}

// what a reader calls each colour of the set (c7): its tooltip and its name
const SWATCH_NAMES = {
	green: 'Green',
	'green-2': 'Deep green',
	'green-3': 'Mid green',
	'green-4': 'Light green',
	'green-5': 'Pale green',
	'amber-ink': 'Brown',
	'amber-2': 'Sand',
	'red-ink': 'Rust',
	'ink-6': 'Grey'
}

// an icon the page does not name is called what its register name says, in words
const iconName = name => {
	const words = String(name).replace(/-/g, ' ')
	return words.charAt(0).toUpperCase() + words.slice(1)
}

const centre = r => r.left + r.width / 2
// where a cell is drawn: the custom colour's input sits hidden inside its tile
const drawn = cell => (cell.closest('.sp-option') ?? cell).getBoundingClientRect()

/* The arrow keys walk a grid of cells in two dimensions, Home and End reach the true first and last
   (c7). Up and Down land on the nearest cell of the next row, by where the cells are drawn. */
function walk(ev) {
	const cells = [...ev.currentTarget.querySelectorAll('[data-cell]')]
	const at = cells.indexOf(document.activeElement)
	if (at < 0) return
	let to
	if (ev.key === 'Home') to = 0
	else if (ev.key === 'End') to = cells.length - 1
	else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') to = at + (ev.key === 'ArrowRight' ? 1 : -1)
	else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
		const from = drawn(cells[at])
		const down = ev.key === 'ArrowDown'
		const others = cells.map((cell, i) => ({ i, r: drawn(cell) }))
			.filter(c => (down ? c.r.top >= from.bottom - 1 : c.r.bottom <= from.top + 1))
		if (!others.length) return ev.preventDefault()
		const rowTop = down ? Math.min(...others.map(c => c.r.top)) : Math.max(...others.map(c => c.r.top))
		const row = others.filter(c => Math.abs(c.r.top - rowTop) < 1)
		to = row.reduce((best, c) => (Math.abs(centre(c.r) - centre(from)) < Math.abs(centre(best.r) - centre(from)) ? c : best)).i
	}
	else return
	ev.preventDefault()
	cells[Math.min(Math.max(to, 0), cells.length - 1)].focus()
}

/** `search` with `onSearch` puts the search above the cells, `noun` (plural) naming them in the count read
    out as they narrow; `more` is the "+N" cell, with `onMore` (c7). An icon option may carry a `label`. */
export function Picker({ swatches, icons, value, onChange, custom = false, customIcon, search, onSearch, searchLabel, noun, more, onMore, ...rest }) {
	reject(rest, 'Picker')
	if (swatches && icons) console.error('<Picker> takes swatches or icons, not both')
	if (custom && !swatches) console.error('<Picker> a custom colour belongs to a colour group')
	if (onSearch && !icons) console.error('<Picker> a search belongs to a tile group')

	// a name is painted by the stylesheet; a value has to be carried to it
	const named = s => /^[a-z][a-z0-9-]*$/.test(s)
	const paint = s => named(s) ? { 'data-swatch': s } : { style: { '--swatch': s } }
	const chosenOutside = custom && value && !named(value) && !(swatches ?? []).includes(value)

	// one Tab stop for the whole grid (c7): the cell last moved to, else the chosen one, else the first
	const keys = [...(swatches ?? []), ...(icons ?? []).map(o => o.name), ...(custom ? ['custom'] : []), ...(more ? ['more'] : [])]
	const [moved, setMoved] = useState(null)
	const chosen = chosenOutside ? 'custom' : keys.includes(value) ? value : null
	const stop = keys.includes(moved) ? moved : chosen ?? keys[0]
	const cell = key => ({ 'data-cell': '', tabIndex: key === stop ? 0 : -1, onFocus: () => setMoved(key) })

	const cells = (
		<span className="sp-options" role="group" onKeyDown={walk} {...rest}>
			{(swatches ?? []).map(swatch => (
				<button
					type="button"
					className="sp-option sp-option--swatch"
					aria-label={SWATCH_NAMES[swatch] ?? 'Colour'}
					data-tip={SWATCH_NAMES[swatch] ?? 'Colour'}
					aria-pressed={value === swatch ? 'true' : 'false'}
					onClick={() => onChange?.(swatch)}
					key={swatch}
					{...cell(swatch)}
					{...paint(swatch)}
				/>
			))}
			{(icons ?? []).map(option => (
				<button
					type="button"
					className="sp-option"
					aria-label={option.label ?? iconName(option.name)}
					data-tip={option.label ?? iconName(option.name)}
					aria-pressed={value === option.name ? 'true' : 'false'}
					onClick={() => onChange?.(option.name)}
					key={option.name}
					{...cell(option.name)}
				>
					{option.icon}
				</button>
			))}
			{custom
				? (
					<label
						className={join('sp-option', 'sp-option--swatch', !chosenOutside && 'sp-option--custom')}
						data-tip="Custom colour"
						aria-pressed={chosenOutside ? 'true' : 'false'}
						{...(chosenOutside ? { style: { '--swatch': value } } : {})}
					>
						{chosenOutside ? null : customIcon}
						<input
							type="color"
							aria-label="Custom colour"
							value={chosenOutside ? value : '#1d4d33'}
							onChange={ev => onChange?.(ev.target.value)}
							{...cell('custom')}
						/>
					</label>
				)
				: null}
			{more ? <button type="button" className="sp-option sp-ink-5" onClick={onMore} {...cell('more')}>{more}</button> : null}
		</span>
	)
	if (!onSearch) return cells
	return (
		<div className="sp-picker">
			<SearchInput value={search ?? ''} onChange={onSearch} placeholder={searchLabel} aria-label={searchLabel} />
			{cells}
			<span className="sp-announce" aria-live="polite">{search ? countOf(icons ?? [], noun) : ''}</span>
		</div>
	)
}

Check.fieldRole = 'box'
Radio.fieldRole = 'box'
Switch.fieldRole = 'box'
Picker.fieldRole = 'group'
