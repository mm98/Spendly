/* The API client. useApi.js keys its cache off each function's name, so a reader keeps its name;
   paths are relative, since the dev server proxies /api (vite.config.js). */

import { detectLocale, parseAmount, today } from './format.js'
import { forgetAll, invalidate, peek } from './useApi.js'
import { forgetRecent } from '../app/recent.js'
import { noteServerBuild, writeSettled, writeStarted } from './build.js'

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
	[/^\/api\/orders\/(?!import|draft|overview|often|limits|trash)[^/?]+/, 'order'],
	[/^\/api\/vendors\/[^/?]+/, 'vendor'],
	[/^\/api\/categories\/[^/?]+/, 'category'],
	[/^\/api\/bookmarks\/(?!preview|categories)[^/?]+/, 'bookmark'],
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
	const writes = method !== 'GET'
	if (writes) writeStarted()
	let res
	try {
		res = await fetch(path, {
			method, signal, credentials: 'include',
			headers: { [TODAY]: today(), ...(json ? { 'Content-Type': 'application/json' } : {}) },
			body: form ?? (json ? JSON.stringify(body) : undefined)
		})
		noteServerBuild(res.headers.get('Build'))
	} finally {
		if (writes) writeSettled()
	}
	if (res.status === 204) return null
	let data = null
	try { data = await res.json() } catch { /* empty body */ }
	if (!res.ok) throw refusal(path, method, res.status, data, !!form)
	return data
}

/* ---- auth: each clears the whole read cache, since crossing accounts makes every answer someone else's ---- */

// the locale guess rides with the registration: the first settings row is written in the same transaction
export async function register(email, password, name, signal) {
	const user = await request('/api/auth/register',
		{ method: 'POST', body: { email, password, name, locale: detectLocale() }, signal })
	signedOut = false
	invalidate()
	return user
}

export async function login(email, password, remember = true, signal) {
	const user = await request('/api/auth/login', { method: 'POST', body: { email, password, remember }, signal })
	signedOut = false
	invalidate()
	return user
}

/** What the signed-out pages may offer: `mail` (this server can send a link), `terms` and
    `privacy` (the operator's own pages, or null), `receiptReading` (receipts are sent out to be read). */
export async function getAuthOptions(signal) {
	return request('/api/auth/options', { signal })
}

export async function askPasswordReset(email, signal) {
	return request('/api/auth/reset', { method: 'POST', body: { email }, signal })
}

/** { state: 'valid' | 'used' | 'expired', email } for a reset link. */
export async function readResetLink(token, signal) {
	return request(`/api/auth/reset/${encodeURIComponent(token)}`, { signal })
}

export async function resetPassword(token, password, signal) {
	const out = await request(`/api/auth/reset/${encodeURIComponent(token)}`, { method: 'POST', body: { password }, signal })
	signedOut = false
	invalidate()
	return out
}

/** { state: 'confirmed' | 'already' | 'expired', email }; a confirmed link signs this browser in. */
export async function confirmEmail(token, signal) {
	const out = await request('/api/auth/confirm', { method: 'POST', body: { token }, signal })
	signedOut = false
	invalidate()
	return out
}

export async function resendConfirmation(signal) {
	return request('/api/auth/confirm/resend', { method: 'POST', signal })
}

/* ---- the account's own profile ---- */

export async function updateProfile(patch, signal) {
	const out = await request('/api/account', { method: 'PATCH', body: patch, signal })
	invalidate(getCurrentUser)
	return out
}

export async function uploadPicture(file, signal) {
	const form = new FormData()
	form.append('file', file)
	const out = await request('/api/account/picture', { method: 'PUT', form, signal })
	invalidate(getCurrentUser)
	return out
}

export async function removePicture(signal) {
	const out = await request('/api/account/picture', { method: 'DELETE', signal })
	invalidate(getCurrentUser)
	return out
}

export async function changePassword(current, password, signal) {
	const out = await request('/api/account/password', { method: 'POST', body: { current, password }, signal })
	invalidate(getCurrentUser)
	return out
}

export async function finishSetup(signal) {
	const out = await request('/api/account/setup-done', { method: 'POST', signal })
	invalidate(getCurrentUser)
	return out
}

/* ---- passkeys (20a, 20b, Settings > Passkeys): the device's prompt is app/passkeys.js's ---- */

export async function startPasskeySignIn(signal) {
	return request('/api/auth/passkey/start', { method: 'POST', signal })
}

export async function finishPasskeySignIn(ticket, response, remember = true, signal) {
	const user = await request('/api/auth/passkey/finish', { method: 'POST', body: { ticket, response, remember }, signal })
	signedOut = false
	invalidate()
	return user
}

export async function getPasskeys(signal) {
	return request('/api/account/passkeys', { signal })
}

export async function startAddingPasskey(signal) {
	return request('/api/account/passkeys/start', { method: 'POST', signal })
}

export async function addPasskey(response, signal) {
	const out = await request('/api/account/passkeys', { method: 'POST', body: { response }, signal })
	invalidate(getPasskeys)
	return out
}

export async function renamePasskey(id, name, signal) {
	const out = await request(`/api/account/passkeys/${encodeURIComponent(id)}`, { method: 'PATCH', body: { name }, signal })
	invalidate(getPasskeys)
	return out
}

export async function removePasskey(id, signal) {
	await request(`/api/account/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE', signal })
	invalidate(getPasskeys)
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

/** One page of vendors, `{ vendors, matched }`. The filters and sorts it takes are listed in
    api/src/lib/vendorList.js. */
export async function getVendorPage(params = {}, signal) {
	return request('/api/vendors' + qs(params), { signal })
}

/** Which of these names a vendor already files under. */
export async function getKnownVendorNames(names, signal) {
	return (await request('/api/vendors/known', { method: 'POST', body: { names }, signal })).known
}

/* The server answers at most this many rows at once. */
const MOST = 1000

/** Pages 1 to `pages` of a paged list, as Load more holds them: one more page onto those held, or
    from the start in blocks of whole pages up to MOST. `self` is the reader whose cache holds them. */
async function gathered(self, read, rows, request, size, pages, signal) {
	const before = pages > 1 ? peek(self, [request, size, pages - 1]) : null
	if (before && before[rows].length === size * (pages - 1)) {
		const next = await read({ ...request, page: pages, pageSize: size }, signal)
		return { ...next, [rows]: [...before[rows], ...next[rows]] }
	}
	const block = size * Math.max(1, Math.floor(MOST / size))
	const want = size * pages
	const parts = []
	for (let page = 1; (page - 1) * block < want; page++) {
		parts.push(await read({ ...request, page, pageSize: Math.min(block, want) }, signal))
		if (parts.at(-1)[rows].length < Math.min(block, want)) break
	}
	return { ...parts.at(-1), [rows]: parts.flatMap(p => p[rows]).slice(0, want) }
}

/** The vendor list's pages 1 to `pages`, `size` rows each. */
export async function getVendorPages(request, size, pages, signal) {
	return gathered(getVendorPages, getVendorPage, 'vendors', request, size, pages, signal)
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

/** Moves every order of one vendor to another, makes its names the other's aliases, and deletes it. */
export async function mergeVendor(id, into, signal) {
	const out = await request(`/api/vendors/${id}/merge`, { method: 'POST', body: { into }, signal })
	forgetRecent('vendor', id)
	return out
}

/** A vendor's image (17e): sent whole, refused with a `reason` the form names. */
export async function putVendorImage(id, file, signal) {
	const form = new FormData()
	form.append('file', file)
	return request(`/api/vendors/${id}/image`, { method: 'PUT', form, signal })
}

export async function removeVendorImage(id, signal) {
	return request(`/api/vendors/${id}/image`, { method: 'DELETE', signal })
}

/** One of the image's renditions: 'square-256' or 'wide-1080', addressed by its hash. */
export const vendorImageUrl = (vendorId, hash, rendition) => `/api/vendors/${vendorId}/image/${rendition}?v=${hash}`

export async function deleteVendor(id, signal) {
	const out = await request(`/api/vendors/${id}`, { method: 'DELETE', signal })
	forgetRecent('vendor', id)
	return out
}

/** Adds one other name a vendor is filed under, as a scanned receipt wrote it. Adding one it has is harmless. */
export async function addVendorAlias(id, name, signal) {
	return request('/api/vendors/aliases', { method: 'POST', body: { vendorId: id, name }, signal })
}

/** Whether typed text finds this vendor, on its name or any alias as the server's search does, and the
    alias that did; `alias` is null when the name matched. Empty text matches everything. */
export const vendorTextMatch = (vendor, text) => {
	const needle = String(text ?? '').trim().toLowerCase()
	if (!needle || vendor.name.toLowerCase().includes(needle)) return { matches: true, alias: null }
	const alias = (vendor.aliases ?? []).find(a => a.toLowerCase().includes(needle)) ?? null
	return { matches: Boolean(alias), alias }
}

/* ---- categories ---- */

/** One page of categories, `{ categories, matched }`. The filters and sorts it takes are listed in
    api/src/lib/categoryList.js. */
export async function getCategoryPage(params = {}, signal) {
	return request('/api/categories' + qs(params), { signal })
}

/** The category list's pages 1 to `pages`, `size` rows each. */
export async function getCategoryPages(request, size, pages, signal) {
	return gathered(getCategoryPages, getCategoryPage, 'categories', request, size, pages, signal)
}

/** The colour a new category starts on: the first of the eight no category wears yet. */
export async function getNextCategoryColour(signal) {
	return (await request('/api/categories/colour', { signal })).colour
}

/** What Home's category cards are drawn from: every category with a limit, and how many categories there are. */
export async function getHomeCategories(signal) {
	const [limited, all] = await Promise.all([
		request('/api/categories' + qs({ limited: 'yes', pageSize: MOST }), { signal }),
		request('/api/categories' + qs({ pageSize: 1 }), { signal })
	])
	return { limited: limited.categories, count: all.matched }
}

/** The categories over their monthly limit this month: limits are set by hand, so the server's largest page holds them. */
export async function getOverLimitCategories(signal) {
	return (await request('/api/categories' + qs({ flag: 'over-limit', pageSize: MOST, shape: 'brief' }), { signal })).categories
}

/** Which of these names a category already has, in any case. */
export async function getKnownCategoryNames(names, signal) {
	return (await request('/api/categories/known', { method: 'POST', body: { names }, signal })).known
}

/** Every category with a monthly limit, this month's spend on each: the limits are set by hand, one
    category at a time, so the server's largest page holds them. */
export async function getLimitedCategories(signal) {
	return (await request('/api/categories' + qs({ limited: 'yes', with: 'month', pageSize: MOST }), { signal })).categories
}

/** Whether a category has spent past its monthly limit: `monthSpend`, never the all-time `spend`. */
export const overBudget = category => category.budget > 0 && category.monthSpend > category.budget

/** Category records with this month's spend joined on as `monthSpend`, beside the all-time
    `spend`. `split` is a month window's own category breakdown. */
export const withMonthSpend = (categories, split) => {
	const byId = new Map(split.map(s => [s.id, s]))
	return categories.map(c => ({ ...c, monthSpend: byId.get(c.id)?.amount ?? 0 }))
}

/** The account's orders with no category, summed: a filter, not a record of the list. */
export async function createCategory(name, look = {}, signal) {
	return request('/api/categories', { method: 'POST', body: { name, look }, signal })
}

/** Up to three categories for an order's item names: from earlier orders, or from a model with `model` set. */
export async function getCategorySuggestions(body, signal) {
	return request('/api/categories/suggestions', { method: 'POST', body, signal })
}

export async function getCategory(id, signal) {
	return request(`/api/categories/${id}`, { signal })
}

export async function updateCategory(id, patch, signal) {
	return request(`/api/categories/${id}`, { method: 'PATCH', body: patch, signal })
}

/** Moves every order and bookmark of one category to another, and deletes it. */
export async function mergeCategory(id, into, signal) {
	return request(`/api/categories/${id}/merge`, { method: 'POST', body: { into }, signal })
}

export async function deleteCategory(id, signal) {
	return request(`/api/categories/${id}`, { method: 'DELETE', signal })
}

/* ---- orders: a draft's `shipping` and `discount` arrive as typed ("49,00") and leave as numbers ---- */

const toApiDraft = draft => ({
	vendor: draft.vendor, date: draft.date, status: draft.status, kind: draft.kind,
	statusDates: draft.statusDates ?? {},
	categories: draft.categories ?? [], shipping: draft.shipping ? parseAmount(draft.shipping) : 0,
	discount: draft.discount ? parseAmount(draft.discount) : 0,
	reference: draft.reference ?? '', note: draft.note ?? '', refunded: Boolean(draft.refunded),
	// the copy the form started from and the save's own key: a save over another tab's, or one sent twice, is told apart (6d)
	...(draft.revision ? { revision: draft.revision } : {}),
	...(draft.clientKey ? { clientKey: draft.clientKey } : {}),
	// the receipt this save checked the lines against (3d)
	...(draft.validatedBy ? { validatedBy: draft.validatedBy } : {}),
	// the draft this order is created from, which goes once it is (3a)
	...(draft.draftId ? { draftId: draft.draftId } : {}),
	// a saved line keeps its id, so PUT edits it in place and its photo stays; a new line sends none
	items: (draft.items ?? []).map(i => ({
		...(i.id ? { id: i.id } : {}),
		title: i.title, quantity: i.quantity, price: i.price,
		retail: i.retail ?? null, note: i.note ?? '', url: i.url ?? ''
	}))
})

/* ---- bookmarks: nothing here reaches a total, a chart or a budget, which all read orders. The
   photo is its own request, after the bookmark exists and has an id to hang it on. ---- */

export async function getBookmarks(params = {}, signal) {
	return request('/api/bookmarks' + qs(params), { signal })
}

/** The bookmark list's pages 1 to `pages`, `size` cards each. */
export async function getBookmarkPages(request, size, pages, signal) {
	return gathered(getBookmarkPages, getBookmarks, 'bookmarks', request, size, pages, signal)
}

/** How many bookmarks of one view carry no category: the category filter's "Without category". */
export async function getBookmarksWithoutCategory(archived, signal) {
	return (await request('/api/bookmarks/categories' + qs({ archived: archived ? 'yes' : 'no' }), { signal })).without
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
export const bookmarkPhotoWideUrl = (id, photoId) => `/api/bookmarks/${id}/photo/${photoId}/wide`
// the wide copy made smaller and lighter, for a phone
export const bookmarkPhotoLightUrl = (id, photoId) => `/api/bookmarks/${id}/photo/${photoId}/light`

export async function getOrders(params = {}, signal) {
	return request('/api/orders' + qs(params), { signal })
}

/** Every item line of the orders a list request names (`ids` for orders picked by hand), in the
    list's order: what an export writes. */
export async function getOrderLines(params = {}, signal) {
	return request('/api/orders/lines' + qs(params), { signal })
}

/** What deleting the orders a list request names takes with it, and this month's share (6d). */
export async function getOrderImpact(params = {}, signal) {
	return request('/api/orders/impact' + qs(params), { signal })
}

export async function getOrder(id, signal) {
	return request(`/api/orders/${id}`, { signal }).catch(forgetGone('order', id))
}

export async function createOrder(draft, signal) {
	const order = await request('/api/orders', { method: 'POST', body: toApiDraft(draft), signal })
	tellTabs({ ids: [order.id], revision: order.revision })
	return order
}

/** A 409 is an order changed since `draft.revision`: the error's `body.order` is the order as it is now. */
export async function updateOrder(id, draft, signal) {
	const order = await request(`/api/orders/${id}`, { method: 'PUT', body: toApiDraft(draft), signal })
	tellTabs({ ids: [id], revision: order.revision })
	return order
}

/** Deletes an order; the answer's `undo` names the copy `restoreOrder` puts back (6d). */
export async function deleteOrder(id, signal) {
	const out = await request(`/api/orders/${id}`, { method: 'DELETE', signal })
	forgetRecent('order', id)
	tellTabs({ ids: [id], gone: true })
	return out
}

/* Other tabs of this browser hear of every order saved here (6d): their lists ask again, and an
   edit form open on the same order learns it changed. */
const tabs = typeof BroadcastChannel === 'function' ? new BroadcastChannel('spendly:orders') : null
const tabListeners = new Set()
const tellTabs = news => { try { tabs?.postMessage(news) } catch { /* a closed channel: nobody to tell */ } }
if (tabs) tabs.onmessage = ev => {
	invalidateOrderData()
	for (const fn of tabListeners) fn(ev.data)
}
/** Calls `fn({ ids, revision, gone })` when another tab saves or deletes orders; returns the way to stop. */
export function onOrderSavedElsewhere(fn) {
	tabListeners.add(fn)
	return () => tabListeners.delete(fn)
}

/** True when a request failed for want of a connection, so sending it again later can work. */
export const lostConnection = error => error?.name === 'TypeError'
	|| (error?.name === 'NoAnswer' && [0, 502, 503, 504].includes(error.status))

export async function restoreOrder(undo, signal) {
	const order = await request(`/api/orders/trash/${undo}/restore`, { method: 'POST', signal })
	tellTabs({ ids: [order.id], revision: order.revision })
	return order
}

/** The orders the account repeats, newest of each, with how many `times` (3b). */
export async function getOftenOrders(signal) {
	return request('/api/orders/often', { signal })
}

/** What a vendor cost in this year's window and its median order, as Statistics counts them: `{ amount, median }`. */
export async function getVendorYear(vendorId, signal) {
	return request(`/api/vendors/${encodeURIComponent(vendorId)}/year`, { signal })
}

/** How many of a vendor's newest orders carry every one of these category names: `{ orders }`. */
export async function getVendorOrdersCarrying(vendorId, names, signal) {
	return request(`/api/vendors/${encodeURIComponent(vendorId)}/orders-carrying` + qs({ categories: JSON.stringify(names) }), { signal })
}

/** The vendor names the latest orders carry, newest first: `{ names }`. */
export async function getRecentVendorNames(signal) {
	return request('/api/vendors/recent', { signal })
}

/** The category names the latest orders carry, newest first: `{ names }`. */
export async function getRecentCategoryNames(signal) {
	return request('/api/categories/recent', { signal })
}

/** The monthly limits an order dated `date` in `categories` counts against, without `exclude` (8b). */
export async function getOrderLimits(date, categories, exclude, signal) {
	const usp = new URLSearchParams({ date })
	for (const c of categories) usp.append('categories', c)
	if (exclude) usp.set('exclude', exclude)
	return request(`/api/orders/limits?${usp}`, { signal })
}

/** How many pages an order's file has, and each page as an image (12b). */
export async function getAttachmentPages(orderId, attachmentId, signal) {
	return request(`/api/orders/${orderId}/attachments/${attachmentId}/pages`, { signal })
}
export const attachmentPageUrl = (orderId, attachmentId, page) => `/api/orders/${orderId}/attachments/${attachmentId}/pages/${page}`

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

/* ---- saved order views (2g, 9e): each answer is `{ all, shown, views }`, every view with its count ---- */

export async function getViews(signal) {
	return request('/api/views', { signal })
}

const viewWrite = async (path, method, body) => {
	const out = await request(path, { method, body })
	invalidate(getViews)
	return out
}
export const addView = view => viewWrite('/api/views', 'POST', view)
export const changeView = (id, change) => viewWrite(`/api/views/${encodeURIComponent(id)}`, 'PATCH', change)
export const orderViewsAs = ids => viewWrite('/api/views/order', 'PUT', { ids })
export const deleteView = id => viewWrite(`/api/views/${encodeURIComponent(id)}`, 'DELETE')
export const setViewsShown = shown => viewWrite('/api/views/shown', 'PUT', { shown })

/** One change to several orders at once (Order list 2a, 2e): `{ ids, status, deliveredToday,
    addCategories (names), removeCategories (ids), delete }`. Answers how many were changed. */
export async function changeOrders(change, signal) {
	const out = await request('/api/orders/bulk', { method: 'POST', body: change, signal })
	if (change.delete) for (const id of change.ids) forgetRecent('order', id)
	tellTabs({ ids: change.ids, gone: Boolean(change.delete) })
	return out
}

/** Uploads the files picked or dropped, as they are. */
export async function removeAttachment(orderId, attachmentId, signal) {
	return request(`/api/orders/${orderId}/attachments/${attachmentId}`, { method: 'DELETE', signal })
}

/** Read by `<img src>` directly: a same-origin image request carries the session cookie. */
export const attachmentThumbnailUrl = (orderId, attachmentId) => `/api/orders/${orderId}/attachments/${attachmentId}/thumbnail`
export const attachmentFileUrl = (orderId, attachmentId) => `/api/orders/${orderId}/attachments/${attachmentId}/file`
/** What Download saves: an order's picture at full size, where it has one. */
export const attachmentDownloadUrl = (orderId, attachmentId) => attachmentFileUrl(orderId, attachmentId) + '?download=1'

/** A line's own photo or PDF. The line must be saved first: a draft line has no id to hang it on. */
export async function addItemAttachments(orderId, itemId, files, signal) {
	const form = new FormData()
	for (const file of files) form.append('files', file)
	return request(`/api/orders/${orderId}/items/${itemId}/attachments`, { method: 'POST', form, signal })
}

/** A line's photo copied from another of the account's orders, without sending it again. */
export async function copyItemAttachment(orderId, itemId, from, signal) {
	return request(`/api/orders/${orderId}/items/${itemId}/attachments/copy`, { method: 'POST', body: from, signal })
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
function uploadJson(path, body, { signal, onSent, onLine, isResult = o => 'imported' in o } = {}) {
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
				if (last && isResult(last)) resolve(last)
				else if (last?.error) reject(new ApiError(last.error, xhr.status, undefined, last))
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
export async function importOrders(orders, { signal, onSent, onRows, importId } = {}) {
	return uploadJson('/api/orders/import' + qs({ progress: 'stream', importId }), { orders }, {
		signal, onSent,
		onLine: o => { if (onRows && o && 'done' in o && 'total' in o) onRows(o.done, o.total) }
	})
}

/** The account's last few imports: what each wrote, its mapping, and whether it can still be undone. */
export async function getImports(signal) {
	return request('/api/imports', { signal })
}

/** One import's id and date, however old: { id, createdAt }. */
export async function getImport(id, signal) {
	return request(`/api/imports/${encodeURIComponent(id)}`, { signal })
}

/** An import record the orders about to be sent are tagged with: { id }. */
export async function startImport(fileName, mapping, skipped = 0, signal) {
	return request('/api/imports', { method: 'POST', body: { fileName, mapping, skipped }, signal })
}

/** Removes what an import wrote, within a day of it. */
export async function undoImport(id, signal) {
	const out = await request(`/api/imports/${encodeURIComponent(id)}`, { method: 'DELETE', signal })
	invalidate()
	return out
}

/** Which of `orders` ({ vendor, date, total }) look like orders the account already has: their positions. */
export async function checkImportDuplicates(orders, signal) {
	return request('/api/imports/check', { method: 'POST', body: { orders }, signal })
}

export async function getOrderDraft(signal) {
	return request('/api/orders/draft', { signal })
}

/* ---- settings and account ---- */

export async function getSettings(signal) {
	return request('/api/settings', { signal })
}

/** The running build: { builtAt, commit }, both null outside the Docker image, and `canUpdate`, whether
    this server can install a newer one itself. */
export async function getVersion(signal) {
	return request('/api/version', { signal })
}

/** The running build against the newest published one, asked of the registry by the server:
    { current, published, commit, latestBuiltAt }, the last null when it is this one or unknown. */
export async function checkVersion(signal) {
	return request('/api/version/check', { signal })
}

/** Asks the server to install the newest published version (11d). It restarts to do so, so the answer
    says only that the update started; /api/version names the new commit once it is back. */
export async function startUpdate(signal) {
	return request('/api/version/update', { method: 'POST', signal })
}

export async function saveSettings(patch, signal) {
	return request('/api/settings', { method: 'PATCH', body: patch, signal })
}

/** Replaces the ledger with `orders` demo orders over the last `months`; `onRows(done, total)` hears
    its progress. A timed-out wait does not stop the server, so a late fill has still happened. A failure
    after the old ledger was removed carries `landed` in its body: the orders it kept. */
export async function populateDemoData(orders, months, { signal, onRows } = {}) {
	return uploadJson('/api/demo-data?progress=stream', { orders, months }, {
		signal: signal ?? AbortSignal.timeout(120000),
		onLine: o => { if (onRows && o && 'done' in o && 'total' in o) onRows(o.done, o.total) },
		isResult: o => 'orders' in o && 'vendors' in o
	})
}

/* ---- statistics ---- */

/** A window narrowed by a drill path and a lens: `{ range, windowId, compare, flow, vendorId,
    categoryId, status, from, to }`, every one optional. */
export async function getStatsSlice(slice, signal) {
	return request('/api/stats' + qs(slice), { signal })
}

/** This month's statistics as the Statistics page asks for them, word for word, so every reader of
    this month shares one answer. */
export const thisMonthSlice = () => ({ range: 'month', windowId: today().slice(0, 7), flow: 'expenses' })

/** Each of the last `count` months' spend and orders, oldest first: `{ months: [{ month, spend, orders }] }`. */
export async function getStatsMonths(count, signal) {
	return request('/api/stats/months' + qs({ count }), { signal })
}

/** A page of the orders behind a slice, newest first. */
export async function getSliceOrders(slice, signal) {
	return request('/api/stats/orders' + qs(slice), { signal })
}

/** A slice's orders, pages 1 to `pages` of `size` rows each. */
export async function getSliceOrderPages(slice, size, pages, signal) {
	return gathered(getSliceOrderPages, getSliceOrders, 'orders', slice, size, pages, signal)
}

/** When an order was last added, and the counts behind Home's alerts. */
export async function getHomeAttention(signal) {
	return request('/api/stats/home', { signal })
}

/** Last month's summary for Home (8b): its totals, each limited category's spend and how often it
    went over in twelve months, and whether the reader put it away. */
export async function getMonthlySummary(signal) {
	return request('/api/stats/summary', { signal })
}

/** The whole earlier month this month is measured against, as the Compare setting names it. */
export async function getComparedMonth(signal) {
	return request('/api/stats/compared', { signal })
}

export async function putSummaryAway(month, signal) {
	const answer = await request('/api/stats/summary/seen', { method: 'PUT', body: { month }, signal })
	invalidate(getMonthlySummary)
	return answer
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
/* What the reading of a receipt has found so far, `{ found, lines }`, for whoever shows it (3a step 2). */
const scanProgress = new Map()
export function watchScanProgress(documentKey, fn) {
	const entry = scanProgress.get(documentKey) ?? { listeners: new Set(), last: null }
	scanProgress.set(documentKey, entry)
	entry.listeners.add(fn)
	if (entry.last) fn(entry.last)
	return () => entry.listeners.delete(fn)
}
const tellProgress = (documentKey, progress) => {
	const entry = scanProgress.get(documentKey) ?? { listeners: new Set(), last: null }
	scanProgress.set(documentKey, entry)
	entry.last = progress
	for (const fn of entry.listeners) fn(progress)
}

/** What was read from an uploaded receipt, read as it streams so its progress can be shown. */
export async function getScanDraft(documentKey, signal) {
	return readScan(documentKey, '', signal)
}

/** A scan's review (3a): what was read, and the draft the file is from now on, with the form as it was left. */
export async function getScanReview(documentKey, signal) {
	return readScan(documentKey, '&draft=1', signal)
}

async function readScan(documentKey, extra, signal) {
	const path = `/api/scan/draft/${documentKey}?progress=stream${extra}`
	const res = await fetch(path, { signal, credentials: 'include', headers: { [TODAY]: today() } })
	if (!res.ok) {
		let data = null
		try { data = await res.json() } catch { /* empty body */ }
		throw refusal(path, 'GET', res.status, data)
	}
	const decoder = new TextDecoder()
	let buffered = '', draft = null
	const take = line => {
		if (!line.trim()) return
		const o = JSON.parse(line)
		if (o.progress) tellProgress(documentKey, o.progress)
		if (o.draft) draft = o.draft
	}
	const reader = res.body.getReader()
	for (let part = await reader.read(); !part.done; part = await reader.read()) {
		buffered += decoder.decode(part.value, { stream: true })
		let nl
		while ((nl = buffered.indexOf('\n')) !== -1) { take(buffered.slice(0, nl)); buffered = buffered.slice(nl + 1) }
	}
	take(buffered)
	scanProgress.delete(documentKey)
	if (!draft) throw new TypeError('The reading ended before its answer arrived')
	return draft
}

/** Files a sent upload on an order. `as: 'file'` for a file added in the form, `item` for a
    line's photo, `name` for the name it was chosen under. */
export async function attachScanDocument(documentKey, orderId, { as, item, name } = {}, signal) {
	return request(`/api/scan/documents/${documentKey}/attach/${orderId}` + qs({ as, item, name }), { method: 'POST', signal })
}

export const scanThumbnailUrl = documentKey => `/api/scan/documents/${documentKey}/thumbnail`
export const scanFileUrl = documentKey => `/api/scan/documents/${documentKey}/file`
export const scanDownloadUrl = documentKey => scanFileUrl(documentKey) + '?download=1'
export const scanPageUrl = (documentKey, page) => `/api/scan/documents/${documentKey}/pages/${page}`

export async function getScanPages(documentKey, signal) {
	return request(`/api/scan/documents/${documentKey}/pages`, { signal })
}

/** Forgets what was read from the file, so it is read again when its draft next opens (3c). */
export async function rereadScanDocument(documentKey, signal) {
	return request(`/api/scan/documents/${documentKey}/reread`, { method: 'POST', signal })
}

/** Throws an upload away; a scan's file takes its draft with it (6d). */
export async function discardScanDocument(documentKey, signal) {
	const out = await request(`/api/scan/documents/${documentKey}`, { method: 'DELETE', signal })
	invalidateDraftData()
	return out
}

/* ---- drafts: orders not created yet (3a, 10a) ---- */

/** Home's Drafts card: the newest `limit` drafts and how many there are, `{ drafts, total }`. */
export async function getDrafts(limit = 3, signal) {
	return request('/api/drafts' + qs({ limit }), { signal })
}

/** A draft as it was left: `{ id, form, file }`, `file` the scanned one or null. */
export async function getDraft(id, signal) {
	return request(`/api/drafts/${id}`, { signal })
}

/** Makes a draft of an order made by hand, from its form (3a): `{ id }`. */
export async function makeDraft(form, { keepalive = false } = {}) {
	const path = '/api/drafts'
	const body = JSON.stringify({ form })
	const made = !keepalive || body.length > 60000
		? await request(path, { method: 'POST', body: { form } })
		: await fetch(path, { method: 'POST', credentials: 'include', keepalive: true, body, headers: { [TODAY]: today(), 'Content-Type': 'application/json' } })
			.then(res => (res.ok ? res.json() : Promise.reject(refusal(path, 'POST', res.status, null))))
	invalidateDraftData()
	return made
}

/** Keeps the form as it is on screen. `keepalive` lets it outlive a closing tab, for a small form. */
export function keepDraft(id, form, { keepalive = false } = {}) {
	const path = `/api/drafts/${id}`
	const body = JSON.stringify({ form })
	if (!keepalive || body.length > 60000) return request(path, { method: 'PUT', body: { form } })
	return fetch(path, {
		method: 'PUT', credentials: 'include', keepalive: true, body,
		headers: { [TODAY]: today(), 'Content-Type': 'application/json' }
	}).then(res => (res.ok ? res.json() : Promise.reject(refusal(path, 'PUT', res.status, null))))
}

/** Discard (6d): the draft goes, and its file with it. */
export async function discardDraft(id, signal) {
	const out = await request(`/api/drafts/${id}`, { method: 'DELETE', signal })
	invalidateDraftData()
	return out
}

/** A draft was made, changed or discarded: only the lists that show drafts read it. */
export function invalidateDraftData() {
	drop(getOrders, getOrder, getDrafts, getDraft, getViews, getScanReview)
}

/** Sends one file to be kept until a save files it (17a). `onSent` hears the fraction sent, 0 to 1;
    `scan` makes the file a scan, which a draft holds until it is created or discarded (3a). */
export function sendFile(file, { signal, onSent, scan = false } = {}) {
	const path = '/api/scan/documents' + (scan ? '?scan=1' : '')
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		xhr.open('POST', path)
		xhr.setRequestHeader(TODAY, today())
		xhr.withCredentials = true
		if (onSent) xhr.upload.onprogress = e => { if (e.lengthComputable && e.total) onSent(e.loaded / e.total) }
		xhr.onerror = () => reject(new TypeError('Network request failed'))
		xhr.onabort = () => reject(new DOMException('The operation was aborted.', 'AbortError'))
		if (signal) signal.addEventListener('abort', () => xhr.abort(), { once: true })
		xhr.onload = () => {
			let data = null
			try { data = JSON.parse(xhr.responseText) } catch { /* empty body */ }
			if (xhr.status >= 200 && xhr.status < 300) resolve(data)
			else reject(refusal(path, 'POST', xhr.status, data, true))
		}
		const form = new FormData()
		form.append('file', file)
		xhr.send(form)
	})
}

/** Vendors (with the alias that matched), categories, bookmarks and orders holding the text, each cut
    at eight; `counts` holds the full number of vendors and, past eight orders, of items. */
export async function searchRecords(query, signal) {
	return request('/api/search' + qs({ query }), { signal })
}

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

const orderReads = [getOrders, getVendorYear, getVendorOrdersCarrying, getRecentVendorNames, getRecentCategoryNames, getDrafts, getOrderImpact, getOrder, getStatsSlice, getStatsMonths, getSliceOrders, getSliceOrderPages, getHomeAttention, getMonthlySummary, getComparedMonth, getOftenOrders, getOrderLimits, getStatuses, getViews]
const vendorReads = [getVendorPage, getVendorYear, getRecentVendorNames, getVendorPages, getKnownVendorNames, getVendor, getHomeAttention]
const categoryReads = [getCategoryPage, getVendorOrdersCarrying, getRecentCategoryNames, getHomeCategories, getNextCategoryColour, getOverLimitCategories, getCategoryPages, getKnownCategoryNames, getLimitedCategories, getCategory, getMonthlySummary]
const bookmarkReads = [getBookmarks, getBookmarkPages, getBookmark, getBookmarksWithoutCategory]
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
