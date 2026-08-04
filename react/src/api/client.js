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
	period: copy(seed.period),
	periods: copy(seed.periods),
	settings: { ...copy(seed.defaultSettings), ...read('settings', {}) },
	/* Documents dropped on the scan page this session. Not persisted: a file the browser no
	   longer holds is not a document, and remembering its name across a reload would be the
	   app claiming to have something it does not. */
	uploads: {}
}

/* Vendors and categories the user made, and the seeded ones they edited or removed, outlive
   the reload the same way their orders do. The seed is never re-persisted, so clearing
   storage returns the app to its shipped state. */
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

/* What is written back is the difference from the seed, not the whole list -- a stored copy
   of every record would freeze the seed at the version it was first read at, and a fix to
   the demo data would never reach anyone who had opened the app once. */
const persistList = (key, list, seeded) => {
	const seedIds = new Set(seeded.map(x => x.id))
	write(key, {
		added: list.filter(x => !seedIds.has(x.id)),
		removed: seeded.filter(x => !list.some(y => y.id === x.id)).map(x => x.id),
		patched: Object.fromEntries(list.filter(x => seedIds.has(x.id)).map(x => [x.id, x]))
	})
}

/* Orders behave like vendors and categories: what this browser added, removed or changed is
   what gets stored, and the seed is never re-persisted. Storing only the added ones was the
   version that shipped first, and it meant an edit to a seeded order -- marking it delivered,
   correcting a line -- was written to the store, rendered, and gone on the next reload. Only
   a reload could show it, which is the one thing a click-through never does. */
store.orders = applyStored(store.orders, read('orders', null))

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

const SORTERS = {
	'date-desc': byDateDescending,
	'date-asc': (a, b) => -byDateDescending(a, b),
	'amount-desc': (a, b) => b.total - a.total,
	'amount-asc': (a, b) => a.total - b.total,
	'vendor-asc': (a, b) => (a.vendor?.name ?? '').localeCompare(b.vendor?.name ?? '')
}

export const sorts = seed.sorts

/** The widths a statistics window comes in. The chips render this list and the pager steps by
    whichever one is on, so both read the same array. */
export const ranges = seed.ranges

/* ---- endpoints ---- */

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

	/* Paging is done here rather than in the page, because "how many are there" and "which
	   ones am I looking at" are two different numbers and the list has to print both. A pager
	   that slices an array the page already holds cannot say the first one. */
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

/* A draft is turned into a stored order in one place, so create and update cannot disagree
   about what an order is made of. */
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

/** Saves a draft as an order and hands back the stored record. */
export async function createOrder(draft, signal) {
	await wait(signal)
	const order = fromDraft(draft, { id: 'o-' + Date.now().toString(36) })
	store.orders = [order, ...store.orders]
	persistOrders()
	return decorate(order)
}

/** Writes an edit back over an existing order. */
export async function updateOrder(id, draft, signal) {
	await wait(signal)
	const at = store.orders.findIndex(o => o.id === id)
	if (at < 0) { const e = new Error('No order ' + id); e.status = 404; throw e }
	/* The overrides go with the edit. A 23-line receipt whose lines you have just retyped is
	   an order with the lines you typed, and leaving the count and total behind would print a
	   total the new lines do not add up to. */
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

/* Attachments. The phantom source keeps each file's name, size and kind -- the bytes are the
   one thing a prototype has no business pretending to hold. */

const fileSize = bytes => {
	const kb = Math.max(1, Math.round((bytes ?? 0) / 1024))
	return kb > 1024 ? (kb / 1024).toFixed(1).replace('.', ',') + ' MB' : kb + ' KB'
}

/** Takes however many files were dropped or chosen. One at a time was the shape that made a
    card offering to hold receipts accept exactly one per trip through the picker. */
export async function addAttachments(orderId, files, signal) {
	await wait(signal)
	const order = store.orders.find(o => o.id === orderId)
	if (!order) { const e = new Error('No order ' + orderId); e.status = 404; throw e }
	const list = Array.isArray(files) ? files : [files]
	const seen = new Set(order.attachments.map(a => a.name.toLowerCase()))
	const added = []
	const skipped = []
	for (const [n, file] of list.entries()) {
		/* The same receipt attached twice is a duplicate the user did not mean, and the two
		   rows are indistinguishable afterwards. Refused by name, and the caller is told. */
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

/* ---- vendors ---- */

export async function createVendor(name, look = {}, signal) {
	await wait(signal)
	const clean = String(name).trim()
	if (!clean) { const e = new Error('A vendor needs a name.'); e.status = 400; throw e }
	/* Refused the same way a duplicate category is, rather than quietly handing back the
	   vendor that is already there: two create endpoints that disagree about what a duplicate
	   means are two rules for one thing, and the caller cannot tell which it got. */
	if (store.vendors.some(v => v.name.toLowerCase() === clean.toLowerCase())) {
		const e = new Error('You already have a vendor called ' + clean + '.')
		e.status = 409
		throw e
	}
	const vendor = {
		id: 'v-' + clean.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36),
		name: clean,
		initials: look.initials ?? clean.slice(0, 2).toUpperCase(),
		/* The caller's colour where it gave one. Failing that, picked from the palette by the
		   name, so the same vendor is at least the same colour on every render rather than a
		   different one each time the list is drawn. */
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

/* ---- categories ---- */

export async function createCategory(name, look = {}, signal) {
	await wait(signal)
	const clean = String(name).trim()
	if (!clean) { const e = new Error('A category needs a name.'); e.status = 400; throw e }
	if (store.categories.some(c => c.name.toLowerCase() === clean.toLowerCase())) {
		const e = new Error('You already have a category called ' + clean + '.')
		e.status = 409
		throw e
	}
	/* The glyph, the colour and the budget are the caller's, and they arrive with the create
	   rather than in an update straight after it: a form that writes twice can half-succeed,
	   and the second write is the one carrying everything the user chose. The look used to be
	   assigned from a palette by position, with a tag glyph regardless of what the category was
	   for -- a value the user can see, cannot explain and could not change. */
	const category = {
		id: 'c-' + clean.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36),
		name: clean,
		icon: look.icon ?? 'tag',
		/* The path travels with the name, and this endpoint used to drop it: the record was
		   built field by field and `iconPath` was not one of the fields, so a category created
		   with any of Tabler's 5,129 glyphs was stored under its name alone. Editing one wrote
		   it, because updateCategory assigns the whole patch -- so the defect was only ever in
		   half the flow, and the half that looked right on screen, since the picker draws its
		   own preview from the form. Null for the app's own 39, which Icon.jsx knows by name. */
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

/* ---- settings ---- */

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

/** Forgets everything this browser has stored and returns the app to its shipped state. */
export async function resetStoredData(signal) {
	await wait(signal)
	for (const key of ['orders', 'cards', 'vendors', 'categories', 'settings']) {
		try { localStorage.removeItem(STORAGE_PREFIX + key) } catch { /* storage refused */ }
	}
	return { cleared: true }
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

/* ---- the statistics window ----

   The range chips and the pager are one control over one timeline: the chips choose how wide
   the window is, the arrows step by that width. They used to disagree -- the arrows walked
   `periods` a month at a time whatever the chips said, so 1W drew a week and paged a month --
   and a pager that steps something other than what is on screen is the decorative-control
   defect with arithmetic in it. README: Statistics, Pagination.

   A window narrower than a month has to know what a day cost, and the month records carry a
   total and a cumulative curve with nothing in between. So a day's spend is the step that
   month's curve takes down from the day before it, scaled so the steps sum to the month's own
   `spent`: the days of July sum to July, no window inside it can disagree with it, and July is
   24.418,57 kr. here and on Home. The first day has no day before it and takes the second
   day's step -- the one guess in this file, and it is one day wide. */

const dayCount = period => period.series.statsCurrent.length

const dailySpend = period => {
	const curve = period.series.statsCurrent
	const steps = curve.map((y, i) => (i ? curve[i - 1] - y : curve[0] - curve[1]))
	const drop = steps.reduce((sum, step) => sum + step, 0)
	return steps.map(step => (period.spent * step) / drop)
}

/** Every day the store holds, oldest first, each one knowing the month it belongs to. */
const days = [...store.periods].reverse().flatMap(period =>
	dailySpend(period).map((spend, i) => ({
		date: period.id + '-' + String(i + 1).padStart(2, '0'),
		periodId: period.id,
		spend
	})))

const monthOf = periodId => store.periods.find(p => p.id === periodId)
const firstDayOf = periodId => days.findIndex(d => d.periodId === periodId)
const spentOver = (from, length) =>
	days.slice(from, from + length).reduce((sum, day) => sum + day.spend, 0)

/** The running total in kroner, which is the line the chart draws and the figure printed above
    it -- one series, so the number and the line it sits over cannot disagree. */
const runningTotal = (from, length) => {
	let sum = 0
	return days.slice(from, from + length).map(day => (sum += day.spend))
}

const UNITS = { '1W': 'week', '1M': 'month' }
const dayNumber = date => Number(date.slice(8))

/* Weeks are ISO weeks: Monday to Sunday, numbered so that week 1 is the one holding 4 January.
   Chunking each month from its own 1st was simpler and it meant "week" here named a stretch of
   time no calendar agrees with -- the store starts on Friday 1 May, which is the tail of week
   18, not the head of a week at all. A week crosses a month boundary because weeks do.

   Pure UTC arithmetic, deliberately: these are calendar dates rather than moments, and running
   them through the local clock is what dates an evening in Copenhagen to tomorrow. */
const DAY = 86400000
const mondayFirst = at => (new Date(at).getUTCDay() + 6) % 7   // Monday 0 ... Sunday 6

const isoWeek = iso => {
	const [y, m, d] = iso.split('-').map(Number)
	const at = Date.UTC(y, m - 1, d)
	/* A week belongs to the year holding its Thursday, and 4 January is always in week 1 --
	   the two facts the whole numbering follows from. */
	const thursday = at + (3 - mondayFirst(at)) * DAY
	const year = new Date(thursday).getUTCFullYear()
	const jan4 = Date.UTC(year, 0, 4)
	const firstThursday = jan4 + (3 - mondayFirst(jan4)) * DAY
	return { year, week: Math.round((thursday - firstThursday) / (7 * DAY)) + 1 }
}

const weekKey = iso => {
	const { year, week } = isoWeek(iso)
	return year + '-W' + String(week).padStart(2, '0')
}

/* The date the window labels print. Duplicated from format.js on purpose, the same way krLabel
   at the foot of this file is: that module is the app's, and an API that hands back
   half-formatted strings would be handing the page a rendering decision it cannot undo. What a
   window is called is the API's own sentence -- the page prints it and does not compose it. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December']
const dayMonth = iso => {
	const [, m, d] = iso.split('-')
	return Number(d) + ' ' + MONTHS[Number(m) - 1]
}

/** "1–7 July", and "24 June – 7 July" for a window that spans two of them. */
const spanText = (from, to) => from.slice(0, 7) === to.slice(0, 7)
	? dayNumber(from) + '–' + dayMonth(to)
	: dayMonth(from) + ' – ' + dayMonth(to)

/* What the window is called in the pager, and in the sentence the chart is described by. A week
   is its ISO number and year, which is short enough for the pager band and is the name the rest
   of a working week already goes by; the days it covers are the short label, so the card over
   the chart says which they are. `prefix` is spoken and not drawn -- "18, 2026" on its own is a
   number and a year, and nothing in it says week.

   YTD and ALL name the question their chip asks rather than the span they land on: the store
   holds three months, so both of them -- and 3M -- cover the same days, and saying "May – July"
   three times would hide which one is selected. */
const labelsFor = (range, first, last, periodId) => {
	const year = last.date.slice(0, 4)
	const span = spanText(first.date, last.date)
	if (range === '1W') {
		const at = isoWeek(first.date)
		return { label: at.week + ', ' + at.year, short: span, prefix: 'Week' }
	}
	if (range === '1M') return { label: monthOf(periodId).label, short: monthOf(periodId).shortLabel }
	if (range === 'YTD') return { label: year + ' so far', short: year + ' so far' }
	if (range === 'ALL') return { label: 'All time', short: 'all time' }
	const months = monthOf(first.periodId).shortLabel + ' – ' + monthOf(last.periodId).shortLabel
	return { label: months + ' ' + year, short: months }
}

/* The scale under the chart is the window's own. Left at the month's 01/08/15/22/29 it printed
   the wrong days under every week and month names under none of the long ones. */
const axisFor = (range, from, length) => {
	const within = days.slice(from, from + length)
	if (range === '1M') return ['01', '08', '15', '22', '29'].filter(d => Number(d) <= length)
	if (range === '1W') return within.map(day => day.date.slice(8))
	return [...new Set(within.map(day => monthOf(day.periodId).shortLabel.slice(0, 3)))]
}

/* Which month the cards beside the chart are about, now that a week can straddle two: the one
   most of the window's days fall in, the later month taking a tie. For a whole ISO week that is
   the month holding its Thursday -- the rule ISO itself uses to place a week in a year -- and
   for the clipped weeks at either end of the store it is the month that is actually there. */
const monthUnder = within => {
	const tally = new Map()
	for (const day of within) tally.set(day.periodId, (tally.get(day.periodId) ?? 0) + 1)
	return [...tally].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1))[0][0]
}

const windowAt = (range, from, length) => {
	const within = days.slice(from, from + length)
	const first = within[0], last = within[within.length - 1]
	const periodId = monthUnder(within)
	const { label, short, prefix } = labelsFor(range, first, last, periodId)
	return {
		id: range === '1W' ? weekKey(first.date) : range === '1M' ? periodId : range,
		range, unit: UNITS[range] ?? 'range', periodId,
		/* The day this window stands on when the width changes under it: the newest one that
		   belongs to the month the window is filed under. Its own last day would do for every
		   window that sits inside a month, and would walk a reader off the month the cards are
		   showing for the one week that does not -- ask for a month from a week whose Thursday
		   is in July and you get July, which is the month the page was already about. */
		anchor: from + within.findLastIndex(day => day.periodId === periodId),
		from: first.date, to: last.date, start: from, length,
		label, labelPrefix: prefix ?? null, shortLabel: short, axis: axisFor(range, from, length)
	}
}

/* Every window a range offers, newest first, which is the order the pager walks. The weeks are
   the timeline grouped by ISO week, so the first and the last are clipped to the days the store
   has -- week 18 is the three days of May the store starts with. A clipped window is a fact
   about where the records stop, not a different kind of window: it says which days it holds and
   is compared against the same number of days before it, or against nothing when they are not
   all there. */
const built = {}
const windowsOf = range => (built[range] ??= (() => {
	if (range === '1W') {
		const out = []
		for (let i = 0; i < days.length;) {
			const key = weekKey(days[i].date)
			let n = 1
			while (i + n < days.length && weekKey(days[i + n].date) === key) n++
			out.push(windowAt('1W', i, n))
			i += n
		}
		return out.reverse()
	}
	if (range === '1M') return store.periods.map(p => windowAt('1M', firstDayOf(p.id), dayCount(p)))
	return [windowAt(range, 0, days.length)]
})())

/* What a window is measured against: the month before a month, the same number of days before a
   week. A month against the thirty-one days before it would be a month against most of another
   one, and the delta would stop agreeing with the month's own. */
const previousOf = chosen => {
	if (chosen.range === '1M') {
		const at = store.periods.findIndex(p => p.id === chosen.periodId)
		const before = store.periods[at + 1]
		return before
			? { start: firstDayOf(before.id), length: dayCount(before), label: before.shortLabel }
			: null
	}
	if (chosen.range === '1W' && chosen.start >= chosen.length) {
		const start = chosen.start - chosen.length
		return { start, length: chosen.length, label: spanText(days[start].date, days[start + chosen.length - 1].date) }
	}
	return null
}

/* Which way it went comes back beside the sentence, because spending less is a good down --
   the same split the KPI tiles make between trend and tone. Every authored delta in the store
   was an up, so the chip could be amber and never be wrong about it; a pager that steps a week
   reaches windows that cost less than the one before them. */
const deltaOf = (spent, previousTotal, previousLabel) => {
	if (!previousTotal || !previousLabel) return { label: null, up: null }
	const pct = Math.round((spent / previousTotal - 1) * 100)
	return { label: Math.abs(pct) + '% ' + (pct < 0 ? 'down' : 'up') + ' vs ' + previousLabel, up: pct >= 0 }
}

/** Which day the URL is pointing at: a date is itself, a week or a month is its last day, and
    anything else -- a span key, an empty parameter, a typo -- is the newest day there is. It is
    a day rather than a window because it is what survives a change of width: switching the
    chips keeps the reader where they were, on whichever window of the new width holds it. */
const anchorDay = windowId => {
	const exact = days.findIndex(d => d.date === windowId)
	if (exact >= 0) return exact
	const named = ranges.flatMap(windowsOf).find(w => w.id === windowId)
	return named ? named.anchor : days.length - 1
}

/** Statistics, for one window of the timeline. `range` is the width the chips chose and the
    step the arrows take; `windowId` says where. `at` and `count` come back with the data
    rather than being worked out again in the page. */
export async function getStats(range, windowId, signal) {
	await wait(signal)
	const width = seed.ranges.includes(range) ? range : '1M'
	const list = windowsOf(width)
	const anchor = anchorDay(windowId)
	const at = Math.max(0, list.findIndex(w => anchor >= w.start && anchor < w.start + w.length))
	const { start, length, anchor: _anchor, ...current } = list[at]
	const period = monthOf(current.periodId)
	const previous = previousOf(list[at])

	/* The delta is derived from the two totals rather than stored beside them -- a month
	   carrying "18% up vs June" and a spend that disagrees with it are two claims, and both
	   look right on their own. Where the store has nothing before the window, and the window
	   is a month, the month's own figure is the only one there is: April is a total in May's
	   record and not a curve, so it can be compared against and cannot be drawn. */
	const spent = spentOver(start, length)
	const previousTotal = previous ? spentOver(previous.start, previous.length)
		: (current.range === '1M' ? period.previousTotal : null)
	const previousLabel = previous ? previous.label
		: (current.range === '1M' ? period.previousLabel : null)
	const delta = deltaOf(spent, previousTotal, previousLabel)

	return {
		period: copy(period),
		categories: copy(store.categories),
		window: {
			...current, days: length, spent, previousLabel, previousTotal,
			deltaLabel: delta.label, deltaUp: delta.up,
			series: {
				current: runningTotal(start, length),
				previous: previous ? runningTotal(previous.start, previous.length) : null
			}
		},
		defaultId: windowsOf('1M')[0].id,
		at,
		count: list.length,
		newer: at > 0 ? list[at - 1].id : null,
		older: at < list.length - 1 ? list[at + 1].id : null
	}
}

/** The question of the day, and the answer behind it. */
export async function getAnswer(signal) {
	await wait(signal)
	return copy(seed.answers[0])
}

export async function getScanDocuments(signal) {
	await wait(signal)
	return { ...copy(seed.scanDocuments), ...copy(store.uploads) }
}

/** Takes a file the user actually dropped on the scan page and hands back the key the two
    steps after it read. The prototype's hero says "Drop a receipt here" and answers a click
    with one of four canned documents; this way a dropped file is the document those steps
    name, with its own size and its own format. What the reader finds inside is still the one
    Bilka purchase -- that part is demo data and says so. README: Scan Flow. */
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

/** What the reader hands back once it has finished with the chosen document. */
export async function getScanDraft(documentKey, signal) {
	await wait(signal)
	const file = seed.scanDocuments[documentKey] || store.uploads[documentKey] || seed.scanDocuments.photo
	return { ...copy(seed.scanDraft), file: { ...file, key: documentKey } }
}

/** The draft New order opens on, with the defaults the user chose in Settings applied. A
    setting that nothing reads is the same defect as a button that does nothing. */
export async function getOrderDraft(signal) {
	await wait(signal)
	return { ...copy(seed.orderDraft), kind: store.settings.defaultKind, status: store.settings.defaultStatus }
}

/** An existing order as a draft the New order form can edit. */
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
	/* The latest order is read off the orders, not stored beside them. Two of the seven vendors
	   carried a stored one and the other five carried none, so a card claiming 29 orders and
	   1.480 kr. saved drew "Latest order -- None": a vendor cannot have saved you money on
	   orders it has not got. It is the same rule the totals follow -- derive it, and the two
	   cannot disagree -- and it keeps up on its own when an order is saved or deleted. */
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

/* ---- the command palette ----

   The top bar prints CTRL K, and a key cap is a promise. This is what it opens: one query
   over orders, vendors, categories, item lines and notes, plus the commands the app can run.

   It is a real index rather than a fixed answer for one query. The prototype ships four
   results for "bil" written into the markup, which is right for that word and wrong for
   every other -- and there is no way to tell from the screen which one you are looking at. */

const highlight = (text, needle) => {
	const at = text.toLowerCase().indexOf(needle)
	return at < 0
		? { before: text, mark: '', rest: '' }
		: { before: text.slice(0, at), mark: text.slice(at, at + needle.length), rest: text.slice(at + needle.length) }
}

/* Commands are the half of a palette that is not a search result: things to do, not things
   to open. Each one names where it goes, so none of them can be listed and lead nowhere. */
const COMMANDS = [
	{ id: 'cmd-new', label: 'New order', meta: 'Create', to: '/orders/new', keywords: 'new order create add' },
	{ id: 'cmd-scan', label: 'Scan a receipt', meta: 'Create', to: '/scan', keywords: 'scan receipt upload pdf photo ai' },
	/* Every record the app can create is creatable from here, on one route shape:
	   /<records>/new. A palette that offers one of the three teaches that the other two are
	   somewhere else. */
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
		/* An empty query is not a failed search, so it answers with what the palette can do
		   rather than with nothing. */
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

	const vendorMatches = store.vendors.filter(v => v.name.toLowerCase().includes(needle)).slice(0, 3)

	take('Vendors', vendorMatches
		.map(v => ({ id: v.id, ...highlight(v.name, needle),
			meta: `${v.orders} orders · ${krLabel(v.spend, 0)}`, to: `/orders/all?vendor=${v.id}` })))

	take('Categories', store.categories
		.filter(c => c.name.toLowerCase().includes(needle)).slice(0, 3)
		.map(c => ({ id: c.id, ...highlight(c.name, needle),
			meta: `${c.share}% of expenses`, to: `/orders/all?category=${c.id}` })))

	/* Item lines and notes, which is what makes this a search rather than a vendor picker.
	   The line is quoted, so a hit inside an order reads as a quotation and not as a title. */
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

	/* A vendor match is also a reason to buy from them again, so each one earns a command of
	   its own -- not just a link to their past orders. Ahead of the static list, since it is
	   the one command the search term itself picked out. */
	const vendorCreateOptions = vendorMatches.map(v => ({ id: 'cmd-new-order-' + v.id,
		...highlight(`Create order with ${v.name}`, needle), meta: 'Create',
		to: `/orders/new?vendor=${encodeURIComponent(v.name)}` }))

	const staticCommandOptions = COMMANDS
		.filter(c => c.label.toLowerCase().includes(needle) || c.keywords.includes(needle))
		.slice(0, Math.max(0, 4 - vendorCreateOptions.length))
		.map(c => ({ id: c.id, ...highlight(c.label, needle), meta: c.meta, to: c.to }))

	take('Commands', [...vendorCreateOptions, ...staticCommandOptions])

	return { query, groups }
}

/* The amount the search results print. Duplicated from format.js on purpose, the same way
   dayMonth above is: that module is the app's, and an API that hands back half-formatted
   strings would be handing the page a rendering decision it cannot undo. This builds the
   label the result line prints, which is the API's own sentence. */
const krLabel = (n, decimals = 2) => {
	const fixed = Math.abs(n).toFixed(decimals)
	const [whole, rest] = fixed.split('.')
	return whole.replace(/\B(?=(\d{3})+$)/g, '.') + (rest ? ',' + rest : '') + ' kr.'
}

export const spendKinds = seed.spendKinds
