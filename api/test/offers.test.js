import { test, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// a database of its own, set before anything opens the real one
const scratch = mkdtempSync(path.join(tmpdir(), 'spendly-offers-'))
process.env.SPENDLY_DB = path.join(scratch, 'spendly.sqlite3')

const { db } = await import('../src/db.js')
const { offersToolFor } = await import('../src/offers/index.js')

const USER = 'u-offers'
const EURO_USER = 'u-offers-euro'
let asked = []
let answerWith = () => ({ status: 200, body: { items: [] } })

before(() => {
	db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, 'x', 'Test')").run(USER, 'offers@example.com')
	db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, 'x', 'Test')").run(EURO_USER, 'offers-euro@example.com')
	db.prepare("INSERT INTO user_settings (user_id, default_kind, default_status, page_size, sort, currency) VALUES (?, 'Expense', 'Delivered', 25, 'date-desc', 'EUR')").run(EURO_USER)
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

test('an account whose currency no source sells in has no offers tool', () => {
	assert.equal(offersToolFor(EURO_USER), null)
})

test('a shopping list is one request, its shops are the site\'s keys, and the same question is asked once', async () => {
	answerWith = () => ({ status: 200, body: { items: [{ query: 'mælk', total_offers_found: 1, offers: [milk] }] } })
	const offers = offersToolFor(USER)
	const first = await offers.answer({ source: 'tilbudsugen', items: ['mælk', 'smør'], shops: ['Netto', 'Føtex', 'Nowhere'] })
	assert.equal(asked.length, 1)
	const url = new URL(asked[0])
	assert.equal(url.searchParams.get('q'), 'mælk,smør')
	assert.equal(url.searchParams.get('chains'), 'netto,foetex')
	const read = JSON.parse(first.content[0].text)
	assert.deepEqual(read.unknownShops, ['Nowhere'])
	assert.deepEqual(read.items[0].offers[0], {
		product: 'Letmælk', brand: 'Arla', shop: 'Netto', borderShop: false, price: 74.99, forHowMany: 12, membersOnly: false,
		size: '1 ltr.', perUnit: { price: 6.25, unit: 'ltr.' }, from: '2026-10-22', to: '2026-10-28'
	})
	await offers.answer({ source: 'tilbudsugen', items: ['Smør', 'mælk'], shops: ['foetex', 'netto'] })
	assert.equal(asked.length, 1)
})

test('only shops the source does not know is answered without a request', async () => {
	const result = await offersToolFor(USER).answer({ source: 'tilbudsugen', items: ['brød'], shops: ['Nowhere'] })
	assert.equal(result.isError, true)
	assert.equal(asked.length, 0)
})

test('a refusal pauses the source, and nothing is asked while it is paused', async () => {
	answerWith = () => ({ status: 429, body: {}, headers: { 'Retry-After': '120' } })
	const offers = offersToolFor(USER)
	const refused = await offers.answer({ source: 'tilbudsugen', items: ['kaffe'] })
	assert.equal(refused.isError, true)
	assert.equal(asked.length, 1)
	answerWith = () => ({ status: 200, body: { items: [] } })
	const paused = await offers.answer({ source: 'tilbudsugen', items: ['te'] })
	assert.equal(paused.isError, true)
	assert.equal(asked.length, 1)
})
