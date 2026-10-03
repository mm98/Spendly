/* Renders the three docs/ screenshots from the running app, and diffs each render
   against a reference PNG in the same browser (a <canvas> decodes; no PNG library here).

   Needs the app up (npm run dev in react/, api/) and Playwright's chromium; a local
   playwright install is used if present, the global one otherwise.

   Usage: node regen-docs.mjs <outdir>          render into outdir and diff against docs/
          node regen-docs.mjs <outdir> <refdir> render into outdir and diff against refdir

   Render into a scratch dir first: the two dated shots differ from the committed ones by
   the whole dataset on any later day, so run once against docs/ to attribute that number
   to the calendar, render twice to see 0 run-to-run, and only then copy over docs/.

   States (settled in CLAUDE.md):
   - home.png        1440x900 dSF2, Home
   - all-orders.png  1440x900 dSF2, /orders?vendor=<Bilka>&status=Delivered&from=2026-08-01&to=2026-08-31,
                     the facet rail beside the list, the palette open with 'bil' typed. 3 matching.
   - phone.png       iPhone 15 descriptor, dSF overridden to 2, Home. 786x1318.
   Account: fresh, demo fill {seed: SEED, months: MONTHS, orders: 30} -- the dataset is a function of
   (seed, today), so the seed is re-picked on a render day to give the all-orders state its
   3 August Bilka Delivered matches, and the render refuses to shoot when it does not hold. */
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const pw = await import('playwright').catch(() =>
	import(`file://${execSync('npm root -g').toString().trim()}/playwright/index.mjs`))
const { chromium, devices } = pw

const BASE = 'http://localhost:5173'
/* The demo fill is a function of (seed, today), so a later render day picks its own seed: the
   one that puts three August Bilka deliveries in the account, which is the all-orders shot's
   state. Nothing else in the three shots depends on which seed it is. */
const SEED = 2
// the fill counts calendar months back from today, and the all-orders shot is filtered to August 2026
const MONTHS = Math.max(2, (new Date().getFullYear() - 2026) * 12 + new Date().getMonth() - 7 + 1)
const MATCHES = 3
const DOCS = new URL('../../docs', import.meta.url).pathname
const outdir = process.argv[2]
const refdir = process.argv[3] ?? DOCS
mkdirSync(outdir, { recursive: true })

const browser = await chromium.launch()

async function freshAccount(ctx) {
	// one fixed address: the sidebar's account mark is drawn from it, so a new one per run moves pixels
	const email = 'docs@example.com'
	let r = await ctx.request.post(BASE + '/api/auth/register', { data: { email, password: 'docs-pass-12345' } })
	if (r.status() !== 201) r = await ctx.request.post(BASE + '/api/auth/login', { data: { email, password: 'docs-pass-12345' } })
	if (!r.ok()) throw new Error('sign in ' + r.status())
	r = await ctx.request.post(BASE + '/api/demo-data', { data: { seed: SEED, months: MONTHS, orders: 30 } })
	if (!r.ok()) throw new Error('demo-data ' + r.status())
	console.log('demo-data:', await r.text())
	/* The list filters on `vendorId`. The page's own address spells the same filter `vendor`,
	   and a parameter the API does not read narrows nothing -- asked that way, this check
	   answers with every August delivery in the account, whatever vendor made it. */
	const vendors = await (await ctx.request.get(BASE + '/api/vendors')).json()
	const bilka = (vendors.vendors ?? vendors).find(v => v.name === 'Bilka')
	const check = await (await ctx.request.get(
		BASE + `/api/orders?vendorId=${bilka.id}&status=Delivered&from=2026-08-01&to=2026-08-31&limit=1`)).json()
	console.log('account check: august bilka delivered =', check.matched, 'of', check.total)
	if (check.matched !== MATCHES)
		throw new Error(`refusing to shoot: ${check.matched} august bilka deliveries, the shot's state is ${MATCHES}`)
}

async function settle(page) {
	await page.evaluate(() => document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0 }))
	await page.waitForFunction(() => {
		const d = [...document.querySelectorAll('svg path')].map(p => p.getAttribute('d')).join('|')
			+ '#' + [...document.querySelectorAll('*')].length
		if (window.__sig === d) window.__set = (window.__set ?? 0) + 1
		else { window.__set = 0; window.__sig = d }
		return window.__set >= 3
	}, null, { timeout: 8000, polling: 120 })
	await page.evaluate(() => document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0 }))
	if (await page.evaluate(() => document.body.textContent.includes('Loading')))
		throw new Error('refusing to shoot: "Loading" still on screen')
	// a probe leaves the page where it left it -- put scroll back where a fresh load has it
	await page.evaluate(() => window.scrollTo(0, 0))
}

async function shoot(page, file) {
	await settle(page)
	await page.screenshot({ path: join(outdir, file) })
}

/* Diff two PNGs inside the open page: canvas decodes both, getImageData compares. */
async function diff(page, file) {
	const a = readFileSync(join(outdir, file)).toString('base64')
	let b
	try { b = readFileSync(join(refdir, file)).toString('base64') } catch { return console.log(`${file}: no reference`) }
	const r = await page.evaluate(async ([a, b]) => {
		const load = src => new Promise((res, rej) => {
			const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/png;base64,' + src
		})
		const [ia, ib] = await Promise.all([load(a), load(b)])
		if (ia.width !== ib.width || ia.height !== ib.height)
			return { sizeMismatch: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` }
		const cv = document.createElement('canvas')
		cv.width = ia.width; cv.height = ia.height
		const cx = cv.getContext('2d', { willReadFrequently: true })
		cx.drawImage(ia, 0, 0); const da = cx.getImageData(0, 0, cv.width, cv.height).data
		cx.clearRect(0, 0, cv.width, cv.height)
		cx.drawImage(ib, 0, 0); const db = cx.getImageData(0, 0, cv.width, cv.height).data
		let n = 0
		for (let i = 0; i < da.length; i += 4)
			if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) n++
		return { differing: n, of: da.length / 4 }
	}, [a, b])
	console.log(`${file}:`, r.sizeMismatch ? 'SIZE MISMATCH ' + r.sizeMismatch : `${r.differing} differing of ${r.of}`)
}

/* Every date and time in the app is rendered by the reader's own locale and zone now, so a
   context that names neither documents whichever machine ran it: the same source renders
   "18 July" here and "July 18" on a box whose ICU default is en-US, with nothing in the
   diff to say which one moved. These two lines are what keep the committed shots a fact
   about the app. en-GB and Copenhagen because that is what the shots already hold -- the
   product's own home, and the day-first English the copy is written in. */
const READER = { locale: 'en-GB', timezoneId: 'Europe/Copenhagen' }

// -- desktop: home + all-orders --
const desktop = await browser.newContext({ ...READER, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await freshAccount(desktop)
const page = await desktop.newPage()
page.setDefaultTimeout(2000)
page.setDefaultNavigationTimeout(2000)

await page.goto(BASE + '/#/', { timeout: 15000 })
await page.waitForSelector('.sp-bars__col', { timeout: 5000 })
await shoot(page, 'home.png')

/* Vendor ids are generated per account now, so the id is read back from the API rather than
   hardcoded -- the committed shot's state is "filtered to Bilka", not any literal id. */
const vendors = await (await desktop.request.get(BASE + '/api/vendors')).json()
const bilka = vendors.find(v => v.name === 'Bilka').id
await page.goto(BASE + `/#/orders?vendor=${bilka}&status=Delivered&from=2026-08-01&to=2026-08-31`, { timeout: 15000 })
await page.waitForFunction(n => document.querySelectorAll('.sp-table tbody tr').length === n, MATCHES, { timeout: 5000 })
/* Typed keys upgrade a pointer focus to :focus-visible in Blink and the committed shot has
   no ring -- the palette opens from a click, and its field takes the text natively. */
await page.locator('.sp-topbar input[type=search]').click()
await page.waitForSelector('.sp-palette input', { timeout: 3000 })
await page.evaluate(() => {
	const el = document.querySelector('.sp-palette input')
	const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
	set.call(el, 'bil')
	el.dispatchEvent(new Event('input', { bubbles: true }))
})
await page.waitForSelector('.sp-palette mark', { timeout: 3000 })
await shoot(page, 'all-orders.png')

await diff(page, 'home.png')
await diff(page, 'all-orders.png')
await desktop.close()

// -- phone: home --
const phoneCtx = await browser.newContext({ ...devices['iPhone 15'], ...READER, deviceScaleFactor: 2 })
await freshAccount(phoneCtx)
const phone = await phoneCtx.newPage()
phone.setDefaultTimeout(2000)
phone.setDefaultNavigationTimeout(2000)
await phone.goto(BASE + '/#/', { timeout: 15000 })
await phone.waitForSelector('.sp-gauge', { timeout: 5000 })
await settle(phone)
await phone.screenshot({ path: join(outdir, 'phone.png') })
await diff(phone, 'phone.png')
await phoneCtx.close()

await browser.close()
