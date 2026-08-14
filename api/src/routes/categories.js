import { Router } from 'express'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { categoryStats } from '../lib/aggregate.js'

export const router = Router()

const CATEGORY_COLUMNS = 'id, name, icon, icon_path, colour, budget'
const selectAll = db.prepare(`SELECT ${CATEGORY_COLUMNS} FROM categories WHERE user_id = ? ORDER BY name`)
const selectOne = db.prepare(`SELECT ${CATEGORY_COLUMNS} FROM categories WHERE id = ? AND user_id = ?`)
const selectByNameExists = db.prepare('SELECT id FROM categories WHERE user_id = ? AND lower(name) = lower(?)')
const insert = db.prepare(`INSERT INTO categories (id, user_id, name, icon, icon_path, colour, budget)
	VALUES (@id, @userId, @name, @icon, @iconPath, @colour, @budget)`)
const countOrders = db.prepare('SELECT COUNT(*) c FROM order_categories oc JOIN orders o ON o.id = oc.order_id WHERE oc.category_id = ? AND o.user_id = ?')
const deleteOne = db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?')
const update = db.prepare('UPDATE categories SET name=@name, icon=@icon, icon_path=@iconPath, colour=@colour, budget=@budget WHERE id=@id AND user_id=@userId')

const withStats = (category, stats) => {
	const s = stats.get(category.id) ?? { spend: 0, share: 0, saved: 0 }
	return {
		id: category.id, name: category.name, icon: category.icon, iconPath: category.icon_path,
		colour: category.colour, budget: category.budget,
		spend: s.spend, share: s.share, saved: s.saved
	}
}

router.get('/', (req, res) => {
	const stats = categoryStats(req.user.id)
	res.json(selectAll.all(req.user.id).map(c => withStats(c, stats)))
})

/** Top categories by spend, for the categories-overview tab. Registered before /:id so
    "overview" isn't captured as an id param. */
router.get('/overview', (req, res) => {
	const stats = categoryStats(req.user.id)
	const top = selectAll.all(req.user.id).map(c => withStats(c, stats)).sort((a, b) => b.spend - a.spend).slice(0, 5)
	res.json({ top, total: selectAll.all(req.user.id).length })
})

router.post('/', (req, res) => {
	const name = String(req.body?.name ?? '').trim()
	if (!name) return res.status(400).json({ error: 'A category needs a name.' })
	if (selectByNameExists.get(req.user.id, name))
		return res.status(409).json({ error: `You already have a category called ${name}.` })

	const look = req.body?.look ?? {}
	const category = {
		id: newId('c'), userId: req.user.id, name,
		icon: look.icon ?? 'tag', iconPath: look.iconPath ?? null,
		colour: look.colour ?? 'var(--icon-red)', budget: Number(look.budget) || 0
	}
	insert.run(category)
	res.status(201).json(withStats(category, new Map()))
})

router.get('/:id', (req, res) => {
	const category = selectOne.get(req.params.id, req.user.id)
	if (!category) return res.status(404).json({ error: 'No category ' + req.params.id })
	res.json(withStats(category, categoryStats(req.user.id)))
})

router.patch('/:id', (req, res) => {
	const category = selectOne.get(req.params.id, req.user.id)
	if (!category) return res.status(404).json({ error: 'No category ' + req.params.id })
	const patch = req.body ?? {}
	if (patch.name && patch.name.trim().toLowerCase() !== category.name.toLowerCase()) {
		const clash = selectByNameExists.get(req.user.id, patch.name.trim())
		if (clash) return res.status(409).json({ error: `You already have a category called ${patch.name.trim()}.` })
	}
	const next = {
		name: patch.name?.trim() ?? category.name,
		icon: patch.icon ?? category.icon,
		iconPath: patch.iconPath !== undefined ? patch.iconPath : category.icon_path,
		colour: patch.colour ?? category.colour,
		budget: patch.budget != null ? Number(patch.budget) || 0 : category.budget
	}
	update.run({ ...next, id: category.id, userId: req.user.id })
	res.json(withStats(selectOne.get(category.id, req.user.id), categoryStats(req.user.id)))
})

router.delete('/:id', (req, res) => {
	const category = selectOne.get(req.params.id, req.user.id)
	if (!category) return res.status(404).json({ error: 'No category ' + req.params.id })
	const used = countOrders.get(category.id, req.user.id).c
	if (used) return res.status(409).json({ error: `That category is on ${used} order${used === 1 ? '' : 's'}.` })
	deleteOne.run(category.id, req.user.id)
	res.json({ id: category.id })
})
