/* The real API client.

   Was a phantom in-memory store (seeded from ./seed.js, persisted as diffs in localStorage);
   is now a thin fetch() wrapper around the Express + SQLite backend in api/. Every exported
   function keeps its original name and signature — useApi.js keys its cache off `fn.name`, and
   every page already calls this module by these names — so nothing above this file changed to
   make the swap. seed.js is no longer imported: the data it held is now real rows on the
   server, seeded once per account at registration (api/src/seed.js).

   The dev server proxies /api to the API process (see vite.config.js), so every path here is
   relative. `credentials: 'include'` carries the session cookie on every request. */

import { dayMonth, parseAmount } from './format.js'

class ApiError extends Error {
	constructor(message, status, fields) {
		super(message)
		this.name = 'ApiError'
		this.status = status
		this.fields = fields
	}
}

const qs = params => {
	const usp = new URLSearchParams()
	for (const [k, v] of Object.entries(params ?? {})) if (v !== '' && v != null) usp.set(k, String(v))
	const s = usp.toString()
	return s ? '?' + s : ''
}

async function request(path, { method = 'GET', body, signal, form } = {}) {
	const res = await fetch(path, {
		method, signal, credentials: 'include',
		headers: form || body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: form ?? (body === undefined ? undefined : JSON.stringify(body))
	})
	if (res.status === 204) return null
	let data = null
	try { data = await res.json() } catch { /* empty body */ }
	if (!res.ok) throw new ApiError(data?.error || res.statusText || 'Request failed', res.status, data?.fields)
	return data
}

/* ---- auth ---- */

export async function register(email, password, signal) {
	return request('/api/auth/register', { method: 'POST', body: { email, password }, signal })
}

export async function login(email, password, signal) {
	return request('/api/auth/login', { method: 'POST', body: { email, password }, signal })
}

export async function logout(signal) {
	return request('/api/auth/logout', { method: 'POST', signal })
}

export async function getCurrentUser(signal) {
	return request('/api/auth/me', { signal })
}

/* ---- vendors ---- */

export async function getVendors(signal) {
	return request('/api/vendors', { signal })
}

export async function createVendor(name, look = {}, signal) {
	return request('/api/vendors', { method: 'POST', body: { name, look }, signal })
}

export async function getVendor(id, signal) {
	return request(`/api/vendors/${id}`, { signal })
}

export async function updateVendor(id, patch, signal) {
	return request(`/api/vendors/${id}`, { method: 'PATCH', body: patch, signal })
}

export async function deleteVendor(id, signal) {
	return request(`/api/vendors/${id}`, { method: 'DELETE', signal })
}

export async function getVendorsOverview(signal) {
	const { top, total } = await request('/api/vendors/overview', { signal })
	return { favourites: top.filter(v => v.favourite), rest: top.filter(v => !v.favourite), total }
}

/* ---- categories ---- */

export async function getCategories(signal) {
	return request('/api/categories', { signal })
}

export async function createCategory(name, look = {}, signal) {
	return request('/api/categories', { method: 'POST', body: { name, look }, signal })
}

export async function getCategory(id, signal) {
	return request(`/api/categories/${id}`, { signal })
}

export async function updateCategory(id, patch, signal) {
	return request(`/api/categories/${id}`, { method: 'PATCH', body: patch, signal })
}

export async function deleteCategory(id, signal) {
	return request(`/api/categories/${id}`, { method: 'DELETE', signal })
}

export async function getCategoriesOverview(signal) {
	const [{ top }, question] = await Promise.all([
		request('/api/categories/overview', { signal }),
		getAnswer(signal)
	])
	return { categories: top, question: question ?? { short: 'Ask Spendly about your spending.' } }
}

/* ---- orders ----
   A draft's `shipping` arrives from the create/edit form as a comma-formatted string (or ''),
   the same way it always has — parseAmount is what turns "49,00" into 49, and the API wants a
   plain number. Everything else in a draft (vendor name, category names, numeric item fields)
   already matches what the server expects. */

const toApiDraft = draft => ({
	vendor: draft.vendor, date: draft.date, status: draft.status, kind: draft.kind,
	categories: draft.categories ?? [], shipping: draft.shipping ? parseAmount(draft.shipping) : 0,
	reference: draft.reference ?? '', note: draft.note ?? '',
	items: (draft.items ?? []).map(i => ({
		title: i.title, quantity: i.quantity, price: i.price,
		retail: i.retail ?? null, note: i.note ?? ''
	}))
})

export async function getOrders(params = {}, signal) {
	return request('/api/orders' + qs(params), { signal })
}

export async function getOrder(id, signal) {
	return request(`/api/orders/${id}`, { signal })
}

export async function createOrder(draft, signal) {
	return request('/api/orders', { method: 'POST', body: toApiDraft(draft), signal })
}

export async function updateOrder(id, draft, signal) {
	return request(`/api/orders/${id}`, { method: 'PUT', body: toApiDraft(draft), signal })
}

export async function deleteOrder(id, signal) {
	return request(`/api/orders/${id}`, { method: 'DELETE', signal })
}

/** Takes real File objects (from a picker or a drop) and uploads their actual bytes — the
    backend stores them for real, unlike the phantom store's name-only record. */
export async function addAttachments(orderId, files, signal) {
	const form = new FormData()
	for (const file of files) form.append('files', file)
	return request(`/api/orders/${orderId}/attachments`, { method: 'POST', form, signal })
}

export async function removeAttachment(orderId, attachmentId, signal) {
	return request(`/api/orders/${orderId}/attachments/${attachmentId}`, { method: 'DELETE', signal })
}

/** Bulk-imports whole orders (vendor, categories, items, attachment images) from another
    expense-tracking system in one call. Not wired to any page yet — this is the entry point
    for that migration, called directly (a script, a one-off import screen) rather than through
    useApi like the read endpoints above. */
export async function importOrders(orders, signal) {
	return request('/api/orders/import', { method: 'POST', body: { orders }, signal })
}

export async function getOrderDraft(signal) {
	return request('/api/orders/draft', { signal })
}

export async function getOrderAsDraft(id, signal) {
	const order = await getOrder(id, signal)
	return {
		vendor: order.vendor?.name ?? '', date: order.date, status: order.status,
		categories: order.categories.map(c => c.name), kind: order.kind,
		shipping: order.shipping ? String(order.shipping).replace('.', ',') : '',
		reference: order.reference ?? '', note: order.note ?? '', items: order.items
	}
}

/* A month's statistics window, reshaped into the "period" object Home and Orders read — those
   two pages were written against the phantom store's hand-authored per-month record, and this
   is what keeps them working against a real, computed window instead: same field names, real
   numbers underneath. */
const periodFromWindow = w => ({
	label: w.label, shortLabel: w.shortLabel, previousLabel: w.previousLabel,
	spent: w.spent, saved: w.saved, savedPercent: w.savedPercent, retail: w.retail,
	averageOrder: w.average, weekdays: w.rhythm.weekdays,
	busiestDay: w.rhythm.busiestDay, busiestDaySpend: w.rhythm.busiestDaySpend,
	projected: w.pace.projected, daysIn: w.pace.daysIn, previousTotal: w.previousTotal,
	heroLegend: w.split.slice(0, 3),
	series: { cumulative: w.series.current, savingsGrowth: w.series.savedCumulative,
		monthCurrent: w.series.current, monthPrevious: w.series.previous }
})

export async function getOrdersOverview(signal) {
	const [{ latest }, { window }, categories, home] = await Promise.all([
		request('/api/orders/overview' + qs({ count: 4 }), { signal }),
		getStats('month', undefined, signal),
		getCategories(signal),
		request('/api/home', { signal })
	])
	const q = home.questionOfTheDay
	return {
		latest, period: periodFromWindow(window), categories: categories.slice(0, 4),
		promos: home.promos,
		question: q ? { long: q.question, short: q.short } : { long: 'Ask Spendly about your spending.', short: 'Ask Spendly' }
	}
}

/* ---- settings / dashboard / account ---- */

export async function getSettings(signal) {
	return request('/api/settings', { signal })
}

export async function saveSettings(patch, signal) {
	return request('/api/settings', { method: 'PATCH', body: patch, signal })
}

export async function resetStoredData(signal) {
	return request('/api/reset', { method: 'POST', signal })
}

export async function getDashboardCards(signal) {
	return request('/api/dashboard-cards', { signal })
}

export async function saveDashboardCards(keys, signal) {
	return request('/api/dashboard-cards', { method: 'PUT', body: { on: keys }, signal })
}

/* ---- statistics / home ---- */

export async function getStats(range, windowId, signal) {
	return request('/api/stats' + qs({ range, windowId }), { signal })
}

export async function getHomeHero(range, signal) {
	return request('/api/home/hero' + qs({ range }), { signal })
}

export async function getHomeContent(signal) {
	const [content, { window }, vendors, categories, settings, overview] = await Promise.all([
		request('/api/home', { signal }),
		getStats('month', undefined, signal),
		getVendors(signal),
		getCategories(signal),
		getSettings(signal),
		getOrdersOverview(signal)
	])
	return {
		period: periodFromWindow(window),
		vendors: [...vendors].sort((a, b) => b.spend - a.spend).slice(0, 3),
		categories,
		// No category ever carries a real "favourite" flag in this schema — nothing in the
		// category form can set one — so this card has nothing to show rather than a stand-in
		// that would claim a preference nobody expressed.
		favouriteCategories: [],
		onboarding: content.onboarding,
		showScanCard: settings.showScanCard,
		latest: overview.latest
	}
}

export async function getAnswer(signal) {
	const content = await request('/api/home', { signal })
	return content.questionOfTheDay
}

/* ---- scan ---- */

export async function getScanDocuments(signal) {
	return request('/api/scan/documents', { signal })
}

/** Uploads the real file that was dropped or picked — the backend keeps its bytes until the
    review step turns it into the new order's own attachment (attachScanDocument below). */
export async function putScanDocument(file, signal) {
	const form = new FormData()
	form.append('file', file)
	return request('/api/scan/documents', { method: 'POST', form, signal })
}

export async function getRecentScans(signal) {
	return request('/api/scan/recent', { signal })
}

export async function getScanDraft(documentKey, signal) {
	return request(`/api/scan/draft/${documentKey}`, { signal })
}

export async function attachScanDocument(documentKey, orderId, signal) {
	return request(`/api/scan/documents/${documentKey}/attach/${orderId}`, { method: 'POST', signal })
}

/* ---- command palette ----
   The server's /api/search matches vendors, categories and orders (by vendor name, note or an
   item's title) against the account's own rows — the same real query getOrders' text search
   runs. Grouping that into headed sections, highlighting the matched substring and mixing in
   the static "go to"/"create" commands is presentation, not data, so it stays here rather than
   asking the server to compose UI. */

const highlight = (text, needle) => {
	if (!needle) return { before: text, mark: '', rest: '' }
	const at = text.toLowerCase().indexOf(needle)
	return at < 0
		? { before: text, mark: '', rest: '' }
		: { before: text.slice(0, at), mark: text.slice(at, at + needle.length), rest: text.slice(at + needle.length) }
}

const krLabel = (n, decimals = 2) => {
	const fixed = Math.abs(n).toFixed(decimals)
	const [whole, rest] = fixed.split('.')
	return whole.replace(/\B(?=(\d{3})+$)/g, '.') + (rest ? ',' + rest : '') + ' kr.'
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
	const needle = query.trim().toLowerCase()
	if (!needle) {
		return { query, groups: [{ heading: 'Commands', options: COMMANDS.slice(0, 5)
			.map(c => ({ id: c.id, ...highlight(c.label, ''), meta: c.meta, to: c.to })) }] }
	}

	const { vendors, categories, orders } = await request('/api/search' + qs({ query }), { signal })
	const groups = []
	const take = (heading, options) => { if (options.length) groups.push({ heading, options }) }

	take('Orders', orders.slice(0, 4)
		.map(o => ({ id: o.id, ...highlight(`${o.vendor?.name} · ${dayMonth(o.date)}`, needle),
			meta: krLabel(o.total), to: `/orders/${o.id}` })))

	take('Vendors', vendors.slice(0, 3)
		.map(v => ({ id: v.id, ...highlight(v.name, needle), meta: 'Vendor', to: `/orders/all?vendor=${v.id}` })))

	take('Categories', categories.slice(0, 3)
		.map(c => ({ id: c.id, ...highlight(c.name, needle), meta: 'Category', to: `/orders/all?category=${c.id}` })))

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

	const vendorCreateOptions = vendors.slice(0, 3).map(v => ({ id: 'cmd-new-order-' + v.id,
		...highlight(`Create order with ${v.name}`, needle), meta: 'Create',
		to: `/orders/new?vendor=${encodeURIComponent(v.name)}` }))

	const staticCommandOptions = COMMANDS
		.filter(c => c.label.toLowerCase().includes(needle) || c.keywords.includes(needle))
		.slice(0, Math.max(0, 4 - vendorCreateOptions.length))
		.map(c => ({ id: c.id, ...highlight(c.label, needle), meta: c.meta, to: c.to }))

	take('Commands', [...vendorCreateOptions, ...staticCommandOptions])

	return { query, groups }
}

/* ---- static option lists (not user data — match api/src/lib/constants.js) ---- */

export const spendKinds = ['Expense', 'Gift', 'Sold', 'Work', 'Other']

export const sorts = [
	{ id: 'date-desc', label: 'Date, newest' },
	{ id: 'date-asc', label: 'Date, oldest' },
	{ id: 'amount-desc', label: 'Amount, highest' },
	{ id: 'amount-asc', label: 'Amount, lowest' },
	{ id: 'vendor-asc', label: 'Vendor, A to Z' }
]

export const ranges = [
	{ key: 'week', label: 'Week', short: 'WK' },
	{ key: 'month', label: 'Month', short: 'MO' },
	{ key: 'quarter', label: 'Quarter', short: 'QT' },
	{ key: 'year', label: 'Year', short: 'YR' },
	{ key: 'all', label: 'All', short: 'ALL' }
]
