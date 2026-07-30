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
		!v || AMOUNT_PATTERN.test(v) ? '' : 'Amounts take a comma, such as 49,00.' }
]

/** Step 2's item form. Required: Description, Quantity, Price paid. Retail is optional and
    still parsed -- optional is not unchecked, and `gratis` is as wrong there as anywhere. */
export const ITEM_FIELDS = [
	{ name: 'item-description', label: 'Description', check: v =>
		!v ? 'Describe the item.' : v.length > 120 ? '120 characters at most.' : '' },
	{ name: 'item-quantity', label: 'Quantity', check: v =>
		!v ? 'How many did you buy?'
		: !WHOLE_NUMBER_PATTERN.test(v) ? 'Whole pieces only, such as 2.'
		: Number(v) < 1 ? 'At least 1 pc.'
		: Number(v) > 9999 ? '9.999 pcs at most.' : '' },
	{ name: 'item-price', label: 'Price paid', check: v =>
		!v ? 'What did you pay?'
		: !AMOUNT_PATTERN.test(v) ? 'Amounts take a comma, such as 89,95.' : '' },
	{ name: 'item-retail', label: 'Retail price', check: v =>
		!v || AMOUNT_PATTERN.test(v) ? '' : 'Amounts take a comma, such as 104,95.' }
]

/** A line corrected on the scan review is an item under a different name, so it takes the
    item's own three rules rather than a fourth copy of them. */
export const LINE_FIELDS = ITEM_FIELDS
	.filter(f => f.name !== 'item-retail')
	.map(f => ({ ...f, name: f.name.replace('item-', 'line-') }))
