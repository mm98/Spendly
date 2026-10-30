import { amount, currency, monthNames } from '../api/format.js'
import { phrase } from '../language/phrases.js'

/* Home's Needs a look rules, in rank order; each also has an entry in api/src/lib/looks.js, whose default `on` mirrors.
   `rows` answers the desktop rows, the phone rows, and where "All" leads when the card cannot show them all. */

export const monthOf = w => monthNames('long')[Number(w.from.slice(5, 7)) - 1]
export const ordersFor = (category, window) => `/orders?category=${category.id}&from=${window.from}&to=${window.to}`

const rowOf = (key, to, count, text, phone) => ({ key, to, count: amount(count, 0), text, phone })
const none = { rows: [], phone: [] }

export const LOOKS = [
	{
		id: 'over', on: true, label: 'look.over.label', help: 'look.over.help',
		rows: ({ view }) => ({
			rows: view.over.map(c => ({
				key: c.id, to: ordersFor(c, view.window), color: 'warning', count: '!',
				text: phrase('look.over.row', { name: c.name, amount: currency(c.monthSpend - c.budget, 0), month: monthOf(view.window), b: words => <b className="sp-break">{words}</b> })
			})),
			phone: view.over.length
				? [{ ...rowOf('over', '/categories?flag=over-limit', view.over.length, null, phrase('look.over.phone', { count: view.over.length })), color: 'warning' }]
				: [],
			all: { to: '/categories?flag=over-limit', count: view.over.length }
		})
	},
	{
		id: 'near', on: true, label: 'look.near.label', help: 'look.near.help',
		rows: ({ view }) => ({
			rows: view.near.map(c => ({
				key: c.id, to: ordersFor(c, view.window), color: 'warning', count: '!',
				text: phrase('look.near.row', { name: c.name, share: Math.floor((c.monthSpend / c.budget) * 100), month: monthOf(view.window), b: words => <b className="sp-break">{words}</b> })
			})),
			phone: view.near.length
				? [{ ...rowOf('near', '/categories?flag=near-limit', view.near.length, null, phrase('look.near.phone', { count: view.near.length })), color: 'warning' }]
				: []
		})
	},
	{
		id: 'late', on: true, label: 'look.late.label', help: 'look.late.help',
		rows: ({ things }) => {
			const late = things?.late
			if (!late?.count) return none
			const to = `/orders?status=${encodeURIComponent(late.status)}&to=${late.to}`
			return {
				rows: [rowOf('late', to, late.count, phrase('look.late.row', { count: late.count }))],
				phone: [rowOf('late', to, late.count, null, phrase('look.late.phone'))]
			}
		}
	},
	{
		id: 'vendors', on: true, label: 'look.vendors.label', help: 'look.vendors.help',
		rows: ({ things }) => {
			const n = things?.vendors?.count
			if (!n) return none
			const to = '/vendors?flag=possible-duplicate'
			return { rows: [rowOf('vendors', to, n, phrase('look.vendors.row', { count: n }))], phone: [rowOf('vendors', to, n, null, phrase('look.vendors.phone', { count: n }))] }
		}
	},
	{
		id: 'receipt', on: false, label: 'look.receipt.label', help: 'look.receipt.help',
		rows: ({ things }) => {
			const n = things?.receipt?.count
			if (!n) return none
			const to = '/orders?receipt=missing'
			return { rows: [rowOf('receipt', to, n, phrase('look.receipt.row', { count: n }))], phone: [rowOf('receipt', to, n, null, phrase('look.receipt.phone', { count: n }))] }
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
