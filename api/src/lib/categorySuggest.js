import { db } from '../db.js'
import { categoryNamesOf, foldName } from './names.js'
import { findCategoryByFold } from './findOrCreate.js'
import { MODEL, getClient, isBillingRefusal } from './scanParse.js'

/* Category suggestions for an order's items: what the account's own orders back (lib/categoryModel.js),
   or what a model proposes when asked, which can also offer a new category. At most SHOWN. */

import { SHOWN, suggestFromHistory } from './categoryModel.js'

export { suggestFromHistory, SHOWN }

// the category names a model is shown; an account with more is shown its favourites and the rest by name
const LISTED = 200

const selectCategoryNames = db.prepare('SELECT name FROM categories WHERE user_id = ? ORDER BY favourite DESC, name LIMIT ?')

/** The category names a model is shown for this account. */
export const listedNames = userId => selectCategoryNames.all(userId, LISTED).map(c => c.name)

const names = list => (Array.isArray(list) ? list : []).map(n => String(n ?? '').trim()).filter(Boolean)
const without = (found, exclude) => {
	const skip = new Set(names(exclude).map(foldName))
	return found.filter(n => !skip.has(foldName(n)))
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
