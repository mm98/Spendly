import { db } from '../db.js'
import { populateDemoData } from './demoData.js'

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

// a filled account has something in it, so the first run (/welcome) is over
const finishSetup = db.prepare('UPDATE users SET needs_setup = 0 WHERE id = ?')

/* Replaces this account's ledger with demo orders, never appends: pressed twice, appending would
   double every monthly figure. The wipe commits on its own and the fill in batches, so a fill
   that fails keeps what it wrote; `onLanded(0)` says the wipe has committed. */
export function replaceWithDemo(userId, { seed, orders, months, today, onProgress, onLanded }) {
	db.transaction(wipeLedger)(userId)
	if (onLanded) onLanded(0)
	try {
		return populateDemoData(userId, { seed, orders, months, today, onProgress, onLanded })
	} finally {
		finishSetup.run(userId)
	}
}
