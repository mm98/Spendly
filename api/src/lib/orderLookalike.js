import { db } from '../db.js'
import { fromEpoch, toEpoch } from './dates.js'

/* An order that may be the same purchase entered twice: same vendor, up to LOOKALIKE_DAYS away, total
   within LOOKALIKE_SHARE of the order's. Paid totals, after discount, so where a discount sits does not matter. */
const LOOKALIKE_DAYS = 3
const LOOKALIKE_SHARE = 0.1
const selectLookalike = db.prepare(`
	SELECT id, date, total FROM orders
	WHERE user_id = @userId AND vendor_id = @vendorId AND date BETWEEN @from AND @to AND id <> @except
		AND abs(total - @total) <= abs(total) * @share + 0.005
	ORDER BY abs(date - @target), abs(total - @total) LIMIT 1`)

/** The nearest order like one from `vendorId` on `date` (YYYY-MM-DD) for `total`, leaving out `except`:
    `{ id, date, total }`, or null. */
export function findLookalikeOrder(userId, vendorId, date, total, except = '') {
	if (!vendorId || !/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !Number.isFinite(total)) return null
	const target = toEpoch(date)
	const row = selectLookalike.get({
		userId, vendorId, target, from: target - LOOKALIKE_DAYS * 86400, to: target + LOOKALIKE_DAYS * 86400,
		total, share: LOOKALIKE_SHARE, except
	})
	return row ? { id: row.id, date: fromEpoch(row.date), total: row.total } : null
}
