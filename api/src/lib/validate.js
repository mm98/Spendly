import { SPEND_KINDS, ORDER_STATUSES } from './constants.js'
import { todayIso } from './dates.js'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/* Ports react/src/api/rules.js's ORDER_FIELDS/ITEM_FIELDS, adapted for the JSON the API
   receives (already-parsed numbers) rather than the comma-formatted strings a human types into
   the create/scan-review form — that parsing is client.js's job, same as it is today, so a
   value required at one door (manual entry) is required and checked the same way at every
   other (import, scan review save). Returns a { field: message } map, empty if the draft is
   valid. */

export function validateOrderDraft(draft) {
	const errors = {}

	const vendor = String(draft.vendor ?? '').trim()
	if (!vendor) errors.vendor = 'Who did you buy from?'
	else if (vendor.length > 80) errors.vendor = '80 characters at most.'

	const date = String(draft.date ?? '')
	if (!ISO_DATE.test(date)) errors.date = 'When was the order placed?'
	else if (date > todayIso()) errors.date = 'An order cannot be dated in the future.'

	const kind = String(draft.kind ?? '')
	if (!kind) errors.kind = 'Pick a kind.'
	else if (!SPEND_KINDS.some(k => k.toLowerCase() === kind.toLowerCase()))
		errors.kind = 'Kind is one of: ' + SPEND_KINDS.join(', ') + '.'

	if (draft.status && !ORDER_STATUSES.some(s => s.toLowerCase() === String(draft.status).toLowerCase()))
		errors.status = 'Status is one of: ' + ORDER_STATUSES.join(', ') + '.'

	if (draft.shipping != null && (!Number.isFinite(Number(draft.shipping)) || Number(draft.shipping) < 0))
		errors.shipping = 'Shipping must be a non-negative amount.'

	/* The order's rabat, and the only field here that subtracts. It is entered as the amount
	   taken off -- the sign is what the column means, not something a value carries -- so a
	   negative discount is a surcharge, which this app has no concept of. */
	if (draft.discount != null && (!Number.isFinite(Number(draft.discount)) || Number(draft.discount) < 0))
		errors.discount = 'Discount must be a non-negative amount.'

	const items = Array.isArray(draft.items) ? draft.items : []
	if (!items.length) errors.items = 'An order needs at least one item.'
	items.forEach((item, i) => {
		const title = String(item.title ?? '').trim()
		if (!title) errors[`items.${i}.title`] = 'Describe the item.'
		else if (title.length > 120) errors[`items.${i}.title`] = '120 characters at most.'

		const quantity = Number(item.quantity)
		if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999)
			errors[`items.${i}.quantity`] = 'Quantity must be a whole number from 1 to 9999.'

		/* No money field is signed: a discount is the order's own `discount` column
		   (migrations/009), so price joins retail and shipping at zero or above. */
		const price = Number(item.price)
		if (!Number.isFinite(price))
			errors[`items.${i}.price`] = 'What did you pay?'
		else if (price < 0)
			errors[`items.${i}.price`] = 'Price cannot go below zero. Put a discount on the order instead.'

		if (item.retail != null && (!Number.isFinite(Number(item.retail)) || Number(item.retail) < 0))
			errors[`items.${i}.retail`] = 'Retail price must be a non-negative amount.'

		if (item.note != null && String(item.note).trim().length > 120)
			errors[`items.${i}.note`] = '120 characters at most.'
	})

	return errors
}

export function assertValidOrderDraft(draft) {
	const errors = validateOrderDraft(draft)
	if (Object.keys(errors).length) {
		const err = new Error(Object.values(errors)[0])
		err.status = 400
		err.fields = errors
		throw err
	}
}

/* Ports react/src/api/rules.js's WISH_FIELDS: one rule in the same words at both doors. */

const MAX_URL = 2048
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

// A link pasted from an ad, a social app or a newsletter carries the campaign that pointed at
// it, not a fact about the product -- so it never survives into a saved wish.
const TRACKING_PARAMS = new Set([
	'gclid', 'gclsrc', 'dclid', 'wbraid', 'gbraid', 'fbclid', 'igshid', 'msclkid', 'twclid',
	'ttclid', 'yclid', 'mc_cid', 'mc_eid', '_ga', '_gl'
])
const stripTracking = url => {
	for (const key of [...url.searchParams.keys()])
		if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key)
	return url
}

/** A missing scheme is filled in, since a reader types `zalando.dk/sko`. Anything but http(s)
    is refused: this is rendered as a link, and `javascript:` in an href is a script. */
export function normaliseUrl(value) {
	const clean = String(value ?? '').trim()
	if (!clean || clean.length > MAX_URL) return null
	let url
	try { url = new URL(HAS_SCHEME.test(clean) ? clean : 'https://' + clean) } catch { return null }
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
	// A host with no dot in it is a typo ("zalando"), not a shop -- there is no intranet
	// hostname a receipt-keeping app needs to link to.
	if (!url.hostname.includes('.')) return null
	return stripTracking(url).href
}

export function validateWishDraft(draft) {
	const errors = {}

	const name = String(draft.name ?? '').trim()
	if (!name) errors.name = 'What do you wish for?'
	else if (name.length > 120) errors.name = '120 characters at most.'

	const url = String(draft.url ?? '').trim()
	if (!url) errors.url = 'Where can you buy it?'
	else if (!normaliseUrl(url)) errors.url = 'That is not a web address. One looks like this: shop.dk/product'

	// A price the reader has not looked up yet is left out; a price that is present is money,
	// so it follows every other amount in the app and never goes below zero.
	if (draft.price != null && draft.price !== '' &&
		(!Number.isFinite(Number(draft.price)) || Number(draft.price) < 0))
		errors.price = 'Price must be a non-negative amount.'

	if (draft.categories != null && !Array.isArray(draft.categories))
		errors.categories = 'Categories are a list of names.'

	return errors
}

export function assertValidWishDraft(draft) {
	const errors = validateWishDraft(draft)
	if (Object.keys(errors).length) {
		const err = new Error(Object.values(errors)[0])
		err.status = 400
		err.fields = errors
		throw err
	}
}
