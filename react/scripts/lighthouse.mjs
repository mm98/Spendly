/* Lighthouse against a served build, printed for a reader and written for the image to stamp.

   What this measures is the deployed shape: a built bundle served by the API process
   (api/src/app.js over react/dist, brotli negotiation and cache headers included), never the
   dev server -- Vite serves unminified modules one file per import, which is a different
   application and a meaningless score.

   Two runs, because the first one is the machine warming up: locally, run 1 and run 2 agreed
   exactly (99/93/96/90, FCP 1.6s then 1.7s), and that agreement is the evidence the number is
   the build's rather than the moment's. The second run is the one reported -- and both are
   printed, so a spread that opens up is visible rather than averaged away.

   The gate is deliberately partial. Accessibility, best practices and SEO are rule checks --
   the same DOM scores the same way on any machine -- so they hold a floor. Performance is a
   stopwatch on a shared CI runner: it moves with whatever else that runner is doing, so it is
   reported and never enforced. A gate that fails for reasons the change did not cause is a
   gate people learn to re-run rather than read. */

import { writeFileSync } from 'node:fs'

const URL = process.argv[2] ?? 'http://localhost:4000/'
const OUT = process.argv.find(a => a.startsWith('--out='))?.slice(6)
const RUNS = 2

/* Floors, not targets. Set just under what the build scores today, so a real regression trips
   them and a one-point audit reshuffle in a Lighthouse upgrade does not. Raise them when the
   build clears a higher number twice in a row -- that is the point at which the higher number
   is a fact about the app rather than a hope. */
const FLOORS = { accessibility: 90, 'best-practices': 90, seo: 85 }

const { default: lighthouse } = await import('lighthouse').catch(() => {
	console.error('lighthouse is not installed here. `npm i --no-save lighthouse` first (see .github/workflows/ci.yml).')
	process.exit(2)
})
const { launch } = await import('chrome-launcher')

const CHROME_FLAGS = ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage']
const chrome = await launch({ chromeFlags: CHROME_FLAGS, chromePath: process.env.CHROME_PATH || undefined })

const runs = []
try {
	for (let i = 0; i < RUNS; i++) {
		// Named rather than left to default to everything: Lighthouse adds categories between
		// versions (13.4 ships one for agentic browsing), and a run whose contents change on
		// upgrade costs time nobody asked for and reports numbers nothing here reads.
		const result = await lighthouse(URL, { port: chrome.port, output: 'json', logLevel: 'error' },
			{ extends: 'lighthouse:default', settings: { onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] } })
		const scores = Object.fromEntries(Object.entries(result.lhr.categories)
			.map(([key, category]) => [key, Math.round(category.score * 100)]))
		runs.push({
			scores,
			firstContentfulPaint: result.lhr.audits['first-contentful-paint'].numericValue,
			largestContentfulPaint: result.lhr.audits['largest-contentful-paint'].numericValue,
			totalBlockingTime: result.lhr.audits['total-blocking-time'].numericValue
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
   regression in the app. */
const { version } = await import('lighthouse/package.json', { with: { type: 'json' } })
	.then(m => m.default).catch(() => ({ version: null }))
const stamp = {
	performance: warm.scores.performance,
	accessibility: warm.scores.accessibility,
	bestPractices: warm.scores['best-practices'],
	seo: warm.scores.seo,
	firstContentfulPaintMs: Math.round(warm.firstContentfulPaint),
	largestContentfulPaintMs: Math.round(warm.largestContentfulPaint),
	lighthouse: version
}
if (OUT) { writeFileSync(OUT, JSON.stringify(stamp)); console.log(`wrote ${OUT}`) }
else console.log(JSON.stringify(stamp))

const failed = Object.entries(FLOORS).filter(([key, floor]) => (warm.scores[key] ?? 100) < floor)
for (const [key, floor] of failed) console.error(`${key} ${warm.scores[key]} is below the floor of ${floor}`)
if (failed.length) process.exit(1)
console.log(`Performance ${warm.scores.performance} reported, not gated (a stopwatch on a shared runner).`)
