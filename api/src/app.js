import express from 'express'
import compression from 'compression'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { router as authRouter } from './routes/auth.js'
import { router as vendorsRouter } from './routes/vendors.js'
import { router as categoriesRouter } from './routes/categories.js'
import { router as ordersRouter } from './routes/orders.js'
import { router as bookmarksRouter } from './routes/bookmarks.js'
import { router as countsRouter } from './routes/counts.js'
import { router as budgetRouter } from './routes/budget.js'
import { router as settingsRouter } from './routes/settings.js'
import { router as accountRouter, ownsServer, updaterAvailable } from './routes/account.js'
import { router as profileRouter } from './routes/profile.js'
import { router as passkeysRouter, signInRouter as passkeySignInRouter } from './routes/passkeys.js'
import { router as importsRouter } from './routes/imports.js'
import { router as statsRouter } from './routes/stats.js'
import { router as scanRouter } from './routes/scan.js'
import { router as draftsRouter } from './routes/drafts.js'
import { router as searchRouter } from './routes/search.js'
import { router as statusesRouter } from './routes/statuses.js'
import { router as viewsRouter } from './routes/views.js'
import { router as mcpRouter } from './routes/mcp.js'
import { router as mcpTokensRouter } from './routes/mcpTokens.js'
import { router as askRouter, downloadFile } from './routes/ask.js'
import { requireAuth, sessionUser } from './lib/auth.js'
import { readCache } from './lib/readCache.js'
import { readTodayHeader } from './lib/dates.js'
import { MAX_UPLOAD_MB } from './lib/constants.js'
import { MAX_UPLOAD_FILES } from './lib/upload.js'
import { fileSizeLabel } from './lib/copy.js'

export const app = express()

/* The browser reaches this origin and nowhere else -- a shop's picture is fetched server-side
   into a data: URI (routes/bookmarks.js). No inline or eval escape, so injected markup cannot run. */
const CSP = [
	"default-src 'self'",
	"script-src 'self'",
	/* A colour a user picked is written onto the element, so style attributes are allowed --
	   an injected <style> element is not. */
	"style-src 'self'",
	"style-src-attr 'unsafe-inline'",
	"img-src 'self' data: blob:",
	"font-src 'self'",
	"connect-src 'self'",
	"manifest-src 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
	"base-uri 'none'",
	"object-src 'none'"
].join('; ')

app.disable('x-powered-by')
// req.ip trusts the forwarded address only from a proxy on this machine or a private network (caddy),
// so a visitor cannot choose their own address
app.set('trust proxy', 'loopback, linklocal, uniquelocal')
app.use((req, res, next) => {
	res.setHeader('Content-Security-Policy', CSP)
	res.setHeader('Referrer-Policy', 'no-referrer')
	res.setHeader('X-Content-Type-Options', 'nosniff')
	res.setHeader('X-Frame-Options', 'DENY')
	res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
	res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
	res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
	/* HSTS pins the hostname to https for a year, so a deploy whose address is also reached
	   over plain http opts out via SPENDLY_PLAIN_HTTP rather than locking that address out. */
	if (process.env.NODE_ENV === 'production' && process.env.SPENDLY_PLAIN_HTTP !== '1')
		res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
	next()
})

// SameSite lets a page on a sibling address of the same domain through, so a change the browser
// marks as from another site is refused; a script or mail program sends no such mark
app.use('/api', (req, res, next) => {
	if (req.method === 'GET' || req.method === 'HEAD') return next()
	const from = req.headers['sec-fetch-site']
	if (from && from !== 'same-origin' && from !== 'none') return res.status(403).json({ error: 'This request did not come from Spendly.' })
	next()
})

// The bulk-import route carries base64-encoded receipt images, so it gets a raised body limit
// of its own rather than opening every route to arbitrarily large request bodies. A single
// picked-per-request parser (rather than mounting two express.json()s in sequence) keeps each
// request body read exactly once.
const smallJson = express.json()
const importJson = express.json({ limit: '50mb' })
// A budget file of many years outgrows the default 100 kB, though it carries no images.
const budgetJson = express.json({ limit: '2mb' })
// a large body is read only for a signed-in user, so nobody else can make the server hold one
const signedInThen = parser => (req, res, next) => requireAuth(req, res, () => parser(req, res, next))
const importBody = signedInThen(importJson)
const budgetBody = signedInThen(budgetJson)
app.use((req, res, next) => (req.path === '/api/orders/import' || req.path === '/api/imports/check' ? importBody
	: req.path === '/api/budget/import' ? budgetBody : smallJson)(req, res, next))

// Debug request log, off unless asked for (node src/server.js --debug, or DEBUG=1) -- one line
// per request, written when the response finishes so it can carry the status and timing, but
// stamped with the request's arrival time the way an access log is. The JSON body rides along
// (after the parser above, so req.body is already the parsed object, not the raw stream), and
// the method is padded to the width of the longest one (OPTIONS, 7) so the URLs, statuses and
// timings line up in columns. Passwords and email-link codes are hidden, in the body and in the
// address: a debug log is still a log a terminal keeps scrollback of. Registered only when on,
// rather than checked every request, so a normal run pays nothing.
if (process.argv.includes('--debug') || process.env.DEBUG) {
	const REDACT_KEYS = ['password', 'current', 'token']
	// a link's code sits in the address too: /api/auth/reset/<code>, /open/confirm/<code>, /api/auth/status-email/stop/<code>, /mcp/<token>
	const redactedUrl = url => url.replace(/\/(reset|confirm|stop|mcp)\/[^/?#]+/, '/$1/***')
	const redacted = body => JSON.stringify(body, (key, value) => REDACT_KEYS.includes(key) ? '***' : value)
	app.use((req, res, next) => {
		const arrived = new Date()
		const body = req.is('application/json') && req.body && Object.keys(req.body).length ? ' ' + redacted(req.body) : ''
		res.on('finish', () => {
			console.log(`${arrived.toISOString()} ${req.method.padEnd(7)} ${redactedUrl(req.originalUrl)} ${res.statusCode} (${Date.now() - arrived}ms)${body}`)
		})
		next()
	})
}

// the build that answered, on every API response: an open tab compares it with its own (react/src/api/build.js)
app.use('/api', (req, res, next) => {
	if (process.env.SPENDLY_BUILD_SHA) res.setHeader('Build', process.env.SPENDLY_BUILD_SHA)
	next()
})

/* The API's answers go compressed when the browser accepts it. A line-by-line answer (Ask, a demo fill,
   an import) is left as it is: compressing it would hold each line back until a block fills. */
app.use('/api', compression({ filter: (req, res) => !String(res.getHeader('Content-Type') ?? '').includes('ndjson') && compression.filter(req, res) }))

app.get('/api/health', (req, res) => res.json({ ok: true }))

/* Which build is running: the image's build time and commit, stamped at build time
   (Dockerfile ARG -> ENV) so the Settings page can print them and a reader can compare the
   commit against the newest one on GitHub. Outside the image both are null -- a dev server
   has no build to be out of date. Above the auth gate like /api/health: whether the
   container is current is a fact about the deployment, not about any account. */
/* The Lighthouse scores stamped into the image beside the build stamp (Dockerfile), parsed
   once at boot rather than per request -- it is a constant for the life of the process, and a
   malformed value is a deploy-time mistake worth finding at boot instead of turning every
   version read into a 500. Unset outside the image, which is the same "no build to be measured"
   the two stamps above answer with. */
const LIGHTHOUSE = (() => {
	if (!process.env.SPENDLY_LIGHTHOUSE) return null
	try { return JSON.parse(process.env.SPENDLY_LIGHTHOUSE) } catch (e) {
		console.error(`SPENDLY_LIGHTHOUSE is not JSON, so /api/version answers null for it: ${e.message}`)
		return null
	}
})()

app.get('/api/version', (req, res) => res.json({
	builtAt: process.env.SPENDLY_BUILD_TIME || null,
	commit: process.env.SPENDLY_BUILD_SHA || null,
	lighthouse: LIGHTHOUSE,
	// whether Settings may offer "Update and reload": an updater is set up and this user manages the server
	canUpdate: updaterAvailable() && ownsServer(sessionUser(req))
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
	const latestBuiltAt = latest === mine ? null
		: await builtAtOf(`https://${registry}/v2/${repo}`, latest, token, signal)
	return { latest, mine, latestBuiltAt }
}

/* The build stamp of the image behind `digest`, from its config blob. The blob lives on a
   second host, so where only the registry is reachable the check answers without the date. */
async function builtAtOf(base, digest, token, signal) {
	try {
		const headers = { Authorization: `Bearer ${token}` }
		const manifest = await fetch(`${base}/manifests/${digest}`, { signal, headers: { ...headers, Accept: MANIFEST_TYPES } })
		const config = manifest.ok ? (await manifest.json()).config?.digest : null
		if (!config) return null
		const blob = await fetch(`${base}/blobs/${config}`, { signal, headers })
		if (!blob.ok) return null
		const image = await blob.json()
		const stamp = image.config?.Env?.find(e => e.startsWith('SPENDLY_BUILD_TIME='))?.slice('SPENDLY_BUILD_TIME='.length)
		return stamp || image.created || null
	} catch {
		return null
	}
}

/* Beside /api/version, but only for a signed-in user: each check sends requests to the registry, so
   a stranger must not be able to make the server send them. Nothing here takes caller input, and
   nothing is cached: a check is a question about right now, asked by one button press at a time. */
app.get('/api/version/check', requireAuth, async (req, res) => {
	const commit = process.env.SPENDLY_BUILD_SHA || null
	if (!commit) return res.status(409).json({ error: 'No build stamp: this server is not running from the Docker image.' })
	try {
		const { latest, mine, latestBuiltAt } = await publishedDigests(commit)
		/* `published: false` is its own fact, not a flavour of "behind": a locally built
		   image whose commit was never pushed to the registry cannot be compared, and
		   calling it out of date would send someone pulling for an update that is not one. */
		res.json({ current: mine !== null && mine === latest, published: mine !== null, commit, latestBuiltAt })
	} catch (e) {
		// fetch's own message is only "fetch failed"; the reason is in its cause
		const error = `Could not read the registry at ${IMAGE.split('/')[0]}: ${e.message ?? e}${e.cause ? ` (${e.cause.message ?? e.cause})` : ''}`
		console.error(error)
		res.status(502).json({ error: 'Spendly could not check for a newer version. Try again later.' })
	}
})

// outside /api: it has its own token, read in routes/mcp.js, and answers in its own protocol's shape
app.use('/mcp', mcpRouter)

app.use('/api/auth', authRouter)
app.use('/api/auth/passkey', passkeySignInRouter)

// a file Ask made is downloaded by following a link, so a signed-out tab is sent to sign-in rather than refused
app.get('/api/ask/files/:id/download', downloadFile)

/* One auth gate for every data route, rather than requireAuth repeated per mount: the session
   lookup runs once per request this way, and readCache (which needs req.user) sits behind it
   in the same line. Anything meant to be reachable *without* auth (like /api/health) has to
   be registered above this line, and /api/auth handles its own routes before the gate is
   reached. */
app.use('/api', requireAuth, readTodayHeader, readCache)

app.use('/api/vendors', vendorsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/bookmarks', bookmarksRouter)
app.use('/api/counts', countsRouter)
app.use('/api/budget', budgetRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/account/passkeys', passkeysRouter)
app.use('/api/account/mcp-tokens', mcpTokensRouter)
app.use('/api/account', profileRouter)
app.use('/api/imports', importsRouter)
app.use('/api/statuses', statusesRouter)
app.use('/api/views', viewsRouter)
// Mounted at the bare /api prefix: its one route is POST /api/demo-data, which shadows nothing.
app.use('/api', accountRouter)
app.use('/api/stats', statsRouter)
app.use('/api/scan', scanRouter)
app.use('/api/drafts', draftsRouter)
app.use('/api/search', searchRouter)
app.use('/api/ask', askRouter)

/* An email's link to a page: /open/categories opens /#/categories. A link in an email carries no '#',
   as a mail program or its link checker can drop everything after one. */
app.use('/open', (req, res, next) => (req.method === 'GET' ? res.redirect(302, '/#' + req.url) : next()))

/* Where a password manager looks for the page that changes a password (W3C "change-password URL").
   An unknown /.well-known address stays a 404: that is how the manager knows it can trust this one. */
app.get('/.well-known/change-password', (req, res) => res.redirect(302, '/#/settings/account'))

/* The Storybook, for signed-in readers only. It runs inline scripts and draws each story in a
   frame of its own page, so these pages alone get a looser policy. */
const STORYBOOK_DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'storybook', 'dist')
const STORYBOOK_CSP = CSP
	.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
	.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
	.replace("frame-ancestors 'none'", "frame-ancestors 'self'")
if (existsSync(STORYBOOK_DIST)) app.use('/storybook',
	(req, res, next) => {
		if (!sessionUser(req)) return res.redirect(302, '/#/signin')
		res.setHeader('Content-Security-Policy', STORYBOOK_CSP)
		res.setHeader('X-Frame-Options', 'SAMEORIGIN')
		res.setHeader('Cache-Control', 'private, no-cache')
		next()
	},
	compression(),
	express.static(STORYBOOK_DIST, { cacheControl: false }))

/* Where to report a security problem (RFC 9116), when SPENDLY_SECURITY_CONTACT names someone.
   Expires is required and must stay under a year ahead, so it is always half a year from today. */
app.get('/.well-known/security.txt', (req, res, next) => {
	const contact = process.env.SPENDLY_SECURITY_CONTACT
	if (!contact) return next()
	const expires = new Date(Date.now() + 182 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')
	const site = process.env.SPENDLY_PUBLIC_URL?.replace(/\/$/, '')
	res.type('text/plain').send([
		`Contact: ${/^(mailto|https?):/.test(contact) ? contact : 'mailto:' + contact}`,
		`Expires: ${expires}`,
		'Preferred-Languages: en, da',
		...(site ? [`Canonical: ${site}/.well-known/security.txt`] : [])
	].join('\n') + '\n')
})

/* react/'s own dev server (Vite) serves the app locally, proxying /api to this process --
   nothing here needs to serve HTML in that mode, and CLIENT_DIST simply won't exist. A
   deploy that builds react/dist first (see render.yaml) is the one case this matters: same
   process, same origin, so the session cookie set by /api/auth is a first-party cookie
   rather than a cross-site one a browser might refuse. The app is a hash router (main.jsx),
   so every client-side route lives after '#' and never reaches the server -- express.static's
   own default of serving index.html for '/' is the only fallback this needs, not a wildcard
   route for arbitrary paths the way a browser-history router would. */
const CLIENT_DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'react', 'dist')
/* The build writes a .br and a .gz beside every text asset (react/scripts/precompress.mjs),
   and until now nothing read them back: express.static answers with the identity file
   whatever a request's Accept-Encoding says, and this process is what serves the app in the
   container. So the render-blocking stylesheet went over the wire at 62,581 bytes with an
   11,338-byte brotli copy sitting in the same directory, and the entry chunk at 54,521 beside
   14,973. precompress.mjs's own header assumed an nginx or a Caddy in front doing the
   negotiation; the deploy this repository ships (Dockerfile, docker-compose.yml) is this
   server on :4000 with nothing in front of it, so the variants were disk and no wire.

   A stat per request rather than a listing built at boot: dist/ is rebuilt under a running
   server often enough that a cached index would offer a .br for a chunk the build has since
   renamed, and one stat off the page cache costs nothing against reading the file after it.

   Vary is set for every negotiable path including the ones that fall through to identity -- a
   shared cache that stored one encoding under a bare URL would hand brotli to a client that
   never asked for it. */
const NEGOTIABLE = /\.(css|js|html|json|svg|txt|map|webmanifest)$/
const ENCODINGS = [['br', '.br'], ['gzip', '.gz']]

app.use((req, res, next) => {
	if (req.method !== 'GET' && req.method !== 'HEAD') return next()
	let pathname
	try { pathname = decodeURIComponent(req.path) } catch { return next() }
	// What express.static will end up reading, which for a directory request is its index --
	// leaving that one out would leave the entry document as the only uncompressed text asset.
	const file = pathname.endsWith('/') ? pathname + 'index.html' : pathname
	if (!NEGOTIABLE.test(file) || file.includes('..') || file.includes('\0')) return next()
	res.vary('Accept-Encoding')
	/* A Range names bytes of the representation actually sent, so answering one with a
	   different encoding answers a question about a file the client was not counting. Rare
	   enough for a stylesheet that identity is the right reply. */
	if (req.headers.range) return next()
	const acceptable = new Set(String(req.headers['accept-encoding'] || '').split(',')
		.map(part => part.trim().split(';'))
		// br;q=0 is a client naming brotli to refuse it, and a substring test reads it as a yes.
		.filter(([, q]) => !/^q=0(\.0+)?$/i.test((q || '').trim()))
		.map(([token]) => token.toLowerCase()))
	const encoding = ENCODINGS.find(([token, ext]) =>
		acceptable.has(token) && existsSync(path.join(CLIENT_DIST, file + ext)))
	if (!encoding) return next()
	/* express.static would type the response from the extension of the file it actually reads
	   -- .br, which is nothing -- and send() leaves a Content-Type that is already set alone,
	   so naming it from the requested path here is what keeps a stylesheet a stylesheet.

	   The read-back is not ceremony: res.type() resolves through mime-types, which answers
	   false for an extension it does not know, and res.set writes that through as the literal
	   string "false". All eight extensions NEGOTIABLE names resolve today (.map and
	   .webmanifest included, to application/json and application/manifest+json), so this
	   cannot fire now -- it is what stops a ninth added later from serving every one of its
	   files with a broken Content-Type and no other symptom. */
	res.type(path.extname(file))
	if (!String(res.get('Content-Type')).includes('/')) { res.removeHeader('Content-Type'); return next() }
	res.setHeader('Content-Encoding', encoding[0])
	req.url = req.path + (pathname.endsWith('/') ? 'index.html' : '') + encoding[1] + req.url.slice(req.path.length)
	next()
})

/* Cache-Control. express.static does set one -- `public, max-age=0`, measured, so the claim
   worth making is not that assets were uncacheable but that every one of them was stale on
   arrival: a hashed chunk whose name changes whenever its bytes do was revalidated on every
   single load, one conditional round trip per asset, to be told 304 every time. Three
   positions instead:

     assets/     everything the build emits -- chunks, the stylesheet and the three woff2 faces
                 -- content-hashed, so the name changes whenever the bytes do. A year,
                 immutable, never revalidated. The fonts are in here rather than in the bucket
                 below because they are imported from src/ for exactly that: an unhashed name
                 can only ever be cached for as long as you are willing to serve a stale one.
     index.html  the file that names the current hashes. no-store: no browser or shared cache
                 keeps a copy, so every load fetches the current file and a deploy's new chunk
                 names are live on the very next load, with nothing left to revalidate.
     everything  what public/ copies through verbatim -- the icons, the manifest. Unhashed, so
     else        bounded rather than immutable: a replaced favicon reaches an already-open
                 browser within the week rather than never.

   The path handed in is the file that was read, so it ends in .br or .gz whenever the
   negotiation above fired; the suffix comes off before the decision, or every compressed
   response would fall through to the last position. */
const CACHE_YEAR = 31536000
const CACHE_WEEK = 604800
if (existsSync(CLIENT_DIST)) app.use(express.static(CLIENT_DIST, {
	setHeaders: (res, filePath) => {
		const name = filePath.replace(/\.(br|gz)$/, '')
		if (name.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', `public, max-age=${CACHE_YEAR}, immutable`)
		else if (name.endsWith('.html')) res.setHeader('Cache-Control', 'no-store')
		else res.setHeader('Cache-Control', `public, max-age=${CACHE_WEEK}`)
	}
}))

/* What the body parsers refuse before a route runs, in words the reader can act on. Their own
   messages ("File too large", "request entity too large") are written for a programmer. */
function parserRefusal(err) {
	if (err.code === 'LIMIT_FILE_SIZE') return { status: 413, message: `A file is too large. Each file can be up to ${MAX_UPLOAD_MB} MB.` }
	if (err.code === 'LIMIT_FILE_COUNT') return { status: 413, message: `That is too many files at once. Send at most ${MAX_UPLOAD_FILES}.` }
	if (err.name === 'MulterError') return { status: 400, message: 'The files could not be read. Add them again.' }
	if (err.type === 'entity.too.large') return { status: 413, message: `That is too much to send at once. The most is ${fileSizeLabel(err.limit)}.` }
	if (err.type === 'entity.parse.failed') return { status: 400, message: 'What was sent could not be read.' }
	return null
}

/* Central error handler. A route error.status (400/404/409/415) is trusted verbatim; anything
   else is a bug, logged and reported as a plain 500 rather than leaking a stack to the client. */
app.use((err, req, res, next) => {
	if (res.headersSent) return next(err)
	const refusal = parserRefusal(err)
	if (refusal) return res.status(refusal.status).json({ error: refusal.message })
	const status = err.status ?? 500
	if (status === 500) console.error(err)
	res.status(status).json({ error: status === 500 ? 'Something went wrong.' : err.message })
})
