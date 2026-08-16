import { Router } from 'express'
import { db } from '../db.js'
import { orderTotalsSelectList } from '../lib/orderColumns.js'
import { decorateOrderRows } from '../lib/decorate.js'

export const router = Router()

const MAX_PER_KIND = 8

const searchVendors = db.prepare('SELECT id, name FROM vendors WHERE user_id = ? AND lower(name) LIKE ? ORDER BY name LIMIT ?')
const searchCategories = db.prepare('SELECT id, name FROM categories WHERE user_id = ? AND lower(name) LIKE ? ORDER BY name LIMIT ?')
/* The same shape as the orders list's text filter (routes/orders.js): one LIKE over the
   trigger-maintained search_text column instead of a per-order scan of order_items, and the
   vendor name reached through its own dozen-row table. What made this query's worst case its
   common case was a needle matching nothing -- LIMIT 8 never fills, so the old form scanned
   every item of every order before answering [], ~350ms at 50k orders while the user was
   still typing; now ~100ms flat, same rows. */
const searchOrders = db.prepare(`
	SELECT ${orderTotalsSelectList('ot')} FROM orders ot
	WHERE ot.user_id = @userId AND (
		ot.search_text LIKE @needle
		OR ot.vendor_id IN (SELECT id FROM vendors WHERE user_id = @userId AND name LIKE @needle)
	)
	ORDER BY ot.date DESC LIMIT @limit
`)

/** Cross-entity search for the command palette: vendors, categories and orders (matched by
    vendor name, note, or an item's title) that the query text appears in, each scoped to the
    account's own rows via an indexed user_id lookup. */
router.get('/', (req, res) => {
	const needle = String(req.query.query ?? '').trim().toLowerCase()
	if (!needle) return res.json({ vendors: [], categories: [], orders: [] })
	const like = `%${needle}%`

	const orderRows = searchOrders.all({ userId: req.user.id, needle: like, limit: MAX_PER_KIND })
	res.json({
		vendors: searchVendors.all(req.user.id, like, MAX_PER_KIND),
		categories: searchCategories.all(req.user.id, like, MAX_PER_KIND),
		orders: decorateOrderRows(orderRows)
	})
})
