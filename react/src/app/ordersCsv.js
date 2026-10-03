import { getOrders } from '../api/client.js'
import { today } from '../api/format.js'

/* One row per order (2b, 2a). Semicolons and a decimal comma, as a Danish spreadsheet reads them;
   the mark at the start says UTF-8, so "ø" survives the opening. */
const cell = v => {
	const s = String(v ?? '')
	return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const money = n => (Number(n) || 0).toFixed(2).replace('.', ',')

export function ordersCsv(orders, statusName) {
	const head = ['Date', 'Vendor', 'Reference', 'Note', 'Status', 'Categories', 'Items', 'Total', 'Saved']
	const rows = orders.map(o => [
		o.date, o.vendor?.name ?? '', o.reference ?? '', o.note ?? '', statusName(o.status),
		o.categories.map(c => c.name).join(', '), o.itemCount, money(o.total), money(Math.max(0, o.saved ?? 0))
	])
	return '﻿' + [head, ...rows].map(r => r.map(cell).join(';')).join('\r\n') + '\r\n'
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

const BLOCK = 1000

/** Every order a list request matches, in its order: what Export CSV and Select all matching act on. */
export async function allMatching(request, signal) {
	const all = []
	for (let page = 1; ; page++) {
		const answer = await getOrders({ ...request, page, pageSize: BLOCK }, signal)
		all.push(...answer.orders)
		if (answer.orders.length < BLOCK || all.length >= answer.matched) return all
	}
}
