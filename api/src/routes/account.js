import { Router } from 'express'
import { db } from '../db.js'
import { populateDemoData } from '../lib/demoData.js'

export const router = Router()

/* The ledger: what the demo fill replaces. Settings are preferences, not data, and stay. */
const wipeLedger = userId => {
	// orders first: cascades order_items, order_categories, attachments
	db.prepare('DELETE FROM orders WHERE user_id = ?').run(userId)
	// then bookmarks, which cascade their own category links -- before categories, or the delete
	// below hits a link still pointing at one and the whole fill fails on a foreign key.
	db.prepare('DELETE FROM bookmarks WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM vendors WHERE user_id = ?').run(userId)
	db.prepare('DELETE FROM categories WHERE user_id = ?').run(userId)
}

/* The demo fill rewrites a whole ledger in one request, which dates the planner statistics
   db.js gathered at boot: statistics taken over an empty account say every table is tiny, and
   plans made from those over the 50,000 orders a fill just wrote pick the wrong index the same
   way no statistics did. Re-gathered here, after the transaction commits -- ~90ms at 50,000
   orders under the analysis_limit db.js sets, on requests that already spend seconds writing. */
const refreshStatistics = () => db.exec('ANALYZE')

/* Fills the account with a year of demo orders. Replaces rather than appends: pressed twice,
   appending would double a year of orders and leave every per-month figure quietly wrong,
   which is a worse answer than the obvious one. It replaces the ledger only -- the button
   promises "every order, bookmark, vendor and category is removed first" and keeps exactly that
   promise.

   Only ever this account -- populateDemoData writes every row against req.user.id, the same
   rule every other route here follows. */
const replaceWithDemo = db.transaction((userId, seed, orders, months, today) => {
	wipeLedger(userId)
	return populateDemoData(userId, { seed, orders, months, today })
})

/* A different year every time it is pressed.

   populateDemoData is deterministic for a given (seed, today) and stays that way -- that is
   what lets one harness run be compared against another instead of eyeballed. The constant was
   in the wrong place: it sat on the generator as a default, so the *only* caller, this button,
   could never produce anything else. Pressed twice it wiped a year and wrote back the same
   year -- same order counts, same days, same vendors -- which reads as a button that did
   nothing, and is the one thing "fill with demo data" must not look like.

   So the seed is chosen here, at random, and passed. A caller may pin the seed for
   reproducibility: `{"seed": 424242}` reproduces any dataset exactly, which is what a harness
   comparing two runs asks for and what a bug report can carry. */
router.post('/demo-data', (req, res) => {
	const asked = Number(req.body?.seed)
	const seed = Number.isFinite(asked) && asked > 0 ? Math.floor(asked)
		: 1 + Math.floor(Math.random() * 0x7ffffffe)
	/* How many orders the year lands on. Optional -- left off, the generator rolls each
	   month's count as it always has. Capped so a stray body cannot ask for a ledger the
	   database spends minutes writing; 50,000 is the largest the UI offers. */
	const askedOrders = Number(req.body?.orders)
	const orders = Number.isFinite(askedOrders) && askedOrders > 0
		? Math.min(50000, Math.floor(askedOrders)) : undefined
	/* How far back the ledger reaches, in months, ending today. Capped at the UI's largest
	   offer (24 years) for the same reason as the order count above. */
	const askedMonths = Number(req.body?.months)
	const months = Number.isFinite(askedMonths) && askedMonths > 0
		? Math.min(288, Math.floor(askedMonths)) : undefined
	const result = replaceWithDemo(req.user.id, seed, orders, months, req.today)
	refreshStatistics()
	res.json({ ...result, seed })
})
