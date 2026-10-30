import { db } from '../db.js'
import { moneyPaid } from './moneyPaid.js'
import { findCategoryByFold } from './findOrCreate.js'
import { MATCHERS, asciiNeedle, escapeLike } from './textSearch.js'
import { countsOnly, listOf, nameOrder, pageOf } from './listPage.js'
import { NOTIFY_EARLY_DEFAULT } from './constants.js'
import { budgetWindows, spendInPeriod } from './categoryBudgetPeriod.js'

/* A page of the account's categories (GET /api/categories with page, pageSize, ids or name): the
   filter, the order and the page boundary are the server's, so no reader holds the whole list. */

/* Each category's spend in the month and in the year it falls in; a row is measured on the one its
   limit is for, and a row with no limit on the month. */
const PERIODS = `SELECT oc.category_id, SUM(CASE WHEN ot.date >= @from AND ot.date < @to THEN ot.total ELSE 0 END) AS month_spend,
	SUM(ot.total) AS year_spend
	FROM orders ot JOIN order_categories oc ON oc.order_id = ot.id
	WHERE ot.user_id = @userId AND ot.date >= @periodYearFrom AND ot.date < @periodYearTo AND ${moneyPaid('ot.')} AND ot.exclude_from_stats = 0`
const SPEND = "CASE c.budget_period WHEN 'year' THEN COALESCE(m.year_spend, 0) ELSE COALESCE(m.month_spend, 0) END"

/* Ties go to the name as stored; `byName` is ordered by nameOrder. */
const SORTS = {
	'name-asc': { byName: true },
	'month-desc': { month: true, by: `${SPEND} DESC, c.name` },
	'month-asc': { month: true, by: `${SPEND} ASC, c.name` },
	'limit-desc': { by: 'c.budget DESC, c.name' },
	'orders-desc': { by: 'c.order_count DESC, c.name' }
}

const selectRows = db.prepare(`SELECT id, name, icon, colour, budget, budget_period, favourite, order_count FROM categories
	WHERE user_id = @userId AND id IN (SELECT value FROM json_each(@ids))`)
/* A page's sums and counts are added up here from its own rows: no GROUP BY, so SQLite does not
   sort them in a temp B-tree, as bookmarkCategoryCounts does in lib/aggregate.js. */
const selectMonth = db.prepare(`SELECT oc.category_id, ot.total AS spend
	FROM orders ot JOIN order_categories oc ON oc.order_id = ot.id
	WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to AND ${moneyPaid('ot.')} AND ot.exclude_from_stats = 0
	AND oc.category_id IN (SELECT value FROM json_each(@ids))`)
const selectPeriodYear = db.prepare(`SELECT oc.category_id, ot.total AS spend
	FROM orders ot JOIN order_categories oc ON oc.order_id = ot.id
	WHERE ot.user_id = @userId AND ot.date >= @periodYearFrom AND ot.date < @periodYearTo AND ${moneyPaid('ot.')} AND ot.exclude_from_stats = 0
	AND oc.category_id IN (SELECT value FROM json_each(@ids))`)
const selectAverage = db.prepare(`SELECT oc.category_id, ot.total AS spend
	FROM orders ot JOIN order_categories oc ON oc.order_id = ot.id
	WHERE ot.user_id = @userId AND ot.date >= @averageFrom AND ot.date < @from AND ${moneyPaid('ot.')} AND ot.exclude_from_stats = 0
	AND oc.category_id IN (SELECT value FROM json_each(@ids))`)
const selectBookmarks = db.prepare(`SELECT bc.category_id, 1 AS bookmarks
	FROM bookmark_categories bc JOIN bookmarks b ON b.id = bc.bookmark_id
	WHERE b.user_id = @userId AND bc.category_id IN (SELECT value FROM json_each(@ids))`)
const selectViewBookmarks = db.prepare(`SELECT bc.category_id, 1 AS bookmarks
	FROM bookmark_categories bc JOIN bookmarks b ON b.id = bc.bookmark_id
	WHERE b.user_id = @userId AND b.archived = @view AND bc.category_id IN (SELECT value FROM json_each(@ids))`)
const selectByName = db.prepare('SELECT id FROM categories WHERE user_id = ? AND lower(name) = lower(?)')
const selectAccountNames = db.prepare('SELECT name FROM categories WHERE user_id = ?')
const selectEarly = db.prepare('SELECT notify_early FROM user_settings WHERE user_id = ?')

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/

/** The month a date or a "2026-10" falls in as `from` and `to` epoch seconds, its year as
    `periodYearFrom` and `periodYearTo` (up to that month when it is `named`), and the twelve whole
    months before it as `averageFrom`. */
function monthOf(today, named = false) {
	const [y, m] = today.split('-').map(Number)
	const { month, year } = budgetWindows(today, { upToMonth: named })
	return { ...month, periodYearFrom: year.from, periodYearTo: year.to, averageFrom: Date.UTC(y, m - 13, 1) / 1000 }
}

const sumBy = (rows, key) => {
	const sums = new Map()
	for (const r of rows) sums.set(r.category_id, (sums.get(r.category_id) ?? 0) + r[key])
	return sums
}

/** The page's rows, in `ids` order. `with=month` adds the spend of the month and of its year, and
    the 12-month average;
    `with=bookmarks` how many bookmarks carry each, in one view when `view` is 0 (open) or 1. */
function rowsFor(userId, ids, extras, month, view = null) {
	if (!ids.length) return []
	const params = { userId, ids: JSON.stringify(ids), ...month }
	const byId = new Map(selectRows.all(params).map(c => [c.id, c]))
	// shape=brief: who the category is and its limit, for a lookup or a mark, with nothing counted
	if (extras.brief) return ids.filter(id => byId.has(id)).map(id => {
		const c = byId.get(id)
		return { id, name: c.name, icon: c.icon, colour: c.colour, budget: c.budget, budgetPeriod: c.budget_period, favourite: Boolean(c.favourite) }
	})
	const spend = extras.includes('month') ? sumBy(selectMonth.all(params), 'spend') : null
	const yearSpend = extras.includes('month') ? sumBy(selectPeriodYear.all(params), 'spend') : null
	const average = extras.includes('month') ? sumBy(selectAverage.all(params), 'spend') : null
	const bookmarks = !extras.includes('bookmarks') ? null
		: sumBy(view === null ? selectBookmarks.all(params) : selectViewBookmarks.all({ ...params, view }), 'bookmarks')
	return ids.filter(id => byId.has(id)).map(id => {
		const c = byId.get(id)
		return {
			id, name: c.name, icon: c.icon, colour: c.colour, budget: c.budget, budgetPeriod: c.budget_period, favourite: Boolean(c.favourite), orders: c.order_count,
			...(spend ? { monthSpend: spend.get(id) ?? 0, yearSpend: yearSpend.get(id) ?? 0, monthAverage: (average.get(id) ?? 0) / 12 } : {}),
			...(bookmarks ? { bookmarks: bookmarks.get(id) ?? 0 } : {})
		}
	})
}

export function categoryPage(userId, q, today, languages = []) {
	const extras = Object.assign(listOf(q.with), { brief: q.shape === 'brief' })
	// `month=2026-10` reads the list as that month and keeps the categories with spend in it; anything else reads it as this month
	const named = MONTH_PARAM.test(q.month)
	const month = monthOf(named ? q.month : today, named)
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
	// a picker's list: the favourites lead whatever the sort; the Categories page keeps the sort alone
	const fav = q.favourites === 'first'
	const where = ['c.user_id = @userId']
	const params = { userId }
	const over = q.flag === 'over-limit'
	if (q.limited === 'yes' || q.flag === 'limited' || over) where.push('c.budget > 0')
	if (over) where.push(`${SPEND} > c.budget`)
	if (q.flag === 'near-limit') {
		// without `early`, the account's own warning level from Settings, as the page sends it
		const asked = q.early ?? selectEarly.get(userId)?.notify_early ?? NOTIFY_EARLY_DEFAULT
		const early = Math.min(99, Math.max(1, Math.floor(Number(asked) || 0)))
		where.push('c.budget > 0', `${SPEND} <= c.budget`, `${SPEND} * 100 >= c.budget * @early`)
		params.early = early
	}
	// a named month keeps the categories with spend in that month itself
	if (named) where.push('COALESCE(m.month_spend, 0) > 0')
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
	if (joinMonth) Object.assign(params, { from: month.from, to: month.to, periodYearFrom: month.periodYearFrom, periodYearTo: month.periodYearTo })
	const from = `categories c
		${joinMonth ? `LEFT JOIN (${PERIODS} GROUP BY oc.category_id) m ON m.category_id = c.id` : ''}`
	// the count needs the month's spend only to find the categories over or near their limit, or with spend in it
	const filtersMonth = over || named || q.flag === 'near-limit'
	const counted = `categories c ${filtersMonth ? `LEFT JOIN (${PERIODS} GROUP BY oc.category_id) m ON m.category_id = c.id` : ''}`
	const matchedSql = `SELECT COUNT(*) c FROM ${counted} WHERE ${where.join(' AND ')}`
	// before the name sort, which reads every matched row to rank them
	if (countsOnly(q)) return { categories: [], matched: db.prepare(matchedSql).get(params).c }
	if (sort.byName) {
		const compare = nameOrder(languages)
		const found = db.prepare(`SELECT c.id, c.name, c.favourite FROM ${from} WHERE ${where.join(' AND ')}`).all(params)
		return ranked(found.sort((a, b) => (fav ? b.favourite - a.favourite : 0) || compare(a.name, b.name)).map(c => c.id))
	}
	const matched = db.prepare(matchedSql).get(params).c
	const { limit, offset } = pageOf(q, matched)
	const page = db.prepare(`SELECT c.id FROM ${from} WHERE ${where.join(' AND ')} ORDER BY ${fav ? 'c.favourite DESC, ' : ''}${sort.by} LIMIT @limit OFFSET @offset`)
		.all({ ...params, limit, offset })
	return { categories: rowsFor(userId, page.map(r => r.id), extras, month, view), matched }
}

const selectLimited = db.prepare('SELECT id, name, icon, colour, budget, budget_period, favourite FROM categories WHERE user_id = ? AND budget > 0')

/** Every category with a limit, by name, as who it is and its limit: never paged, so none is ever
    left out. `spend` adds the spend of this month and of this year; `over` keeps those whose spend in
    their own period is past the limit. */
export function limitedCategories(userId, today, { over = false, spend = false, languages = [] } = {}) {
	let rows = selectLimited.all(userId)
	if ((over || spend) && rows.length) {
		const params = { userId, ids: JSON.stringify(rows.map(c => c.id)), ...monthOf(today) }
		const month = sumBy(selectMonth.all(params), 'spend')
		const year = sumBy(selectPeriodYear.all(params), 'spend')
		rows = rows.map(c => ({ ...c, monthSpend: month.get(c.id) ?? 0, yearSpend: year.get(c.id) ?? 0 }))
		if (over) rows = rows.filter(c => spendInPeriod(c.budget_period, c.monthSpend, c.yearSpend) > c.budget)
	}
	const compare = nameOrder(languages)
	return rows.sort((a, b) => compare(a.name, b.name)).map(c => ({
		id: c.id, name: c.name, icon: c.icon, colour: c.colour, budget: c.budget, budgetPeriod: c.budget_period, favourite: Boolean(c.favourite),
		...(spend ? { monthSpend: c.monthSpend, yearSpend: c.yearSpend } : {})
	}))
}

/** Which of these names a category of the account already has, in any case: what an import would not create. */
export function knownCategoryNames(userId, names) {
	const held = new Set(selectAccountNames.all(userId).map(r => r.name.trim().toLowerCase()))
	return names.filter(name => held.has(name.toLowerCase()))
}
