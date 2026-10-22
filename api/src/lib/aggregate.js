import { db } from '../db.js'
import { moneyPaid } from './moneyPaid.js'

/** A column's amount where the order is money paid and counted in statistics, else 0: every order is
    listed and counted, but only those orders' money is spend. */
export const counted = (value, alias = '') => `CASE WHEN ${moneyPaid(alias)} AND ${alias}exclude_from_stats = 0 THEN ${value} ELSE 0 END`

/* Real aggregation: SUM/GROUP BY over the orders table's stored totals (see
   migrations/001_init.sql), not a per-order fetch-and-add-in-JS loop. */

const vendorStatsQuery = db.prepare(`
	SELECT vendor_id AS vendorId, COUNT(*) AS orders, SUM(${counted('total')}) AS spend, SUM(${counted('saved')}) AS saved, MAX(date) AS last
	FROM orders
	WHERE user_id = ?
	GROUP BY vendor_id
`)

/** Orders/spend/saved per vendor, keyed by vendor id. A vendor belongs to exactly one order
    at a time, so the totals are a plain SUM — no splitting question the way categories have. */
export function vendorStats(userId) {
	return new Map(vendorStatsQuery.all(userId).map(r => [r.vendorId, {
		orders: r.orders, spend: r.spend, saved: r.saved, last: r.last
	}]))
}

/* How many orders carry each category, keyed by category id: what the category list reads.
   Only the count, so the links are counted from the covering link index with no order totals read. */
const categoryOrderCountsQuery = db.prepare(`
	SELECT oc.category_id AS categoryId, COUNT(*) AS orders
	FROM order_categories oc
	JOIN orders ot ON ot.id = oc.order_id
	WHERE ot.user_id = ?
	GROUP BY oc.category_id
`)

export function categoryOrderCounts(userId) {
	return new Map(categoryOrderCountsQuery.all(userId).map(r => [r.categoryId, r.orders]))
}

/* The one-vendor and one-category questions, asked of that entity's own rows -- not the
   whole-account rollups above with all but one entry thrown away. GET/PATCH /vendors/:id and
   /categories/:id each called the batched map to render a single record: ~25ms grouping
   50,000 orders by vendor to read one vendor, ~105ms joining 60,768 category links to read one
   category. Scoped to the entity, the same arithmetic runs over its own indexed rows alone:
   ~2ms and ~5ms. The batched maps stay for the list pages, where every entry is read. */
const vendorStatsForQuery = db.prepare(`
	SELECT COUNT(*) AS orders, COALESCE(SUM(${counted('total')}), 0) AS spend, COALESCE(SUM(${counted('saved')}), 0) AS saved
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
	SELECT COUNT(*) AS orders, COALESCE(SUM(${counted('ot.total', 'ot.')}), 0) AS spend,
		COALESCE(SUM(${counted('ot.saved', 'ot.')}), 0) AS saved
	FROM order_categories oc CROSS JOIN orders ot ON ot.id = oc.order_id
	WHERE oc.category_id = ? AND ot.user_id = ?
`)

/** One category's orders/spend/saved, for its own record. */
export function categoryStatsFor(userId, categoryId) {
	const r = categoryStatsForQuery.get(categoryId, userId)
	return { orders: r.orders, spend: r.spend, saved: r.saved }
}

/* No GROUP BY: SQLite would sort in a temp B-tree to group it, for a row count bounded by
   one account's own bookmarks -- small enough that counting in JS costs nothing instead. */
const bookmarkCategoryLinksQuery = db.prepare(`
	SELECT bc.category_id AS categoryId FROM bookmark_categories bc
	JOIN bookmarks b ON b.id = bc.bookmark_id WHERE b.user_id = ?
`)

/** How many bookmarks each category is on, keyed by category id -- the bookmark-side twin of
    categoryOrderCounts. */
export function bookmarkCategoryCounts(userId) {
	const counts = new Map()
	for (const { categoryId } of bookmarkCategoryLinksQuery.all(userId))
		counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1)
	return counts
}

/* Each category's spend over the twelve whole months before this one, an order's full total in
   each of its categories as everywhere else (lib/stats.js). */
const categoryYearSpendQuery = db.prepare(`
	SELECT oc.category_id AS categoryId, SUM(ot.total) AS spend
	FROM orders ot JOIN order_categories oc ON oc.order_id = ot.id
	WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to AND ${moneyPaid('ot.')} AND ot.exclude_from_stats = 0
	GROUP BY oc.category_id
`)

// the twelve whole months before the one `today` (epoch seconds, UTC midnight) is in
function lastTwelveMonths(today) {
	const day = new Date(today * 1000)
	return {
		from: Date.UTC(day.getUTCFullYear(), day.getUTCMonth() - 12, 1) / 1000,
		to: Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1) / 1000
	}
}

/** Each category's 12-month average, keyed by category id: what it spent in the twelve whole
    months before the one `today` is in, divided by twelve. */
export function categoryMonthAverages(userId, today) {
	const { from, to } = lastTwelveMonths(today)
	return new Map(categoryYearSpendQuery.all({ userId, from, to }).map(r => [r.categoryId, r.spend / 12]))
}

/* One category's orders over those twelve months, driven from the category's
   own links as the order counts above are. */
const categoryYearOrdersQuery = db.prepare(`
	SELECT ot.date, ot.total AS spend
	FROM order_categories oc CROSS JOIN orders ot ON ot.id = oc.order_id
	WHERE oc.category_id = @categoryId AND ot.user_id = @userId AND ot.date >= @from AND ot.date < @to
		AND ${moneyPaid('ot.')} AND ot.exclude_from_stats = 0
`)

/** What one category spent in each of the twelve whole months before the one `today` is in,
    oldest first: the limit check on its form (6c) counts the months a limit would have been passed. */
export function categoryMonthSpends(userId, categoryId, today) {
	const { from, to } = lastTwelveMonths(today)
	const start = new Date(from * 1000)
	const months = Array(12).fill(0)
	for (const { date, spend } of categoryYearOrdersQuery.all({ userId, categoryId, from, to })) {
		const at = new Date(date * 1000)
		months[(at.getUTCFullYear() - start.getUTCFullYear()) * 12 + at.getUTCMonth() - start.getUTCMonth()] += spend
	}
	return months
}
