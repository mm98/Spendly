import express from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { router as authRouter } from './routes/auth.js'
import { router as vendorsRouter } from './routes/vendors.js'
import { router as categoriesRouter } from './routes/categories.js'
import { router as ordersRouter } from './routes/orders.js'
import { router as settingsRouter } from './routes/settings.js'
import { router as dashboardCardsRouter } from './routes/dashboardCards.js'
import { router as accountRouter } from './routes/account.js'
import { router as statsRouter } from './routes/stats.js'
import { router as homeRouter } from './routes/home.js'
import { router as scanRouter } from './routes/scan.js'
import { router as searchRouter } from './routes/search.js'
import { requireAuth } from './lib/auth.js'
import { readCache } from './lib/readCache.js'

export const app = express()

// The bulk-import route carries base64-encoded receipt images, so it gets a raised body limit
// of its own rather than opening every route to arbitrarily large request bodies. A single
// picked-per-request parser (rather than mounting two express.json()s in sequence) keeps each
// request body read exactly once.
const smallJson = express.json()
const importJson = express.json({ limit: '50mb' })
app.use((req, res, next) => (req.path === '/api/orders/import' ? importJson : smallJson)(req, res, next))

// Debug request log, off unless asked for (node src/server.js --debug, or DEBUG=1) -- one line
// per request, written when the response finishes so it can carry the status and timing, but
// stamped with the request's arrival time the way an access log is. The JSON body rides along
// (after the parser above, so req.body is already the parsed object, not the raw stream), and
// the method is padded to the width of the longest one (OPTIONS, 7) so the URLs, statuses and
// timings line up in columns. Password is the one field worth hiding -- both auth routes carry
// it in plain text, and a debug log is still a log a terminal keeps scrollback of. Registered
// only when on, rather than checked every request, so a normal run pays nothing.
if (process.argv.includes('--debug') || process.env.DEBUG) {
	const REDACT_KEYS = ['password']
	const redacted = body => JSON.stringify(body, (key, value) => REDACT_KEYS.includes(key) ? '***' : value)
	app.use((req, res, next) => {
		const arrived = new Date()
		const body = req.is('application/json') && req.body && Object.keys(req.body).length ? ' ' + redacted(req.body) : ''
		res.on('finish', () => {
			console.log(`${arrived.toISOString()} ${req.method.padEnd(7)} ${req.originalUrl} ${res.statusCode} (${Date.now() - arrived}ms)${body}`)
		})
		next()
	})
}

app.get('/api/health', (req, res) => res.json({ ok: true }))

/* Which build is running: the image's build time and commit, stamped at build time
   (Dockerfile ARG -> ENV) so the Settings page can print them and a reader can compare the
   commit against the newest one on GitHub. Outside the image both are null -- a dev server
   has no build to be out of date. Above the auth gate like /api/health: whether the
   container is current is a fact about the deployment, not about any account. */
app.get('/api/version', (req, res) => res.json({
	builtAt: process.env.SPENDLY_BUILD_TIME || null,
	commit: process.env.SPENDLY_BUILD_SHA || null
}))

/* Whether the newest published image is this one, asked of GHCR itself rather than of the
   repository: the newest commit on main may not have finished building yet, and "pull and
   restart" only ever gets what the registry holds. CI tags every push with `latest` and with
   the full commit sha, so the question reduces to two manifest digests -- the one behind
   `latest` against the one behind this container's own commit tag -- read from the
   Docker-Content-Digest header of a HEAD request. Digests rather than the image config's
   env stamp on purpose: the config is a blob, blobs redirect to a storage CDN on a second
   host, and a comparison that stays on the registry keeps working where egress is narrow. */
const IMAGE = process.env.SPENDLY_IMAGE || 'ghcr.io/mm98/spendly'
const MANIFEST_TYPES = [
	'application/vnd.oci.image.index.v1+json',
	'application/vnd.docker.distribution.manifest.list.v2+json',
	'application/vnd.oci.image.manifest.v1+json',
	'application/vnd.docker.distribution.manifest.v2+json'
].join(', ')

async function publishedDigests(commit) {
	const [registry, ...rest] = IMAGE.split('/')
	const repo = rest.join('/')
	// One deadline for the whole lookup, not per request: the caller is a button press, and
	// three slow hops behind it should fail as one slow check, not three patient ones.
	const signal = AbortSignal.timeout(10_000)
	const tokenRes = await fetch(`https://${registry}/token?service=${registry}&scope=repository:${repo}:pull`, { signal })
	if (!tokenRes.ok) throw new Error(`token endpoint answered ${tokenRes.status}`)
	const { token } = await tokenRes.json()
	const digestOf = async tag => {
		const r = await fetch(`https://${registry}/v2/${repo}/manifests/${tag}`, {
			method: 'HEAD', signal, headers: { Authorization: `Bearer ${token}`, Accept: MANIFEST_TYPES }
		})
		if (r.status === 404) return null
		if (!r.ok) throw new Error(`manifest for ${tag === 'latest' ? tag : 'this commit'} answered ${r.status}`)
		return r.headers.get('docker-content-digest')
	}
	const [latest, mine] = await Promise.all([digestOf('latest'), digestOf(commit)])
	if (!latest) throw new Error('the registry holds no `latest` tag')
	return { latest, mine }
}

/* Above the auth gate beside /api/version for the same reason it is: whether the container
   is current is a fact about the deployment. Nothing here takes caller input -- the image
   name and commit are the server's own configuration -- and nothing is cached: a check is a
   question about right now, asked by one button press at a time. */
app.get('/api/version/check', async (req, res) => {
	const commit = process.env.SPENDLY_BUILD_SHA || null
	if (!commit) return res.status(409).json({ error: 'No build stamp: this server is not running from the Docker image.' })
	try {
		const { latest, mine } = await publishedDigests(commit)
		/* `published: false` is its own fact, not a flavour of "behind": a locally built
		   image whose commit was never pushed to the registry cannot be compared, and
		   calling it out of date would send someone pulling for an update that is not one. */
		res.json({ current: mine !== null && mine === latest, published: mine !== null, commit })
	} catch (e) {
		res.status(502).json({ error: `Could not read the registry at ${IMAGE.split('/')[0]}: ${e.message ?? e}` })
	}
})

app.use('/api/auth', authRouter)

/* One auth gate for every data route, rather than requireAuth repeated per mount: the session
   lookup runs once per request this way, and readCache (which needs req.user) sits behind it
   in the same line. Anything meant to be reachable *without* auth (like /api/health) has to
   be registered above this line, and /api/auth handles its own routes before the gate is
   reached. */
app.use('/api', requireAuth, readCache)

app.use('/api/vendors', vendorsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/dashboard-cards', dashboardCardsRouter)
/* accountRouter only defines POST /reset, but it's mounted at the bare /api prefix (the route
   itself, /api/reset, needs the full path) — every route above is registered first, so this
   still can't shadow any of them. */
app.use('/api', accountRouter)
app.use('/api/stats', statsRouter)
app.use('/api/home', homeRouter)
app.use('/api/scan', scanRouter)
app.use('/api/search', searchRouter)

/* react/'s own dev server (Vite) serves the app locally, proxying /api to this process --
   nothing here needs to serve HTML in that mode, and CLIENT_DIST simply won't exist. A
   deploy that builds react/dist first (see render.yaml) is the one case this matters: same
   process, same origin, so the session cookie set by /api/auth is a first-party cookie
   rather than a cross-site one a browser might refuse. The app is a hash router (main.jsx),
   so every client-side route lives after '#' and never reaches the server -- express.static's
   own default of serving index.html for '/' is the only fallback this needs, not a wildcard
   route for arbitrary paths the way a browser-history router would. */
const CLIENT_DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'react', 'dist')
/* The bundle ships a source map beside every chunk, which is what makes a stack trace off a
   running container name a file in src/ instead of index-<hash>.js:1:24817 -- and what makes
   this app's sources readable by anyone who can reach it. So the maps are built into the image
   and served only when asked for: SPENDLY_SOURCE_MAPS=1 hands them out, anything else (unset
   included) 404s them while the chunks beside them serve exactly as before. Same default shape
   as SPENDLY_PLAIN_HTTP one file over -- unset is the closed position, and "1" is the install
   saying it wants the open one.

   A serving decision rather than a build one, deliberately: the image always carries the maps,
   so turning them on to read one trace is a restart, not a rebuild, and turning them back off
   is the same. The .gz/.br variants are named here too, or precompress.mjs's own output would
   be the way around the switch. */
if (process.env.SPENDLY_SOURCE_MAPS !== '1') app.use((req, res, next) =>
	/\.map(\.(gz|br))?$/.test(req.path) ? res.status(404).end() : next())
if (existsSync(CLIENT_DIST)) app.use(express.static(CLIENT_DIST))

/* Central error handler. A route error.status (400/404/409) is trusted verbatim; anything else
   is a bug, logged and reported as a plain 500 rather than leaking a stack to the client. */
app.use((err, req, res, next) => {
	if (res.headersSent) return next(err)
	const status = err.status ?? 500
	if (status === 500) console.error(err)
	res.status(status).json({ error: status === 500 ? 'Something went wrong.' : err.message })
})
