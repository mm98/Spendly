import { Router } from 'express'
import { findCompany, isCvrNumber } from '../lib/cvrRegister.js'

/* A company in the CVR register by its number (Invoice 24c, 24d; Vendors 5m): looked up as the
   number is typed, in the invoice dialog and on the vendor page. */

export const router = Router()

// { status, company }
router.get('/:cvr', async (req, res, next) => {
	try {
		const cvr = String(req.params.cvr ?? '').replace(/\s+/g, '')
		if (!isCvrNumber(cvr)) return res.status(400).json({ error: 'A CVR number has 8 digits.' })
		const answer = await findCompany(cvr)
		// a spent day or a failed lookup can change without a write, so Try again asks again
		if (answer.status === 'limit' || answer.status === 'failed') res.set('Cache-Control', 'no-store')
		res.json(answer)
	} catch (e) { next(e) }
})
