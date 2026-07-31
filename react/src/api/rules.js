import { AMOUNT_PATTERN, WHOLE_NUMBER_PATTERN, today } from './format.js'
import { spendKinds } from './client.js'

export const ORDER_FIELDS = [
	{ name: 'order-vendor', label: 'Vendor', check: v =>
		!v ? 'Who did you buy from?' : v.length > 80 ? '80 characters at most.' : '' },
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

export const LINE_FIELDS = ITEM_FIELDS
	.filter(f => f.name !== 'item-retail')
	.map(f => ({ ...f, name: f.name.replace('item-', 'line-') }))
