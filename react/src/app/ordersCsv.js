import { getOrderLines, getOrders } from '../api/client.js'
import { quantity, today } from '../api/format.js'

/* One row per item line, the order's fields repeated on each: the columns an import reads back (16b).
   Semicolons and a decimal comma, as a Danish spreadsheet reads them; the mark at the start says UTF-8. */
const HEAD = ['Date', 'Vendor', 'Status', 'Kind', 'Reference', 'Categories', 'Note', 'Shipping', 'Discount', 'Order total',
	'Item', 'Quantity', 'Price', 'Retail price', 'Item note']

const cell = v => {
	const s = String(v ?? '')
	return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const money = n => (n == null ? '' : Number(n).toFixed(2).replace('.', ','))

export function linesCsv(lines, statusName) {
	const rows = lines.map(l => [
		l.date, l.vendor, statusName(l.status), l.kind, l.reference, l.categories, l.note, money(l.shipping), money(l.discount), money(l.total),
		l.title, l.quantity == null ? '' : quantity(l.quantity), money(l.price), money(l.retail), l.itemNote
	])
	return '﻿' + [HEAD, ...rows].map(r => r.map(cell).join(';')).join('\r\n') + '\r\n'
}

/** Hands the reader the file to keep. */
export function saveCsv(text, name = `spendly-orders-${today()}.csv`) {
	const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
	const link = document.createElement('a')
	link.href = url
	link.download = name
	document.body.append(link)
	link.click()
	link.remove()
	setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// orders named by id in one request: the address stays well under what a server accepts
const IDS_AT_ONCE = 100

/** Ids picked by hand, in groups one request each can carry, in the order they were given. */
export const idGroups = ids => Array.from({ length: Math.ceil(ids.length / IDS_AT_ONCE) }, (_, i) => ids.slice(i * IDS_AT_ONCE, (i + 1) * IDS_AT_ONCE))

/** The item lines of every order `request` matches, or of the orders `ids` names within it. */
export async function linesOf(request, ids, signal) {
	if (!ids) return (await getOrderLines(request, signal)).lines
	const parts = []
	for (const group of idGroups(ids)) parts.push(...(await getOrderLines({ sort: request.sort, ids: group.join(',') }, signal)).lines)
	return parts
}

const BLOCK = 1000

/** Every order a list request matches, in its order: what Select all matching acts on. */
export async function allMatching(request, signal) {
	const all = []
	for (let page = 1; ; page++) {
		const answer = await getOrders({ ...request, page, pageSize: BLOCK }, signal)
		all.push(...answer.orders)
		if (answer.orders.length < BLOCK || all.length >= answer.matched) return all
	}
}
