import { Router } from 'express'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { vendorStats } from '../lib/aggregate.js'
import { colourFor } from '../lib/palette.js'

export const router = Router()

const VENDOR_COLUMNS = 'id, name, initials, colour, favourite, lead'
const selectAll = db.prepare(`SELECT ${VENDOR_COLUMNS} FROM vendors WHERE user_id = ? ORDER BY name`)
const selectOne = db.prepare(`SELECT ${VENDOR_COLUMNS} FROM vendors WHERE id = ? AND user_id = ?`)
const selectByNameExists = db.prepare('SELECT id FROM vendors WHERE user_id = ? AND lower(name) = lower(?)')
const insert = db.prepare(`INSERT INTO vendors (id, user_id, name, initials, colour, favourite, lead)
	VALUES (@id, @userId, @name, @initials, @colour, @favourite, @lead)`)
const countOrders = db.prepare('SELECT COUNT(*) c FROM orders WHERE vendor_id = ? AND user_id = ?')
const deleteOne = db.prepare('DELETE FROM vendors WHERE id = ? AND user_id = ?')
const update = db.prepare('UPDATE vendors SET name=@name, initials=@initials, colour=@colour, favourite=@favourite, lead=@lead WHERE id=@id AND user_id=@userId')

const withStats = (vendor, stats) => {
	const s = stats.get(vendor.id) ?? { orders: 0, spend: 0, saved: 0 }
	return {
		id: vendor.id, name: vendor.name, initials: vendor.initials, colour: vendor.colour,
		favourite: Boolean(vendor.favourite), lead: vendor.lead ?? undefined,
		orders: s.orders, spend: s.spend, saved: s.saved
	}
}

router.get('/', (req, res) => {
	const stats = vendorStats(req.user.id)
	res.json(selectAll.all(req.user.id).map(v => withStats(v, stats)))
})

router.post('/', (req, res) => {
	const name = String(req.body?.name ?? '').trim()
	if (!name) return res.status(400).json({ error: 'A vendor needs a name.' })
	if (selectByNameExists.get(req.user.id, name))
		return res.status(409).json({ error: `You already have a vendor called ${name}.` })

	const look = req.body?.look ?? {}
	const vendor = {
		id: newId('v'), userId: req.user.id, name,
		initials: look.initials ?? name.slice(0, 2).toUpperCase(),
		colour: look.colour ?? colourFor(name),
		favourite: look.favourite ? 1 : 0, lead: look.lead ?? null
	}
	insert.run(vendor)
	res.status(201).json(withStats({ ...vendor, favourite: vendor.favourite }, new Map()))
})

router.get('/:id', (req, res) => {
	const vendor = selectOne.get(req.params.id, req.user.id)
	if (!vendor) return res.status(404).json({ error: 'No vendor ' + req.params.id })
	res.json(withStats(vendor, vendorStats(req.user.id)))
})

router.patch('/:id', (req, res) => {
	const vendor = selectOne.get(req.params.id, req.user.id)
	if (!vendor) return res.status(404).json({ error: 'No vendor ' + req.params.id })
	const patch = req.body ?? {}
	if (patch.name && patch.name.trim().toLowerCase() !== vendor.name.toLowerCase()) {
		const clash = selectByNameExists.get(req.user.id, patch.name.trim())
		if (clash) return res.status(409).json({ error: `You already have a vendor called ${patch.name.trim()}.` })
	}
	const next = {
		name: patch.name?.trim() ?? vendor.name,
		initials: patch.initials ?? vendor.initials,
		colour: patch.colour ?? vendor.colour,
		favourite: patch.favourite != null ? (patch.favourite ? 1 : 0) : vendor.favourite,
		lead: patch.lead !== undefined ? patch.lead : vendor.lead
	}
	update.run({ ...next, id: vendor.id, userId: req.user.id })
	res.json(withStats(selectOne.get(vendor.id, req.user.id), vendorStats(req.user.id)))
})

router.delete('/:id', (req, res) => {
	const vendor = selectOne.get(req.params.id, req.user.id)
	if (!vendor) return res.status(404).json({ error: 'No vendor ' + req.params.id })
	if (countOrders.get(vendor.id, req.user.id).c > 0)
		return res.status(409).json({ error: 'That vendor still has orders.' })
	deleteOne.run(vendor.id, req.user.id)
	res.json({ id: vendor.id })
})
