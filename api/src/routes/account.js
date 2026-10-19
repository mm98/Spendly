import { Router } from 'express'
import http from 'node:http'
import https from 'node:https'
import { Worker } from 'node:worker_threads'
import { db } from '../db.js'

const FILL_WORKER = new URL('../lib/demoFill.worker.js', import.meta.url)

export const router = Router()

/* The demo fill rewrites a whole ledger in one request, which dates the planner statistics
   db.js gathered at boot: statistics taken over an empty account say every table is tiny, and
   plans made from those over the 50,000 orders a fill just wrote pick the wrong index the same
   way no statistics did. Re-gathered here, after the fill commits -- ~90ms at 50,000
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

	/* Always a worker, so a fill never holds up other requests. ?progress=stream answers NDJSON
	   {done, total} lines, then the result or an {error} with `landed`; without it, that last line alone. */
	const streaming = req.query.progress === 'stream'
	if (streaming) {
		res.status(200).set({ 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' })
		res.flushHeaders()
	}
	const worker = new Worker(FILL_WORKER, { workerData: { userId: req.user.id, ...options } })
	let ended = false, landed = null
	const end = line => {
		if (ended) return
		ended = true
		if (streaming) res.end(JSON.stringify(line) + '\n')
		else res.status(line.error ? 500 : 200).json(line)
	}
	const failed = () => {
		if (ended) return
		if (landed == null) return end({ error: 'The demo data could not be written. Nothing was changed.' })
		refreshStatistics()
		end({ error: 'The demo data stopped partway.', landed })
	}
	worker.on('message', message => {
		if ('landed' in message) landed = message.landed
		else if ('done' in message) { if (streaming) res.write(JSON.stringify(message) + '\n') }
		else if (message.result) { refreshStatistics(); end({ ...message.result, seed }) }
		else failed()
	})
	worker.on('error', failed)
	worker.on('exit', failed)
})

/* Update and reload (11d): the updater beside this container (SPENDLY_UPDATER_URL, docker-compose.yml) swaps
   it, stopping this process. Asked with ?async=true it answers at once; one that ignores that holds its answer
   until the swap, so silence after the request reached it means it has the job. A connection that never
   opened is a failure, never a start. */
const UPDATER_CONNECT_MS = 5000
const UPDATER_ANSWER_MS = 3000

export const updaterAvailable = () => /^https?:\/\//.test(process.env.SPENDLY_UPDATER_URL ?? '')

// ids are random, so the first account is found by when it was made
const selectFirstUserId = db.prepare('SELECT id FROM users ORDER BY created_at, rowid LIMIT 1')

/** The one account that may install an update: SPENDLY_OWNER_EMAIL's, or else the first account on this server. */
export function ownsServer(user) {
	if (!user) return false
	const owner = process.env.SPENDLY_OWNER_EMAIL?.trim().toLowerCase()
	return owner ? user.email === owner : user.id === selectFirstUserId.get()?.id
}

/** Resolves to { status } (a number, or 'busy' once it holds its answer) or { error } when it can't be reached. */
function askUpdater(url) {
	const secure = url.protocol === 'https:'
	const token = process.env.SPENDLY_UPDATER_TOKEN
	return new Promise(settle => {
		let timer = null
		let settled = false
		const end = outcome => {
			if (settled) return
			settled = true
			clearTimeout(timer)
			settle(outcome)
		}
		// watchtower's update API answers 405 to anything but POST; no agent, so every ask opens its own socket and 'connect' fires
		const ask = (secure ? https : http).request(url, {
			method: 'POST',
			agent: false,
			headers: token ? { Authorization: `Bearer ${token}` } : {}
		}, answer => {
			answer.resume()
			end({ status: answer.statusCode })
		})
		timer = setTimeout(() => {
			end({ error: `no connection after ${UPDATER_CONNECT_MS / 1000} seconds` })
			ask.destroy()
		}, UPDATER_CONNECT_MS)
		ask.on('socket', socket => socket.once(secure ? 'secureConnect' : 'connect', () => {
			clearTimeout(timer)
			timer = setTimeout(() => end({ status: 'busy' }), UPDATER_ANSWER_MS)
		}))
		ask.on('error', e => end({ error: e.message }))
		ask.end()
	})
}

router.post('/version/update', async (req, res) => {
	if (!updaterAvailable()) return res.status(409).json({ error: 'This copy of Spendly cannot install an update by itself.' })
	if (!ownsServer(req.user)) return res.status(403).json({ error: 'Only the person who manages this Spendly can install an update.' })
	const url = new URL(process.env.SPENDLY_UPDATER_URL)
	url.searchParams.set('async', 'true')
	const answer = await askUpdater(url)
	if (answer.status === 'busy' || (answer.status >= 200 && answer.status < 300)) return res.status(202).json({ started: true })
	console.error(answer.error
		? `The updater at ${url.host} could not be reached (${answer.error}). Check SPENDLY_UPDATER_URL.`
		: `The updater at ${url.host} refused the update with status ${answer.status}.`
			+ (answer.status === 401 ? ' SPENDLY_UPDATER_TOKEN must match WATCHTOWER_HTTP_API_TOKEN.' : '')
			+ (answer.status === 429 ? ' Another update was already running.' : ''))
	res.status(502).json({ error: 'The update could not be started.' })
})
