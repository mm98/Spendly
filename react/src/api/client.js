/* The API client. useApi.js keys its cache off each function's name, so a reader keeps its name;
   paths are relative, since the dev server proxies /api (vite.config.js). */

import { detectLocale, parseAmount, today } from './format.js'
import { forgetAll, invalidate } from './useApi.js'
import { forgetRecent } from '../app/recent.js'

class ApiError extends Error {
	constructor(message, status, fields, body) {
		super(message)
		this.name = 'ApiError'
		this.status = status
		this.fields = fields
		// kept whole: the import route's 400 carries a per-row `failed` list, not a sentence
		this.body = body
	}
}

/** A failure with no sentence for the reader (a gateway, a crash, a server note): the same kind
    as no connection, so the page's own words show. The answer is kept whole, as ApiError keeps it. */
class NoAnswer extends Error {
	constructor(status, fields, body) {
		super('No answer')
		this.name = 'NoAnswer'
		this.status = status
		this.fields = fields
		this.body = body
	}
}

// what the server says reaches the reader only as a refusal written for them: a whole sentence,
// never a crash's note or a record's internal id; an upload's refusal may open on the file's own name
const forReader = (status, text, upload = false) => status < 500 && typeof text === 'string'
	&& (upload ? /^\S.*[.?!]$/s : /^[A-Z0-9"'(].*[.?!]$/s).test(text.trim()) && !/\b[a-z]{1,3}-[0-9a-f]{8,}\b/.test(text)

/** The sentence a failed request shows: the server's own words, or `fallback` for a failure that
    has none (no connection), whose browser message is not about what the reader did. Empty for a
    session that ended: the shell's signed-out dialog says it once. */
export const failureMessage = (error, fallback) =>
	error?.signedOut ? '' : error?.name === 'ApiError' ? error.message : fallback

// the records a "not found" can name, by the address asked; the server's own text carries an id
const THINGS = [
	[/^\/api\/orders\/(?!import|draft|overview)[^/?]+/, 'order'],
	[/^\/api\/vendors\/[^/?]+/, 'vendor'],
	[/^\/api\/categories\/(?!uncategorised)[^/?]+/, 'category'],
	[/^\/api\/bookmarks\/(?!preview)[^/?]+/, 'bookmark'],
	[/^\/api\/budget\/lines\//, 'budget row'],
	[/^\/api\/budget\/groups\//, 'budget group'],
	[/^\/api\/budget\/accounts\//, 'account']
]

/** What a record that is gone says: a save names the loss, never the record's id. */
const goneMessage = (thing, method) => (method === 'GET' ? `This ${thing} does not exist. It may have been deleted.`
	: method === 'DELETE' ? `This ${thing} was already deleted in another window.`
	: `This ${thing} was deleted in another window. Your changes cannot be saved.`)

const qs = params => {
	const usp = new URLSearchParams()
	for (const [k, v] of Object.entries(params ?? {})) if (v !== '' && v != null) usp.set(k, String(v))
	const s = usp.toString()
	return s ? '?' + s : ''
}

/* A session that ends while the shell is open (20e). Only a listener present at the time hears
   it, and never after the reader signed out themselves. */
let sessionListener = null
let signedOut = false
export function onSessionEnded(fn) {
	sessionListener = fn
	return () => { if (sessionListener === fn) sessionListener = null }
}

/** The error a refused request throws: `signedOut` for a session that ended, `gone` for a record that is gone. */
function refusal(path, method, status, data, upload = false) {
	const ended = status === 401 && !path.startsWith('/api/auth/')
	if (ended && !signedOut) sessionListener?.()
	const thing = status === 404 ? THINGS.find(([at]) => at.test(path))?.[1] : null
	const error = thing ? new ApiError(goneMessage(thing, method), status, data?.fields, data)
		: forReader(status, data?.error, upload) ? new ApiError(data.error, status, data.fields, data)
		: new NoAnswer(status, data?.fields, data)
	if (ended) error.signedOut = true
	if (thing) error.gone = true
	return error
}

// the reader's own date, which the server takes as today
const TODAY = 'X-Spendly-Today'

async function request(path, { method = 'GET', body, signal, form } = {}) {
	const json = !form && body !== undefined
	const res = await fetch(path, {
		method, signal, credentials: 'include',
		headers: { [TODAY]: today(), ...(json ? { 'Content-Type': 'application/json' } : {}) },
		body: form ?? (json ? JSON.stringify(body) : undefined)
	})
	if (res.status === 204) return null
	let data = null
	try { data = await res.json() } catch { /* empty body */ }
	if (!res.ok) throw refusal(path, method, res.status, data, !!form)
	return data
}

/* ---- auth: each clears the whole read cache, since crossing accounts makes every answer someone else's ---- */

// the locale guess rides with the registration: the first settings row is written in the same transaction
export async function register(email, password, signal) {
	const user = await request('/api/auth/register',
		{ method: 'POST', body: { email, password, locale: detectLocale() }, signal })
	signedOut = false
	invalidate()
	return user
}

export async function login(email, password, signal) {
	const user = await request('/api/auth/login', { method: 'POST', body: { email, password }, signal })
	signedOut = false
	invalidate()
	return user
}

/* The page still on screen is leaving: its readers are not asked again, since every answer
   now would be a refusal. */
export async function logout(signal) {
	signedOut = true
	try {
		const out = await request('/api/auth/logout', { method: 'POST', signal })
		forgetAll()
		return out
	} catch (error) {
		signedOut = false
		throw error
	}
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
	return request(`/api/vendors/${id}`, { signal }).catch(forgetGone('vendor', id))
}

export async function updateVendor(id, patch, signal) {
	return request(`/api/vendors/${id}`, { method: 'PATCH', body: patch, signal })
}

/* A deleted order or vendor leaves Jump back in, so the palette never asks for it (9d): here, or
   on the first read that finds it gone. */
const forgetGone = (kind, id) => error => {
	if (error?.gone) forgetRecent(kind, id)
	throw error
}

export async function deleteVendor(id, signal) {
	const out = await request(`/api/vendors/${id}`, { method: 'DELETE', signal })
	forgetRecent('vendor', id)
	return out
}

/** Adds one other name a vendor is filed under, as a scanned receipt wrote it. Adding one it has is harmless. */
export async function addVendorAlias(id, name, signal) {
	return request('/api/vendors/aliases', { method: 'POST', body: { vendorId: id, name }, signal })
}

/* A vendor matches on its name and every alias, by the same rules as the server's
   findVendorIdByAnyName (exact) and its search query (part of the text). */

/** The vendor a string is: its name or an alias, exactly, in any case. */
export const vendorByAnyName = (vendors, name) => {
	const needle = String(name ?? '').trim().toLowerCase()
	if (!needle) return undefined
	return vendors.find(v => v.name.toLowerCase() === needle
		|| (v.aliases ?? []).some(a => a.toLowerCase() === needle))
}

/** Whether typed text finds this vendor, and the alias that did; `alias` is null when the name
    matched. Empty text matches everything. */
export const vendorTextMatch = (vendor, text) => {
	const needle = String(text ?? '').trim().toLowerCase()
	if (!needle || vendor.name.toLowerCase().includes(needle)) return { matches: true, alias: null }
	const alias = (vendor.aliases ?? []).find(a => a.toLowerCase().includes(needle)) ?? null
	return { matches: Boolean(alias), alias }
}

/* ---- categories ---- */

export async function getCategories(signal) {
	return request('/api/categories', { signal })
}

/** Whether a category has spent past its monthly limit: `monthSpend`, never the all-time `spend`. */
export const overBudget = category => category.budget > 0 && category.monthSpend > category.budget

/** Category records with this month's spend joined on as `monthSpend`, beside the all-time
    `spend`. `split` is a month window's own category breakdown. */
export const withMonthSpend = (categories, split) => {
	const byId = new Map(split.map(s => [s.id, s]))
	return categories.map(c => ({ ...c, monthSpend: byId.get(c.id)?.amount ?? 0 }))
}

/** The category list with this month's spend joined on: a join of two requests, so its own cache entry. */
export async function getCategoriesThisMonth(signal) {
	const [categories, { window }] = await Promise.all([
		getCategories(signal),
		request('/api/stats' + qs({ range: 'month', summary: 1 }), { signal })
	])
	return { categories: withMonthSpend(categories, window.split) }
}

/** The account's orders with no category, summed: a filter, not a record of the list. */
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

/* ---- orders: a draft's `shipping` and `discount` arrive as typed ("49,00") and leave as numbers ---- */

const toApiDraft = draft => ({
	vendor: draft.vendor, date: draft.date, status: draft.status, kind: draft.kind,
	deliveredDate: draft.deliveredDate, returnedDate: draft.returnedDate,
	categories: draft.categories ?? [], shipping: draft.shipping ? parseAmount(draft.shipping) : 0,
	discount: draft.discount ? parseAmount(draft.discount) : 0,
	reference: draft.reference ?? '', note: draft.note ?? '', refunded: Boolean(draft.refunded),
	// a saved line keeps its id, so PUT edits it in place and its photo stays; a new line sends none
	items: (draft.items ?? []).map(i => ({
		...(i.id ? { id: i.id } : {}),
		title: i.title, quantity: i.quantity, price: i.price,
		retail: i.retail ?? null, note: i.note ?? ''
	}))
})

/* ---- bookmarks: nothing here reaches a total, a chart or a budget, which all read orders. The
   photo is its own request, after the bookmark exists and has an id to hang it on. ---- */

export async function getBookmarks(params = {}, signal) {
	return request('/api/bookmarks' + qs(params), { signal })
}

export async function getBookmark(id, signal) {
	return request(`/api/bookmarks/${id}`, { signal })
}

/** `{ title, image, thumbnail }` from the shop's page, any of them null. A request that falls
    over is the same nothing: a bookmark is saved by typing a name, never by this succeeding. */
export async function getBookmarkPreview(url, signal) {
	try {
		return await request('/api/bookmarks/preview' + qs({ url }), { signal })
	} catch {
		return { title: null, image: null }
	}
}

/** Fetched by the server, not the browser: it lives on the shop's host. Silent, so a picture
    that cannot be had leaves the bookmark as it saved. */
export async function addBookmarkPhotoFromUrl(id, url, signal) {
	try {
		const saved = await request(`/api/bookmarks/${id}/photo`, { method: 'POST', body: { url }, signal })
		invalidateBookmarkData()
		return saved
	} catch {
		return null
	}
}

const toApiBookmark = bookmark => ({
	name: bookmark.name,
	url: bookmark.url,
	// an empty price is no price at all, never zero, which would claim the thing is free
	price: bookmark.price ? parseAmount(bookmark.price) : null,
	categories: bookmark.categories ?? [],
	archived: Boolean(bookmark.archived)
})

export async function createBookmark(bookmark, signal) {
	const saved = await request('/api/bookmarks', { method: 'POST', body: toApiBookmark(bookmark), signal })
	invalidateBookmarkData()
	return saved
}

export async function updateBookmark(id, bookmark, signal) {
	const saved = await request(`/api/bookmarks/${id}`, { method: 'PATCH', body: toApiBookmark(bookmark), signal })
	invalidateBookmarkData()
	return saved
}

/** Archives or brings back one bookmark; nothing else on it changes. */
export async function setBookmarkArchived(id, archived, signal) {
	const saved = await request(`/api/bookmarks/${id}`, { method: 'PATCH', body: { archived: Boolean(archived) }, signal })
	invalidateBookmarkData()
	return saved
}

export async function deleteBookmark(id, signal) {
	const gone = await request(`/api/bookmarks/${id}`, { method: 'DELETE', signal })
	invalidateBookmarkData()
	return gone
}

export async function addBookmarkPhoto(id, file, signal) {
	const form = new FormData()
	form.append('file', file)
	const saved = await request(`/api/bookmarks/${id}/photo`, { method: 'POST', form, signal })
	invalidateBookmarkData()
	return saved
}

export async function removeBookmarkPhoto(id, signal) {
	const saved = await request(`/api/bookmarks/${id}/photo`, { method: 'DELETE', signal })
	invalidateBookmarkData()
	return saved
}

/* ---- budget: one sheet a year, rows in groups, an expected and a real amount a month. Every
   write answers with the whole year as it is now stored. ---- */

export async function getBudgetYears(signal) {
	return request('/api/budget', { signal })
}

export async function getBudgetYear(year, signal) {
	return request(`/api/budget/${year}`, { signal })
}

async function budgetWrite(path, method, body, signal) {
	const answer = await request(path, { method, body, signal })
	invalidateBudgetData()
	return answer
}

/** `amounts` is what the copied months become: 'same', 'expected', or 'none'. */
export const createBudgetYear = (year, from, amounts, signal) =>
	budgetWrite('/api/budget', 'POST', { year, from, amounts }, signal)
export const deleteBudgetYear = (year, signal) => budgetWrite(`/api/budget/${year}`, 'DELETE', undefined, signal)
export const importBudget = (years, accounts, signal) =>
	budgetWrite('/api/budget/import', 'POST', { years, accounts }, signal)
export const addBudgetGroup = (year, group, signal) =>
	budgetWrite(`/api/budget/${year}/groups`, 'POST', group, signal)
export const updateBudgetGroup = (id, patch, signal) =>
	budgetWrite(`/api/budget/groups/${id}`, 'PATCH', patch, signal)
export const deleteBudgetGroup = (id, signal) => budgetWrite(`/api/budget/groups/${id}`, 'DELETE', undefined, signal)
export const addBudgetLine = (groupId, line, signal) =>
	budgetWrite(`/api/budget/groups/${groupId}/lines`, 'POST', line, signal)
export const updateBudgetLine = (id, patch, signal) =>
	budgetWrite(`/api/budget/lines/${id}`, 'PATCH', patch, signal)
export const deleteBudgetLine = (id, signal) => budgetWrite(`/api/budget/lines/${id}`, 'DELETE', undefined, signal)

/** The account list every row picks from, each with how many rows use it. Every write answers
    with the whole list, as reading it does. */
export async function getBudgetAccounts(signal) {
	return (await request('/api/budget/accounts', { signal })).accounts
}
const accountWrite = async (path, method, body, signal) => (await budgetWrite(path, method, body, signal)).accounts
export const addBudgetAccount = (account, signal) => accountWrite('/api/budget/accounts', 'POST', account, signal)
export const updateBudgetAccount = (id, patch, signal) =>
	accountWrite(`/api/budget/accounts/${id}`, 'PATCH', patch, signal)
export const deleteBudgetAccount = (id, signal) =>
	accountWrite(`/api/budget/accounts/${id}`, 'DELETE', undefined, signal)

/** Bank payments placed by hand: { pattern, kind, line }, where line null is "not in the budget".
    Every write answers with the whole list. */
export async function getBankLinks(signal) {
	return (await request('/api/budget/links', { signal })).links
}
const linkWrite = async (path, method, body, signal) => (await budgetWrite(path, method, body, signal)).links
export const saveBankLink = (link, signal) => linkWrite('/api/budget/links', 'PUT', link, signal)
export const forgetBankLink = ({ pattern, kind }, signal) =>
	linkWrite(`/api/budget/links?${new URLSearchParams({ pattern, kind })}`, 'DELETE', undefined, signal)

/** Carrying the picture's own id, so the address changes with the bytes and a browser told to
    keep one forever never shows a replaced photo. */
export const bookmarkPhotoThumbnailUrl = (id, photoId) => `/api/bookmarks/${id}/photo/${photoId}/thumbnail`

export async function getOrders(params = {}, signal) {
	return request('/api/orders' + qs(params), { signal })
}

export async function getOrder(id, signal) {
	return request(`/api/orders/${id}`, { signal }).catch(forgetGone('order', id))
}

export async function createOrder(draft, signal) {
	return request('/api/orders', { method: 'POST', body: toApiDraft(draft), signal })
}

export async function updateOrder(id, draft, signal) {
	return request(`/api/orders/${id}`, { method: 'PUT', body: toApiDraft(draft), signal })
}

export async function deleteOrder(id, signal) {
	const out = await request(`/api/orders/${id}`, { method: 'DELETE', signal })
	forgetRecent('order', id)
	return out
}

/* ---- the account's statuses (Settings 11a): each answer is the whole list, in order ---- */

export async function getStatuses(signal) {
	return request('/api/statuses', { signal })
}

const statusWrite = async (path, method, body) => {
	const out = await request(path, { method, body })
	invalidate(getStatuses)
	return out
}
export const addStatus = status => statusWrite('/api/statuses', 'POST', status)
export const changeStatus = (key, status) => statusWrite(`/api/statuses/${encodeURIComponent(key)}`, 'PATCH', status)
export const orderStatusesAs = keys => statusWrite('/api/statuses/order', 'PUT', { keys })
export const deleteStatus = key => statusWrite(`/api/statuses/${encodeURIComponent(key)}`, 'DELETE')

/** One change to several orders at once (Order list 2a, 2e): `{ ids, status, deliveredToday,
    addCategories (names), removeCategories (ids), delete }`. Answers how many were changed. */
export async function changeOrders(change, signal) {
	const out = await request('/api/orders/bulk', { method: 'POST', body: change, signal })
	if (change.delete) for (const id of change.ids) forgetRecent('order', id)
	return out
}

/** Uploads the files picked or dropped, as they are. */
export async function addAttachments(orderId, files, signal) {
	const form = new FormData()
	for (const file of files) form.append('files', file)
	return request(`/api/orders/${orderId}/attachments`, { method: 'POST', form, signal })
}

export async function removeAttachment(orderId, attachmentId, signal) {
	return request(`/api/orders/${orderId}/attachments/${attachmentId}`, { method: 'DELETE', signal })
}

/** Read by `<img src>` directly: a same-origin image request carries the session cookie. */
export const attachmentThumbnailUrl = (orderId, attachmentId) => `/api/orders/${orderId}/attachments/${attachmentId}/thumbnail`
export const attachmentFileUrl = (orderId, attachmentId) => `/api/orders/${orderId}/attachments/${attachmentId}/file`

/** A line's own photo or PDF. The line must be saved first: a draft line has no id to hang it on. */
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

/** A POST by XMLHttpRequest, for the sent fraction of the body and an NDJSON answer read line by
    line as it arrives; a stream is 200 throughout, so its last line carries the verdict. */
function uploadJson(path, body, { signal, onSent, onLine } = {}) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		xhr.open('POST', path)
		xhr.setRequestHeader('Content-Type', 'application/json')
		xhr.setRequestHeader(TODAY, today())
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
				else reject(refusal(path, 'POST', xhr.status, data))
			}
		}
		xhr.send(JSON.stringify(body))
	})
}

/** Imports whole orders from a file. `onSent` reports the fraction sent, 0 to 1; `onRows` the
    rows the server has processed so far. */
export async function importOrders(orders, { signal, onSent, onRows } = {}) {
	return uploadJson('/api/orders/import?progress=stream', { orders }, {
		signal, onSent,
		onLine: o => { if (onRows && o && 'done' in o && 'total' in o) onRows(o.done, o.total) }
	})
}

export async function getOrderDraft(signal) {
	return request('/api/orders/draft', { signal })
}

/* ---- settings and account ---- */

export async function getSettings(signal) {
	return request('/api/settings', { signal })
}

/** The running build: { builtAt, commit }, both null outside the Docker image. */
export async function getVersion(signal) {
	return request('/api/version', { signal })
}

/** The running build against the newest published one: { current, published, commit }. The
    server asks the registry, which a browser cannot. */
export async function checkVersion(signal) {
	return request('/api/version/check', { signal })
}

export async function saveSettings(patch, signal) {
	return request('/api/settings', { method: 'PATCH', body: patch, signal })
}

/** Replaces the ledger with `orders` demo orders over the last `months`. Given up after 30 s, six
    times the largest fill; the server still finishes, so a late fill has still happened. */
export async function populateDemoData(orders, months, signal) {
	return request('/api/demo-data', { method: 'POST', body: { orders, months },
		signal: signal ?? AbortSignal.timeout(30000) })
}

/* ---- statistics ---- */

export async function getStats(range, windowId, compare, signal) {
	return request('/api/stats' + qs({ range, windowId, compare: compare === 'year' ? 'year' : undefined }), { signal })
}

/** The order the vendors and categories lists open in: one setting, so only the orders both lists
    have. A label names the column and the direction; Name has one direction, the one that finds. */
export const listSorts = [
	{ id: 'name-asc', label: 'Name, A to Z' },
	{ id: 'spend-desc', label: 'Spend, highest' },
	{ id: 'spend-asc', label: 'Spend, lowest' },
	{ id: 'saved-desc', label: 'Saved, highest' },
	{ id: 'saved-asc', label: 'Saved, lowest' }
]

/* ---- scan ---- */

/** Uploads a receipt; its bytes are kept until the new order takes it as an attachment. */
export async function putScanDocument(file, signal) {
	const form = new FormData()
	form.append('file', file)
	return request('/api/scan/documents', { method: 'POST', form, signal })
}

export async function getScanDraft(documentKey, signal) {
	return request(`/api/scan/draft/${documentKey}`, { signal })
}

export async function attachScanDocument(documentKey, orderId, signal) {
	return request(`/api/scan/documents/${documentKey}/attach/${orderId}`, { method: 'POST', signal })
}

export const scanThumbnailUrl = documentKey => `/api/scan/documents/${documentKey}/thumbnail`

/** The records the text appears in, as the server answers: vendors (with the alias that
    matched), categories, bookmarks and orders with their item titles, each cut at SEARCH_CAP. */
export async function searchRecords(query, signal) {
	return request('/api/search' + qs({ query }), { signal })
}
// the server's MAX_PER_KIND (api/src/routes/search.js): a kind that fills it may hold more
export const SEARCH_CAP = 8

/* ---- option lists: spendKinds mirrors the server's own; statuses are the account's (getStatuses) ---- */

export const spendKinds = ['Expense', 'Gift', 'Sold', 'Work', 'Other']

// a ranking comes in both directions; Vendor groups rather than ranks, so it has one
export const sorts = [
	{ id: 'date-desc', label: 'Date, newest' },
	{ id: 'date-asc', label: 'Date, oldest' },
	{ id: 'amount-desc', label: 'Amount, highest' },
	{ id: 'amount-asc', label: 'Amount, lowest' },
	{ id: 'vendor-asc', label: 'Vendor, A to Z' }
]

/** The two price sorts also narrow: a bookmark with no price is not the cheapest one
    (api/src/routes/bookmarks.js). */
export const bookmarkSorts = [
	{ id: 'added-desc', label: 'Added, newest' },
	{ id: 'added-asc', label: 'Added, oldest' },
	{ id: 'price-desc', label: 'Price, highest' },
	{ id: 'price-asc', label: 'Price, lowest' },
	{ id: 'name-asc', label: 'Name, A to Z' }
]

/* ---- what a write invalidates: the cache trusts an answer until a write drops it (useApi.js),
   so a read missing from its group shows old figures. Grouped by what changed. ---- */

const orderReads = [getOrders, getOrder, getStats, getStatuses]
const vendorReads = [getVendors, getVendor]
const categoryReads = [getCategories, getCategoriesThisMonth, getCategory, getUncategorised]
const bookmarkReads = [getBookmarks, getBookmark]
const drop = (...groups) => { for (const fn of groups.flat()) invalidate(fn) }

/** An order changed: everything sums orders, and saving one can create a vendor or a category. */
export function invalidateOrderData() {
	drop(orderReads, vendorReads, categoryReads)
}

/** A vendor changed or was created. Order rows carry its name, and its default categories can
    create a category. */
export function invalidateVendorData() {
	drop(vendorReads, orderReads, categoryReads)
}

/** A bookmark changed. Saving one can create a category it names. */
function invalidateBookmarkData() {
	drop(bookmarkReads, categoryReads)
}

/** A category changed or was created. Orders, vendors' defaults and bookmarks carry its name. */
export function invalidateCategoryData() {
	drop(categoryReads, orderReads, vendorReads, bookmarkReads)
}

/** The budget changed: only the budget page and the bank check read it. */
function invalidateBudgetData() {
	drop(getBudgetYears, getBudgetYear, getBudgetAccounts, getBankLinks)
}
