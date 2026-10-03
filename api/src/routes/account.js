import { Router } from 'express'
import { Worker } from 'node:worker_threads'
import { db } from '../db.js'
import { replaceWithDemo } from '../lib/demoFill.js'

const FILL_WORKER = new URL('../lib/demoFill.worker.js', import.meta.url)

export const router = Router()

/* The demo fill rewrites a whole ledger in one request, which dates the planner statistics
   db.js gathered at boot: statistics taken over an empty account say every table is tiny, and
   plans made from those over the 50,000 orders a fill just wrote pick the wrong index the same
   way no statistics did. Re-gathered here, after the transaction commits -- ~90ms at 50,000
   orders under the analysis_limit db.js sets, on requests that already spend seconds writing. */
const refreshStatistics = () => db.exec('ANALYZE')

/* A different year every time it is pressed.

   populateDemoData is deterministic for a given (seed, today) and stays that way -- that is
   what lets one harness run be compared against another instead of eyeballed. The constant was
   in the wrong place: it sat on the generator as a default, so the *only* caller, this button,
   could never produce anything else. Pressed twice it wiped a year and wrote back the same
   year -- same order counts, same days, same vendors -- which reads as a button that did
   nothing, and is the one thing "fill with demo data" must not look like.

   So the seed is chosen here, at random, and passed. A caller may pin the seed for
   reproducibility: `{"seed": 424242}` reproduces any dataset exactly, which is what a harness
   comparing two runs asks for and what a bug report can carry. */
router.post('/demo-data', (req, res) => {
	const asked = Number(req.body?.seed)
	const seed = Number.isFinite(asked) && asked > 0 ? Math.floor(asked)
		: 1 + Math.floor(Math.random() * 0x7ffffffe)
	/* How many orders the year lands on. Optional -- left off, the generator rolls each
	   month's count as it always has. Capped so a stray body cannot ask for a ledger the
	   database spends minutes writing; 50,000 is the largest the UI offers. */
	const askedOrders = Number(req.body?.orders)
	const orders = Number.isFinite(askedOrders) && askedOrders > 0
		? Math.min(50000, Math.floor(askedOrders)) : undefined
	/* How far back the ledger reaches, in months, ending today. Capped at the UI's largest
	   offer (24 years) for the same reason as the order count above. */
	const askedMonths = Number(req.body?.months)
	const months = Number.isFinite(askedMonths) && askedMonths > 0
		? Math.min(288, Math.floor(askedMonths)) : undefined
	const options = { seed, orders, months, today: req.today }
	if (req.query.progress !== 'stream') {
		const result = replaceWithDemo(req.user.id, options)
		refreshStatistics()
		return res.json({ ...result, seed })
	}

	/* ?progress=stream answers NDJSON: a {done, total} line as orders are written, closed by
	   the result or an {error}. The fill runs on a worker so this process can send the lines. */
	res.status(200).set({ 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' })
	res.flushHeaders()
	const worker = new Worker(FILL_WORKER, { workerData: { userId: req.user.id, ...options } })
	let ended = false
	const end = line => {
		if (ended) return
		ended = true
		res.end(JSON.stringify(line) + '\n')
	}
	worker.on('message', message => {
		if ('done' in message) res.write(JSON.stringify(message) + '\n')
		else if (message.result) { refreshStatistics(); end({ ...message.result, seed }) }
		else end({ error: 'The demo data could not be written. Nothing was changed.' })
	})
	worker.on('error', () => end({ error: 'The demo data could not be written. Nothing was changed.' }))
	worker.on('exit', () => end({ error: 'The demo data could not be written. Nothing was changed.' }))
})

/* Update and reload (11d): the updater beside this container (SPENDLY_UPDATER_URL, docker-compose.yml) swaps
   it, stopping this process, so an updater still busy after a moment has taken the job. */
const UPDATER_ANSWER_MS = 3000

export const updaterAvailable = () => /^https?:\/\//.test(process.env.SPENDLY_UPDATER_URL ?? '')

router.post('/version/update', async (req, res) => {
	if (!updaterAvailable()) return res.status(409).json({ error: 'This copy of Spendly cannot install an update by itself.' })
	const asked = fetch(process.env.SPENDLY_UPDATER_URL, {
		headers: process.env.SPENDLY_UPDATER_TOKEN ? { Authorization: `Bearer ${process.env.SPENDLY_UPDATER_TOKEN}` } : {}
	})
	const answer = await Promise.race([asked.then(r => r, e => e), new Promise(done => setTimeout(() => done(null), UPDATER_ANSWER_MS))])
	asked.catch(() => {})
	if (answer instanceof Error || (answer && !answer.ok)) {
		console.error('The updater refused or could not be reached:', answer instanceof Error ? answer.message : answer.status)
		return res.status(502).json({ error: 'The update could not be started.' })
	}
	res.status(202).json({ started: true })
})
