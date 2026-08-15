import { Router } from 'express'
import { db } from '../db.js'
import { orderTotalsSelectList } from '../lib/orderColumns.js'
import { decorateOrderRows } from '../lib/decorate.js'

export const router = Router()

const MAX_PER_KIND = 8

const searchVendors = db.prepare('SELECT id, name FROM vendors WHERE user_id = ? AND lower(name) LIKE ? ORDER BY name LIMIT ?')
const searchCategories = db.prepare('SELECT id, name FROM categories WHERE user_id = ? AND lower(name) LIKE ? ORDER BY name LIMIT ?')
const searchOrders = db.prepare(`
	SELECT ${orderTotalsSelectList('ot')} FROM order_totals ot
	JOIN vendors v ON v.id = ot.vendor_id
	WHERE ot.user_id = ? AND (
		lower(v.name) LIKE ?
		OR lower(ot.note) LIKE ?
		OR EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = ot.id AND lower(oi.title) LIKE ?)
	)
	ORDER BY ot.date DESC LIMIT ?
`)

/** Cross-entity search for the command palette: vendors, categories and orders (matched by
    vendor name, note, or an item's title) that the query text appears in, each scoped to the
    account's own rows via an indexed user_id lookup. */
router.get('/', (req, res) => {
	const needle = String(req.query.query ?? '').trim().toLowerCase()
	if (!needle) return res.json({ vendors: [], categories: [], orders: [] })
	const like = `%${needle}%`

	const orderRows = searchOrders.all(req.user.id, like, like, like, MAX_PER_KIND)
	res.json({
		vendors: searchVendors.all(req.user.id, like, MAX_PER_KIND),
		categories: searchCategories.all(req.user.id, like, MAX_PER_KIND),
		orders: decorateOrderRows(orderRows)
	})
})
