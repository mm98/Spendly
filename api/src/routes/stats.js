import { Router } from 'express'
import { filterOf, getStats, homeAttention, sliceLines, sliceOrders } from '../lib/stats.js'

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
