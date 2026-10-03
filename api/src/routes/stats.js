import { Router } from 'express'
import { filterOf, getStats, homeAttention, markSummarySeen, monthlySummary, setSummaryLineHidden, sliceLines, sliceOrders } from '../lib/stats.js'

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

router.put('/summary/hidden', (req, res) => {
	const { month, categoryId, hidden } = req.body ?? {}
	if (!setSummaryLineHidden(req.user.id, month, categoryId, hidden !== false)) return res.status(400).json({ error: 'Which month and category?' })
	res.status(204).end()
})
