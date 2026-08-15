import { Router } from 'express'
import { db } from '../db.js'
import { getHomeHero } from '../lib/stats.js'

export const router = Router()

router.get('/hero', (req, res) => {
	res.json(getHomeHero(req.user.id, req.query.range))
})

const countFavouriteVendors = db.prepare('SELECT COUNT(*) c FROM vendors WHERE user_id = ? AND favourite = 1')
const countOrders = db.prepare('SELECT COUNT(*) c FROM orders WHERE user_id = ?')
const countCustomDashboard = db.prepare('SELECT COUNT(*) c FROM dashboard_cards WHERE user_id = ?')

/* GET /question is gone, with the question-of-the-day card it existed for.

   It was two aggregate queries — last calendar month's top category, then that category's order
   count — built to fill one card on Orders overview and one on Categories. Both cards have been
   removed, so the route answered nobody. A route with no caller is not free: it is a query
   somebody has to keep working, a shape somebody has to keep compatible, and a thing the next
   reader has to look up before finding out nothing reads it.

   `/onboarding` stays, and this is why it is separate. The two used to share GET /api/home and
   every caller took one and threw the other away — Home read `onboarding` and discarded the
   question, Orders overview and Categories read `question` and discarded three COUNTs. Split,
   removing one costs nothing; joined, this would have been surgery on a shape Home depends on. */

router.get('/onboarding', (req, res) => {
	const steps = [
		countOrders.get(req.user.id).c > 0,
		countFavouriteVendors.get(req.user.id).c > 0,
		countCustomDashboard.get(req.user.id).c > 0
	]
	res.json({ done: steps.filter(Boolean).length, total: steps.length })
})
