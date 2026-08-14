import express from 'express'
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

export const app = express()

// The bulk-import route carries base64-encoded receipt images, so it gets a raised body limit
// of its own rather than opening every route to arbitrarily large request bodies. A single
// picked-per-request parser (rather than mounting two express.json()s in sequence) keeps each
// request body read exactly once.
const smallJson = express.json()
const importJson = express.json({ limit: '50mb' })
app.use((req, res, next) => (req.path === '/api/orders/import' ? importJson : smallJson)(req, res, next))

// Debug request log, off unless asked for (node src/server.js --debug, or DEBUG=1) -- one line
// as a request arrives (with its JSON body, if it has one -- after the parser above so req.body
// is already the parsed object, not the raw stream) and one line when the response finishes, so
// a request and its outcome read as a pair in the terminal rather than status codes arriving in
// whatever order handlers happen to finish in. Password is the one field worth hiding -- both
// auth routes carry it in plain text, and a debug log is still a log a terminal keeps scrollback
// of. Registered only when on, rather than checked every request, so a normal run pays nothing.
if (process.argv.includes('--debug') || process.env.DEBUG) {
	const REDACT_KEYS = ['password']
	const redacted = body => JSON.stringify(body, (key, value) => REDACT_KEYS.includes(key) ? '***' : value)
	app.use((req, res, next) => {
		const start = Date.now()
		const body = req.is('application/json') && req.body && Object.keys(req.body).length ? ' ' + redacted(req.body) : ''
		console.log(`--> ${req.method} ${req.originalUrl}${body}`)
		res.on('finish', () => {
			console.log(`<-- ${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - start}ms)`)
		})
		next()
	})
}

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api/vendors', requireAuth, vendorsRouter)
app.use('/api/categories', requireAuth, categoriesRouter)
app.use('/api/orders', requireAuth, ordersRouter)
app.use('/api/settings', requireAuth, settingsRouter)
app.use('/api/dashboard-cards', requireAuth, dashboardCardsRouter)
/* accountRouter only defines POST /reset, but it's mounted at the bare /api prefix (the route
   itself, /api/reset, needs the full path) — every route above is registered first, so this
   still can't shadow any of them, but anything meant to be reachable *without* auth (like
   /api/health) has to be registered before this line or requireAuth would gate it too. */
app.use('/api', requireAuth, accountRouter)
app.use('/api/stats', requireAuth, statsRouter)
app.use('/api/home', requireAuth, homeRouter)
app.use('/api/scan', requireAuth, scanRouter)
app.use('/api/search', requireAuth, searchRouter)

/* Central error handler. A route error.status (400/404/409) is trusted verbatim; anything else
   is a bug, logged and reported as a plain 500 rather than leaking a stack to the client. */
app.use((err, req, res, next) => {
	if (res.headersSent) return next(err)
	const status = err.status ?? 500
	if (status === 500) console.error(err)
	res.status(status).json({ error: status === 500 ? 'Something went wrong.' : err.message })
})
