import { db } from '../db.js'
import { findCategoryByFold } from './findOrCreate.js'
import { MATCHERS, asciiNeedle, escapeLike } from './textSearch.js'
import { countsOnly, listOf, nameOrder, pageOf } from './listPage.js'

/* A page of the account's categories (GET /api/categories with page, pageSize, ids or name): the
   filter, the order and the page boundary are the server's, so no reader holds the whole list. */

const ORDERS = `SELECT oc.category_id, COUNT(*) AS orders FROM order_categories oc JOIN orders ot ON ot.id = oc.order_id
	WHERE ot.user_id = @userId`
const MONTH = `SELECT oc.category_id, SUM(ot.total) AS spend
	FROM orders ot JOIN order_categories oc ON oc.order_id = ot.id
	WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to AND ot.status_type NOT IN ('cancelled', 'draft') AND ot.exclude_from_stats = 0`

/* Ties go to the name as stored; `byName` is ordered by nameOrder, and `fav` puts favourites first. */
const SORTS = {
	'name-asc': { fav: true, byName: true },
	// a picker's list: the favourites lead, then the rest by name
	'favourites': { fav: true, byName: true },
	'month-desc': { fav: true, month: true, by: 'COALESCE(m.spend, 0) DESC, c.name' },
	'month-asc': { fav: true, month: true, by: 'COALESCE(m.spend, 0) ASC, c.name' },
	'limit-desc': { fav: true, by: 'c.budget DESC, c.name' },
	'orders-desc': { fav: true, orders: true, by: 'COALESCE(o.orders, 0) DESC, c.name' }
}

const selectRows = db.prepare(`SELECT id, name, icon, colour, budget, favourite FROM categories
	WHERE user_id = @userId AND id IN (SELECT value FROM json_each(@ids))`)
/* CROSS JOIN drives each count from the category's own covering link index, as countOrders does
   in routes/categories.js. */
const selectOrders = db.prepare(`SELECT oc.category_id, COUNT(*) AS orders
	FROM order_categories oc CROSS JOIN orders ot ON ot.id = oc.order_id
	WHERE oc.category_id IN (SELECT value FROM json_each(@ids)) AND ot.user_id = @userId GROUP BY oc.category_id`)
/* A page's sums and counts are added up here from its own rows: no GROUP BY, so SQLite does not
   sort them in a temp B-tree, as bookmarkCategoryCounts does in lib/aggregate.js. */
const selectMonth = db.prepare(`SELECT oc.category_id, ot.total AS spend
	FROM orders ot JOIN order_categories oc ON oc.order_id = ot.id
	WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to AND ot.status_type NOT IN ('cancelled', 'draft') AND ot.exclude_from_stats = 0
	AND oc.category_id IN (SELECT value FROM json_each(@ids))`)
const selectYear = db.prepare(`SELECT oc.category_id, ot.total AS spend
	FROM orders ot JOIN order_categories oc ON oc.order_id = ot.id
	WHERE ot.user_id = @userId AND ot.date >= @yearFrom AND ot.date < @from AND ot.exclude_from_stats = 0
	AND oc.category_id IN (SELECT value FROM json_each(@ids))`)
const selectBookmarks = db.prepare(`SELECT bc.category_id, 1 AS bookmarks
	FROM bookmark_categories bc JOIN bookmarks b ON b.id = bc.bookmark_id
	WHERE b.user_id = @userId AND bc.category_id IN (SELECT value FROM json_each(@ids))`)
const selectViewBookmarks = db.prepare(`SELECT bc.category_id, 1 AS bookmarks
	FROM bookmark_categories bc JOIN bookmarks b ON b.id = bc.bookmark_id
	WHERE b.user_id = @userId AND b.archived = @view AND bc.category_id IN (SELECT value FROM json_each(@ids))`)
const selectByName = db.prepare('SELECT id FROM categories WHERE user_id = ? AND lower(name) = lower(?)')
const selectAccountNames = db.prepare('SELECT name FROM categories WHERE user_id = ?')

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/

/** The month a date or a "2026-10" falls in as `from` and `to` epoch seconds, and the twelve whole months before it as `yearFrom`. */
function monthOf(today) {
	const [y, m] = today.split('-').map(Number)
	return { from: Date.UTC(y, m - 1, 1) / 1000, to: Date.UTC(y, m, 1) / 1000, yearFrom: Date.UTC(y, m - 13, 1) / 1000 }
}

const byCategory = (rows, key) => new Map(rows.map(r => [r.category_id, r[key]]))
const sumBy = (rows, key) => {
	const sums = new Map()
	for (const r of rows) sums.set(r.category_id, (sums.get(r.category_id) ?? 0) + r[key])
	return sums
}

/** The page's rows, in `ids` order. `with=month` adds this month's spend and 12-month average;
    `with=bookmarks` how many bookmarks carry each, in one view when `view` is 0 (open) or 1. */
function rowsFor(userId, ids, extras, month, view = null) {
	if (!ids.length) return []
	const params = { userId, ids: JSON.stringify(ids), ...month }
	const byId = new Map(selectRows.all(params).map(c => [c.id, c]))
	// shape=brief: who the category is, for a lookup or a mark, with nothing counted
	if (extras.brief) return ids.filter(id => byId.has(id)).map(id => {
		const c = byId.get(id)
		return { id, name: c.name, icon: c.icon, colour: c.colour, favourite: Boolean(c.favourite) }
	})
	const orders = byCategory(selectOrders.all(params), 'orders')
	const spend = extras.includes('month') ? sumBy(selectMonth.all(params), 'spend') : null
	const year = extras.includes('month') ? sumBy(selectYear.all(params), 'spend') : null
	const bookmarks = !extras.includes('bookmarks') ? null
		: sumBy(view === null ? selectBookmarks.all(params) : selectViewBookmarks.all({ ...params, view }), 'bookmarks')
	return ids.filter(id => byId.has(id)).map(id => {
		const c = byId.get(id)
		return {
			id, name: c.name, icon: c.icon, colour: c.colour, budget: c.budget, favourite: Boolean(c.favourite), orders: orders.get(id) ?? 0,
			...(spend ? { monthSpend: spend.get(id) ?? 0, monthAverage: (year.get(id) ?? 0) / 12 } : {}),
			...(bookmarks ? { bookmarks: bookmarks.get(id) ?? 0 } : {})
		}
	})
}

export function categoryPage(userId, q, today, languages = []) {
	const extras = Object.assign(listOf(q.with), { brief: q.shape === 'brief' })
	// `month=2026-10` reads the list as that month and keeps the categories with spend in it; anything else reads it as this month
	const named = MONTH_PARAM.test(q.month)
	const month = monthOf(named ? q.month : today)
	const except = q.except ? String(q.except) : null
	// the categories the bookmarks of one view carry
	const view = q.bookmarks === 'archived' ? 1 : q.bookmarks === 'open' ? 0 : null
	const ranked = ids => {
		const { limit, offset } = pageOf(q, ids.length)
		return { categories: rowsFor(userId, ids.slice(offset, offset + limit), extras, month, view), matched: ids.length }
	}

	// the category a typed name means, case and accents set aside: one row or none
	if (q.name !== undefined) {
		const name = String(q.name).trim()
		const exact = name ? selectByName.get(userId, name) : null
		const found = exact && exact.id !== except ? exact : name ? findCategoryByFold(userId, name) : null
		return ranked(found && found.id !== except ? [found.id] : [])
	}

	const sort = Object.hasOwn(SORTS, q.sort) ? SORTS[q.sort] : SORTS['name-asc']
	const where = ['c.user_id = @userId']
	const params = { userId }
	const over = q.flag === 'over-limit'
	if (q.limited === 'yes' || q.flag === 'limited' || over) where.push('c.budget > 0')
	if (over) where.push('COALESCE(m.spend, 0) > c.budget')
	if (q.flag === 'near-limit') {
		const early = Math.min(99, Math.max(1, Math.floor(Number(q.early) || 0)))
		where.push('c.budget > 0', 'COALESCE(m.spend, 0) <= c.budget', 'COALESCE(m.spend, 0) * 100 >= c.budget * @early')
		params.early = early
	}
	if (named) where.push('COALESCE(m.spend, 0) > 0')
	if (q.ids !== undefined) { where.push('c.id IN (SELECT value FROM json_each(@ids))'); params.ids = JSON.stringify(listOf(q.ids)) }
	if (except) { where.push('c.id <> @except'); params.except = except }
	if (view !== null) {
		where.push(`c.id IN (SELECT bc.category_id FROM bookmark_categories bc JOIN bookmarks b ON b.id = bc.bookmark_id
			WHERE b.user_id = @userId AND b.archived = @view)`)
		params.view = view
	}
	const needle = String(q.query ?? '').trim().toLowerCase()
	if (needle) {
		params.needle = asciiNeedle(needle) ? `%${escapeLike(needle)}%` : needle
		where.push(MATCHERS[asciiNeedle(needle) ? 'ascii' : 'fold']('c.name'))
	}

	const joinMonth = sort.month || over || q.flag === 'near-limit' || named
	if (joinMonth) Object.assign(params, { from: month.from, to: month.to })
	const from = `categories c
		${joinMonth ? `LEFT JOIN (${MONTH} GROUP BY oc.category_id) m ON m.category_id = c.id` : ''}
		${sort.orders ? `LEFT JOIN (${ORDERS} GROUP BY oc.category_id) o ON o.category_id = c.id` : ''}`
	if (sort.byName) {
		const compare = nameOrder(languages)
		const found = db.prepare(`SELECT c.id, c.name, c.favourite FROM ${from} WHERE ${where.join(' AND ')}`).all(params)
		if (countsOnly(q)) return { categories: [], matched: found.length }
		return ranked(found.sort((a, b) => (sort.fav ? b.favourite - a.favourite : 0) || compare(a.name, b.name)).map(c => c.id))
	}
	// the count needs the month's spend only to find the categories over their limit or with spend in it
	const counted = `categories c ${over || named ? `LEFT JOIN (${MONTH} GROUP BY oc.category_id) m ON m.category_id = c.id` : ''}`
	const matched = db.prepare(`SELECT COUNT(*) c FROM ${counted} WHERE ${where.join(' AND ')}`).get(params).c
	const { limit, offset } = pageOf(q, matched)
	const page = db.prepare(`SELECT c.id FROM ${from} WHERE ${where.join(' AND ')} ORDER BY ${sort.fav ? 'c.favourite DESC, ' : ''}${sort.by} LIMIT @limit OFFSET @offset`)
		.all({ ...params, limit, offset })
	return { categories: rowsFor(userId, page.map(r => r.id), extras, month, view), matched }
}

/** Which of these names a category of the account already has, in any case: what an import would not create. */
export function knownCategoryNames(userId, names) {
	const held = new Set(selectAccountNames.all(userId).map(r => r.name.trim().toLowerCase()))
	return names.filter(name => held.has(name.toLowerCase()))
}
