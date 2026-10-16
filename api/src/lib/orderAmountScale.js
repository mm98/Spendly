import { db } from '../db.js'

/* The order list's Amount filter (2b) is spaced by order count, not by kroner: each step covers
   the same share of the account's orders, so one very large order takes the last step instead
   of pushing every everyday order into the first few. Orders left out of statistics are listed
   and filtered like any other, but take no part in where the steps fall. */

// a smaller set has too few orders for a step to stand for one percent of them
const FEWEST_FOR_PERCENTILES = 20

// every total of the account, smallest first, read from the covering index alone
const selectTotals = db.prepare('SELECT total FROM orders WHERE user_id = ? ORDER BY total').pluck()
const selectLeftOutTotals = db.prepare('SELECT total FROM orders WHERE user_id = ? AND exclude_from_stats = 1').pluck()
const selectHighest = db.prepare('SELECT MAX(total) FROM orders WHERE user_id = ?').pluck()

/** Rounded up to two significant figures, so the end of the scale is a figure a person would say: 24.310 is 25.000. */
function clean(amount) {
	if (amount <= 0) return 0
	const unit = 10 ** Math.max(0, Math.floor(Math.log10(amount)) - 1)
	return Math.ceil(amount / unit) * unit
}

/** The filter's scale: `stops` is the amount at each of its 100 positions, from 0 to the 99th
    percentile rounded to a clean figure, whose end reads as "and above". A set of fewer than 20
    orders has no stops and a straight scale up to `highest`, its largest order. */
export function orderAmountScale(userId) {
	const leftOut = selectLeftOutTotals.all(userId)
	const totals = selectTotals.all(userId)
	for (const total of leftOut) {
		const at = totals.indexOf(total)
		if (at >= 0) totals.splice(at, 1)
	}
	const end = totals.length >= FEWEST_FOR_PERCENTILES ? clean(totals[Math.ceil(0.99 * totals.length) - 1]) : 0
	if (!end) return { highest: selectHighest.get(userId) ?? null, stops: null }
	const at = percentile => Math.round(totals[Math.ceil((percentile / 100) * totals.length) - 1])
	const stops = Array.from({ length: 100 }, (unused, i) => (i === 0 ? 0 : i === 99 ? end : Math.min(at(i), end)))
	return { highest: null, stops }
}
