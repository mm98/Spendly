/* The app's logger: an error or warning goes to the console and to the server log (api/src/routes/browserLog.js).
   startLogging() also sends what nothing caught and every console.error or console.warn. */

const ENDPOINT = '/api/log'
// entries wait this long, so a burst goes in one request
const SEND_AFTER_MS = 2000
// one page sends at most this many a minute; the rest are only printed in the console
const MOST_PER_MINUTE = 30
// the same entry again within this time is one entry
const SAME_WITHIN_MS = 5000

const waiting = []
const lastSent = new Map()
let timer = null
let sentThisMinute = 0
let minuteStarted = 0

const originalConsole = { error: console.error.bind(console), warn: console.warn.bind(console) }

const textOf = value => value instanceof Error ? `${value.name}: ${value.message}`
	: typeof value === 'string' ? value
	: (() => { try { return JSON.stringify(value) } catch { return String(value) } })()

const stackOf = values => values.find(value => value instanceof Error)?.stack
	?.split('\n').filter(line => /^\s+at |@/.test(line)).map(line => line.trimStart()).join('\n')

// the route only: what follows `?` can hold what the reader typed
const pageNow = () => window.location.hash.replace(/^#/, '').split('?')[0] || '/'

function send() {
	timer = null
	if (!waiting.length) return
	fetch(ENDPOINT, {
		method: 'POST', credentials: 'include', keepalive: true,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ entries: waiting.splice(0) })
	}).catch(() => { /* a log that cannot be sent is only in the console; logging it again would loop */ })
}

function queue(level, area, values) {
	const message = values.map(textOf).join(' ').trim()
	if (!message) return
	const now = Date.now()
	const key = `${level} ${area} ${message}`
	if (now - (lastSent.get(key) ?? -Infinity) < SAME_WITHIN_MS) return
	if (now - minuteStarted > 60000) { minuteStarted = now; sentThisMinute = 0 }
	if (++sentThisMinute > MOST_PER_MINUTE) return
	lastSent.set(key, now)
	if (lastSent.size > 200) lastSent.delete(lastSent.keys().next().value)
	waiting.push({ level, area, message, page: pageNow(), stack: stackOf(values) })
	timer ??= setTimeout(send, SEND_AFTER_MS)
}

/** Writes to the console and sends to the server log. `area` names the part of the app, the rest is what happened. */
export const log = {
	error: (area, ...values) => { originalConsole.error(`[${area}]`, ...values); queue('error', area, values) },
	warn: (area, ...values) => { originalConsole.warn(`[${area}]`, ...values); queue('warn', area, values) }
}

/** Once, before the app draws: sends what nothing caught, and what is printed as an error or a warning. */
export function startLogging() {
	window.addEventListener('error', event => queue('error', 'page', [event.error ?? event.message]))
	window.addEventListener('unhandledrejection', event => queue('error', 'page', [event.reason]))
	console.error = (...values) => { originalConsole.error(...values); queue('error', 'console', values) }
	console.warn = (...values) => { originalConsole.warn(...values); queue('warn', 'console', values) }
	// a tab that closes sends what is still waiting
	window.addEventListener('pagehide', () => { if (timer) { clearTimeout(timer); send() } })
}
