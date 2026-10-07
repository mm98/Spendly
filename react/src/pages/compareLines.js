/* An order's lines set against the lines read from one of its receipts (Order create 3d).
   Item lines only. A pair is found by the same name, then by the same amount under another name. */

const lineAmount = line => Math.round((Number(line.price) || 0) * (Number(line.quantity) || 0) * 100) / 100
const nameOf = title => String(title ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const sameAmount = (a, b) => Math.abs(lineAmount(a) - lineAmount(b)) < 0.005
const sameFigures = (a, b) => sameAmount(a, b) && Math.abs((Number(a.quantity) || 0) - (Number(b.quantity) || 0)) < 0.0005

const RANK = { differs: 0, renamed: 0, receiptOnly: 1, orderOnly: 2 }

/** Answers `{ rows, matched }`. `rows` are the lines that differ, each `{ key, kind, order, receipt }` with `kind` one of 'differs' (price or
    quantity), 'renamed', 'receiptOnly' or 'orderOnly'; `matched` are the order's lines that agree. */
export function compareLines(orderLines, receiptLines) {
	const left = receiptLines.map((line, at) => ({ line, at, name: nameOf(line.title), used: false }))
	const pairs = new Map()
	const take = (order, found) => { found.used = true; pairs.set(order, found) }

	// the same name first, nearest in amount when several share one
	for (const order of orderLines) {
		const same = left.filter(r => !r.used && r.name && r.name === nameOf(order.title))
		const found = same.find(r => sameFigures(r.line, order)) ?? same.find(r => sameAmount(r.line, order)) ?? same[0]
		if (found) take(order, found)
	}
	// then the same amount under another name
	for (const order of orderLines) {
		if (pairs.has(order)) continue
		const found = left.find(r => !r.used && sameFigures(r.line, order))
		if (found) take(order, found)
	}

	const rows = []
	const matched = []
	for (const order of orderLines) {
		const found = pairs.get(order)
		if (!found) rows.push({ key: `order-${order.id}`, kind: 'orderOnly', order, receipt: null })
		else if (nameOf(found.line.title) !== nameOf(order.title)) rows.push({ key: `order-${order.id}`, kind: 'renamed', order, receipt: found.line })
		else if (!sameFigures(found.line, order)) rows.push({ key: `order-${order.id}`, kind: 'differs', order, receipt: found.line })
		else matched.push(order)
	}
	for (const r of left) if (!r.used) rows.push({ key: `receipt-${r.at}`, kind: 'receiptOnly', order: null, receipt: r.line })
	// changed lines first, then what is added, then what is taken away
	rows.sort((a, b) => RANK[a.kind] - RANK[b.kind])
	return { rows, matched }
}

/** What each row is set to before the reader touches it: the receipt wins where both have the line,
    a line only on the receipt is added, and one only on the order is removed. */
export const defaultPicks = rows => Object.fromEntries(rows.map(r => [r.key, r.kind === 'receiptOnly' ? true : r.kind === 'orderOnly' ? false : 'receipt']))

/** Whether a row changes the order as it is picked. */
export const changesOrder = (row, pick) => {
	if (row.kind === 'receiptOnly') return pick === true
	if (row.kind === 'orderOnly') return pick !== true
	return pick !== 'order'
}

/** The order's lines as the picks leave them, ready for a save: a changed line keeps its id. */
export function resultingLines(orderLines, rows, picks) {
	const byOrder = new Map(rows.filter(r => r.order).map(r => [r.order.id, r]))
	const lines = []
	for (const line of orderLines) {
		const row = byOrder.get(line.id)
		if (!row) { lines.push(line); continue }
		if (row.kind === 'orderOnly') { if (picks[row.key] === true) lines.push(line); continue }
		if (picks[row.key] === 'order') { lines.push(line); continue }
		const { receipt } = row
		lines.push(row.kind === 'renamed'
			? { ...line, title: receipt.title }
			: { ...line, quantity: receipt.quantity, price: receipt.price, retail: receipt.retail ?? (Number(line.retail) > Number(receipt.price) ? line.retail : null) })
	}
	for (const row of rows) {
		if (row.kind !== 'receiptOnly' || picks[row.key] !== true) continue
		const { receipt } = row
		lines.push({ key: row.key, title: receipt.title, quantity: receipt.quantity, price: receipt.price, retail: receipt.retail ?? null, note: '', url: '' })
	}
	return lines
}

export { lineAmount }
