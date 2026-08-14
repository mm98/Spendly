import { SPEND_KINDS, ORDER_STATUSES } from './constants.js'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const todayIso = () => new Date().toISOString().slice(0, 10)

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

	const items = Array.isArray(draft.items) ? draft.items : []
	if (!items.length) errors.items = 'An order needs at least one item.'
	items.forEach((item, i) => {
		const title = String(item.title ?? '').trim()
		if (!title) errors[`items.${i}.title`] = 'Describe the item.'
		else if (title.length > 120) errors[`items.${i}.title`] = '120 characters at most.'

		const quantity = Number(item.quantity)
		if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999)
			errors[`items.${i}.quantity`] = 'Quantity must be a whole number from 1 to 9999.'

		const price = Number(item.price)
		if (!Number.isFinite(price) || price < 0)
			errors[`items.${i}.price`] = 'What did you pay?'

		if (item.retail != null && (!Number.isFinite(Number(item.retail)) || Number(item.retail) < 0))
			errors[`items.${i}.retail`] = 'Retail price must be a non-negative amount.'
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
