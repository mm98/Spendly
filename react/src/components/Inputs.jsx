import { useId, useRef, useState } from 'react'
import { IconButton } from './Button.jsx'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Chip } from './Chip.jsx'
import { countOf, usePanelPlace, useListbox } from './Combobox.jsx'
import { formatNumber, parseNumber } from './format.js'

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

export function TextField({ type = 'text', multiline = false, rows = 3, variant = 'default', ...rest }) {
	const TYPES = ['text', 'email', 'tel', 'url']
	if (!TYPES.includes(type)) console.error(`<TextField> type="${type}" is not one of: ${TYPES.join(' | ')}`)
	if (multiline) return <Box as="textarea" rows={rows} component="TextField" {...rest} />
	return <Box type={type} classes={pick(TEXT, variant, 'variant', 'TextField')} component="TextField" {...rest} />
}

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

/** `cell` is the amount in a sheet's cell (Budget 21b): it reads as the figure until it is
    clicked or focused, then takes the field's border inside its own cell. */
export function NumberField({ value, onChange, onBlur, decimals = 2, min, locale, computed = false, expected = false, cell = false, ...rest }) {
	const [typing, setTyping] = useState(null)
	return (
		<Box
			type="text"
			inputMode="decimal"
			classes={join('sp-number', computed && 'sp-input--readonly', expected && 'sp-ink-5', cell && 'sp-input--cell')}
			component="NumberField"
			readOnly={computed}
			value={typing ?? formatNumber(value, { locale, decimals })}
			onChange={text => {
				setTyping(text)
				const n = parseNumber(text, { locale })
				if (n === null) return onChange?.(null)
				onChange?.(min !== undefined && n < min ? min : n)
			}}
			onBlur={ev => { setTyping(null); onBlur?.(ev) }}
			{...rest}
		/>
	)
}

export function SearchInput({ value, onChange, kbd, inputRef, ...rest }) {
	const clearable = !!value
	const own = useRef(null)
	const bind = el => {
		own.current = el
		if (typeof inputRef === 'function') inputRef(el)
		else if (inputRef) inputRef.current = el
	}
	return (
		<span className="sp-picker__search">
			<span className="sp-field__lead"><Icon name="search" size={14} /></span>
			<Box
				type="search"
				classes={join('sp-input--search', 'sp-input--lead', kbd && 'sp-input--search-kbd', 'sp-input--trail')}
				component="SearchInput"
				value={value}
				onChange={onChange}
				inputRef={bind}
				{...rest}
			/>
			{/* clearing hands focus back to the field, where the reader types the next search */}
			{clearable
				? <Trail label="Clear the search" onClick={() => { onChange?.(''); own.current?.focus() }}><Icon name="x" /></Trail>
				: null}
			{!clearable && kbd ? <span className="sp-field__kbd">{kbd}</span> : null}
		</span>
	)
}

export function RangeSlider({ value, onChange, min, max, step = 1, label, format, locale, ...rest }) {
	reject(rest, 'RangeSlider')
	// what is being typed into a bound, kept until the box is left: a number half-written is not a value
	const [typing, setTyping] = useState({})
	// the boxes read text back in the grammar `format` writes it in, unless a locale is named
	const grouping = !locale && format ? String(format(1000000)).replace(/[\d\s-]/g, '').charAt(0) : ''
	const read = text => parseNumber(text, { locale: locale ?? (grouping === '.' ? 'da-DK' : grouping === ',' ? 'en-GB' : undefined) })
	// two bounds, in order - a third would be read as nothing
	if (!Array.isArray(value) || value.length !== 2)
		console.error('<RangeSlider> value is two bounds, [low, high] - got ' + JSON.stringify(value))
	const rail = useRef(null)
	const [low, high] = value
	const pct = n => ((n - min) / (max - min)) * 100

	// a dragged or stepped bound lands on a step; a typed one is kept as typed, inside min and max
	const move = (which, n, snap = true) => {
		const bounded = Math.min(max, Math.max(min, snap ? Math.round(n / step) * step : n))
		onChange?.(which === 'low' ? [Math.min(bounded, high), high] : [low, Math.max(bounded, low)])
	}

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

	const commit = which => {
		const text = typing[which]
		setTyping(t => ({ ...t, [which]: undefined }))
		if (text === undefined) return
		const n = read(text)
		if (n !== null) move(which, n, false)
	}

	const stepKeys = (which, n) => ev => {
		if (ev.key === 'Enter') return commit(which)
		const by = ev.key === 'ArrowUp' ? step : ev.key === 'ArrowDown' ? -step : 0
		if (!by) return
		ev.preventDefault()
		setTyping(t => ({ ...t, [which]: undefined }))
		move(which, n + by * (ev.shiftKey ? 10 : 1))
	}
	const bound = (which, n) => ({
		value: typing[which] ?? (format ? format(n) : n),
		onChange: text => setTyping(t => ({ ...t, [which]: text })),
		onBlur: () => commit(which),
		onKeyDown: stepKeys(which, n)
	})

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
					{...bound('low', low)}
				/>
				<Box
					classes="sp-number"
					component="RangeSlider"
					inputMode="decimal"
					aria-label={`${label}, to`}
					{...bound('high', high)}
				/>
			</span>
		</>
	)
}

/** Typed values as chips, offering `children` (ComboboxOption) in a panel filtered by `onSearch` (22c);
    `noun` (plural) names the count read out. `marked` is one token drawn in green (5h); `trails` maps a
    token to a mark drawn before its remove, as an over-limit category's dot (8b). */
export function TokensField({ value = [], onChange, placeholder, danger = false, id, onSearch, noun, marked, trails, children, ...rest }) {
	reject(rest, 'TokensField')
	// what Field hands the control belongs on the input that takes focus, not on the box around it
	const { 'aria-label': label, 'aria-describedby': describedBy, 'aria-invalid': invalid, required, ...box } = rest
	const [typed, setTyped] = useState('')
	const [open, setOpen] = useState(false)
	const panelId = useId()
	const suggests = children !== undefined
	const type = text => {
		setTyped(text)
		listbox.setActive(-1)
		onSearch?.(text)
	}
	const listbox = useListbox(children, { panelId, onPick: () => type('') })
	const { options, active } = listbox
	const add = () => {
		const next = typed.trim()
		if (!next) return
		if (!value.includes(next)) onChange?.([...value, next])
		type('')
	}
	const shown = suggests && open && options.length > 0
	const holder = useRef(null)
	const input = useRef(null)
	usePanelPlace(holder, listbox.panel, shown, options.length)
	// a press anywhere in the box but on a token's remove types into it: the input is one line of it
	const field = (
		<span className="sp-tokens" onClick={ev => { if (!ev.target.closest('button, input')) { input.current?.focus(); setOpen(true) } }} {...box}>
			{value.map(token => (
				<Chip
					key={token}
					{...(token === marked ? { color: 'success' } : {})}
					trail={<>
						{trails?.[token]}
						<IconButton
							icon={<Icon name="x" size={9} />}
							aria-label={`Remove ${token}`}
							size="small"
							onClick={() => onChange?.(value.filter(t => t !== token))}
						/>
					</>}
				>
					{token}
				</Chip>
			))}
			<input
				ref={input}
				id={id}
				className="sp-tokens__add"
				aria-label={label}
				aria-describedby={describedBy}
				required={required}
				placeholder={placeholder}
				value={typed}
				{...(danger || invalid === true || invalid === 'true' ? { 'aria-invalid': 'true' } : {})}
				{...(suggests
					? {
						role: 'combobox',
						'aria-expanded': shown ? 'true' : 'false',
						'aria-controls': panelId,
						'aria-autocomplete': 'list',
						'aria-activedescendant': shown ? listbox.activeId : undefined,
						// a press opens it, focus alone does not: focus a page moves here must not cover the field
						onClick: () => setOpen(true)
					}
					: {})}
				onChange={ev => { type(ev.target.value); setOpen(true) }}
				onKeyDown={ev => {
					if (suggests && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
						ev.preventDefault()
						setOpen(true)
						const by = ev.key === 'ArrowDown' ? 1 : -1
						return listbox.step(by, active < 0 ? (by > 0 ? -1 : options.length) : active)
					}
					if (shown && (ev.key === 'Home' || ev.key === 'End') && active > -1) {
						ev.preventDefault()
						return ev.key === 'Home' ? listbox.step(1, -1) : listbox.step(-1, options.length)
					}
					if (ev.key === 'Enter' && shown && active > -1) { ev.preventDefault(); options[active].pick(); return }
					if (ev.key === 'Escape' && shown) { ev.stopPropagation(); setOpen(false); return }
					if (ev.key === 'Enter' || ev.key === ',') { ev.preventDefault(); add() }
					// backspace in an empty field removes the last value, which is what
					// every token field does and what a reader will try first
					if (ev.key === 'Backspace' && !typed && value.length) onChange?.(value.slice(0, -1))
				}}
				onBlur={() => { add(); setOpen(false) }}
			/>
		</span>
	)
	if (!suggests) return field
	return (
		<div className="sp-combobox" data-open={shown ? 'true' : 'false'} ref={holder}>
			{field}
			{/* a press on an option must not blur the field first, or the half-typed text is added as a value */}
			<ul className="sp-combobox__panel" id={panelId} role="listbox" ref={listbox.panel} onMouseDown={ev => ev.preventDefault()}>{listbox.list}</ul>
			<span className="sp-announce" aria-live="polite">{typed && open ? countOf(options, noun) : ''}</span>
		</div>
	)
}

// two bounds over one rail: a set, so it takes a legend rather than a label
RangeSlider.fieldRole = 'group'
