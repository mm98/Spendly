/* No page scrolls sideways, and the full-height pages (Ask) do not scroll at all: only their own
   scroll areas do. Every page of the app at every size below, against a running app.

   node scripts/check-page-scroll.mjs [origin]     origin defaults to http://localhost:5173

   It registers a throwaway account and fills it with demo data, so it runs against a scratch
   database. CHROME_PATH names the browser; without it the installed Chromium is used.
   Exits 1 on any page that scrolls, naming the page, the size and how far. */

import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const ORIGIN = new URL(process.argv[2] ?? 'http://localhost:5173/').origin
const pw = await import('playwright-core').catch(() => import('playwright')).catch(() =>
	import(`file://${execSync('npm root -g').toString().trim()}/playwright/index.mjs`))
const { chromium, devices } = pw.default ?? pw

const READER = { locale: 'en-GB', timezoneId: 'Europe/Copenhagen' }
const SIZES = [
	['phone', { ...devices['iPhone 15'], deviceScaleFactor: 2 }],
	...[[1024, 768], [1280, 720], [1440, 900], [1920, 1080], [2560, 1440], [3840, 2160]]
		.map(([width, height]) => [`${width}x${height}`, { viewport: { width, height } }])
]

// every path in src/routes.jsx, so a new page is either checked here or named as skipped
const PAGES = {
	'': '/', 'orders': '/orders', 'new': ['/orders/new', '/vendors/new', '/categories/new', '/bookmarks/new'],
	':id': '/orders/:order', ':id/edit': ['/orders/:order/edit', '/vendors/:vendor/edit', '/categories/:category/edit', '/bookmarks/:bookmark/edit'],
	':id/compare': '/orders/:order/compare', 'statistics': '/statistics', 'vendors': '/vendors', 'categories': '/categories',
	'bookmarks': '/bookmarks', 'budget/check': '/budget/check', 'budget/:year?': '/budget', 'ask': '/ask',
	'settings/:section?': ['/settings', ...[...readFileSync(new URL('../src/pages/Settings.jsx', import.meta.url), 'utf8')
		.matchAll(/^\t\{ key: '(\w+)', label:/gm)].map(m => `/settings/${m[1]}`)],
	'more': '/more', 'more/views': '/more/views', '*': '/no-such-page'
}
// outside the shell, and only for a reader who is signed out or holds a link from an email
const SKIPPED = ['signin', 'register', 'welcome', 'confirm', 'confirm/:token', 'reset', 'reset/:token', 'email/stop/:token', 'terms', 'privacy']

const routes = [...readFileSync(new URL('../src/routes.jsx', import.meta.url), 'utf8').matchAll(/path: '([^']*)'/g)].map(m => m[1])
const unlisted = routes.filter(r => !(r in PAGES) && !SKIPPED.includes(r))
if (unlisted.length) {
	console.error(`check-page-scroll: add these routes to PAGES or SKIPPED: ${unlisted.join(', ')}`)
	process.exit(1)
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH }
	: { executablePath: '/opt/pw-browsers/chromium' })
const setup = await browser.newContext()
const email = `page-scroll-${Date.now()}@example.invalid`
const signUp = await setup.request.post(`${ORIGIN}/api/auth/register`, { data: { email, password: 'page-scroll-pass-12345' } })
if (!signUp.ok()) throw new Error(`register: ${signUp.status()} ${await signUp.text()}`)
if (!(await setup.request.post(`${ORIGIN}/api/demo-data`, { data: { seed: 1 } })).ok()) throw new Error('demo data failed')
await setup.request.post(`${ORIGIN}/api/account/setup-done`)
const firstId = async kind => (await (await setup.request.get(`${ORIGIN}/api/${kind}s?pageSize=1`)).json())[`${kind}s`][0].id
const ids = { order: await firstId('order'), vendor: await firstId('vendor'), category: await firstId('categorie'), bookmark: await firstId('bookmark') }
const storageState = await setup.storageState()
await setup.close()

const paths = Object.values(PAGES).flat().map(p => p.replace(/:(\w+)/g, (_, kind) => ids[kind]))
let failed = 0
for (const [size, device] of SIZES) {
	const ctx = await browser.newContext({ ...device, ...READER, storageState })
	ctx.setDefaultTimeout(10000)
	const page = await ctx.newPage()
	for (const path of paths) {
		// a change of hash alone does not load the page, and the old page would be measured
		await page.goto('about:blank')
		await page.goto(`${ORIGIN}/#${path}`)
		await page.waitForLoadState('networkidle')
		await page.waitForFunction(() => document.querySelector('.sp-shell__page') && !document.querySelector('.sp-skeleton, [aria-busy="true"]'))
		const scroll = await page.evaluate(() => {
			const el = document.scrollingElement
			return { sideways: el.scrollWidth - el.clientWidth, down: el.scrollHeight - el.clientHeight, fill: !!document.querySelector('.sp-shell__body--fill') }
		})
		const faults = [scroll.sideways > 0 && `scrolls ${scroll.sideways}px sideways`, scroll.fill && scroll.down > 0 && `scrolls ${scroll.down}px down`].filter(Boolean)
		if (faults.length) { failed++; console.error(`FAIL ${size} ${path}: ${faults.join(', ')}`) }
	}
	await ctx.close()
}
await browser.close()
console.log(failed ? `${failed} page${failed === 1 ? '' : 's'} scroll` : `no page scrolls: ${paths.length} pages at ${SIZES.length} sizes`)
process.exit(failed ? 1 : 0)
