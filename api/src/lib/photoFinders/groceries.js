import { productKey } from './productKey.js'

/* Groceries: product photos from Bilka, through Salling Group's product suggestions, whose names read
   like a receipt's. Needs SALLING_GROUP_API_KEY; only an image on Bilka's own picture host is fetched. */

const SEARCH = 'https://api.sallinggroup.com/v1-beta/product-suggestions/relevant-products?query='
const IMAGE_HOST = 'image.prod.iposeninfra.com'
const TIMEOUT_MS = 10_000
const MAX_ANSWER_BYTES = 1024 * 1024
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
// a longer title's hit carries two thirds of its words, the longest among them
const MIN_SCORE = 2 / 3

/** Each product in a search answer: its name and its picture, in the answer's order. */
export function productsIn(answer) {
	return (Array.isArray(answer?.suggestions) ? answer.suggestions : [])
		.filter(p => typeof p?.title === 'string' && typeof p?.img === 'string' && p.title.trim() && /^https:\/\//.test(p.img))
		.map(p => ({ name: p.title.trim(), image: p.img, page: typeof p.link === 'string' && /^https:\/\//.test(p.link) ? p.link : null }))
}

// the shop's own short forms, written out so they meet a receipt's words
const SHORT = { hk: 'hakket', øko: 'økologisk', 'økol': 'økologisk' }
const shopWords = name => productKey(name).split(' ').map(w => SHORT[w] ?? w)
// a word meets another at its start, or inside a joined word ("pasta" in "majspasta")
const wordHits = (word, have) => have.some(h => h.startsWith(word) || (word.length >= 4 && h.includes(word))
	|| (word.length >= 5 && h.length >= 4 && word.startsWith(h)))

/** How well a product name fits a line's title: the share of the title's words it carries, or 0
    when it misses the longest word, which most often names the thing itself. */
export function scoreOf(title, name) {
	const all = productKey(title).split(' ').filter(Boolean)
	// a word shorter than three letters only counts when it is the whole title ("æg")
	const wanted = all.some(w => w.length >= 3) ? all.filter(w => w.length >= 3) : all
	if (!wanted.length) return 0
	const have = shopWords(name)
	const longest = wanted.reduce((a, b) => (b.length > a.length ? b : a))
	if (!wordHits(longest, have)) return 0
	return wanted.filter(w => wordHits(w, have)).length / wanted.length
}

export function bestProduct(title, products) {
	let best = null
	for (const p of products) {
		const score = scoreOf(title, p.name)
		// a title of one or two words is met in full: "laks filet" is not "røget filet"
		const enough = productKey(title).split(' ').length <= 2 ? score === 1 : score >= MIN_SCORE
		if (enough && score > (best?.score ?? 0)) best = { ...p, score }
	}
	return best
}

async function read(url, headers, limit) {
	const res = await fetch(url, { headers: { 'accept-language': 'da-DK', ...headers }, signal: AbortSignal.timeout(TIMEOUT_MS) })
	if (!res.ok) throw new Error(`answered ${res.status}`)
	// a redirect is followed only while it stays on the host that was asked
	if (new URL(res.url).host !== new URL(url).host) throw new Error(`sent on to ${new URL(res.url).host}`)
	const length = Number(res.headers.get('content-length'))
	if (length > limit) throw new Error(`sent ${length} bytes, more than ${limit}`)
	const bytes = Buffer.from(await res.arrayBuffer())
	if (bytes.length > limit) throw new Error(`sent ${bytes.length} bytes, more than ${limit}`)
	return { bytes, contentType: (res.headers.get('content-type') ?? '').split(';')[0].trim() }
}

const logged = (url, error) => {
	console.error(`Find photos: ${url} failed: ${error?.cause?.message ?? error?.message ?? error}`)
	return null
}

export const groceries = {
	key: 'groceries',
	works: () => Boolean(process.env.SALLING_GROUP_API_KEY),
	async find(title) {
		const words = productKey(title)
		if (!words) return null
		const searchUrl = SEARCH + encodeURIComponent(words)
		const answer = await read(searchUrl, { accept: 'application/json', authorization: `Bearer ${process.env.SALLING_GROUP_API_KEY}` }, MAX_ANSWER_BYTES)
			.then(a => JSON.parse(a.bytes.toString('utf8')))
			.catch(error => logged(searchUrl, error))
		if (!answer) return null
		const best = bestProduct(title, productsIn(answer))
		if (!best || new URL(best.image).host !== IMAGE_HOST) return null
		const image = await read(best.image, { accept: 'image/*' }, MAX_IMAGE_BYTES).catch(error => logged(best.image, error))
		if (!image) return null
		if (!image.contentType.startsWith('image/')) return logged(best.image, new Error(`sent ${image.contentType || 'no type'}, not a picture`))
		return { image: image.bytes, contentType: image.contentType, sourceUrl: best.page ?? searchUrl }
	}
}
