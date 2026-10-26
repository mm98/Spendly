/* Tilbudsugen.dk: Danish grocery offers, from the search the site offers other programs (tilbudsugen.md).
   A request carries the items and shops asked for, nothing from the reader's own data. */

// the headers the site's own pages send when a browser asks the same
const ASKED_WITH = {
	Accept: 'application/json, text/plain, */*',
	'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
	Referer: 'https://www.tilbudsugen.dk/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
}
const SEARCH_URL = 'https://www.tilbudsugen.dk/api/ai/v1/search'
// the site's own search, the only one with pictures: one item a request, every shop's offers for it
const PICTURES_URL = 'https://www.tilbudsugen.dk/api/api/product-offers-search/dk/'
const PICTURES_ORIGIN = 'https://static.tilbudsugen.dk'
const PICTURES_PER_PAGE = 48
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

// each shop's logo, by its folded name, as the site's offer papers page draws it (tilbudsugen.md)
const SHOP_LOGOS_URL = 'https://www.tilbudsugen.dk/chains/'
const SHOP_LOGOS = {
	bilka: 'bilka.png',
	calle: 'calle.png',
	citti: 'CITTI.png',
	daglibrugsen: 'daglibrugsen.png',
	faktatyskland: 'fakta.png',
	fleggaard: 'fleggaard.png',
	foetex: 'foetex.png',
	haraldnyborg: 'harald-nyborg.png',
	kvickly: 'kvickly.png',
	koebmandsgaarden: 'koebmandsgaarden.png',
	letkoeb: 'letkoeb.png',
	lidl: 'lidl.png',
	loevbjerg: 'loevbjerg.png',
	matas: 'matas.png',
	meny: 'meny.png',
	minkoebmand: 'min-koebmand.png',
	netto: 'netto.png',
	nielsendiscount: 'nielsens-discount.svg',
	ottoduborg: 'otto_duborg_logo.svg',
	poetzschpadborg: 'poetzsch-padborg.jpg',
	rema1000: 'rema-1000.svg',
	scandinavianpark: 'scandinavian-park.png',
	scandlines: 'scandlines-border-shop.png',
	spar: 'SPAR.jpg',
	superbrugsen: 'super-brugsen.png',
	'365discount': 'coop365.png', coop365: 'coop365.png', coop365discount: 'coop365.png',
	bigdollar: 'bigdollar.png',
	abclavpristarm: 'abc-lavpris.png'
}

// "Netto Aarhus C" and "REMA 1000 Viby" are the shop by their first words
function byFirstWords(table, name) {
	const words = String(name).trim().split(/\s+/)
	for (let n = words.length; n > 0; n--) {
		const found = table[fold(words.slice(0, n).join(' '))]
		if (found) return found
	}
	return null
}
const shopKey = name => byFirstWords(SHOP_KEYS, name)
const shopLogo = name => {
	const file = name ? byFirstWords(SHOP_LOGOS, name) : null
	return file ? SHOP_LOGOS_URL + encodeURIComponent(file) : null
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
		shopLogo: shopLogo(offer.availability?.retail_chain),
		borderShop: !!offer.availability?.is_border_shop,
		price: numberOr(offer.price),
		// a price such as "12 for 74.99" is for this many
		forHowMany: numberOr(promotion.minQuantity) > 1 ? promotion.minQuantity : 1,
		membersOnly: !!promotion.requiresMembership,
		size: metrics.quantity && metrics.unit_type ? { amount: metrics.quantity, unit: metrics.unit_type } : null,
		perUnit: perUnitKey ? { price: numberOr(metrics[perUnitKey]), unit: metrics.unit_type ?? null } : null,
		image: null,
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
	currencyName: 'Danish kroner',
	shopKey,
	picturesOrigin: PICTURES_ORIGIN,
	async find({ items, shopKeys }, signal) {
		const search = new URLSearchParams({ q: items.join(',') })
		if (shopKeys.length) search.set('chains', shopKeys.join(','))
		const answer = await fetch(`${SEARCH_URL}?${search}`, {
			headers: ASKED_WITH,
			signal: AbortSignal.any([AbortSignal.timeout(TIMEOUT_MS), ...(signal ? [signal] : [])])
		})
		if (!answer.ok) throw Object.assign(new Error(`The answer was ${answer.status}.`), { retryAfter: answer.headers.get('retry-after') })
		const body = await answer.json()
		return (body.items ?? []).map(item => ({
			item: item.query,
			offersFound: numberOr(item.total_offers_found, 0),
			offers: (item.offers ?? []).filter(o => o.currency === 'DKK').map(offerOf)
		}))
	},
	/** The small picture of each offer in `offers`, found among the site's own offers for `item`: by shop,
	    price and first day. Answers the pictures in the order of `offers`, null where none was found. */
	async pictures({ item, offers }, signal) {
		const search = new URLSearchParams({ page: '1', numberPerPage: String(PICTURES_PER_PAGE), sortBy: 'pricePerUnit', sortDirection: 'ASC' })
		const answer = await fetch(`${PICTURES_URL}${encodeURIComponent(item)}?${search}`, {
			headers: ASKED_WITH,
			signal: AbortSignal.any([AbortSignal.timeout(TIMEOUT_MS), ...(signal ? [signal] : [])])
		})
		if (!answer.ok) throw Object.assign(new Error(`The answer was ${answer.status}.`), { retryAfter: answer.headers.get('retry-after') })
		const listed = (await answer.json())?.pageOfOrganicProductOffers?.items ?? []
		return offers.map(offer => {
			const same = listed.find(o => o.chain?.name === offer.shop && Number(o.price) === offer.price && o.startDate === offer.from)
			const url = same?.imageThumbnailUrl
			return typeof url === 'string' && url.startsWith(`${PICTURES_ORIGIN}/`) ? url : null
		})
	}
}
