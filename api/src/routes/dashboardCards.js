import { Router } from 'express'
import { db } from '../db.js'
import { DASHBOARD_CARD_CATALOGUE } from '../lib/constants.js'

export const router = Router()

const selectUserCards = db.prepare('SELECT key, on_dashboard FROM dashboard_cards WHERE user_id = ? ORDER BY position')
const deleteUserCards = db.prepare('DELETE FROM dashboard_cards WHERE user_id = ?')
const insertCard = db.prepare('INSERT INTO dashboard_cards (user_id, key, position, on_dashboard) VALUES (?, ?, ?, ?)')
const knownKeys = new Set(DASHBOARD_CARD_CATALOGUE.map(c => c.key))

/* Two lists out of one table: the catalogue is every card that exists, `on` is this account's
   own, in its own order. A stored key the catalogue no longer knows is dropped here rather
   than answered -- the client draws `on` by looking each key up in `all`, so a key in one and
   not the other is a card it cannot name, and the lookup it does to name it is what breaks.
   Rows go missing that way exactly once per rename (migrations/004), which is the moment this
   costs nothing and pays for itself. */
router.get('/', (req, res) => {
	const rows = selectUserCards.all(req.user.id)
	res.json({
		all: DASHBOARD_CARD_CATALOGUE,
		on: rows.filter(r => r.on_dashboard && knownKeys.has(r.key)).map(r => r.key)
	})
})

/** Replaces the whole order/on-state: the body is the user's ordered list of which cards are
    on, same shape client.js's saveDashboardCards already sends. */
router.put('/', (req, res) => {
	const keys = Array.isArray(req.body) ? req.body : (req.body?.on ?? [])
	// Deduplicated (first occurrence keeps its position): a key sent twice reached the
	// (user_id, key) primary key twice and turned a malformed request into a 500.
	const on = [...new Set(keys)].filter(k => knownKeys.has(k))
	const off = [...knownKeys].filter(k => !on.includes(k))

	db.transaction(() => {
		deleteUserCards.run(req.user.id)
		let position = 0
		for (const key of on) insertCard.run(req.user.id, key, position++, 1)
		for (const key of off) insertCard.run(req.user.id, key, position++, 0)
	})()

	res.json({ on })
})
