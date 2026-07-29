/* The phantom API.

   Every page reads through this module and none of them reach into seed.js, so the whole
   surface a real backend would have to implement is the list of exports below. Each one is
   async and each one takes a little time, because a component written against an instantly
   resolved promise is a component with no loading state -- and the loading state is the
   half that breaks when the fetch is real.

   Mutations write to an in-memory copy of the seed and persist to localStorage where the
   choice is the user's (their dashboard, their orders). Storage being refused is not an
   error worth surfacing: the choice still holds for the session. */

import * as seed from './seed.js'

const STORAGE_PREFIX = 'spendly.'
const LATENCY = [90, 260]   // ms, uniform -- enough to see a skeleton, short enough to use

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

/* Deep-enough copies, so a component that mutates what it was handed cannot corrupt the
   store behind everyone else's back. structuredClone is in every engine this targets. */
const copy = value => structuredClone(value)

const read = (key, fallback) => {
	try {
		const raw = localStorage.getItem(STORAGE_PREFIX + key)
		return raw === null ? fallback : JSON.parse(raw)
	} catch { return fallback }
}

const write = (key, value) => {
	try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)) } catch { /* storage refused */ }
}

/* ---- the store ---- */

const store = {
	orders: copy(seed.orders),
	vendors: copy(seed.vendors),
	categories: copy(seed.categories),
	period: copy(seed.period)
}

/* Orders added in this browser outlive the reload; the seeded ones are not re-persisted,
   so clearing storage returns the prototype to its shipped state. */
store.orders = [...read('orders', []), ...store.orders]

const vendorOf = order => store.vendors.find(v => v.id === order.vendorId)
const categoriesOf = order => order.categoryIds.map(id => store.categories.find(c => c.id === id)).filter(Boolean)

const itemsTotal = order => order.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

/* An order's total is its lines plus shipping. Three of the seeded orders carry more lines
   than the prototype ever printed -- a 23-line Bilka receipt is 23 lines -- so those hold
   an override for the count and the total, and everything else is derived. Deriving where
   we can is what stops a total and its lines from disagreeing after an edit. */
const decorate = order => {
	const vendor = vendorOf(order)
	const partial = order.itemCountOverride != null
	const subtotal = order.totalOverride != null ? order.totalOverride - order.shipping : itemsTotal(order)
	/* What the order saved is derived from the lines wherever the lines are all there. Storing
	   it beside them lets the two disagree, and both halves look right on their own -- a
	   Matas order read 88 kr. saved over five lines that add up to 102. Where the list is
	   partial the stored figure is the receipt's, and the item count says why. */
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

/* ---- endpoints ---- */

export async function getPeriod(signal) {
	await wait(signal)
	return copy(store.period)
}

export async function getVendors(signal) {
	await wait(signal)
	return copy(store.vendors)
}

export async function getCategories(signal) {
	await wait(signal)
	return copy(store.categories)
}

/** The order list, filtered the way the All orders page filters it. */
export async function getOrders({ query = '', vendorId = '', categoryId = '', status = 'Any',
	kind = '', from = '', to = '', minAmount = null, maxAmount = null, limit = null } = {}, signal) {
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
	}).sort(byDateDescending)
	return { orders: limit ? matches.slice(0, limit) : matches, matched: matches.length, total: 142 }
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

/** Saves a draft as an order and hands back the stored record. */
export async function createOrder(draft, signal) {
	await wait(signal)
	const vendor = store.vendors.find(v => v.name.toLowerCase() === String(draft.vendor).trim().toLowerCase())
	const categoryIds = (draft.categories || [])
		.map(name => store.categories.find(c => c.name.toLowerCase() === String(name).toLowerCase())?.id)
		.filter(Boolean)
	const order = {
		id: 'o-' + Date.now().toString(36),
		vendorId: vendor?.id ?? 'matas',
		date: draft.date,
		status: draft.status || 'Delivered',
		kind: draft.kind || 'Expense',
		categoryIds,
		shipping: draft.shipping ? Number(draft.shipping) : 0,
		note: draft.note || '',
		reference: draft.reference || '',
		items: (draft.items || []).map((i, n) => ({ ...i, id: i.id || 'i-new-' + n })),
		attachments: []
	}
	store.orders = [order, ...store.orders]
	write('orders', store.orders.filter(o => !seed.orders.some(s => s.id === o.id)))
	return decorate(order)
}

/** Home's dashboard: which cards are on it, in the user's order. */
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

/** Statistics reads the same period Home does; the extra shape is the page's, not the data's. */
export async function getStats(signal) {
	await wait(signal)
	return { period: copy(store.period), categories: copy(store.categories) }
}

export async function getScanDocuments(signal) {
	await wait(signal)
	return copy(seed.scanDocuments)
}

export async function getRecentScans(signal) {
	await wait(signal)
	return copy(seed.recentScans)
}

/** What the reader hands back once it has finished with the chosen document. */
export async function getScanDraft(documentKey, signal) {
	await wait(signal)
	const file = seed.scanDocuments[documentKey] || seed.scanDocuments.photo
	return { ...copy(seed.scanDraft), file: { ...file, key: documentKey } }
}

export async function getOrderDraft(signal) {
	await wait(signal)
	return copy(seed.orderDraft)
}

export async function getHomeContent(signal) {
	await wait(signal)
	return {
		period: copy(store.period),
		vendors: copy(store.vendors).sort((a, b) => b.spend - a.spend).slice(0, 3),
		categories: copy(store.categories),
		favouriteCategories: copy(store.categories).filter(c => ['groceries', 'household', 'homeoffice'].includes(c.id)),
		onboarding: copy(seed.onboarding),
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
	const all = copy(store.vendors)
	return { favourites: all.filter(v => v.favourite), rest: all.filter(v => !v.favourite) }
}

export async function getCategoriesOverview(signal) {
	await wait(signal)
	return { categories: copy(store.categories), question: copy(seed.questionOfTheDay) }
}

/** The global finder. Only the query the prototype demonstrates has an answer -- a phantom
    source that invented results for every keystroke would be claiming an index it has not got. */
export async function search(query, signal) {
	await wait(signal)
	const key = query.trim().toLowerCase()
	const hit = Object.entries(seed.finderResults).find(([k]) => k.startsWith(key) && key.length > 0)
	return { query, groups: hit ? copy(hit[1].groups) : [] }
}

export const spendKinds = seed.spendKinds
