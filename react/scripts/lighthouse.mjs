/* Lighthouse against a served build, printed for a reader and written for the image to stamp.

   What this measures is the deployed shape: a built bundle served by the API process
   (api/src/app.js over react/dist, brotli negotiation and cache headers included), never the
   dev server -- Vite serves unminified modules one file per import, which is a different
   application and a meaningless score.

   Signed in, not the anonymous root: the app's own route loader calls GET /api/auth/me on
   every navigation and treats its 401 as "not signed in, redirect to /login" -- correct,
   deliberate behaviour (react/src/routes.jsx). Auditing the anonymous root used to mean
   Lighthouse's errors-in-console audit caught that 401 (Chrome logs any non-2xx network
   response to the console whether or not the page handles it) and scored best-practices 96
   for a browser log line that was never a bug. A throwaway account is registered against the
   served build before each run, filled with a year of demo orders at a fixed seed, and its
   session cookie is handed to the audited page -- so the run measures Home the way a real
   reader with a real ledger sees it, not an empty account's lightest-possible render, and a
   genuine console error now has nothing to hide behind either state.

   Two runs, because the first one is the machine warming up: locally, run 1 and run 2 agreed
   closely, and that agreement is the evidence the number is the build's rather than the
   moment's. The second run is the one reported -- both are printed, so a spread that opens up
   is visible rather than averaged away.

   Desktop, not Lighthouse's own mobile default: this app's baseline is 1440x900 and its entry
   payload is small, and the default profile's simulated slow-4G plus 4x CPU slowdown answered
   a question nobody was asking -- FCP read 1550-1660ms under it against a real network
   critical path of 52ms end to end. `formFactor` rides in the stamp precisely so a number is
   never read without knowing which profile produced it again.

   The gate is deliberately partial. Accessibility and best practices are rule checks -- the
   same DOM scores the same way on any machine -- so they hold a floor. Performance is a
   stopwatch on a shared CI runner: it moves with whatever else that runner is doing, so it is
   reported and never enforced. A gate that fails for reasons the change did not cause is a
   gate people learn to re-run rather than read. SEO is not run at all: the app is a personal
   ledger behind a sign-in, so there is no crawler to rank it and its score is a number
   nothing reads. */

import { writeFileSync } from 'node:fs'

const ORIGIN = new URL(process.argv[2] ?? 'http://localhost:4000/').origin
const OUT = process.argv.find(a => a.startsWith('--out='))?.slice(6)
const RUNS = 2
// Matches api/src/lib/cookies.js's SESSION_COOKIE. Not imported -- react/ and api/ are
// separate packages and nothing else here crosses that line -- so a rename on that side has
// to be echoed on this one.
const SESSION_COOKIE = 'spendly_session'

/* Floors, not targets. Set just under what the build scores today, so a real regression trips
   them and a one-point audit reshuffle in a Lighthouse upgrade does not. Raise them when the
   build clears a higher number twice in a row -- that is the point at which the higher number
   is a fact about the app rather than a hope. */
const FLOORS = { accessibility: 95, 'best-practices': 95 }

const { default: lighthouse } = await import('lighthouse').catch(() => {
	console.error('lighthouse is not installed here. `npm i --no-save lighthouse` first (see .github/workflows/ci.yml).')
	process.exit(2)
})
/* Lighthouse's own default profile is mobile: simulated slow-4G and a 4x CPU slowdown, the
   wrong lens on an app whose baseline is 1440x900 (the screenshot section of CLAUDE.md) and
   whose entry payload is genuinely small. Under that default, Home's logged-out FCP measured
   1550-1660ms off a real critical-path network chain of 52ms end to end -- a preset question,
   not a code one. desktop-config.js is Lighthouse's own answer to `--preset=desktop` on the
   CLI; importing it rather than hand-copying its throttling/emulation settings means an
   upgrade that changes what "desktop" means changes here too, automatically. */
const { default: desktopConfig } = await import('lighthouse/core/config/desktop-config.js')
// chrome-launcher is what actually finds a Chrome binary: on a bare `npm i --no-save
// lighthouse`, with no CHROME_PATH set, it searches the OS's standard install locations and
// is what let this script's older, port-only invocation work unmodified on both a workstation
// and a GitHub-hosted runner. puppeteer-core has no such search -- launching through it
// directly demands an explicit executablePath/channel and throws without one, which is what
// broke CI here. So chrome-launcher still does the launching; puppeteer-core only connects to
// the instance it already found, which is the minimum needed to open a page and set a cookie
// on it before Lighthouse navigates.
const { launch } = await import('chrome-launcher')
const { default: puppeteer } = await import('puppeteer-core')

// A throwaway account, registered fresh against the build under test, so the run measures a
// signed-in reader's Home rather than the anonymous root.
const email = `lighthouse-${Math.round(performance.now() * 1000)}@example.invalid`
const registerRes = await fetch(`${ORIGIN}/api/auth/register`, {
	method: 'POST', headers: { 'content-type': 'application/json' },
	body: JSON.stringify({ email, password: 'lighthouse-probe-account' })
})
if (!registerRes.ok) {
	console.error(`could not register a throwaway account for the run: ${registerRes.status} ${await registerRes.text()}`)
	process.exit(2)
}
const { token } = await registerRes.json()

// A brand-new ledger renders Home's empty state, which is lighter than what most signed-in
// readers actually see -- no chart, no card rows, none of the data-shaped work the page
// exists to do. Filled with a year of demo orders instead, at a fixed seed so this run's
// dataset -- and so its FCP/LCP -- is the same on every invocation and a real regression
// isn't lost in a fixture that reshuffles itself every time.
const demoRes = await fetch(`${ORIGIN}/api/demo-data`, {
	method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
	body: JSON.stringify({ seed: 424242 })
})
if (!demoRes.ok) {
	console.error(`could not fill the throwaway account with demo data: ${demoRes.status} ${await demoRes.text()}`)
	process.exit(2)
}

const chrome = await launch({
	chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
	chromePath: process.env.CHROME_PATH || undefined
})
const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` })

const runs = []
try {
	for (let i = 0; i < RUNS; i++) {
		const page = await browser.newPage()
		await page.setCookie({ name: SESSION_COOKIE, value: token, url: ORIGIN })
		// Named rather than left to default to everything: Lighthouse adds categories between
		// versions (13.4 ships one for agentic browsing), and a run whose contents change on
		// upgrade costs time nobody asked for and reports numbers nothing here reads. SEO is
		// left out on the same grounds -- a sign-in-gated ledger has no crawler to rank it.
		const result = await lighthouse(`${ORIGIN}/#/`, { output: 'json', logLevel: 'error' },
			{ ...desktopConfig, settings: { ...desktopConfig.settings, onlyCategories: ['performance', 'accessibility', 'best-practices'] } },
			page)
		await page.close()
		const scores = Object.fromEntries(Object.entries(result.lhr.categories)
			.map(([key, category]) => [key, Math.round(category.score * 100)]))
		runs.push({
			scores,
			firstContentfulPaint: result.lhr.audits['first-contentful-paint'].numericValue,
			largestContentfulPaint: result.lhr.audits['largest-contentful-paint'].numericValue,
			totalBlockingTime: result.lhr.audits['total-blocking-time'].numericValue,
			formFactor: result.lhr.configSettings.formFactor
		})
	}
} finally {
	// browser.disconnect() rather than browser.close(): this puppeteer instance only connected
	// to chrome-launcher's Chrome, it didn't launch it, and close() on a connected browser can
	// still race chrome-launcher's own idea of whether the process is alive. chrome.kill() is
	// the one call that owns the process and is guaranteed to end it.
	browser.disconnect()
	await chrome.kill()
}

for (const [i, run] of runs.entries())
	console.log(`run ${i + 1}: ${Object.entries(run.scores).map(([k, v]) => `${k} ${v}`).join('  ')}`
		+ `  |  FCP ${Math.round(run.firstContentfulPaint)}ms  LCP ${Math.round(run.largestContentfulPaint)}ms`
		+ `  TBT ${Math.round(run.totalBlockingTime)}ms`)

const warm = runs[runs.length - 1]
/* The shape the image carries and /api/version answers with: whole numbers, plus the version
   of Lighthouse that produced them -- a score is only comparable against the same scorer, and
   an upgrade that moves every number is a fact the reader needs in order not to read it as a
   regression in the app. formFactor is the same idea one setting over: mobile's simulated
   throttling reads FCP in the seconds for a payload desktop reads in the hundreds of
   milliseconds, off the same build, so a number with no profile named on it is not yet a
   number that can be compared to anything. */
const { version } = await import('lighthouse/package.json', { with: { type: 'json' } })
	.then(m => m.default).catch(() => ({ version: null }))
/* The flat fields are the warm run, kept exactly as Shell.jsx's build-quality callout already
   reads them (react/src/components/Shell.jsx) -- adding fields here is safe, renaming or
   dropping one is not. Only the warm run is stamped: the cold run's job is to be compared
   against it in the console output above, not to be carried in the image. */
const stamp = {
	performance: warm.scores.performance,
	accessibility: warm.scores.accessibility,
	bestPractices: warm.scores['best-practices'],
	firstContentfulPaintMs: Math.round(warm.firstContentfulPaint),
	largestContentfulPaintMs: Math.round(warm.largestContentfulPaint),
	totalBlockingTimeMs: Math.round(warm.totalBlockingTime),
	formFactor: warm.formFactor,
	lighthouse: version,
	// When this run happened, not when the image was built -- the two usually coincide (the
	// image build is what invokes this script) but don't have to (a stamp re-measured against a
	// build that already exists). Same shape as builtAt (Dockerfile's `date -u
	// +%Y-%m-%dT%H:%M:%SZ`), seconds only, so the two read the same way side by side.
	// /api/version answers it as-is for a reader checking the score isn't stale; Shell.jsx's
	// build-quality callout only destructures the fields above, so an added field here is safe
	// and stays out of the UI on its own.
	testedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}
if (OUT) { writeFileSync(OUT, JSON.stringify(stamp)); console.log(`wrote ${OUT}`) }
else console.log(JSON.stringify(stamp))

const failed = Object.entries(FLOORS).filter(([key, floor]) => (warm.scores[key] ?? 100) < floor)
for (const [key, floor] of failed) console.error(`${key} ${warm.scores[key]} is below the floor of ${floor}`)
if (failed.length) process.exit(1)
console.log(`Performance ${warm.scores.performance} reported, not gated (a stopwatch on a shared runner).`)
