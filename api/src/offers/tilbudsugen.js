/* Tilbudsugen.dk: Danish grocery offers, from the search the site offers other programs (tilbudsugen.md).
   A request carries the items and shops asked for, nothing from the reader's own data. */

const SEARCH_URL = 'https://www.tilbudsugen.dk/api/ai/v1/search'
const TIMEOUT_MS = 10_000

// "Føtex", "REMA 1000" and "Dagli'Brugsen" fold to the keys below
const fold = name => String(name).toLowerCase().replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa').replace(/[^a-z0-9]/g, '')

// the site's own key for each shop it filters by, under every name the shop is written with
const SHOP_KEYS = {
	netto: 'netto',
	rema: 'rema_1000', rema1000: 'rema_1000',
	coop365: 'coop365', '365': 'coop365', '365discount': 'coop365', coop365discount: 'coop365',
	lidl: 'lidl',
	foetex: 'foetex', fotex: 'foetex',
	bilka: 'bilka',
	meny: 'meny',
	superbrugsen: 'super-brugsen', brugsen: 'super-brugsen',
	kvickly: 'kvickly',
	loevbjerg: 'loevbjerg', lovbjerg: 'loevbjerg',
	daglibrugsen: 'daglibrugsen',
	minkoebmand: 'min-koebmand', minkobmand: 'min-koebmand',
	spar: 'spar',
	letkoeb: 'letkoeb', letkob: 'letkoeb'
}

const dayOf = at => (typeof at === 'string' ? at.slice(0, 10) : null)
const numberOr = (value, fallback = null) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)

function offerOf(offer) {
	const metrics = offer.unit_metrics ?? {}
	const perUnitKey = Object.keys(metrics).find(key => key.startsWith('price_per_'))
	const promotion = offer.promotion ?? {}
	return {
		product: offer.product_name,
		brand: offer.brand || null,
		shop: offer.availability?.retail_chain ?? null,
		borderShop: !!offer.availability?.is_border_shop,
		price: numberOr(offer.price),
		// a price such as "12 for 74.99" is for this many
		forHowMany: numberOr(promotion.minQuantity) > 1 ? promotion.minQuantity : 1,
		membersOnly: !!promotion.requiresMembership,
		size: metrics.quantity && metrics.unit_type ? `${metrics.quantity} ${metrics.unit_type}` : null,
		perUnit: perUnitKey ? { price: numberOr(metrics[perUnitKey]), unit: metrics.unit_type ?? null } : null,
		from: dayOf(offer.start_date),
		to: dayOf(offer.end_date)
	}
}

export const tilbudsugen = {
	key: 'tilbudsugen',
	name: 'Tilbudsugen',
	site: 'tilbudsugen.dk',
	goods: 'groceries',
	country: 'Denmark',
	currency: 'DKK',
	shopKey: name => SHOP_KEYS[fold(name)] ?? null,
	async find({ items, shopKeys }, signal) {
		const search = new URLSearchParams({ q: items.join(',') })
		if (shopKeys.length) search.set('chains', shopKeys.join(','))
		const answer = await fetch(`${SEARCH_URL}?${search}`, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.any([AbortSignal.timeout(TIMEOUT_MS), ...(signal ? [signal] : [])])
		})
		if (!answer.ok) throw Object.assign(new Error(`The answer was ${answer.status}.`), { retryAfter: answer.headers.get('retry-after') })
		const body = await answer.json()
		return (body.items ?? []).map(item => ({
			item: item.query,
			offersFound: numberOr(item.total_offers_found, 0),
			offers: (item.offers ?? []).filter(o => o.currency === 'DKK').map(offerOf)
		}))
	}
}
