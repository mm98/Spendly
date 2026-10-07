/* A test account with the cases real accounts have and the demo data does not: a limit nobody
   has spent, a limit passed, a limit nearly reached, a favourite never used, an order that
   waited past two weeks, look-alike vendors, an archived vendor, more categories than a page
   holds, names too long for a row, every status, a receipt and none, bookmarks with and
   without a category.

   Needs the API up (npm run dev in api/, PORT 4000). Run it after the app's own demo data, which
   it fills first on a new account:
     node scripts/edge-account.mjs [email] [password]
   Safe to run again: what exists is left alone, and every step says what happened. */

import { crc32, deflateSync } from 'node:zlib'

const BASE = process.env.SPENDLY_API ?? 'http://localhost:4000'
const email = process.argv[2] ?? 'edge@example.com'
const password = process.argv[3] ?? 'edge-pass-12345'

const day = offset => {
	const d = new Date()
	d.setDate(d.getDate() + offset)
	return d.toISOString().slice(0, 10)
}
// a real picture and a real one-page PDF, so the upload paths read them as the app would
const png = (w, h, [r, g, b]) => {
	const chunk = (type, data) => {
		const head = Buffer.alloc(4)
		head.writeUInt32BE(data.length)
		const crc = Buffer.alloc(4)
		crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])))
		return Buffer.concat([head, Buffer.from(type), data, crc])
	}
	const size = Buffer.alloc(13)
	size.writeUInt32BE(w, 0)
	size.writeUInt32BE(h, 4)
	size.set([8, 2, 0, 0, 0], 8)
	const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => [r, g, b]).flat())])
	return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', size), chunk('IDAT', deflateSync(Buffer.concat(Array(h).fill(row)))), chunk('IEND', Buffer.alloc(0))])
}
const pdf = () => {
	const parts = ['<</Type/Catalog/Pages 2 0 R>>', '<</Type/Pages/Kids[3 0 R]/Count 1>>', '<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>']
	let out = '%PDF-1.4\n'
	const at = []
	parts.forEach((body, i) => { at.push(out.length); out += `${i + 1} 0 obj${body}endobj\n` })
	const xref = out.length
	out += `xref\n0 4\n0000000000 65535 f \n${at.map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer<</Size 4/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`
	return Buffer.from(out)
}
const upload = (name, type, bytes, field = 'files') => {
	const form = new FormData()
	form.append(field, new Blob([bytes], { type }), name)
	return form
}

let cookie = ''
const call = async (method, path, body, form) => {
	const res = await fetch(BASE + '/api' + path, {
		method,
		headers: { cookie, 'X-Spendly-Today': day(0), ...(body ? { 'content-type': 'application/json' } : {}) },
		body: form ?? (body ? JSON.stringify(body) : undefined)
	})
	const set = res.headers.getSetCookie?.() ?? []
	if (set.length) cookie = set.map(c => c.split(';')[0]).join('; ')
	const text = await res.text()
	let data = null
	try { data = text ? JSON.parse(text) : null } catch { data = text }
	return { status: res.status, data }
}
const made = new Map()
const step = (what, r) => {
	const ok = r.status >= 200 && r.status < 300
	const kept = !ok && (r.status === 409 || /already/.test(JSON.stringify(r.data)))
	const key = ok ? 'made' : kept ? 'there already' : 'FAILED'
	made.set(key, (made.get(key) ?? 0) + 1)
	if (process.env.EDGE_VERBOSE && key === 'made') console.log('made', what)
	if (key === 'FAILED') console.log(`FAILED ${what}: ${r.status} ${JSON.stringify(r.data).slice(0, 160)}`)
	return r
}
const there = () => step('kept', { status: 409 })

let r = await call('POST', '/auth/register', { email, password })
const isNew = r.status === 201
if (!isNew) r = await call('POST', '/auth/login', { email, password })
if (r.status >= 300) throw new Error(`sign in: ${r.status} ${JSON.stringify(r.data)}`)
console.log(`${isNew ? 'registered' : 'signed in as'} ${email}`)
if (isNew) {
	r = await call('POST', '/demo-data', { seed: 1, months: 14, orders: 60 })
	console.log('demo data', r.status)
}

const makeCategory = async (name, look = {}) => step(`category ${name}`, await call('POST', '/categories', { name, look }))
const makeVendor = async (name, look = {}) => step(`vendor ${name}`, await call('POST', '/vendors', { name, look }))

// categories: limits spent, unspent, passed and nearly reached; favourites; no limit; long; more than a page
await makeCategory('Ceiling unspent', { budget: 500 })
await makeCategory('Ceiling unspent too', { budget: 300 })
await makeCategory('Over the line', { budget: 100 })
await makeCategory('Near the line', { budget: 1000 })
await makeCategory('Favourite unused', { favourite: 1 })
await makeCategory('Favourite with limit', { favourite: 1, budget: 800 })
await makeCategory('No limit, spent')
await makeCategory('No limit, unused')
await makeCategory('A category name so long that it has to be cut somewhere before it reaches the amounts at the end of a row')
for (let i = 1; i <= 30; i++) await makeCategory(`Filler ${String(i).padStart(2, '0')}`)

// vendors: a favourite, a look-alike pair, an archived one, one with no orders, a long name, one with an alias
await makeVendor('Edge favourite shop', { favourite: 1 })
await makeVendor('Coopp')
await makeVendor('Archived shop')
await makeVendor('Shop with no orders')
await makeVendor('A vendor name so long that it has to be cut somewhere before it reaches the amounts at the end of a row')
await makeVendor('Alias shop', { aliases: ['A-Shop', 'Alias Store'] })
const archived = (await call('GET', '/vendors?name=Archived%20shop&pageSize=1')).data?.vendors?.[0]
if (archived && !archived.archived) step('archive', await call('PATCH', `/vendors/${archived.id}`, { archived: true }))

// an order of this account is found again by its reference, so a second run adds only what is new
const references = new Set()
for (let page = 1; ; page++) {
	const got = (await call('GET', `/orders?pageSize=100&page=${page}`)).data
	for (const o of got?.orders ?? []) references.add(o.reference)
	if (!got?.orders?.length || page * 100 >= (got.matched ?? got.total ?? 0)) break
}
const order = async (what, draft) => {
	const date = draft.date ?? day(-1)
	const reference = `edge: ${what}`
	if (references.has(reference)) { there(); return null }
	const out = step(what, await call('POST', '/orders', {
		kind: 'Expense', status: 'Delivered', deliveredDate: date, shipping: 0, discount: 0, note: '', categories: [], refunded: false,
		...draft, reference, date, items: draft.items ?? [{ title: what, quantity: 1, price: 100 }]
	}))
	return out.data
}
// orders: every status, waiting past two weeks, spent against the limits, savings, discount and shipping
await order('Passed the line', { vendor: 'Edge favourite shop', date: day(-2), categories: ['Over the line'], items: [{ title: 'Over', quantity: 1, price: 180 }] })
await order('Close to the line', { vendor: 'Edge favourite shop', date: day(-3), categories: ['Near the line'], items: [{ title: 'Near', quantity: 1, price: 930 }] })
await order('No limit, spent', { vendor: 'Alias shop', date: day(-4), categories: ['No limit, spent'] })
await order('Ordered 20 days ago', { vendor: 'Alias shop', date: day(-20), status: 'Ordered', categories: ['Filler 01'] })
await order('Ordered 14 days ago', { vendor: 'Coopp', date: day(-14), status: 'Ordered' })
await order('Ordered 13 days ago', { vendor: 'Coopp', date: day(-13), status: 'Ordered' })
await order('Ordered today', { vendor: 'Coopp', date: day(0), status: 'Ordered' })
await order('A draft', { vendor: 'Coopp', date: day(-1), status: 'Draft', items: [] })
await order('Cancelled', { vendor: 'Coopp', date: day(-6), status: 'Cancelled' })
await order('Returned', { vendor: 'Coopp', date: day(-9), status: 'Returned', deliveredDate: day(-8), returnedDate: day(-5) })
await order('Refunded', { vendor: 'Coopp', date: day(-7), refunded: true })
// category suggestions: items that earlier orders filed under one category, and an order that has none yet
await makeCategory('Suggest lighting')
for (const [n, title] of [['1', 'Ceiling lamp LED 60W'], ['2', 'LED ceiling lamp white'], ['3', 'Ceiling lamp dimmable']])
	await order(`suggest lamp ${n}`, { vendor: 'Alias shop', date: day(-10 - Number(n)), categories: ['Suggest lighting'], items: [{ title, quantity: 1, price: 250 }] })
await order('suggest open', { vendor: 'Alias shop', date: day(-1), items: [{ title: 'Ceiling lamp', quantity: 1, price: 250 }] })
await order('Saved against retail', { vendor: 'Alias shop', date: day(-8), shipping: 49, discount: 30, categories: ['Favourite with limit', 'Filler 02', 'Filler 03'],
	items: [{ title: 'Retail price above price', quantity: 2, price: 400, retail: 600, url: 'https://example.dk/product?utm_source=news' }, { title: 'Second line', quantity: 1, price: 50, note: 'a note' }] })
await order('Many long lines', { vendor: 'Edge favourite shop', date: day(-10),
	items: Array.from({ length: 8 }, (_, i) => ({ title: `Line ${i + 1} with a title long enough that it has to be cut before the amount at the end of its row`, quantity: i + 1, price: 10 + i })) })
await order('Future-dated', { vendor: 'Alias shop', date: day(12), status: 'Ordered' })
await order('Last year', { vendor: 'Alias shop', date: day(-400) })
const withReceipt = await order('With a receipt', { vendor: 'Alias shop', date: day(-11) })
if (withReceipt) step('receipt picture', await call('POST', `/orders/${withReceipt.id}/attachments`, undefined, upload('receipt.png', 'image/png', png(60, 90, [235, 235, 225]))))
const withPdf = await order('With a PDF receipt', { vendor: 'Alias shop', date: day(-12) })
if (withPdf) step('receipt PDF', await call('POST', `/orders/${withPdf.id}/attachments`, undefined, upload('receipt.pdf', 'application/pdf', pdf())))
// a line with its own photo
const photoOrder = await order('With a line photo', { vendor: 'Alias shop', date: day(-15), items: [{ title: 'A line with a photo', quantity: 1, price: 250 }] })
if (photoOrder) step('line photo', await call('POST', `/orders/${photoOrder.id}/items/${photoOrder.items[0].id}/attachments`, undefined, upload('line.png', 'image/png', png(80, 80, [120, 160, 200]))))
// a vendor with a picture
const pictured = (await call('GET', '/vendors?name=Edge%20favourite%20shop&pageSize=1')).data?.vendors?.[0]
if (pictured && (await call('GET', `/vendors/${pictured.id}/image/square-256`)).status === 404) {
	step('vendor picture', await call('PUT', `/vendors/${pictured.id}/image`, undefined, upload('logo.png', 'image/png', png(200, 200, [30, 90, 60]), 'file')))
}

// custom statuses and saved views, one flagged
step('status', await call('POST', '/statuses', { name: 'On hold', tone: 'progress' }))
const viewNames = new Set(((await call('GET', '/views')).data?.views ?? []).map(v => v.name))
for (const view of [{ name: 'Waiting too long', query: 'status=Ordered&to=' + day(-14), attention: true }, { name: 'Big orders', query: 'min=500' }])
	viewNames.has(view.name) ? there() : step('view', await call('POST', '/views', view))

// the budget: a year, a group of each kind, an account, and lines with and without amounts
step('budget year', await call('POST', '/budget', { year: new Date().getFullYear(), amounts: 'none' }))
step('budget account', await call('POST', '/budget/accounts', { name: 'Everyday account' }))
const sheet = (await call('GET', `/budget/${new Date().getFullYear()}`)).data
const groups = sheet?.groups ?? sheet?.sheet?.groups ?? []
let group = groups[0]
if (!group) {
	step('budget group', await call('POST', `/budget/${new Date().getFullYear()}/groups`, { kind: 'expense', name: 'Fixed costs' }))
	group = ((await call('GET', `/budget/${new Date().getFullYear()}`)).data?.groups ?? [])[0]
}
if (group) {
	const lineNames = new Set((group.lines ?? []).map(l => l.name))
	for (const line of [{ name: 'Rent', months: Array(12).fill(7500) }, { name: 'Gym', months: Array(12).fill(null) }])
		lineNames.has(line.name) ? there() : step('budget line', await call('POST', `/budget/groups/${group.id}/lines`, line))
}

// more records than any card can draw: each with a limit and spend this month, a vendor each, so lists past a hundred rows are met
const crowded = Array.from({ length: 120 }, (_, i) => String(i + 1).padStart(3, '0'))
const crowd = new Set(((await call('GET', '/categories?pageSize=100&query=Crowd')).data?.matched ?? 0) >= 100 ? crowded : [])
for (const n of crowded) {
	if (crowd.has(n)) { there(); continue }
	await makeCategory(`Crowd category ${n}`, { budget: 100 + Number(n) })
	await makeVendor(`Crowd vendor ${n}`)
	await order(`Crowd order ${n}`, { vendor: `Crowd vendor ${n}`, date: day(-(Number(n) % 5)), categories: [`Crowd category ${n}`], items: [{ title: `Crowd ${n}`, quantity: 1, price: 20 + Number(n) }] })
}

// bookmarks: with and without a category, and an archived one
const listed = async archived => (await call('GET', `/bookmarks?pageSize=100${archived ? '&archived=yes' : ''}`)).data?.bookmarks ?? []
const bookmarkNames = new Set([...(await listed(false)), ...(await listed(true))].map(b => b.name))
for (const bookmark of [
	{ name: 'Chair with a category', url: 'https://example.dk/chair', price: '1499', categories: ['Favourite with limit'] },
	{ name: 'Lamp without a category', url: 'https://example.dk/lamp' },
	{ name: 'Bought already', url: 'https://example.dk/done', archived: true }
]) bookmarkNames.has(bookmark.name) ? there() : step('bookmark', await call('POST', '/bookmarks', bookmark))
const lamp = (await listed(false)).find(b => b.name === 'Lamp without a category')
if (lamp && !lamp.photoId) step('bookmark picture', await call('POST', `/bookmarks/${lamp.id}/photo`, undefined, upload('lamp.png', 'image/png', png(300, 200, [210, 190, 120]), 'file')))

console.log([...made].map(([k, n]) => `${n} ${k}`).join(', '))
