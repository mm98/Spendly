import { db } from '../db.js'

/* Real aggregation: SUM/GROUP BY over the order_totals view (see migrations/001_init.sql),
   not a per-order fetch-and-add-in-JS loop. */

const vendorStatsQuery = db.prepare(`
	SELECT vendor_id AS vendorId, COUNT(*) AS orders, SUM(total) AS spend, SUM(saved) AS saved
	FROM order_totals
	WHERE user_id = ?
	GROUP BY vendor_id
`)

/* The newest order each vendor has, in one pass rather than a query per vendor. The Vendors
   page draws a "Latest order" row on every spotlight card and nothing ever answered it, so a
   vendor with 34 orders read "None • all time — 0 kr." -- the card's own fallback for a vendor
   that has never been bought from, shown for every vendor there is.

   ROW_NUMBER over a partition is what picks one row per vendor; the id breaks the tie so two
   orders on the same day resolve the same way the orders list does (date DESC, id DESC). */
const vendorLatestQuery = db.prepare(`
	SELECT vendorId, date, item_count AS items, total FROM (
		SELECT vendor_id AS vendorId, date, item_count, total,
			ROW_NUMBER() OVER (PARTITION BY vendor_id ORDER BY date DESC, id DESC) AS rn
		FROM order_totals WHERE user_id = ?
	) WHERE rn = 1
`)

/** Orders/spend/saved per vendor, keyed by vendor id, plus that vendor's most recent order. A
    vendor belongs to exactly one order at a time, so the totals are a plain SUM — no splitting
    question the way categories have. */
export function vendorStats(userId) {
	const latest = new Map(vendorLatestQuery.all(userId).map(r => [r.vendorId, r]))
	return new Map(vendorStatsQuery.all(userId).map(r => [r.vendorId, {
		orders: r.orders, spend: r.spend, saved: r.saved, latest: latest.get(r.vendorId) ?? null
	}]))
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
