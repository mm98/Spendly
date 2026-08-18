import { Router } from 'express'
import { db } from '../db.js'
import { orderTotalsSelectList } from '../lib/orderColumns.js'
import { decorateOrderRows } from '../lib/decorate.js'
import { MATCHERS, asciiNeedle, escapeLike, vendorIdsMatching } from '../lib/textSearch.js'

export const router = Router()

const MAX_PER_KIND = 8

/* Every statement below exists twice, from one template: the LIKE shape for ASCII needles
   (with % and _ escaped so the needle is literal text), and a contains_fold shape for a
   needle carrying a letter LIKE cannot case-fold -- 'æg' never matched a stored 'Æg', in a
   Danish-market app, because both LIKE and SQLite's lower() fold ASCII only. The route picks
   per needle; lib/textSearch.js holds the fold function and the numbers. */
const perMatcher = sql => ({
	ascii: db.prepare(sql(MATCHERS.ascii)),
	fold: db.prepare(sql(MATCHERS.fold))
})

/* A vendor is found by any name it answers to -- its own or an alias (vendor_aliases, the
   same set order resolution matches), and the row shown is always the parent vendor. The
   needle may then not appear in the name the row shows, so the matched alias travels along
   for the client to say why the row is here; NULL when the name itself matched, because
   there is nothing to explain. */
const searchVendors = perMatcher(match => `
	SELECT v.id, v.name,
		CASE WHEN ${match('v.name')} THEN NULL
			ELSE (SELECT a.name FROM vendor_aliases a WHERE a.vendor_id = v.id AND ${match('a.name')} LIMIT 1)
		END AS alias
	FROM vendors v
	WHERE v.user_id = @userId AND v.id IN (${vendorIdsMatching(match)})
	ORDER BY v.name LIMIT @limit
`)
const searchCategories = perMatcher(match =>
	`SELECT id, name FROM categories WHERE user_id = @userId AND ${match('name')} ORDER BY name LIMIT @limit`)
/* Whether the account has any uncategorised order at all -- the palette offers the
   "Without category" filter only when there is something behind it, the same honesty rule
   that keeps an action from opening a list with nothing in it. */
const hasUncategorised = db.prepare('SELECT 1 AS present FROM orders WHERE user_id = ? AND category_count = 0 LIMIT 1')
/* The same shape as the orders list's text filter (routes/orders.js): one LIKE over the
   trigger-maintained search_text column instead of a per-order scan of order_items, and the
   vendor name reached through its own dozen-row table. What made this query's worst case its
   common case was a needle matching nothing -- LIMIT 8 never fills, so the old form scanned
   every item of every order before answering [], ~350ms at 50k orders while the user was
   still typing; now ~100ms flat, same rows. */
const searchOrders = perMatcher(match => `
	SELECT ${orderTotalsSelectList('ot')} FROM orders ot
	WHERE ot.user_id = @userId AND (
		${match('ot.search_text')}
		OR ot.vendor_id IN (${vendorIdsMatching(match)})
	)
	ORDER BY ot.date DESC LIMIT @limit
`)

/** Cross-entity search for the command palette: vendors, categories and orders (matched by
    vendor name, note, or an item's title) that the query text appears in, each scoped to the
    account's own rows via an indexed user_id lookup. */
router.get('/', (req, res) => {
	const needle = String(req.query.query ?? '').trim().toLowerCase()
	if (!needle) return res.json({ vendors: [], categories: [], orders: [] })
	const shape = asciiNeedle(needle) ? 'ascii' : 'fold'
	const params = { userId: req.user.id, limit: MAX_PER_KIND,
		needle: shape === 'ascii' ? `%${escapeLike(needle)}%` : needle }

	const orderRows = searchOrders[shape].all(params)
	const categories = searchCategories[shape].all(params)
	/* "Without category" is findable by the name its rows carry everywhere else, not only by
	   arriving on a link. The sentinel id is the filter the client already builds category
	   results into; matched the same way a category's name is, offered only over orders that
	   exist. */
	if ('without category'.includes(needle) && hasUncategorised.get(req.user.id))
		categories.push({ id: 'none', name: 'Without category' })
	res.json({
		vendors: searchVendors[shape].all(params),
		categories,
		orders: decorateOrderRows(orderRows)
	})
})
