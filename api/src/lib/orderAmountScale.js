import { db } from '../db.js'

/* The Amount filter (2b) is spaced by order count: each step is the same share of the orders.
   Orders left out of statistics are filtered like any other but do not move the steps. */
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

/** `stops`: the amount at each of 100 positions, 0 to the clean 99th percentile ("and above").
    Fewer than 20 orders: no stops, a straight scale up to `highest`. */
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
