/* Drives the three listing tabs and checks that each one remembers what it was showing.

   Needs the app up (npm run dev in react/, api/) and Playwright's chromium; a local
   playwright install is used if present, the global one otherwise.

   Usage: node check-list-state.mjs      (exits non-zero on the first failed assertion)

   Twelve assertions, and what each is guarding: the round trip on all three lists (filter,
   leave, come back), a link with its own filters overriding the memory, CLEAR ALL surviving
   a round trip, a restored page number, a second tab starting clean and the first keeping
   its own. Every read waits for the hash to hold still first -- the restore is a redirect,
   so reading straight after a click reads the frame before it, and that is how the CLEAR ALL
   bounce hid for a whole run (docs/defects.md). The router is a hash router: the addresses
   below all carry the `#`, and the query string is read out of location.hash rather than
   URL.search, which is always empty here. */
import { execSync } from 'node:child_process'
const pw = await import('playwright').catch(() =>
	import(`file://${execSync('npm root -g').toString().trim()}/playwright/index.mjs`))
const BASE = 'http://localhost:5173'
const browser = await pw.chromium.launch()
const ctx = await browser.newContext({ locale: 'en-GB', timezoneId: 'Europe/Copenhagen' })
const page = await ctx.newPage()
page.setDefaultTimeout(2000); page.setDefaultNavigationTimeout(2000)
page.on('pageerror', e => console.log('  !! pageerror:', e.message))

console.log('register', (await ctx.request.post(BASE + '/api/auth/register', { data: { email: `probe-${Date.now()}@example.com`, password: 'probe-pass-1' } })).status())
console.log('demo-data', (await ctx.request.post(BASE + '/api/demo-data', { data: { seed: 1, months: 2, orders: 30 } })).status())
const vjson = await (await ctx.request.get(BASE + '/api/vendors')).json()
const v = (vjson.vendors ?? vjson).find(x => /bilka/i.test(x.name))

const hash = () => decodeURIComponent(page.url().split('#')[1] ?? '')
const chips = () => page.locator('[data-chip]').allTextContents()
const count = sel => page.locator(sel).count()
const err = () => page.locator('text=Something went wrong').count()
/* Wait for the page to be done, then for the URL to stop moving: the restore is a redirect,
   so reading straight after a click reads the frame before it. */
const settle = async sel => {
	await page.waitForSelector(sel + ', .empty-state')
	await page.waitForFunction(() => !document.body.textContent.includes('Loading'))
	await page.waitForFunction(() => {
		const h = location.hash
		if (window.__h === h) window.__n = (window.__n ?? 0) + 1
		else { window.__h = h; window.__n = 0 }
		return window.__n >= 3
	}, null, { polling: 60 })
}
const tab = async name => { await page.getByRole('tab', { name, exact: true }).click() }
let fails = 0
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want)
	if (!ok) fails++
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`)
}
const FILTER = `vendor=${v.id}&status=Delivered`

console.log('\n--- All orders: filter survives leaving and coming back ---')
await page.goto(`${BASE}/#/orders/all?${FILTER}`); await settle('.order-row')
const baseRows = await count('.order-row')
check('filtered arrival', [hash(), await chips(), await err()], [`/orders/all?${FILTER}`, ['Delivered', 'Vendor: Bilka'], 0])

await page.locator('.order-row').first().click(); await settle('#page-title')
await page.locator('[aria-label^="Back to"]').click(); await settle('#page-title')
console.log('   (in-app Back lands on', hash() + ')')
await tab('All orders'); await settle('.order-row')
check('back via sub-tab', [hash(), await chips(), await count('.order-row')], [`/orders/all?${FILTER}`, ['Delivered', 'Vendor: Bilka'], baseRows])

console.log('\n--- a link with its own filters still wins ---')
await page.goto(`${BASE}/#/orders/all?status=Returned`); await settle('.order-row')
check('deep link overrides memory', [hash(), await chips()], ['/orders/all?status=Returned', ['Returned']])

console.log('\n--- CLEAR ALL stays cleared ---')
await page.goto(`${BASE}/#/orders/all?${FILTER}`); await settle('.order-row')
await page.getByText('CLEAR ALL').click(); await settle('.order-row')
check('after CLEAR ALL', [hash(), await chips()], ['/orders/all', []])
await tab('Overview'); await settle('#page-title')
await tab('All orders'); await settle('.order-row')
check('round trip after CLEAR ALL', [hash(), await chips()], ['/orders/all', []])

console.log('\n--- All orders: page number survives too ---')
await page.goto(`${BASE}/#/orders/all?page=2`); await settle('.order-row')
await tab('Overview'); await settle('#page-title')
await tab('All orders'); await settle('.order-row')
check('page 2 restored', hash(), '/orders/all?page=2')

for (const [label, path, tabName, field, sel] of [
	['All vendors', '/vendors/all', 'All vendors', 'Search vendors', '.entity-row'],
	['All categories', '/categories/all', 'All categories', 'Search categories', '.entity-row']
]) {
	console.log(`\n--- ${label}: keyword + sort + page ---`)
	await page.goto(`${BASE}/#${path}`); await settle(sel)
	await page.locator(`input[aria-label="${field}"]`).fill('a')
	await page.waitForFunction(() => location.hash.includes('q=a'))
	await page.getByRole('combobox').last().click()
	await page.getByRole('option', { name: /Saved, highest/ }).click()
	await settle(sel)
	const want = hash(), narrowed = await count(sel)
	check(`${label} keyword+sort in the URL`, [want.includes('q=a'), want.includes('sort=saved-desc'), await err()], [true, true, 0])
	await tab('Overview'); await settle('#page-title')
	await tab(tabName); await settle(sel)
	check(`${label} round trip`, [hash(), await page.locator(`input[aria-label="${field}"]`).inputValue(), await count(sel)], [want, 'a', narrowed])
}

console.log('\n--- a second tab starts clean ---')
/* Same context, so the same signed-in account -- a second tab, which is its own
   sessionStorage. It must not inherit the first tab's filters. */
const p2 = await ctx.newPage(); p2.setDefaultTimeout(2000)
await p2.goto(`${BASE}/#/orders/all`)
await p2.waitForSelector('.order-row, .empty-state')
await p2.waitForTimeout(400)
check('second tab starts clean', decodeURIComponent(p2.url().split('#')[1] ?? ''), '/orders/all')
await p2.goto(`${BASE}/#/orders/all?${FILTER}`)
await p2.waitForSelector('.order-row')
await p2.waitForTimeout(300)
await tab('Overview'); await settle('#page-title')
await tab('All categories'); await settle('.entity-row')
check('tab one keeps its own', hash(), '/categories/all?q=a&sort=saved-desc')

console.log(`\n${fails ? fails + ' FAILED' : 'all checks passed'}`)
await browser.close()
process.exit(fails ? 1 : 0)
