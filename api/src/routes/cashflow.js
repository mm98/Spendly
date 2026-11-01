import { Router } from 'express'
import { cashFlow } from '../lib/cashflow.js'
import { words } from '../lib/phrases.js'

export const router = Router()

// where the income of whole months goes (4h): from and to are months, YYYY-MM
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
router.get('/', (req, res) => {
	const { from, to } = req.query
	if (!MONTH.test(from ?? '') || !MONTH.test(to ?? '') || from > to)
		return res.status(400).json({ error: words('stats.whichMonth') })
	res.json({ flow: cashFlow(req.user.id, from, to) })
})
