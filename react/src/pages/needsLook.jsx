import { amount, currency, monthNames } from '../api/format.js'

/* Home's Needs a look rules, in rank order; each also has an entry in api/src/lib/looks.js, whose default `on` mirrors.
   `rows` answers the desktop rows, the phone rows, and where "All" leads when the card cannot show them all. */

export const monthOf = w => monthNames('long')[Number(w.from.slice(5, 7)) - 1]
export const ordersFor = (category, window) => `/orders?category=${category.id}&from=${window.from}&to=${window.to}`

const noun = (n, one, many) => (n === 1 ? one : many)
const rowOf = (key, to, count, text, phone) => ({ key, to, count: amount(count, 0), text, phone })
const none = { rows: [], phone: [] }

export const LOOKS = [
	{
		id: 'over', on: true, label: 'Categories over their limit', help: 'A category that has gone past its limit this month.',
		rows: ({ view }) => ({
			rows: view.over.map(c => ({
				key: c.id, to: ordersFor(c, view.window), color: 'warning', count: '!',
				text: <><b>{c.name} is {currency(c.monthSpend - c.budget, 0)} over</b> its limit for {monthOf(view.window)}</>
			})),
			phone: view.over.length
				? [{ ...rowOf('over', '/categories?flag=over-limit', view.over.length, null, `over ${noun(view.over.length, 'its', 'their')} limit`), color: 'warning' }]
				: [],
			all: { to: '/categories?flag=over-limit', count: view.over.length }
		})
	},
	{
		id: 'near', on: true, label: 'Categories near their limit', help: 'A category past the "Tell me early" point set in Limit alerts.',
		rows: ({ view }) => ({
			rows: view.near.map(c => ({
				key: c.id, to: ordersFor(c, view.window), color: 'warning', count: '!',
				text: <><b>{c.name} is at {Math.floor((c.monthSpend / c.budget) * 100)}%</b> of its limit for {monthOf(view.window)}</>
			})),
			phone: view.near.length
				? [{ ...rowOf('near', '/categories?flag=near-limit', view.near.length, null, `near ${noun(view.near.length, 'its', 'their')} limit`), color: 'warning' }]
				: []
		})
	},
	{
		id: 'late', on: true, label: 'Orders not delivered after 2 weeks', help: 'Orders still marked Ordered 14 days after their date.',
		rows: ({ things }) => {
			const late = things?.late
			if (!late?.count) return none
			const to = `/orders?status=Ordered&to=${late.to}`
			return {
				rows: [rowOf('late', to, late.count, `${noun(late.count, 'order', 'orders')} ordered over 2 weeks ago and not delivered`)],
				phone: [rowOf('late', to, late.count, null, 'not delivered after 2 weeks')]
			}
		}
	},
	{
		id: 'vendors', on: true, label: 'Vendors that look like duplicates', help: 'Two vendors with names close enough to be the same shop.',
		rows: ({ things }) => {
			const n = things?.vendors?.count
			if (!n) return none
			const to = '/vendors?flag=possible-duplicate'
			return { rows: [rowOf('vendors', to, n, 'vendors look like duplicates')], phone: [rowOf('vendors', to, n, null, 'look like duplicates')] }
		}
	},
	{
		id: 'receipt', on: false, label: 'Orders without a receipt', help: 'Orders that have no receipt attached.',
		rows: ({ things }) => {
			const n = things?.receipt?.count
			if (!n) return none
			const to = '/orders?receipt=missing'
			return { rows: [rowOf('receipt', to, n, `${noun(n, 'order', 'orders')} without a receipt attached`)], phone: [rowOf('receipt', to, n, null, 'missing a receipt')] }
		}
	}
]

/** Every rule on or off: what the account set, else the rule's default. */
export const looksIn = settings => Object.fromEntries(LOOKS.map(l => [l.id, settings?.looks?.[l.id] ?? l.on]))

/** What Home shows, in rank order, from the rules that are on. */
export function alertsOf(looks, context) {
	const parts = LOOKS.filter(l => looks[l.id]).map(l => l.rows(context))
	return { rows: parts.flatMap(p => p.rows), phone: parts.flatMap(p => p.phone), all: parts.find(p => p.all)?.all }
}
