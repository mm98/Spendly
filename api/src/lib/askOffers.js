import { db } from '../db.js'
import { newId } from './ids.js'

/* The offers Ask showed in an answer (Ask 24d 11), kept as they were answered, so an old chat shows the prices
   it was given. A block is removed with its chat. */

const insertOffers = db.prepare('INSERT INTO user_ask_offers (id, user_id, chat_id, offers) VALUES (?, ?, ?, ?)')
const selectOffers = db.prepare('SELECT o.id, o.offers FROM json_each(?) j CROSS JOIN user_ask_offers o ON o.id = j.value WHERE o.user_id = ?')

/** `offers`, cheapest first, with one offer for each shop: its cheapest without sugar, or else its cheapest. */
export function onePerShop(offers) {
	const byShop = Map.groupBy(offers, o => String(o.shop ?? '').toLowerCase())
	const chosen = new Set([...byShop.values()].map(same => same.find(o => o.withoutSugar) ?? same[0]))
	return offers.filter(o => chosen.has(o))
}

/** Keeps one block of offers in the chat `chatId`, and answers it with its id. */
export function keepOffers(userId, chatId, block) {
	const kept = { id: newId('ao'), ...block }
	insertOffers.run(kept.id, userId, chatId, JSON.stringify(kept))
	return kept
}

/** The blocks named by `ids`, by id, each with one offer for each shop, also in a block kept before that rule. */
export const offersById = (userId, ids) => Object.fromEntries(selectOffers.all(JSON.stringify(ids), userId).map(r => {
	const block = JSON.parse(r.offers)
	return [r.id, { ...block, offers: onePerShop(block.offers ?? []) }]
}))
