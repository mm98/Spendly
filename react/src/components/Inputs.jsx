import { useRef, useState } from 'react'
import { IconButton } from './Button.jsx'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Chip } from './Chip.jsx'
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

export function SearchInput({ value, onChange, kbd, ...rest }) {
	const clearable = !!value
	return (
		<span className="sp-picker__search">
			<span className="sp-field__lead"><Icon name="search" /></span>
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
