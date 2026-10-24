import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon.jsx'
import { IconButton } from './Button.jsx'
import { join, reject } from './variants.js'

/* The date controls.

   A date is drawn on desktop and native on touch, and that is one component rather
   than two: on a phone the platform's own picker is better than anything drawn - a
   full-screen wheel, the reader's format, the keyboard they expect - and on a
   desktop it is a small dark dropdown nobody can style, so the field opens this
   calendar instead. DateField switches on the surface it is in; it does not ask the
   caller to know.

   A range is always drawn: it needs two dates chosen against each other, the days
   between them shown as a span, and the presets nobody wants to click twelve times.

   One month grid, used twice. A Calendar is a month; RangePicker is two of them
   side by side with the fields and presets around them; the phone's Calendar is the
   same month at touch size in a sheet. Nothing here draws a second grid.

   Dates are ISO strings on the way in and out - `2026-08-12` - and formatting for
   the reader happens where it is read. A component that took Date objects would be
   a component that disagrees with the draft about time zones. */

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/* A value that is not a date returns null rather than an Invalid Date. Anything
   downstream then has one thing to check, instead of every formatter throwing on a
   date it cannot read - a field handed a bad value should draw itself empty, never
   take the page down with it. */
const parse = s => {
	const [y, m, d] = String(s).split('-').map(Number)
	if (!y || !m || !d) return null
	const at = new Date(y, m - 1, d)
	return Number.isNaN(at.getTime()) ? null : at
}
const monthName = (year, month, locale) =>
	new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, month, 1))

/** The weekday initials in the reader's own order - a week starts on Monday in most
    of Europe and on Sunday in the US, and the calendar has to agree with the
    reader's own sense of where a week begins. */
const weekdays = locale => {
	const first = firstDayOfWeek(locale)
	const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
	// 1 February 2026 is a Sunday, so adding the weekday number lands on that weekday
	return Array.from({ length: 7 }, (unused, i) => fmt.format(new Date(2026, 1, 1 + ((first + i) % 7))))
}
const firstDayOfWeek = locale => {
	const week = new Intl.Locale(locale ?? navigator.language).weekInfo
	return week ? week.firstDay % 7 : 1
}

/* The days of a month, and the days either side of it that share its first and last
   weeks. Those are real days, not padding: a reader looking at the start of August
   sees the 31st of July where the 31st of July belongs, and can pick it. They are
   drawn faded, and they never hold the tab stop - the month's own days do that. */
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

/* The ISO week a day falls in: the week containing that week's Thursday, counted
   from the year's first such week. It is the number on the reader's own invoices
   and delivery notes, so it is theirs rather than a count of Sundays - and it is
   independent of where the locale starts a week. */
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
/* A date moved by a whole number of days, still as an ISO string. Built from the
   date's own parts so a daylight-saving boundary cannot shift it by an hour and land
   it on the previous day. */
const shift = (s, days) => {
	const at = parse(s)
	if (!at) return s
	return iso(new Date(at.getFullYear(), at.getMonth(), at.getDate() + days))
}
const clampDate = (s, min, max) => (min && s < min) ? min : (max && s > max) ? max : s

/* Typing a date, once, for every field that takes one.

   A date field is not a text box that happens to hold a date: Up and Down step it
   by a day, PageUp and PageDown by a month, with Shift a year, and what cannot be
   read as a date marks itself rather than silently keeping the old value. The date
   field on a desktop and the two fields of a range picker all take this, so a
   reader never meets two date formats or two sets of keys in one product.

   The text being typed is held here and the value is not touched until it parses -
   a half-written date is not a date. */
function useDateText({ value, onChange, min, max, unavailable, locale }) {
	const [typed, setTyped] = useState(null)
	const shown = typed ?? readable(value, locale)
	/* Out of range counts as invalid, and typing it does not commit. The calendar
	   disables those days and the native field refuses them, so a typed date that
	   slipped past both was the one way round the bounds. It is not clamped: moving
	   what someone typed to a different date is worse than telling them. */
	const parsedNow = typed === null || typed === '' ? null : fromReadable(typed, locale)
	const unpickable = typeof unavailable === 'function'
		? unavailable
		: Array.isArray(unavailable) ? (s => unavailable.includes(s)) : (() => false)
	const outOfRange = !!parsedNow && ((min && parsedNow < min) || (max && parsedNow > max) || unpickable(parsedNow))
	const invalid = (typed !== null && typed !== '' && parsedNow === null) || outOfRange

	return {
		value: shown,
		invalid,
		type: 'text',
		inputMode: 'numeric',
		autoComplete: 'off',
		onChange: ev => {
			setTyped(ev.target.value)
			const parsed = fromReadable(ev.target.value, locale)
			if (parsed && !((min && parsed < min) || (max && parsed > max) || unpickable(parsed))) onChange?.(parsed)
		},
		onBlur: () => setTyped(null),
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

/**
 * One month, as a grid of days. Internal: the two controls that show a calendar
 * live in this file and share it, and a page reaches for DateField or RangePicker.
 *
 * It is a real grid: rows of gridcells, one day in the tab order at a time, and the
 * arrow keys move between days rather than between buttons. That is what a date
 * picker is expected to do - a reader who tabs through 31 buttons to reach the 31st
 * has been given a list, not a calendar.
 *
 * Every day carries its full date as its label, because "14" read on its own tells
 * a screen-reader user nothing. Today is marked with aria-current, the chosen day
 * with aria-selected, and a day outside min or max is disabled rather than hidden -
 * a missing day reads as a hole in the month.
 *
 * @param {object} props
 * @param {number} props.year
 * @param {number} props.month Zero-based, as the platform counts them.
 * @param {string} [props.value] The chosen date.
 * @param {[string, string]} [props.span] The range the days sit inside.
 * @param {(date: string) => void} props.onPick
 * @param {string} [props.focused] The day holding the tab stop. The caller owns it,
 *   so two months side by side share one.
 * @param {(date: string) => void} [props.onFocusDay]
 * @param {string} [props.min] An ISO date.
 * @param {string} [props.max]
 * @param {number} [props.minDays] The shortest range that means anything - a hire of
 *   at least two days, a period that has to cover a week. Counted inclusively, so 2
 *   is a day and the day after it.
 *
 *   The end the reader did not just touch is what moves. Picking a start too close to
 *   the end pushes the end out; picking an end too close to the start pulls the start
 *   back. The alternative is refusing the click, which leaves the reader holding a
 *   range they cannot fix without working out which end the control objects to.
 *   Where the push would cross min or max it is taken from the other end instead, so
 *   the floor holds even at the edge of what can be picked.
 * @param {string[]|((date: string) => boolean)} [props.unavailable] Days that cannot
 *   be picked inside the range that can - a list of ISO dates, or a test for one, so
 *   a rule (every weekend, the days already booked) does not have to be written out.
 *   They are disabled where min and max are also disabled: a day the reader can see
 *   and cannot choose, rather than a hole in the month.
 * @param {boolean} [props.showPrevious] Offer the step to the month before.
 * @param {boolean} [props.showNext]
 * @param {(by: number) => void} [props.onMove]
 * @param {boolean} [props.showWeeks] Number each row with its ISO week, under a W at
 *   the column's head. On by default: the number is what the reader's own invoices
 *   and delivery notes use, so a month that hides it makes them count.
 * @param {string} [props.locale]
 *
 * Takes no `className` and no `style`.
 */
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
	const grid = useRef(null)
	const days = monthDays(year, month, locale)
	const today = iso(new Date())
	const full = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

	const inSpan = s => {
		if (!span || !span[0] || !span[1]) return false
		return s >= span[0] && s <= span[1]
	}
	/* A day is chosen if it is the single date, or either end of a range - the ends
	   are chosen days, and without this they read as indistinguishable from the
	   fourteen tinted days between them. */
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
		/* The day walked to may be in a month this grid does not show but its
		   neighbour does - a range picker shows two - so the day is looked for across
		   the whole picker, and the months are only moved when it is nowhere. */
		const scope = () => grid.current?.closest('.sp-range, .sp-calendar, .sp-field__wrap') ?? document
		// the day in the month that owns it, not the faded copy in its neighbour
		const find = () => scope().querySelector(`[data-day="${next2}"]:not([data-outside])`)
			?? scope().querySelector(`[data-day="${next2}"]`)
		requestAnimationFrame(() => {
			const there = find()
			if (there) return there.focus()
			// by however many months it is away, not by one: Shift and PageUp is a year
			const at = parse(next2)
			if (!at) return
			onMove?.((at.getFullYear() - year) * 12 + (at.getMonth() - month))
			requestAnimationFrame(() => find()?.focus())
		})
	}

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
				{/* Past the bounds there is nothing to see, so the step is disabled rather
				    than walking the reader into a month of greyed-out days. A month is
				    reachable while any of its days is: the comparison is against the
				    month's own last and first day, not against the day in view. */}
				{showPrevious ? <button type="button" className="sp-range__nav" aria-label="The month before" disabled={!!min && iso(new Date(year, month, 0)) < min} onClick={() => onMove?.(-1)}><Icon name="chevron-left" /></button> : null}
				{/* the month is announced when it changes, so walking into the next one is
				    not a silent jump for a screen-reader user */}
				<span aria-live="polite">{monthName(year, month, locale)}</span>
				<span className="sp-grow" />
				{showNext ? <button type="button" className="sp-range__nav" aria-label="The month after" disabled={!!max && iso(new Date(year, month + 1, 1)) > max} onClick={() => onMove?.(1)}><Icon name="chevron-right" /></button> : null}
			</div>
			<div className="sp-range__weekdays" aria-hidden="true">
				{showWeeks ? <span className="sp-range__week">W</span> : null}
				{weekdays(locale).map((d2, i) => <span key={i}>{d2}</span>)}
			</div>
			<div className="sp-range__days" role="grid" ref={grid}>
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

/* The ranges worth one click, from today. They are the control's own offer rather
   than a caller's list, so every range picker in the product offers the same three -
   a panel that dropped them was offering less for no stated reason.

   They run shortest first, which is the order a reader narrows in: today, this week,
   this month, this year. The week starts where the reader's own locale starts it,
   not on a Monday this file decided. */
function standardRanges(locale) {
	const today = new Date()
	const back = (today.getDay() - firstDayOfWeek(locale) + 7) % 7
	const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back)
	const weekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back + 6)
	const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
	const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
	return [
		// a range of one day: both bounds are today, which is what "today" means
		{ label: 'Today', value: [iso(today), iso(today)] },
		{ label: 'This week', value: [iso(weekStart), iso(weekEnd)] },
		{ label: 'This month', value: [iso(firstOfMonth), iso(lastOfMonth)] },
		{ label: 'This year', value: [`${today.getFullYear()}-01-01`, `${today.getFullYear()}-12-31`] }
	]
}

/**
 * Two dates chosen against each other. Two months side by side, the quick ranges
 * above them, and the two dates as fields - because a reader who knows the dates
 * should not have to click for them.
 *
 * The next click sets whichever end the reader is editing, and after picking a
 * start it is the end - so the common case is two clicks with nothing to aim at.
 *
 * The two fields read and accept the reader's own format - the same one the date
 * field uses - while the value stays a pair of ISO dates. A field showing
 * 2026-08-03 is showing storage, not a date.
 *
 * The keyboard: the two grids share one tab stop, so Tab reaches the calendar once
 * and the arrow keys walk the whole range - a day at a time, a week with the up and
 * down keys, a month with PageUp and PageDown, a year with Shift. Walking off the
 * end of the shown months moves them. Enter picks the end being edited. Every day
 * carries its full date for a screen reader, today is marked, and a day outside
 * `min` or `max` is disabled rather than missing.
 *
 *
 *
 *   The end the reader did not just touch is what moves. Picking a start too close to
 *   the end pushes the end out; picking an end too close to the start pulls the start
 *   back. The alternative is refusing the click, which leaves the reader holding a
 *   range they cannot fix without working out which end the control objects to.
 *   Where the push would cross min or max it is taken from the other end instead, so
 *   the floor holds even at the edge of what can be picked.
 *
 * @param {object} props
 * @param {string} props.from The first date, as an ISO string.
 * @param {string} props.to The last date. Two props rather than a pair: a third date cannot be expressed, so there is nothing to guard against - a pair had to be checked for length and for order, and a wrong one still rendered.
 * @param {(from: string, to: string) => void} props.onChange Both dates, in order - the control never reports one without the other, since a range is the pair. The glyphs are the component's own, from the register: a month-back arrow is never anything but a chevron, so passing them was a decision that was not one. Nor are the quick ranges, the day count or the pair of actions a caller's to leave out, which is how one call site ended up offering less than another.
 * @param {{ label: string, value: [string, string] }[]} [props.quick] To replace the standard ranges, not to remove them - an empty array is reported.
 * @param {string} [props.min] An ISO date.
 * @param {string} [props.max]
 * @param {number} [props.minDays] The shortest range that means anything - a hire of at least two days, a period that has to cover a week. Counted inclusively, so 2 is a day and the day after it.
 * @param {(day: string) => boolean} [props.unavailable]
 * @param {() => void} props.onApply
 * @param {() => void} props.onCancel Also what Escape does.
 * @param {boolean} [props.showWeeks] Number the rows with their ISO week.
 * @param {string} [props.locale] Takes no `className` and no `style`.
 */
export function RangePicker({ from, to, onChange, quick, min, max, minDays, unavailable, onApply, onCancel, showWeeks = true, locale, ...rest }) {
	reject(rest, 'RangePicker')
	if (minDays !== undefined && minDays < 1) console.error('<RangePicker> minDays counts days inclusively, so the smallest range is 1')
	// Two props rather than a pair: a third date cannot be expressed, so there is
	// nothing to guard against. A pair had to be checked for length and for order,
	// and a wrong one still rendered.
	if (from && to && from > to) console.error('<RangePicker> from is after to: ' + from + ' → ' + to)
	/* A value the control would refuse if the reader picked it. Reported, never
	   clamped: the control is controlled, so moving the value silently would leave
	   the page's state and what it draws disagreeing - and the page is the one that
	   has to fix it. */
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

	/* Cancel has to put the range back, and the picker is controlled - so it remembers
	   the range it was opened with and reverts to that itself. Every caller would
	   otherwise need the same undo, and the one that forgot would have a Cancel that
	   only closed the panel.
   onCancel is not an alternative to that - it is the dismissal. The picker cannot
	   close the popover it sits in, so the page is told the reader cancelled and closes
	   it. Both run: revert, then tell. Making the handler win instead would give any
	   page that closes a popover a Cancel that closes but keeps the change.
	   Applying makes the current range the one a later cancel reverts to. */
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

	/* The floor, applied by moving the end the reader did not just touch. `anchor`
	   says which end is fixed: picking a start anchors the start and pushes the end
	   out, picking an end anchors the end and pulls the start back. */
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

	return (
		<div
			className="sp-range"
			onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); revert() } }}
			{...rest}
		>
			<div className="sp-range__quick" role="group" aria-label="Ranges worth one click">
				{ranges.map(q => (
					<Chip variant="pill" onClick={() => onChange?.(q.value[0], q.value[1])} key={q.label}>{q.label}</Chip>
				))}
			</div>
			<div className="sp-range__fields">
				<label className="sp-range__field">
					<span className="sp-range__label">From</span>
					<input
						className="sp-range__input"
						data-editing={editing === 'from' ? 'true' : 'false'}
						onFocus={() => setEditing('from')}
						{...fromText}
						{...(fromText.invalid ? { 'aria-invalid': 'true' } : {})}
					/>
				</label>
				<span className="sp-range__arrow" aria-hidden="true"><Icon name="chevron-right" /></span>
				<label className="sp-range__field">
					<span className="sp-range__label">To</span>
					<input
						className="sp-range__input"
						data-editing={editing === 'to' ? 'true' : 'false'}
						onFocus={() => setEditing('to')}
						{...toText}
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
				<span className="sp-subtitle sp-grow">{days === 1 ? '1 day' : `${days} days`}</span>
				<Button variant="text" size="small" onClick={revert}>Cancel</Button>
				<Button size="small" onClick={apply}>Apply</Button>
			</div>
		</div>
	)
}

/* What each period comes to, in dates. The component resolves this rather than
   taking it as a prop: it knows what "this month" means, and a caller passing the
   line by hand is a caller whose line stops matching the moment the preset changes -
   which is exactly what happened. */
const PERIODS = {
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
	{ value: 'week', label: 'This week' },
	{ value: 'month', label: 'This month' },
	{ value: 'quarter', label: 'This quarter' },
	{ value: 'year', label: 'This year' },
	{ value: 'custom', label: 'Custom' }
]

/* The range as a line of prose: the parts both ends share are said once, so a
   period inside one month reads "1 - 31 August 2026" rather than repeating the
   month and the year on both sides of the dash. */
const readableRange = ([from, to], locale) => {
	const a = typeof from === 'string' ? parse(from) : from
	const b = typeof to === 'string' ? parse(to) : to
	if (!a || !b) return ''
	const sameYear = a.getFullYear() === b.getFullYear()
	const sameMonth = sameYear && a.getMonth() === b.getMonth()
	const day = new Intl.DateTimeFormat(locale, { day: 'numeric' })
	const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' })
	const full = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' })
	if (sameMonth) return day.format(a) + ' - ' + full.format(b)
	if (sameYear) return dayMonth.format(a) + ' - ' + full.format(b)
	return full.format(a) + ' - ' + full.format(b)
}

/* What the bar says about the chosen period, beside the dates themselves. Derived
   for the same reason the dates are: a period that has not finished shows only what
   has happened so far, and a caller writing "year to date" by hand has a line that
   stops being true the moment the preset changes. */
const periodNote = (preset, [from, to]) => {
	const a = parse(from)
	const b = parse(to)
	if (!a || !b) return null
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const unit = { week: 'week', month: 'month', quarter: 'quarter', year: 'year' }[preset]
	if (unit && b > today && a <= today) return unit + ' to date'
	const days = Math.round((b - a) / 86400000) + 1
	return days === 1 ? '1 day' : days + ' days'
}

/* The period before this one, in dates: equal length, ending the day before this one
   starts. A calendar preset steps back one whole unit, so comparing August with July
   compares 31 days with 31 and not with an arbitrary 31-day window. */
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

/* The period before this one, of equal length, named the way a reader would name it:
   a year by its number, a month by its name, anything else by its length. Derived,
   never passed - "Compare with July" written by a caller is a label that goes wrong
   the moment the preset changes, which is how it came to be a static note. */
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
	if (preset === 'quarter') return 'the previous quarter'
	if (preset === 'week') return 'the previous week'
	const days = Math.round((b - a) / 86400000) + 1
	return 'the previous ' + (days === 1 ? 'day' : days + ' days')
}

/**
 * The comparison area, as a child rather than a prop: content, or a function of both
 * periods - the same shape as a List's Caption and Selected.
 *
 *     { period: 'month',
 *       selected: { from: '2026-08-01', to: '2026-08-31' },
 *       past:     { from: '2026-07-01', to: '2026-07-31', name: 'juli' } }
 *
 * What the area holds is the page's - a switch, a word, a second figure. The bar
 * derives the periods and renders what comes back, and nothing else: whether a
 * comparison is on is the page's state, so the control for it is the page's too.
 *
 * Two objects rather than four dates, because each one is a period and its ends are
 * only meaningful together. `past.name` is the derived word for it - a year by
 * its number, a month by its name - so a page writing its own label does not have to
 * work out what to call the period, which is how a label comes to disagree with the
 * dates beside it.
 *
 *
 * Its presence is what asks for the comparison at all: a page with nothing to
 * compare writes no Selected and the bar has no comparison area. An empty one is not
 * that - it is reported, since it draws nothing and reads as an oversight.
 */
export function Selected() { return null }

/**
 * The period a page is read through: a handful of presets, and a custom range
 * behind the last of them. The presets are radios, so the arrow keys move between
 * them and one is always the answer - a page is always being read through some
 * period, even if it is "this month".
 *
 * @param {object} props
 * @param {{ value: string, label: string }[]} [props.presets] To replace the standard five, not to remove them.
 * @param {string} props.value The chosen preset.
 * @param {(period: { period: string, selected: { from: string, to: string } | null, past: { from: string, to: string, name: string } | null }) => void} props.onChange Called when the preset changes, with the same object a Selected child is handed. One shape for both, so a page reads the same thing whether it is rendering or reacting.
 * @param {string} [props.from] The custom range's first date, when the preset is `custom`. Two props rather than a pair, for the reason RangePicker takes two: a third date cannot be expressed, so nothing has to be guarded against.
 * @param {string} [props.to] Its last date.
 * @param {string} props.name Groups the radios.
 * @param {import('react').ReactNode} [props.custom] The RangePicker, shown when the custom preset is the chosen one.
 * @param {import('react').ReactNode} [props.children] A Selected, and nothing else.
 * @param {string} [props.locale] Takes no `className` and no `style`.
 */
export function PeriodPicker({ presets, value, onChange, from, to, name, custom, children, locale, ...rest }) {
	reject(rest, 'PeriodPicker', ['note', 'compareLabel', 'compare', 'defaultCompare', 'onCompareChange'])
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
	const list = presets ?? STANDARD_PERIODS
	const today = new Date()
	const dates = value === 'custom'
		? [from, to]
		: PERIODS[value] && PERIODS[value](today).map(iso)
	/* What the bar knows, as one object: the preset, the dates it comes to, and the
	   period before it. Built once and handed to both the Selected slot and onChange, so
	   a page reads the same shape whether it is rendering or reacting - two shapes for
	   one state is how the two come to disagree. */
	const shapeOf = (preset, span) => {
		const before = span && precedingDates(preset, span)
		return {
			period: preset,
			selected: span ? { from: span[0], to: span[1] } : null,
			past: before ? { from: before[0], to: before[1], name: precedingName(preset, span, locale) } : null
		}
	}
	const resolved = dates ? readableRange(dates, locale) : null
	const note = dates ? periodNote(value, dates) : null
	const offers = dates && picked
	const against = offers
		? { name: precedingName(value, dates, locale), dates: precedingDates(value, dates) }
		: null
	const last = list[list.length - 1]
	const withCustom = custom && last
	const before = withCustom ? list.slice(0, -1) : list

	const preset = p => (
		<label className="sp-period__preset" data-label={p.label} key={p.value}>
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
		<div className="sp-period" {...rest}>
			<div className="sp-period__presets">
				{before.map(preset)}
				{withCustom
					? (
						<div className="sp-period__anchor">
							{preset(last)}
							<div className="sp-period__custom">{custom}</div>
						</div>
					)
					: null}
			</div>
			{resolved ? <span className="sp-period__resolved">{resolved}</span> : null}
			{against && picked
				? <span className="sp-period__compare">{typeof picked === 'function' ? picked(shapeOf(value, dates)) : picked}</span>
				: null}
			{note ? <span className="sp-period__note">{note}</span> : null}
		</div>
	)
}

/**
 * The single month a phone shows, in a sheet: the same grid at touch size, scrolling
 * inside the sheet with its weekday row pinned.
 *
 * @param {object} props
 * @param {boolean} [props.sheet]
 * @param {boolean} [props.open]
 * @param {import('react').ReactNode} [props.children]
 */
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

/** What they typed, back to an ISO date. The locale says which number is the day. */
function fromReadable(text, locale) {
	const parts = String(text).split(/[^\d]+/).filter(Boolean).map(Number)
	if (parts.length < 3) return null
	const order = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
		.formatToParts(new Date(2026, 10, 22))
		.filter(p => p.type !== 'literal')
		.map(p => p.type)
	const got = {}
	order.forEach((type, i) => { got[type] = parts[i] })
	if (!got.year || !got.month || !got.day) return null
	if (got.month > 12 || got.day > 31) return null
	return `${got.year}-${String(got.month).padStart(2, '0')}-${String(got.day).padStart(2, '0')}`
}

/**
 * A date. Drawn on desktop, native on touch.
 *
 * The switch is the surface's, not the caller's: a touch surface carries .sp-touch,
 * so the field looks for one above it and renders the native control there. Passing
 * `native` states it outright, for a page that knows better than the DOM does.
 *
 * On desktop the value is typed as well as picked - a reader who knows the date
 * should not have to click for it - so the input is text with a numeric input mode
 * and the reader's own format, announced by a hint the field describes itself with.
 * The value in and out is always an ISO date.
 *
 * What the keyboard does, because a calendar that only takes a mouse is a calendar
 * half the readers cannot use: the trail button opens the dropdown and moves focus
 * into the grid; the arrow keys move a day at a time and a week at a time;
 * PageUp and PageDown move a month, with Shift a year; Home and End go to the ends
 * of the week; Enter or Space picks; Escape closes and puts focus back on the
 * button; clicking away closes it too; and Tab leaves, because the dropdown is not
 * a modal - it is a panel hanging off a field.
 *
 *
 *
 *   The end the reader did not just touch is what moves. Picking a start too close to
 *   the end pushes the end out; picking an end too close to the start pulls the start
 *   back. The alternative is refusing the click, which leaves the reader holding a
 *   range they cannot fix without working out which end the control objects to.
 *   Where the push would cross min or max it is taken from the other end instead, so
 *   the floor holds even at the edge of what can be picked.
 *
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {string} props.value An ISO date.
 * @param {(value: string) => void} props.onChange The calendar glyph and the two month arrows are the component's own, from the register - a date field's calendar is never another glyph.
 * @param {string} [props.min] An ISO date. Days outside are disabled, not hidden.
 * @param {string} [props.max]
 * @param {(day: string) => boolean} [props.unavailable]
 * @param {boolean} [props.native] Force one or the other.
 * @param {boolean} [props.danger]
 * @param {boolean} [props.showWeeks] Number the calendar's rows with their ISO week.
 * @param {string} [props.locale] Defaults to the browser's.
 * @param {string} [props.id] Bound by the Field around it.
 */
export function DateField({ value, onChange, min, max, unavailable, native, danger = false, showWeeks = true, locale, id, ...rest }) {
	reject(rest, 'DateField')
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
	/* A native date input takes min and max and nothing else - it has no way to
	   refuse scattered days - so on touch the reader could pick one the design
	   forbids. The field says so rather than appearing to enforce it. */
	if (isNative && unavailable) console.error('<DateField> a native picker cannot refuse single days: pass native={false} where unavailable matters')
	const day = (value && parse(value)) || new Date()
	const [shown, setShown] = useState({ year: day.getFullYear(), month: day.getMonth() })
	const move = by => setShown(s => {
		const at = new Date(s.year, s.month + by, 1)
		return { year: at.getFullYear(), month: at.getMonth() }
	})

	const close = ({ toTrigger } = {}) => {
		setOpen(false)
		if (toTrigger) trigger.current?.focus()
	}

	// clicking away closes it: a panel that stays open behind the reader's next
	// click is a panel they have to dismiss twice
	useEffect(() => {
		if (!open) return
		const away = ev => { if (!wrap.current?.contains(ev.target)) setOpen(false) }
		document.addEventListener('pointerdown', away)
		return () => document.removeEventListener('pointerdown', away)
	}, [open])

	if (isNative)
		return (
			<input
				id={id}
				type="date"
				className="sp-input"
				value={value}
				min={min}
				max={max}
				onChange={ev => onChange?.(ev.target.value)}
				{...(danger ? { 'aria-invalid': 'true' } : {})}
			/>
		)

	const hintId = id ? `${id}-format` : undefined
	const openTo = date => {
		setFocusedDay(date || iso(new Date()))
		const at = parse(date || iso(new Date()))
		setShown({ year: at.getFullYear(), month: at.getMonth() })
		setOpen(true)
		requestAnimationFrame(() => {
			wrap.current?.querySelector('.sp-range__day[tabindex="0"]')?.focus()
		})
	}

	return (
		<span
			className="sp-field__wrap"
			ref={wrap}
			data-open={open ? 'true' : 'false'}
			onKeyDown={ev => { if (ev.key === 'Escape' && open) { ev.stopPropagation(); close({ toTrigger: true }) } }}
		>
			{/* the box, not TextField: the date typing behaviour already owns value,
			    onChange and onKeyDown, and a field that wraps it would fight it for
			    all three */}
			<input
				id={id}
				className="sp-input sp-input--trail sp-number"
				aria-describedby={hintId}
				{...text}
				{...(danger || text.invalid ? { 'aria-invalid': 'true' } : {})}
				onKeyDown={ev => {
					// the panel opens on the key that opens every other panel in the system
					if (ev.key === 'ArrowDown' && ev.altKey && !open) { ev.preventDefault(); return openTo(value) }
					text.onKeyDown(ev)
				}}
			/>
			{hintId ? <span id={hintId} hidden>{readable(iso(new Date(2026, 10, 22)), locale)}</span> : null}
			<span className="sp-field__trail" ref={trigger}>
				<IconButton
					icon={<Icon name="calendar" />}
					aria-label="Open the calendar"
					size="field"
					aria-haspopup="dialog"
					aria-expanded={open ? 'true' : 'false'}
					onClick={() => (open ? close({ toTrigger: true }) : openTo(value))}
				/>
			</span>
			<div className="sp-calendar" role="dialog" aria-label="Choose a date">
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
