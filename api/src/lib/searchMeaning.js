import { db } from '../db.js'
import { FALLBACK_ID, embedder, embedderIfLoaded } from './embed.js'

/* The category a typed word means without naming it ("food" for Groceries): the nearest category name by
   the language model's vectors, taken only when near enough and clearly ahead of the next. */

const NEAR_ENOUGH = 0.6 // lower, and joining words start to match a category
const AHEAD_BY = 0.08
const WORD_LETTERS_LEAST = 3
const WORDS_KEPT = 2000
const ACCOUNTS_KEPT = 8
// words that join a sentence, and words that name no kind of thing; they sit near every category
const NOT_THINGS = new Set(['orders', 'order', 'purchases', 'bought', 'spent', 'show', 'find', 'all', 'everything', 'things', 'stuff',
	'the', 'and', 'with', 'for', 'from', 'not', 'any', 'some', 'expensive', 'cheap', 'biggest', 'smallest', 'latest', 'newest', 'oldest',
	'ordrer', 'ordre', 'køb', 'købt', 'brugt', 'vis', 'alle', 'alt', 'ting', 'mine', 'med', 'fra', 'hos', 'ikke', 'dyre', 'dyreste',
	'billige', 'billigste', 'største', 'nyeste', 'ældste'])

const selectCategoryNames = db.prepare('SELECT id, name FROM categories WHERE user_id = ?')

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s }

// the vectors of typed words, and of each account's category names while the names stay the same
const wordVectors = new Map()
const accountVectors = new Map()

const keep = (map, key, value, most) => {
	map.delete(key)
	map.set(key, value)
	if (map.size > most) map.delete(map.keys().next().value)
	return value
}

export const meaningIsOn = () => process.env.SPENDLY_SEARCH_MEANING !== 'off'

/** Loads the model when the server starts, so the first searches do not wait for it or go without it. */
export function warmSearchMeaning() {
	if (meaningIsOn()) embedder()
}

/** Words that could name a kind of thing: one word, of letters, not a joining word. */
const isThingWord = span => span.length >= WORD_LETTERS_LEAST && /^\p{L}+$/u.test(span) && !NOT_THINGS.has(span)

/** The categories these typed words mean: [{ span, id, name }], for the words that are near enough to one. */
export async function categoriesMeant(userId, spans) {
	const words = spans.filter(isThingWord)
	if (!meaningIsOn() || !words.length) return []
	const emb = embedderIfLoaded()
	if (!emb || emb.id === FALLBACK_ID) return []
	const categories = selectCategoryNames.all(userId)
	if (categories.length < 2) return []
	const key = `${emb.id}\n${categories.map(c => `${c.id} ${c.name}`).join('\n')}`
	let names = accountVectors.get(userId)
	if (names?.key !== key) names = keep(accountVectors, userId, { key, vectors: await emb.embed(categories.map(c => c.name)) }, ACCOUNTS_KEPT)
	const missing = words.filter(w => !wordVectors.has(`${emb.id} ${w}`))
	if (missing.length) (await emb.embed(missing)).forEach((v, i) => keep(wordVectors, `${emb.id} ${missing[i]}`, v, WORDS_KEPT))
	const meant = []
	for (const word of words) {
		const v = wordVectors.get(`${emb.id} ${word}`)
		if (!v) continue
		const ranked = names.vectors.map((c, i) => [dot(c, v), i]).sort((a, b) => b[0] - a[0])
		const [[best, at], [next]] = ranked
		if (best >= NEAR_ENOUGH && best - next >= AHEAD_BY) meant.push({ span: word, id: categories[at].id, name: categories[at].name })
	}
	return meant
}
