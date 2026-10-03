import { Router } from 'express'
import { db } from '../db.js'
import { orderTotalsSelectList } from '../lib/orderColumns.js'
import { decorateOrderSearchRows } from '../lib/decorate.js'
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
/* The name only. A bookmark's address holds the shop's domain, which is the vendor's own name in
   most rows, so matching it would answer "bilka" with the vendor and every bookmark bought there. */
const searchBookmarks = perMatcher(match =>
	`SELECT id, name, archived FROM bookmarks WHERE user_id = @userId AND ${match('name')}
		ORDER BY name COLLATE NOCASE LIMIT @limit`)
/* Whether the account has any uncategorised order at all -- the palette offers the
   "Without category" filter only when there is something behind it, the same honesty rule
   that keeps an action from opening a list with nothing in it. */
const hasUncategorised = db.prepare('SELECT 1 AS present FROM orders WHERE user_id = ? AND category_count = 0 LIMIT 1')
/* The same shape as the orders list's text filter (routes/orders.js): one LIKE over the
   trigger-maintained search_text column instead of a per-order scan of order_items, and the
   vendor name reached through its own dozen-row table. Worst case is the common case here: a
   needle matching nothing, since LIMIT 8 never short-circuits it -- so the query has to stay
   index-driven end to end rather than falling back to a per-item scan to answer []. */
const searchOrders = perMatcher(match => `
	SELECT ${orderTotalsSelectList('ot')} FROM orders ot
	WHERE ot.user_id = @userId AND (
		${match('ot.search_text')}
		OR ${match('ot.reference')}
		OR ot.vendor_id IN (${vendorIdsMatching(match)})
	)
	ORDER BY ot.date DESC, ot.created_at DESC, ot.rowid DESC LIMIT @limit
`)
/* The exact sizes of the two groups whose rows stop at the limit, asked only when a kind fills
   it. An item counts once per order and name, as the palette lists it; search_text holds every
   item title, so it narrows the orders before their items are read. */
const countVendors = perMatcher(match =>
	`SELECT COUNT(*) AS c FROM vendors v WHERE v.user_id = @userId AND v.id IN (${vendorIdsMatching(match)})`)
const countItems = perMatcher(match => `
	SELECT COUNT(*) AS c FROM (
		SELECT DISTINCT oi.order_id, lower(oi.title) FROM orders ot JOIN order_items oi ON oi.order_id = ot.id
		WHERE ot.user_id = @userId AND ${match('ot.search_text')} AND ${match('oi.title')}
	)
`)

/** Cross-entity search for the command palette: vendors, categories, bookmarks and orders
    (matched by vendor name, reference, note, or an item's title) that the query text appears in, each
    scoped to the account's own rows via an indexed user_id lookup. */
router.get('/', (req, res) => {
	const needle = String(req.query.query ?? '').trim().toLowerCase()
	if (!needle) return res.json({ vendors: [], categories: [], bookmarks: [], orders: [] })
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
	const vendors = searchVendors[shape].all(params)
	res.json({
		vendors,
		categories,
		bookmarks: searchBookmarks[shape].all(params),
		orders: decorateOrderSearchRows(orderRows),
		/* Under the limit the rows themselves are the whole answer, so the client counts them;
		   at the limit the full count comes from here. */
		counts: {
			vendors: vendors.length < MAX_PER_KIND ? vendors.length : countVendors[shape].get(params).c,
			items: orderRows.length < MAX_PER_KIND ? null : countItems[shape].get(params).c
		}
	})
})
