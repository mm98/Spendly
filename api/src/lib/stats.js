import { db } from '../db.js'
import { cardRowsFor } from './prefs.js'
import { fromEpoch } from './dates.js'

/* Statistics, computed by real SQL aggregation over the user's own orders — SUM/GROUP BY
   within a [from, to) window, never a per-order JS loop and never a synthetic "spread a
   monthly total across days" derivation. A window is a calendar unit
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
	/* The unit fields are range-checked, not just shape-checked: `?windowId=2026-13` matches
	   the month pattern, indexes MONTH_NAMES[12] and threw a TypeError -- a 500 for a URL
	   anyone can type. Out of range answers null like a malformed id does, which is the same
	   reanchor-to-a-real-window fallback the caller already runs. */
	/* shortLabelFull is the unabbreviated form of shortLabel -- Statistics' card header
	   captions read this one unconditionally rather than shortLabel; the header row never runs
	   short of room for it (measured against the widest one, "busiest day: Saturday", down to
	   the narrowest width a card ever reaches, two-column or single). Only the month branch has
	   one worth spelling out -- "Aug" -> "August" -- so every other branch's shortLabel already
	   is its own full form and shortLabelFull just repeats it. */
	if (range === 'week') {
		const [, y, w] = /^(\d{4})-W(\d{2})$/.exec(id) ?? []
		if (!y || Number(w) < 1 || Number(w) > 53) return null
		const from = mondayOfIsoWeek(Number(y), Number(w))
		const shortLabel = `Week ${Number(w)}`
		return { from: from / 1000, to: from / 1000 + 7 * DAY, label: `Week ${Number(w)}, ${y}`, shortLabel, shortLabelFull: shortLabel }
	}
	if (range === 'month') {
		const [, y, m] = /^(\d{4})-(\d{2})$/.exec(id) ?? []
		if (!y || Number(m) < 1 || Number(m) > 12) return null
		const from = Date.UTC(Number(y), Number(m) - 1, 1) / 1000
		const to = Date.UTC(Number(y), Number(m), 1) / 1000
		return { from, to, label: `${MONTH_NAMES[Number(m) - 1]} ${y}`,
			shortLabel: MONTH_NAMES[Number(m) - 1].slice(0, 3), shortLabelFull: MONTH_NAMES[Number(m) - 1] }
	}
	if (range === 'quarter') {
		const [, y, q] = /^(\d{4})-Q([1-4])$/.exec(id) ?? []
		if (!y) return null
		const firstMonth = (Number(q) - 1) * 3
		const from = Date.UTC(Number(y), firstMonth, 1) / 1000
		const to = Date.UTC(Number(y), firstMonth + 3, 1) / 1000
		const shortLabel = `Q${q} ${y}`
		return { from, to, label: `Quarter ${q}, ${y}`, shortLabel, shortLabelFull: shortLabel }
	}
	if (range === 'year') {
		if (!/^\d{4}$/.test(id)) return null
		const y = Number(id)
		return { from: Date.UTC(y, 0, 1) / 1000, to: Date.UTC(y + 1, 0, 1) / 1000,
			label: String(y), shortLabel: String(y), shortLabelFull: String(y) }
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
	return { from, to, label: 'All time', shortLabel: 'all time', shortLabelFull: 'all time' }
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

export function currentWindowId(range) {
	return windowIdAt(range, Math.floor(Date.now() / 1000))
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
function reanchorWindowId(userId, width, id) {
	const was = rangeOfWindowId(id)
	const bounds = was && windowBounds(userId, was, id)
	if (!bounds) return currentWindowId(width)
	const today = Math.floor(Date.now() / 1000 / DAY) * DAY
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
function comparisonWindowId(userId, range, id, compare) {
	if (range === 'all') return null
	if (compare !== 'year') return shiftWindowId(range, id, -1)
	const bounds = windowBounds(userId, range, id)
	const at = new Date(bounds.from * 1000)
	const yearAgo = Date.UTC(at.getUTCFullYear() - 1, at.getUTCMonth(), at.getUTCDate()) / 1000
	return windowIdAt(range, yearAgo)
}

const selectWindowTotals = db.prepare(`
	SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS spent, COALESCE(SUM(saved), 0) AS saved,
		COALESCE(SUM(shipping), 0) AS shipping, COALESCE(SUM(retail), 0) AS retail
	FROM orders WHERE user_id = @userId AND date >= @from AND date < @to
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
	FROM orders WHERE user_id = @userId AND date >= @from AND date < @to
	GROUP BY dow
`)

function rhythmOver(userId, from, to) {
	const bySqliteDow = new Map(selectRhythm.all({ userId, from, to }).map(r => [r.dow, r.spend]))
	// SQLite's %w is Sunday=0..Saturday=6; the app's week starts Monday, so remap once here.
	const spend = WEEKDAY_TICKS.map((_, mondayFirstIndex) => bySqliteDow.get((mondayFirstIndex + 1) % 7) ?? 0)
	const total = spend.reduce((s, v) => s + v, 0)
	const most = Math.max(...spend, 0)
	return {
		/* A share of the busiest day, not a height: a pixel figure would be a presentation
		   decision taken where the data is, pinning the chart to whatever box that pixel count
		   happened to suit, and the Home card sits in a grid row sized by the category
		   breakdown beside it rather than by its own chart. A share avoids that -- the bar is
		   that percentage of whatever track it is given. */
		weekdays: WEEKDAY_TICKS.map((day, i) => ({
			day, dayFull: WEEKDAY_NAMES[i], spend: spend[i],
			share: most ? Math.round((spend[i] / most) * 1000) / 10 : 0,
			peak: most > 0 && spend[i] === most
		})),
		weekendShare: total ? Math.round(((spend[5] + spend[6]) / total) * 100) : 0,
		busiestDay: most > 0 ? WEEKDAY_NAMES[spend.indexOf(most)] : null,
		busiestDaySpend: most
	}
}

const FALLBACK_SPLIT_COLOURS = ['var(--donut-blue)', 'var(--green)', 'var(--donut-yellow)', 'var(--donut-purple)', '#45524C']
/* category_count -- how many categories share this order's total -- is the stored,
   trigger-maintained column on the order row, NOT a joined `GROUP BY order_id` over the
   whole table: that grouped subquery has no user or date bound SQLite can push inside it, so
   it counted every account's links to answer one window. On a 5.1M-order database that was
   ~1.9s per stats read, for any account; the stored count is ~8ms, identical rows. Same fix
   in lib/aggregate.js. */
const selectSplit = db.prepare(`
	SELECT c.id, c.name, c.colour,
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
function splitOver(userId, from, to, trueTotal, budgets) {
	const rows = selectSplit.all({ userId, from, to })
	const categorised = rows.reduce((s, r) => s + r.spend, 0)
	const total = trueTotal ?? categorised
	/* The window's budget for this category, where it has one -- the same numbers the budget
	   card is drawn from, joined here rather than recomputed, because the split is the one list
	   in the app that is already segmented by category and a reader looking at a category's
	   share is one question away from "against what". A category with no budget carries nulls
	   and the row says nothing extra; "Without category" has no id and so never matches.
	   README: Meters and progress. */
	const byBudget = budgets ? budgetsById(budgets) : new Map()
	const split = rows.map((r, i) => ({
		id: r.id, name: r.name, amount: r.spend, share: total ? (r.spend / total) * 100 : 0,
		colour: r.colour ?? FALLBACK_SPLIT_COLOURS[Math.min(i, FALLBACK_SPLIT_COLOURS.length - 1)],
		budget: byBudget.get(r.id)?.budget ?? null,
		budgetAllowed: byBudget.get(r.id)?.allowed ?? null,
		budgetUsed: byBudget.get(r.id)?.used ?? null,
		perMonth: byBudget.get(r.id)?.perMonth ?? null
	}))
	const uncategorised = total - categorised
	if (uncategorised > 0.005) {
		split.push({ id: null, name: 'Without category', amount: uncategorised,
			share: total ? (uncategorised / total) * 100 : 0, colour: 'var(--text-faint)' })
	}
	return split.sort((a, b) => b.amount - a.amount)
}

/* A vendor belongs to exactly one order at a time (unlike a category), so this is a plain
   GROUP BY with no division and no remainder row -- every order's total counts once, toward
   its one vendor, and the rows already sum to the window's real spend. */
const selectVendorSplit = db.prepare(`
	SELECT ot.vendor_id AS id, v.name, v.colour, SUM(ot.total) AS spend
	FROM orders ot JOIN vendors v ON v.id = ot.vendor_id
	WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to
	GROUP BY ot.vendor_id
	ORDER BY spend DESC
`)

/** Spend per vendor over a window, the vendor equivalent of `splitOver` above. `vendors.colour`
    is NOT NULL (every vendor gets one at creation, lib/palette.js), so this never needs the
    fallback palette a category's nullable colour does. */
function vendorSplitOver(userId, from, to, trueTotal) {
	const rows = selectVendorSplit.all({ userId, from, to })
	const total = trueTotal ?? rows.reduce((s, r) => s + r.spend, 0)
	return rows.map(r => ({
		id: r.id, name: r.name, amount: r.spend, share: total ? (r.spend / total) * 100 : 0,
		colour: r.colour
	}))
}

/* Every budgeted category, with the window's spend beside its monthly allowance. Not built
   from `split` above: split holds what the window actually spent, so a category with a budget
   and a quiet month drops out of it -- and out of the denominator with it, which is the
   defect the README's budget rule already names (two screens, one caption, different sets of
   allowances). Every category carrying a budget is a row here whether it was spent from or
   not. README: Meters and progress. */
/* One grouped pass over the window, joined back to the budgeted categories -- not a
   correlated subquery per category: that shape re-walked the entire date window once per
   budgeted category (SQLite drives the inner query from idx_orders_user_date, so its cost is
   windowOrders x budgetedCategories), and this runs on every stats read, summary calls
   included. Measured on a 50,000-order account with 9 budgeted categories: month 2.0ms ->
   0.5ms, year 20ms -> 3.9ms, all-time 378ms -> 72ms, identical rows. The LEFT JOIN is what
   keeps a budgeted category with a quiet window in the result at spend 0, which is this
   query's whole point (see the comment above budgetRowsOver). */
const selectBudgets = db.prepare(`
	SELECT c.id, c.name, c.colour, c.icon, c.icon_path AS iconPath, c.budget,
		COALESCE(agg.spend, 0) AS spend
	FROM categories c
	LEFT JOIN (
		SELECT oc.category_id AS category_id, SUM(ot.total * 1.0 / ot.category_count) AS spend
		FROM orders ot JOIN order_categories oc ON oc.order_id = ot.id
		WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to
		GROUP BY oc.category_id
	) agg ON agg.category_id = c.id
	WHERE c.user_id = @userId AND c.budget > 0
`)

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

/** The budget card's numbers for a window.

    A budget is a *monthly* allowance, and this page's window is any of five widths -- so the
    two are put on one scale before either is printed, and `months` is what does it. The
    allowance for the window is the monthly budget times the months in it: a quarter is three
    of them, a year twelve, a week about a fifth of one. `perMonth` is the other direction --
    the window's spend averaged back down to a month, which is what a year's row states beside
    a monthly budget, since 148.000 kr. against 4.500 kr. is two periods in one sentence and
    the reader has to divide by twelve to read it.

    `used` is the same ratio either way (spend/allowance is perMonth/budget), so the card can
    print the average and the meter can fill by the window without the two disagreeing. */
function budgetRowsOver(userId, from, to) {
	const months = monthsIn(from, to)
	const rows = selectBudgets.all({ userId, from, to }).map(r => ({
		id: r.id, name: r.name, colour: r.colour, icon: r.icon, iconPath: r.iconPath,
		budget: r.budget, allowed: r.budget * months, spend: r.spend,
		perMonth: months ? r.spend / months : 0,
		used: r.budget && months ? (r.spend / (r.budget * months)) * 100 : 0
	})).sort((a, b) => b.used - a.used || b.spend - a.spend)
	return { months, rows }
}

/** The same rows as the card's summary, keyed by category -- what the ring's legend joins
    against so a row there can state its share of budget without a second query or a second
    idea of what a budget covers over this window. */
const budgetsById = ({ rows }) => new Map(rows.map(r => [r.id, r]))

function budgetSummary({ months, rows }, rowLimit) {
	const allowed = rows.reduce((sum, r) => sum + r.allowed, 0)
	const spent = rows.reduce((sum, r) => sum + r.spend, 0)
	return {
		/* Exact, not rounded for the caption that prints it: every figure above is derived from
		   this number, so a rounded copy travelling beside them is a second, slightly different
		   month count for anyone re-deriving one from the other -- 0.23 of a month against the
		   0.2258 the allowance was actually computed from. The card rounds when it prints. */
		months,
		total: rows.length,
		over: rows.filter(r => r.spend > r.allowed).length,
		allowed, spent, used: allowed ? (spent / allowed) * 100 : 0,
		// The same cut every other card on the page takes, and the count above says what it hid.
		items: rows.slice(0, rowLimit)
	}
}

const selectDailyTotals = db.prepare(`
	SELECT date, COUNT(*) AS orders, SUM(total) AS spend, SUM(saved) AS saved FROM orders
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

/* LIMIT in the query, not a .slice() after it: the card renders the newest handful, and
   fetching every returned order in the window materialised 7,648 joined rows to keep 6 on an
   all-time read (20ms -> 13ms; the count the card also needs is its own query below, an index
   range read through idx_orders_user_status now that the index carries date). The id tie-break
   is the same rule the orders list sorts by, and here it also decides which returns survive
   the cut: dates are day-precise, so without it two runs -- or two plans -- of a window whose
   newest returns share a day could each keep a different six. */
const selectReturned = db.prepare(`
	SELECT ot.id, ot.date, ot.total, ot.saved, ot.refunded,
		v.name AS vendorName, v.initials AS vendorInitials, v.colour AS vendorColour
	FROM orders ot JOIN vendors v ON v.id = ot.vendor_id
	WHERE ot.user_id = @userId AND ot.status = 'Returned' AND ot.date >= @from AND ot.date < @to
	ORDER BY ot.date DESC, ot.id DESC
	LIMIT @limit
`)
const countReturnedIn = db.prepare(`
	SELECT COUNT(*) AS n FROM orders
	WHERE user_id = @userId AND status = 'Returned' AND date >= @from AND date < @to
`)

/* The account's returns, not the window's -- what the card's SEE RETURN HISTORY button stands
   on. The window's own count cannot answer it: a quiet month over a year of returns would hide
   a history that exists, and a fresh account would offer one that does not. */
const countReturnedEver = db.prepare(`
	SELECT COUNT(*) AS n FROM orders WHERE user_id = ? AND status = 'Returned'
`)

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six']
const countWord = n => COUNT_WORDS[n] ?? String(n)
/* No money is rendered here: figures travel as numbers with a currency code, not as finished
   strings, because the currency is the account's (settings.currency) and the grammar is the
   client's -- a server that formats an amount has to be told both. The client prints it. */

/* The returns in a window, as records rather than as a sentence about records: a list of
   vendors with amounts is the data-row shape the design system already draws every other place
   it appears, and a structured list lets the card scan, sort by eye, and click through to the
   order it names, none of which prose can do.

   A window can hold a lot of them -- a year held 40, which as one sentence was a wall of text
   and as 40 rows would be a wall of rows. The card is a summary with the full list one click
   behind it, so it carries the newest few and says how many there are; paging inside it would
   be a second orders list, with its own state, sitting next to the real one.
   README: Data rows. */
function returnsIn(userId, from, to) {
	// Five, once, read here. It is the same kind of card as the latest orders and the top
	// vendors, so it is the same number -- the account's, not this file's.
	const items = selectReturned.all({ userId, from, to, limit: cardRowsFor(userId) })
	return {
		total: countReturnedIn.get({ userId, from, to }).n,
		history: countReturnedEver.get(userId).n,
		items: items.map(r => ({
			// `saved` because a returned order is listed the way every other order is listed --
			// its total, and what it saved under it.
			id: r.id, date: fromEpoch(r.date), total: r.total, saved: r.saved, refunded: Boolean(r.refunded),
			vendor: { name: r.vendorName, initials: r.vendorInitials, colour: r.vendorColour }
		}))
	}
}

const KPI_DEFS = [
	{ label: 'Orders', goodUp: false, of: t => t.orders, value: t => String(t.orders) },
	{ label: 'Average order', goodUp: false, of: t => t.average, amount: t => t.average },
	{ label: 'Saved vs retail', goodUp: true, of: t => t.saved, amount: t => t.saved, note: t => `${Math.round(t.savedPercent)}% under retail prices` },
	{ label: 'Shipping', goodUp: false, of: t => t.shipping, amount: t => t.shipping, note: t => `${t.shippingShare.toFixed(1).replace('.', ',')}% of spend` }
]

function kpisFor(now, was, wasLabel) {
	return KPI_DEFS.map(kpi => {
		/* `amount` is a figure for the client to print in the account's currency; `value` is
		   already a string because a count is not money. Exactly one of the two is set. */
		const figure = kpi.amount ? { amount: kpi.amount(now) } : { value: kpi.value(now) }
		if (!was) return { label: kpi.label, ...figure, delta: null, trend: 'up', tone: 'neutral', note: kpi.note?.(now) ?? null }
		const nowVal = kpi.of(now), wasVal = kpi.of(was)
		const pct = wasVal ? Math.round((nowVal / wasVal - 1) * 100) : (nowVal ? 100 : 0)
		const direction = pct === 0 ? 'level' : pct < 0 ? 'down' : 'up'
		const delta = pct === 0 ? `level with ${wasLabel}` : `${Math.abs(pct)}% ${direction} vs ${wasLabel}`
		/* Three tones, one per thing a delta can mean: 'good' or 'bad' for a real move in
		   either direction, 'neutral' only for 'level' -- a tile that moved the wrong way must
		   not share the same grey as a tile with nothing to be up or down against. 'level' is
		   its own case rather than folded into bad, because holding still is not a regression,
		   and trend stays 'level' too so the card's own `trend === 'level'` branch can draw a
		   flat state instead of a rising arrow over a figure that has not moved. */
		const good = direction === (kpi.goodUp ? 'up' : 'down')
		return {
			label: kpi.label, ...figure, delta, trend: direction,
			tone: direction === 'level' ? 'neutral' : good ? 'good' : 'bad',
			note: kpi.note?.(now) ?? null
		}
	})
}

/** The last N windows of a range's width, oldest first, for the bar-column card beside the
    chart. A handful of small aggregate queries (N is 6 by default) — fine at this scale, and
    each window's total has to be its own query since a window's bounds aren't a fixed stride. */
function recentColumns(userId, range, id, currentSpent, count = 6) {
	const ids = [id]
	for (let i = 1; i < count; i++) {
		const prev = shiftWindowId(range, ids[0], -1)
		if (!prev) break
		ids.unshift(prev)
	}
	const columns = ids.map(windowId => {
		const bounds = windowBounds(userId, range, windowId)
		// The current window's total is the one getStats has already aggregated for the page's
		// own headline; only the prior windows are new questions.
		const spend = windowId === id ? currentSpent : totalsOver(userId, bounds.from, bounds.to).spent
		return { id: windowId, label: bounds.shortLabel, labelFull: bounds.shortLabelFull, spend }
	})
	const most = Math.max(...columns.map(c => c.spend), 0)
	const top = columns.reduce((best, c) => (c.spend > (best?.spend ?? -1) ? c : best), null)
	return {
		title: `Last ${countWord(columns.length)} ${range}${columns.length === 1 ? '' : 's'}`,
		/* top.spend > 0: reduce picks the first all-zero column otherwise, and the note named a
		   month as "the highest" on an account that had spent nothing at all. Spelled out --
		   this sits in a card header caption, and Statistics' own header row never runs out of
		   room for one (see the header caption note above windowBounds). */
		note: columns.length > 1 && top && top.spend > 0 ? `${top.labelFull} is the highest` : null,
		columns: columns.map(c => ({
			label: c.label, labelFull: c.labelFull, spend: c.spend,
			height: most ? Math.round((c.spend / most) * 100) : 0, current: c.id === id
		}))
	}
}

/** Where the current (still-running) window lands if the rest of it looks like the start —
    only meaningful for the window containing today; a past window is already complete. */
/** Today's day index inside [from, to), or null if today is outside it. */
function todayIn(from, to) {
	const now = Math.floor(Date.now() / 1000)
	return now >= from && now < to ? Math.floor((now - from) / DAY) : null
}

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

    A month is marked by its own unit rather than five fixed dates, so the marks fit whatever
    length the month actually is instead of printing the same positions under February as under
    July.

    Every mark carries the day it belongs to, as an index into the window's own daily series,
    not just its text. A list of five strings says nothing about where they go, so the axis drew
    them evenly and the last one landed on the right-hand edge — which is the end of the window,
    two days past the 29th of a 31-day month, about 22px away from the point the chart plots for
    it. The client turns the index into an x through the same bucketing it drew the line with,
    so a mark sits over its own day whatever the width does to the series. */
function axisFor(range, from, to) {
	const days = Math.round((to - from) / DAY)
	/* fullLabel defaults to label: a day-of-month number ("07") or a bare year ("2026") is
	   already its own full form, so only the month marks below pass one that differs. */
	const mark = (label, d, fullLabel = label) => ({ label, fullLabel, day: Math.round((d - from) / DAY) })
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
		marks.push(multiYear && (month === 0 || !marks.length)
			? mark(String(at.getUTCFullYear()), d)
			: mark(MONTH_ABBR[month], d, MONTH_NAMES[month]))
	}
	return marks
}

/** Full statistics for one window. `summary` skips the one sub-computation only the Statistics
    page reads — `recent`, up to 6 *extra* full aggregate queries, one per prior window, for a
    bar chart nothing else renders — so callers building a lighter "period" summary (Home,
    Orders overview) do not pay for a chart they throw away.

    `returns` is *not* behind that flag: it is one indexed range query, and Orders overview
    draws the same returns card Statistics does, so it needs `returns` in every summary it
    gets. Skip what costs; never skip what something renders. README: Empty states. */
export function getStats(userId, range, windowId, { summary = false, compare = 'previous' } = {}) {
	const width = ['week', 'month', 'quarter', 'year', 'all'].includes(range) ? range : 'month'
	/* 'all' has one window, so it has one id -- windowBounds ignores the id it is handed for
	   that width, so a month id left in the URL (`?range=all&period=2022-05`) cannot pin a
	   window that is not a month. */
	const id = width === 'all' ? 'all'
		: !windowId ? currentWindowId(width)
			: windowBounds(userId, width, windowId) ? windowId
				: reanchorWindowId(userId, width, windowId)
	const bounds = windowBounds(userId, width, id)

	const now = totalsOver(userId, bounds.from, bounds.to)
	const previousId = comparisonWindowId(userId, width, id, compare)
	const previousBounds = previousId ? windowBounds(userId, width, previousId) : null
	const was = previousBounds ? totalsOver(userId, previousBounds.from, previousBounds.to) : null
	/* The window's own short label ("Aug") is unambiguous against the *adjacent* window's --
	   different months read as different words. Against the same month a year back it is the
	   same word, so "vs Aug" would read as this window compared to itself. The abbreviated form
	   carries its year for exactly this case; the adjacent comparison keeps the shorter word it
	   already had, since two different months never needed one. */
	const previousShortLabel = previousBounds
		? (compare === 'year' ? abbrFor(width, previousId) : previousBounds.shortLabel)
		: null
	/* Spelled out for the header caption and the pace card's prose ("vs July", "the marker is
	   where July ended") -- both sit in contexts already proven to have the room (the header
	   caption note above windowBounds), unlike the KPI tiles' own "15% down vs Jul", which stay
	   on the plain short form above: a KPI tile is a narrower, unmeasured context and this is
	   not the word that was reported cramped there. Year-compare's own abbreviated "Aug 2025"
	   is untouched for the same reason -- nobody has asked for that one and it has not been
	   measured either. */
	const previousLabelFull = previousBounds
		? (compare === 'year' ? abbrFor(width, previousId) : previousBounds.shortLabelFull)
		: null

	const deltaPct = was && was.spent ? Math.round((now.spent / was.spent - 1) * 100) : null
	// "X% up/down" -- what it's up or down against ("vs Aug") is a separate field
	// (previousLabel), composed onto this client-side, so the hero states it once in its own
	// caption rather than each of the four KPI tiles repeating the sentence beside their own
	// bare percentage below.
	const deltaLabel = was ? `${Math.abs(deltaPct)}% ${deltaPct < 0 ? 'down' : 'up'}` : null

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

	// One computation, two readers: the budget card below and the ring's legend beside it. Two
	// cards on one page stating one fact is the rule that made them share it.
	const budgetRows = budgetRowsOver(userId, bounds.from, bounds.to)

	// The account's "Entries per card" setting, sent along so every ring legend drawn from this
	// window folds to the same length the dashboard's cards already use.
	const cardRows = cardRowsFor(userId)

	// One fetch for both cumulative series below -- the rows carry spend and saved together.
	const dailyRows = dailyRowsOver(userId, bounds.from, bounds.to)

	return {
		window: {
			id, range: width, from: fromEpoch(bounds.from), to: fromEpoch(bounds.to - DAY),
			label: bounds.label, shortLabel: bounds.shortLabel, shortLabelFull: bounds.shortLabelFull, spanName,
			unit: unitOf(width), abbr: abbrFor(width, id), compare,
			axis: axisFor(width, bounds.from, bounds.to),
			spent: now.spent, deltaLabel, deltaUp: deltaPct != null && deltaPct > 0,
			// Raw totals, not just the formatted kpis/deltaLabel strings above — a caller
			// composing its own presentation (Home's dashboard cards) needs the numbers.
			saved: now.saved, shipping: now.shipping, retail: now.saved + now.spent - now.shipping,
			orders: now.orders, average: now.average, savedPercent: now.savedPercent,
			previousTotal: was?.spent ?? null, previousLabel: previousLabelFull,
			pace: paceFor(width, bounds.from, bounds.to, now.spent),
			/* Which point on the chart is today, or null when the window is entirely in the past
			   or entirely ahead. Every line chart in the app draws a marker there and none of
			   them should have to work it out: "is today inside this window" is a fact about the
			   window, and three pages deriving it separately is three chances to get a paged-back
			   month wrong. Day index, so a bucketed series maps it through its own cut. */
			todayIndex: todayIn(bounds.from, bounds.to),
			rhythm: rhythmOver(userId, bounds.from, bounds.to),
			split: splitOver(userId, bounds.from, bounds.to, now.spent, budgetRows),
			// Vendors overview's own ring reads this the way Categories overview reads `split`
			// above -- unconditional for the same reason `split` is: a caller that does not
			// render it (Home, Orders overview) pays one more indexed GROUP BY, and a caller
			// that does (Vendors overview) is never left with a summary that lacks its window.
			vendorSplit: vendorSplitOver(userId, bounds.from, bounds.to, now.spent),
			budgets: budgetSummary(budgetRows, cardRows),
			cardRows,
			recent: summary ? null : recentColumns(userId, width, id, now.spent),
			returns: returnsIn(userId, bounds.from, bounds.to),
			kpis: kpisFor(now, was, previousShortLabel),
			series: {
				current: cumulate(dailyRows, 'spend'),
				previous: previousBounds ? seriesOver(userId, previousBounds.from, previousBounds.to) : null,
				savedCumulative: cumulate(dailyRows, 'saved')
			}
		},
		defaultId: currentWindowId(width),
		older: hasOlder ? olderId : null,
		newer: hasNewer ? newerId : null
	}
}

/** Home's hero: the current month, no pager and no width. Day-level (not
    cumulative) order counts and saved amounts, one point per day of the window, for the
    Orders/Saved tab toggle — the client buckets these down to a handful of columns
    (bucketsFor in Chart.jsx) once a window is too wide to draw a point per day. */
export function getHomeHero(userId) {
	/* The current month, and only that. It took a width and offered five, because Home's hero
	   carried Statistics' range chips -- two screens where a window is chosen, of which one has
	   a pager, a comparison, four tiles and a returns card to go with it and the other has a
	   card. The chips are gone from Home, so the parameter behind them goes too rather than
	   sitting here answering a question nothing asks. */
	const width = 'month'
	const id = currentWindowId(width)
	const bounds = windowBounds(userId, width, id)
	const now = totalsOver(userId, bounds.from, bounds.to)
	const days = dailyRowsOver(userId, bounds.from, bounds.to)
	const peak = days.reduce((most, day) => (day.spend > most.spend ? day : most), days[0] ?? { date: bounds.from, spend: 0 })

	return {
		label: bounds.label, shortLabel: bounds.shortLabel,
		todayIndex: todayIn(bounds.from, bounds.to),
		/* The window's own dates, inclusive, the same pair getStats answers. The card names a
		   stretch of time and its legend rows open the orders behind each slice, so the rows
		   need the stretch: without it a row under "Where it went • Aug" opened every order in
		   that category since the account was made. */
		from: fromEpoch(bounds.from), to: fromEpoch(bounds.to - DAY),
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
