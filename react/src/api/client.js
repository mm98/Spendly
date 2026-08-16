/* The real API client.

   Was a phantom in-memory store (seeded from ./seed.js, persisted as diffs in localStorage);
   is now a thin fetch() wrapper around the Express + SQLite backend in api/. Every exported
   function keeps its original name and signature — useApi.js keys its cache off `fn.name`, and
   every page already calls this module by these names — so nothing above this file changed to
   make the swap. seed.js is no longer imported: the data it held is now real rows on the
   server, seeded once per account at registration (api/src/seed.js).

   The dev server proxies /api to the API process (see vite.config.js), so every path here is
   relative. `credentials: 'include'` carries the session cookie on every request. */

import { dayMonth, parseAmount, sep } from './format.js'

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

/* Every vendor, split into the spotlight and the list under it.

   This used to read /api/vendors/overview, which answered the five biggest by spend -- so an
   account with twelve could reach five of them, and the search box below the spotlight
   filtered a list the server had already cut down: typing a vendor that exists but sits sixth
   answered "No vendor matches", which is a false sentence rather than an empty result. Starring
   one of those seven was worse, since a favourite is a standing preference and the Favourites
   section it was starred into could not show it either.

   With nothing truncated the route answered exactly what GET /api/vendors already answers, so
   it is gone and this reads the list itself. The page sorts and searches client-side, and the
   spotlight is whichever of them are favourites. */
export async function getVendorsOverview(signal) {
	/* `all` is every vendor, favourites included, rather than the ones left over after the
	   spotlight took its share. Starring a vendor used to remove it from the list below --
	   which is the only searchable, sortable view of them -- so the more of them you marked as
	   worth finding, the fewer you could find. Fifty favourites meant fifty vendors reachable
	   only by eye, in a spotlight that neither filters nor sorts. A favourite is drawn twice
	   now: once where it was pinned, and once in the list it never should have left. */
	const vendors = await request('/api/vendors', { signal })
	return { favourites: vendors.filter(v => v.favourite), all: vendors }
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

/* Every category, for the same reason the vendors list takes every vendor.

   This read /api/categories/overview, which answered the five biggest by spend, and the page
   drew all three of its things from that one array -- so an account with ten categories showed
   five. The Manage tab is where you go to see whether something already exists before adding
   it, and it was showing half of them: add a category that is already there and the only way
   to find out was the 409 the save came back with.

   The ring was wrong as well as short. Its centre reads "Spent, all time" and the page sums it
   from this array, so with five of ten categories in hand the headline figure was the spend of
   whichever five happened to be biggest, printed as the total. Untruncated, the route answered
   exactly what GET /api/categories answers, so it is gone. */
export async function getCategoriesOverview(signal) {
	return { categories: await request('/api/categories', { signal }) }
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
	/* A saved order's own item id travels through -- PUT matches a submitted item against what's
	   already in the database by id, updating it in place rather than deleting and recreating it
	   under a fresh one, so anything keyed to that id (an item's own attachment) survives an edit
	   that never touched that line. A draft item with no real id yet (still local to this
	   session, or a brand-new line) has none to send -- the server treats that the same as
	   before, a fresh row with a fresh id of its own. */
	items: (draft.items ?? []).map(i => ({
		...(i.id ? { id: i.id } : {}),
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

/** `<img src>` reads these directly rather than going through fetch() — the browser sends the
    session cookie on a same-origin image request the same way it does on any other, so there's
    nothing useApi.js needs to do here. Kept as functions (not inline template strings at every
    call site) so the URL shape lives in one place. */
export const attachmentThumbnailUrl = (orderId, attachmentId) => `/api/orders/${orderId}/attachments/${attachmentId}/thumbnail`
export const attachmentFileUrl = (orderId, attachmentId) => `/api/orders/${orderId}/attachments/${attachmentId}/file`

/** The same as addAttachments/removeAttachment above, one level down: a photo (or a PDF) of a
    single line item rather than the whole receipt. The item has to already exist server-side —
    NewOrder.jsx uploads these after the order (and so the item) is saved, not while the item is
    still a client-side draft with no id of its own yet. */
export async function addItemAttachments(orderId, itemId, files, signal) {
	const form = new FormData()
	for (const file of files) form.append('files', file)
	return request(`/api/orders/${orderId}/items/${itemId}/attachments`, { method: 'POST', form, signal })
}

export async function removeItemAttachment(orderId, itemId, attachmentId, signal) {
	return request(`/api/orders/${orderId}/items/${itemId}/attachments/${attachmentId}`, { method: 'DELETE', signal })
}

export const itemAttachmentThumbnailUrl = (orderId, itemId, attachmentId) =>
	`/api/orders/${orderId}/items/${itemId}/attachments/${attachmentId}/thumbnail`
export const itemAttachmentFileUrl = (orderId, itemId, attachmentId) =>
	`/api/orders/${orderId}/items/${itemId}/attachments/${attachmentId}/file`

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
/** Real categories, left-joined against this month's window.split, plus the "Without category"
    row split carries for whatever's left over -- that row names no real category, so it cannot
    come from mapping the categories list the way every other one here does. Both callers below
    need this join; each one reading its own copy is how the ring end up with a row a category's
    own list never had a way to grow. */
const monthCategoriesFrom = (categories, split) => {
	const byId = new Map(split.map(s => [s.id, s]))
	const none = split.find(s => s.id == null)
	const named = categories.map(c => ({ ...c, spend: byId.get(c.id)?.amount ?? 0, share: byId.get(c.id)?.share ?? 0 }))
	const rows = none
		? [...named, { id: 'none', name: none.name, icon: 'tag', colour: none.colour, spend: none.amount, share: none.share }]
		: named
	return rows.filter(c => c.spend > 0).sort((a, b) => b.spend - a.spend)
}

const periodFromWindow = w => ({
	label: w.label, shortLabel: w.shortLabel, previousLabel: w.previousLabel,
	// The window's own dates, for the links out of it -- see ordersIn below.
	from: w.from, to: w.to,
	// Which point on the charts drawn from this window is today, or null if it holds no today.
	todayIndex: w.todayIndex,
	/* The window's own marks. Every chart drawn from this object used to carry a hardcoded
	   01/08/15/22/29 instead -- five dates that are no unit of anything, printed unchanged under
	   a February that has 28. The window knows its own bounds; nothing else does. */
	axis: w.axis,
	/* The window's returns, as records. Orders overview draws the same card Statistics does,
	   and used to draw it from nothing at all -- a hardcoded "No open returns found" over a
	   month holding four. README: Empty states. */
	returns: w.returns,
	spent: w.spent, saved: w.saved, savedPercent: w.savedPercent, retail: w.retail,
	averageOrder: w.average, weekdays: w.rhythm.weekdays,
	busiestDay: w.rhythm.busiestDay, busiestDaySpend: w.rhythm.busiestDaySpend,
	projected: w.pace.projected, daysIn: w.pace.daysIn, previousTotal: w.previousTotal,
	/* Cut by whoever builds the page, not here: this object is shared and the legend is a card
	   list like the others, so it follows the account's entries-per-card setting. */
	heroLegend: w.split,
	series: { cumulative: w.series.current, savingsGrowth: w.series.savedCumulative,
		monthCurrent: w.series.current, monthPrevious: w.series.previous }
})

export async function getOrdersOverview(signal) {
	const [{ latest }, { window }, categories, settings] = await Promise.all([
		// No count: the server cuts it to the account's entries-per-card setting, the same
		// number the returns card beside it and every list on Home are cut to. This asked for 4
		// while Home asked for 3, so one card was two lengths depending which page drew it.
		request('/api/orders/overview', { signal }),
		getStatsSummary('month', undefined, signal),
		getCategories(signal),
		getSettings(signal)
	])
	/* The ring reads "Spent this month," so its segments and the rows under it have to be
	   this month's spend too — categories carries all-time totals (categories with old orders
	   and none this month would otherwise fill a ring a 0 kr. centre says is empty). window.split
	   is the same month-scoped breakdown Home's hero legend reads; icon/budget still come from
	   categories since split doesn't carry either. */
	/* Every category with spend this month, not the four biggest. The ring these feed reads
	   "Spent this month" in its middle and is drawn from this array, so cutting it to four drew
	   a circle that did not add up to its own centre -- and the rows under it, which name the
	   ring's colours, could only ever name four of them. */
	const monthCategories = monthCategoriesFrom(categories, window.split)
	return {
		latest, period: periodFromWindow(window), categories: monthCategories,
		/* monthCategories is filtered to spend > 0 this month, so its emptiness cannot say
		   whether the account has categories at all -- and the breakdown card's empty state has
		   to know which absence it is answering: nothing bought yet, or no categories yet. */
		hasCategories: categories.length > 0,
		cardRows: settings.cardRows ?? defaultCardRows
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

/** Replaces this account's ledger with a year of generated demo orders, so the app can be
    looked at with something in it. Replaces rather than adds — see the route's own note.
    A different year each press: no seed is sent, so the route picks one. `orders` is how many
    the year holds in total, the count the card's combobox chose. Answers
    { orders, vendors, categories, months, seed } — the seed it used, which is what makes a
    dataset worth reporting reproducible.

    30 seconds and the request is abandoned rather than spinning forever: the largest fill is
    ~5s on the API's own measurements, so six times that is a hang, not a slow day. Abandoned,
    not cancelled — the server finishes what it started, so a fill that answers late has still
    happened, and the error toast is about this page's knowledge of it, not about the data. */
export async function populateDemoData(orders, signal) {
	return request('/api/demo-data', { method: 'POST', body: { orders },
		signal: signal ?? AbortSignal.timeout(30000) })
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

/** The lighter form getOrdersOverview/getHomeContent build their "period" summary from —
    everything periodFromWindow reads, minus the one sub-computation only the Statistics page
    itself needs (`recent`: up to 6 *extra* aggregate queries for a bar chart) that was making
    Home and Orders overview pay for a chart they throw away. The window's returns are not
    behind the flag: they are one indexed query and Orders overview renders them.
    Not exported: nothing calls this through useApi directly. */
const getStatsSummary = (range, windowId, signal) =>
	request('/api/stats' + qs({ range, windowId, summary: 1 }), { signal })

/** This month's spend and saving, day by day, for Home's hero. No range: the hero is the
    current month and Statistics is where another stretch of time is chosen. */
export async function getHomeHero(signal) {
	return request('/api/home/hero', { signal })
}

/** A link into All orders, filtered the way the card it is leaving says it is filtered.

    A card that names a stretch of time is a claim about which orders it is counting, and a row
    inside it that opens "the orders behind this slice" has to open *those* orders. Four of them
    did not: the hero legend under "Where it went • Aug", the category rows under two rings
    reading "Spent this month", and the row for whatever has no category. Each opened every
    order in that category since the account was made — a list whose total contradicts the
    figure the reader clicked, under filters that do not mention the month.

    Built here rather than at each call site so the four cannot drift, and because a filter
    dropped from one of them is invisible: the destination is a real, working, filtered list
    either way, just of the wrong thing. `from`/`to` are omitted when the card has no window to
    pass on — an all-time ring, a vendor's whole history — rather than being faked. */
export const ordersIn = ({ category, vendor, from, to } = {}) =>
	'/orders/all' + qs({ category, vendor, from, to })

/** How many entries a card fills with, where it has entries to fill.

    Home's cards share grid rows, and a grid row is as tall as its tallest card -- so a card
    that holds three of something beside a card that holds ten is not a shorter card, it is the
    same card with a hole under it. Category breakdown is the long one (every category with
    spend this month, which the ring in its middle has to add up to), and the two beside it were
    cut to three and drew about 300px of nothing each.

    This is the *default*, not the number: the account owns it, under Settings, and everything
    on Home reads whatever it says. It was a bare constant here first, which made "ten" a fact
    about the build rather than a choice about the account -- the same shape of mistake as the
    demo seed, one screen over.

    Not the category ring's list, whichever number is chosen: that one is every category with
    spend this month by rule, since the arcs have to add up to the figure printed in the centre.
    Capping it is a defect with its own entry. */
const defaultCardRows = 6

/** What the picker offers. Small numbers included on purpose -- a card cut to one row is a
    headline with a single example under it, which is a legitimate thing to want from a
    dashboard -- and stopping at ten because these are summaries with the full list one click
    behind them. Kept in step with the API, which rejects anything outside this set rather than
    storing a preference no control would obey. */
export const cardRowOptions = [1, 2, 4, 6, 8, 10]

/** The order the vendors and categories lists open in — one setting, because these are the same
    kind of list and a person who wants one alphabetical wants both. Only the orders *both*
    lists have: vendors can also sort by order count and categories by share of spend, and
    neither can be the shared default, since the other list has no such column to sort on. Those
    stay on the pages, one click from wherever this opens them. */
/* Labelled the way `sorts` above labels the orders list -- the column and the direction, so an
   option says what it does before it is pressed. Bare "Spend" was secretly highest-first, and
   the reader found out by pressing it. Ranking columns come as pairs; Name is alphabetical, and
   an alphabetical order is for finding a record, so it offers the one direction that finds.
   The id carries the direction too ('name-asc'), exactly as the orders sort's ids always have. */
export const listSorts = [
	{ id: 'name-asc', label: 'Name, A to Z' },
	{ id: 'spend-desc', label: 'Spend, highest' },
	{ id: 'spend-asc', label: 'Spend, lowest' },
	{ id: 'saved-desc', label: 'Saved, highest' },
	{ id: 'saved-asc', label: 'Saved, lowest' }
]

export async function getHomeContent(signal) {
	// Fetched directly rather than through getOrdersOverview, which independently re-fetches
	// stats/categories/home for its own callers — going through it here paid for that work
	// twice on every Home load.
	const [onboarding, { window }, vendors, categories, settings, { latest }] = await Promise.all([
		request('/api/home/onboarding', { signal }),
		getStatsSummary('month', undefined, signal),
		getVendors(signal),
		getCategories(signal),
		getSettings(signal),
		request('/api/orders/overview', { signal })
	])
	/* The account's number, with the constant above standing in only for a settings row that
	   has not answered yet. The lists the *server* cuts (the latest orders, the returns card)
	   are already this length when they arrive; these three are derived here from full lists
	   the API answers by rule, so they are cut here to the same number. */
	const rows = settings.cardRows ?? defaultCardRows
	/* "The categories are written per month" below, and the ring right above them reads
	   "Spent this month" -- so both need this month's spend, not categories' all-time totals.
	   window.split is the same month-scoped breakdown the hero legend reads its own entries
	   from; icon/budget still come from categories since split carries neither. */
	const monthCategories = monthCategoriesFrom(categories, window.split)
	const period = periodFromWindow(window)
	return {
		// The page's own budget, so a card that spends height on a graphic can take that off
		// its list rather than standing taller than the card beside it.
		cardRows: rows,
		// The hero's "Where it went" legend is a card list too, so it is the same length as the
		// rest -- it was three, chosen where the period object is built and therefore three on
		// every page that reads one.
		period: { ...period, heroLegend: period.heroLegend.slice(0, rows) },
		vendors: [...vendors].sort((a, b) => b.spend - a.spend).slice(0, rows),
		categories: monthCategories,
		// Same field getOrdersOverview carries, for the same card: the month list's emptiness
		// cannot say whether the account has categories at all.
		hasCategories: categories.length > 0,
		// All-time, from the raw list rather than monthCategories -- that one's filtered to
		// spend > 0 this month, and a favourite is a standing preference, not an activity
		// filter: a category starred last week with nothing bought from it yet this month
		// should still show up here, the same way a starred vendor with no orders yet still
		// leads the Vendors page's own Favourites section.
		favouriteCategories: categories.filter(c => c.favourite)
			.sort((a, b) => b.spend - a.spend).slice(0, rows),
		onboarding,
		showScanCard: settings.showScanCard,
		latest
	}
}

/* ---- scan ---- */

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

export const scanThumbnailUrl = documentKey => `/api/scan/documents/${documentKey}/thumbnail`
export const scanFileUrl = documentKey => `/api/scan/documents/${documentKey}/file`

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
		.map(o => ({ id: o.id, ...highlight(`${o.vendor?.name}${sep}${dayMonth(o.date)}`, needle),
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
				meta: `${o.vendor?.name}${sep}${dayMonth(o.date)}`, to: `/orders/${o.id}` })
			if (lines.length === 4) break
		}
		if (lines.length === 4) break
	}
	take('Item lines', lines)

	take('Notes', orders
		.filter(o => (o.note || '').toLowerCase().includes(needle)).slice(0, 3)
		.map(o => ({ id: o.id + '-note', ...highlight(`"${o.note}"`, needle),
			meta: `${o.vendor?.name}${sep}${dayMonth(o.date)}`, to: `/orders/${o.id}` })))

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

/* ---- static option lists (not user data — spendKinds mirrors the server's SPEND_KINDS;
   the rest are the client's alone, since the server never reads a sort label or a range
   chip) ---- */

export const spendKinds = ['Expense', 'Gift', 'Sold', 'Work', 'Other']

/* Ranking columns come as pairs, the same scheme the vendors and categories lists follow,
   because three lists sorting one way each is three vocabularies for one control. Vendor is
   the exception: it groups the list rather than ranks it, and reversed grouping is the same
   clusters in an order nobody asks for, so it offers the one direction that reads. */
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
