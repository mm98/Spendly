import { Router } from 'express'
import { MAX_RECORD_NAME, textProblem } from '../lib/validate.js'
import { describe, fromModel, suggestFromHistory } from '../lib/categorySuggest.js'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { findCategoryByFold, nextCategoryColour } from '../lib/findOrCreate.js'
import { todayIso, toEpoch } from '../lib/dates.js'
import {
	categoryMonthAverages, categoryMonthSpends, categoryStatsFor, bookmarkCategoryCounts
} from '../lib/aggregate.js'
import { wantsPage } from '../lib/listPage.js'
import { categoryPage, knownCategoryNames, limitedCategories } from '../lib/categoryList.js'
import { recentCategoryNames } from '../lib/latestOrders.js'
import { words } from '../lib/phrases.js'
import { CATEGORY_BUDGET_PERIODS } from '../lib/constants.js'

export const router = Router()

const CATEGORY_COLUMNS = 'id, name, icon, icon_path, colour, budget, budget_period, favourite'
const selectAll = db.prepare(`SELECT ${CATEGORY_COLUMNS}, order_count FROM categories WHERE user_id = ? ORDER BY name`)
const selectOne = db.prepare(`SELECT ${CATEGORY_COLUMNS} FROM categories WHERE id = ? AND user_id = ?`)
const selectByNameExists = db.prepare('SELECT id FROM categories WHERE user_id = ? AND lower(name) = lower(?)')
const insert = db.prepare(`INSERT INTO categories (id, user_id, name, icon, icon_path, colour, budget, budget_period, favourite)
	VALUES (@id, @userId, @name, @icon, @iconPath, @colour, @budget, @budgetPeriod, @favourite)`)
/* CROSS JOIN so the count is driven from the category's own covering link index
   (idx_order_categories_cat) with an ownership probe per link -- a plain JOIN let the planner
   start from the orders side and read all 50,000 of an account's rows to count one category's
   links: 12.2ms against 1.5ms, same count. */
// A bookmark holds a category in use the same way an order does; without this the delete below
// reaches SQLite's foreign key and answers 500 instead of a sentence.
const countBookmarks = db.prepare('SELECT COUNT(*) c FROM bookmark_categories bc CROSS JOIN bookmarks b ON b.id = bc.bookmark_id WHERE bc.category_id = ? AND b.user_id = ?')
const deleteOne = db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?')
const update = db.prepare('UPDATE categories SET name=@name, icon=@icon, icon_path=@iconPath, colour=@colour, budget=@budget, budget_period=@budgetPeriod, favourite=@favourite WHERE id=@id AND user_id=@userId')

const ZERO_STATS = { orders: 0, spend: 0, saved: 0 }

// The single record, in full: its form and rail read it.
const withStats = (category, stats = ZERO_STATS, bookmarks = 0, extra = {}) => ({
	id: category.id, name: category.name, icon: category.icon, iconPath: category.icon_path,
	colour: category.colour, budget: category.budget, budgetPeriod: category.budget_period ?? category.budgetPeriod, favourite: Boolean(category.favourite),
	spend: stats.spend, saved: stats.saved, orders: stats.orders, bookmarks,
	monthAverage: extra.monthAverage ?? 0, monthSpends: extra.monthSpends ?? [], alone: extra.alone ?? 0
})

/* How many of a category's orders carry no other category: the delete dialog says how many are
   left with none. */
const countAlone = db.prepare(`SELECT COUNT(*) c FROM order_categories oc CROSS JOIN orders o ON o.id = oc.order_id
	WHERE oc.category_id = ? AND o.user_id = ? AND o.category_count = 1`)

/** The single record as its page reads it: its 12-month average from its own months, not the account's rollup. */
function fullRecord(userId, category, req) {
	const monthSpends = categoryMonthSpends(userId, category.id, toEpoch(req.today ?? todayIso()))
	return withStats(category, categoryStatsFor(userId, category.id), countBookmarks.get(category.id, userId).c, {
		monthAverage: monthSpends.reduce((sum, n) => sum + n, 0) / 12, monthSpends,
		alone: countAlone.get(category.id, userId).c
	})
}

// A list row: what the lists, filters and pickers read; the counts say whether a filter is worth offering.
const listRow = (category, orders = 0, bookmarks = 0) => ({
	id: category.id, name: category.name, icon: category.icon, colour: category.colour, budget: category.budget, budgetPeriod: category.budget_period, orders, bookmarks
})

/* `?average=1` adds each category's 12-month average: only the Categories page reads it, so the
   pickers that read this list do not pay for it. */
router.get('/', (req, res) => {
	if (wantsPage(req.query)) return res.json(categoryPage(req.user.id, req.query, req.today ?? todayIso(), req.acceptsLanguages()))
	const bookmarkCounts = bookmarkCategoryCounts(req.user.id)
	const averages = req.query.average ? categoryMonthAverages(req.user.id, toEpoch(req.today ?? todayIso())) : null
	res.json(selectAll.all(req.user.id).map(c => {
		const row = listRow(c, c.order_count, bookmarkCounts.get(c.id))
		return averages ? { ...row, monthAverage: averages.get(c.id) ?? 0 } : row
	}))
})

// every category with a limit, or only those over it in their own period (`over=yes`), with this month's
// and this year's spend when `with=spend`; registered before /:id
router.get('/limited', (req, res) => res.json({
	categories: limitedCategories(req.user.id, req.today ?? todayIso(), {
		over: req.query.over === 'yes', spend: req.query.with === 'spend', languages: req.acceptsLanguages()
	})
}))

// the colour a new category's form starts on; registered before /:id, or that route would answer it
router.get('/colour', (req, res) => res.json({ colour: nextCategoryColour(req.user.id) }))

// The client's own budget field rejects a leading "-" (AMOUNT_PATTERN has no sign in it at
// all), so a negative budget only ever reached this table by calling the API directly -- but it
// did reach it, and "budget: -500" survives to render as "100 kr of -500 kr budget" on the row
// and an inverted share in the against-budget meter. Same non-negative rule, checked again here
// rather than trusted from the form that happens to enforce it today.
const nonNegative = n => (Number.isFinite(n) && n >= 0 ? n : 0)

const budgetPeriodProblem = period => (period === undefined || CATEGORY_BUDGET_PERIODS.includes(period) ? null : words('category.budgetPeriod'))

/** Which of the names sent a category already has: `{ known }`, the ones an import would not create. */
router.post('/known', (req, res) => {
	const names = Array.isArray(req.body?.names) ? req.body.names.map(n => String(n ?? '').trim()).filter(Boolean) : []
	if (names.length > 5000) return res.status(400).json({ error: words('category.tooManyNames') })
	res.json({ known: knownCategoryNames(req.user.id, [...new Set(names)]) })
})

/** Up to three categories for an order's items. By default from the account's earlier orders; with
    `model` set, from a model, which can also offer a category that does not exist yet. */
router.post('/suggestions', async (req, res) => {
	const { items, vendor, exclude, model } = req.body ?? {}
	if (!Array.isArray(items) || items.length > 100) return res.status(400).json({ error: words('category.itemList') })
	const asked = { items, exclude, vendor: String(vendor ?? '').trim().slice(0, 80) }
	// the model is paid for, so it waits for a confirmed email, as scanning does
	if (model) return res.json(req.user.email_confirmed ? await fromModel(req.user.id, asked) : { suggestions: [], failure: 'failed' })
	res.json({ suggestions: describe(req.user.id, await suggestFromHistory(req.user.id, asked)), failure: null })
})

const categoryProblem = c => textProblem(c.name, 'text.label.name', MAX_RECORD_NAME) ?? textProblem(c.icon, 'text.label.icon', 60)
	?? textProblem(c.iconPath, 'text.label.iconDrawing', 20000) ?? textProblem(c.colour, 'text.label.colour', 40)

router.post('/', (req, res) => {
	const name = String(req.body?.name ?? '').trim()
	if (!name) return res.status(400).json({ error: words('category.nameMissing') })
	const taken = selectByNameExists.get(req.user.id, name) ? { name } : findCategoryByFold(req.user.id, name)
	if (taken) return res.status(409).json({ error: words('category.twin', { name: taken.name }) })

	const look = req.body?.look ?? {}
	const problem = categoryProblem({ name, ...look }) ?? budgetPeriodProblem(look.budgetPeriod)
	if (problem) return res.status(400).json({ error: problem })
	const category = {
		id: newId('c'), userId: req.user.id, name,
		icon: look.icon ?? 'tag', iconPath: look.iconPath ?? null,
		colour: look.colour ?? nextCategoryColour(req.user.id), budget: nonNegative(Number(look.budget)),
		budgetPeriod: look.budgetPeriod ?? CATEGORY_BUDGET_PERIODS[0],
		favourite: look.favourite ? 1 : 0
	}
	insert.run(category)
	res.status(201).json(withStats(category))
})

// the names the latest orders carry, for a picker's Recent group
router.get('/recent', (req, res) => res.json({ names: recentCategoryNames(req.user.id) }))

router.get('/:id', (req, res) => {
	const category = selectOne.get(req.params.id, req.user.id)
	if (!category) return res.status(404).json({ error: 'No category ' + req.params.id })
	res.json(fullRecord(req.user.id, category, req))
})

router.patch('/:id', (req, res) => {
	const category = selectOne.get(req.params.id, req.user.id)
	if (!category) return res.status(404).json({ error: 'No category ' + req.params.id })
	const patch = req.body ?? {}
	// Same rule and reason as the vendors PATCH: '' is not nullish, so a whitespace rename
	// stored an empty category name -- and it slipped past the clash check, whose `patch.name &&`
	// guard reads '' as "no rename asked".
	const nextName = patch.name !== undefined ? String(patch.name).trim() : category.name
	if (!nextName) return res.status(400).json({ error: words('category.nameMissing') })
	if (nextName.toLowerCase() !== category.name.toLowerCase()) {
		const clash = findCategoryByFold(req.user.id, nextName)
		if (clash && clash.id !== category.id) return res.status(409).json({ error: words('category.twin', { name: clash.name }) })
	}
	const problem = categoryProblem({ ...patch, name: nextName }) ?? budgetPeriodProblem(patch.budgetPeriod)
	if (problem) return res.status(400).json({ error: problem })
	const next = {
		name: nextName,
		icon: patch.icon ?? category.icon,
		iconPath: patch.iconPath !== undefined ? patch.iconPath : category.icon_path,
		colour: patch.colour ?? category.colour,
		budget: patch.budget != null ? nonNegative(Number(patch.budget)) : category.budget,
		budgetPeriod: patch.budgetPeriod ?? category.budget_period,
		favourite: patch.favourite != null ? (patch.favourite ? 1 : 0) : category.favourite
	}
	update.run({ ...next, id: category.id, userId: req.user.id })
	res.json(fullRecord(req.user.id, selectOne.get(category.id, req.user.id), req))
})

/* A category is optional, so one in use is deleted too (5f): its links go first; a vendor's
   defaults lose it by their own foreign key. */
const unlinkOrders = db.prepare(`DELETE FROM order_categories WHERE category_id = ?
	AND order_id IN (SELECT id FROM orders WHERE user_id = ?)`)
const unlinkBookmarks = db.prepare(`DELETE FROM bookmark_categories WHERE category_id = ?
	AND bookmark_id IN (SELECT id FROM bookmarks WHERE user_id = ?)`)
const removeCategory = db.transaction((userId, id) => {
	unlinkOrders.run(id, userId)
	unlinkBookmarks.run(id, userId)
	deleteOne.run(id, userId)
})

router.delete('/:id', (req, res) => {
	const category = selectOne.get(req.params.id, req.user.id)
	if (!category) return res.status(404).json({ error: 'No category ' + req.params.id })
	removeCategory(req.user.id, category.id)
	res.json({ id: category.id })
})

/* Merge (5j): the links move to the target (one carrying both keeps one), and the source is deleted. */
const moveOrderLinks = db.prepare(`INSERT OR IGNORE INTO order_categories (order_id, category_id)
	SELECT oc.order_id, @target FROM order_categories oc CROSS JOIN orders o ON o.id = oc.order_id
	WHERE oc.category_id = @source AND o.user_id = @userId`)
const moveBookmarkLinks = db.prepare(`INSERT OR IGNORE INTO bookmark_categories (bookmark_id, category_id)
	SELECT bc.bookmark_id, @target FROM bookmark_categories bc CROSS JOIN bookmarks b ON b.id = bc.bookmark_id
	WHERE bc.category_id = @source AND b.user_id = @userId`)
const moveDefaults = db.prepare(`INSERT OR IGNORE INTO vendor_default_categories (vendor_id, category_id)
	SELECT d.vendor_id, @target FROM vendor_default_categories d WHERE d.category_id = @source`)

const mergeCategories = db.transaction((userId, source, target) => {
	const ids = { source: source.id, target: target.id, userId }
	moveOrderLinks.run(ids)
	moveBookmarkLinks.run(ids)
	moveDefaults.run(ids)
	removeCategory(userId, source.id)
})

router.post('/:id/merge', (req, res) => {
	const source = selectOne.get(req.params.id, req.user.id)
	if (!source) return res.status(404).json({ error: 'No category ' + req.params.id })
	const target = selectOne.get(String(req.body?.into ?? ''), req.user.id)
	if (!target) return res.status(400).json({ error: words('category.pickTarget') })
	if (target.id === source.id) return res.status(400).json({ error: words('category.mergeSelf') })
	mergeCategories(req.user.id, source, target)
	res.json(fullRecord(req.user.id, selectOne.get(target.id, req.user.id), req))
})
