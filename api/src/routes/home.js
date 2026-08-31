import { Router } from 'express'
import { db } from '../db.js'
import { getHomeHero } from '../lib/stats.js'

export const router = Router()

router.get('/hero', (req, res) => {
	res.json(getHomeHero(req.user.id))
})

const countFavouriteVendors = db.prepare('SELECT COUNT(*) c FROM vendors WHERE user_id = ? AND favourite = 1')
/* EXISTS, not COUNT: the step below asks "has any order", and a COUNT walks the account's
   whole index to answer a question the first row settles -- all 50,000 entries counted to
   read `> 0` on a big account. The other two counters stay COUNTs over their dozen-row
   tables. */
const hasAnyOrder = db.prepare('SELECT EXISTS(SELECT 1 FROM orders WHERE user_id = ?) c')
const countCustomDashboard = db.prepare('SELECT COUNT(*) c FROM dashboard_cards WHERE user_id = ?')

/* GET /question is gone, with the question-of-the-day card it existed for.

   It was two aggregate queries — last calendar month's top category, then that category's order
   count — built to fill one card on Orders overview and one on Categories. Both cards have been
   removed, so the route answered nobody. A route with no caller is not free: it is a query
   somebody has to keep working, a shape somebody has to keep compatible, and a thing the next
   reader has to look up before finding out nothing reads it.

   `/onboarding` stays, and this is why it is separate: Home reads only `onboarding`, so removing
   `/question` costs nothing here -- a shared route would have made it surgery on a shape Home
   depends on. */

router.get('/onboarding', (req, res) => {
	const steps = [
		hasAnyOrder.get(req.user.id).c > 0,
		countFavouriteVendors.get(req.user.id).c > 0,
		countCustomDashboard.get(req.user.id).c > 0
	]
	res.json({ done: steps.filter(Boolean).length, total: steps.length })
})
