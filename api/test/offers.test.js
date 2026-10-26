import { test, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// a database of its own, set before anything opens the real one
const scratch = mkdtempSync(path.join(tmpdir(), 'spendly-offers-'))
process.env.SPENDLY_DB = path.join(scratch, 'spendly.sqlite3')

const { db } = await import('../src/db.js')
const { offersMaker } = await import('../src/format/offers/index.js')
const { makersFor } = await import('../src/format/index.js')

const USER = 'u-offers'
const CHAT = 'ac-offers'
const EURO_USER = 'u-offers-euro'
let asked = []
let answerWith = () => ({ status: 200, body: { items: [] } })

before(() => {
	db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, 'x', 'Test')").run(USER, 'offers@example.com')
	db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, 'x', 'Test')").run(EURO_USER, 'offers-euro@example.com')
	db.prepare("INSERT INTO user_settings (user_id, default_kind, default_status, page_size, sort, currency) VALUES (?, 'Expense', 'Delivered', 25, 'date-desc', 'EUR')").run(EURO_USER)
	const vendor = db.prepare("INSERT INTO vendors (id, user_id, name, initials, colour) VALUES (?, ?, ?, 'XX', 'green-3')")
	vendor.run('v-netto', USER, 'Mine Indkøb')
	db.prepare("INSERT INTO vendor_aliases (id, user_id, vendor_id, name) VALUES ('va-netto', ?, 'v-netto', 'Netto Aarhus C')").run(USER)
	vendor.run('v-ikea', USER, 'IKEA')
	vendor.run('v-baker', USER, 'Bageriet')
	db.prepare("INSERT INTO categories (id, user_id, name, colour) VALUES ('c-food', ?, 'Mad', 'green-3')").run(USER)
	db.prepare("INSERT INTO user_ask_chats (id, user_id, first_question, asked_at, kept_until, expires_at) VALUES (?, ?, 'Mælk?', 0, '2026-11-25', 9999999999)").run(CHAT, USER)
	globalThis.fetch = async url => {
		asked.push(String(url))
		const { status, body, headers = {} } = answerWith(String(url))
		return new Response(JSON.stringify(body), { status, headers })
	}
})

beforeEach(() => { asked = [] })

const milk = {
	product_name: 'Letmælk', brand: 'Arla', price: 74.99, currency: 'DKK',
	promotion: { minQuantity: 12, requiresMembership: false },
	unit_metrics: { quantity: 1, unit_type: 'ltr.', 'price_per_ltr.': 6.25 },
	availability: { retail_chain: 'Netto', is_border_shop: false },
	start_date: '2026-10-22T00:00:00Z', end_date: '2026-10-28T23:59:59Z'
}

const making = { userId: USER, chatId: CHAT, today: '2026-10-26' }
const ask = input => offersMaker.make({ source: 'tilbudsugen', ...input }, making)

test('an account whose currency no source sells in is not offered the offers tool', () => {
	assert.equal(offersMaker.tool(EURO_USER), null)
	assert.deepEqual(makersFor(EURO_USER).map(m => m.maker.place), ['file', 'chart'])
	assert.equal(makersFor(USER).at(-1).tool.name, 'find_offers')
})

test('a shopping list is one request, its shops are the site\'s keys, and the same question is asked once', async () => {
	answerWith = () => ({ status: 200, body: { items: [{ query: 'mælk', total_offers_found: 1, offers: [milk] }] } })
	const first = await ask({ items: ['mælk', 'smør'], shops: ['Netto', 'Føtex', 'Nowhere'] })
	const url = new URL(asked[0])
	assert.equal(url.searchParams.get('q'), 'mælk,smør')
	assert.equal(url.searchParams.get('chains'), 'netto,foetex')
	const read = JSON.parse(first.said)
	assert.deepEqual(read.unknownShops, ['Nowhere'])
	assert.equal(read.items[0].placeMark, `{{offers:${first.items[0].id}}}`)
	assert.deepEqual(first.items[0].offers[0], {
		product: 'Letmælk', brand: 'Arla', size: { amount: 1, unit: 'ltr.' }, shop: 'Netto', shopLogo: 'https://www.tilbudsugen.dk/chains/netto.png', membersOnly: false, withoutSugar: false, price: 74.99, forHowMany: 12,
		perUnit: { price: 6.25, unit: 'ltr.' }, to: '2026-10-28',
		vendor: null, link: { url: 'https://www.tilbudsugen.dk/dk/ai-basket?q=m%C3%A6lk', paper: false }
	})
	// the block is kept as it was answered, for the chat to show again
	assert.deepEqual(offersMaker.byIds(USER, [first.items[0].id])[first.items[0].id], first.items[0])
	assert.deepEqual(offersMaker.byIds(EURO_USER, [first.items[0].id]), {})
	await ask({ items: ['Smør', 'mælk'], shops: ['foetex', 'netto'] })
	assert.equal(asked.filter(u => u.includes('/ai/v1/search')).length, 1)
})

test('only shops the source does not know is answered without a request', async () => {
	const result = await ask({ items: ['brød'], shops: ['Nowhere'] })
	assert.deepEqual(result.items, [])
	assert.equal(asked.length, 0)
})

test('a block shows at most five offers, cheapest per unit first, those without a unit price last', async () => {
	const offer = (price, perUnit, shop) => ({ ...milk, price, promotion: {}, availability: { retail_chain: shop }, unit_metrics: perUnit ? { quantity: 1, unit_type: 'ltr.', 'price_per_ltr.': perUnit } : {} })
	answerWith = url => url.includes('/product-offers-search/')
		? { status: 200, body: { pageOfOrganicProductOffers: { items: [] } } }
		: { status: 200, body: { items: [{ query: 'havremælk', offers: [offer(9, null, 'Lidl'), offer(20, 20, 'Meny'), offer(12, 12, 'Netto'), offer(15, 15, 'Bilka'), offer(30, 30, 'Spar'), offer(25, 25, 'Føtex')] }] } }
	const made = await ask({ items: ['havremælk'] })
	assert.deepEqual(made.items[0].offers.map(o => o.price), [12, 15, 20, 25, 30])
})

test('a shop shows once, with its cheapest offer without sugar, also in a chat kept before that and in its email', async () => {
	const cola = (product, price, perUnit, shop, rawText) => ({ ...milk, product_name: product, brand: 'Harboe', price, promotion: { rawText },
		availability: { retail_chain: shop }, unit_metrics: { quantity: 0.5, unit_type: 'ltr.', 'price_per_ltr.': perUnit } })
	// the site answers the same cola twice when only its own text differs, and says "without sugar" only there
	answerWith = url => url.includes('/product-offers-search/')
		? { status: 200, body: { pageOfOrganicProductOffers: { items: [] } } }
		: { status: 200, body: { items: [{ query: 'cola', offers: [
			cola('Cola', 40, 4.44, 'Kvickly', '40.00 18'), cola('Cola', 40, 4.44, 'Kvickly', '40.00 18 Uden tilsat sukker'),
			cola('Cola', 1.99, 6.03, 'Løvbjerg', '1.99 fl. var.'), cola('Cola', 1.99, 6.03, 'Løvbjerg', '1.99 fl. var. Uden tilsat sukker'),
			cola('Pepsi Cola', 9.95, 6.63, 'Meny', '9.95 fl. var.'), cola('Pepsi Max Cola', 11, 7.33, 'Meny', '11.00 Sukkerfri'),
			cola('Cola', 12, 8, 'Kvickly', '')] }] } }
	const made = await ask({ items: ['cola'] })
	assert.deepEqual(made.items[0].offers.map(o => [o.shop, o.product, o.price, o.withoutSugar]),
		[['Kvickly', 'Cola', 40, true], ['Løvbjerg', 'Cola', 1.99, true], ['Meny', 'Pepsi Max Cola', 11, true]])
	assert.deepEqual(JSON.parse(made.said).items[0].offers.map(o => o.shop), ['Kvickly', 'Løvbjerg', 'Meny'])

	const before = { item: 'cola', source: { name: 'Tilbudsugen', site: 'tilbudsugen.dk' }, offers: [
		{ product: 'Cola', shop: 'Kvickly', price: 40, forHowMany: 18, to: '2026-10-29' }, { product: 'Cola', shop: 'Kvickly', price: 40, forHowMany: 18, to: '2026-10-29' },
		{ product: 'Cola', shop: 'Løvbjerg', price: 1.99, forHowMany: 1, to: '2026-10-29' }] }
	db.prepare('INSERT INTO user_ask_offers (id, user_id, chat_id, offers) VALUES (?, ?, ?, ?)').run('ao-before', USER, CHAT, JSON.stringify({ id: 'ao-before', ...before }))
	const kept = offersMaker.byIds(USER, ['ao-before'])
	assert.deepEqual(kept['ao-before'].offers.map(o => o.shop), ['Kvickly', 'Løvbjerg'])
	const write = { date: day => day, quantity: n => String(n) }
	const [emailed] = offersMaker.emailBlocks(['ao-before'], kept, { money: n => `${n} kr.`, write })
	assert.deepEqual(emailed.items.map(i => i.shop), ['Kvickly', 'Løvbjerg'])
})

test('an offer links to the shop\'s offer paper, from a request outside the limits, and names the reader\'s vendor', async () => {
	const paper = 'https://netto.dk/avis/'
	db.prepare("INSERT INTO vendor_aliases (id, user_id, vendor_id, name) VALUES ('va-netto-short', ?, 'v-netto', 'netto')").run(USER)
	answerWith = url => url.includes('/product-offers-search/')
		? { status: 200, body: { pageOfOrganicProductOffers: { items: [
			{ chain: { name: 'Netto' }, price: '9.00', startDate: '2026-10-22', offerUrl: 'https://example.com/other/' },
			{ chain: { name: 'Netto' }, price: '8.00', startDate: '2026-10-22', offerUrl: paper }
		] } } }
		: { status: 200, body: { items: [{ query: 'skummetmælk', total_offers_found: 1, offers: [{ ...milk, price: 8, promotion: {}, unit_metrics: { quantity: 1, unit_type: 'ltr.', 'price_per_ltr.': 8 } }] }] } }
	const [block] = (await ask({ items: ['skummetmælk'] })).items
	assert.deepEqual(block.offers[0].link, { url: paper, paper: true })
	assert.deepEqual(block.offers[0].vendor, { name: 'Mine Indkøb', colour: 'green-3' })
	assert.equal(block.offers[0].shopLogo, 'https://www.tilbudsugen.dk/chains/netto.png')
	assert.equal(asked.length, 2)
	assert.match(asked[1], /\/product-offers-search\/dk\/skummetm%C3%A6lk\?/)
})

test('a refusal pauses the source, and nothing is asked while it is paused', async () => {
	answerWith = () => ({ status: 429, body: {}, headers: { 'Retry-After': '120' } })
	const refused = await ask({ items: ['kaffe'] })
	assert.deepEqual(refused.items, [])
	assert.equal(asked.length, 1)
	answerWith = () => ({ status: 200, body: { items: [] } })
	const paused = await ask({ items: ['te'] })
	assert.match(paused.said, /Ask again in 2 minutes/)
	assert.equal(asked.length, 1)
})
