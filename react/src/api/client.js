/* The real API client.

   Was a phantom in-memory store (seeded from ./seed.js, persisted as diffs in localStorage);
   is now a thin fetch() wrapper around the Express + SQLite backend in api/. Every exported
   function keeps its original name and signature — useApi.js keys its cache off `fn.name`, and
   every page already calls this module by these names — so nothing above this file changed to
   make the swap. seed.js is no longer imported: the data it held is now real rows on the
   server, seeded once per account at registration (api/src/seed.js).

   The dev server proxies /api to the API process (see vite.config.js), so every path here is
   relative. `credentials: 'include'` carries the session cookie on every request. */

import { dayMonth, detectLocale, parseAmount, sep } from './format.js'
import { invalidate } from './useApi.js'

class ApiError extends Error {
	constructor(message, status, fields, body) {
		super(message)
		this.name = 'ApiError'
		this.status = status
		this.fields = fields
		/* The parsed response body, kept whole: the import route's 400 carries no `error`
		   sentence but a per-row `failed` list, and a caller sending slices needs that list
		   to say which rows of the file were refused. */
		this.body = body
	}
}

/** The sentence a failed request shows. The server's refusal carries its own words about the
    cause -- "Describe the item.", a 409 naming how many orders are in the way -- and those words
    travel to the screen; the fallback is only for errors that have none (a network failure, a
    timeout), where the browser's own message is prose about the transport, not about what the
    user did. One copy, because every catch writing its own ternary is how three of them showed
    the words and six threw them away. README: Feedback. */
export const failureMessage = (error, fallback) =>
	error?.name === 'ApiError' ? error.message : fallback

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
	if (!res.ok) throw new ApiError(data?.error || res.statusText || 'Request failed', res.status, data?.fields, data)
	return data
}

/* ---- auth ----

   Each of these clears the whole read cache on success, here rather than at any call site:
   crossing the account boundary is what makes every cached answer someone else's, and the
   cache trusts its entries now (useApi.js) -- a signed-out account's figures surviving into
   the next sign-in would not be a flash before a refetch, it would be the page. */

/* The locale rides along with the registration rather than being saved by a second request
   after it: the account's first settings row is written inside the register transaction, so a
   guess that arrives later is a row updated, a cache to invalidate and a window in which the
   new account renders in the wrong shape. It is a guess from the browser's timezone and the
   server treats it as one -- see detectLocale and routes/auth.js. */
export async function register(email, password, signal) {
	const user = await request('/api/auth/register',
		{ method: 'POST', body: { email, password, locale: detectLocale() }, signal })
	invalidate()
	return user
}

/** Marks the settings page as seen, so the one-time detour a new account takes to it
    (routes.jsx) does not happen again. Fire-and-forget on the page's own mount: a reader who
    is looking at the page has been shown it whether or not this request lands, and failing to
    record that is worth one repeated detour, never a page that refuses to render. */
export async function markSetupSeen(signal) {
	return request('/api/auth/setup-seen', { method: 'POST', signal })
}

export async function login(email, password, signal) {
	const user = await request('/api/auth/login', { method: 'POST', body: { email, password }, signal })
	invalidate()
	return user
}

export async function logout(signal) {
	const out = await request('/api/auth/logout', { method: 'POST', signal })
	invalidate()
	return out
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

/** Adds one alias to a vendor -- another string that resolves to it when an order names its
    vendor by text (a scanned receipt's vendor line, a typed name). The vendor form edits the
    whole list through updateVendor; this is the scan review's learning path, which only ever
    has the one string to add. Idempotent for an alias the vendor already has. */
export async function addVendorAlias(id, name, signal) {
	return request('/api/vendors/aliases', { method: 'POST', body: { vendorId: id, name }, signal })
}

/* Two questions get asked about a vendor and a string, and they are different questions:
   *is* this string this vendor (resolution, exact -- what files an order), and *does* this
   string find this vendor (search, substring -- what fills a list). Both match the name and
   every alias, and both live here rather than in the pages that ask, because the one time
   this rule was written out at a call site instead, that call site was the one that forgot
   it: All vendors searched names only, and answered `No vendor matches "Netto"` to an
   account filing Netto receipts. A rule spelled out where it is used is a rule the next
   place has to remember. README: Vendors.

   The server holds the same two answers for its own callers -- findVendorIdByAnyName for
   resolution, the palette's SQL for search -- and that mirror is deliberate rather than
   duplication left lying about: this side already has every vendor and its aliases in
   memory, so filtering here costs no round trip per keystroke, while the palette's query
   spans orders and categories too and cannot ship a ledger to the browser to do it. Two
   runtimes, one contract, stated once in the README and twice in code because neither
   runtime can call the other's copy. */

/** Resolution. The vendor a string *is*: its own name or one of its aliases, exactly,
    case-insensitively. The vendor comboboxes use it so that typing an alias and choosing the
    action row picks the vendor the alias belongs to, rather than offering to create a twin
    the server would refuse. */
export const vendorByAnyName = (vendors, name) => {
	const needle = String(name ?? '').trim().toLowerCase()
	if (!needle) return undefined
	return vendors.find(v => v.name.toLowerCase() === needle
		|| (v.aliases ?? []).some(a => a.toLowerCase() === needle))
}

/** Search. Whether a typed string finds this vendor, and which alias did it -- `alias` is
    null when the vendor's own name matched, because then there is nothing for a row to
    explain, and the palette's query returns null in exactly that case for exactly that
    reason (api/src/routes/search.js). Empty text matches everything: a list with no query
    is not a search that found nothing. */
export const vendorTextMatch = (vendor, text) => {
	const needle = String(text ?? '').trim().toLowerCase()
	if (!needle || vendor.name.toLowerCase().includes(needle)) return { matches: true, alias: null }
	const alias = (vendor.aliases ?? []).find(a => a.toLowerCase().includes(needle)) ?? null
	return { matches: Boolean(alias), alias }
}

/* There is no getVendorsOverview and no getCategoriesOverview: each was the same GET as the
   plain list with a client-side reshape on top, which is a second cache entry for one request
   -- the overview tab and the list tab each paid the fetch the other had already paid.
   A wrapper earns a name (and an entry) only when it is a different request or a join of
   several; a reshape of one answer belongs to the page that wants that shape. */

/* ---- chart period ----

   One account setting (settings.chartPeriod), read by both rings: which of Statistics' own
   widths -- week, month, quarter, year or all, the `ranges` list below, mirrored server-side as
   CHART_PERIODS (api/src/routes/settings.js) -- Vendors' and Categories' rings currently draw
   from. This earns its own wrapper under the rule stated above: a join of settings and the
   window it points at, not a reshape of one list. */

async function chartWindow(signal) {
	const settings = await getSettings(signal)
	const period = settings?.chartPeriod ?? 'month'
	const { window } = await getStatsSummary(period, undefined, signal)
	return { period, window }
}

/** Vendors overview's ring: the account's chosen window's own vendor split. `spent` is the
    window's real total (window.spent), not a resum of `split` -- the same number the ring's
    centre and the split's own shares were computed from server-side. */
export async function getVendorChartSplit(signal) {
	const { period, window } = await chartWindow(signal)
	return { period, spent: window.spent, split: window.vendorSplit }
}

/** Categories overview's ring: the same join, over the category split -- "Without category"
    already folded in by the server (api/src/lib/stats.js's splitOver). Deliberately not built
    from getCategoriesThisMonth below: that one stays pinned to 'month' for the budget cards
    beside the ring, which this setting does not touch. */
export async function getCategoryChartSplit(signal) {
	const { period, window } = await chartWindow(signal)
	return { period, spent: window.spent, split: window.split }
}

/* ---- categories ---- */

export async function getCategories(signal) {
	return request('/api/categories', { signal })
}

/** How much of a set of categories' total budget has been spent this month. Categories with no
    budget set are left out of both sides, so an unbudgeted category cannot drag the figure down.

    Takes `monthSpend`, never `spend`: a budget is a monthly allowance (see the category form's
    "Monthly budget"), and the account's all-time spend divided by one month's allowance is a
    percentage of nothing -- an account with a 1.000 kr. budget and a year of orders behind it
    read 6664% of this month's budget used, with the meter beside it full. Every caller compares
    the two, so the join below is what they read rather than the plain list. */
export const budgetUsed = categories => {
	const budgeted = categories.filter(c => c.budget > 0)
	const allowed = budgeted.reduce((sum, c) => sum + c.budget, 0)
	return allowed ? (budgeted.reduce((sum, c) => sum + c.monthSpend, 0) / allowed) * 100 : 0
}

/** Whether a category has spent past its monthly budget. Same reason as above: `monthSpend`. */
export const overBudget = category => category.budget > 0 && category.monthSpend > category.budget

/** Category records with this month's spend joined on as `monthSpend`, beside the all-time
    `spend` the list already carries. Two facts of different periods, both named, so a card
    reading "this month" and a card reading "all time" can be drawn from one answer rather than
    from one number that has to mean both. `split` is a month window's own category breakdown. */
export const withMonthSpend = (categories, split) => {
	const byId = new Map(split.map(s => [s.id, s]))
	return categories.map(c => ({ ...c, monthSpend: byId.get(c.id)?.amount ?? 0 }))
}

/** The whole category list, joined. A wrapper with its own cache entry because it is a join of
    two requests, not a reshape of one -- both category tabs read it, so they share the entry. */
export async function getCategoriesThisMonth(signal) {
	const [categories, { window }] = await Promise.all([
		getCategories(signal),
		getStatsSummary('month', undefined, signal)
	])
	return withMonthSpend(categories, window.split)
}

/** The account's uncategorised orders, summed -- the all-time "Without category" figures the
    Categories overview draws beside the real records. Not a row in getCategories' list: that
    list is the account's records, and its readers map records into comboboxes and forms. */
export async function getUncategorised(signal) {
	return request('/api/categories/uncategorised', { signal })
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

/* ---- orders ----
   A draft's `shipping` and `discount` arrive from the create/edit form as comma-formatted
   strings (or ''), the same way shipping always has — parseAmount is what turns "49,00" into
   49, and the API wants a plain number. Everything else in a draft (vendor name, category names, numeric item fields)
   already matches what the server expects. */

const toApiDraft = draft => ({
	vendor: draft.vendor, date: draft.date, status: draft.status, kind: draft.kind,
	categories: draft.categories ?? [], shipping: draft.shipping ? parseAmount(draft.shipping) : 0,
	discount: draft.discount ? parseAmount(draft.discount) : 0,
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

/** POST carried by XMLHttpRequest rather than fetch, for two things fetch cannot serve at
    once: the sent fraction of the request body (xhr.upload.onprogress) and the response read
    line by line while it is still arriving. When the server answers NDJSON (the import
    route's ?progress=stream), each complete line is parsed and handed to `onLine` as it
    lands, and the last line is the result -- the status is 200 throughout a stream, so the
    final line carries the verdict. A plain JSON response resolves and rejects exactly as
    request() does, ApiError body and all. */
function uploadJson(path, body, { signal, onSent, onLine } = {}) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		xhr.open('POST', path)
		xhr.setRequestHeader('Content-Type', 'application/json')
		xhr.withCredentials = true
		if (onSent) xhr.upload.onprogress = e => { if (e.lengthComputable && e.total) onSent(e.loaded / e.total) }
		const streamed = () => (xhr.getResponseHeader('Content-Type') || '').includes('x-ndjson')
		let read = 0, last = null
		const take = line => {
			if (!line.trim()) return
			try { const o = JSON.parse(line); last = o; if (onLine) onLine(o) } catch { /* partial line */ }
		}
		const drain = () => {
			const text = xhr.responseText
			let nl
			while ((nl = text.indexOf('\n', read)) !== -1) { take(text.slice(read, nl)); read = nl + 1 }
		}
		xhr.onprogress = () => { if (streamed()) drain() }
		xhr.onerror = () => reject(new TypeError('Network request failed'))
		xhr.ontimeout = () => reject(new TypeError('Network request timed out'))
		xhr.onabort = () => reject(new DOMException('The operation was aborted.', 'AbortError'))
		if (signal) signal.addEventListener('abort', () => xhr.abort(), { once: true })
		xhr.onload = () => {
			if (streamed()) {
				drain()
				take(xhr.responseText.slice(read))
				if (last && 'imported' in last) resolve(last)
				else reject(new ApiError('The import ended before its result arrived.', xhr.status, undefined, last))
			} else {
				let data = null
				try { data = JSON.parse(xhr.responseText) } catch { /* empty body */ }
				if (xhr.status >= 200 && xhr.status < 300) resolve(data)
				else reject(new ApiError(data?.error || xhr.statusText || 'Request failed', xhr.status, data?.fields, data))
			}
		}
		xhr.send(JSON.stringify(body))
	})
}

/** Bulk-imports whole orders (vendor, categories, items, attachment images) from another
    expense-tracking system in one call. Called by the Settings import card (and any script a
    user writes against the endpoint directly) rather than through useApi like the read
    endpoints above. `onSent` reports the request body's sent fraction, 0 to 1; `onRows`
    reports rows the server has processed so far, streamed back while the import runs. */
export async function importOrders(orders, { signal, onSent, onRows } = {}) {
	return uploadJson('/api/orders/import?progress=stream', { orders }, {
		signal, onSent,
		onLine: o => { if (onRows && o && 'done' in o && 'total' in o) onRows(o.done, o.total) }
	})
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
		discount: order.discount ? String(order.discount).replace('.', ',') : '',
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
	/* spend is the month's here -- that is what this list is -- and `monthSpend` names the same
	   number for the shared budget helpers, which take it under that name wherever they are
	   handed a list whose `spend` is all-time. */
	const named = categories.map(c => ({ ...c, spend: byId.get(c.id)?.amount ?? 0,
		monthSpend: byId.get(c.id)?.amount ?? 0, share: byId.get(c.id)?.share ?? 0 }))
	const rows = none
		? [...named, { id: 'none', name: none.name, icon: 'tag', colour: none.colour,
			spend: none.amount, monthSpend: none.amount, share: none.share }]
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
	const [{ latestOrders }, { window }, categories, settings] = await Promise.all([
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
		/* Both lists carry the name of the list they are, not the shape they have: this page
		   draws orders and categories side by side, and Home draws two more of each. Same
		   naming as getHomeContent below, so a field does not change meaning between the two
		   objects that both feed a breakdown card. */
		latestOrders, period: periodFromWindow(window), monthCategories,
		/* The budget card's own list, and deliberately not monthCategories: that one is cut to
		   what has spend this month, so a budgeted category nobody bought from would drop out
		   of the *denominator* and the same "% of this month's budget used" would read higher
		   here than on Categories, which sums every budget. Two pages, one fact. */
		budgetCategories: withMonthSpend(categories, window.split),
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

/** The running server's build stamp -- { builtAt, commit }, both null outside the Docker
    image, where there is no build to be out of date. Settings prints it so a self-hosted
    box can be checked against the newest commit without shelling into the container. */
export async function getVersion(signal) {
	return request('/api/version', { signal })
}

/** Asks the server to compare its own stamp against the newest published image on the
    registry -- { current, published, commit }. The server does the asking because the
    browser cannot: the registry answers no CORS and wants its own token dance. */
export async function checkVersion(signal) {
	return request('/api/version/check', { signal })
}

export async function saveSettings(patch, signal) {
	return request('/api/settings', { method: 'PATCH', body: patch, signal })
}

export async function resetStoredData(signal) {
	return request('/api/reset', { method: 'POST', signal })
}

/** Replaces this account's ledger with generated demo orders, so the app can be looked at
    with something in it. Replaces rather than adds — see the route's own note.
    A different ledger each press: no seed is sent, so the route picks one. `orders` is how
    many it holds in total and `months` how far back they reach, ending today — the two
    comboboxes on the card. Answers
    { orders, vendors, categories, months, seed } — the seed it used, which is what makes a
    dataset worth reporting reproducible.

    30 seconds and the request is abandoned rather than spinning forever: the largest fill is
    ~5s on the API's own measurements, so six times that is a hang, not a slow day. Abandoned,
    not cancelled — the server finishes what it started, so a fill that answers late has still
    happened, and the error toast is about this page's knowledge of it, not about the data. */
export async function populateDemoData(orders, months, signal) {
	return request('/api/demo-data', { method: 'POST', body: { orders, months },
		signal: signal ?? AbortSignal.timeout(30000) })
}

export async function getDashboardCards(signal) {
	return request('/api/dashboard-cards', { signal })
}

export async function saveDashboardCards(keys, signal) {
	return request('/api/dashboard-cards', { method: 'PUT', body: { on: keys }, signal })
}

/* ---- statistics / home ---- */

export async function getStats(range, windowId, compare, signal) {
	return request('/api/stats' + qs({ range, windowId, compare: compare === 'year' ? 'year' : undefined }), { signal })
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
	const [onboarding, { window }, vendors, categories, settings, { latestOrders }] = await Promise.all([
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
		/* Every list below says which list it is, because Home now draws four that would each
		   answer to a bare `categories` or `vendors`: the month's split, the all-time ranking
		   and the starred ones, twice over. A field called `categories` on this object meant
		   the month's split and read like it meant the account's categories -- the same
		   ambiguity the card keys carry a note about in the API's own catalogue. */
		topVendors: [...vendors].sort((a, b) => b.spend - a.spend).slice(0, rows),
		monthCategories,
		/* The same ranking asked of categories, and all-time like topVendors above it --
		   deliberately not monthCategories, which is this month's split and belongs to the ring.
		   The raw list's `share` is of the account's whole spend, which is the number All
		   categories prints beside these same rows. */
		topCategories: [...categories].sort((a, b) => b.spend - a.spend).slice(0, rows),
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
		// The other half of that same preference. Cut from the raw list, not from topVendors --
		// that one is already sliced to the top few by spend, and a favourite ranked eleventh is
		// still a favourite. Ordered by spend like every other list of vendors here, so the two
		// vendor cards on this page rank the same way.
		favouriteVendors: vendors.filter(v => v.favourite)
			.sort((a, b) => b.spend - a.spend).slice(0, rows),
		onboarding,
		showScanCard: settings.showScanCard,
		latestOrders
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

/** Discards a pending upload outright, cached AI read included -- so re-uploading the same file
    afterwards is read fresh instead of handing back a misparsed draft the dedup lookup would
    otherwise keep serving for a day. */
export async function deleteScanDocument(documentKey, signal) {
	return request(`/api/scan/documents/${documentKey}`, { method: 'DELETE', signal })
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
	{ id: 'cmd-settings', label: 'Settings', meta: 'Go to', to: '/settings', keywords: 'settings preferences defaults reset' },
	{ id: 'cmd-home', label: 'Home', meta: 'Go to', to: '/', keywords: 'home dashboard cards' }
]

/* Records, not rows: a vendor and a category are two rows each, so this many of them fills
   twice as much of the panel. Anything past it is reached through the group's last row. */
const SHOWN_PER_KIND = 2

/* Shorter than this is not searched at all, here or at the server: one letter matches nearly
   every record an account has. Three would be too far -- a two-letter name is how a vendor with
   a long one is reached, "cs" for CS Megastore -- so this number cannot be raised without
   losing those searches. Shell.jsx reads it to say how many letters it is waiting for. */
export const SEARCH_FROM = 2

export async function search(query, signal) {
	const needle = query.trim().toLowerCase()
	if (needle.length < SEARCH_FROM) {
		return { query, groups: [{ heading: 'Commands', options: COMMANDS.slice(0, 5)
			.map(c => ({ id: c.id, ...highlight(c.label, ''), meta: c.meta, to: c.to })) }] }
	}

	const { vendors, categories, orders } = await request('/api/search' + qs({ query }), { signal })
	const groups = []
	const take = (heading, options) => { if (options.length) groups.push({ heading, options }) }
	/* The last row of a group holding more than the panel shows. Its label quotes the typed text,
	   so it takes no needle: the first "a" in `Show all vendors for "a"` is the one in "all". */
	const more = (rows, plural, to, meta) => rows.length <= SHOWN_PER_KIND ? []
		: [{ id: 'more-' + plural, ...highlight(`Show all ${plural} for "${query}"`, ''), meta, to }]

	/* The mark belongs in the name, so only the name is searched for it. Searching the whole
	   label puts the mark for "a" on the "A" of "All orders by Bilka". */
	const named = (prefix, name) => {
		const found = highlight(name, needle)
		return { before: prefix + found.before, mark: found.mark, rest: found.rest }
	}

	take('Orders', orders.slice(0, 4)
		.map(o => ({ id: o.id, ...highlight(`${o.vendor?.name}${sep}${dayMonth(o.date)}`, needle),
			meta: krLabel(o.total), to: `/orders/${o.id}` })))

	/* Two rows a vendor: its orders, and the vendor itself to be changed. Each is named for where
	   it goes rather than for the record it came from -- the heading and the meta already say
	   what kind of record this is, and a row reading "CS Megastore" under a "Vendors" heading
	   reads as opening the vendor when it filters orders.

	   A vendor found through an alias shows the parent vendor's row -- the alias is not a
	   record of its own -- and the meta names the alias that matched, because the needle may
	   not appear anywhere in the name the row shows. */
	const vendorMeta = v => (v.alias ? `Vendor${sep}${v.alias}` : 'Vendor')
	take('Vendors', [
		...vendors.slice(0, SHOWN_PER_KIND).flatMap(v => [
			{ id: v.id, ...named('All orders by ', v.name),
				meta: vendorMeta(v), to: `/orders/all?vendor=${v.id}` },
			{ id: 'vendor-edit-' + v.id, ...named('Edit ', v.name),
				meta: vendorMeta(v), to: `/vendors/${v.id}/edit` }
		]),
		...more(vendors, 'vendors', `/vendors/all?q=${encodeURIComponent(query)}`, 'All vendors')
	])

	/* "Without category" is a filter the server offers, not a category anybody owns, so it gets
	   the row that filters orders and no Edit row -- its id is the sentinel `none`
	   (api/src/routes/search.js) and there is no page behind /categories/none/edit. */
	take('Categories', [
		...categories.slice(0, SHOWN_PER_KIND).flatMap(c => [
			{ id: c.id, ...named('All orders in ', c.name),
				meta: 'Category', to: `/orders/all?category=${c.id}` },
			...(c.id === 'none' ? [] : [{ id: 'category-edit-' + c.id,
				...named('Edit ', c.name),
				meta: 'Category', to: `/categories/${c.id}/edit` }])
		]),
		...more(categories, 'categories', `/categories/all?q=${encodeURIComponent(query)}`, 'All categories')
	])

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
	{ id: 'discount-desc', label: 'Discount, highest' },
	{ id: 'discount-asc', label: 'Discount, lowest' },
	{ id: 'vendor-asc', label: 'Vendor, A to Z' }
]

export const ranges = [
	{ key: 'week', label: 'Week', short: 'WK' },
	{ key: 'month', label: 'Month', short: 'MO' },
	{ key: 'quarter', label: 'Quarter', short: 'QT' },
	{ key: 'year', label: 'Year', short: 'YR' },
	{ key: 'all', label: 'All', short: 'ALL' }
]

/** "this month", "all time" -- the phrase Vendors' and Categories' card headers state their
    ring's window in, keyed the same way `ranges` is. Statistics prints a window's own calendar
    label instead ("August 2026"); these two rings have no pager, always read the current
    window, and "this X" says that plainly rather than naming a date the reader did not pick. */
export const chartPeriodPhrase = key => ({
	week: 'this week', month: 'this month', quarter: 'this quarter', year: 'this year', all: 'all time'
}[key] ?? 'this month')

/* ---- what a write invalidates ----

   The cache trusts its entries until a write drops them (useApi.js), so these lists are
   load-bearing: an endpoint missing from the group its write belongs to is a page showing
   last hour's numbers, not a skeleton that heals on the next mount. They live here, beside
   the endpoints they name, because every write site listing its own subset is how order
   writes went years invalidating the order lists but never the vendor and category stats
   the same rows feed -- masked for exactly as long as every mount re-fetched anyway.

   Grouped by what changed, not by which page called it. Over-invalidation costs one request
   the next time that page is opened; under-invalidation is a wrong figure with no way home. */

/** An order was created, edited, deleted or returned. Orders are the row everything
    aggregates: the lists and the record embed them, stats/hero/home sum them, and the vendor
    and category records carry spend/share/saved computed from them. */
export function invalidateOrderData() {
	invalidate(getOrders); invalidate(getOrder); invalidate(getOrderAsDraft)
	invalidate(getOrdersOverview); invalidate(getHomeContent); invalidate(getHomeHero)
	invalidate(getStats); invalidate(getVendorChartSplit); invalidate(getCategoryChartSplit)
	invalidate(getVendors); invalidate(getVendor)
	invalidate(getCategories); invalidate(getCategoriesThisMonth); invalidate(getCategory)
	invalidate(getUncategorised)
}

/** A vendor record changed (name, look, favourite) or one was created. Order rows embed the
    vendor's name, initials and colour, so the order reads go too -- not just the vendor ones. */
export function invalidateVendorData() {
	invalidate(getVendors); invalidate(getVendor)
	invalidate(getOrders); invalidate(getOrder); invalidate(getOrderAsDraft)
	invalidate(getOrdersOverview); invalidate(getHomeContent); invalidate(getStats)
	invalidate(getVendorChartSplit)
}

/** A category record changed (name, look, budget, favourite) or one was created. Same shape
    as vendors, plus the hero: its legend is the month's category split, colours and all. */
export function invalidateCategoryData() {
	invalidate(getCategories); invalidate(getCategoriesThisMonth); invalidate(getCategory)
	invalidate(getUncategorised)
	invalidate(getOrders); invalidate(getOrder); invalidate(getOrderAsDraft)
	invalidate(getOrdersOverview); invalidate(getHomeContent); invalidate(getHomeHero)
	invalidate(getStats); invalidate(getCategoryChartSplit)
}
