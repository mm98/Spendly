import { Router } from 'express'
import { FLOWS, STEPS, comparedMonth, filterOf, getStats, homeAttention, markSummarySeen, monthTotals, monthlySummary, sliceOrders } from '../lib/stats.js'

export const router = Router()

router.get('/', (req, res) => {
	const compare = req.query.compare === 'year' ? 'year' : 'previous'
	const step = STEPS.includes(req.query.step) ? req.query.step : undefined
	res.json(getStats(req.user.id, req.query.range, req.query.windowId, { compare, today: req.today, filter: filterOf(req.query), step }))
})

// each of the last `count` months' spend and orders, ending with this one (Home's months chart)
router.get('/months', (req, res) => {
	const count = Math.min(24, Math.max(1, Math.floor(Number(req.query.count)) || 8))
	const flow = FLOWS.includes(req.query.flow) ? req.query.flow : 'expenses'
	res.json({ months: monthTotals(req.user.id, count, flow, req.today) })
})

router.get('/orders', (req, res) => {
	res.json(sliceOrders(req.user.id, req.query, req.today))
})

router.get('/home', (req, res) => {
	res.json(homeAttention(req.user.id, req.today))
})

router.get('/compared', (req, res) => {
	res.json(comparedMonth(req.user.id, req.today.slice(0, 7)))
})

router.get('/summary', (req, res) => {
	res.json(monthlySummary(req.user.id, req.today))
})

router.put('/summary/seen', (req, res) => {
	if (!markSummarySeen(req.user.id, req.body?.month)) return res.status(400).json({ error: 'Which month?' })
	res.status(204).end()
})
