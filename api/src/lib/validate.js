import { SPEND_KINDS, ORDER_STATUSES } from './constants.js'
import { todayIso } from './dates.js'
import { words } from './phrases.js'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/* Ports react/src/api/rules.js's ORDER_FIELDS/ITEM_FIELDS, adapted for the JSON the API
   receives (already-parsed numbers) rather than the comma-formatted strings a human types into
   the create/scan-review form — that parsing is client.js's job, same as it is today, so a
   value required at one door (manual entry) is required and checked the same way at every
   other (import, scan review save). Returns a { field: message } map, empty if the draft is
   valid. `today` is the reader's date (req.today). */

/** What is wrong with an optional text value, or null: it must be text of at most `max` characters. */
export const textProblem = (value, label, max) =>
	value == null ? null
		: typeof value !== 'string' ? words('text.notText', { label: words(label) })
			: value.length > max ? words('text.tooLong', { label: words(label), most: max }) : null

// a name a row shows, cut when long; past this it is not a name
export const MAX_RECORD_NAME = 200

export function validateOrderDraft(draft, today = todayIso(), statuses = ORDER_STATUSES) {
	const errors = {}
	const note = textProblem(draft.note, 'text.label.note', 10000)
	if (note) errors.note = note
	const reference = textProblem(draft.reference, 'text.label.reference', 200)
	if (reference) errors.reference = reference

	const vendor = String(draft.vendor ?? '').trim()
	if (!vendor) errors.vendor = words('order.vendorMissing')
	else if (vendor.length > 80) errors.vendor = words('text.most80')

	// a date in the future is kept: an order can be booked ahead (6c), so the form only warns
	const date = String(draft.date ?? '')
	if (!ISO_DATE.test(date)) errors.date = words('order.dateMissing')

	const kind = String(draft.kind ?? '')
	if (!kind) errors.kind = words('order.kindMissing')
	else if (!SPEND_KINDS.some(k => k.toLowerCase() === kind.toLowerCase()))
		errors.kind = words('order.kindList', { kinds: SPEND_KINDS.join(', ') })

	if (draft.status && !statuses.some(s => s.toLowerCase() === String(draft.status).toLowerCase()))
		errors.status = words('order.statusMissing')

	// Optional here, like most fields an import can omit (status itself defaults to Delivered)
	// -- the create/edit/scan forms are what make these required, only once status warrants them.
	if (draft.deliveredDate) {
		const deliveredDate = String(draft.deliveredDate)
		if (!ISO_DATE.test(deliveredDate)) errors.deliveredDate = words('date.invalid')
		else if (deliveredDate > today && deliveredDate > date) errors.deliveredDate = words('order.deliveryFuture')
		else if (deliveredDate < date) errors.deliveredDate = words('order.beforeOrderDate')
	}
	if (draft.returnedDate) {
		const returnedDate = String(draft.returnedDate)
		if (!ISO_DATE.test(returnedDate)) errors.returnedDate = words('date.invalid')
		else if (returnedDate > today && returnedDate > String(draft.deliveredDate || date)) errors.returnedDate = words('order.returnFuture')
		else if (draft.deliveredDate && !errors.deliveredDate && returnedDate < String(draft.deliveredDate))
			errors.returnedDate = words('order.beforeDelivery')
	}

	if (draft.statusDates != null) {
		if (typeof draft.statusDates !== 'object' || Array.isArray(draft.statusDates)) errors.statusDates = words('order.statusDatesShape')
		else for (const value of Object.values(draft.statusDates)) {
			if (value && !ISO_DATE.test(String(value))) errors.statusDates = words('date.invalid')
			else if (value && String(value) < date) errors.statusDates = words('order.beforeOrderDate')
		}
	}

	if (draft.shipping != null && (!Number.isFinite(Number(draft.shipping)) || Number(draft.shipping) < 0))
		errors.shipping = words('order.shippingNegative')

	/* The order's rabat, and the only field here that subtracts. It is entered as the amount
	   taken off -- the sign is what the column means, not something a value carries -- so a
	   negative discount is a surcharge, which this app has no concept of. */
	if (draft.discount != null && (!Number.isFinite(Number(draft.discount)) || Number(draft.discount) < 0))
		errors.discount = words('order.discountNegative')

	// a Draft keeps what was read or typed so far (16a): no line yet, or one with no name, waits for later
	const drafting = String(draft.status ?? '').toLowerCase() === 'draft'
	const items = Array.isArray(draft.items) ? draft.items : []
	if (!items.length && !drafting) errors.items = words('order.noItems')
	items.forEach((item, i) => {
		const title = String(item.title ?? '').trim()
		if (!title && !drafting) errors[`items.${i}.title`] = words('order.itemTitleMissing')
		else if (title.length > 120) errors[`items.${i}.title`] = words('text.most120')

		/* Rounded and compared back, not `quantity * 100` tested for wholeness: 1.1 * 100 is
		   110.00000000000001, and that test refuses a one-decimal quantity. */
		const quantity = Number(item.quantity)
		if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 9999
			|| Math.round(quantity * 100) / 100 !== quantity)
			errors[`items.${i}.quantity`] = words('order.quantityRange')

		/* No money field is signed: a discount is the order's own `discount` column
		   (migrations/009), so price joins retail and shipping at zero or above. */
		const price = Number(item.price)
		if (!Number.isFinite(price))
			errors[`items.${i}.price`] = words('order.priceMissing')
		else if (price < 0)
			errors[`items.${i}.price`] = words('order.priceNegative')

		if (item.retail != null && (!Number.isFinite(Number(item.retail)) || Number(item.retail) < 0))
			errors[`items.${i}.retail`] = words('order.retailNegative')

		if (item.note != null && String(item.note).trim().length > 120)
			errors[`items.${i}.note`] = words('text.most120')

		const url = String(item.url ?? '').trim()
		if (url && !normaliseUrl(url)) errors[`items.${i}.url`] = words('order.notLink')
	})

	return errors
}

/** A Draft's lines as the order table stores them: a quantity not given yet is 1 and a price not
    given yet is 0, until the reader fills them in. Any other status is left as it came. */
export function fillDraftGaps(draft) {
	if (String(draft.status ?? '').toLowerCase() !== 'draft' || !Array.isArray(draft.items)) return draft
	const given = value => value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value))
	return {
		...draft,
		items: draft.items.map(item => ({
			...item,
			title: String(item.title ?? ''),
			quantity: given(item.quantity) && Number(item.quantity) > 0 ? item.quantity : 1,
			price: given(item.price) ? item.price : 0
		}))
	}
}

export function assertValidOrderDraft(draft, today, statuses) {
	const errors = validateOrderDraft(draft, today, statuses)
	if (Object.keys(errors).length) {
		const err = new Error(Object.values(errors)[0])
		err.status = 400
		err.fields = errors
		throw err
	}
}

/* Ports react/src/api/rules.js's BOOKMARK_FIELDS: one rule in the same words at both doors. */

const MAX_URL = 2048
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

// A link pasted from an ad, a social app or a newsletter carries the campaign that pointed at
// it, not a fact about the product -- so it never survives into a saved bookmark.
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

export function validateBookmarkDraft(draft) {
	const errors = {}

	const name = String(draft.name ?? '').trim()
	if (!name) errors.name = words('bookmark.nameMissing')
	else if (name.length > 120) errors.name = words('text.most120')

	const url = String(draft.url ?? '').trim()
	if (!url) errors.url = words('bookmark.urlMissing')
	else if (!normaliseUrl(url)) errors.url = words('bookmark.notUrl')

	// A price the reader has not looked up yet is left out; a price that is present is money,
	// so it follows every other amount in the app and never goes below zero.
	if (draft.price != null && draft.price !== '' &&
		(!Number.isFinite(Number(draft.price)) || Number(draft.price) < 0))
		errors.price = words('bookmark.priceNegative')

	if (draft.categories != null && !Array.isArray(draft.categories))
		errors.categories = words('bookmark.categoriesList')

	return errors
}

export function assertValidBookmarkDraft(draft) {
	const errors = validateBookmarkDraft(draft)
	if (Object.keys(errors).length) {
		const err = new Error(Object.values(errors)[0])
		err.status = 400
		err.fields = errors
		throw err
	}
}

/* The budget's rules, in the same words as react/src/api/rules.js's BUDGET_FIELDS. Each
   helper hands back the cleaned value or throws the 400 that names what is wrong. */

const refuse = message => Object.assign(new Error(message), { status: 400 })

export const BUDGET_TEXT = {
	row: { max: 80, missing: words('budget.rowNameMissing') },
	group: { max: 60, missing: words('budget.groupNameMissing') },
	account: { max: 40, missing: words('budget.accountNameMissing') },
	payment: { max: 200, missing: words('budget.paymentNoText') }
}

export function budgetText(value, { max, missing }) {
	const text = String(value ?? '').trim()
	if (!text && missing) throw refuse(missing)
	if (text.length > max) throw refuse(words('text.most', { most: max }))
	return text
}

/** Rounded to øre the way a spreadsheet shows it, or null where nothing is written. */
export function budgetAmount(value) {
	if (value == null || value === '') return null
	const n = Number(value)
	if (!Number.isFinite(n) || n < 0 || n >= 1e9) throw refuse(words('budget.amountShape'))
	return Math.round(Number((n * 100).toPrecision(15))) / 100
}

export function budgetMonths(months) {
	if (!Array.isArray(months) || months.length !== 12) throw refuse(words('budget.twelveMonths'))
	return months.map(m => ({ expected: budgetAmount(m?.expected), real: budgetAmount(m?.real) }))
}

export function budgetMonth(value) {
	const month = Number(value)
	if (!Number.isInteger(month) || month < 1 || month > 12) throw refuse(words('budget.monthRange'))
	return month
}

export function budgetYear(value) {
	const year = Number(value)
	if (!Number.isInteger(year) || year < 1900 || year > 2200) throw refuse(words('budget.yearShape'))
	return year
}

export function budgetKind(value) {
	if (value !== 'income' && value !== 'expense') throw refuse(words('budget.groupKind'))
	return value
}

/** A row as a file carries it, naming its account rather than pointing at one. */
export const budgetLine = line => ({
	name: budgetText(line?.name, BUDGET_TEXT.row),
	account: budgetText(line?.account, { max: BUDGET_TEXT.account.max }),
	months: budgetMonths(line?.months)
})

export const budgetAccountId = value => (value == null || value === '' ? null : String(value))

export function budgetAccountNames(names) {
	if (names == null) return []
	if (!Array.isArray(names)) throw refuse(words('budget.accountsList'))
	return names.map(name => budgetText(name, BUDGET_TEXT.account))
}

/** A whole file's worth of years, checked before any of it is written. */
export function budgetYears(years) {
	if (!Array.isArray(years) || !years.length) throw refuse(words('budget.noYearToImport'))
	const seen = new Set()
	return years.map(y => {
		const year = budgetYear(y?.year)
		if (seen.has(year)) throw refuse(words('budget.yearTwice', { year }))
		seen.add(year)
		if (!Array.isArray(y.groups)) throw refuse(words('budget.yearNoGroups', { year }))
		return {
			year,
			groups: y.groups.map(g => ({
				kind: budgetKind(g?.kind),
				name: budgetText(g?.name, BUDGET_TEXT.group),
				lines: (Array.isArray(g.lines) ? g.lines : []).map(budgetLine)
			}))
		}
	})
}
