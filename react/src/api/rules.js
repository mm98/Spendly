import { AMOUNT_PATTERN } from './format.js'
import { phrase } from '../language/phrases.js'

/* What a bookmark may hold; each rule takes the trimmed value and returns the message or ''.
   Required: what it is and where to buy it. The address is the one field here normalised
   rather than only judged -- api/src/lib/validate.js stores the form this mirrors. */
export const BOOKMARK_FIELDS = [
	{ name: 'bookmark-name', label: 'Name', check: v =>
		!v ? phrase('bookmark.rule.name') : v.length > 120 ? phrase('rule.maxLength', { count: 120 }) : '' },
	{ name: 'bookmark-url', label: 'Link', check: v =>
		!v ? phrase('bookmark.rule.link')
		: v.length > 2048 ? phrase('bookmark.rule.linkLong')
		: httpUrl(v) ? '' : phrase('bookmark.rule.notLink') },
	{ name: 'bookmark-price', label: 'Price', check: v =>
		!v ? ''
		: v.startsWith('-') ? phrase('rule.priceNegative')
		: AMOUNT_PATTERN.test(v) ? '' : phrase('rule.amountComma') }
]

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

// Ports api/src/lib/validate.js's own set: one rule in the same words at both doors.
const TRACKING_PARAMS = new Set([
	'gclid', 'gclsrc', 'dclid', 'wbraid', 'gbraid', 'fbclid', 'igshid', 'msclkid', 'twclid',
	'ttclid', 'yclid', 'mc_cid', 'mc_eid', '_ga', '_gl'
])
const stripTracking = url => {
	for (const key of [...url.searchParams.keys()])
		if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key)
	return url
}

/** Whatever a link is drawn from goes through here first: `javascript:` in an href is a
    script, and a stored address is only as trustworthy as the door it came in through. */
export function httpUrl(value) {
	const clean = String(value ?? '').trim()
	if (!clean) return null
	let url
	try { url = new URL(HAS_SCHEME.test(clean) ? clean : 'https://' + clean) } catch { return null }
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
	if (!url.hostname.includes('.')) return null
	return stripTracking(url).href
}

/** The shop's name for the line under a bookmark -- a whole address there is a line of query
    string. Falls back to the raw value. */
export const siteOf = value => {
	const href = httpUrl(value)
	if (!href) return String(value ?? '')
	return new URL(href).hostname.replace(/^www\./, '')
}
