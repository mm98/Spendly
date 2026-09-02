import { db } from '../db.js'

/* Real aggregation: SUM/GROUP BY over the orders table's stored totals (see
   migrations/001_init.sql), not a per-order fetch-and-add-in-JS loop. */

const vendorStatsQuery = db.prepare(`
	SELECT vendor_id AS vendorId, COUNT(*) AS orders, SUM(total) AS spend, SUM(saved) AS saved
	FROM orders
	WHERE user_id = ?
	GROUP BY vendor_id
`)

/** Orders/spend/saved per vendor, keyed by vendor id. A vendor belongs to exactly one order
    at a time, so the totals are a plain SUM — no splitting question the way categories have. */
export function vendorStats(userId) {
	return new Map(vendorStatsQuery.all(userId).map(r => [r.vendorId, {
		orders: r.orders, spend: r.spend, saved: r.saved
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
	SELECT oc.category_id AS categoryId, COUNT(*) AS orders,
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
   all-time scale these figures live at.

   INDEXED BY, because five user-prefixed indexes satisfy this WHERE equally and only one of
   them carries the summed column: left to tie-break, the planner read the whole account
   through idx_orders_user_discount with a table probe per row for `total` -- 32ms at 50,000
   orders against 2.6ms index-only, same sum -- and which index wins a tie is an artefact of
   schema order, not something a comment can hold in place. Naming it is deterministic in
   every statistics state, and fails loudly if the index is ever renamed instead of quietly
   reverting to the probe-per-row plan. */
const accountTotalQuery = db.prepare(
	'SELECT COALESCE(SUM(total), 0) AS spend FROM orders INDEXED BY idx_orders_user_total WHERE user_id = ?')

/* What the shares above leave over: the orders no category claims. category_count is the
   stored column the per-category splits divide by, so these rows are exactly the remainder
   those splits never touch -- the figure the "Without category" rows carry. */
const uncategorisedQuery = db.prepare(`
	SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS spend, COALESCE(SUM(saved), 0) AS saved
	FROM orders WHERE user_id = ? AND category_count = 0
`)
const uncategorisedWishesQuery = db.prepare(`
	SELECT COUNT(*) AS wishes FROM wishes w WHERE w.user_id = ?
	AND NOT EXISTS (SELECT 1 FROM wish_categories wc WHERE wc.wish_id = w.id)
`)

/* The one-vendor and one-category questions, asked of that entity's own rows -- not the
   whole-account rollups above with all but one entry thrown away. GET/PATCH /vendors/:id and
   /categories/:id each called the batched map to render a single record: ~25ms grouping
   50,000 orders by vendor to read one vendor, ~105ms joining 60,768 category links plus the
   account total to read one category. Scoped to the entity, the same arithmetic runs over its
   own indexed rows alone: ~2ms and ~5ms. The batched maps stay for the list pages, where
   every entry is read. */
const vendorStatsForQuery = db.prepare(`
	SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS spend, COALESCE(SUM(saved), 0) AS saved
	FROM orders WHERE user_id = ? AND vendor_id = ?
`)
/** One vendor's orders/spend/saved -- the same shape one entry of vendorStats holds. */
export function vendorStatsFor(userId, vendorId) {
	const r = vendorStatsForQuery.get(userId, vendorId)
	if (!r.orders) return { orders: 0, spend: 0, saved: 0 }
	return { orders: r.orders, spend: r.spend, saved: r.saved }
}

/* CROSS JOIN pins the category's own (indexed, covering) link list as the driving side; a
   plain JOIN let the planner start from the orders side and probe the links per order, which
   reads the whole account to answer one category. */
const categoryStatsForQuery = db.prepare(`
	SELECT COUNT(*) AS orders, COALESCE(SUM(ot.total * 1.0 / ot.category_count), 0) AS spend,
		COALESCE(SUM(ot.saved * 1.0 / ot.category_count), 0) AS saved
	FROM order_categories oc CROSS JOIN orders ot ON ot.id = oc.order_id
	WHERE oc.category_id = ? AND ot.user_id = ?
`)

/** One category's orders/spend/saved/share -- the same shape one entry of categoryStats holds. */
export function categoryStatsFor(userId, categoryId) {
	const r = categoryStatsForQuery.get(categoryId, userId)
	const total = accountTotalQuery.get(userId).spend
	return { orders: r.orders, spend: r.spend, saved: r.saved, share: total ? (r.spend / total) * 100 : 0 }
}

/** Orders/spend/saved/share per category, keyed by category id. Shares are of the account's
    whole spend, so they and uncategorisedStats' share add up to it rather than to more. */
export function categoryStats(userId) {
	const rows = categoryStatsQuery.all(userId)
	const total = accountTotalQuery.get(userId).spend
	return new Map(rows.map(r => [r.categoryId,
		{ orders: r.orders, spend: r.spend, saved: r.saved, share: total ? (r.spend / total) * 100 : 0 }]))
}

/* No GROUP BY: SQLite would sort in a temp B-tree to group it, for a row count bounded by
   one account's own wishlist -- small enough that counting in JS costs nothing instead. */
const wishCategoryLinksQuery = db.prepare(`
	SELECT wc.category_id AS categoryId FROM wish_categories wc
	JOIN wishes w ON w.id = wc.wish_id WHERE w.user_id = ?
`)

/** How many wishes each category is on, keyed by category id -- the wish-side twin of
    categoryStats' order counts. */
export function wishCategoryCounts(userId) {
	const counts = new Map()
	for (const { categoryId } of wishCategoryLinksQuery.all(userId))
		counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1)
	return counts
}

/** Orders/wishes/spend/saved/share of the account's uncategorised records -- the all-time
    version of the window split's "Without category" row, for whatever draws it over all time. */
export function uncategorisedStats(userId) {
	const row = uncategorisedQuery.get(userId)
	const total = accountTotalQuery.get(userId).spend
	return { ...row, wishes: uncategorisedWishesQuery.get(userId).wishes, share: total ? (row.spend / total) * 100 : 0 }
}
