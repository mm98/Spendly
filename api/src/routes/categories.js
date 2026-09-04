import { Router } from 'express'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { categoryStats, categoryStatsFor, uncategorisedStats, wishCategoryCounts } from '../lib/aggregate.js'

export const router = Router()

const CATEGORY_COLUMNS = 'id, name, icon, icon_path, colour, budget, favourite'
const selectAll = db.prepare(`SELECT ${CATEGORY_COLUMNS} FROM categories WHERE user_id = ? ORDER BY name`)
const selectOne = db.prepare(`SELECT ${CATEGORY_COLUMNS} FROM categories WHERE id = ? AND user_id = ?`)
const selectByNameExists = db.prepare('SELECT id FROM categories WHERE user_id = ? AND lower(name) = lower(?)')
const insert = db.prepare(`INSERT INTO categories (id, user_id, name, icon, icon_path, colour, budget, favourite)
	VALUES (@id, @userId, @name, @icon, @iconPath, @colour, @budget, @favourite)`)
/* CROSS JOIN so the count is driven from the category's own covering link index
   (idx_order_categories_cat) with an ownership probe per link -- a plain JOIN let the planner
   start from the orders side and read all 50,000 of an account's rows to count one category's
   links: 12.2ms against 1.5ms, same count. */
const countOrders = db.prepare('SELECT COUNT(*) c FROM order_categories oc CROSS JOIN orders o ON o.id = oc.order_id WHERE oc.category_id = ? AND o.user_id = ?')
// A wish holds a category in use the same way an order does; without this the delete below
// reaches SQLite's foreign key and answers 500 instead of a sentence.
const countWishes = db.prepare('SELECT COUNT(*) c FROM wish_categories wc CROSS JOIN wishes w ON w.id = wc.wish_id WHERE wc.category_id = ? AND w.user_id = ?')
const deleteOne = db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?')
const update = db.prepare('UPDATE categories SET name=@name, icon=@icon, icon_path=@iconPath, colour=@colour, budget=@budget, favourite=@favourite WHERE id=@id AND user_id=@userId')

/* Driven from idx_order_categories_cat like countOrders above. OR IGNORE leans on the
   (order_id, category_id) key: an order already on the target keeps the one link it has. */
const linkOrdersTo = db.prepare(`INSERT OR IGNORE INTO order_categories (order_id, category_id)
	SELECT oc.order_id, ? FROM order_categories oc
	WHERE oc.category_id = ? AND EXISTS (SELECT 1 FROM orders o WHERE o.id = oc.order_id AND o.user_id = ?)`)
const unlinkOrders = db.prepare(`DELETE FROM order_categories WHERE category_id = ?
	AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_categories.order_id AND o.user_id = ?)`)

/* One transaction, so an interrupted move cannot leave an order on neither category. The count
   is read inside it for the same reason: it is what the answer reports as moved. */
const moveOrders = db.transaction((fromId, toId, userId) => {
	const moved = countOrders.get(fromId, userId).c
	linkOrdersTo.run(toId, fromId, userId)
	unlinkOrders.run(fromId, userId)
	return moved
})

const ZERO_STATS = { orders: 0, spend: 0, share: 0, saved: 0 }

// Order and wish usage ride beside spend/share -- the filter panels' own answer to "is this
// category worth offering," read for free by every consumer that already fetches the list.
const withStats = (category, stats = ZERO_STATS, wishes = 0) => ({
	id: category.id, name: category.name, icon: category.icon, iconPath: category.icon_path,
	colour: category.colour, budget: category.budget, favourite: Boolean(category.favourite),
	spend: stats.spend, share: stats.share, saved: stats.saved, orders: stats.orders, wishes
})

router.get('/', (req, res) => {
	const stats = categoryStats(req.user.id)
	const wishCounts = wishCategoryCounts(req.user.id)
	res.json(selectAll.all(req.user.id).map(c => withStats(c, stats.get(c.id), wishCounts.get(c.id) ?? 0)))
})

/* Registered before /:id, or that route would answer it with "No category uncategorised".
   Its own resource rather than a row in the list above: the list is the account's category
   records, and every reader of it -- comboboxes, order forms, settings -- maps records.
   A stand-in row there would be offered as something to assign and to edit. */
router.get('/uncategorised', (req, res) => res.json(uncategorisedStats(req.user.id)))

// The client's own budget field rejects a leading "-" (AMOUNT_PATTERN has no sign in it at
// all), so a negative budget only ever reached this table by calling the API directly -- but it
// did reach it, and "budget: -500" survives to render as "100 kr of -500 kr budget" on the row
// and an inverted share in the against-budget meter. Same non-negative rule, checked again here
// rather than trusted from the form that happens to enforce it today.
const nonNegative = n => (Number.isFinite(n) && n >= 0 ? n : 0)

router.post('/', (req, res) => {
	const name = String(req.body?.name ?? '').trim()
	if (!name) return res.status(400).json({ error: 'A category needs a name.' })
	if (selectByNameExists.get(req.user.id, name))
		return res.status(409).json({ error: `You already have a category called ${name}.` })

	const look = req.body?.look ?? {}
	const category = {
		id: newId('c'), userId: req.user.id, name,
		icon: look.icon ?? 'tag', iconPath: look.iconPath ?? null,
		colour: look.colour ?? '#C43F2A', budget: nonNegative(Number(look.budget)),
		favourite: look.favourite ? 1 : 0
	}
	insert.run(category)
	res.status(201).json(withStats(category))
})

router.get('/:id', (req, res) => {
	const category = selectOne.get(req.params.id, req.user.id)
	if (!category) return res.status(404).json({ error: 'No category ' + req.params.id })
	res.json(withStats(category, categoryStatsFor(req.user.id, category.id), countWishes.get(category.id, req.user.id).c))
})

router.patch('/:id', (req, res) => {
	const category = selectOne.get(req.params.id, req.user.id)
	if (!category) return res.status(404).json({ error: 'No category ' + req.params.id })
	const patch = req.body ?? {}
	// Same rule and reason as the vendors PATCH: '' is not nullish, so a whitespace rename
	// stored an empty category name -- and it slipped past the clash check, whose `patch.name &&`
	// guard reads '' as "no rename asked".
	const nextName = patch.name !== undefined ? String(patch.name).trim() : category.name
	if (!nextName) return res.status(400).json({ error: 'A category needs a name.' })
	if (nextName.toLowerCase() !== category.name.toLowerCase()) {
		const clash = selectByNameExists.get(req.user.id, nextName)
		if (clash) return res.status(409).json({ error: `You already have a category called ${nextName}.` })
	}
	const next = {
		name: nextName,
		icon: patch.icon ?? category.icon,
		iconPath: patch.iconPath !== undefined ? patch.iconPath : category.icon_path,
		colour: patch.colour ?? category.colour,
		budget: patch.budget != null ? nonNegative(Number(patch.budget)) : category.budget,
		favourite: patch.favourite != null ? (patch.favourite ? 1 : 0) : category.favourite
	}
	update.run({ ...next, id: category.id, userId: req.user.id })
	const updated = selectOne.get(category.id, req.user.id)
	res.json(withStats(updated, categoryStatsFor(req.user.id, category.id), countWishes.get(category.id, req.user.id).c))
})

/* The delete below refuses while a category is on an order, so this is the way out of it.
   Wishes are not touched: they carry categories through a table of their own. */
router.post('/:id/move-orders', (req, res) => {
	const category = selectOne.get(req.params.id, req.user.id)
	if (!category) return res.status(404).json({ error: 'No category ' + req.params.id })
	const toId = String(req.body?.to ?? '')
	if (toId === category.id) return res.status(400).json({ error: 'Pick a different category.' })
	const target = toId ? selectOne.get(toId, req.user.id) : null
	if (!target) return res.status(404).json({ error: 'No category ' + (toId || req.body?.to) })
	const moved = moveOrders(category.id, target.id, req.user.id)
	res.json({ moved, from: category.id, to: target.id, name: target.name })
})

router.delete('/:id', (req, res) => {
	const category = selectOne.get(req.params.id, req.user.id)
	if (!category) return res.status(404).json({ error: 'No category ' + req.params.id })
	const used = countOrders.get(category.id, req.user.id).c
	if (used) return res.status(409).json({ error: `That category is on ${used} order${used === 1 ? '' : 's'}.` })
	const wished = countWishes.get(category.id, req.user.id).c
	if (wished) return res.status(409).json({ error: `That category is on ${wished} wish${wished === 1 ? '' : 'es'}.` })
	deleteOne.run(category.id, req.user.id)
	res.json({ id: category.id })
})
