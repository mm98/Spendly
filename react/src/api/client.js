

import * as seed from './seed.js'

const STORAGE_PREFIX = 'spendly.'
const LATENCY = [90, 260]

const wait = signal => new Promise((resolve, reject) => {
	const ms = LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0])
	const timer = setTimeout(resolve, ms)
	if (!signal) return
	if (signal.aborted) { clearTimeout(timer); reject(abortError()); return }
	signal.addEventListener('abort', () => { clearTimeout(timer); reject(abortError()) }, { once: true })
})

const abortError = () => {
	const e = new Error('Request aborted')
	e.name = 'AbortError'
	return e
}

const copy = value => structuredClone(value)

const read = (key, fallback) => {
	try {
		const raw = localStorage.getItem(STORAGE_PREFIX + key)
		return raw === null ? fallback : JSON.parse(raw)
	} catch { return fallback }
}

const write = (key, value) => {
	try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)) } catch { }
}

const store = {
	orders: copy(seed.orders),
	vendors: copy(seed.vendors),
	categories: copy(seed.categories),
	period: copy(seed.period),
	periods: copy(seed.periods),
	settings: { ...copy(seed.defaultSettings), ...read('settings', {}) },
	uploads: {}
}

const applyStored = (list, stored) => {
	if (!stored) return list
	const removed = new Set(stored.removed ?? [])
	const patched = list
		.filter(x => !removed.has(x.id))
		.map(x => ({ ...x, ...(stored.patched?.[x.id] ?? {}) }))
	return [...patched, ...(stored.added ?? [])]
}
store.vendors = applyStored(store.vendors, read('vendors', null))
store.categories = applyStored(store.categories, read('categories', null))

const persistList = (key, list, seeded) => {
	const seedIds = new Set(seeded.map(x => x.id))
	write(key, {
		added: list.filter(x => !seedIds.has(x.id)),
		removed: seeded.filter(x => !list.some(y => y.id === x.id)).map(x => x.id),
		patched: Object.fromEntries(list.filter(x => seedIds.has(x.id)).map(x => [x.id, x]))
	})
}

store.orders = applyStored(store.orders, read('orders', null))

const vendorOf = order => store.vendors.find(v => v.id === order.vendorId)
const categoriesOf = order => order.categoryIds.map(id => store.categories.find(c => c.id === id)).filter(Boolean)

const itemsTotal = order => order.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

const decorate = order => {
	const vendor = vendorOf(order)
	const partial = order.itemCountOverride != null
	const subtotal = order.totalOverride != null ? order.totalOverride - order.shipping : itemsTotal(order)
	const paid = itemsTotal(order)
	const retail = order.items.reduce((sum, i) => sum + (i.retail ?? i.price) * i.quantity, 0)
	const saved = partial ? order.saved : retail - paid
	return {
		...copy(order),
		vendor: vendor ? { id: vendor.id, name: vendor.name, initials: vendor.initials, colour: vendor.colour } : null,
		categories: categoriesOf(order).map(c => ({ id: c.id, name: c.name, colour: c.colour, icon: c.icon })),
		itemCount: order.itemCountOverride ?? order.items.length,
		subtotal,
		total: subtotal + order.shipping,
		saved,
		savedPercent: partial ? order.savedPercent : (retail > 0 ? (saved / retail) * 100 : 0)
	}
}

const byDateDescending = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)

const SORTERS = {
	'date-desc': byDateDescending,
	'date-asc': (a, b) => -byDateDescending(a, b),
	'amount-desc': (a, b) => b.total - a.total,
	'amount-asc': (a, b) => a.total - b.total,
	'vendor-asc': (a, b) => (a.vendor?.name ?? '').localeCompare(b.vendor?.name ?? '')
}

export const sorts = seed.sorts

export async function getVendors(signal) {
	await wait(signal)
	return copy(store.vendors)
}

export async function getCategories(signal) {
	await wait(signal)
	return copy(store.categories)
}

export async function getOrders({ query = '', vendorId = '', categoryId = '', status = 'Any',
	kind = '', from = '', to = '', minAmount = null, maxAmount = null, limit = null,
	sort = 'date-desc', page = 1, pageSize = null } = {}, signal) {
	await wait(signal)
	const needle = query.trim().toLowerCase()
	const all = store.orders.map(decorate)
	const matches = all.filter(o => {
		if (vendorId && o.vendorId !== vendorId) return false
		if (categoryId && !o.categoryIds.includes(categoryId)) return false
		if (status !== 'Any' && o.status !== status) return false
		if (kind && o.kind !== kind) return false
		if (from && o.date < from) return false
		if (to && o.date > to) return false
		if (minAmount != null && o.total < minAmount) return false
		if (maxAmount != null && o.total > maxAmount) return false
		if (!needle) return true
		return o.vendor?.name.toLowerCase().includes(needle)
			|| o.categories.some(c => c.name.toLowerCase().includes(needle))
			|| o.items.some(i => i.title.toLowerCase().includes(needle))
			|| (o.note || '').toLowerCase().includes(needle)
	}).sort(SORTERS[sort] ?? byDateDescending)

	const size = pageSize ?? limit ?? matches.length
	const pages = Math.max(1, Math.ceil(matches.length / Math.max(1, size)))
	const at = Math.min(Math.max(1, page), pages)
	return {
		orders: matches.slice((at - 1) * size, at * size),
		matched: matches.length,
		total: store.orders.length,
		page: at,
		pages,
		from: matches.length ? (at - 1) * size + 1 : 0,
		to: Math.min(at * size, matches.length)
	}
}

export async function getOrder(id, signal) {
	await wait(signal)
	const order = store.orders.find(o => o.id === id)
	if (!order) {
		const e = new Error('No order ' + id)
		e.status = 404
		throw e
	}
	return decorate(order)
}

const persistOrders = () => persistList('orders', store.orders, seed.orders)

const fromDraft = (draft, base = {}) => ({
	...base,
	vendorId: store.vendors.find(v => v.name.toLowerCase() === String(draft.vendor).trim().toLowerCase())?.id
		?? base.vendorId ?? 'matas',
	date: draft.date,
	status: draft.status || 'Delivered',
	kind: draft.kind || 'Expense',
	categoryIds: (draft.categories || [])
		.map(name => store.categories.find(c => c.name.toLowerCase() === String(name).toLowerCase())?.id)
		.filter(Boolean),
	shipping: draft.shipping ? Number(String(draft.shipping).replace(/\./g, '').replace(',', '.')) : 0,
	note: draft.note || '',
	reference: draft.reference || '',
	items: (draft.items || []).map((i, n) => ({ ...i, id: i.id || 'i-new-' + n })),
	attachments: base.attachments ?? []
})

export async function createOrder(draft, signal) {
	await wait(signal)
	const order = fromDraft(draft, { id: 'o-' + Date.now().toString(36) })
	store.orders = [order, ...store.orders]
	persistOrders()
	return decorate(order)
}

export async function updateOrder(id, draft, signal) {
	await wait(signal)
	const at = store.orders.findIndex(o => o.id === id)
	if (at < 0) { const e = new Error('No order ' + id); e.status = 404; throw e }
	const { itemCountOverride, totalOverride, saved, savedPercent, ...rest } = store.orders[at]
	store.orders[at] = fromDraft(draft, rest)
	persistOrders()
	return decorate(store.orders[at])
}

export async function deleteOrder(id, signal) {
	await wait(signal)
	store.orders = store.orders.filter(o => o.id !== id)
	persistOrders()
	return { id }
}

const fileSize = bytes => {
	const kb = Math.max(1, Math.round((bytes ?? 0) / 1024))
	return kb > 1024 ? (kb / 1024).toFixed(1).replace('.', ',') + ' MB' : kb + ' KB'
}

export async function addAttachments(orderId, files, signal) {
	await wait(signal)
	const order = store.orders.find(o => o.id === orderId)
	if (!order) { const e = new Error('No order ' + orderId); e.status = 404; throw e }
	const list = Array.isArray(files) ? files : [files]
	const seen = new Set(order.attachments.map(a => a.name.toLowerCase()))
	const added = []
	const skipped = []
	for (const [n, file] of list.entries()) {
		if (seen.has(file.name.toLowerCase())) { skipped.push(file.name); continue }
		seen.add(file.name.toLowerCase())
		added.push({
			id: 'a-' + Date.now().toString(36) + '-' + n,
			name: file.name,
			kind: file.kind ?? (/\.pdf$/i.test(file.name) ? 'pdf' : 'image'),
			meta: `Added today · ${fileSize(file.size)}`
		})
	}
	order.attachments = [...order.attachments, ...added]
	persistOrders()
	return { order: decorate(order), added, skipped }
}

export async function removeAttachment(orderId, attachmentId, signal) {
	await wait(signal)
	const order = store.orders.find(o => o.id === orderId)
	if (!order) { const e = new Error('No order ' + orderId); e.status = 404; throw e }
	order.attachments = order.attachments.filter(a => a.id !== attachmentId)
	persistOrders()
	return decorate(order)
}

export async function createVendor(name, look = {}, signal) {
	await wait(signal)
	const clean = String(name).trim()
	if (!clean) { const e = new Error('A vendor needs a name.'); e.status = 400; throw e }
	if (store.vendors.some(v => v.name.toLowerCase() === clean.toLowerCase())) {
		const e = new Error('You already have a vendor called ' + clean + '.')
		e.status = 409
		throw e
	}
	const vendor = {
		id: 'v-' + clean.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36),
		name: clean,
		initials: look.initials ?? clean.slice(0, 2).toUpperCase(),
		colour: look.colour ?? ['#235553', '#877364', '#177DA7', '#AD620D', '#8453F5', '#4F5BD5'][
			[...clean].reduce((n, c) => n + c.charCodeAt(0), 0) % 6],
		orders: 0, spend: 0, saved: 0, favourite: Boolean(look.favourite)
	}
	store.vendors = [...store.vendors, vendor]
	persistList('vendors', store.vendors, seed.vendors)
	return copy(vendor)
}

export async function getVendor(id, signal) {
	await wait(signal)
	const vendor = store.vendors.find(v => v.id === id)
	if (!vendor) { const e = new Error('No vendor ' + id); e.status = 404; throw e }
	return copy(vendor)
}

export async function updateVendor(id, patch, signal) {
	await wait(signal)
	const vendor = store.vendors.find(v => v.id === id)
	if (!vendor) { const e = new Error('No vendor ' + id); e.status = 404; throw e }
	Object.assign(vendor, patch)
	persistList('vendors', store.vendors, seed.vendors)
	return copy(vendor)
}

export async function deleteVendor(id, signal) {
	await wait(signal)
	if (store.orders.some(o => o.vendorId === id)) {
		const e = new Error('That vendor still has orders.')
		e.status = 409
		throw e
	}
	store.vendors = store.vendors.filter(v => v.id !== id)
	persistList('vendors', store.vendors, seed.vendors)
	return { id }
}

export async function createCategory(name, look = {}, signal) {
	await wait(signal)
	const clean = String(name).trim()
	if (!clean) { const e = new Error('A category needs a name.'); e.status = 400; throw e }
	if (store.categories.some(c => c.name.toLowerCase() === clean.toLowerCase())) {
		const e = new Error('You already have a category called ' + clean + '.')
		e.status = 409
		throw e
	}
	const category = {
		id: 'c-' + clean.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36),
		name: clean,
		icon: look.icon ?? 'tag',
		iconPath: look.iconPath ?? null,
		colour: look.colour ?? 'var(--icon-red)',
		spend: 0, share: 0, saved: 0, budget: Number(look.budget) || 0
	}
	store.categories = [...store.categories, category]
	persistList('categories', store.categories, seed.categories)
	return copy(category)
}

export async function getCategory(id, signal) {
	await wait(signal)
	const category = store.categories.find(c => c.id === id)
	if (!category) { const e = new Error('No category ' + id); e.status = 404; throw e }
	return copy(category)
}

export async function updateCategory(id, patch, signal) {
	await wait(signal)
	const category = store.categories.find(c => c.id === id)
	if (!category) { const e = new Error('No category ' + id); e.status = 404; throw e }
	Object.assign(category, patch)
	persistList('categories', store.categories, seed.categories)
	return copy(category)
}

export async function deleteCategory(id, signal) {
	await wait(signal)
	const used = store.orders.filter(o => o.categoryIds.includes(id)).length
	if (used) {
		const e = new Error(`That category is on ${used} order${used === 1 ? '' : 's'}.`)
		e.status = 409
		throw e
	}
	store.categories = store.categories.filter(c => c.id !== id)
	persistList('categories', store.categories, seed.categories)
	return { id }
}

export async function getSettings(signal) {
	await wait(signal)
	return copy(store.settings)
}

export async function saveSettings(patch, signal) {
	await wait(signal)
	store.settings = { ...store.settings, ...patch }
	write('settings', store.settings)
	return copy(store.settings)
}

export async function resetStoredData(signal) {
	await wait(signal)
	for (const key of ['orders', 'cards', 'vendors', 'categories', 'settings']) {
		try { localStorage.removeItem(STORAGE_PREFIX + key) } catch { }
	}
	return { cleared: true }
}

export async function getDashboardCards(signal) {
	await wait(signal)
	const stored = read('cards', null)
	const known = seed.dashboardCards.map(c => c.key)
	const on = Array.isArray(stored) && stored.length
		? stored.filter(k => known.includes(k))
		: seed.dashboardCards.filter(c => c.on).map(c => c.key)
	return { all: copy(seed.dashboardCards), on }
}

export async function saveDashboardCards(keys, signal) {
	await wait(signal)
	write('cards', keys)
	return { on: [...keys] }
}

export async function getStats(periodId, signal) {
	await wait(signal)
	const at = Math.max(0, store.periods.findIndex(p => p.id === periodId))
	return {
		period: copy(store.periods[at]),
		categories: copy(store.categories),
		at,
		count: store.periods.length,
		newer: at > 0 ? store.periods[at - 1].id : null,
		older: at < store.periods.length - 1 ? store.periods[at + 1].id : null
	}
}

export async function getAnswer(signal) {
	await wait(signal)
	return copy(seed.answers[0])
}

export async function getScanDocuments(signal) {
	await wait(signal)
	return { ...copy(seed.scanDocuments), ...copy(store.uploads) }
}

export async function putScanDocument(file, signal) {
	await wait(signal)
	const key = 'upload-' + Date.now().toString(36)
	const kind = file.kind ?? (/\.pdf$/i.test(file.name) ? 'pdf' : 'image')
	store.uploads[key] = {
		kind,
		name: file.name,
		meta: `${kind === 'pdf' ? 'PDF' : (file.name.split('.').pop() ?? 'FILE').toUpperCase()} · ${fileSize(file.size)}`
	}
	return { key, ...store.uploads[key] }
}

export async function getRecentScans(signal) {
	await wait(signal)
	return copy(seed.recentScans)
}

export async function getScanDraft(documentKey, signal) {
	await wait(signal)
	const file = seed.scanDocuments[documentKey] || store.uploads[documentKey] || seed.scanDocuments.photo
	return { ...copy(seed.scanDraft), file: { ...file, key: documentKey } }
}

export async function getOrderDraft(signal) {
	await wait(signal)
	return { ...copy(seed.orderDraft), kind: store.settings.defaultKind, status: store.settings.defaultStatus }
}

export async function getOrderAsDraft(id, signal) {
	const order = await getOrder(id, signal)
	return {
		vendor: order.vendor?.name ?? '',
		date: order.date,
		status: order.status,
		categories: order.categories.map(c => c.name),
		kind: order.kind,
		shipping: order.shipping ? String(order.shipping).replace('.', ',') : '',
		reference: order.reference ?? '',
		note: order.note ?? '',
		items: order.items
	}
}

export async function getHomeContent(signal) {
	await wait(signal)
	return {
		period: copy(store.period),
		vendors: copy(store.vendors).sort((a, b) => b.spend - a.spend).slice(0, 3),
		categories: copy(store.categories),
		favouriteCategories: copy(store.categories).filter(c => ['groceries', 'household', 'homeoffice'].includes(c.id)),
		onboarding: copy(seed.onboarding),
		showScanCard: store.settings.showScanCard,
		latest: store.orders.map(decorate).sort(byDateDescending).slice(0, 3)
	}
}

export async function getOrdersOverview(signal) {
	await wait(signal)
	return {
		period: copy(store.period),
		latest: store.orders.map(decorate).sort(byDateDescending).slice(0, 4),
		categories: copy(store.categories).slice(0, 4),
		promos: copy(seed.promos),
		question: copy(seed.questionOfTheDay)
	}
}

export async function getVendorsOverview(signal) {
	await wait(signal)
	const latestOf = id => {
		const order = store.orders
			.filter(o => o.vendorId === id)
			.sort(byDateDescending)[0]
		if (!order) return null
		const full = decorate(order)
		return { date: full.date, items: full.itemCount, total: full.total }
	}
	const all = copy(store.vendors).map(v => ({ ...v, latest: latestOf(v.id) }))
	return { favourites: all.filter(v => v.favourite), rest: all.filter(v => !v.favourite) }
}

export async function getCategoriesOverview(signal) {
	await wait(signal)
	return { categories: copy(store.categories), question: copy(seed.questionOfTheDay) }
}

const highlight = (text, needle) => {
	const at = text.toLowerCase().indexOf(needle)
	return at < 0
		? { before: text, mark: '', rest: '' }
		: { before: text.slice(0, at), mark: text.slice(at, at + needle.length), rest: text.slice(at + needle.length) }
}

const COMMANDS = [
	{ id: 'cmd-new', label: 'New order', meta: 'Create', to: '/orders/new', keywords: 'new order create add' },
	{ id: 'cmd-scan', label: 'Scan a receipt', meta: 'Create', to: '/scan', keywords: 'scan receipt upload pdf photo ai' },
	{ id: 'cmd-new-vendor', label: 'New vendor', meta: 'Create', to: '/vendors/new', keywords: 'new vendor shop store create add' },
	{ id: 'cmd-new-category', label: 'New category', meta: 'Create', to: '/categories/new', keywords: 'new category tag budget create add' },
	{ id: 'cmd-orders', label: 'All orders', meta: 'Go to', to: '/orders/all', keywords: 'orders list all search filter' },
	{ id: 'cmd-vendors', label: 'Vendors', meta: 'Go to', to: '/vendors', keywords: 'vendors shops stores' },
	{ id: 'cmd-categories', label: 'Categories', meta: 'Go to', to: '/categories', keywords: 'categories tags manage' },
	{ id: 'cmd-stats', label: 'Statistics', meta: 'Go to', to: '/stats', keywords: 'statistics stats charts month period' },
	{ id: 'cmd-settings', label: 'Order settings', meta: 'Go to', to: '/settings', keywords: 'settings preferences defaults reset' },
	{ id: 'cmd-home', label: 'Home', meta: 'Go to', to: '/', keywords: 'home dashboard cards' }
]

export async function search(query, signal) {
	await wait(signal)
	const needle = query.trim().toLowerCase()
	if (!needle) {
		return { query, groups: [{ heading: 'Commands', options: COMMANDS.slice(0, 5)
			.map(c => ({ id: c.id, ...highlight(c.label, ''), meta: c.meta, to: c.to })) }] }
	}

	const groups = []
	const take = (heading, options) => { if (options.length) groups.push({ heading, options }) }

	const orders = store.orders.map(decorate)

	take('Orders', orders
		.filter(o => o.vendor?.name.toLowerCase().includes(needle))
		.sort(byDateDescending).slice(0, 4)
		.map(o => ({ id: o.id, ...highlight(`${o.vendor.name} · ${dayMonth(o.date)}`, needle),
			meta: krLabel(o.total), to: `/orders/${o.id}` })))

	take('Vendors', store.vendors
		.filter(v => v.name.toLowerCase().includes(needle)).slice(0, 3)
		.map(v => ({ id: v.id, ...highlight(v.name, needle),
			meta: `${v.orders} orders · ${krLabel(v.spend, 0)}`, to: `/orders/all?vendor=${v.id}` })))

	take('Categories', store.categories
		.filter(c => c.name.toLowerCase().includes(needle)).slice(0, 3)
		.map(c => ({ id: c.id, ...highlight(c.name, needle),
			meta: `${c.share}% of expenses`, to: `/orders/all?category=${c.id}` })))

	const lines = []
	for (const o of orders) {
		for (const i of o.items) {
			if (!i.title.toLowerCase().includes(needle)) continue
			lines.push({ id: o.id + '-' + i.id, ...highlight(`"${i.title}"`, needle),
				meta: `${o.vendor?.name} · ${dayMonth(o.date)}`, to: `/orders/${o.id}` })
			if (lines.length === 4) break
		}
		if (lines.length === 4) break
	}
	take('Item lines', lines)

	take('Notes', orders
		.filter(o => (o.note || '').toLowerCase().includes(needle)).slice(0, 3)
		.map(o => ({ id: o.id + '-note', ...highlight(`"${o.note}"`, needle),
			meta: `${o.vendor?.name} · ${dayMonth(o.date)}`, to: `/orders/${o.id}` })))

	take('Commands', COMMANDS
		.filter(c => c.label.toLowerCase().includes(needle) || c.keywords.includes(needle)).slice(0, 4)
		.map(c => ({ id: c.id, ...highlight(c.label, needle), meta: c.meta, to: c.to })))

	return { query, groups }
}

const krLabel = (n, decimals = 2) => {
	const fixed = Math.abs(n).toFixed(decimals)
	const [whole, rest] = fixed.split('.')
	return whole.replace(/\B(?=(\d{3})+$)/g, '.') + (rest ? ',' + rest : '') + ' kr.'
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December']
const dayMonth = iso => {
	const [, m, d] = iso.split('-')
	return Number(d) + ' ' + MONTHS[Number(m) - 1]
}

export const spendKinds = seed.spendKinds
