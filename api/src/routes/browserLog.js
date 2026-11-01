import express from 'express'
import { log } from '../lib/log.js'
import { limitPerVisitor } from '../lib/rateLimit.js'

/* The browser app's errors and warnings, written to the server log. Open before sign-in, since a
   signed-out page can fail too, so every part is cut to a length and a visitor is limited. */

const MOST_ENTRIES = 20
const LONGEST = { area: 40, message: 2000, page: 300, stack: 4000 }
const LEVELS = { error: log.error, warn: log.warn }

const cut = (value, most) => typeof value === 'string' ? value.slice(0, most) : ''

export const browserLogRouter = express.Router()

browserLogRouter.post('/', limitPerVisitor({ most: 60, perSeconds: 60 }), (req, res) => {
	const entries = Array.isArray(req.body?.entries) ? req.body.entries.slice(0, MOST_ENTRIES) : null
	if (!entries) return res.status(400).json({ error: 'No entries.' })
	for (const entry of entries) {
		const write = LEVELS[entry?.level]
		const message = cut(entry?.message, LONGEST.message).trim()
		if (!write || !message) continue
		const area = cut(entry.area, LONGEST.area).replace(/[^\p{L}\p{N} _-]/gu, '') || 'app'
		// the part after `?` can hold what the reader typed, such as a search, so it is left out
		const page = cut(entry.page, LONGEST.page).split('?')[0]
		write('browser', `${area}: ${message}${page ? ` (page ${page})` : ''}`, cut(entry.stack, LONGEST.stack) || undefined)
	}
	res.status(204).end()
})
