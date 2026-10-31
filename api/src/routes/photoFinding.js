import { Router } from 'express'
import { findingFor, startFindingPhotos } from '../lib/linePhotos.js'

/* Find photos (Order editing layouts 1a): start a search for an order's lines with no photo, and
   ask how the reader's searches have come along. */
export const router = Router()

router.get('/', (req, res) => {
	res.json({ searches: findingFor(req.user.id) })
})

router.post('/:orderId', (req, res) => {
	const started = startFindingPhotos(req.user.id, req.params.orderId)
	if (!started) throw Object.assign(new Error('No order ' + req.params.orderId), { status: 404 })
	res.status(202).json(started)
})
