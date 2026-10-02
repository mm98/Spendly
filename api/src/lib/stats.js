import { db } from '../db.js'
import { fromEpoch, toEpoch, todayIso } from './dates.js'

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
	if (range === 'all') return null
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
	if (compare !== 'year') return shiftWindowId(range, id, -1)
	const bounds = windowBounds(userId, range, id, today)
	const at = new Date(bounds.from * 1000)
	const yearAgo = Date.UTC(at.getUTCFullYear() - 1, at.getUTCMonth(), at.getUTCDate()) / 1000
	return windowIdAt(range, yearAgo)
}

const selectWindowTotals = db.prepare(`
	SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS spent, COALESCE(SUM(saved), 0) AS saved
	FROM orders WHERE user_id = @userId AND date >= @from AND date < @to
`)

function totalsOver(userId, from, to) {
	const r = selectWindowTotals.get({ userId, from, to })
	return { orders: r.orders, spent: r.spent, saved: r.saved, average: r.orders ? r.spent / r.orders : 0 }
}

/* category_count -- how many categories share this order's total -- is the stored,
   trigger-maintained column on the order row, NOT a joined `GROUP BY order_id` over the
   whole table: that grouped subquery has no user or date bound SQLite can push inside it, so
   it counted every account's links to answer one window. On a 5.1M-order database that was
   ~1.9s per stats read, for any account; the stored count is ~8ms, identical rows. Same fix
   in lib/aggregate.js. */
const selectSplit = db.prepare(`
	SELECT c.id, c.name,
		SUM(ot.total * 1.0 / ot.category_count) AS spend
	FROM order_categories oc
	JOIN orders ot ON ot.id = oc.order_id
	JOIN categories c ON c.id = oc.category_id
	WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to
	GROUP BY c.id
	ORDER BY spend DESC
`)

/** `trueTotal` is the window's real spend (every order, categorised or not) -- passed in
    rather than summed from `rows` here, because an order with no category at all never joins
    into `rows` to begin with. Sharing against the categorised sum instead of the true total is
    exactly how a category read "50% of expenses" while a same-sized uncategorised order sat
    beside it counting for nothing: the two numbers agreed with each other and disagreed with
    the window. The remainder becomes its own "Without category" row rather than vanishing --
    the ring and the list beside it are drawn from the one list, so nothing here can silently
    add up to less than the total both claim to break down. */
function splitOver(userId, from, to, trueTotal) {
	const rows = selectSplit.all({ userId, from, to })
	const categorised = rows.reduce((s, r) => s + r.spend, 0)
	const total = trueTotal ?? categorised
	const split = rows.map(r => ({ id: r.id, name: r.name, amount: r.spend, share: total ? (r.spend / total) * 100 : 0 }))
	const uncategorised = total - categorised
	if (uncategorised > 0.005) {
		split.push({ id: null, name: 'Without category', amount: uncategorised,
			share: total ? (uncategorised / total) * 100 : 0 })
	}
	return split.sort((a, b) => b.amount - a.amount)
}

/* A vendor belongs to exactly one order at a time (unlike a category), so this is a plain
   GROUP BY with no division and no remainder row -- every order's total counts once, toward
   its one vendor, and the rows already sum to the window's real spend. */
const selectVendorSplit = db.prepare(`
	SELECT ot.vendor_id AS id, v.name, SUM(ot.total) AS spend
	FROM orders ot JOIN vendors v ON v.id = ot.vendor_id
	WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to
	GROUP BY ot.vendor_id
	ORDER BY spend DESC
`)

/** Spend per vendor over a window, the vendor equivalent of `splitOver` above. */
function vendorSplitOver(userId, from, to) {
	return selectVendorSplit.all({ userId, from, to }).map(r => ({ id: r.id, name: r.name, amount: r.spend }))
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

const selectDailyTotals = db.prepare(`
	SELECT date, SUM(total) AS spend, SUM(saved) AS saved FROM orders
	WHERE user_id = @userId AND date >= @from AND date < @to
	GROUP BY date ORDER BY date
`)

/** One row per day of [from, to), zero-filled where nothing was bought -- what the running
    totals below are summed from. */
function dailyRowsOver(userId, from, to) {
	const byDate = new Map(selectDailyTotals.all({ userId, from, to }).map(r => [r.date, r]))
	const rows = []
	for (let d = from; d < to; d += DAY) {
		const r = byDate.get(d)
		rows.push({ date: d, spend: r?.spend ?? 0, saved: r?.saved ?? 0 })
	}
	return rows
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

function seriesOver(userId, from, to, key = 'spend') {
	return cumulate(dailyRowsOver(userId, from, to), key)
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

/** Statistics for one window: the fields Home, Statistics, Categories and a vendor's page read. */
export function getStats(userId, range, windowId, { compare = 'previous', today: day = todayIso() } = {}) {
	const today = toEpoch(day)
	const width = ['week', 'month', 'quarter', 'year', 'all'].includes(range) ? range : 'month'
	/* 'all' has one window, so it has one id -- windowBounds ignores the id it is handed for
	   that width, so a month id left in the URL (`?range=all&period=2022-05`) cannot pin a
	   window that is not a month. */
	const id = width === 'all' ? 'all'
		: !windowId ? windowIdAt(width, today)
			: windowBounds(userId, width, windowId, today) ? windowId
				: reanchorWindowId(userId, width, windowId, today)
	const bounds = windowBounds(userId, width, id, today)

	const now = totalsOver(userId, bounds.from, bounds.to)
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
	const dailyRows = dailyRowsOver(userId, bounds.from, bounds.to)

	return {
		window: {
			id, range: width, from: fromEpoch(bounds.from), to: fromEpoch(bounds.to - DAY),
			axis: axisFor(bounds.from, bounds.to),
			spent: now.spent, saved: now.saved, orders: now.orders, average: now.average,
			pace: paceFor(bounds.from, bounds.to, today),
			/* Which point on the chart is today, or null when the window is entirely in the past
			   or entirely ahead. Day index, so a bucketed series maps it through its own cut. */
			todayIndex: todayIn(bounds.from, bounds.to, today),
			split: splitOver(userId, bounds.from, bounds.to, now.spent),
			vendorSplit: vendorSplitOver(userId, bounds.from, bounds.to),
			// The months the window holds, which a monthly budget is multiplied by.
			budgets: { months: monthsIn(bounds.from, bounds.to) },
			series: {
				current: cumulate(dailyRows, 'spend'),
				previous: previousBounds ? seriesOver(userId, previousBounds.from, previousBounds.to) : null,
				savedCumulative: cumulate(dailyRows, 'saved')
			}
		},
		older: hasOlder ? olderId : null,
		newer: hasNewer ? newerId : null
	}
}
