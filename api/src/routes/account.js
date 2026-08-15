import { Router } from 'express'
import { db } from '../db.js'
import { seedAccountDefaults } from '../seed.js'
import { populateDemoData } from '../lib/demoData.js'

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

/* Fills the account with a year of demo orders. Replaces rather than appends: pressed twice,
   appending would double a year of orders and leave every per-month figure quietly wrong,
   which is a worse answer than the obvious one. It reuses `wipe` so "replace" means exactly
   what CLEAR STORED DATA means, and the button says so before it is pressed.

   Only ever this account -- populateDemoData writes every row against req.user.id, the same
   rule every other route here follows. */
const replaceWithDemo = db.transaction(userId => {
	wipe(userId)
	return populateDemoData(userId)
})

router.post('/demo-data', (req, res) => {
	res.json(replaceWithDemo(req.user.id))
})
