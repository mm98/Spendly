import { useRef, useState } from 'react'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { formatNumber, parseNumber } from './format.js'
import { Spinner } from './Utilities.jsx'
import { pace, useStill } from './motion.js'
import { usePhrase } from '../language/phrases.js'

const TEXT = {
	default: null,
	empty: 'sp-input--empty',
	readonly: 'sp-input--readonly',
	stretch: 'sp-input--stretch'
}

/** The box every field is. Internal: the fields below are its arguments. */
function Box({ as = 'input', type = 'text', value, onChange, danger = false, fullWidth = false, classes, component, inputRef, lead, trail, unit, ...rest }) {
	reject(rest, component)
	const shared = {
		className: join('sp-input', classes, fullWidth && 'sp-grow', lead && 'sp-input--lead', trail && 'sp-input--trail', unit && 'sp-input--unit'),
		value,
		onChange: ev => onChange?.(ev.target.value),
		...(danger ? { 'aria-invalid': 'true' } : {}),
		...rest
	}
	// ref, not a prop: a function component does not forward one, so the fields that
	// need the element - the date field opening the platform picker - pass it by name
	if (as === 'textarea') return <textarea ref={inputRef} {...shared} className={join('sp-textarea', classes, fullWidth && 'sp-grow')} />
	return <input type={type} ref={inputRef} {...shared} />
}

function Trailed({ lead, trail, kbd, chevron, fullWidth = false, children }) {
	return (
		<span className={join('sp-field__wrap', fullWidth && 'sp-grow')}>
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

const TYPES = /** @type {const} */ (['text', 'email', 'tel', 'url'])

/** `action` is one icon button at the field's end: { icon, label, expanded, onClick }.
    @param {object} props
    @param {typeof TYPES[number]} [props.type] The kind of text, for the phone keyboard and the check that comes with it: text, email, url and so on.
    @param {boolean} [props.multiline] A box of several lines instead of one.
    @param {number} [props.rows] How many lines a multiline field shows.
    @param {keyof typeof TEXT} [props.variant] `default`; `empty` reads as no value yet; `readonly` reads as a value that cannot be changed; `stretch` takes the height of the row it sits in.
    @param {boolean} [props.code] The text is a sign-in or recovery code, a key, or an address to paste: set in the monospaced face, so every character is the same width, a code does not shift as it is typed, and 0 and O read apart. Goes with any variant, readonly for a key that is shown to be copied.
    @param {{ icon: string, label: string, expanded?: boolean, onClick: () => void }} [props.action] A button at the end of the field: its icon, its name, and what it does.
    @param {string} [props.value] The text in the field.
    @param {(value: string) => void} [props.onChange]
    @param {boolean} [props.danger] The value is wrong: the field is drawn in red.
    @param {string} [props.placeholder] Grey words shown while the field is empty.
    @param {boolean} [props.fullWidth] Take all the room the control is given: the width of its column, or what is left in its row. Inside a Field, set it on the Field. */
export function TextField({ type = 'text', multiline = false, rows = 3, variant = 'default', code = false, action, fullWidth = false, ...rest }) {
	if (!TYPES.includes(type)) console.error(`<TextField> type="${type}" is not one of: ${TYPES.join(' | ')}`)
	if (multiline) return <Box as="textarea" rows={rows} component="TextField" fullWidth={fullWidth} {...rest} />
	if (action) return (
		<Trailed fullWidth={fullWidth} trail={
			<button type="button" className="sp-icon-btn sp-icon-btn--field sp-field__trail" aria-label={action.label}
				{...('expanded' in action ? { 'aria-expanded': action.expanded ? 'true' : 'false' } : {})} onClick={action.onClick}>
				<Icon name={action.icon} size={15} />
			</button>
		}>
			<Box type={type} classes={join(pick(TEXT, variant, 'variant', 'TextField'), code && 'sp-input--code', 'sp-input--trail')} component="TextField" {...rest} />
		</Trailed>
	)
	return <Box type={type} classes={join(pick(TEXT, variant, 'variant', 'TextField'), code && 'sp-input--code')} component="TextField" fullWidth={fullWidth} {...rest} />
}

/** @param {object} props
    @param {string} [props.value] The password.
    @param {(value: string) => void} [props.onChange]
    @param {boolean} [props.danger] The value is wrong: the field is drawn in red.
    @param {boolean} [props.fullWidth] Take all the room the control is given: the width of its column, or what is left in its row. Inside a Field, set it on the Field. */
export function PasswordField({ fullWidth = false, ...rest }) {
	const phrase = usePhrase()
	const [shown, setShown] = useState(false)
	// while it turns, the field's letters shuffle into place (or back into dots) over an
	// overlay the reader sees and a screen reader does not; the field keeps its value
	const [shuffle, setShuffle] = useState(null)
	const run = useRef(0)
	// the shell's one reduced-motion setting; the shuffle stays its own, since it changes letters, not style
	const still = useStill()
	const toggle = () => {
		const next = !shown
		const text = String(rest.value ?? '')
		if (still || !text || text.length > 40) { setShown(next); return }
		const id = ++run.current
		const target = next ? text : '\u2022'.repeat(text.length)
		const from = next ? '\u2022'.repeat(text.length) : text
		const ms = 2 * pace().in * 1000
		const start = performance.now()
		const frame = now => {
			if (id !== run.current) return
			const t = Math.min(1, (now - start) / ms)
			// showing settles left to right, hiding right to left, so hiding is showing played
			// backwards; the letters not yet settled show a passing glyph
			const n = target.length
			setShuffle([...target].map((ch, i) => {
				const at = next ? (i + 1) / n : (n - i) / n
				return t >= at ? ch : t >= at - 0.5 ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : from[i]
			}).join(''))
			if (t < 1) requestAnimationFrame(frame)
			else { setShown(next); setShuffle(null) }
		}
		requestAnimationFrame(frame)
	}
	return (
		<Trailed
			fullWidth={fullWidth}
			trail={
				<Trail
					label={phrase('field.showPassword')}
					pressed={shown}
					onClick={toggle}
				>
					<Icon name="eye" />
				</Trail>
			}
		>
			<Box type={shown ? 'text' : 'password'} classes={join('sp-input--trail', shuffle !== null && 'sp-input--shuffling')} component="PasswordField" {...rest} />
			{shuffle !== null ? <span className="sp-input__shuffle" aria-hidden="true">{shuffle}</span> : null}
		</Trailed>
	)
}

// what a letter passes through on its way into place
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789#%&*+=?'

/** `cell` is the amount in a sheet's cell (Budget 21b): it reads as the figure until it is
    clicked or focused, then takes the field's border inside its own cell.
    @param {object} props
    @param {number | null} [props.value] The number. Empty is null.
    @param {(value: number | null) => void} [props.onChange]
    @param {() => void} [props.onBlur]
    @param {number} [props.decimals] How many decimal places it shows: two for money, three for a quantity.
    @param {number} [props.min] The lowest number it takes.
    @param {string} [props.locale] How numbers are written, such as da-DK. Defaults to the browser's.
    @param {boolean} [props.expected] A planned figure, not a real one: drawn in grey.
    @param {boolean} [props.cell] The number in a table cell: it reads as text until it is clicked.
    @param {boolean} [props.fullWidth] Take all the room the control is given: the width of its column, or what is left in its row. Inside a Field, set it on the Field. */
export function NumberField({ value, onChange, onBlur, decimals = 2, min, locale, expected = false, cell = false, fullWidth = false, ...rest }) {
	const [typing, setTyping] = useState(null)
	return (
		<Box
			type="text"
			inputMode="decimal"
			classes={join('sp-number', expected && 'sp-ink-5', cell && 'sp-input--cell')}
			component="NumberField"
			fullWidth={fullWidth}
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

/** `icon` is the lead mark; `clear` false hides the clear button; `ends` are controls after it, at the
    field's end with it (.sp-field__trails), such as the order list's Ask (AskTrail).
    @param {object} props
    @param {string} props.value The words in the search.
    @param {(value: string) => void} props.onChange
    @param {import('react').ReactNode} [props.kbd] The keyboard shortcut that puts the cursor in the search, such as Ctrl K.
    @param {import('react').Ref<HTMLInputElement>} [props.inputRef]
    @param {string} [props.name]
    @param {import('./Icon.jsx').IconName} [props.icon] The icon at the start.
    @param {boolean} [props.clear] Show a button that empties the search.
    @param {import('react').ReactNode} [props.ends] Controls at the end of the field, such as Ask.
    @param {boolean} [props.fullWidth] Take all the room the control is given: the width of its column, or what is left in its row. */
export function SearchInput({ value, onChange, kbd, inputRef, name = 'search', icon = 'search', clear = true, ends, fullWidth = false, ...rest }) {
	const phrase = usePhrase()
	const clearable = clear && !!value
	const own = useRef(null)
	const bind = el => {
		own.current = el
		if (typeof inputRef === 'function') inputRef(el)
		else if (inputRef) inputRef.current = el
	}
	// clearing hands focus back to the field, where the reader types the next search
	const clearing = clearable
		? <Trail label={phrase('field.clearSearch')} onClick={() => { onChange?.(''); own.current?.focus() }}><Icon name="x" /></Trail>
		: null
	return (
		<span className={join('sp-picker__search', fullWidth && 'sp-grow')}>
			<span className="sp-field__lead"><Icon name={icon} size={14} /></span>
			<Box
				type="search"
				classes={join('sp-input--search', 'sp-input--lead', kbd && 'sp-input--search-kbd', ends ? 'sp-input--trail-2' : 'sp-input--trail')}
				component="SearchInput"
				name={name}
				value={value}
				onChange={onChange}
				inputRef={bind}
				{...rest}
			/>
			{ends ? <span className="sp-field__trails">{clearing}{ends}</span> : clearing}
			{!clearable && !ends && kbd ? <span className="sp-field__kbd">{kbd}</span> : null}
		</span>
	)
}

/** Ask at a search field's end (Order list 2b): off, on (`on`), or Stop while it works (`busy`).
    `spent` is no questions left today: disabled, its reason held by the field's end.
    @param {object} props
    @param {boolean} [props.on] Ask is turned on.
    @param {boolean} [props.busy] Ask is working: the button reads Stop.
    @param {boolean} [props.spent] No questions are left today: the button is off.
    @param {() => void} [props.onToggle]
    @param {() => void} [props.onStop] */
export function AskTrail({ on, busy, spent, onToggle, onStop }) {
	const phrase = usePhrase()
	if (spent) return (
		<span data-tip={phrase('askTrail.spent')}>
			<button type="button" className="sp-field__trail sp-field__trail--ask" aria-pressed="false" aria-label={phrase('chat.ask')} disabled>
				<Icon name="message-circle" />
			</button>
		</span>
	)
	if (busy) return (
		<button type="button" className="sp-field__trail sp-field__trail--ask" aria-pressed="true" aria-busy="true" aria-label={phrase('chat.stop')}
			data-tip={phrase('askTrail.stop')} onClick={onStop}>
			<Spinner />
			<span className="sp-field__stop"><Icon name="x" /></span>
		</button>
	)
	return (
		<button type="button" className="sp-field__trail sp-field__trail--ask" aria-pressed={on ? 'true' : 'false'} aria-label={phrase('chat.ask')}
			data-tip={phrase(on ? 'askTrail.backToSearch' : 'askTrail.ask')} onClick={onToggle}>
			<Icon name="message-circle" />
		</button>
	)
}

/** `stops` are values at evenly spaced points, so the track is spaced by them, not by value.
    `open` makes the top end "and above": shown with a +, and a To typed past it is kept.
    @param {object} props
    @param {[number, number]} props.value The low and the high end.
    @param {(value: [number, number]) => void} props.onChange
    @param {number} [props.min] The lowest value.
    @param {number} [props.max] The highest value.
    @param {number} [props.step] How far one move goes.
    @param {number[]} [props.stops] Values at evenly spaced points on the track, in place of min and max.
    @param {boolean} [props.open] The top end means and above: it is shown with a +.
    @param {string} [props.label] What is being bounded.
    @param {(value: number) => string} [props.format] How an end is written in its field.
    @param {string} [props.locale] How numbers are written, such as da-DK. */
export function RangeSlider({ value, onChange, min, max, step = 1, stops, open = false, label, format, locale, ...rest }) {
	reject(rest, 'RangeSlider')
	const phrase = usePhrase()
	// what is being typed into a bound, kept until the box is left: a number half-written is not a value
	const [typing, setTyping] = useState({})
	// the boxes read text back in the grammar `format` writes it in, unless a locale is named
	const grouping = !locale && format ? String(format(1000000)).replace(/[\d\s-]/g, '').charAt(0) : ''
	const read = text => parseNumber(String(text).replace(/\+\s*$/, ''), { locale: locale ?? (grouping === '.' ? 'da-DK' : grouping === ',' ? 'en-GB' : undefined) })
	// two bounds, in order - a third would be read as nothing
	if (!Array.isArray(value) || value.length !== 2)
		console.error('<RangeSlider> value is two bounds, [low, high] - got ' + JSON.stringify(value))
	const rail = useRef(null)
	const [low, high] = value
	const spaced = Array.isArray(stops) && stops.length > 1
	const least = spaced ? stops[0] : min
	const most = spaced ? stops[stops.length - 1] : max
	const last = spaced ? stops.length - 1 : 0

	// where a value sits along the track, 0 to 1
	const place = n => {
		if (!spaced) return (n - least) / (most - least)
		if (n <= least) return 0
		if (n >= most) return 1
		let i = 0
		while (i + 1 < last && stops[i + 1] <= n) i++
		const span = stops[i + 1] - stops[i]
		return (i + (span > 0 ? (n - stops[i]) / span : 0)) / last
	}
	const pct = n => place(n) * 100
	// the value at a point along the track: the nearest stop, or the value there
	const valueAt = at => {
		const along = Math.min(1, Math.max(0, at))
		return spaced ? stops[Math.round(along * last)] : least + along * (most - least)
	}
	// `times` stops along from a value: a stop that repeats the value it leaves is passed over
	const stepFrom = (n, by, times) => {
		if (!spaced) return n + by * step * times
		const exact = place(n) * last
		let i = by > 0 ? Math.floor(exact + 1e-9) : Math.ceil(exact - 1e-9)
		let at = n
		for (let moved = 0; moved < times && i + by >= 0 && i + by <= last;) {
			i += by
			if (stops[i] !== at) { at = stops[i]; moved++ }
		}
		return at
	}

	// a dragged or stepped bound lands on a step; a typed one is kept as typed, inside min and max,
	// or past the top end when it is open
	const move = (which, n, snap = true) => {
		const top = open && which === 'high' && !snap ? Infinity : most
		const bounded = Math.min(top, Math.max(least, snap && !spaced ? Math.round(n / step) * step : n))
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
		move(which, valueAt((ev.clientX - box.left) / box.width))
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
		const by = ev.key === 'ArrowUp' ? 1 : ev.key === 'ArrowDown' ? -1 : 0
		if (!by) return
		ev.preventDefault()
		setTyping(t => ({ ...t, [which]: undefined }))
		move(which, stepFrom(n, by, ev.shiftKey ? 10 : 1))
	}
	// the open end reads as "and above"
	const shown = (which, n) => {
		const text = format ? format(n) : n
		return open && which === 'high' && n === most ? `${text}+` : text
	}
	const bound = (which, n) => ({
		value: typing[which] ?? shown(which, n),
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
			aria-label={phrase(which === 'low' ? 'rangeSlider.from' : 'rangeSlider.to', { label })}
			aria-valuemin={which === 'low' ? least : low}
			aria-valuemax={which === 'low' ? high : most}
			aria-valuenow={n}
			aria-valuetext={String(shown(which, n))}
			onPointerDown={grab}
			onPointerMove={drag(which)}
			onKeyDown={ev => {
				const by = ev.key === 'ArrowRight' || ev.key === 'ArrowUp' ? 1
					: ev.key === 'ArrowLeft' || ev.key === 'ArrowDown' ? -1
					: 0
				const to = ev.key === 'Home' ? least : ev.key === 'End' ? most : by ? stepFrom(n, by, ev.shiftKey ? 10 : 1) : null
				if (to === null) return
				ev.preventDefault()
				move(which, to)
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
					const at = (ev.clientX - box.left) / box.width
					move(Math.abs(at - place(low)) <= Math.abs(at - place(high)) ? 'low' : 'high', valueAt(at))
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
					aria-label={phrase('rangeSlider.from', { label })}
					{...bound('low', low)}
				/>
				<Box
					classes="sp-number"
					component="RangeSlider"
					inputMode="decimal"
					aria-label={phrase('rangeSlider.to', { label })}
					{...bound('high', high)}
				/>
			</span>
		</>
	)
}

// two bounds over one rail: a set, so it takes a legend rather than a label
RangeSlider.fieldRole = 'group'
