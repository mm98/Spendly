import { db } from '../db.js'

/* Real aggregation: SUM/GROUP BY over the order_totals view (see migrations/001_init.sql),
   not a per-order fetch-and-add-in-JS loop. */

const vendorStatsQuery = db.prepare(`
	SELECT vendor_id AS vendorId, COUNT(*) AS orders, SUM(total) AS spend, SUM(saved) AS saved
	FROM order_totals
	WHERE user_id = ?
	GROUP BY vendor_id
`)

/** Orders/spend/saved per vendor, keyed by vendor id. A vendor belongs to exactly one order at
    a time, so this is a plain SUM — no splitting question the way categories have. */
export function vendorStats(userId) {
	return new Map(vendorStatsQuery.all(userId).map(r => [r.vendorId, { orders: r.orders, spend: r.spend, saved: r.saved }]))
}

/* An order can carry more than one category (order_categories is many-to-many), and nothing in
   the original app ever states how such an order's total should roll up per category — this
   splits it evenly across the categories it carries via cat_count, the one rule that keeps "sum
   of every category's spend" equal to the spend of categorised orders, which is the invariant a
   reader of a category breakdown expects to hold. */
const categoryStatsQuery = db.prepare(`
	SELECT oc.category_id AS categoryId,
		SUM(ot.total * 1.0 / cc.cat_count) AS spend,
		SUM(ot.saved * 1.0 / cc.cat_count) AS saved
	FROM order_categories oc
	JOIN order_totals ot ON ot.id = oc.order_id
	JOIN (SELECT order_id, COUNT(*) AS cat_count FROM order_categories GROUP BY order_id) cc
		ON cc.order_id = oc.order_id
	WHERE ot.user_id = ?
	GROUP BY oc.category_id
`)

/** Spend/saved/share per category, keyed by category id. */
export function categoryStats(userId) {
	const rows = categoryStatsQuery.all(userId)
	const total = rows.reduce((sum, r) => sum + r.spend, 0)
	return new Map(rows.map(r => [r.categoryId, { spend: r.spend, saved: r.saved, share: total ? (r.spend / total) * 100 : 0 }]))
}
