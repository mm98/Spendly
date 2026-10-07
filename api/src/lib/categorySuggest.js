import { db } from '../db.js'
import { categoryNamesOf, foldName } from './names.js'
import { findCategoryByFold } from './findOrCreate.js'
import { MODEL, getClient, isBillingRefusal } from './scanParse.js'

/* Category suggestions for an order's items: from the account's earlier orders (`fromHistory`), or from a
   model that can also offer a new category (`fromModel`). At most SHOWN, and only confident ones. */

export const SHOWN = 3
// the most recent orders read for a match: what an account buys now, however large its ledger is
const RECENT_ORDERS = 1500
// the category names a model is shown; an account with more is shown its favourites and the rest by name
const LISTED = 200

const selectRecentOrders = db.prepare('SELECT id FROM orders WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ?')
const selectItemsOf = db.prepare(`SELECT oi.order_id, oi.title FROM order_items oi JOIN orders o ON o.id = oi.order_id
	WHERE o.user_id = ? AND oi.order_id IN (SELECT value FROM json_each(?))`)
const selectCategoriesOf = db.prepare(`SELECT oc.order_id, c.name FROM order_categories oc
	JOIN categories c ON c.id = oc.category_id WHERE c.user_id = ? AND oc.order_id IN (SELECT value FROM json_each(?))`)
const selectCategoryNames = db.prepare('SELECT name FROM categories WHERE user_id = ? ORDER BY favourite DESC, name LIMIT ?')

/** The category names a model is shown for this account. */
export const listedNames = userId => selectCategoryNames.all(userId, LISTED).map(c => c.name)

/** An item name as the words that tell it from another: folded, with short words and plain numbers left out. */
const wordsOf = title => new Set(foldName(title).split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 3 && !/^\d+$/.test(w)))

// two item names are of one kind when the shorter one's words are all in the other, or two or more
// of them are and they are half of the shorter one's words: one shared word alone is not a match
const SHARED_HALF = 0.5
// a category is offered when at least this many earlier orders match and this share of them carry it
const MIN_ORDERS = 2
const MIN_SHARE = 0.6

const names = list => (Array.isArray(list) ? list : []).map(n => String(n ?? '').trim()).filter(Boolean)
const without = (found, exclude) => {
	const skip = new Set(names(exclude).map(foldName))
	return found.filter(n => !skip.has(foldName(n)))
}

/** The categories that earlier orders with items like these carry, most supported first. */
export function fromHistory(userId, { items, exclude }) {
	const wanted = names(items).map(wordsOf).filter(w => w.size)
	if (!wanted.length) return []
	const ids = JSON.stringify(selectRecentOrders.all(userId, RECENT_ORDERS).map(o => o.id))
	const earlier = new Map()
	for (const row of selectItemsOf.all(userId, ids)) {
		const words = wordsOf(row.title)
		if (words.size) (earlier.get(row.order_id) ?? earlier.set(row.order_id, []).get(row.order_id)).push(words)
	}
	const carried = new Map()
	for (const row of selectCategoriesOf.all(userId, ids)) {
		(carried.get(row.order_id) ?? carried.set(row.order_id, []).get(row.order_id)).push(row.name)
	}
	const like = (a, b) => {
		let shared = 0
		for (const w of a) if (b.has(w)) shared++
		const shorter = Math.min(a.size, b.size)
		return shared > 0 && (shared === shorter || (shared >= 2 && shared / shorter >= SHARED_HALF))
	}
	// each item asks on its own, so an order of two kinds of thing is offered both categories
	const best = new Map()
	for (const w of wanted) {
		let matched = 0
		const support = new Map()
		for (const [orderId, lists] of earlier) {
			if (!carried.has(orderId) || !lists.some(l => like(w, l))) continue
			matched++
			for (const name of carried.get(orderId)) support.set(name, (support.get(name) ?? 0) + 1)
		}
		for (const [name, n] of support) {
			if (n >= MIN_ORDERS && n / matched >= MIN_SHARE) best.set(name, Math.max(best.get(name) ?? 0, n))
		}
	}
	const found = [...best].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name)
	return without(found, exclude).slice(0, SHOWN)
}

const SUGGEST_TOOL = {
	name: 'suggest_categories',
	description: 'Report the categories that best fit an order, most fitting first.',
	input_schema: {
		type: 'object',
		properties: {
			categories: {
				type: 'array', maxItems: SHOWN, items: { type: 'string' },
				description: 'At most three category names. Use a name from the list when one fits. Offer a new short name only when none of the listed categories fits. Fewer than three, or none, when you are not confident.'
			}
		},
		required: ['categories']
	}
}

/** The categories a model proposes for these items: `{ suggestions }` or a `failure` ('billing' or 'failed'). */
export async function fromModel(userId, { items, vendor, exclude }) {
	const anthropic = getClient()
	if (!anthropic) return { suggestions: [], failure: 'failed' }
	const listed = listedNames(userId)
	try {
		const response = await anthropic.messages.create({
			model: MODEL, max_tokens: 300,
			tool_choice: { type: 'tool', name: SUGGEST_TOOL.name }, tools: [SUGGEST_TOOL],
			messages: [{
				role: 'user',
				content: `Choose categories for one order.\n${vendor ? `Vendor: ${vendor}\n` : ''}Items:\n${names(items).slice(0, 40).map(t => `- ${t}`).join('\n')}\n\n`
					+ `The reader's categories${listed.length === LISTED ? ' (the list may be partial)' : ''}:\n${listed.length ? listed.map(n => `- ${n}`).join('\n') : '(none yet)'}\n\n`
					+ 'Report them with the suggest_categories tool. Prefer a category from the list. Be conservative: report nothing rather than a weak guess.'
			}]
		})
		const call = response.content.find(b => b.type === 'tool_use' && b.name === SUGGEST_TOOL.name)
		return { suggestions: describe(userId, without(categoryNamesOf(call?.input?.categories), exclude)).slice(0, SHOWN), failure: null }
	} catch (error) {
		console.error('Category suggestion failed:', error.message)
		return { suggestions: [], failure: isBillingRefusal(error) ? 'billing' : 'failed' }
	}
}

/** Each name as it is to be offered: the account's own spelling of a category it has, or marked new. */
export function describe(userId, list) {
	return list.map(name => {
		const own = findCategoryByFold(userId, name)
		return own ? { name: own.name, isNew: false } : { name, isNew: true }
	})
}
