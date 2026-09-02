import { AMOUNT_PATTERN, WHOLE_NUMBER_PATTERN, today } from './format.js'
import { spendKinds } from './client.js'

/* What an order and an item may hold, in one place.

   Create and scan are two doors to one saved order, so a value that is required at one door is
   required at the other and rejected in the same words. They were two copies of four rules and
   they had already parted company: the scan review checked nothing at all, so a receipt whose
   vendor line came back blank saved an order with no vendor on it, and the create form said
   "Who did you buy from?" about the same field. Rules that live at the call site agree until
   the day one of them is fixed. README: Fields and Forms.

   Each rule takes the trimmed value and returns the message or ''. The marking, the focus and
   the announcement are Form.jsx's -- see useFieldErrors. */

/** Step 1 of New order, and the scan review. Required: Vendor, Date, Kind. */
export const ORDER_FIELDS = [
	{ name: 'order-vendor', label: 'Vendor', check: v =>
		!v ? 'Who did you buy from?' : v.length > 80 ? '80 characters at most.' : '' },
	/* An empty type=date is '' and so is a half-typed one -- the engine refuses to hand over
	   25.07.20 -- so "required" catches a malformed date as well. */
	{ name: 'order-date', label: 'Date', check: v =>
		!v ? 'When was the order placed?'
		: v > today() ? 'An order cannot be dated in the future.' : '' },
	{ name: 'order-kind', label: 'Kind', check: v =>
		!v ? 'Pick a kind.'
		: spendKinds.some(k => k.toLowerCase() === v.toLowerCase()) ? ''
		: 'Kind is one of: ' + spendKinds.join(', ') + '.' },
	{ name: 'order-shipping', label: 'Shipping fee', check: v =>
		!v ? ''
		: v.startsWith('-') ? 'Shipping cannot go below zero.'
		: AMOUNT_PATTERN.test(v) ? '' : 'Amounts take a comma, such as 49,00.' },
	/* The order's rabat, entered as the amount taken off -- so it is non-negative like the two
	   above, and the subtracting is the column's job rather than the value's. */
	{ name: 'order-discount', label: 'Discount', check: v =>
		!v ? ''
		: v.startsWith('-') ? 'Enter what was taken off, without the minus.'
		: AMOUNT_PATTERN.test(v) ? '' : 'Amounts take a comma, such as 25,00.' }
]

/** Conditional on Status, so not part of ORDER_FIELDS -- each page includes one only while it
    renders the field. Order against delivery/order date is checked server-side only (validate.js). */
export const DELIVERED_DATE_FIELD = { name: 'order-delivered-date', label: 'Delivered date', check: v =>
	!v ? 'When did it arrive?' : v > today() ? 'A delivery cannot be dated in the future.' : '' }
export const RETURNED_DATE_FIELD = { name: 'order-returned-date', label: 'Returned date', check: v =>
	!v ? 'When was it returned?' : v > today() ? 'A return cannot be dated in the future.' : '' }

/** Step 2's item form. Required: Description, Quantity, Price paid. Retail and Note are
    optional and still checked -- optional is not unchecked, and `gratis` is as wrong there. */
export const ITEM_FIELDS = [
	{ name: 'item-description', label: 'Description', check: v =>
		!v ? 'Describe the item.' : v.length > 120 ? '120 characters at most.' : '' },
	{ name: 'item-quantity', label: 'Quantity', check: v =>
		!v ? 'How many did you buy?'
		: !WHOLE_NUMBER_PATTERN.test(v) ? 'Whole pieces only, such as 2.'
		: Number(v) < 1 ? 'At least 1 pc.'
		: Number(v) > 9999 ? '9.999 pcs at most.' : '' },
	/* No money field here is signed. A rabat was a negative price on a line once; it is the
	   order's own Discount field now, so price says what it cost and points at the field that
	   subtracts rather than blaming the comma. */
	{ name: 'item-price', label: 'Price paid', check: v =>
		!v ? 'What did you pay?'
		: v.startsWith('-') ? 'Price cannot go below zero. Put a discount on the order instead.'
		: AMOUNT_PATTERN.test(v) ? '' : 'Amounts take a comma, such as 89,95.' },
	{ name: 'item-retail', label: 'Retail price', check: v =>
		!v ? ''
		: v.startsWith('-') ? 'Retail cannot go below zero.'
		: AMOUNT_PATTERN.test(v) ? '' : 'Amounts take a comma, such as 104,95.' },
	{ name: 'item-note', label: 'Note', check: v =>
		v.length > 120 ? '120 characters at most.' : '' }
]

/** A line corrected on the scan review is an item under a different name, so it takes the
    item's own rules rather than a second copy of them -- retail and note included, since a
    scanned line carries both the same way a typed one does. */
export const LINE_FIELDS = ITEM_FIELDS
	.map(f => ({ ...f, name: f.name.replace('item-', 'line-') }))

/* Required: what it is and where to buy it. The address is the one field here normalised
   rather than only judged -- api/src/lib/validate.js stores the form this mirrors. */
export const WISH_FIELDS = [
	{ name: 'wish-name', label: 'Name', check: v =>
		!v ? 'What do you wish for?' : v.length > 120 ? '120 characters at most.' : '' },
	{ name: 'wish-url', label: 'Link', check: v =>
		!v ? 'Where can you buy it?'
		: v.length > 2048 ? 'That address is too long.'
		: httpUrl(v) ? '' : 'That is not a web address. One looks like this: shop.dk/product' },
	{ name: 'wish-price', label: 'Price', check: v =>
		!v ? ''
		: v.startsWith('-') ? 'A price cannot go below zero.'
		: AMOUNT_PATTERN.test(v) ? '' : 'Amounts take a comma, such as 2.799,00.' }
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

/** The shop's name for the line under a wish -- a whole address there is a line of query
    string. Falls back to the raw value. */
export const siteOf = value => {
	const href = httpUrl(value)
	if (!href) return String(value ?? '')
	return new URL(href).hostname.replace(/^www\./, '')
}
