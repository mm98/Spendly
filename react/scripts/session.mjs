/* One test session for every check and every docs/ shot: the API and the app are started once and
   left running, and each account is registered, filled and signed in once. Its cookie is kept in a
   file, so a later run opens a desktop and a phone tab already signed in, with no new fill.

   As a command:  node scripts/session.mjs     starts what is not running, and prints where it is
   As a module:   const s = await openSession(); s.desktop / s.phone are signed-in contexts

   SPENDLY_SESSION_DIR (default /tmp/spendly-session) holds the scratch database, the logs and the
   kept cookies. Delete it for a fresh start. */

import { spawn, execSync } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const BASE = 'http://localhost:5173'
const API = 'http://localhost:4000'
const ROOT = fileURLToPath(new URL('../..', import.meta.url))
export const DIR = process.env.SPENDLY_SESSION_DIR ?? '/tmp/spendly-session'

/* The shots are a fact about the app, not the machine that ran them: one locale and zone for all. */
export const READER = { locale: 'en-GB', timezoneId: 'Europe/Copenhagen' }

const pw = await import('playwright').catch(() =>
	import(`file://${execSync('npm root -g').toString().trim()}/playwright/index.mjs`))
export const { chromium, devices } = pw

export const DESKTOP = { ...READER, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }
// the floor device: the iPhone 15 descriptor at scale 2 (786x1318)
export const PHONE = { ...devices['iPhone 15'], ...READER, deviceScaleFactor: 2 }

const answers = async url => { try { return (await fetch(url)).ok } catch { return false } }

async function start(name, cwd, command, env, ready) {
	if (await answers(ready)) return false
	const log = openSync(join(DIR, `${name}.log`), 'a')
	spawn('sh', ['-c', command], { cwd, env: { ...process.env, ...env }, detached: true, stdio: ['ignore', log, log] }).unref()
	for (let i = 0; i < 120; i++) {
		if (await answers(ready)) return true
		await new Promise(r => setTimeout(r, 250))
	}
	throw new Error(`${name} did not start: see ${join(DIR, `${name}.log`)}`)
}

/** Starts the API on a scratch database and the app's dev server, unless they already answer. */
export async function ensureServers() {
	mkdirSync(DIR, { recursive: true })
	// a made-up assistant key shows the assistant's pages; it gets no answer and costs nothing
	const api = await start('api', join(ROOT, 'api'), 'node src/server.js',
		{ PORT: '4000', SPENDLY_DB: join(DIR, 'spendly.sqlite3'), ANTHROPIC_API_KEY: 'not-a-real-key' }, `${API}/api/health`)
	const app = await start('app', join(ROOT, 'react'), 'npx vite --port 5173 --strictPort', {}, BASE)
	return { api, app }
}

/** The kept cookie for an account, signing in and filling it only when it has none that still works.
    `fill` runs once, on a new account, with a request context already signed in. */
export async function signedIn(browser, { email, password, fill }) {
	const file = join(DIR, `${email.replace(/[^\w.@-]/g, '_')}.json`)
	if (existsSync(file)) {
		const probe = await browser.newContext({ storageState: file })
		const me = await probe.request.get(`${BASE}/api/auth/me`)
		await probe.close()
		if (me.ok()) return file
	}
	const ctx = await browser.newContext()
	let r = await ctx.request.post(`${BASE}/api/auth/register`, { data: { email, password } })
	const isNew = r.status() === 201
	if (!isNew) r = await ctx.request.post(`${BASE}/api/auth/login`, { data: { email, password } })
	if (!r.ok()) throw new Error(`sign in ${email}: ${r.status()} ${await r.text()}`)
	if (isNew) await fill?.(ctx.request)
	writeFileSync(file, JSON.stringify(await ctx.storageState()))
	await ctx.close()
	return file
}

export const DEMO = { email: 'session@example.com', password: 'session-pass-12345' }

/** A browser with a desktop and a phone context, both signed in to one filled account. */
export async function openSession({ account = DEMO, fill = demoFill, launch = {} } = {}) {
	await ensureServers()
	const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', ...launch })
	const storageState = await signedIn(browser, { ...account, fill })
	const desktop = await browser.newContext({ ...DESKTOP, storageState })
	const phone = await browser.newContext({ ...PHONE, storageState })
	for (const ctx of [desktop, phone]) {
		ctx.setDefaultTimeout(2000)
		ctx.setDefaultNavigationTimeout(2000)
	}
	return { browser, desktop, phone, storageState, close: () => browser.close() }
}

async function demoFill(request) {
	const r = await request.post(`${BASE}/api/demo-data`, { data: { seed: 1 } })
	if (!r.ok()) throw new Error(`demo data: ${r.status()}`)
	await request.post(`${BASE}/api/account/setup-done`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const started = await ensureServers()
	const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
	const file = await signedIn(browser, { ...DEMO, fill: demoFill })
	await browser.close()
	console.log(`api ${started.api ? 'started' : 'already running'} on :4000, app ${started.app ? 'started' : 'already running'} on :5173`)
	console.log(`signed in as ${DEMO.email}, cookie kept in ${file}`)
	console.log(`database and logs in ${DIR}`)
}
