import { db } from '../db.js'
import { fromEpoch, toEpoch, todayIso } from './dates.js'
import { MAX_PAGE_SIZE } from './constants.js'
import { decorateOrderListRows } from './decorate.js'
import { orderTotalsSelectList } from './orderColumns.js'
import { lookalikePairs, vendorsIn } from './vendorLookalikes.js'
import { looksOf } from './looks.js'

/* Statistics, computed by real SQL aggregation over the user's own orders — SUM/GROUP BY
   within a [from, to) window, never a per-order JS loop and never a synthetic "spread a
   monthly total across days" derivation. A window is a calendar unit
   (week/month/quarter/year) or the whole of a user's own order history ("all"), addressed by a
   windowId the chips-and-pager UI can page through. All date arithmetic below is UTC, since
   these are calendar dates rather than moments — running them through a local clock would date
   an evening in one timezone to tomorrow. `today` is the reader's own day (req.today), as the
   epoch of its UTC midnight, so every window agrees with the calendar the reader sees. */

const DAY = 86400
const pad = (n, len = 2) => String(n).padStart(len, '0')

const mondayFirst = ms => (new Date(ms).getUTCDay() + 6) % 7   // Monday=0 ... Sunday=6

function isoWeekOf(ms) {
	const at = ms - mondayFirst(ms) * DAY * 1000 + 3 * DAY * 1000   // that week's Thursday, UTC midnight-anchored
	const year = new Date(at).getUTCFullYear()
	const jan4 = Date.UTC(year, 0, 4)
	const firstThursday = jan4 + (3 - mondayFirst(jan4)) * DAY * 1000
	const week = Math.round((at - firstThursday) / (7 * DAY * 1000)) + 1
	return { year, week }
}

function mondayOfIsoWeek(year, week) {
	const jan4 = Date.UTC(year, 0, 4)
	const mondayWeek1 = jan4 - mondayFirst(jan4) * DAY * 1000
	return mondayWeek1 + (week - 1) * 7 * DAY * 1000
}

const earliestOrderDate = db.prepare('SELECT MIN(date) d FROM orders WHERE user_id = ?')

const MAX_CUSTOM_DAYS = 3660
/** A real calendar day as epoch seconds, or null. */
const dayOf = iso => {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) return null
	const at = toEpoch(iso)
	return Number.isFinite(at) && fromEpoch(at) === iso ? at : null
}

/** The [from, to) epoch bounds of one window. `all` spans the user's own order history (or
    just today, if they have none yet) rather than a fixed demo range. */
export function windowBounds(userId, range, id, today) {
	/* The unit fields are range-checked, not just shape-checked: `?windowId=2026-13` matches
	   the month pattern and must not reach Date.UTC as month 13. Out of range answers null like
	   a malformed id does, which is the same reanchor-to-a-real-window fallback the caller runs. */
	if (range === 'week') {
		const [, y, w] = /^(\d{4})-W(\d{2})$/.exec(id) ?? []
		if (!y || Number(w) < 1 || Number(w) > 53) return null
		const from = mondayOfIsoWeek(Number(y), Number(w))
		return { from: from / 1000, to: from / 1000 + 7 * DAY }
	}
	if (range === 'month') {
		const [, y, m] = /^(\d{4})-(\d{2})$/.exec(id) ?? []
		if (!y || Number(m) < 1 || Number(m) > 12) return null
		return { from: Date.UTC(Number(y), Number(m) - 1, 1) / 1000, to: Date.UTC(Number(y), Number(m), 1) / 1000 }
	}
	if (range === 'quarter') {
		const [, y, q] = /^(\d{4})-Q([1-4])$/.exec(id) ?? []
		if (!y) return null
		const firstMonth = (Number(q) - 1) * 3
		return { from: Date.UTC(Number(y), firstMonth, 1) / 1000, to: Date.UTC(Number(y), firstMonth + 3, 1) / 1000 }
	}
	if (range === 'year') {
		if (!/^\d{4}$/.test(id)) return null
		const y = Number(id)
		return { from: Date.UTC(y, 0, 1) / 1000, to: Date.UTC(y + 1, 0, 1) / 1000 }
	}
	// a 30-day window is named by its last day
	if (range === 'days30') {
		const end = dayOf(id)
		if (end == null) return null
		return { from: end - 29 * DAY, to: end + DAY }
	}
	if (range === 'custom') {
		const [a, b] = String(id ?? '').split('~').map(dayOf)
		if (a == null || b == null || b < a || b - a > MAX_CUSTOM_DAYS * DAY) return null
		return { from: a, to: b + DAY }
	}
	// 'all': the user's whole order history through today, at least a week wide. Every other
	// range has a fixed calendar width regardless of how little data is in it, which is what
	// lets one order sit amid real zero-days and draw as a spike -- 'all' is the only one sized
	// off the data itself, so an account whose first order was placed today collapsed it to a
	// single day. A single day-level point has no "before" to rise from, so the line drew flat
	// across the whole card instead of the spike every other range shows for the same order.
	const earliest = earliestOrderDate.get(userId).d
	const to = today + DAY
	const from = Math.min(earliest ?? to - DAY, to - 7 * DAY)
	return { from, to }
}

/** The id of the window of `range` that contains a given day (epoch seconds). Every id in this
    file is built here, so "which month is this" is one answer rather than one per caller. */
export function windowIdAt(range, at) {
	const day = new Date(at * 1000)
	if (range === 'week') { const { year, week } = isoWeekOf(day.getTime()); return `${year}-W${pad(week)}` }
	if (range === 'month') return `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}`
	if (range === 'quarter') return `${day.getUTCFullYear()}-Q${Math.floor(day.getUTCMonth() / 3) + 1}`
	if (range === 'year') return String(day.getUTCFullYear())
	if (range === 'days30') return fromEpoch(at)
	if (range === 'custom') return `${fromEpoch(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1) / 1000)}~${fromEpoch(at)}`
	return 'all'
}

/** Which width an id was written for, by its own shape. The four formats do not overlap, so an
    id carries its range with it and a client changing width can hand back the id it already
    has. */
export function rangeOfWindowId(id) {
	if (/^\d{4}-W\d{2}$/.test(id)) return 'week'
	if (/^\d{4}-\d{2}$/.test(id)) return 'month'
	if (/^\d{4}-Q[1-4]$/.test(id)) return 'quarter'
	if (/^\d{4}$/.test(id)) return 'year'
	if (/^\d{4}-\d{2}-\d{2}$/.test(id)) return 'days30'
	if (/^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$/.test(id)) return 'custom'
	if (id === 'all') return 'all'
	return null
}

/** The window of `width` to show when the picker is moved and the id in hand belongs to the
    width it was moved *from*.

    An id that does not parse as the new width would otherwise fail `windowBounds` and fall back
    to the current window -- the one place on the page where a control would silently discard
    what the control beside it was set to. The two are one control (the pager steps what the
    picker chose), so moving one keeps where the other is: the new window is the one containing
    the old window's **last day**, clamped to today, since a window later than today is one the
    pager itself refuses to reach. Year 2022 -> Month is December 2022; this year -> Month is
    this month. */
function reanchorWindowId(userId, width, id, today) {
	const was = rangeOfWindowId(id)
	const bounds = was && windowBounds(userId, was, id, today)
	if (!bounds) return windowIdAt(width, today)
	const anchor = Math.min(Math.max(today, bounds.from), bounds.to - DAY)
	return windowIdAt(width, anchor)
}

/** The window `delta` steps away (±1), same width — what the pager arrows call. Null for
    `all`, which has nothing to page through. */
export function shiftWindowId(range, id, delta) {
	if (range === 'all' || range === 'custom') return null
	if (range === 'days30') return fromEpoch(toEpoch(id) + delta * 30 * DAY)
	if (range === 'week') {
		const [, y, w] = /^(\d{4})-W(\d{2})$/.exec(id)
		const at = mondayOfIsoWeek(Number(y), Number(w)) + delta * 7 * DAY * 1000
		const { year, week } = isoWeekOf(at)
		return `${year}-W${pad(week)}`
	}
	if (range === 'month') {
		const [, y, m] = /^(\d{4})-(\d{2})$/.exec(id)
		const total = Number(y) * 12 + (Number(m) - 1) + delta
		return `${Math.floor(total / 12)}-${pad((total % 12 + 12) % 12 + 1)}`
	}
	if (range === 'quarter') {
		const [, y, q] = /^(\d{4})-Q(\d)$/.exec(id)
		const total = Number(y) * 4 + (Number(q) - 1) + delta
		return `${Math.floor(total / 4)}-Q${(total % 4 + 4) % 4 + 1}`
	}
	return String(Number(id) + delta)
}

/** The window a comparison reads against: the one right before it (the default), or the one
    holding the same day one calendar year earlier — same width either way, so a month compares
    to a month and a week to a week. 'all' has neither: there is nothing to hold a whole
    history's worth of orders up against. */
function comparisonWindowId(userId, range, id, compare, today) {
	if (range === 'all') return null
	const bounds = windowBounds(userId, range, id, today)
	const yearBack = at => { const d = new Date(at * 1000); return Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate()) / 1000 }
	if (range === 'custom') {
		const [from, last] = compare === 'year'
			? [yearBack(bounds.from), yearBack(bounds.to - DAY)]
			: [2 * bounds.from - bounds.to, bounds.from - DAY]
		return `${fromEpoch(from)}~${fromEpoch(last)}`
	}
	if (range === 'days30' && compare === 'year') return fromEpoch(yearBack(bounds.to - DAY))
	if (compare !== 'year') return shiftWindowId(range, id, -1)
	const at = new Date(bounds.from * 1000)
	const yearAgo = Date.UTC(at.getUTCFullYear() - 1, at.getUTCMonth(), at.getUTCDate()) / 1000
	return windowIdAt(range, yearAgo)
}

/* The statuses that are money out, money back, or neither: a draft or a cancelled order moved no money. */
const FLOW_WHERE = {
	all: " AND ot.status_type NOT IN ('cancelled', 'draft')",
	expenses: " AND ot.status_type NOT IN ('returned', 'cancelled', 'draft')",
	refunds: " AND ot.status_type = 'returned'",
	net: " AND ot.status_type NOT IN ('cancelled', 'draft')"
}
export const FLOWS = Object.keys(FLOW_WHERE)

/** What narrows every query below: the lens (flow) and the drill path's vendor, category and
    status. Under a category, an order counts its full total, as the split does. An order left out of statistics counts only when `excluded` is 'include'; `leftOut` is the
    same scope narrowed to those orders alone, for counting them. */
function scopeOf({ flow = 'all', vendorId, categoryId, status, excluded } = {}) {
	const lens = FLOW_WHERE[flow] === undefined ? 'all' : flow
	let and = FLOW_WHERE[lens]
	const params = {}
	if (vendorId) { and += ' AND ot.vendor_id = @vendorId'; params.vendorId = vendorId }
	if (categoryId === 'none') and += ' AND ot.category_count = 0'
	else if (categoryId) {
		and += ' AND ot.id IN (SELECT order_id FROM order_categories WHERE category_id = @categoryId)'
		params.categoryId = categoryId
	}
	if (status) { and += ' AND ot.status = @status'; params.status = status }
	const signed = col => (lens === 'net' ? `(CASE WHEN ot.status_type = 'returned' THEN -ot.${col} ELSE ot.${col} END)` : `ot.${col}`)
	return {
		and: excluded === 'include' ? and : `${and} AND ot.exclude_from_stats = 0`,
		leftOut: `${and} AND ot.exclude_from_stats = 1`,
		params, signed
	}
}

const statements = new Map()
const prepared = sql => {
	if (!statements.has(sql)) statements.set(sql, db.prepare(sql))
	return statements.get(sql)
}

function totalsOver(userId, from, to, scope) {
	const r = prepared(`
		SELECT COUNT(*) AS orders, COALESCE(SUM(${scope.signed('total')}), 0) AS spent, COALESCE(SUM(${scope.signed('saved')}), 0) AS saved
		FROM orders ot WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to${scope.and}
	`).get({ userId, from, to, ...scope.params })
	return { orders: r.orders, spent: r.spent, saved: r.saved }
}

/** The median order of a window's `orders` orders: one very large order barely moves it, where it
    would pull an average. A median has no SUM, so it is the middle one or two by amount. */
function medianOver(userId, from, to, orders, scope) {
	if (!orders) return 0
	return prepared(`
		SELECT AVG(amount) AS median FROM (
			SELECT ${scope.signed('total')} AS amount FROM orders ot
			WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to${scope.and}
			ORDER BY amount LIMIT CAST(@take AS INTEGER) OFFSET CAST(@skip AS INTEGER))
	`).get({ userId, from, to, take: 2 - (orders % 2), skip: Math.floor((orders - 1) / 2), ...scope.params }).median ?? 0
}

/* The first day of each step a chart draws, as a day index into the window: a day each, a week
   from each Monday, a month from each first of the month. The window's first day always starts one. */
const STEP_START = {
	day: () => true,
	week: at => new Date(at * 1000).getUTCDay() === 1,
	month: at => new Date(at * 1000).getUTCDate() === 1
}
export const STEPS = Object.keys(STEP_START)

/** The median order of each step of the window, in step order; a step with no order is 0. Each
    step's orders are ranked by amount and counted, and its middle one or two are averaged. */
function stepMediansOver(userId, from, to, step, scope) {
	const starts = []
	for (let d = from; d < to; d += DAY) if (d === from || STEP_START[step](d)) starts.push(d)
	const found = prepared(`
		SELECT bucket, AVG(amount) AS median FROM (
			SELECT bucket, amount,
				ROW_NUMBER() OVER (PARTITION BY bucket ORDER BY amount) AS rank, COUNT(*) OVER (PARTITION BY bucket) AS orders
			FROM (SELECT (SELECT MAX(value) FROM json_each(@starts) WHERE value <= ot.date) AS bucket, ${scope.signed('total')} AS amount
				FROM orders ot WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to${scope.and})
		) WHERE rank IN ((orders + 1) / 2, (orders + 2) / 2)
		GROUP BY bucket
	`).all({ userId, from, to, starts: JSON.stringify(starts), ...scope.params })
	const byStart = new Map(found.map(r => [r.bucket, r.median]))
	return starts.map(at => byStart.get(at) ?? 0)
}

/** How many orders left out of statistics the window holds under the same narrowing. */
function leftOutOver(userId, from, to, scope) {
	return prepared(`SELECT COUNT(*) AS c FROM orders ot WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to${scope.leftOut}`)
		.get({ userId, from, to, ...scope.params }).c
}

/* Categories overlap, so an order counts its full total in every category it carries, and the
   rows can add up to more than the window's spend. */
function selectSplit(scope) {
	return prepared(`
		SELECT c.id, c.name, SUM(${scope.signed('total')}) AS spend, COUNT(*) AS orders
		FROM order_categories oc
		JOIN orders ot ON ot.id = oc.order_id
		JOIN categories c ON c.id = oc.category_id
		WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to${scope.and}
		GROUP BY c.id
		ORDER BY spend DESC, c.name COLLATE NOCASE, c.id
	`)
}

function splitOver(userId, from, to, scope) {
	return selectSplit(scope).all({ userId, from, to, ...scope.params }).map(r => ({ id: r.id, name: r.name, amount: r.spend, orders: r.orders }))
}

/* An order has one vendor, so every order's total counts once and the rows sum to the window's spend. */
function vendorSplitOver(userId, from, to, scope) {
	return prepared(`
		SELECT ot.vendor_id AS id, v.name, SUM(${scope.signed('total')}) AS spend, COUNT(*) AS orders
		FROM orders ot JOIN vendors v ON v.id = ot.vendor_id
		WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to${scope.and}
		GROUP BY ot.vendor_id
		ORDER BY spend DESC, v.name COLLATE NOCASE, v.id
	`).all({ userId, from, to, ...scope.params }).map(r => ({ id: r.id, name: r.name, amount: r.spend, orders: r.orders }))
}

/** One vendor's spend and median order in this year's window, counted as the year's statistics count them (5c). */
export function vendorYear(userId, vendorId, day = todayIso()) {
	const { bounds } = resolveWindow(userId, 'year', undefined, toEpoch(day))
	const scope = scopeOf({ vendorId })
	return {
		amount: vendorSplitOver(userId, bounds.from, bounds.to, scope)[0]?.amount ?? 0,
		median: medianOver(userId, bounds.from, bounds.to, totalsOver(userId, bounds.from, bounds.to, scope).orders, scope)
	}
}

/** The spend and order count of each of the last `count` calendar months, oldest first and ending with
    today's, counted as the statistics count them: what a chart of months reads, without a day's series. */
export function monthTotals(userId, count, flow = 'expenses', day = todayIso()) {
	const [y, m] = day.split('-').map(Number)
	const start = (i) => Date.UTC(y, m - 1 - (count - 1) + i, 1) / 1000
	const from = start(0), to = start(count)
	const months = Array.from({ length: count }, (unused, i) => ({ month: fromEpoch(start(i)).slice(0, 7), spend: 0, orders: 0 }))
	for (const row of dailyRowsOver(userId, from, to, scopeOf({ flow }))) {
		const at = months.find((x, i) => row.date >= start(i) && row.date < start(i + 1))
		at.spend += row.spend
		at.orders += row.orders
	}
	return months
}

function statusSplitOver(userId, from, to, scope) {
	return prepared(`
		SELECT ot.status, COUNT(*) AS orders FROM orders ot
		WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to${scope.and}
		GROUP BY ot.status
	`).all({ userId, from, to, ...scope.params })
}

/** How many months a window is, as a real number: every day counts as its own share of its own
    month, so a calendar month is exactly 1, a quarter exactly 3 and a year exactly 12, and a
    week is the 0.226 of August it actually is. Not days/30.44 -- that makes February 0.92 of a
    month and prints a budget nobody set. */
function monthsIn(from, to) {
	let months = 0
	for (let d = from; d < to; d += DAY) {
		const at = new Date(d * 1000)
		months += 1 / new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0)).getUTCDate()
	}
	// Thirty-one additions of 1/31 come to 0.9999999999999993, so a whole month is not `=== 1`
	// and a year is 12.000000000000037. Rounded here, once, where the sum is made: every figure
	// on the card is derived from this one number, so it is the number that has to be clean
	// rather than each of them separately.
	return Math.round(months * 1e6) / 1e6
}

/** One row per day of [from, to), zero-filled where nothing was bought -- what the running
    totals below are summed from. */
function dailyRowsOver(userId, from, to, scope) {
	const found = prepared(`
		SELECT ot.date, SUM(${scope.signed('total')}) AS spend, SUM(${scope.signed('saved')}) AS saved, COUNT(*) AS orders
		FROM orders ot
		WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to${scope.and}
		GROUP BY ot.date ORDER BY ot.date
	`).all({ userId, from, to, ...scope.params })
	const byDate = new Map(found.map(r => [r.date, r]))
	const rows = []
	for (let d = from; d < to; d += DAY) {
		const r = byDate.get(d)
		rows.push({ date: d, spend: r?.spend ?? 0, saved: r?.saved ?? 0, orders: r?.orders ?? 0 })
	}
	return rows
}

/** Running totals per day for a few categories, to split a chart's columns. Each order counts
    once, under its first category by name as the order page lists them, so parts fit the column. */
function categorySeriesOver(userId, from, to, ids, scope) {
	if (!ids.length) return []
	// MIN(c.name) makes the bare category_id the one of the first name, without a sort per order
	const found = prepared(`
		SELECT date, id, SUM(spend) AS spend FROM (
			SELECT ot.date, oc.category_id AS id, MIN(c.name), ${scope.signed('total')} AS spend
			FROM orders ot JOIN order_categories oc ON oc.order_id = ot.id JOIN categories c ON c.id = oc.category_id
			WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to${scope.and}
			GROUP BY ot.id)
		WHERE id IN (SELECT value FROM json_each(@ids))
		GROUP BY date, id
	`).all({ userId, from, to, ids: JSON.stringify(ids), ...scope.params })
	return ids.map(id => {
		const byDate = new Map(found.filter(r => r.id === id).map(r => [r.date, r.spend]))
		const rows = []
		for (let d = from; d < to; d += DAY) rows.push({ spend: byDate.get(d) ?? 0 })
		return cumulate(rows, 'spend')
	})
}

/** The running-total line a window's chart draws, from daily rows already in hand — split
    from the fetch so getStats reads the window's daily totals once and cumulates spend and
    saved from the same rows, instead of running the identical GROUP BY twice per request
    (dailyRowsOver returns both columns either way). */
function cumulate(rows, key) {
	const points = []
	let sum = 0
	for (const row of rows) { sum += row[key]; points.push(sum) }
	return points
}

/** Today's day index inside [from, to), or null if today is outside it. */
function todayIn(from, to, today) {
	return today >= from && today < to ? Math.floor((today - from) / DAY) : null
}

/** How far into the current (still-running) window today is -- only meaningful for the window
    containing today; a past window is already complete. */
function paceFor(from, to, today) {
	if (today < from || today >= to) return { running: false, daysIn: Math.round((to - from) / DAY) }
	return { running: true, daysIn: Math.floor((today - from) / DAY) + 1, unitDays: Math.round((to - from) / DAY) }
}

/** Where the chart's columns start when a window is drawn by month: one mark per day for a
    window of a month or less, else one per month on that month's first day inside the window.
    Each mark is a day index into the window's own daily series. */
function axisFor(from, to) {
	const marks = []
	const days = Math.round((to - from) / DAY)
	let last = null
	for (let d = from; d < to; d += DAY) {
		const month = new Date(d * 1000).getUTCMonth()
		if (days > 31 && month === last) continue
		last = month
		marks.push({ day: Math.round((d - from) / DAY) })
	}
	return marks
}

/** The window an id names for a width, or the current one when the id does not fit it. */
function resolveWindow(userId, range, windowId, today) {
	const width = ['week', 'month', 'quarter', 'year', 'all', 'days30', 'custom'].includes(range) ? range : 'month'
	/* 'all' has one window, so it has one id -- windowBounds ignores the id it is handed for
	   that width, so a month id left in the URL (`?range=all&period=2022-05`) cannot pin a
	   window that is not a month. */
	const id = width === 'all' ? 'all'
		: !windowId ? windowIdAt(width, today)
			: windowBounds(userId, width, windowId, today) ? windowId
				: reanchorWindowId(userId, width, windowId, today)
	return { width, id, bounds: windowBounds(userId, width, id, today) }
}

/** The drill path's own stretch of time inside the window: a month or a week crumb. */
function focusOf(bounds, from, to) {
	const a = dayOf(from)
	const b = dayOf(to)
	const start = a == null ? bounds.from : Math.max(bounds.from, a)
	const end = b == null ? bounds.to : Math.min(bounds.to, b + DAY)
	return end > start ? { from: start, to: end } : bounds
}

/** Statistics for one window: the fields Home, Statistics, Categories and a vendor's page read.
    `filter` is the drill path (vendorId, categoryId, status, from, to), the lens (flow) and
    whether left-out orders count (excluded); `step` adds each chart step's median order. */
export function getStats(userId, range, windowId, { compare = 'previous', today: day = todayIso(), filter = {}, step } = {}) {
	const today = toEpoch(day)
	const { width, id, bounds } = resolveWindow(userId, range, windowId, today)
	const scope = scopeOf(filter)
	const focus = focusOf(bounds, filter.from, filter.to)
	const narrowed = focus.from !== bounds.from || focus.to !== bounds.to

	const now = totalsOver(userId, focus.from, focus.to, scope)
	const previousId = comparisonWindowId(userId, width, id, compare, today)
	const previousBounds = previousId ? windowBounds(userId, width, previousId, today) : null

	const olderId = shiftWindowId(width, id, -1)
	const newerId = shiftWindowId(width, id, 1)
	const newerBounds = newerId ? windowBounds(userId, width, newerId, today) : null
	const hasNewer = newerBounds && newerBounds.from <= today
	// The forward arrow stops at "no later window than today"; the back arrow stops once the
	// window it would land on ends before the earliest order (no orders: nowhere to go).
	const earliest = earliestOrderDate.get(userId).d
	const olderBounds = olderId ? windowBounds(userId, width, olderId, today) : null
	const hasOlder = olderBounds && earliest != null && olderBounds.to > earliest

	// One fetch for both cumulative series below -- the rows carry spend and saved together.
	const dailyRows = dailyRowsOver(userId, bounds.from, bounds.to, scope)
	const split = splitOver(userId, focus.from, focus.to, scope)
	// the chart splits its columns by the window's own top three categories, not the crumb's
	const chartSplit = narrowed ? splitOver(userId, bounds.from, bounds.to, scope) : split
	const stacked = chartSplit.slice(0, 3)

	return {
		window: {
			id, range: width, from: fromEpoch(bounds.from), to: fromEpoch(bounds.to - DAY),
			slice: { from: fromEpoch(focus.from), to: fromEpoch(focus.to - DAY) },
			axis: axisFor(bounds.from, bounds.to),
			spent: now.spent, saved: now.saved, orders: now.orders, median: medianOver(userId, focus.from, focus.to, now.orders, scope),
			leftOut: leftOutOver(userId, focus.from, focus.to, scope),
			pace: paceFor(focus.from, focus.to, today),
			/* Which point on the chart is today, or null when the window is entirely in the past
			   or entirely ahead. Day index, so a bucketed series maps it through its own cut. */
			todayIndex: todayIn(bounds.from, bounds.to, today),
			split,
			vendorSplit: vendorSplitOver(userId, focus.from, focus.to, scope),
			statusSplit: statusSplitOver(userId, focus.from, focus.to, scope),
			// The months the window holds, which a monthly budget is multiplied by.
			budgets: { months: monthsIn(focus.from, focus.to) },
			series: {
				current: cumulate(dailyRows, 'spend'),
				previous: previousBounds ? cumulate(dailyRowsOver(userId, previousBounds.from, previousBounds.to, scope), 'spend') : null,
				savedCumulative: cumulate(dailyRows, 'saved'),
				ordersCumulative: cumulate(dailyRows, 'orders'),
				...(STEPS.includes(step) ? { medians: stepMediansOver(userId, bounds.from, bounds.to, step, scope) } : {}),
				categories: stacked.map(entry => ({ id: entry.id, name: entry.name })),
				byCategory: categorySeriesOver(userId, bounds.from, bounds.to, stacked.map(entry => entry.id), scope)
			}
		},
		older: hasOlder ? olderId : null,
		newer: hasNewer ? newerId : null,
		// the day of the account's first order, where a range of all time starts
		firstOrder: earliest == null ? null : fromEpoch(earliest)
	}
}

/** The drill path and lens out of a query string. Unknown values filter nothing. */
export function filterOf(q) {
	const day = v => (dayOf(v) == null ? undefined : v)
	return {
		flow: FLOWS.includes(q.flow) ? q.flow : 'all',
		vendorId: q.vendorId || undefined,
		categoryId: q.categoryId || undefined,
		status: q.status || undefined,
		excluded: q.excluded === 'include' ? 'include' : undefined,
		from: day(q.from),
		to: day(q.to)
	}
}

/** The stretch of time a request's crumbs narrow its window to, and what else narrows it. */
function sliceOf(userId, query, day = todayIso()) {
	const { bounds } = resolveWindow(userId, query.range, query.windowId, toEpoch(day))
	const filter = filterOf(query)
	return { focus: focusOf(bounds, filter.from, filter.to), scope: scopeOf(filter) }
}

/** One page of the orders behind a slice, newest first, in the order list's row shape. */
export function sliceOrders(userId, query, day) {
	const { focus, scope } = sliceOf(userId, query, day)
	const where = `ot.user_id = @userId AND ot.date >= @from AND ot.date < @to${scope.and}`
	const params = { userId, from: focus.from, to: focus.to, ...scope.params }
	const matched = prepared(`SELECT COUNT(*) c FROM orders ot WHERE ${where}`).get(params).c
	const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(query.pageSize) || 25)))
	const page = Math.max(1, Math.floor(Number(query.page) || 1))
	const rows = prepared(`
		SELECT ${orderTotalsSelectList('ot')} FROM orders ot WHERE ${where}
		ORDER BY ot.date DESC, ot.created_at DESC, ot.rowid DESC
		LIMIT @limit OFFSET @offset
	`).all({ ...params, limit: size, offset: (page - 1) * size })
	return { orders: decorateOrderListRows(rows), matched }
}

const selectLastAdded = db.prepare('SELECT created_at AS at FROM orders WHERE rowid = (SELECT MAX(rowid) FROM orders WHERE user_id = ?)')
const countWithoutReceipt = db.prepare(`
	SELECT COUNT(*) c FROM orders ot
	WHERE ot.user_id = ? AND ot.status_type NOT IN ('cancelled', 'draft')
		AND NOT EXISTS (SELECT 1 FROM order_attachments a WHERE a.order_id = ot.id)
`)

const selectOrderedKey = db.prepare("SELECT key FROM statuses WHERE user_id = ? AND type = 'ordered'").pluck()
const countNotDelivered = db.prepare('SELECT COUNT(*) c FROM orders WHERE user_id = ? AND status = ? AND date <= ?')

const selectLimited = db.prepare('SELECT id, budget FROM categories WHERE user_id = ? AND budget > 0')
// what each limited category came to in each month, as Home's figures count it: what was paid
const selectLimitedMonths = db.prepare(`
	SELECT oc.category_id AS id, strftime('%Y-%m', ot.date, 'unixepoch') AS month,
		SUM(ot.total) AS spend
	FROM order_categories oc
	JOIN orders ot ON ot.id = oc.order_id
	JOIN categories c ON c.id = oc.category_id
	WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to
		AND ot.status_type NOT IN ('returned', 'cancelled', 'draft') AND ot.exclude_from_stats = 0 AND c.budget > 0
	GROUP BY oc.category_id, month
`)
const selectSummarySeen = db.prepare('SELECT month FROM user_monthly_summaries_seen WHERE user_id = ?')
const upsertSummarySeen = db.prepare(`
	INSERT INTO user_monthly_summaries_seen (user_id, month) VALUES (?, ?)
	ON CONFLICT (user_id) DO UPDATE SET month = excluded.month
`)

const selectCompareChoice = db.prepare('SELECT compare_month AS choice FROM user_settings WHERE user_id = ?')

/** The whole month a month is measured against: the one before it, or the same month a year
    earlier, as the reader chose. `month` is 'YYYY-MM'; answers that month's spend and order count. */
export function comparedMonth(userId, month) {
	const [y, m] = month.split('-').map(Number)
	const year = selectCompareChoice.get(userId)?.choice === 'year'
	const start = year ? Date.UTC(y - 1, m - 1, 1) : Date.UTC(y, m - 2, 1)
	const from = start / 1000
	const next = new Date(start)
	const to = Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 1) / 1000
	const totals = totalsOver(userId, from, to, scopeOf({ flow: 'expenses' }))
	return { month: fromEpoch(from).slice(0, 7), spent: totals.spent, orders: totals.orders }
}

/** Home's summary of the month before the reader's own (8b): what it came to, and each limited
    category's spend in it with how many of the twelve months up to it went over. */
export function monthlySummary(userId, day = todayIso()) {
	const [y, m] = day.split('-').map(Number)
	const from = Date.UTC(y, m - 2, 1) / 1000
	const to = Date.UTC(y, m - 1, 1) / 1000
	const month = fromEpoch(from).slice(0, 7)
	const totals = totalsOver(userId, from, to, scopeOf({ flow: 'expenses' }))
	const limited = selectLimited.all(userId)
	const budgetOf = new Map(limited.map(c => [c.id, c.budget]))
	const spendOf = new Map()
	const overs = new Map()
	for (const row of selectLimitedMonths.all({ userId, from: Date.UTC(y, m - 13, 1) / 1000, to })) {
		if (row.month === month) spendOf.set(row.id, row.spend)
		if (row.spend > budgetOf.get(row.id)) overs.set(row.id, (overs.get(row.id) ?? 0) + 1)
	}
	return {
		month, from: fromEpoch(from), to: fromEpoch(to - DAY),
		spent: totals.spent, saved: totals.saved, orders: totals.orders,
		compared: comparedMonth(userId, month),
		seen: selectSummarySeen.get(userId)?.month === month,
		limits: limited.map(c => ({ id: c.id, spend: spendOf.get(c.id) ?? 0, overs: overs.get(c.id) ?? 0 }))
	}
}

/** The reader put a month's summary away; it stays away until the next month's. */
export function markSummarySeen(userId, month) {
	if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month ?? ''))) return false
	upsertSummarySeen.run(userId, month)
	return true
}

// an order still waiting for delivery this many days after its date needs a look
const DELIVERY_DAYS = 14

/* What each counted rule of Needs a look reads (lib/looks.js). A rule that is switched off is not counted at all. */
const COUNTS = {
	late: (userId, day) => {
		const to = toEpoch(day) - DELIVERY_DAYS * DAY
		const status = selectOrderedKey.get(userId)
		return { count: status ? countNotDelivered.get(userId, status, to).c : 0, to: fromEpoch(to), status }
	},
	vendors: userId => ({ count: vendorsIn(lookalikePairs(userId)) }),
	receipt: userId => ({ count: countWithoutReceipt.get(userId).c })
}

/** What Home reads beyond the month: when an order was last added, and what needs a look. */
export function homeAttention(userId, day = todayIso()) {
	const looks = looksOf(userId)
	return {
		lastAdded: selectLastAdded.get(userId)?.at ?? null,
		things: Object.fromEntries(Object.entries(COUNTS).filter(([id]) => looks[id]).map(([id, count]) => [id, count(userId, day)]))
	}
}

const countDeliveredAndSaving = db.prepare(`
	SELECT COALESCE(SUM(ot.status_type = 'delivered'), 0) AS delivered, COALESCE(SUM(ot.saved >= 0.005), 0) AS saving
	FROM orders ot WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to${FLOW_WHERE.expenses} AND ot.exclude_from_stats = 0
`)
const selectLatestInPeriod = db.prepare(`
	SELECT ot.date, ot.total, ot.saved, v.name AS vendor,
		(SELECT MIN(c.name) FROM order_categories oc JOIN categories c ON c.id = oc.category_id WHERE oc.order_id = ot.id) AS category
	FROM orders ot JOIN vendors v ON v.id = ot.vendor_id
	WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to${FLOW_WHERE.expenses} AND ot.exclude_from_stats = 0
	ORDER BY ot.date DESC, ot.created_at DESC, ot.rowid DESC
	LIMIT @limit
`)

/** One stretch of days [from, to) as the status email reads it (20f): what was spent and saved,
    counted as Home counts it, the categories by amount and the latest orders. */
export function periodSummary(userId, from, to, latest = 5) {
	const scope = scopeOf({ flow: 'expenses' })
	const params = { userId, from, to }
	return {
		...totalsOver(userId, from, to, scope),
		...countDeliveredAndSaving.get(params),
		split: splitOver(userId, from, to, scope),
		latest: selectLatestInPeriod.all({ ...params, limit: latest })
	}
}

const selectLimitedNamed = db.prepare('SELECT id, name, budget FROM categories WHERE user_id = ? AND budget > 0 ORDER BY name')

/** The categories whose monthly limit the days [from, to) of one month went past, with their spend. */
export function limitsPassed(userId, from, to) {
	const spendOf = new Map(selectLimitedMonths.all({ userId, from, to }).map(r => [r.id, r.spend]))
	return selectLimitedNamed.all(userId)
		.map(c => ({ id: c.id, name: c.name, budget: c.budget, spend: spendOf.get(c.id) ?? 0 }))
		.filter(c => c.spend > c.budget)
}

/** How many vendors look like duplicates, orders are late and orders lack a receipt, for the rules switched on. */
export const attentionCounts = (userId, day) => homeAttention(userId, day).things
