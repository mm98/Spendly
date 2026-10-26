import { Router } from 'express'
import { db } from '../db.js'
import { offersForOrder } from '../offers/lines.js'
import { offerPicks, pickedFor, setOfferPicks, setPickedFor } from '../offers/picks.js'

export const router = Router()

const LINES_MOST = 500
const CATEGORIES_MOST = 50
const IDS_MOST = 5000
// a name typed on an order being made is the vendor it resolves to, by its name or one of its other names
const selectVendorIdByName = db.prepare(`SELECT id FROM vendors WHERE user_id = @userId AND lower(name) = lower(@name)
	UNION ALL SELECT vendor_id FROM vendor_aliases WHERE user_id = @userId AND lower(name) = lower(@name) LIMIT 1`)

// categories typed on an order being made are named, not yet stored on it
const selectCategoryIdsByName = db.prepare(`SELECT id FROM categories WHERE user_id = @userId
	AND lower(name) IN (SELECT lower(value) FROM json_each(@names))`)

function vendorIdOf(userId, vendorId, vendorName) {
	if (typeof vendorId === 'string') return vendorId
	const name = typeof vendorName === 'string' ? vendorName.trim() : ''
	return name ? selectVendorIdByName.get({ userId, name })?.id ?? null : null
}

const isDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
const idsOf = (list, most) => (Array.isArray(list) ? list.filter(id => typeof id === 'string').slice(0, most) : [])

/* This week's offers for an order's lines, sent since an order being edited is not what is stored (1a).
   Only `check` asks the offer site; without it a kept answer is read, so opening an order asks nothing. */
router.post('/order', async (req, res) => {
	const { vendorId, vendorName, categoryIds, categoryNames, date, lines, check } = req.body ?? {}
	if (!isDay(date) || !Array.isArray(lines) || lines.length > LINES_MOST) return res.status(400).json({ error: 'Send the order\'s date and lines.' })
	const cleaned = lines.map(l => ({
		title: typeof l?.title === 'string' ? l.title : '',
		quantity: Number(l?.quantity) || 0,
		price: Number(l?.price) || 0
	}))
	const stop = new AbortController()
	res.on('close', () => { if (!res.writableEnded) stop.abort() })
	try {
		res.json(await offersForOrder({
			userId: req.user.id,
			today: req.today,
			vendorId: vendorIdOf(req.user.id, vendorId, vendorName),
			categoryIds: Array.isArray(categoryNames)
				? selectCategoryIdsByName.all({ userId: req.user.id, names: JSON.stringify(idsOf(categoryNames, CATEGORIES_MOST)) }).map(r => r.id)
				: idsOf(categoryIds, CATEGORIES_MOST),
			date,
			lines: cleaned,
			keptOnly: check !== true
		}, stop.signal))
	} catch (error) {
		if (!stop.signal.aborted) res.status(502).json({ error: 'Offers could not be checked.' })
	}
})

/* Which vendors and categories get each source's Check offers (Settings and import 11a). */
router.get('/picks', (req, res) => res.json({ sources: offerPicks(req.user.id) }))

router.put('/picks', (req, res) => {
	const asked = req.body?.sources
	if (!asked || typeof asked !== 'object') return res.status(400).json({ error: 'Send the picks of each source.' })
	const sources = Object.fromEntries(Object.entries(asked).map(([key, picks]) => [key, {
		vendorIds: idsOf(picks?.vendorIds, IDS_MOST),
		categoryIds: idsOf(picks?.categoryIds, IDS_MOST)
	}]))
	setOfferPicks(req.user.id, sources)
	res.json({ sources: offerPicks(req.user.id) })
})

/* One vendor's or category's switches (Vendors and categories 5c, 5f): { sources: [{ key, name, picked }] }. */
const KINDS = new Set(['vendor', 'category'])

router.get('/picks/:kind/:id', (req, res) => {
	if (!KINDS.has(req.params.kind)) return res.status(404).json({ error: 'There is no such list.' })
	res.json({ sources: pickedFor(req.user.id, req.params.kind, req.params.id) })
})

router.put('/picks/:kind/:id', (req, res) => {
	if (!KINDS.has(req.params.kind)) return res.status(404).json({ error: 'There is no such list.' })
	const asked = req.body?.picked
	if (!asked || typeof asked !== 'object') return res.status(400).json({ error: 'Send which sources it is picked for.' })
	setPickedFor(req.user.id, req.params.kind, req.params.id, asked)
	res.json({ sources: pickedFor(req.user.id, req.params.kind, req.params.id) })
})
