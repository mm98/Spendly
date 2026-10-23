import { Router } from 'express'
import { db } from '../db.js'
import { orderTotalsSelectList } from '../lib/orderColumns.js'
import { decorateOrderSearchRows } from '../lib/decorate.js'
import { MATCHERS, asciiNeedle, escapeLike, vendorIdsMatching } from '../lib/textSearch.js'
import { categoriesMeant } from '../lib/searchMeaning.js'

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
/* Full counts once a kind fills the limit. An item counts once per order and name, as the
   palette lists it; search_text holds every title, so it narrows the orders first. */
const countVendors = perMatcher(match =>
	`SELECT COUNT(*) AS c FROM vendors v WHERE v.user_id = @userId AND v.id IN (${vendorIdsMatching(match)})`)
const countItems = perMatcher(match => `
	SELECT COUNT(*) AS c FROM (
		SELECT DISTINCT oi.order_id, lower(oi.title) FROM orders ot JOIN order_items oi ON oi.order_id = ot.id
		WHERE ot.user_id = @userId AND ${match('ot.search_text')} AND ${match('oi.title')}
	)
`)

/** Cross-entity search for the command palette: vendors and orders (matched by vendor name,
    reference, note, or an item's title) that the query text appears in, each scoped to the
    account's own rows via an indexed user_id lookup. */
router.get('/', (req, res) => {
	const needle = String(req.query.query ?? '').trim().toLowerCase()
	if (!needle) return res.json({ vendors: [], orders: [] })
	const shape = asciiNeedle(needle) ? 'ascii' : 'fold'
	const params = { userId: req.user.id, limit: MAX_PER_KIND,
		needle: shape === 'ascii' ? `%${escapeLike(needle)}%` : needle }

	const orderRows = searchOrders[shape].all(params)
	const vendors = searchVendors[shape].all(params)
	res.json({
		vendors,
		orders: decorateOrderSearchRows(orderRows),
		/* Under the limit the rows themselves are the whole answer, so the client counts them;
		   at the limit the full count comes from here. */
		counts: {
			vendors: vendors.length < MAX_PER_KIND ? vendors.length : countVendors[shape].get(params).c,
			items: orderRows.length < MAX_PER_KIND ? null : countItems[shape].get(params).c
		}
	})
})

/* The shops and categories that runs of typed words (lowercased by the client) name in full. An ASCII
   span reads the name indexes; one lower() cannot fold is matched with lower_fold. A word that names
   nothing in full may still mean a category (lib/searchMeaning.js). */
const SPANS_MOST = 60
const SPAN_LENGTH_MOST = 80
const namesOf = (shape, from) => db.prepare(shape === 'ascii'
	? `SELECT s.value AS span, n.id, n.name FROM json_each(@spans) s JOIN ${from} ON lower(n.name) = s.value WHERE n.user_id = @userId`
	: `SELECT s.value AS span, n.id, n.name FROM ${from} JOIN json_each(@spans) s ON lower_fold(n.name) = s.value WHERE n.user_id = @userId`)
const NAMED = Object.fromEntries(['ascii', 'fold'].map(shape => [shape, {
	vendor: namesOf(shape, 'vendors n'),
	alias: shape === 'ascii'
		? db.prepare(`SELECT s.value AS span, v.id, v.name FROM json_each(@spans) s
			JOIN vendor_aliases n ON lower(n.name) = s.value AND n.user_id = @userId JOIN vendors v ON v.id = n.vendor_id`)
		: db.prepare(`SELECT s.value AS span, v.id, v.name FROM vendor_aliases n JOIN json_each(@spans) s ON lower_fold(n.name) = s.value
			JOIN vendors v ON v.id = n.vendor_id WHERE n.user_id = @userId`),
	category: namesOf(shape, 'categories n')
}]))

router.get('/names', async (req, res) => {
	const spans = [...new Set([req.query.span ?? []].flat().map(s => String(s).trim()).filter(s => s && s.length <= SPAN_LENGTH_MOST))].slice(0, SPANS_MOST)
	const names = []
	for (const shape of ['ascii', 'fold']) {
		const these = spans.filter(s => asciiNeedle(s) === (shape === 'ascii'))
		if (!these.length) continue
		const params = { userId: req.user.id, spans: JSON.stringify(these) }
		const statements = NAMED[shape]
		for (const row of [...statements.vendor.all(params), ...statements.alias.all(params)]) names.push({ ...row, kind: 'vendor' })
		for (const row of statements.category.all(params)) names.push({ ...row, kind: 'category' })
	}
	const named = new Set(names.map(n => n.span))
	try {
		for (const row of await categoriesMeant(req.user.id, spans.filter(s => !named.has(s)))) names.push({ ...row, kind: 'category' })
	} catch (error) {
		console.error('Reading a search word\'s meaning failed:', error.message)
	}
	res.json({ names })
})
