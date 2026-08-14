import { Router } from 'express'
import { db } from '../db.js'
import { seedAccountDefaults } from '../seed.js'

export const router = Router()

const wipe = db.transaction(userId => {
	// orders first: cascades order_items, order_categories, attachments
	db.prepare('DELETE FROM orders WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM vendors WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM categories WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM settings WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM dashboard_cards WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM scan_uploads WHERE user_id = ?').run(userId)
	seedAccountDefaults(db, userId)
})

/** Forgets everything this account has added and returns it to the empty state a fresh
    registration starts from -- settings and dashboard cards reset to their defaults, every
    order, vendor and category gone. */
router.post('/reset', (req, res) => {
	wipe(req.user.id)
	res.json({ cleared: true })
})
