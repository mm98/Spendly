import { Router } from 'express'
import { db } from '../db.js'
import { offersForOrder } from '../offers/lines.js'

export const router = Router()

const LINES_MOST = 500
const selectVendorNames = db.prepare(`SELECT name FROM vendors WHERE id = @vendorId AND user_id = @userId
	UNION ALL SELECT name FROM vendor_aliases WHERE vendor_id = @vendorId AND user_id = @userId`)
// a name typed on an order being made is the vendor it resolves to, by its name or one of its other names
const selectVendorIdByName = db.prepare(`SELECT id FROM vendors WHERE user_id = @userId AND lower(name) = lower(@name)
	UNION ALL SELECT vendor_id FROM vendor_aliases WHERE user_id = @userId AND lower(name) = lower(@name) LIMIT 1`)

function shopNamesOf(userId, vendorId, vendorName) {
	if (typeof vendorId === 'string') return selectVendorNames.all({ vendorId, userId }).map(r => r.name)
	const name = typeof vendorName === 'string' ? vendorName.trim() : ''
	if (!name) return []
	const known = selectVendorIdByName.get({ userId, name })?.id
	return known ? selectVendorNames.all({ vendorId: known, userId }).map(r => r.name) : [name]
}

const isDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

/* This week's offers for an order's lines, sent since an order being edited is not what is stored (1a).
   Only `check` asks the offer site; without it a kept answer is read, so opening an order asks nothing. */
router.post('/order', async (req, res) => {
	const { vendorId, vendorName, date, lines, check } = req.body ?? {}
	if (!isDay(date) || !Array.isArray(lines) || lines.length > LINES_MOST) return res.status(400).json({ error: 'Send the order\'s date and lines.' })
	const shopNames = shopNamesOf(req.user.id, vendorId, vendorName)
	const cleaned = lines.map(l => ({
		title: typeof l?.title === 'string' ? l.title : '',
		quantity: Number(l?.quantity) || 0,
		price: Number(l?.price) || 0
	}))
	const stop = new AbortController()
	res.on('close', () => { if (!res.writableEnded) stop.abort() })
	try {
		res.json(await offersForOrder({ userId: req.user.id, today: req.today, shopNames, date, lines: cleaned, keptOnly: check !== true }, stop.signal))
	} catch (error) {
		if (!stop.signal.aborted) res.status(502).json({ error: 'Offers could not be checked.' })
	}
})
