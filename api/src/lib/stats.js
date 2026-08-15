import { db } from '../db.js'
import { fromEpoch } from './dates.js'

/* Statistics, computed by real SQL aggregation over the user's own orders — SUM/GROUP BY
   within a [from, to) window, never a per-order JS loop and never the old phantom store's
   synthetic "spread a monthly total across days" derivation. A window is a calendar unit
   (week/month/quarter/year) or the whole of a user's own order history ("all"), addressed by a
   windowId the chips-and-pager UI can page through. All date arithmetic below is UTC, since
   these are calendar dates rather than moments — running them through a local clock would date
   an evening in one timezone to tomorrow. */

const DAY = 86400
const pad = (n, len = 2) => String(n).padStart(len, '0')
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

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

/** The [from, to) epoch bounds of one window, plus display labels. `all` spans the user's own
    order history (or just today, if they have none yet) rather than a fixed demo range. */
export function windowBounds(userId, range, id) {
	if (range === 'week') {
		const [, y, w] = /^(\d{4})-W(\d{2})$/.exec(id) ?? []
		if (!y) return null
		const from = mondayOfIsoWeek(Number(y), Number(w))
		return { from: from / 1000, to: from / 1000 + 7 * DAY, label: `Week ${Number(w)}, ${y}`, shortLabel: `Week ${Number(w)}` }
	}
	if (range === 'month') {
		const [, y, m] = /^(\d{4})-(\d{2})$/.exec(id) ?? []
		if (!y) return null
		const from = Date.UTC(Number(y), Number(m) - 1, 1) / 1000
		const to = Date.UTC(Number(y), Number(m), 1) / 1000
		return { from, to, label: `${MONTH_NAMES[Number(m) - 1]} ${y}`, shortLabel: MONTH_NAMES[Number(m) - 1].slice(0, 3) }
	}
	if (range === 'quarter') {
		const [, y, q] = /^(\d{4})-Q(\d)$/.exec(id) ?? []
		if (!y) return null
		const firstMonth = (Number(q) - 1) * 3
		const from = Date.UTC(Number(y), firstMonth, 1) / 1000
		const to = Date.UTC(Number(y), firstMonth + 3, 1) / 1000
		return { from, to, label: `Quarter ${q}, ${y}`, shortLabel: `Q${q} ${y}` }
	}
	if (range === 'year') {
		if (!/^\d{4}$/.test(id)) return null
		const y = Number(id)
		return { from: Date.UTC(y, 0, 1) / 1000, to: Date.UTC(y + 1, 0, 1) / 1000, label: String(y), shortLabel: String(y) }
	}
	// 'all': the user's whole order history through today, at least a week wide. Every other
	// range has a fixed calendar width regardless of how little data is in it, which is what
	// lets one order sit amid real zero-days and draw as a spike -- 'all' is the only one sized
	// off the data itself, so an account whose first order was placed today collapsed it to a
	// single day. A single day-level point has no "before" to rise from, so the line drew flat
	// across the whole card instead of the spike every other range shows for the same order.
	const earliest = earliestOrderDate.get(userId).d
	const to = Math.floor(Date.now() / 1000 / DAY) * DAY + DAY
	const from = Math.min(earliest ?? to - DAY, to - 7 * DAY)
	return { from, to, label: 'All time', shortLabel: 'all time' }
}

export function currentWindowId(range) {
	const now = new Date()
	if (range === 'week') { const { year, week } = isoWeekOf(now.getTime()); return `${year}-W${pad(week)}` }
	if (range === 'month') return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`
	if (range === 'quarter') return `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`
	if (range === 'year') return String(now.getUTCFullYear())
	return 'all'
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

const selectWindowTotals = db.prepare(`
	SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS spent, COALESCE(SUM(saved), 0) AS saved,
		COALESCE(SUM(shipping), 0) AS shipping, COALESCE(SUM(retail), 0) AS retail
	FROM order_totals WHERE user_id = @userId AND date >= @from AND date < @to
`)

function totalsOver(userId, from, to) {
	const r = selectWindowTotals.get({ userId, from, to })
	return {
		orders: r.orders, spent: r.spent, saved: r.saved, shipping: r.shipping,
		average: r.orders ? r.spent / r.orders : 0,
		savedPercent: r.retail > 0 ? (r.saved / r.retail) * 100 : 0,
		shippingShare: r.spent > 0 ? (r.shipping / r.spent) * 100 : 0
	}
}

const WEEKDAY_TICKS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const selectRhythm = db.prepare(`
	SELECT CAST(strftime('%w', date, 'unixepoch') AS INTEGER) AS dow, SUM(total) AS spend
	FROM order_totals WHERE user_id = @userId AND date >= @from AND date < @to
	GROUP BY dow
`)

function rhythmOver(userId, from, to) {
	const bySqliteDow = new Map(selectRhythm.all({ userId, from, to }).map(r => [r.dow, r.spend]))
	// SQLite's %w is Sunday=0..Saturday=6; the app's week starts Monday, so remap once here.
	const spend = WEEKDAY_TICKS.map((_, mondayFirstIndex) => bySqliteDow.get((mondayFirstIndex + 1) % 7) ?? 0)
	const total = spend.reduce((s, v) => s + v, 0)
	const most = Math.max(...spend, 0)
	return {
		/* `home` and `stats` carry the same real bar heights — the two contexts that read this
		   (the Home dashboard card and the Statistics page) draw at different chart heights but
		   there is one real weekday-spend shape behind both, not two authored ones. */
		weekdays: WEEKDAY_TICKS.map((day, i) => {
			const height = most ? Math.round((spend[i] / most) * 70) : 0
			return { day, stats: height, home: height, peak: most > 0 && spend[i] === most }
		}),
		weekendShare: total ? Math.round(((spend[5] + spend[6]) / total) * 100) : 0,
		busiestDay: most > 0 ? WEEKDAY_NAMES[spend.indexOf(most)] : null,
		busiestDaySpend: most
	}
}

const FALLBACK_SPLIT_COLOURS = ['var(--donut-blue)', 'var(--green)', 'var(--donut-yellow)', 'var(--donut-purple)', '#45524C']
const selectSplit = db.prepare(`
	SELECT c.id, c.name, c.colour,
		SUM(ot.total * 1.0 / cc.cat_count) AS spend
	FROM order_categories oc
	JOIN order_totals ot ON ot.id = oc.order_id
	JOIN categories c ON c.id = oc.category_id
	JOIN (SELECT order_id, COUNT(*) AS cat_count FROM order_categories GROUP BY order_id) cc ON cc.order_id = oc.order_id
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
	const split = rows.map((r, i) => ({
		id: r.id, name: r.name, amount: r.spend, share: total ? (r.spend / total) * 100 : 0,
		colour: r.colour ?? FALLBACK_SPLIT_COLOURS[Math.min(i, FALLBACK_SPLIT_COLOURS.length - 1)]
	}))
	const uncategorised = total - categorised
	if (uncategorised > 0.005) {
		split.push({ id: null, name: 'Without category', amount: uncategorised,
			share: total ? (uncategorised / total) * 100 : 0, colour: 'var(--text-faint)' })
	}
	return split.sort((a, b) => b.amount - a.amount)
}

const selectDailyTotals = db.prepare(`
	SELECT date, COUNT(*) AS orders, SUM(total) AS spend, SUM(saved) AS saved FROM order_totals
	WHERE user_id = @userId AND date >= @from AND date < @to
	GROUP BY date ORDER BY date
`)

/** One row per day of [from, to), zero-filled where nothing was bought — the non-cumulative
    values a day-by-day chart (Home's hero) plots, as opposed to seriesOver's running total
    (Statistics' chart). Both read the same query; this just doesn't sum forward. */
function dailyRowsOver(userId, from, to) {
	const byDate = new Map(selectDailyTotals.all({ userId, from, to }).map(r => [r.date, r]))
	const rows = []
	for (let d = from; d < to; d += DAY) {
		const r = byDate.get(d)
		rows.push({ date: d, spend: r?.spend ?? 0, orders: r?.orders ?? 0, saved: r?.saved ?? 0 })
	}
	return rows
}

/** The running-total line a window's chart draws — spend by default, or saved for the savings
    growth chart, both from the same daily rows. */
function seriesOver(userId, from, to, key = 'spend') {
	const points = []
	let sum = 0
	for (const row of dailyRowsOver(userId, from, to)) { sum += row[key]; points.push(sum) }
	return points
}

const selectReturned = db.prepare(`
	SELECT ot.id, ot.date, ot.total, ot.refunded,
		v.name AS vendorName, v.initials AS vendorInitials, v.colour AS vendorColour
	FROM order_totals ot JOIN vendors v ON v.id = ot.vendor_id
	WHERE ot.user_id = @userId AND ot.status = 'Returned' AND ot.date >= @from AND ot.date < @to
	ORDER BY ot.date DESC
`)

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six']
const countWord = n => COUNT_WORDS[n] ?? String(n)
const krLabel = n => Math.round(n).toLocaleString('da-DK') + ' kr.'

/* The returns in a window, as records rather than as a sentence about records.

   This used to answer one string: every return rendered into prose and joined with semicolons,
   which reads for one return and turns into a CSV line dropped into a paragraph at four --
   "Four returns in Aug: Proshop on 2026-08-09: 1.510 kr.; Power on 2026-08-07: 669 kr.; ...".
   Two things were wrong with it beyond the run-on. Dates arrived as raw ISO, where every other
   list in this app writes "9 August". And a list of vendors with amounts is the data-row shape
   the design system already has, drawn every other place it appears -- composing it into prose
   here meant the one card that lists orders could not be scanned, sorted by eye, or clicked
   through to the order it names.

   A window can hold a lot of them -- a year held 40, which as one sentence was a wall of text
   and as 40 rows would be a wall of rows. The card is a summary with the full list one click
   behind it, so it carries the newest few and says how many there are; paging inside it would
   be a second orders list, with its own state, sitting next to the real one.
   README: Data rows. */
const RETURNS_SHOWN = 5

function returnsIn(userId, from, to) {
	const all = selectReturned.all({ userId, from, to })
	return {
		total: all.length,
		items: all.slice(0, RETURNS_SHOWN).map(r => ({
			id: r.id, date: fromEpoch(r.date), total: r.total, refunded: Boolean(r.refunded),
			vendor: { name: r.vendorName, initials: r.vendorInitials, colour: r.vendorColour }
		}))
	}
}

const KPI_DEFS = [
	{ label: 'Orders', goodUp: false, of: t => t.orders, value: t => String(t.orders) },
	{ label: 'Average order', goodUp: false, of: t => t.average, value: t => krLabel(t.average) },
	{ label: 'Saved vs retail', goodUp: true, of: t => t.saved, value: t => krLabel(t.saved), note: t => `${Math.round(t.savedPercent)}% under retail prices` },
	{ label: 'Shipping', goodUp: false, of: t => t.shipping, value: t => krLabel(t.shipping), note: t => `${t.shippingShare.toFixed(1).replace('.', ',')}% of spend` }
]

function kpisFor(now, was, wasLabel) {
	return KPI_DEFS.map(kpi => {
		if (!was) return { label: kpi.label, value: kpi.value(now), delta: null, trend: 'up', tone: 'neutral', note: kpi.note?.(now) ?? null }
		const nowVal = kpi.of(now), wasVal = kpi.of(was)
		const pct = wasVal ? Math.round((nowVal / wasVal - 1) * 100) : (nowVal ? 100 : 0)
		const direction = pct === 0 ? 'level' : pct < 0 ? 'down' : 'up'
		const delta = pct === 0 ? `level with ${wasLabel}` : `${Math.abs(pct)}% ${direction} vs ${wasLabel}`
		/* Three tones, one per thing a delta can mean. It used to be two: anything that was not
		   the good direction came back 'neutral', so a tile that moved the wrong way was printed
		   in the same grey as a tile with nothing to be up or down against -- opposite messages,
		   one colour. 'level' is its own case rather than folded into bad, because holding still
		   is not a regression.

		   trend stays 'level' too. Mapping it to 'up' made the card's own `trend === 'level'`
		   branch unreachable, so a tile reading "level with July" drew a rising arrow over a
		   figure that had not moved. */
		const good = direction === (kpi.goodUp ? 'up' : 'down')
		return {
			label: kpi.label, value: kpi.value(now), delta, trend: direction,
			tone: direction === 'level' ? 'neutral' : good ? 'good' : 'bad',
			note: kpi.note?.(now) ?? null
		}
	})
}

/** The last N windows of a range's width, oldest first, for the bar-column card beside the
    chart. A handful of small aggregate queries (N is 6 by default) — fine at this scale, and
    each window's total has to be its own query since a window's bounds aren't a fixed stride. */
function recentColumns(userId, range, id, count = 6) {
	const ids = [id]
	for (let i = 1; i < count; i++) {
		const prev = shiftWindowId(range, ids[0], -1)
		if (!prev) break
		ids.unshift(prev)
	}
	const columns = ids.map(windowId => {
		const bounds = windowBounds(userId, range, windowId)
		const spend = totalsOver(userId, bounds.from, bounds.to).spent
		return { id: windowId, label: bounds.shortLabel, spend }
	})
	const most = Math.max(...columns.map(c => c.spend), 0)
	const top = columns.reduce((best, c) => (c.spend > (best?.spend ?? -1) ? c : best), null)
	return {
		title: `Last ${countWord(columns.length)} ${range}${columns.length === 1 ? '' : 's'}`,
		note: columns.length > 1 && top ? `${top.label} is the highest` : null,
		columns: columns.map(c => ({ label: c.label, height: most ? Math.round((c.spend / most) * 100) : 0, current: c.id === id }))
	}
}

/** Where the current (still-running) window lands if the rest of it looks like the start —
    only meaningful for the window containing today; a past window is already complete. */
function paceFor(range, from, to, spent) {
	const now = Math.floor(Date.now() / 1000)
	if (now < from || now >= to) return { running: false, projected: spent, daysIn: Math.round((to - from) / DAY) }
	const daysIn = Math.floor((now - from) / DAY) + 1
	const unitDays = Math.round((to - from) / DAY)
	return { running: true, daysIn, unitDays, projected: unitDays ? (spent / daysIn) * unitDays : spent }
}

const MONTH_ABBR = MONTH_NAMES.map(m => m.slice(0, 3))

/** What the pager's arrows call their own step — a calendar unit, or "range" for `all`, which
    has no unit and pages nowhere. */
const unitOf = range => (range === 'all' ? 'range' : range)

/** The short form (no year) used as a compact caption — the SpendGauge's centre label, and
    the tick under a bar-chart column elsewhere. */
function tickFor(range, id) {
	if (range === 'week') return 'W' + Number(/-W(\d{2})$/.exec(id)[1])
	if (range === 'month') return MONTH_ABBR[Number(id.slice(5, 7)) - 1]
	if (range === 'quarter') return 'Q' + id.slice(6)
	if (range === 'year') return id
	return 'All'
}

/** The short form with its year — what the pager band falls back to when it's too narrow for
    the full label ("Week 31, 2026" -> "W31 2026"). */
function abbrFor(range, id) {
	if (range === 'week') { const [, y, w] = /^(\d{4})-W(\d{2})$/.exec(id); return `W${Number(w)} ${y}` }
	if (range === 'month') return `${MONTH_ABBR[Number(id.slice(5, 7)) - 1]} ${id.slice(0, 4)}`
	if (range === 'quarter') return `Q${id.slice(6)} ${id.slice(0, 4)}`
	if (range === 'year') return id
	return 'All time'
}

/** The x-axis marks under the main chart — every day of a window that has days in it, and every
    month of one too wide for that.

    A window is marked in its own unit. A week is seven days, a month is the 28 to 31 it actually
    has, a quarter is its three months and a year its twelve; "all time" is the months it spans.
    How many of those there is room to print is the axis's question and not this one's (see
    fitMarks) — this side says what the marks *are*, the width says how many survive.

    A month used to be marked 01/08/15/22/29: five fixed dates, no unit at all, the same five
    under February as under July, and the 29 printed under a month that has 28 days.

    Every mark carries the day it belongs to, as an index into the window's own daily series,
    not just its text. A list of five strings says nothing about where they go, so the axis drew
    them evenly and the last one landed on the right-hand edge — which is the end of the window,
    two days past the 29th of a 31-day month, about 22px away from the point the chart plots for
    it. The client turns the index into an x through the same bucketing it drew the line with,
    so a mark sits over its own day whatever the width does to the series. */
function axisFor(range, from, to) {
	const days = Math.round((to - from) / DAY)
	const mark = (label, d) => ({ label, day: Math.round((d - from) / DAY) })
	// A month is the widest window still drawn a day at a time, so 31 is the most marks this can
	// return in days -- an axis the width can thin, rather than a comb it cannot.
	if (days <= 31) {
		const marks = []
		for (let d = from; d < to; d += DAY) marks.push(mark(pad(new Date(d * 1000).getUTCDate()), d))
		return marks
	}
	/* One mark per month the window spans, on that month's first day inside it. A span that
	   crosses a year names the year instead of "Jan": three years of records otherwise print
	   Jan three times, which is one label for three different marks — ambiguous to read, and
	   two of them silently dropped when the axis keyed its marks by their text. */
	const multiYear = new Date(from * 1000).getUTCFullYear() !== new Date((to - DAY) * 1000).getUTCFullYear()
	const marks = []
	let last = null
	for (let d = from; d < to; d += DAY) {
		const at = new Date(d * 1000)
		const month = at.getUTCMonth()
		if (month === last) continue
		last = month
		marks.push(mark(multiYear && (month === 0 || !marks.length) ? String(at.getUTCFullYear())
			: MONTH_ABBR[month], d))
	}
	return marks
}

/** Full statistics for one window. `summary` skips the one sub-computation only the Statistics
    page reads — `recent`, up to 6 *extra* full aggregate queries, one per prior window, for a
    bar chart nothing else renders — so callers building a lighter "period" summary (Home,
    Orders overview) do not pay for a chart they throw away.

    `returns` is *not* behind that flag, and used to be. It is one indexed range query, and
    Orders overview draws the same returns card Statistics does: the flag existed to skip
    expensive work, so hanging a card's only data source on it meant Orders overview asked for
    a summary, got `returns: null`, and drew a permanent empty state over a month that had four.
    Skip what costs; never skip what something renders. README: Empty states. */
export function getStats(userId, range, windowId, { summary = false } = {}) {
	const width = ['week', 'month', 'quarter', 'year', 'all'].includes(range) ? range : 'month'
	const id = windowId && windowBounds(userId, width, windowId) ? windowId : currentWindowId(width)
	const bounds = windowBounds(userId, width, id)

	const now = totalsOver(userId, bounds.from, bounds.to)
	const previousId = shiftWindowId(width, id, -1)
	const previousBounds = previousId ? windowBounds(userId, width, previousId) : null
	const was = previousBounds ? totalsOver(userId, previousBounds.from, previousBounds.to) : null

	const deltaPct = was && was.spent ? Math.round((now.spent / was.spent - 1) * 100) : null
	const deltaLabel = was
		? (deltaPct === 0 ? `level with ${previousBounds.shortLabel}` : `${Math.abs(deltaPct)}% ${deltaPct < 0 ? 'down' : 'up'} vs ${previousBounds.shortLabel}`)
		: null

	const spanName = width === 'all' ? 'the records' : bounds.shortLabel
	const olderId = shiftWindowId(width, id, -1)
	const newerId = shiftWindowId(width, id, 1)
	const newerBounds = newerId ? windowBounds(userId, width, newerId) : null
	const hasNewer = newerBounds && newerBounds.from <= Math.floor(Date.now() / 1000)
	// The forward arrow already stops at "no later window than today" -- the back arrow had no
	// matching floor, so it stepped calendar units back forever with nothing behind them, past
	// whatever order history actually exists. Stop it once the window it would land on ends
	// before the earliest order was ever placed (a user with no orders at all has nowhere to
	// page back to either).
	const earliest = earliestOrderDate.get(userId).d
	const olderBounds = olderId ? windowBounds(userId, width, olderId) : null
	const hasOlder = olderBounds && earliest != null && olderBounds.to > earliest

	return {
		window: {
			id, range: width, from: fromEpoch(bounds.from), to: fromEpoch(bounds.to - DAY),
			label: bounds.label, shortLabel: bounds.shortLabel, spanName,
			unit: unitOf(width), tick: tickFor(width, id), abbr: abbrFor(width, id),
			axis: axisFor(width, bounds.from, bounds.to),
			spent: now.spent, deltaLabel, deltaUp: deltaPct != null && deltaPct > 0,
			// Raw totals, not just the formatted kpis/deltaLabel strings above — a caller
			// composing its own presentation (Home's dashboard cards) needs the numbers.
			saved: now.saved, shipping: now.shipping, retail: now.saved + now.spent - now.shipping,
			orders: now.orders, average: now.average, savedPercent: now.savedPercent,
			previousTotal: was?.spent ?? null, previousLabel: previousBounds?.shortLabel ?? null,
			pace: paceFor(width, bounds.from, bounds.to, now.spent),
			rhythm: rhythmOver(userId, bounds.from, bounds.to),
			split: splitOver(userId, bounds.from, bounds.to, now.spent),
			recent: summary ? null : recentColumns(userId, width, id),
			returns: returnsIn(userId, bounds.from, bounds.to),
			kpis: kpisFor(now, was, previousBounds?.shortLabel),
			series: {
				current: seriesOver(userId, bounds.from, bounds.to),
				previous: previousBounds ? seriesOver(userId, previousBounds.from, previousBounds.to) : null,
				savedCumulative: seriesOver(userId, bounds.from, bounds.to, 'saved')
			}
		},
		defaultId: currentWindowId(width),
		older: hasOlder ? olderId : null,
		newer: hasNewer ? newerId : null
	}
}

/** Home's hero: always the newest window of the chosen width (no pager). Day-level (not
    cumulative) order counts and saved amounts, one point per day of the window, for the
    Orders/Saved tab toggle — the client buckets these down to a handful of columns
    (bucketsFor in Chart.jsx) once a window is too wide to draw a point per day. */
export function getHomeHero(userId, range) {
	const width = ['week', 'month', 'quarter', 'year', 'all'].includes(range) ? range : 'month'
	const id = currentWindowId(width)
	const bounds = windowBounds(userId, width, id)
	const now = totalsOver(userId, bounds.from, bounds.to)
	const days = dailyRowsOver(userId, bounds.from, bounds.to)
	const peak = days.reduce((most, day) => (day.spend > most.spend ? day : most), days[0] ?? { date: bounds.from, spend: 0 })

	return {
		range: width, label: bounds.label, shortLabel: bounds.shortLabel,
		// No orderCount: it was the figure on the hero's Orders tab, and both went with the
		// change that put spend on the chart instead of a count.
		spent: now.spent, saved: now.saved, savedPercent: now.savedPercent,
		/* Spend per day, not orders per day. The card's headline is the window's spend and
		   its chart plotted a count instead, so the biggest number on Home was drawn by a
		   line that never showed it -- and a count answers a question nobody has: three
		   orders of 40 kr. and three of 4.000 kr. drew the same chart. */
		series: { spend: days.map(d => d.spend), saved: days.map(d => d.saved) },
		/* The same marks Statistics draws under its own chart. The hero had none at all -- the
		   one chart in the app with no x-axis, so its peaks sat at no date a reader could name.
		   It is computed here rather than in the page because only this side knows the window's
		   real bounds, and the five widths need five different sets of marks: days for a week,
		   its own days for a month, month names for anything wider. */
		axis: axisFor(width, bounds.from, bounds.to),
		peak: { date: fromEpoch(peak.date), spend: peak.spend }
	}
}
