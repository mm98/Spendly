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
		product: 'Letmælk', brand: 'Arla', size: { amount: 1, unit: 'ltr.' }, shop: 'Netto', membersOnly: false, price: 74.99, forHowMany: 12,
		perUnit: { price: 6.25, unit: 'ltr.' }, image: null, to: '2026-10-28'
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
	const offer = (price, perUnit) => ({ ...milk, price, promotion: {}, unit_metrics: perUnit ? { quantity: 1, unit_type: 'ltr.', 'price_per_ltr.': perUnit } : {} })
	answerWith = url => url.includes('/product-offers-search/')
		? { status: 200, body: { pageOfOrganicProductOffers: { items: [] } } }
		: { status: 200, body: { items: [{ query: 'havremælk', offers: [offer(9, null), offer(20, 20), offer(12, 12), offer(15, 15), offer(30, 30), offer(25, 25)] }] } }
	const made = await ask({ items: ['havremælk'] })
	assert.deepEqual(made.items[0].offers.map(o => o.price), [12, 15, 20, 25, 30])
})

const { sizeOf, searchWordsOf, matchFor, offersForOrder } = await import('../src/offers/lines.js')

const offer = fields => ({ product: 'P', brand: null, shop: 'Netto', borderShop: false, price: 15, forHowMany: 1, membersOnly: false,
	size: { amount: 1, unit: 'ltr.' }, perUnit: { price: 15, unit: 'ltr.' }, from: '2026-10-24', to: '2026-10-30', ...fields })

test('a line\'s name gives its size and the words it is searched by', () => {
	assert.deepEqual(sizeOf('Merrild kaffe 500g'), { amount: 0.5, unit: 'kg' })
	assert.deepEqual(sizeOf('Cola 1,5 L'), { amount: 1.5, unit: 'l' })
	assert.equal(sizeOf('Schulstad rugbrød'), null)
	assert.equal(searchWordsOf('Arla letmælk 1L'), 'arla letmælk')
	assert.equal(searchWordsOf('Æg 10 stk.'), 'æg')
})

test('a line matches the offer cheapest against what it paid, on the order\'s date only', () => {
	const line = { title: 'Merrild kaffe 500g', quantity: 2, price: 59.95 }
	const dear = offer({ price: 70, perUnit: { price: 140, unit: 'kg.' } })
	const multi = offer({ price: 80, forHowMany: 2, perUnit: { price: 80, unit: 'kg.' } })
	const gone = offer({ price: 30, perUnit: { price: 60, unit: 'kg.' }, to: '2026-10-25' })
	assert.equal(matchFor(line, [dear, gone, multi], '2026-10-26'), multi)
	assert.equal(matchFor(line, [dear], '2026-10-26'), null)
	// no size in the name: per piece
	assert.equal(matchFor({ title: 'Rugbrød', quantity: 1, price: 24 }, [offer({ price: 20, perUnit: { price: 40, unit: 'kg.' } })], '2026-10-26').price, 20)
})

test('an order from a shop the source knows, under one of its names, is checked in one request', async () => {
	answerWith = () => ({ status: 200, body: { items: [
		{ query: 'arla letmælk', total_offers_found: 1, offers: [{ ...milk, price: 15, promotion: {}, unit_metrics: { quantity: 1, unit_type: 'ltr.', 'price_per_ltr.': 15 } }] },
		{ query: 'schulstad rugbrød', total_offers_found: 0, offers: [] }
	] } })
	const lines = [{ title: 'Arla letmælk 1L', quantity: 2, price: 18.95 }, { title: 'Schulstad rugbrød', quantity: 1, price: 24 }]
	const order = { userId: USER, today: '2026-10-26', shopNames: ['Føtex Viby', 'Netto Aarhus C'], date: '2026-10-25', lines }
	assert.deepEqual(await offersForOrder({ ...order, keptOnly: true }), { shown: true, source: { name: 'Tilbudsugen', site: 'tilbudsugen.dk' }, state: 'unchecked', lines: [] })
	assert.equal(asked.length, 0)
	const checked = await offersForOrder({ ...order, keptOnly: false })
	assert.equal(checked.state, 'checked')
	assert.deepEqual(checked.lines.map(l => [l.index, l.offer.price]), [[0, 15]])
	const reopened = await offersForOrder({ ...order, keptOnly: true })
	assert.equal(reopened.state, 'checked')
})

test('a line with an offer gets the small picture of that offer, from a request outside the limits', async () => {
	const thumb = 'https://static.tilbudsugen.dk/1st-retail/2026/43/1/milk_thumb.jpg'
	answerWith = url => url.includes('/product-offers-search/')
		? { status: 200, body: { pageOfOrganicProductOffers: { items: [
			{ chain: { name: 'Netto' }, price: '9.00', startDate: '2026-10-22', imageThumbnailUrl: 'https://static.tilbudsugen.dk/other_thumb.jpg' },
			{ chain: { name: 'Netto' }, price: '8.00', startDate: '2026-10-22', imageThumbnailUrl: thumb, imageUrl: thumb.replace('_thumb', '_zoom') }
		] } } }
		: { status: 200, body: { items: [{ query: 'skummetmælk', total_offers_found: 1, offers: [{ ...milk, price: 8, promotion: {}, unit_metrics: { quantity: 1, unit_type: 'ltr.', 'price_per_ltr.': 8 } }] }] } }
	const order = { userId: USER, today: '2026-10-26', shopNames: ['Netto'], date: '2026-10-26', lines: [{ title: 'Skummetmælk 1L', quantity: 1, price: 12 }] }
	const checked = await offersForOrder({ ...order, keptOnly: false })
	assert.equal(checked.lines[0].offer.image, thumb)
	assert.equal(asked.length, 2)
	assert.match(asked[1], /\/product-offers-search\/dk\/skummetm%C3%A6lk\?/)
})

test('an older order, or one from a shop no source knows, shows no offers', async () => {
	const lines = [{ title: 'Mælk', quantity: 1, price: 10 }]
	assert.deepEqual(await offersForOrder({ userId: USER, today: '2026-10-26', shopNames: ['Netto'], date: '2026-10-19', lines, keptOnly: false }), { shown: false })
	assert.deepEqual(await offersForOrder({ userId: USER, today: '2026-10-26', shopNames: ['IKEA'], date: '2026-10-26', lines, keptOnly: false }), { shown: false })
	assert.equal(asked.length, 0)
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
