/* A test account with the cases real accounts have and the demo data does not: a limit nobody
   has spent, a limit passed, a limit nearly reached, a favourite never used, an order that
   waited past two weeks, look-alike vendors, an archived vendor, more categories than a page
   holds, names too long for a row, icons drawn with filled shapes, an account name and an address too long for a line, every status, a receipt and none, a note and none, bookmarks with and
   without a category and more than a page of them, more drafts than Home shows, one with no vendor and no prices, drafts made by hand.

   Needs the API up (npm run dev in api/, PORT 4000). Run it after the app's own demo data, which
   it fills first on a new account:
     node scripts/edge-account.mjs [email] [password]
   Safe to run again: what exists is left alone, and every step says what happened. */

import { crc32, deflateSync } from 'node:zlib'

const BASE = process.env.SPENDLY_API ?? 'http://localhost:4000'
// long on purpose: an address on one line keeps its domain, and inside a sentence it wraps (9c, 20b)
const email = process.argv[2] ?? 'edge.account.with.a.long.address@a-rather-long-company-name.example.com'
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

// one signed-in account each: the edge account, and the empty one that must see none of it
const session = () => {
	let cookie = ''
	return async (method, path, body, form) => {
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
}
const call = session()
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
// every page of a list, a hundred at a time
const pagesOf = async (path, key) => {
	const all = []
	for (let page = 1; ; page++) {
		const got = (await call('GET', `${path}${path.includes('?') ? '&' : '?'}pageSize=100&page=${page}`)).data
		all.push(...(got?.[key] ?? []))
		if (!got?.[key]?.length || page * 100 >= (got.matched ?? got.total ?? 0)) break
	}
	return all
}

let r = await call('POST', '/auth/register', { email, password })
const isNew = r.status === 201
if (!isNew) r = await call('POST', '/auth/login', { email, password })
if (r.status >= 300) throw new Error(`sign in: ${r.status} ${JSON.stringify(r.data)}`)
console.log(`${isNew ? 'registered' : 'signed in as'} ${email}`)
if (isNew) {
	r = await call('POST', '/demo-data', { seed: 1, months: 14, orders: 60 })
	console.log('demo data', r.status)
}
// a name that has to be cut on one line, and wraps in Home's greeting
step('account name', await call('PATCH', '/account', { name: 'Maximiliane-Alexandrina Kristensen-Vestergaard' }))

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
// icons with filled dots, and one that is a filled shape only
await makeCategory('Icon with dots', { icon: 'dice-5' })
await makeCategory('Icon filled only', { icon: 'percentage-100' })
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
// a file on an order goes the app's way: uploaded, then filed on the order
const fileOn = async (orderId, name, type, bytes) => {
	const sent = await call('POST', '/scan/documents', undefined, upload(name, type, bytes, 'file'))
	return sent.data?.key ? call('POST', `/scan/documents/${sent.data.key}/attach/${orderId}?as=file`) : sent
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
await order('With a note', { vendor: 'Alias shop', date: day(-11),
	note: 'A note long enough to be cut in any row it is shown in, and a second line after it\nThe second line' })
const withNote = await order('With a note and a receipt', { vendor: 'Alias shop', date: day(-11), note: 'Short note' })
if (withNote) step('receipt beside a note', await fileOn(withNote.id, 'receipt.png', 'image/png', png(60, 90, [235, 235, 225])))
if (withReceipt) step('receipt picture', await fileOn(withReceipt.id, 'receipt.png', 'image/png', png(60, 90, [235, 235, 225])))
const withPdf = await order('With a PDF receipt', { vendor: 'Alias shop', date: day(-12) })
if (withPdf) step('receipt PDF', await fileOn(withPdf.id, 'receipt.pdf', 'application/pdf', pdf()))
// a line with its own photo
const photoOrder = await order('With a line photo', { vendor: 'Alias shop', date: day(-15), items: [{ title: 'A line with a photo', quantity: 1, price: 250 }] })
if (photoOrder) step('line photo', await call('POST', `/orders/${photoOrder.id}/items/${photoOrder.items[0].id}/attachments`, undefined, upload('line.png', 'image/png', png(80, 80, [120, 160, 200]))))
// a vendor with a picture
const pictured = (await call('GET', '/vendors?name=Edge%20favourite%20shop&pageSize=1')).data?.vendors?.[0]
if (pictured && (await call('GET', `/vendors/${pictured.id}/image/square-256`)).status === 404) {
	step('vendor picture', await call('PUT', `/vendors/${pictured.id}/image`, undefined, upload('logo.png', 'image/png', png(200, 200, [30, 90, 60]), 'file')))
}

// drafts: more scans than Home shows, and one left with no vendor, a line with no price and a file added
const draftFiles = new Set(((await call('GET', '/drafts?limit=10')).data?.drafts ?? []).map(d => d.draft?.file?.name).filter(Boolean))
const scan = async (name, bytes) => {
	if (draftFiles.has(name)) { there(); return null }
	return step(`scan ${name}`, await call('POST', '/scan/documents?scan=1', undefined, upload(name, 'image/png', bytes, 'file'))).data
}
for (const n of [1, 2, 3]) await scan(`edge-scan-${n}.png`, png(40 + n, 60, [250, 250 - n, 240]))
const unpriced = await scan('a-receipt-photo-with-a-file-name-long-enough-to-be-cut-in-its-row.png', png(50, 70, [230, 230, 230]))
if (unpriced?.draftId) {
	const added = step('file added to a draft', await call('POST', '/scan/documents', undefined, upload('added.pdf', 'application/pdf', pdf(), 'file'))).data
	step('draft with no vendor and no prices', await call('PUT', `/drafts/${unpriced.draftId}`, { form: {
		values: { vendor: '', date: day(0), kind: 'Expense', categories: [], shipping: 0, discount: 0, reference: '', note: '' },
		lines: [{ key: 'edge-unpriced', title: 'A line with no price yet', quantity: 1, price: null, include: true }],
		files: added ? [{ key: added.key, name: 'added.pdf', kind: 'pdf', hasThumbnail: added.hasThumbnail }] : []
	} }))
}
// drafts made by hand: one with nothing chosen yet, and a copy of an order whose line has a photo
const handDrafts = async note => ((await call('GET', `/orders?status=Draft&pageSize=10&query=${encodeURIComponent(note)}`)).data?.matched ?? 0) > 0
const handValues = note => ({ vendor: '', date: day(0), status: 'Delivered', kind: 'Expense', categories: [], shipping: null, discount: null, reference: '', note, refunded: false })
if (await handDrafts('edge: hand draft')) there()
else step('draft made by hand', await call('POST', '/drafts', { form: { values: handValues('edge: hand draft'), lines: [], files: [] } }))
const copied = (await call('GET', `/orders?pageSize=1&query=${encodeURIComponent('edge: With a line photo')}`)).data?.orders?.[0]
const source = copied && (await call('GET', `/orders/${copied.id}`)).data
if (await handDrafts('edge: copy draft')) there()
else if (source) step('copy kept as a draft', await call('POST', '/drafts', { form: {
	values: { ...handValues('edge: copy draft'), vendor: source.vendor?.name ?? '' },
	lines: source.items.map((item, i) => {
		const photo = item.attachments?.find(a => a.kind === 'image') ?? null
		return { key: `copy-${i}`, title: item.title, quantity: item.quantity, price: item.price, retail: item.retail ?? null, note: '', url: '', include: true,
			photo: photo && { id: photo.id, name: photo.name, hasThumbnail: photo.hasThumbnail },
			copiedFrom: photo && { orderId: source.id, itemId: item.id, attachmentId: photo.id } }
	}),
	files: [],
	origin: { copy: { id: source.id, vendor: source.vendor?.name ?? '', date: source.date, files: (source.attachments?.length ?? 0) > 0 } }
} }))

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
	// the longest name a row takes, beside an amount being typed on a phone
	const longest = { name: 'A budget row with the longest name a row can take, next to an amount being typed', months: Array(12).fill(400) }
	for (const line of [{ name: 'Rent', months: Array(12).fill(7500) }, { name: 'Gym', months: Array(12).fill(null) }, longest])
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

// bookmarks: with and without a category, an archived one, and more than a hundred, so Load more is met at every page size
const listed = archived => pagesOf(`/bookmarks${archived ? '?archived=yes' : ''}`, 'bookmarks')
const bookmarkNames = new Set([...(await listed(false)), ...(await listed(true))].map(b => b.name))
for (const bookmark of [
	{ name: 'Chair with a category', url: 'https://example.dk/chair', price: '1499', categories: ['Favourite with limit'] },
	{ name: 'Lamp without a category', url: 'https://example.dk/lamp' },
	{ name: 'Bought already', url: 'https://example.dk/done', archived: true },
	...crowded.map(n => ({ name: `Crowd bookmark ${n}`, url: `https://example.dk/crowd-${n}`, price: String(50 + Number(n)) }))
]) bookmarkNames.has(bookmark.name) ? there() : step('bookmark', await call('POST', '/bookmarks', bookmark))
const lamp = (await listed(false)).find(b => b.name === 'Lamp without a category')
if (lamp && !lamp.photoId) step('bookmark picture', await call('POST', `/bookmarks/${lamp.id}/photo`, undefined, upload('lamp.png', 'image/png', png(300, 200, [210, 190, 120]), 'file')))
// the ten newest crowd bookmarks carry a picture larger than the copy a phone is sent, so Bookmarks opens on cards with pictures
const newest = new Set(crowded.slice(-10).map(n => `Crowd bookmark ${n}`))
for (const b of (await listed(false)).filter(b => newest.has(b.name) && !b.photoId))
	step('bookmark picture', await call('POST', `/bookmarks/${b.id}/photo`, undefined, upload('crowd.png', 'image/png', png(1600, 1200, [90, 140, 110]), 'file')))

console.log([...made].map(([k, n]) => `${n} ${k}`).join(', '))

/* ---- nothing of this account reaches another one ---- */

// every record this account holds, by the addresses that open it
const orders = await pagesOf('/orders', 'orders')
const vendors = await pagesOf('/vendors', 'vendors')
const categories = (await call('GET', '/categories')).data ?? []
const bookmarks = [...(await listed(false)), ...(await listed(true))]
const views = (await call('GET', '/views')).data?.views ?? []
const drafts = orders.filter(o => o.draft)
const files = []
for (const o of orders.filter(o => o.fileCount || o.photo)) {
	const full = (await call('GET', `/orders/${o.id}`)).data
	for (const a of full?.attachments ?? []) files.push(`/orders/${o.id}/attachments/${a.id}/file`, `/orders/${o.id}/attachments/${a.id}/thumbnail`)
	for (const item of full?.items ?? []) for (const a of item.attachments ?? []) files.push(`/orders/${o.id}/items/${item.id}/attachments/${a.id}/file`)
}
const scans = drafts.map(d => d.draft.file?.key).filter(Boolean)
const before = JSON.stringify({ orders: orders.length, drafts: drafts.map(d => d.id).sort(), vendors: vendors.length, categories: categories.length, bookmarks: bookmarks.length })

const other = session()
const otherEmail = email.replace('@', '+other@')
r = await other('POST', '/auth/register', { email: otherEmail, password })
if (r.status !== 201) r = await other('POST', '/auth/login', { email: otherEmail, password })
if (r.status >= 300) throw new Error(`sign in as the other account: ${r.status} ${JSON.stringify(r.data)}`)

const leaks = []
const ids = new Set([...orders, ...vendors, ...categories, ...bookmarks, ...views].map(x => x.id))
// anything that answers with this account's own records is a leak, whatever its status
const refused = async (method, path, body) => {
	const got = await other(method, path, body)
	if (got.status >= 200 && got.status < 300) leaks.push(`${method} ${path} answered ${got.status}`)
}
const unseen = async path => {
	const text = JSON.stringify((await other('GET', path)).data ?? '')
	const seen = [...ids].filter(id => text.includes(id))
	if (seen.length) leaks.push(`GET ${path} lists ${seen.length} of the edge account's records`)
}
for (const o of orders) await refused('GET', `/orders/${o.id}`)
for (const d of drafts) await refused('GET', `/drafts/${d.id}`)
for (const v of vendors) await refused('GET', `/vendors/${v.id}`)
for (const c of categories) await refused('GET', `/categories/${c.id}`)
for (const b of bookmarks) await refused('GET', `/bookmarks/${b.id}`)
for (const path of files) await refused('GET', path)
for (const key of scans) for (const path of [`/scan/draft/${key}?draft=1`, `/scan/documents/${key}/file`, `/scan/documents/${key}/thumbnail`]) await refused('GET', path)
for (const path of ['/orders?pageSize=100', '/orders?status=Draft&pageSize=100', '/drafts?limit=10', '/vendors?pageSize=100', '/categories', '/bookmarks?pageSize=100', '/views', '/search?query=edge', '/search?query=shop'])
	await unseen(path)
// changing or removing them is refused too, and the edge account's records are counted again after
for (const d of drafts) {
	await refused('PUT', `/drafts/${d.id}`, { form: { values: {}, lines: [], files: [] } })
	await refused('DELETE', `/drafts/${d.id}`)
	await refused('DELETE', `/orders/${d.id}`)
}
for (const key of scans) await refused('POST', `/scan/documents/${key}/reread`)
for (const o of orders.filter(o => !o.draft).slice(0, 5)) await refused('DELETE', `/orders/${o.id}`)
for (const v of vendors.slice(0, 5)) await refused('PATCH', `/vendors/${v.id}`, { favourite: 1 })
for (const c of categories.slice(0, 5)) await refused('PATCH', `/categories/${c.id}`, { favourite: 1 })
for (const b of bookmarks.slice(0, 3)) await refused('PATCH', `/bookmarks/${b.id}`, { name: 'Taken' })
for (const v of views.slice(0, 3)) await refused('PATCH', `/views/${v.id}`, { name: 'Taken' })
// the same bytes scanned by the other account know nothing of this one's reading, draft or orders
for (const [name, bytes] of [['edge-scan-1.png', png(41, 60, [250, 249, 240])], ['receipt.png', png(60, 90, [235, 235, 225])]]) {
	const got = await other('POST', '/scan/documents?scan=1', undefined, upload(name, 'image/png', bytes, 'file'))
	if (got.data?.seen) leaks.push(`the other account's scan of ${name} says it was seen before`)
	if (got.data?.draftId) await other('DELETE', `/drafts/${got.data.draftId}`)
}
const after = (await pagesOf('/orders', 'orders'))
const kept = JSON.stringify({ orders: after.length, drafts: after.filter(o => o.draft).map(d => d.id).sort(), vendors: (await pagesOf('/vendors', 'vendors')).length,
	categories: ((await call('GET', '/categories')).data ?? []).length, bookmarks: [...(await listed(false)), ...(await listed(true))].length })
if (kept !== before) leaks.push(`the edge account changed while the other account probed it: ${before} became ${kept}`)
for (const leak of leaks) console.log(`LEAK ${leak}`)
console.log(`${otherEmail}: ${ids.size + files.length + scans.length} records probed, ${leaks.length} leaks`)
if (leaks.length) process.exitCode = 1
