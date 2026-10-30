import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon.jsx'
import { Button, IconButton } from './Button.jsx'
import { Chip } from './Chip.jsx'
import { Scrim } from './Shell.jsx'
import { Sheet } from './Touch.jsx'
import { useFocusTrap } from './Utilities.jsx'
import { join, pick, reject } from './variants.js'
import { glide, m, usePanelMotion } from './motion.js'
import { phrase, usePhrase } from '../language/phrases.js'

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parse = s => {
	const [y, m, d] = String(s).split('-').map(Number)
	if (!y || !m || !d) return null
	const at = new Date(y, m - 1, d)
	return Number.isNaN(at.getTime()) ? null : at
}
// a calendar's heading starts with its month, capitalised in every locale
const monthName = (year, month, locale) => {
	const name = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, month, 1))
	return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
}

const weekdays = locale => {
	const first = firstDayOfWeek(locale)
	const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
	// 1 February 2026 is a Sunday, so adding the weekday number lands on that weekday
	return Array.from({ length: 7 }, (unused, i) => fmt.format(new Date(2026, 1, 1 + ((first + i) % 7))))
}
const firstDayOfWeek = locale => {
	// the browser's own as Intl resolved it: a raw language tag can be one Intl.Locale refuses
	const week = new Intl.Locale(locale ?? new Intl.DateTimeFormat().resolvedOptions().locale).weekInfo
	return week ? week.firstDay % 7 : 1
}

const monthDays = (year, month, locale) => {
	const first = new Date(year, month, 1)
	const lead = (first.getDay() - firstDayOfWeek(locale) + 7) % 7
	const length = new Date(year, month + 1, 0).getDate()
	const own = Array.from({ length }, (unused, i) => ({ date: new Date(year, month, i + 1), outside: false }))
	const before = Array.from({ length: lead }, (unused, i) => ({
		date: new Date(year, month, i - lead + 1),
		outside: true
	}))
	// to a whole week, and never a ragged last row
	const trail = (7 - ((lead + length) % 7)) % 7
	const after = Array.from({ length: trail }, (unused, i) => ({
		date: new Date(year, month + 1, i + 1),
		outside: true
	}))
	return [...before, ...own, ...after]
}

const isoWeek = date => {
	const d2 = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	// to the Thursday of this ISO week
	d2.setDate(d2.getDate() + 3 - ((d2.getDay() + 6) % 7))
	const firstThursday = new Date(d2.getFullYear(), 0, 4)
	firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7))
	return 1 + Math.round((d2 - firstThursday) / (7 * 24 * 60 * 60 * 1000))
}

const sameDay = (a, b) => a && b && iso(a) === b
const addDays = (s, n) => { const d2 = parse(s); if (!d2) return s; d2.setDate(d2.getDate() + n); return iso(d2) }
const addMonths = (s, n) => { const d2 = parse(s); if (!d2) return s; d2.setMonth(d2.getMonth() + n); return iso(d2) }
const shift = (s, days) => {
	const at = parse(s)
	if (!at) return s
	return iso(new Date(at.getFullYear(), at.getMonth(), at.getDate() + days))
}
const clampDate = (s, min, max) => (min && s < min) ? min : (max && s > max) ? max : s

function useDateText({ value, onChange, min, max, unavailable, locale }) {
	const [typed, setTyped] = useState(null)
	const shown = typed ?? readable(value, locale)
	const parsedNow = typed === null || typed === '' ? null : fromReadable(typed, locale)
	const unpickable = typeof unavailable === 'function'
		? unavailable
		: Array.isArray(unavailable) ? (s => unavailable.includes(s)) : (() => false)
	const outOfRange = !!parsedNow && ((min && parsedNow < min) || (max && parsedNow > max) || unpickable(parsedNow))
	const invalid = (typed !== null && typed !== '' && parsedNow === null) || outOfRange

	const takes = parsed => !!parsed && !((min && parsed < min) || (max && parsed > max) || unpickable(parsed))

	return {
		value: shown,
		invalid,
		type: 'text',
		inputMode: 'numeric',
		autoComplete: 'off',
		// a two-digit year may be the start of a four-digit one, so it is applied only on leaving
		onChange: ev => {
			setTyped(ev.target.value)
			const parsed = fromReadable(ev.target.value, locale, { short: false })
			if (takes(parsed)) onChange?.(parsed)
		},
		onBlur: () => {
			if (takes(parsedNow) && parsedNow !== value) onChange?.(parsedNow)
			setTyped(null)
		},
		onKeyDown: ev => {
			const base = clampDate(value || iso(new Date()), min, max)
			const step = {
				ArrowUp: () => addDays(base, 1),
				ArrowDown: () => addDays(base, -1),
				PageUp: () => addMonths(base, ev.shiftKey ? 12 : 1),
				PageDown: () => addMonths(base, ev.shiftKey ? -12 : -1)
			}[ev.key]
			if (!step) return
			ev.preventDefault()
			setTyped(null)
			onChange?.(step())
		}
	}
}

function Month({
	year,
	month,
	value,
	span,
	onPick,
	focused,
	onFocusDay,
	min,
	max,
	unavailable,
	showPrevious = false,
	showNext = false,
	onMove,
	showWeeks = true,
	locale,
	...rest
}) {
	reject(rest, 'Month')
	const phrase = usePhrase()
	const grid = useRef(null)
	// which way the month last stepped, so its days slide in from that side
	const seen = useRef(year * 12 + month)
	const step = useRef(null)
	if (year * 12 + month !== seen.current) {
		step.current = year * 12 + month > seen.current ? 'next' : 'prev'
		seen.current = year * 12 + month
	}
	const days = monthDays(year, month, locale)
	const today = iso(new Date())
	const full = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

	const inSpan = s => {
		if (!span || !span[0] || !span[1]) return false
		return s >= span[0] && s <= span[1]
	}
	const chosen = (date, s) => sameDay(date, value) || !!(span && (s === span[0] || s === span[1]))
	const blocked = typeof unavailable === 'function'
		? unavailable
		: Array.isArray(unavailable) ? (s => unavailable.includes(s)) : (() => false)
	const disabled = s => (min && s < min) || (max && s > max) || blocked(s)

	// the tab stop: the day the caller is on, else the chosen one, else today if this
	// month holds it, else the first day - so a month always has exactly one
	const inThis = s => s && Number(s.slice(0, 4)) === year && Number(s.slice(5, 7)) === month + 1
	const firstOwn = days.find(d2 => !d2.outside)
	const stop = [focused, value, today].find(inThis) ?? (firstOwn ? iso(firstOwn.date) : null)

	const go = to2 => {
		const next2 = clampDate(to2, min, max)
		onFocusDay?.(next2)
		const scope = () => grid.current?.closest('.sp-range, .sp-calendar, .sp-field__wrap') ?? document
		// the day in the month that owns it, not the faded copy in its neighbour
		const find = () => scope().querySelector(`[data-day="${next2}"]:not([data-outside])`)
			?? scope().querySelector(`[data-day="${next2}"]`)
		const there = find()
		if (there) return there.focus()
		// by however many months it is away, not by one: Shift and PageUp is a year
		const at = parse(next2)
		if (!at) return
		wanted.current = find
		onMove?.((at.getFullYear() - year) * 12 + (at.getMonth() - month))
	}
	// a day in a month not drawn yet takes focus as that month is drawn
	const wanted = useRef(null)
	useLayoutEffect(() => {
		const there = wanted.current?.()
		if (!there) return
		wanted.current = null
		there.focus()
	})

	const onKeyDown = (ev, day) => {
		const by = {
			ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7
		}[ev.key]
		if (by !== undefined) { ev.preventDefault(); return go(addDays(day, by)) }
		if (ev.key === 'PageUp') { ev.preventDefault(); return go(addMonths(day, ev.shiftKey ? -12 : -1)) }
		if (ev.key === 'PageDown') { ev.preventDefault(); return go(addMonths(day, ev.shiftKey ? 12 : 1)) }
		if (ev.key === 'Home') {
			ev.preventDefault()
			const offset = ((parse(day)?.getDay() ?? 0) - firstDayOfWeek(locale) + 7) % 7
			return go(addDays(day, -offset))
		}
		if (ev.key === 'End') {
			ev.preventDefault()
			const offset = ((parse(day)?.getDay() ?? 0) - firstDayOfWeek(locale) + 7) % 7
			return go(addDays(day, 6 - offset))
		}
	}

	// rows, because a grid without them is a grid a screen reader reads as one line
	const weeks = []
	for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

	return (
		<div className={join('sp-range__month', showWeeks && 'sp-range__month--weeks')} {...rest}>
			<div className="sp-range__month-head">
				{showPrevious ? <button type="button" className="sp-range__nav" aria-label={phrase('calendar.monthBefore')} disabled={!!min && iso(new Date(year, month, 0)) < min} onClick={() => onMove?.(-1)}><Icon name="chevron-left" size={13} /></button> : null}
				{/* the month is announced when it changes, so walking into the next one is
				    not a silent jump for a screen-reader user */}
				<span aria-live="polite">{monthName(year, month, locale)}</span>
				<span className="sp-grow" />
				{showNext ? <button type="button" className="sp-range__nav" aria-label={phrase('calendar.monthAfter')} disabled={!!max && iso(new Date(year, month + 1, 1)) > max} onClick={() => onMove?.(1)}><Icon name="chevron-right" size={13} /></button> : null}
			</div>
			<div className="sp-range__weekdays" aria-hidden="true">
				{showWeeks ? <span className="sp-range__week">{phrase('calendar.weekShort')}</span> : null}
				{weekdays(locale).map((d2, i) => <span key={i}>{d2}</span>)}
			</div>
			<div className="sp-range__days" role="grid" ref={grid} key={year * 12 + month} {...(step.current ? { 'data-step': step.current } : {})}>
				{weeks.map((week, w) => (
					<div role="row" style={{ display: 'contents' }} key={w}>
						{showWeeks
							? (
								<span className="sp-range__week" role="rowheader">
									{isoWeek(week[0].date)}
								</span>
							)
							: null}
						{week.map(cell => {
							const s = iso(cell.date)
							return (
								<button
									type="button"
									role="gridcell"
									className={join('sp-range__day', cell.outside && 'sp-range__day--outside', inSpan(s) && 'sp-range__day--in')}
									data-day={s}
									{...(cell.outside ? { 'data-outside': 'true' } : {})}
									tabIndex={!cell.outside && s === stop ? 0 : -1}
									aria-label={full.format(cell.date)}
									aria-selected={chosen(cell.date, s) ? 'true' : 'false'}
									aria-current={s === today ? 'date' : undefined}
									disabled={disabled(s)}
									onClick={() => onPick?.(s)}
									onFocus={() => onFocusDay?.(s)}
									onKeyDown={ev => onKeyDown(ev, s)}
									key={s}
								>
									{cell.date.getDate()}
								</button>
							)
						})}
					</div>
				))}
			</div>
		</div>
	)
}

function standardRanges(locale) {
	const today = new Date()
	const back = (today.getDay() - firstDayOfWeek(locale) + 7) % 7
	const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back)
	const weekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back + 6)
	const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
	const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
	return [
		// a range of one day: both bounds are today, which is what "today" means
		{ label: phrase('calendar.today'), value: [iso(today), iso(today)] },
		{ label: phrase('period.thisWeek'), value: [iso(weekStart), iso(weekEnd)] },
		{ label: phrase('period.thisMonth'), value: [iso(firstOfMonth), iso(lastOfMonth)] },
		{ label: phrase('period.thisYear'), value: [`${today.getFullYear()}-01-01`, `${today.getFullYear()}-12-31`] }
	]
}

// what the typed-text hook hands an input, less its own `invalid` flag, which is no attribute
const field = ({ invalid, ...props }) => props

/** `single` is the touch sheet's form (c14): the heading, From and To, the months scrolling under them,
    the day count and Apply - the sheet itself is the way out, so there is no Cancel.
    @param {object} props
    @param {string} [props.from] The first day, as yyyy-mm-dd.
    @param {string} [props.to] The last day, as yyyy-mm-dd.
    @param {(from: string, to: string) => void} [props.onChange] Both dates, in order - the control never reports one without the other, since a range is the pair.
    @param {{ label: string, value: [string, string] }[]} [props.quick] The quick ranges beside the calendar, in place of the standard ones.
    @param {string} [props.min] The first day that can be picked, as yyyy-mm-dd.
    @param {string} [props.max] The last day that can be picked, as yyyy-mm-dd.
    @param {number} [props.minDays] The shortest range allowed, counting both ends.
    @param {(day: string) => boolean} [props.unavailable] Tells which days cannot be picked, such as weekends.
    @param {() => void} [props.onApply]
    @param {() => void} [props.onCancel] Also what Escape does.
    @param {boolean} [props.showWeeks] Number the calendar's rows with their week.
    @param {string} [props.locale] How dates are written, such as da-DK.
    @param {boolean} [props.single] The phone form: From and To at the top, the months scrolling under them, and Apply. */
export function RangePicker({ from, to, onChange, quick, min, max, minDays, unavailable, onApply, onCancel, showWeeks = true, locale, single = false, ...rest }) {
	reject(rest, 'RangePicker')
	const phrase = usePhrase()
	if (minDays !== undefined && minDays < 1) console.error('<RangePicker> minDays counts days inclusively, so the smallest range is 1')
	if (from && to && from > to) console.error('<RangePicker> from is after to: ' + from + ' → ' + to)
	for (const [name, at] of [['from', from], ['to', to]]) {
		if (!at) continue
		if (min && at < min) console.error(`<RangePicker> ${name}="${at}" is before min="${min}"`)
		if (max && at > max) console.error(`<RangePicker> ${name}="${at}" is after max="${max}"`)
		if (unavailable && unavailable(at)) console.error(`<RangePicker> ${name}="${at}" is a day this control blocks`)
	}
	if (quick && !quick.length) console.error('<RangePicker> the quick ranges are the control, not a decoration: replace them or leave them alone')
	const ranges = quick ?? standardRanges(locale)
	const ends = [parse(from), parse(to)]
	const days = ends[0] && ends[1] ? Math.round((ends[1] - ends[0]) / 86400000) + 1 : 0
	const [from2, to2] = [from, to]
	const [editing, setEditing] = useState('from')
	const [focusedDay, setFocusedDay] = useState(from2)
	// the typed fields are wired above the floor is defined, so they reach it by ref
	const floorRef = useRef((a, b) => [a, b])

	const opened = useRef([from, to])
	const revert = () => {
		const was = opened.current
		if (was && (was[0] !== from || was[1] !== to)) onChange?.(was[0], was[1])
		onCancel?.()
	}
	const apply = () => {
		opened.current = [from, to]
		onApply?.()
	}
	const fromText = useDateText({
		value: from2,
		min,
		max,
		locale,
		onChange: date => onChange?.(...floorRef.current(date, to2 && to2 >= date ? to2 : date, 'from'))
	})
	const toText = useDateText({
		value: to2,
		min,
		max,
		locale,
		onChange: date => onChange?.(...floorRef.current(from2 && date >= from2 ? from2 : date, date, 'to'))
	})
	const start = (from2 && parse(from2)) || new Date()
	const [shown, setShown] = useState({ year: start.getFullYear(), month: start.getMonth() })
	// the calendar follows the fields: a date typed into From should be on screen
	useEffect(() => {
		if (!from2) return
		const at = parse(from2)
		if (!at) return
		setShown(s => (s.year === at.getFullYear() && s.month === at.getMonth()) ? s : { year: at.getFullYear(), month: at.getMonth() })
	}, [from2])

	const floor = (a, b, anchor) => {
		if (!minDays || minDays < 2) return [a, b]
		const span = Math.round((parse(b) - parse(a)) / 86400000) + 1
		if (span >= minDays) return [a, b]
		const by = minDays - 1
		if (anchor === 'from') {
			const pushed = clampDate(shift(a, by), min, max)
			// the push hit the ceiling, so the floor is taken from the other end
			return pushed === b || Math.round((parse(pushed) - parse(a)) / 86400000) + 1 >= minDays
				? [a, pushed]
				: [clampDate(shift(pushed, -by), min, max), pushed]
		}
		const pulled = clampDate(shift(b, -by), min, max)
		return Math.round((parse(b) - parse(pulled)) / 86400000) + 1 >= minDays
			? [pulled, b]
			: [pulled, clampDate(shift(pulled, by), min, max)]
	}

	floorRef.current = floor

	const pick = date => {
		if (editing === 'from') {
			onChange?.(...floor(date, to2 && to2 >= date ? to2 : date, 'from'))
			setEditing('to')
			return
		}
		if (date < from2) return onChange?.(...floor(date, from2, 'to'))
		onChange?.(...floor(from2, date, 'to'))
		setEditing('from')
	}
	const move = by => setShown(s => {
		const at = new Date(s.year, s.month + by, 1)
		return { year: at.getFullYear(), month: at.getMonth() }
	})
	const second = new Date(shown.year, shown.month + 1, 1)
	const shared = {
		span: [from, to],
		showWeeks,
		onPick: pick,
		focused: focusedDay,
		onFocusDay: setFocusedDay,
		min,
		max,
		unavailable,
		onMove: move,
		locale
	}

	// the sheet scrolls through months up to the last day that can be picked, and opens on From's
	const fieldId = useId()
	const scroller = useRef(null)
	const last = parse(max) || new Date()
	const firstShown = new Date(Math.min(new Date(last.getFullYear(), last.getMonth() - 11, 1), start))
	const sheetMonths = []
	for (let at = new Date(firstShown.getFullYear(), firstShown.getMonth(), 1); at <= last; at = new Date(at.getFullYear(), at.getMonth() + 1, 1))
		sheetMonths.push(at)
	useLayoutEffect(() => {
		if (!single || !scroller.current) return
		const at = scroller.current.querySelector(`[data-month="${start.getFullYear()}-${start.getMonth()}"]`)
		if (at) scroller.current.scrollTop = at.offsetTop - scroller.current.offsetTop
	}, [single])

	if (single)
		return (
			<>
				<span className="sp-heading">{phrase('calendar.customRange')}</span>
				<div className="sp-row-flex sp-gap-12">
					<div className="sp-field sp-grow">
						<label className="sp-field__label" htmlFor={`${fieldId}-from`}>{phrase('calendar.from')}</label>
						<input id={`${fieldId}-from`} className="sp-input sp-number" inputMode="numeric" onFocus={() => setEditing('from')}
							{...field(fromText)} {...(fromText.invalid ? { 'aria-invalid': 'true' } : {})} />
					</div>
					<div className="sp-field sp-grow">
						<label className="sp-field__label" htmlFor={`${fieldId}-to`}>{phrase('calendar.to')}</label>
						<input id={`${fieldId}-to`} className="sp-input sp-number" inputMode="numeric" onFocus={() => setEditing('to')}
							{...field(toText)} {...(toText.invalid ? { 'aria-invalid': 'true' } : {})} />
					</div>
				</div>
				<div className="sp-calendar sp-calendar--sheet" ref={scroller}>
					{sheetMonths.map(at => (
						<div key={`${at.getFullYear()}-${at.getMonth()}`} data-month={`${at.getFullYear()}-${at.getMonth()}`}>
							<Month year={at.getFullYear()} month={at.getMonth()} {...shared} showWeeks={false} />
						</div>
					))}
				</div>
				<span className="sp-note">{phrase('calendar.daysSelected', { count: days })}</span>
				<Button size="small" onClick={apply}>{phrase('action.apply')}</Button>
			</>
		)

	return (
		<div
			className="sp-range"
			onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); revert() } }}
			{...rest}
		>
			<div className="sp-range__quick" role="group" aria-label={phrase('calendar.quickRanges')}>
				{ranges.map(q => (
					<Chip variant="pill" onClick={() => onChange?.(q.value[0], q.value[1])} key={q.label}>{q.label}</Chip>
				))}
			</div>
			<div className="sp-range__fields">
				<label className="sp-range__field">
					<span className="sp-range__label">{phrase('calendar.from')}</span>
					<input
						className="sp-range__input"
						data-editing={editing === 'from' ? 'true' : 'false'}
						onFocus={() => setEditing('from')}
						{...field(fromText)}
						{...(fromText.invalid ? { 'aria-invalid': 'true' } : {})}
					/>
				</label>
				<span className="sp-range__arrow" aria-hidden="true"><Icon name="chevron-right" /></span>
				<label className="sp-range__field">
					<span className="sp-range__label">{phrase('calendar.to')}</span>
					<input
						className="sp-range__input"
						data-editing={editing === 'to' ? 'true' : 'false'}
						onFocus={() => setEditing('to')}
						{...field(toText)}
						{...(toText.invalid ? { 'aria-invalid': 'true' } : {})}
					/>
				</label>
			</div>
			<div className="sp-range__months">
				<Month year={shown.year} month={shown.month} showPrevious {...shared} />
				<Month year={second.getFullYear()} month={second.getMonth()} showNext {...shared} />
			</div>
			{/* the foot is the control's, not the caller's: the count says what applying
			    will do, and a range picker without a way to cancel is a trap */}
			<div className="sp-range__foot">
				<span className="sp-subtitle sp-grow">{phrase('calendar.days', { count: days })}</span>
				<Button variant="text" size="small" onClick={revert}>{phrase('action.cancel')}</Button>
				<Button size="small" onClick={apply}>{phrase('action.apply')}</Button>
			</div>
		</div>
	)
}

/** On touch the range picker is a sheet over the page, not a panel under the row (c14): the one
    sheet Statistics and the order filters share. Its own scrim closes it without applying.
    @param {object} props
    @param {() => void} props.onClose
    @param {import('react').ReactNode} [props.children] The RangePicker, in a sheet over the page. */
export function RangeSheet({ onClose, children }) {
	const phrase = usePhrase()
	const box = useRef(null)
	useFocusTrap(box)
	return createPortal(
		<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
			<Sheet role="dialog" aria-modal="true" aria-label={phrase('calendar.chooseDates')} ref={box}
				onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); onClose() } }}>
				{children}
			</Sheet>
		</Scrim>,
		document.body
	)
}

const PERIODS = {
	days30: today => [new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29), today],
	week: today => {
		const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7))
		return [monday, new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)]
	},
	month: today => [
		new Date(today.getFullYear(), today.getMonth(), 1),
		new Date(today.getFullYear(), today.getMonth() + 1, 0)
	],
	quarter: today => {
		const first = Math.floor(today.getMonth() / 3) * 3
		return [new Date(today.getFullYear(), first, 1), new Date(today.getFullYear(), first + 3, 0)]
	},
	year: today => [new Date(today.getFullYear(), 0, 1), new Date(today.getFullYear(), 11, 31)]
}

const STANDARD_PERIODS = [
	{ value: 'week', label: 'period.thisWeek' },
	{ value: 'month', label: 'period.thisMonth' },
	{ value: 'quarter', label: 'period.thisQuarter' },
	{ value: 'year', label: 'period.thisYear' },
	{ value: 'custom', label: 'period.custom' }
]

// the dates as c14 writes them: day and month numbers, the year once at the end unless they differ
const numericRange = ([from, to], locale) => {
	const a = parse(from)
	const b = parse(to)
	if (!a || !b) return ''
	const full = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
	if (a.getFullYear() !== b.getFullYear()) return full.format(a) + ' - ' + full.format(b)
	return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(a) + ' - ' + full.format(b)
}

const periodNote = (preset, [from, to], today) => {
	const a = parse(from)
	const b = parse(to)
	if (!a || !b) return null
	const running = { week: 'to today', month: 'month to date', quarter: 'quarter to date', year: 'year to date' }[preset]
	if (running && from <= today && today <= to) return running
	const days = Math.round((b - a) / 86400000) + 1
	return days === 1 ? '1 day' : days + ' days'
}

const precedingDates = (preset, [from, to]) => {
	const a = parse(from)
	const b = parse(to)
	if (!a || !b) return null
	if (preset === 'year') return [iso(new Date(a.getFullYear() - 1, 0, 1)), iso(new Date(a.getFullYear() - 1, 11, 31))]
	if (preset === 'month') return [iso(new Date(a.getFullYear(), a.getMonth() - 1, 1)), iso(new Date(a.getFullYear(), a.getMonth(), 0))]
	if (preset === 'quarter') return [iso(new Date(a.getFullYear(), a.getMonth() - 3, 1)), iso(new Date(a.getFullYear(), a.getMonth(), 0))]
	const days = Math.round((b - a) / 86400000) + 1
	return [iso(new Date(a.getFullYear(), a.getMonth(), a.getDate() - days)), iso(new Date(a.getFullYear(), a.getMonth(), a.getDate() - 1))]
}

const precedingName = (preset, [from, to], locale) => {
	const a = parse(from)
	const b = parse(to)
	if (!a || !b) return null
	if (preset === 'year') return String(a.getFullYear() - 1)
	if (preset === 'month') {
		const before = new Date(a.getFullYear(), a.getMonth() - 1, 1)
		const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(before)
		// the year is worth saying only when it is a different one
		return before.getFullYear() === a.getFullYear() ? month : month + ' ' + before.getFullYear()
	}
	if (preset === 'quarter') return phrase('period.previousQuarter')
	if (preset === 'week') return phrase('period.previousWeek')
	return phrase('period.previousDays', { count: Math.round((b - a) / 86400000) + 1 })
}

export function Selected() { return null }

/** The stepper inside the period control (c14): one box, an arrow either side of the window's
    name. An arrow with no handler is disabled, never hidden, so the box keeps its width. */
const WINDOW = { week: 'week', month: 'month', quarter: 'quarter', year: 'year', days30: 'days30' }

/** @param {object} props
    @param {string} props.label The window's name, such as August 2026.
    @param {keyof typeof WINDOW} [props.unit] How long the window is: `week`, `month`, `quarter`, `year` or `days30`. It sets the label's width.
    @param {string} [props.previousLabel] The name of the left arrow.
    @param {string} [props.nextLabel] The name of the right arrow.
    @param {() => void} [props.onPrevious]
    @param {() => void} [props.onNext]
    @param {boolean} [props.touch] The larger arrows for touch. */
export function PeriodWindow({ label, unit = 'month', previousLabel, nextLabel, onPrevious, onNext, touch = false, ...rest }) {
	reject(rest, 'PeriodWindow')
	const phrase = usePhrase()
	const size = touch ? 15 : 14
	const previous = useRef(null)
	const next = useRef(null)
	// the arrow that had focus when it ran out of windows hands focus to the other one
	const held = useRef(null)
	useLayoutEffect(() => {
		const lost = document.activeElement === document.body || document.activeElement?.disabled
		if (!lost) return
		if (held.current === 'previous' && !onPrevious && onNext) next.current?.focus()
		if (held.current === 'next' && !onNext && onPrevious) previous.current?.focus()
	}, [onPrevious, onNext])
	const track = which => ({ onFocus: () => { held.current = which }, onBlur: ev => { if (ev.relatedTarget) held.current = null } })
	return (
		<div className="sp-window" {...rest}>
			<button type="button" className="sp-window__btn" aria-label={previousLabel ?? phrase('period.previousWindow')} disabled={!onPrevious} onClick={onPrevious} ref={previous} {...track('previous')}>
				<Icon name="chevron-left" size={size} />
			</button>
			<span className="sp-window__label" data-w={pick(WINDOW, unit, 'unit', 'PeriodWindow')}>{label}</span>
			<button type="button" className="sp-window__btn" aria-label={nextLabel ?? phrase('period.nextWindow')} disabled={!onNext} onClick={onNext} ref={next} {...track('next')}>
				<Icon name="chevron-right" size={size} />
			</button>
		</div>
	)
}

/* `at` is the day the presets resolve around (today when absent), `stepper` moves it, `onPresent`
   steps back to the window holding today (c14); `extra` follows the comparison, as a second
   switch (4a); `actions` end the row (4a). */
/** @param {object} props
    @param {{ value: string, label: string }[]} [props.presets] The periods to choose from, in place of the standard five.
    @param {string} props.value The chosen period, or `custom`.
    @param {(period: { period: string, selected: { from: string, to: string } | null, past: { from: string, to: string, name: string } | null }) => void} [props.onChange] Called when the preset changes, with the same object a Selected child is handed.
    @param {string} [props.from] The custom range's first day.
    @param {string} [props.to] The custom range's last day.
    @param {string} [props.at] The day the periods are counted from, as yyyy-mm-dd. Today when left out.
    @param {import('react').ReactNode} [props.stepper] The PeriodWindow that moves the period back and forward.
    @param {string} [props.name] Groups the radios.
    @param {import('react').ReactNode} [props.custom] The RangePicker, shown when the custom period is chosen.
    @param {() => void} [props.onPresent]
    @param {import('react').ReactNode} [props.extra] A second switch after the comparison.
    @param {import('react').ReactNode} [props.actions] Buttons at the end of the row.
    @param {import('react').ReactNode} [props.children] One Selected, which draws what the chosen period is.
    @param {string} [props.locale] How dates are written, such as da-DK. */
export function PeriodPicker({ presets, value, onChange, from, to, at, stepper, name, custom, onPresent, extra, actions, children, locale, ...rest }) {
	reject(rest, 'PeriodPicker', ['note', 'compareLabel', 'compare', 'defaultCompare', 'onCompareChange'])
	const phrase = usePhrase()
	// the child is read, not rendered: what it holds is a function of values this
	// component derives, so it cannot be resolved until they exist
	let picked
	for (const child of [].concat(children ?? []).flat()) {
		if (!child || typeof child !== 'object') continue
		if (child.type === Selected) {
			picked = child.props.children
			// every other do-nothing call in this library says so, and an empty slot is
			// one: the bar draws no comparison area and a reader is left wondering why
			if (picked === undefined) console.error('<Selected> holds what the comparison area draws, so an empty one draws nothing')
		}
		else console.error('<PeriodPicker> takes a Selected and nothing else')
	}
	const list = presets ?? STANDARD_PERIODS.map(p => ({ ...p, label: phrase(p.label) }))
	const today = new Date()
	const box = useRef(null)
	// Back to the present goes away under the reader, so focus moves to the stepper's live arrow
	const back = useRef(false)
	const dates = value === 'custom'
		? [from, to]
		: PERIODS[value] && PERIODS[value]((at && parse(at)) || today).map(iso)
	const shapeOf = (preset, span) => {
		const before = span && precedingDates(preset, span)
		return {
			period: preset,
			selected: span ? { from: span[0], to: span[1] } : null,
			past: before ? { from: before[0], to: before[1], name: precedingName(preset, span, locale) } : null
		}
	}
	const now = iso(today)
	const current = !!dates && value !== 'custom' && dates[0] <= now && now <= dates[1]
	// the window still running reads to today, never into days that have not happened
	const resolved = dates ? numericRange(current ? [dates[0], now] : dates, locale) : null
	const note = dates ? periodNote(value, dates, now) : null
	const returns = value !== 'custom' && !!onPresent && !!PERIODS[value]
	const away = !!dates && returns && !current
	useLayoutEffect(() => {
		if (away || !back.current) return
		back.current = false
		;(box.current?.querySelector('.sp-window__btn:not(:disabled)') ?? box.current?.querySelector('.sp-period__preset input:checked'))?.focus()
	}, [away])
	const offers = dates && picked
	const against = offers
		? { name: precedingName(value, dates, locale), dates: precedingDates(value, dates) }
		: null
	const last = list[list.length - 1]
	const withCustom = custom && last
	const before = withCustom ? list.slice(0, -1) : list

	// the window size's green is drawn once and moves to the one picked; Custom's range fades in and out
	const marker = useId()
	const anchor = useRef(null)
	const range = useRef({ get current() { return anchor.current?.querySelector(':scope > .sp-period__custom') ?? null } }).current
	const closing = usePanelMotion(range, value === 'custom')
	const preset = p => (
		<label className="sp-period__preset" data-label={p.label} key={p.value}>
			{value === p.value ? <m.span className="sp-marker" layoutId={marker} transition={glide()} aria-hidden="true" /> : null}
			<input
				type="radio"
				name={name}
				value={p.value}
				checked={value === p.value}
				onChange={() => {
					const next = p.value === 'custom' ? [from, to] : PERIODS[p.value] && PERIODS[p.value](today).map(iso)
					onChange?.(shapeOf(p.value, next))
				}}
			/>
			<span className="sp-label">{p.label}</span>
		</label>
	)

	return (
		<div className="sp-period" ref={box} {...rest}>
			<div className="sp-period__presets" role="group" aria-label={phrase('period.windowSize')}>
				{before.map(preset)}
				{withCustom
					? (
						<div className="sp-period__anchor" ref={anchor} {...(closing ? { 'data-closing': 'true' } : {})}>
							{preset(last)}
							<div className="sp-period__custom">{custom}</div>
						</div>
					)
					: null}
			</div>
			{stepper}
			{resolved ? <span className="sp-period__resolved">{resolved}</span> : null}
			{against && picked
				? <span className="sp-period__compare">{typeof picked === 'function' ? picked(shapeOf(value, dates)) : picked}</span>
				: null}
			{extra}
			{/* stepped away from the present, the word becomes the one press back to it (c14) */}
			{away
				? (
					<Button variant="text" size="small" onClick={() => { back.current = true; onPresent() }}>
						{phrase('period.backToPresent', { window: value })}
					</Button>
				)
				: note ? <span className="sp-period__note">{note}</span> : null}
			{actions ? <><span className="sp-grow" />{actions}</> : null}
		</div>
	)
}

/** @param {object} props
    @param {boolean} [props.sheet] The phone form, in a sheet.
    @param {boolean} [props.open] Whether the calendar is showing.
    @param {import('react').ReactNode} [props.children] The months. */
export function Calendar({ sheet = false, open = true, children, ...rest }) {
	reject(rest, 'Calendar')
	return (
		<div className={join('sp-calendar', sheet && 'sp-calendar--sheet')} data-open={open ? 'true' : 'false'} {...rest}>
			{children}
		</div>
	)
}

/** The date as the reader writes it. Their own order and separator, from the
    locale - not a format this file decides. */
function readable(value, locale) {
	if (!value) return ''
	return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parse(value))
}

const LETTERS = { day: 'calendar.letters.day', month: 'calendar.letters.month', year: 'calendar.letters.year' }

/** How the reader writes a date, as an empty field shows it: their locale's order and separator
    ("dd.mm.yyyy", "mm/dd/yyyy"). */
export function datePattern(locale) {
	return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
		.formatToParts(new Date(2026, 10, 22))
		.map(p => (LETTERS[p.type] ? phrase(LETTERS[p.type]) : p.value))
		.join('')
}

/** What they typed, back to an ISO date. The locale says which number is the day; a two-digit
    year is this century's, and any other short year is no date at all. */
function fromReadable(text, locale, { short = true } = {}) {
	const parts = String(text).split(/[^\d]+/).filter(Boolean)
	if (parts.length < 3) return null
	const order = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
		.formatToParts(new Date(2026, 10, 22))
		.filter(p => p.type !== 'literal')
		.map(p => p.type)
	const got = {}
	order.forEach((type, i) => { got[type] = parts[i] })
	if (!got.year || !got.month || !got.day) return null
	const year = got.year.length === 4 ? Number(got.year) : got.year.length === 2 && short ? 2000 + Number(got.year) : null
	const month = Number(got.month)
	const day = Number(got.day)
	if (!year || !month || !day || month > 12 || day > new Date(year, month, 0).getDate()) return null
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** The one-click days a single date offers (Input types: DateField): Today and Yesterday, each a
    day the field can take; a month is not a date, so it is no shortcut here. */
function dayShortcuts({ min, max, unavailable }) {
	const now = new Date()
	const today = iso(now)
	const yesterday = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
	const takes = s => !(min && s < min) && !(max && s > max) && !(typeof unavailable === 'function' && unavailable(s))
	return [
		takes(today) ? { label: phrase('calendar.today'), pick: today } : null,
		takes(yesterday) ? { label: phrase('calendar.yesterday'), pick: yesterday } : null
	].filter(Boolean)
}

/** `placeholder` is what the empty field says, as an open end reads Today (c12).
    @param {object} props
    @param {string} [props.value] The day, as yyyy-mm-dd.
    @param {(value: string) => void} [props.onChange]
    @param {string} [props.min] The first day that can be picked.
    @param {string} [props.max] The last day that can be picked.
    @param {(day: string) => boolean} [props.unavailable] Tells which days cannot be picked.
    @param {boolean} [props.native] Use the phone's own date field. On a phone when left out.
    @param {boolean} [props.danger] The date is wrong: the field is drawn in red.
    @param {boolean} [props.showWeeks] Number the calendar's rows with their week.
    @param {boolean} [props.shortcuts] Offer Today and Yesterday as one-click chips in the calendar.
    @param {string} [props.locale] How dates are written, such as da-DK. The browser's when left out.
    @param {string} [props.id] Bound by the Field around it.
    @param {string} [props.placeholder] What the empty field says, such as Today.
    @param {boolean} [props.fullWidth] Take all the room the control is given: the width of its column, or what is left in its row. Inside a Field, set it on the Field. */
export function DateField({ value, onChange, min, max, unavailable, native, danger = false, showWeeks = true, shortcuts = true, locale, id, placeholder, fullWidth = false, ...rest }) {
	reject(rest, 'DateField')
	const phrase = usePhrase()
	// what Field hands the control: its message and its state, on the input that takes focus
	const { 'aria-describedby': message, 'aria-invalid': invalid, required, lead, trail, unit, ...unused } = rest
	const marked = danger || invalid === true || invalid === 'true'
	// the same reporting the range does, and for the same reason: a value the reader
	// could not have picked is the page's to fix, not this control's to overwrite
	if (value) {
		if (min && value < min) console.error(`<DateField> value="${value}" is before min="${min}"`)
		if (max && value > max) console.error(`<DateField> value="${value}" is after max="${max}"`)
		if (unavailable && unavailable(value)) console.error(`<DateField> value="${value}" is a day this control blocks`)
	}
	const wrap = useRef(null)
	const trigger = useRef(null)
	const [touch, setTouch] = useState(false)
	const [open, setOpen] = useState(false)
	const [focusedDay, setFocusedDay] = useState(value)
	// every hook runs on both branches: the native one returns early, and a hook
	// called after that return is a hook React never sees on touch
	const text = useDateText({ value, onChange, min, max, unavailable, locale })

	useEffect(() => {
		if (native !== undefined) return
		setTouch(!!wrap.current?.closest('.sp-touch'))
	}, [native])

	const isNative = native ?? touch
	if (isNative && unavailable) console.error('<DateField> a native picker cannot refuse single days: pass native={false} where unavailable matters')
	const day = (value && parse(value)) || new Date()
	const [shown, setShown] = useState({ year: day.getFullYear(), month: day.getMonth() })
	const move = by => setShown(s => {
		const at = new Date(s.year, s.month + by, 1)
		return { year: at.getFullYear(), month: at.getMonth() }
	})

	const close = ({ toTrigger } = {}) => {
		setOpen(false)
		if (toTrigger) trigger.current?.querySelector('button')?.focus()
	}

	// clicking away closes it: a panel that stays open behind the reader's next
	// click is a panel they have to dismiss twice
	useEffect(() => {
		if (!open) return
		const away = ev => { if (!wrap.current?.contains(ev.target)) setOpen(false) }
		document.addEventListener('pointerdown', away)
		return () => document.removeEventListener('pointerdown', away)
	}, [open])
	// the calendar fades out as it closes: the field keeps it drawn until then
	const calendar = useRef({ get current() { return wrap.current?.querySelector(':scope > .sp-calendar') ?? null } }).current
	const closing = usePanelMotion(calendar, !isNative && open)
	// the calendar opened by openTo hands focus to its day as it is drawn; above the native
	// return, like every hook here
	const opening = useRef(false)
	useLayoutEffect(() => {
		if (!open || !opening.current) return
		opening.current = false
		wrap.current?.querySelector('.sp-range__day[tabindex="0"]')?.focus()
	}, [open])

	// the trail opens the same platform picker the field does, drawn with the register's calendar
	const pickNative = () => {
		const input = wrap.current?.querySelector('input')
		try { input?.showPicker() } catch { input?.focus() }
	}
	if (isNative)
		return (
			<span className={join('sp-field__wrap', fullWidth && 'sp-grow')} ref={wrap}>
				<input
					id={id}
					type="date"
					className="sp-input"
					value={value}
					min={min}
					max={max}
					onChange={ev => onChange?.(ev.target.value)}
					aria-describedby={message}
					required={required}
					{...(marked ? { 'aria-invalid': 'true' } : {})}
					{...unused}
				/>
				<button type="button" className="sp-field__trail" aria-label={phrase('calendar.open')} onClick={pickNative}>
					<Icon name="calendar" size={15} />
				</button>
			</span>
		)

	const hintId = id ? `${id}-format` : undefined
	const openTo = date => {
		setFocusedDay(date || iso(new Date()))
		const at = parse(date || iso(new Date()))
		setShown({ year: at.getFullYear(), month: at.getMonth() })
		setOpen(true)
		opening.current = true
	}

	return (
		<span
			className={join('sp-field__wrap', fullWidth && 'sp-grow')}
			ref={wrap}
			data-open={open ? 'true' : 'false'}
			{...(closing ? { 'data-closing': 'true' } : {})}
			onKeyDown={ev => { if (ev.key === 'Escape' && open) { ev.stopPropagation(); close({ toTrigger: true }) } }}
			// tabbing out closes it; a focused day that leaves the page names no new target
			onBlur={ev => { if (open && ev.relatedTarget && !wrap.current?.contains(ev.relatedTarget)) setOpen(false) }}
		>
			<input
				id={id}
				className="sp-input sp-input--trail sp-number"
				aria-describedby={[message, hintId].filter(Boolean).join(' ') || undefined}
				required={required}
				placeholder={placeholder ?? datePattern(locale)}
				{...field(text)}
				{...(marked || text.invalid ? { 'aria-invalid': 'true' } : {})}
				{...unused}
				onKeyDown={ev => {
					// the panel opens on the key that opens every other panel in the system
					if (ev.key === 'ArrowDown' && ev.altKey && !open) { ev.preventDefault(); return openTo(value) }
					text.onKeyDown(ev)
				}}
			/>
			{hintId ? <span id={hintId} hidden>{phrase('calendar.example', { date: readable(iso(new Date(2026, 10, 22)), locale) })}</span> : null}
			<span className="sp-field__trail" ref={trigger}>
				<IconButton
					icon={<Icon name="calendar" size={15} />}
					aria-label={phrase('calendar.pickDate')}
					size="field"
					aria-haspopup="dialog"
					aria-expanded={open ? 'true' : 'false'}
					onClick={() => (open ? close({ toTrigger: true }) : openTo(value))}
				/>
			</span>
			<div className="sp-calendar" role="dialog" aria-label={phrase('calendar.chooseDate')}>
				{shortcuts
					? (
						<div className="sp-range__quick" role="group" aria-label={phrase('calendar.quickDays')}>
							{dayShortcuts({ min, max, unavailable }).map(q => (
								<Chip key={q.label}
									onClick={() => { onChange?.(q.pick); close({ toTrigger: true }) }}>{q.label}</Chip>
							))}
						</div>
					)
					: null}
				<Month
					year={shown.year}
					month={shown.month}
					value={value}
					focused={focusedDay}
					onFocusDay={setFocusedDay}
					showWeeks={showWeeks}
					min={min}
					max={max}
					unavailable={unavailable}
					onPick={date => { onChange?.(date); close({ toTrigger: true }) }}
					showPrevious
					showNext
					onMove={move}
					locale={locale}
				/>
			</div>
		</span>
	)
}

