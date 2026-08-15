import { Router } from 'express'
import { db } from '../db.js'
import { seedAccountDefaults } from '../seed.js'
import { populateDemoData } from '../lib/demoData.js'

export const router = Router()

/* The ledger: what the demo fill replaces. Settings and dashboard cards are preferences, not
   data -- filling the account with demo orders must not hand back someone's page size, sort
   order or card layout, and it used to: the fill reused the full wipe, so pressing it reset
   Settings to the defaults alongside the ledger it promised to replace. */
const wipeLedger = userId => {
	// orders first: cascades order_items, order_categories, attachments
	db.prepare('DELETE FROM orders WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM vendors WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM categories WHERE user_id = ?').run(userId)
}

const wipe = db.transaction(userId => {
	wipeLedger(userId)
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
   which is a worse answer than the obvious one. It replaces the ledger only -- the button
   promises "every order, vendor and category is removed first" and keeps exactly that
   promise; CLEAR STORED DATA is the button that resets preferences too.

   Only ever this account -- populateDemoData writes every row against req.user.id, the same
   rule every other route here follows. */
const replaceWithDemo = db.transaction((userId, seed) => {
	wipeLedger(userId)
	return populateDemoData(userId, { seed })
})

/* A different year every time it is pressed.

   populateDemoData is deterministic for a given (seed, today) and stays that way -- that is
   what lets one harness run be compared against another instead of eyeballed. The constant was
   in the wrong place: it sat on the generator as a default, so the *only* caller, this button,
   could never produce anything else. Pressed twice it wiped a year and wrote back the same
   year -- same order counts, same days, same vendors -- which reads as a button that did
   nothing, and is the one thing "fill with demo data" must not look like.

   So the seed is chosen here, at random, and passed. A caller that needs the old behaviour
   sends its own: `{"seed": 424242}` reproduces any dataset exactly, which is what a harness
   comparing two runs asks for and what a bug report can carry. */
router.post('/demo-data', (req, res) => {
	const asked = Number(req.body?.seed)
	const seed = Number.isFinite(asked) && asked > 0 ? Math.floor(asked)
		: 1 + Math.floor(Math.random() * 0x7ffffffe)
	res.json({ ...replaceWithDemo(req.user.id, seed), seed })
})
