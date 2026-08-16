import { db } from '../db.js'

/* Real aggregation: SUM/GROUP BY over the orders table's stored totals (see
   migrations/001_init.sql), not a per-order fetch-and-add-in-JS loop. */

const vendorStatsQuery = db.prepare(`
	SELECT vendor_id AS vendorId, COUNT(*) AS orders, SUM(total) AS spend, SUM(saved) AS saved
	FROM orders
	WHERE user_id = ?
	GROUP BY vendor_id
`)

/* The newest order each vendor has. The Vendors page draws a "Latest order" row on every
   spotlight card and nothing ever answered it, so a vendor with 34 orders read "None • all
   time — 0 kr." -- the card's own fallback for a vendor that has never been bought from,
   shown for every vendor there is.

   Driven from the vendors table -- a dozen rows -- with one indexed newest-order probe each
   (the id breaking the date tie, so two orders on the same day resolve the same way the
   orders list does). It was ROW_NUMBER() OVER a partition of every order the account has,
   which numbers all 50,000 rows through a sort to keep 12 of them: 68ms against 0.3ms for
   the same rows. A vendor with no orders finds no id, so the JOIN drops it -- exactly the
   rows the window form answered. */
const vendorLatestQuery = db.prepare(`
	SELECT o.vendor_id AS vendorId, o.date, o.item_count AS items, o.total
	FROM vendors v JOIN orders o ON o.id = (
		SELECT o2.id FROM orders o2 WHERE o2.user_id = v.user_id AND o2.vendor_id = v.id
		ORDER BY o2.date DESC, o2.id DESC LIMIT 1
	)
	WHERE v.user_id = ?
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
   reader of a category breakdown expects to hold.

   category_count is the stored, trigger-maintained column on the order row, for the same
   reason as lib/stats.js's split: a joined `GROUP BY order_id` subquery has no user bound
   SQLite can push inside it, so it counted every account's links to answer one -- ~2.3s per
   Categories read on a 5.1M-order database, ~250ms stored (the remainder is the honest cost
   of an all-time rollup over every link the account has), identical rows. */
const categoryStatsQuery = db.prepare(`
	SELECT oc.category_id AS categoryId,
		SUM(ot.total * 1.0 / ot.category_count) AS spend,
		SUM(ot.saved * 1.0 / ot.category_count) AS saved
	FROM order_categories oc
	JOIN orders ot ON ot.id = oc.order_id
	WHERE ot.user_id = ?
	GROUP BY oc.category_id
`)

/* The account's true all-time spend, for the shares below. Shared against the categorised
   sum instead, every category's "of expenses" overstated itself the moment one order had no
   category -- the same defect lib/stats.js's splitOver names for the window split, at the
   all-time scale these figures live at. */
const accountTotalQuery = db.prepare('SELECT COALESCE(SUM(total), 0) AS spend FROM orders WHERE user_id = ?')

/* What the shares above leave over: the orders no category claims. category_count is the
   stored column the per-category splits divide by, so these rows are exactly the remainder
   those splits never touch -- the figure the "Without category" rows carry. */
const uncategorisedQuery = db.prepare(`
	SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS spend, COALESCE(SUM(saved), 0) AS saved
	FROM orders WHERE user_id = ? AND category_count = 0
`)

/** Spend/saved/share per category, keyed by category id. Shares are of the account's whole
    spend, so they and uncategorisedStats' share add up to it rather than to more. */
export function categoryStats(userId) {
	const rows = categoryStatsQuery.all(userId)
	const total = accountTotalQuery.get(userId).spend
	return new Map(rows.map(r => [r.categoryId, { spend: r.spend, saved: r.saved, share: total ? (r.spend / total) * 100 : 0 }]))
}

/** Orders/spend/saved/share of the account's uncategorised orders -- the all-time version of
    the window split's "Without category" row, for whatever draws that row over all time. */
export function uncategorisedStats(userId) {
	const row = uncategorisedQuery.get(userId)
	const total = accountTotalQuery.get(userId).spend
	return { ...row, share: total ? (row.spend / total) * 100 : 0 }
}
