/* Lighthouse against a served build, printed for a reader and written for the image to stamp.

   What this measures is the deployed shape: a built bundle served by the API process
   (api/src/app.js over react/dist, brotli negotiation and cache headers included), never the
   dev server -- Vite serves unminified modules one file per import, which is a different
   application and a meaningless score.

   Two runs, because the first one is the machine warming up: locally, run 1 and run 2 agreed
   closely (100/93/96 both runs, FCP 373ms then 381ms), and that agreement is the evidence the
   number is the build's rather than the moment's. The second run is the one reported -- and
   both are printed (and both kept in the stamp's own `runs`), so a spread that opens up is
   visible rather than averaged away.

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

const URL = process.argv[2] ?? 'http://localhost:4000/'
const OUT = process.argv.find(a => a.startsWith('--out='))?.slice(6)
const RUNS = 2

/* Floors, not targets. Set just under what the build scores today, so a real regression trips
   them and a one-point audit reshuffle in a Lighthouse upgrade does not. Raise them when the
   build clears a higher number twice in a row -- that is the point at which the higher number
   is a fact about the app rather than a hope. */
const FLOORS = { accessibility: 90, 'best-practices': 90 }

const { default: lighthouse } = await import('lighthouse').catch(() => {
	console.error('lighthouse is not installed here. `npm i --no-save lighthouse` first (see .github/workflows/ci.yml).')
	process.exit(2)
})
const { launch } = await import('chrome-launcher')
/* Lighthouse's own default profile is mobile: simulated slow-4G and a 4x CPU slowdown, the
   wrong lens on an app whose baseline is 1440x900 (the screenshot section of CLAUDE.md) and
   whose entry payload is genuinely small. Under that default, Home's logged-out FCP measured
   1550-1660ms off a real critical-path network chain of 52ms end to end -- a preset question,
   not a code one. desktop-config.js is Lighthouse's own answer to `--preset=desktop` on the
   CLI; importing it rather than hand-copying its throttling/emulation settings means an
   upgrade that changes what "desktop" means changes here too, automatically. */
const { default: desktopConfig } = await import('lighthouse/core/config/desktop-config.js')

const CHROME_FLAGS = ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage']
const chrome = await launch({ chromeFlags: CHROME_FLAGS, chromePath: process.env.CHROME_PATH || undefined })

const runs = []
try {
	for (let i = 0; i < RUNS; i++) {
		// Named rather than left to default to everything: Lighthouse adds categories between
		// versions (13.4 ships one for agentic browsing), and a run whose contents change on
		// upgrade costs time nobody asked for and reports numbers nothing here reads. SEO is
		// left out on the same grounds -- a sign-in-gated ledger has no crawler to rank it.
		const result = await lighthouse(URL, { port: chrome.port, output: 'json', logLevel: 'error' },
			{ ...desktopConfig, settings: { ...desktopConfig.settings, onlyCategories: ['performance', 'accessibility', 'best-practices'] } })
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
   dropping one is not. `runs` is every run this script actually made, cold one included: the
   file comment above says the first run is the machine warming up and only the second is
   reported, and that claim is worth being able to check against the numbers that backed it
   rather than trusting the prose. */
const toRun = r => ({
	scores: r.scores,
	firstContentfulPaintMs: Math.round(r.firstContentfulPaint),
	largestContentfulPaintMs: Math.round(r.largestContentfulPaint),
	totalBlockingTimeMs: Math.round(r.totalBlockingTime),
	formFactor: r.formFactor
})
const stamp = {
	performance: warm.scores.performance,
	accessibility: warm.scores.accessibility,
	bestPractices: warm.scores['best-practices'],
	firstContentfulPaintMs: Math.round(warm.firstContentfulPaint),
	largestContentfulPaintMs: Math.round(warm.largestContentfulPaint),
	totalBlockingTimeMs: Math.round(warm.totalBlockingTime),
	formFactor: warm.formFactor,
	lighthouse: version,
	runs: runs.map(toRun)
}
if (OUT) { writeFileSync(OUT, JSON.stringify(stamp)); console.log(`wrote ${OUT}`) }
else console.log(JSON.stringify(stamp))

const failed = Object.entries(FLOORS).filter(([key, floor]) => (warm.scores[key] ?? 100) < floor)
for (const [key, floor] of failed) console.error(`${key} ${warm.scores[key]} is below the floor of ${floor}`)
if (failed.length) process.exit(1)
console.log(`Performance ${warm.scores.performance} reported, not gated (a stopwatch on a shared runner).`)
