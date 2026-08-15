import { Router } from 'express'
import { db } from '../db.js'
import { getHomeHero } from '../lib/stats.js'

export const router = Router()

router.get('/hero', (req, res) => {
	res.json(getHomeHero(req.user.id, req.query.range))
})

const monthKey = date => date.slice(0, 7)
const selectLastMonthTop = db.prepare(`
	SELECT c.id, c.name, SUM(ot.total * 1.0 / cc.cat_count) AS spend
	FROM order_categories oc
	JOIN order_totals ot ON ot.id = oc.order_id
	JOIN categories c ON c.id = oc.category_id
	JOIN (SELECT order_id, COUNT(*) AS cat_count FROM order_categories GROUP BY order_id) cc ON cc.order_id = oc.order_id
	WHERE ot.user_id = @userId AND strftime('%Y-%m', ot.date, 'unixepoch') = @month
	GROUP BY c.id ORDER BY spend DESC LIMIT 1
`)
const selectLastMonthOrderCount = db.prepare(`
	SELECT COUNT(*) c FROM order_categories oc JOIN orders o ON o.id = oc.order_id
	WHERE o.user_id = @userId AND oc.category_id = @categoryId AND strftime('%Y-%m', o.date, 'unixepoch') = @month
`)

/** "What did Groceries cost me in June?" — real, computed from last calendar month's actual
    category spend, not a fact frozen into the seed data. `from`/`to` are that month's real
    bounds, for a caller that wants to link straight to the orders behind the answer — the
    prototype's own such link was hardcoded to "2026-06-01..2026-06-30" regardless of which
    month or category the question was actually about. Null once there's nothing to ask about
    (a brand-new account whose only month is the current, incomplete one). */
function questionOfTheDay(userId) {
	const now = new Date()
	const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
	const monthName = lastMonth.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
	const month = monthKey(lastMonth.toISOString())
	const top = selectLastMonthTop.get({ userId, month })
	if (!top) return null
	const orderCount = selectLastMonthOrderCount.get({ userId, categoryId: top.id, month }).c
	const amount = Math.round(top.spend).toLocaleString('da-DK') + ' kr.'
	const monthEnd = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + 1, 0))
	return {
		question: `What did ${top.name} cost me in ${monthName}?`,
		short: `What did ${top.name} cost in ${monthName}?`,
		answer: `${amount}, across ${orderCount} order${orderCount === 1 ? '' : 's'} in ${monthName}.`,
		detail: `That was this account's top category in ${monthName}.`,
		categoryId: top.id, categoryName: top.name,
		from: month + '-01', to: monthEnd.toISOString().slice(0, 10)
	}
}

const countFavouriteVendors = db.prepare('SELECT COUNT(*) c FROM vendors WHERE user_id = ? AND favourite = 1')
const countOrders = db.prepare('SELECT COUNT(*) c FROM orders WHERE user_id = ?')
const countCustomDashboard = db.prepare('SELECT COUNT(*) c FROM dashboard_cards WHERE user_id = ?')

router.get('/', (req, res) => {
	const steps = [
		countOrders.get(req.user.id).c > 0,
		countFavouriteVendors.get(req.user.id).c > 0,
		countCustomDashboard.get(req.user.id).c > 0
	]
	res.json({
		questionOfTheDay: questionOfTheDay(req.user.id),
		onboarding: { done: steps.filter(Boolean).length, total: steps.length }
	})
})
