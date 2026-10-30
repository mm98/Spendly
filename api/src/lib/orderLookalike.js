import { db } from '../db.js'
import { fromEpoch, toEpoch } from './dates.js'

/* An order that may be the same purchase entered twice: same vendor, up to LOOKALIKE_DAYS away, total
   within LOOKALIKE_SHARE of the order's. Paid totals, after discount, so where a discount sits does not matter. */
const LOOKALIKE_DAYS = 3
const LOOKALIKE_SHARE = 0.1
// the dialog lists this many and counts the rest (3c)
const LOOKALIKE_SHOWN = 3
const selectLookalikes = db.prepare(`
	SELECT o.id, o.reference, o.date, o.item_count, o.status, o.total, v.name AS vendor, v.colour AS vendor_colour,
		(SELECT a.id FROM order_attachments a WHERE a.order_id = o.id AND a.thumbnail IS NOT NULL ORDER BY a.rowid LIMIT 1) AS thumbnail_id,
		count(*) OVER () AS matches
	FROM orders o JOIN vendors v ON v.id = o.vendor_id
	WHERE o.user_id = @userId AND o.vendor_id = @vendorId AND o.date BETWEEN @from AND @to AND o.id <> @except
		AND abs(o.total - @total) <= abs(o.total) * @share + 0.005
	ORDER BY abs(o.date - @target), abs(o.total - @total) LIMIT ${LOOKALIKE_SHOWN}`)

/** The orders like one from `vendorId` on `date` (YYYY-MM-DD) for `total`, leaving out `except`, nearest
    first: `{ count, orders }`, where `orders` holds the first LOOKALIKE_SHOWN and `count` all of them. */
export function findLookalikeOrders(userId, vendorId, date, total, except = '') {
	if (!vendorId || !/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !Number.isFinite(total)) return { count: 0, orders: [] }
	const target = toEpoch(date)
	const rows = selectLookalikes.all({
		userId, vendorId, target, from: target - LOOKALIKE_DAYS * 86400, to: target + LOOKALIKE_DAYS * 86400,
		total, share: LOOKALIKE_SHARE, except
	})
	return {
		count: rows[0]?.matches ?? 0,
		orders: rows.map(o => ({
			id: o.id, reference: o.reference, date: fromEpoch(o.date), itemCount: o.item_count, status: o.status, total: o.total,
			vendor: o.vendor, vendorColour: o.vendor_colour, thumbnailId: o.thumbnail_id ?? null
		}))
	}
}
