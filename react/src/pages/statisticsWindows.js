import { activeLocaleCode, longDate, monthNames, shortDate, today } from '../api/format.js'

/* ---- windows: the ids the API pages through, worked out here so the control answers at once ---- */

export const RANGES = ['days30', 'week', 'month', 'quarter', 'year', 'custom']
export const DAY_MS = 86400000
const pad = n => String(n).padStart(2, '0')
export const utcOf = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) }
export const isoOf = ms => new Date(ms).toISOString().slice(0, 10)
// the reader's own date, the one the API is told is today
export const todayUtc = () => utcOf(today())
export const mondayFirst = ms => (new Date(ms).getUTCDay() + 6) % 7
// the API's own ceiling on a chosen range
const MOST_DAYS = 3660

// ISO weeks, the same arithmetic as the API's lib/stats.js
export function isoWeekOf(ms) {
	const thursday = ms + (3 - mondayFirst(ms)) * DAY_MS
	const year = new Date(thursday).getUTCFullYear()
	const jan4 = Date.UTC(year, 0, 4)
	return { year, week: Math.round((thursday - (jan4 + (3 - mondayFirst(jan4)) * DAY_MS)) / (7 * DAY_MS)) + 1 }
}
const mondayOfWeek = (year, week) => {
	const jan4 = Date.UTC(year, 0, 4)
	return jan4 - mondayFirst(jan4) * DAY_MS + (week - 1) * 7 * DAY_MS
}

export function windowIdAt(range, ms) {
	const at = new Date(ms)
	if (range === 'week') { const { year, week } = isoWeekOf(ms); return `${year}-W${pad(week)}` }
	if (range === 'month') return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}`
	if (range === 'quarter') return `${at.getUTCFullYear()}-Q${Math.floor(at.getUTCMonth() / 3) + 1}`
	if (range === 'days30') return isoOf(ms)
	if (range === 'custom') return `${isoOf(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1))}~${isoOf(ms)}`
	return String(at.getUTCFullYear())
}

const ID_SHAPE = {
	week: /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/, month: /^\d{4}-(0[1-9]|1[0-2])$/, quarter: /^\d{4}-Q[1-4]$/, year: /^\d{4}$/,
	days30: /^\d{4}-\d{2}-\d{2}$/, custom: /^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$/
}
const realDay = iso => isoOf(utcOf(iso)) === iso

// most years have 52 ISO weeks, so a W53 is real only when its Monday reads back as the same week
export function validId(range, id) {
	if (!ID_SHAPE[range].test(id ?? '')) return false
	if (range === 'week') return windowIdAt('week', mondayOfWeek(Number(id.slice(0, 4)), Number(id.slice(6)))) === id
	if (range === 'days30') return realDay(id)
	if (range === 'custom') {
		const [a, b] = id.split('~')
		return realDay(a) && realDay(b) && a <= b && (utcOf(b) - utcOf(a)) / DAY_MS <= MOST_DAYS
	}
	return true
}

/** The first and last day of a window, as UTC midnights. */
export function boundsOf(range, id) {
	if (range === 'week') {
		const from = mondayOfWeek(Number(id.slice(0, 4)), Number(id.slice(6)))
		return [from, from + 6 * DAY_MS]
	}
	if (range === 'days30') return [utcOf(id) - 29 * DAY_MS, utcOf(id)]
	if (range === 'custom') return id.split('~').map(utcOf)
	const y = Number(id.slice(0, 4))
	if (range === 'month') { const m = Number(id.slice(5)); return [Date.UTC(y, m - 1, 1), Date.UTC(y, m, 0)] }
	if (range === 'quarter') { const q = Number(id.slice(6)); return [Date.UTC(y, (q - 1) * 3, 1), Date.UTC(y, q * 3, 0)] }
	return [Date.UTC(y, 0, 1), Date.UTC(y, 11, 31)]
}

const yearBack = iso => `${Number(iso.slice(0, 4)) - 1}${iso.slice(4)}`.replace(/-02-29$/, '-02-28')

/** The same window a year earlier, which is what the switch compares with: a week keeps its number,
    and a week 53 the year before did not have is compared with that year's week 52. */
export function yearEarlier(range, id) {
	if (range === 'days30') return yearBack(id)
	if (range === 'custom') return id.split('~').map(yearBack).join('~')
	const earlier = `${Number(id.slice(0, 4)) - 1}${id.slice(4)}`
	return range !== 'week' || validId('week', earlier) ? earlier : `${earlier.slice(0, 4)}-W52`
}

/** A window of another size around the same stretch: the one holding this window's last day,
    or today when this window runs past it. A chosen range starts as the window it replaces. */
export function reanchor(range, id, next) {
	const [from, to] = boundsOf(range, id)
	const last = Math.max(from, Math.min(todayUtc(), to))
	if (next === 'custom') return `${isoOf(from)}~${isoOf(last)}`
	return windowIdAt(next, last)
}

/** "2026", "Q3 2026", "August 2026", "Week 34, 2026", "04/09/2026 - 03/10/2026". The month is
    capitalised unless the name sits inside running text (`inText`), where it follows the language. */
export function nameOf(range, id, inText = false) {
	const y = id.slice(0, 4)
	if (range === 'week') return `Week ${Number(id.slice(6))}, ${y}`
	if (range === 'month') return `${monthNames('long', !inText)[Number(id.slice(5)) - 1]} ${y}`
	if (range === 'quarter') return `${id.slice(5)} ${y}`
	if (range === 'days30' || range === 'custom') {
		const [from, to] = boundsOf(range, id).map(isoOf)
		return `${shortDate(from)} - ${shortDate(to)}`
	}
	return y
}

// "2 Oct": the compare switch already names the earlier window's year
export const dayAndMonth = iso => new Intl.DateTimeFormat(activeLocaleCode(), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(utcOf(iso)))

// the stepper's own short name; its width is set by the longest month
export function stepLabel(range, id) {
	if (range === 'week') return `W${Number(id.slice(6))}`
	if (range === 'month') return monthNames('long', true)[Number(id.slice(5)) - 1]
	if (range === 'quarter') return id.slice(5)
	if (range === 'days30') return boundsOf(range, id).map(ms => dayAndMonth(isoOf(ms))).join(' - ')
	return id
}

/* ---- the drill path: an ordered list of crumbs, in the address as crumbs=kind:value,... ---- */

export const CRUMB_KINDS = ['month', 'week', 'vendor', 'category', 'status']
const TIME = ['month', 'week']
export const isTime = crumb => TIME.includes(crumb.kind)
// beyond three levels the order table is the better answer (4c)
export const MOST_CRUMBS = 3

export function readCrumbs(text) {
	const crumbs = []
	for (const part of String(text ?? '').split(',')) {
		const at = part.indexOf(':')
		if (at < 1) continue
		const kind = part.slice(0, at)
		const value = part.slice(at + 1)
		if (!CRUMB_KINDS.includes(kind) || !value) continue
		if (kind === 'month' && !validId('month', value)) continue
		if (kind === 'week' && !validId('week', value)) continue
		// one of each: a time crumb and a crumb of each record kind
		if (crumbs.some(c => c.kind === kind || (isTime(c) && TIME.includes(kind)))) continue
		crumbs.push({ kind, value })
	}
	return crumbs.slice(0, MOST_CRUMBS)
}

export const writeCrumbs = crumbs => crumbs.map(c => `${c.kind}:${c.value}`).join(',')

/** The days a time crumb covers, or null for a crumb that is not about time. */
export const crumbSpan = crumb => (isTime(crumb) ? boundsOf(crumb.kind, crumb.value).map(isoOf) : null)

/** A time crumb outside the window narrows it to nothing, so it is dropped with the window. */
export function crumbsIn(crumbs, from, to) {
	return crumbs.filter(c => { const span = crumbSpan(c); return !span || (span[0] <= to && span[1] >= from) })
}

/** What the API filters by for a drill path. */
export function filterOf(crumbs) {
	const filter = {}
	for (const c of crumbs) {
		if (c.kind === 'vendor') filter.vendorId = c.value
		else if (c.kind === 'category') filter.categoryId = c.value
		else if (c.kind === 'status') filter.status = c.value
		else [filter.from, filter.to] = crumbSpan(c)
	}
	return filter
}

/* ---- the window's own days, cut into the columns the charts draw ---- */

// a step of the period (4a): a day for 30 days, a week for a quarter, a month for a year; any other
// period takes the smallest step that draws 12 bars or fewer
const UNIT = { week: 'day', month: 'week', quarter: 'week', year: 'month', days30: 'day' }
const weekColumns = (first, days) => 1 + Array.from({ length: days - 1 }, (_, d) => d + 1).filter(d => mondayFirst(first + d * DAY_MS) === 0).length
export const unitOf = (range, days, first) => UNIT[range] ?? (days <= 12 ? 'day' : weekColumns(first, days) <= 12 ? 'week' : 'month')

const weekday = iso => new Intl.DateTimeFormat(activeLocaleCode(), { weekday: 'short', timeZone: 'UTC' }).format(new Date(utcOf(iso)))
// a clipped week holds only the window's own days, so a week's column is named by its days
const daySpan = (from, to) => (from === to ? String(Number(from.slice(8))) : `${Number(from.slice(8))}-${Number(to.slice(8))}`)

/** Months for a quarter or a year, weeks for a month, days for a week, up to the one holding today
    (4a), each with its spend, saving, order count and top categories from the API's running totals. */
export function chartOf(view) {
	const spend = view.series.current
	const saved = view.series.savedCumulative
	const orders = view.series.ordersCumulative
	const days = spend.length
	const first = utcOf(view.from)
	const unit = unitOf(view.range, days, first)
	const starts = unit === 'month'
		? view.axis.map(mark => mark.day)
		: spend.map((unused, day) => day).filter(day => unit === 'day' || day === 0 || mondayFirst(first + day * DAY_MS) === 0)
	const between = (series, a, b) => series[b - 1] - (a > 0 ? series[a - 1] : 0)
	const columns = starts.map((start, i) => {
		const end = i + 1 < starts.length ? starts[i + 1] : days
		const at = first + start * DAY_MS
		const from = isoOf(at)
		const to = isoOf(first + (end - 1) * DAY_MS)
		const month = new Date(at).getUTCMonth()
		const week = isoWeekOf(at).week
		return {
			key: from,
			from,
			to,
			// more than a week of days is named by date: thirty weekday names do not fit their columns
			tick: unit === 'month' ? monthNames('short', true)[month] : unit === 'week' ? daySpan(from, to) : days > 7 ? String(Number(from.slice(8))) : weekday(from),
			name: unit === 'month'
				? `${monthNames('long', true)[month]} ${new Date(at).getUTCFullYear()}`
				: unit === 'week' ? `Week ${week}, ${shortDate(from)} - ${shortDate(to)}` : longDate(from),
			crumb: unit === 'month' ? { kind: 'month', value: windowIdAt('month', at) } : unit === 'week' ? { kind: 'week', value: windowIdAt('week', at) } : null,
			spend: between(spend, start, end),
			saved: between(saved, start, end),
			orders: between(orders, start, end),
			byCategory: view.series.byCategory.map(series => between(series, start, end)),
			running: view.todayIndex != null && view.todayIndex >= start && view.todayIndex < end,
			future: view.todayIndex != null && view.todayIndex < start
		}
	})
	return { unit, columns: columns.filter(column => !column.future) }
}

/** An axis of four even steps whose top is a round number at or above the largest value. */
export function scaleFor(most) {
	if (!(most > 0)) return 4
	const raw = most / 4
	const power = 10 ** Math.floor(Math.log10(raw))
	const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(f => f * power).find(s => s >= raw)
	return step * 4
}
