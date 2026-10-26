import { db } from '../db.js'
import { windowCounter } from '../lib/rateLimit.js'
import { tilbudsugen } from './tilbudsugen.js'

/* What shops have on offer now, from other websites: one source each, in the order Claude is told about them.
   A source is { key, name, site, goods, country, currency, limits?, shopKey, find } (README here). */
export const OFFER_SOURCES = [tilbudsugen]

// how many months back an order's date may lie and still be checked against the offers running now
export const OFFER_MONTHS = 2
export const ITEMS_MOST = 30
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

/** The sources that sell in the account's currency, so an amount Ask writes stays in the account's own. */
export const offerSourcesFor = userId => {
	const currency = selectCurrency.get(userId)?.currency ?? 'DKK'
	return OFFER_SOURCES.filter(source => source.currency === currency)
}

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

// one request to a source: a kept answer first, with `keptOnly` nothing else; `counted` within its limits
async function asked(source, key, run, { userId, today, keptOnly = false, counted = true }, signal) {
	const state = sourceState.get(source.key)
	const kept = keptAnswer(state, key)
	if (kept || keptOnly) return { found: kept }
	const paused = state.pausedUntil - Date.now()
	if (paused > 0) return { wait: Math.ceil(paused / 1000) }
	const serverWait = counted ? state.serverWait('server') : 0
	if (serverWait) return { wait: serverWait }
	if (counted && state.accountWait(`${userId}:${today}`)) return { wait: null, perDay: true }
	try {
		const found = await run()
		keep(state, key, found)
		return { found }
	} catch (error) {
		if (signal?.aborted) throw error
		// a picture that cannot be had is left out; only the site asking to wait stops the rest
		if (counted || error?.retryAfter) pause(state, error)
		return { failed: true }
	}
}

/** What `source` has on offer: { found }, { wait } in seconds, { perDay } when today's requests are used, or
    { failed }. A kept answer comes first; with `keptOnly` nothing else, and none kept is { found: null }. */
function foundFor(source, { items, shopKeys = [], ...asking }, signal) {
	const key = JSON.stringify([items.map(i => i.toLowerCase()).sort(), [...shopKeys].sort()])
	return asked(source, key, () => source.find({ items, shopKeys }, signal), asking, signal)
}

/** `wanted` ([{ item, offer }]) with each offer's `image`: one request an item, outside the limits. */
export async function withPictures(source, wanted, asking, signal) {
	if (!source.pictures) return wanted
	const byItem = Map.groupBy(wanted, w => w.item)
	const pictured = new Map()
	for (const [item, group] of byItem) {
		const offers = group.map(w => w.offer)
		const key = JSON.stringify(['pictures', item, offers.map(o => [o.shop, o.price, o.from])])
		const answer = await asked(source, key, () => source.pictures({ item, offers }, signal), { ...asking, counted: false }, signal)
		group.forEach((w, i) => pictured.set(w, answer.found?.[i] ?? null))
	}
	return wanted.map(w => ({ ...w, offer: { ...w.offer, image: pictured.get(w) ?? w.offer.image ?? null } }))
}

export const PICTURE_ORIGINS = OFFER_SOURCES.map(s => s.picturesOrigin).filter(Boolean)

export async function findOffers(source, { items, ...asked }, signal) {
	const found = []
	for (let at = 0; at < items.length; at += ITEMS_MOST) {
		const answer = await foundFor(source, { ...asked, items: items.slice(at, at + ITEMS_MOST) }, signal)
		if (!answer.found) return answer
		found.push(...answer.found)
	}
	return { found }
}

/** `foundFor` with `shops` in the reader's words: { found, unknownShops }, or { unknownOnly } when it knows none. */
export async function offersAsked(source, { items, shops = [], ...asking }, signal) {
	const shopKeys = [...new Set(shops.map(source.shopKey).filter(Boolean))]
	const unknownShops = shops.filter(shop => !source.shopKey(shop))
	if (shops.length && !shopKeys.length) return { unknownOnly: unknownShops }
	const answer = await foundFor(source, { items, shopKeys, ...asking }, signal)
	return answer.found ? { found: answer.found, unknownShops } : answer
}
