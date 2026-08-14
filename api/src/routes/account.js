import { Router } from 'express'
import { db } from '../db.js'
import { seedDemoData } from '../seed.js'

export const router = Router()

const wipe = db.transaction(userId => {
	// orders first: cascades order_items, order_categories, attachments
	db.prepare('DELETE FROM orders WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM vendors WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM categories WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM settings WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM dashboard_cards WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM scan_uploads WHERE user_id = ?').run(userId)
	seedDemoData(db, userId)
})

/** Forgets everything this account has and returns it to the shipped demo state — the same
    promise client.js's resetStoredData made for one browser's localStorage, now for one
    account's rows. */
router.post('/reset', (req, res) => {
	wipe(req.user.id)
	res.json({ cleared: true })
})
