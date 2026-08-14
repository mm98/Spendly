import { Router } from 'express'
import { db } from '../db.js'
import { DASHBOARD_CARD_CATALOGUE } from '../lib/constants.js'

export const router = Router()

const selectUserCards = db.prepare('SELECT key, on_dashboard FROM dashboard_cards WHERE user_id = ? ORDER BY position')
const deleteUserCards = db.prepare('DELETE FROM dashboard_cards WHERE user_id = ?')
const insertCard = db.prepare('INSERT INTO dashboard_cards (user_id, key, position, on_dashboard) VALUES (?, ?, ?, ?)')
const knownKeys = new Set(DASHBOARD_CARD_CATALOGUE.map(c => c.key))

router.get('/', (req, res) => {
	const rows = selectUserCards.all(req.user.id)
	res.json({ all: DASHBOARD_CARD_CATALOGUE, on: rows.filter(r => r.on_dashboard).map(r => r.key) })
})

/** Replaces the whole order/on-state: the body is the user's ordered list of which cards are
    on, same shape client.js's saveDashboardCards already sends. */
router.put('/', (req, res) => {
	const keys = Array.isArray(req.body) ? req.body : (req.body?.on ?? [])
	const on = keys.filter(k => knownKeys.has(k))
	const off = [...knownKeys].filter(k => !on.includes(k))

	db.transaction(() => {
		deleteUserCards.run(req.user.id)
		let position = 0
		for (const key of on) insertCard.run(req.user.id, key, position++, 1)
		for (const key of off) insertCard.run(req.user.id, key, position++, 0)
	})()

	res.json({ on })
})
