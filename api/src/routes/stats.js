import { Router } from 'express'
import { getStats } from '../lib/stats.js'

export const router = Router()

router.get('/', (req, res) => {
	res.json(getStats(req.user.id, req.query.range, req.query.windowId))
})
