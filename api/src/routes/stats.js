import { Router } from 'express'
import { filterOf, getStats, homeAttention, markSummarySeen, monthlySummary, sliceLines, sliceOrders } from '../lib/stats.js'

export const router = Router()

router.get('/', (req, res) => {
	const compare = req.query.compare === 'year' ? 'year' : 'previous'
	res.json(getStats(req.user.id, req.query.range, req.query.windowId, { compare, today: req.today, filter: filterOf(req.query) }))
})

router.get('/orders', (req, res) => {
	res.json(sliceOrders(req.user.id, req.query, req.today))
})

router.get('/lines', (req, res) => {
	res.json({ lines: sliceLines(req.user.id, req.query, req.today) })
})

router.get('/home', (req, res) => {
	res.json(homeAttention(req.user.id))
})

router.get('/summary', (req, res) => {
	res.json(monthlySummary(req.user.id, req.today))
})

router.put('/summary/seen', (req, res) => {
	if (!markSummarySeen(req.user.id, req.body?.month)) return res.status(400).json({ error: 'Which month?' })
	res.status(204).end()
})
