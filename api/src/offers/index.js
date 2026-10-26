import { db } from '../db.js'
import { text } from '../format/schema.js'
import { windowCounter } from '../lib/rateLimit.js'
import { tilbudsugen } from './tilbudsugen.js'

/* What shops have on offer now, from other websites: one source each, in the order Claude is told about them.
   A source is { key, name, site, goods, country, currency, limits?, shopKey, find } (README here). */
export const OFFER_SOURCES = [tilbudsugen]

const TOOL_NAME = 'find_offers'
const ITEMS_MOST = 30
const SHOPS_MOST = 10
// what a source answered is kept this long and this many answers at most, so the same question is asked once
const KEPT_MOST = 500

// a source that does not set a limit gets these
const LIMITS = {
	perMinute: 20,            // requests from this whole server
	perAccountPerDay: 50,     // requests for one account
	keptMinutes: 60,          // how long one answer is used again
	pauseMinutes: 15          // how long the source is left alone after it refuses or fails
}

const selectCurrency = db.prepare('SELECT s.currency FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.id = ?')

const sourceState = new Map(OFFER_SOURCES.map(source => {
	const limits = { ...LIMITS, ...source.limits }
	return [source.key, {
		limits,
		serverWait: windowCounter({ most: limits.perMinute, perSeconds: 60 }),
		accountWait: windowCounter({ most: limits.perAccountPerDay, perSeconds: 24 * 60 * 60 }),
		kept: new Map(),
		pausedUntil: 0
	}]
}))

function keptAnswer(state, key) {
	const entry = state.kept.get(key)
	if (!entry) return null
	if (entry.until > Date.now()) return entry.answer
	state.kept.delete(key)
	return null
}

function keep(state, key, answer) {
	state.kept.set(key, { answer, until: Date.now() + state.limits.keptMinutes * 60 * 1000 })
	while (state.kept.size > KEPT_MOST) state.kept.delete(state.kept.keys().next().value)
}

// a refusal says how long to wait in Retry-After; any other failure pauses the source for its own minutes
function pause(state, error) {
	const asked = Number(error?.retryAfter)
	const seconds = Number.isFinite(asked) && asked > 0 ? asked : state.limits.pauseMinutes * 60
	state.pausedUntil = Date.now() + seconds * 1000
}

const cleanList = (list, most) => [...new Set((Array.isArray(list) ? list : [])
	.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean))].slice(0, most)

/** One source's answer for `input`, as the text the tool answers Claude with. Never more requests than the
    source's limits allow: a kept answer is used first, and a limit reached or a pause is said, not waited out. */
async function answerFrom(source, input, userId, signal) {
	const state = sourceState.get(source.key)
	const items = cleanList(input.items, ITEMS_MOST)
	if (!items.length) return failed('Name at least one item.')
	const shops = cleanList(input.shops, SHOPS_MOST)
	const shopKeys = [...new Set(shops.map(source.shopKey).filter(Boolean))]
	const unknown = shops.filter(shop => !source.shopKey(shop))
	if (shops.length && !shopKeys.length) return failed(`${source.name} does not know the shop ${unknown.join(', ')}.`)

	const key = JSON.stringify([items.map(i => i.toLowerCase()).sort(), [...shopKeys].sort()])
	let found = keptAnswer(state, key)
	if (!found) {
		if (state.pausedUntil > Date.now()) return failed(`${source.name} cannot be asked just now. Try again later.`)
		if (state.serverWait('server') || state.accountWait(userId)) return failed(`${source.name} has been asked enough for now. Try again later.`)
		try {
			found = await source.find({ items, shopKeys }, signal)
		} catch (error) {
			if (signal?.aborted) throw error
			pause(state, error)
			return failed(`${source.name} did not answer just now.`)
		}
		keep(state, key, found)
	}
	return {
		content: [{
			type: 'text',
			text: JSON.stringify({ source: source.name, site: source.site, currency: source.currency, unknownShops: unknown, items: found })
		}]
	}
}

const failed = message => ({ content: [{ type: 'text', text: message }], isError: true })

/** The offers tool for the account `userId`, or null when no source sells in the account's currency:
    { tool, note, answer(input, signal) }, where answer gives the tool's result for Claude. */
export function offersToolFor(userId) {
	const currency = selectCurrency.get(userId)?.currency ?? 'DKK'
	const sources = OFFER_SOURCES.filter(source => source.currency === currency)
	if (!sources.length) return null
	const covers = sources.map(s => `${s.key}: ${s.goods} in ${s.country}, from ${s.site}`).join('; ')
	return {
		tool: {
			name: TOOL_NAME,
			description: `What shops have on offer now, read from other websites, not from the reader's own data. The sources: ${covers}. Give every item of a shopping list in one call, never one call per item. Each item answers its cheapest offers first, by the price per kilo or litre where it is known: the product, brand, shop, price, how many the price is for, whether it is for members only, the size, the price per unit, and the first and last day of the offer. An offer is only what the shop has on offer, not its normal price. Prices are in ${currency}.`,
			input_schema: {
				type: 'object',
				properties: {
					source: text('Which source to ask.', { enum: sources.map(s => s.key) }),
					items: {
						type: 'array', minItems: 1, maxItems: ITEMS_MOST,
						description: 'The items to find offers for, in the words and language of the question, one item each.',
						items: text('One item, for example "mælk".')
					},
					shops: {
						type: 'array', maxItems: SHOPS_MOST,
						description: 'Only offers from these shops, as the question names them. Leave it out for every shop.',
						items: text('A shop name, for example "Netto".')
					}
				},
				required: ['source', 'items']
			}
		},
		note: `${TOOL_NAME} reads offers from other websites. Use it only when the reader asks about prices or offers in shops now. Name the website the offers come from, and the last day an offer holds. An offer is not the reader's money: never count it in the reader's figures. Say when an item had no offer, and never guess a price.`,
		answer(input, signal) {
			const source = sources.find(s => s.key === input?.source) ?? sources[0]
			return answerFrom(source, input ?? {}, userId, signal)
		}
	}
}
