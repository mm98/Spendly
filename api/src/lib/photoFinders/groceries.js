import { productKey } from './productKey.js'

/* Groceries: product photos from REMA 1000's web shop search page, whose names read like a receipt's.
   Only an image on the shop's own picture host is ever fetched. */

const SEARCH = 'https://shop.rema1000.dk/soeg?q='
const IMAGE_HOST = 'rema-product-images.digital.rema1000.dk'
const TIMEOUT_MS = 10_000
const MAX_PAGE_BYTES = 4 * 1024 * 1024
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
// a longer title's hit carries two thirds of its words, the longest among them
const MIN_SCORE = 2 / 3

const entities = { amp: '&', quot: '"', '#39': "'", lt: '<', gt: '>', nbsp: ' ' }
const textOf = html => html.replace(/<[^>]+>/g, ' ').replace(/&(amp|quot|#39|lt|gt|nbsp);/g, (_, e) => entities[e]).replace(/\s+/g, ' ').trim()

/** Each product on a search page: its name and its picture, in the page's order. */
export function productsOn(html) {
	const found = []
	const picture = /<img data-nuxt-img[^>]*?\ssrc="(https:\/\/rema-product-images\.digital\.rema1000\.dk\/[^"]+)"[^>]*>/g
	for (let m; (m = picture.exec(html));) {
		// the name is the first text after the picture, up to the slash before the maker
		const name = textOf(html.slice(m.index + m[0].length, m.index + m[0].length + 1500)).split(/ \/ |</)[0].trim()
		if (name) found.push({ name, image: m[1].replace('-small-', '-medium-') })
	}
	return found
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

async function read(url, accept, limit) {
	const res = await fetch(url, { headers: { accept, 'accept-language': 'da-DK' }, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'error' })
	if (!res.ok) throw new Error(`answered ${res.status}`)
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
	async find(title) {
		const words = productKey(title)
		if (!words) return null
		const sourceUrl = SEARCH + encodeURIComponent(words)
		const page = await read(sourceUrl, 'text/html', MAX_PAGE_BYTES).catch(error => logged(sourceUrl, error))
		if (!page) return null
		const best = bestProduct(title, productsOn(page.bytes.toString('utf8')))
		if (!best || new URL(best.image).host !== IMAGE_HOST) return null
		const image = await read(best.image, 'image/*', MAX_IMAGE_BYTES).catch(error => logged(best.image, error))
		if (!image) return null
		if (!image.contentType.startsWith('image/')) return logged(best.image, new Error(`sent ${image.contentType || 'no type'}, not a picture`))
		return { image: image.bytes, contentType: image.contentType, sourceUrl }
	}
}
