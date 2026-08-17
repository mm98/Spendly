import { Router } from 'express'
import { db } from '../db.js'
import { seedAccountDefaults } from '../seed.js'
import { populateDemoData } from '../lib/demoData.js'
import { runBlobBackfill } from '../lib/blobBackfill.js'

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
const replaceWithDemo = db.transaction((userId, seed, orders, months) => {
	wipeLedger(userId)
	return populateDemoData(userId, { seed, orders, months })
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
	res.json({ ...replaceWithDemo(req.user.id, seed, orders, months), seed })
})

/* ---- compress-blobs ----
   lib/images.js compresses everything on the way in; this is only for attachments and scan
   uploads written before that existed. Scoped to req.user.id like every route in this file --
   an account can compress its own receipts, never anyone else's. An attachment belongs to an
   order directly (order_id) or to one of that order's items (order_item_id) -- never both (see
   migrations/001's CHECK) -- so both joins are LEFT and exactly one of o.user_id/o2.user_id is
   non-null per row. */
const selectUserAttachmentsToCompress = db.prepare(`
	SELECT a.id, a.data, a.data_is_compressed, a.data_checked, a.thumbnail, a.thumbnail_is_compressed, a.thumbnail_checked
	FROM attachments a
	LEFT JOIN orders o ON o.id = a.order_id
	LEFT JOIN order_items oi ON oi.id = a.order_item_id
	LEFT JOIN orders o2 ON o2.id = oi.order_id
	WHERE (o.user_id = @userId OR o2.user_id = @userId)
	  AND ((a.data IS NOT NULL AND a.data_checked = 0) OR (a.thumbnail IS NOT NULL AND a.thumbnail_checked = 0))
`)
const updateAttachmentCompression = db.prepare(
	'UPDATE attachments SET data = ?, data_is_compressed = ?, data_checked = 1, thumbnail = ?, thumbnail_is_compressed = ?, thumbnail_checked = 1 WHERE id = ?'
)
const selectUserScanUploadsToCompress = db.prepare(`
	SELECT id, data, data_is_compressed, data_checked, thumbnail, thumbnail_is_compressed, thumbnail_checked FROM scan_uploads
	WHERE user_id = @userId
	  AND ((data IS NOT NULL AND data_checked = 0) OR (thumbnail IS NOT NULL AND thumbnail_checked = 0))
`)
const updateScanUploadCompression = db.prepare(
	'UPDATE scan_uploads SET data = ?, data_is_compressed = ?, data_checked = 1, thumbnail = ?, thumbnail_is_compressed = ?, thumbnail_checked = 1 WHERE id = ?'
)

const markBlobBackfillDone = db.prepare('UPDATE settings SET blob_backfill_done = 1 WHERE user_id = ?')

router.post('/compress-blobs', (req, res) => {
	const attachments = runBlobBackfill(db, selectUserAttachmentsToCompress, updateAttachmentCompression, { userId: req.user.id })
	const scanUploads = runBlobBackfill(db, selectUserScanUploadsToCompress, updateScanUploadCompression, { userId: req.user.id })
	// Set unconditionally, even when there was nothing to compress: an account with zero
	// attachments has trivially caught up, and the button's job -- offering this once -- is done
	// either way.
	markBlobBackfillDone.run(req.user.id)
	res.json({ attachments, scanUploads, blobBackfillDone: true })
})

