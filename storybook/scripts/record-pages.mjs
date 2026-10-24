// Walks pages/states.js in the running app, on a computer and on a phone, and keeps every answer
// the server gave in pages/answers.json, so Storybook can draw the same pages with no server.
// Run it again when a page asks the server for something new: the stories of a page whose
// answers are missing draw its error state, and Chromatic shows that.
// Needs react/ and api/ installed. From storybook/:
//   NODE_PATH=/opt/node22/lib/node_modules node scripts/record-pages.mjs
// It uses react/scripts/session.mjs, which starts the API and the app unless they answer.

import { writeFileSync } from 'node:fs'
import { BASE, openSession } from '../../react/scripts/session.mjs'
import { PAGE_STATES, nameOf, pathOf, pressOn } from '../pages/states.js'

const session = await openSession()
const api = session.desktop.request
const first = async (path, key) => (await (await api.get(`${BASE}${path}`)).json())[key][0].id

// a budget to draw: the demo data has none, so the year is started once on a new account
const setup = await session.desktop.newPage()
await setup.goto(`${BASE}/#/budget`)
await setup.getByRole('button', { name: /^(Start \d{4}|Edit)$/ }).first().waitFor({ timeout: 10000 })
const start = setup.getByRole('button', { name: /^Start \d{4}$/ })
if (await start.count()) {
	await start.click()
	await setup.getByRole('button', { name: 'Edit' }).waitFor({ timeout: 10000 })
}
await setup.close()

const ids = {
	order: await first('/api/orders?pageSize=1', 'orders'),
	vendor: await first('/api/vendors?pageSize=1', 'vendors'),
	category: await first('/api/categories?pageSize=1', 'categories')
}
ids.line = (await (await api.get(`${BASE}/api/orders/${ids.order}`)).json()).items[0].title

// the server is quiet: nothing asked for a second, since a page asks for its later parts in turn
const settled = async (page, open) => {
	for (let quiet = 0; quiet < 10;) {
		await page.waitForTimeout(100)
		quiet = open.size ? 0 : quiet + 1
	}
}

const recordedAt = Date.now()
const states = {}
for (const state of PAGE_STATES) {
	const answers = {}
	for (const context of [session.desktop, session.phone]) {
		const page = await context.newPage()
		const open = new Set()
		const seen = {}
		page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/')) open.add(r) })
		page.on('requestfailed', r => open.delete(r))
		page.on('response', async response => {
			const request = response.request()
			const url = new URL(response.url())
			if (!url.pathname.startsWith('/api/')) return
			try {
				const key = `${request.method()} ${url.pathname}${url.search}`
				const type = response.headers()['content-type'] ?? ''
				// an answer the page stopped waiting for has no body to keep
				const body = await response.body().catch(() => null)
				if (!body) return
				// a picture is fetched by the browser, not the page's code, so only text is kept
				if (body.length && !/json|text/.test(type)) return
				const answer = { status: response.status(), type, text: body.toString('utf8') }
				// a second answer to the same question, as after a save, is kept in turn
				seen[key] = (seen[key] ?? 0) + 1
				const list = answers[key] ??= []
				if (list.length < seen[key]) list.push(answer)
			} finally { open.delete(request) }
		})
		await page.goto(`${BASE}/#${pathOf(state, ids)}`)
		await settled(page, open)
		for (const step of state.press ?? []) {
			const press = pressOn(step, context === session.phone)
			await page.getByRole(press.role, { name: nameOf(press, ids) }).first().click()
			await settled(page, open)
		}
		await page.close()
	}
	states[state.name] = answers
	console.log(`${state.name}: ${Object.keys(answers).length} answers`)
}

await session.close()
const file = new URL('../pages/answers.json', import.meta.url)
writeFileSync(file, JSON.stringify({ recordedAt, ids, states }, null, '\t') + '\n')
console.log(`kept in ${file.pathname}`)
