import { MAX_PAGE_SIZE } from './constants.js'

/** Whether a vendor or category list request asks for a page rather than the whole list. */
export const wantsPage = q => ['page', 'pageSize', 'ids', 'name', 'like'].some(k => q[k] !== undefined)

/** The LIMIT and OFFSET a request's page and pageSize come to. SQLite reads a negative LIMIT as
    "no limit at all", so the size is clamped here: the same clamp and ceiling as the order list. */
export function pageOf(q, matched) {
	const requested = Number(q.pageSize) || matched || 1
	const size = Math.min(MAX_PAGE_SIZE, Number.isFinite(requested) ? Math.max(1, Math.floor(requested)) : MAX_PAGE_SIZE)
	const pages = Math.max(1, Math.ceil(matched / size))
	const at = Math.min(Math.max(1, Math.floor(Number(q.page)) || 1), pages)
	return { limit: size, offset: (at - 1) * size }
}

/** A comma-separated or repeated query value as a list of distinct, non-empty strings. */
export const listOf = v => [...new Set([].concat(v ?? []).flatMap(x => String(x).split(',')).map(x => x.trim()).filter(Boolean))]

/** Names in the reader's own alphabetical order: their browser's first language, as the lists were
    sorted when the browser sorted them. SQLite's NOCASE knows only A to Z, so this order is JS's. */
export function nameOrder(languages = []) {
	const locale = [].concat(languages).find(l => { try { return Intl.Collator.supportedLocalesOf(l).length } catch { return false } })
	const collator = new Intl.Collator(locale)
	return (a, b) => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0)
}
