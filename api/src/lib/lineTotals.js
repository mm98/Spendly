/* A receipt prints an amount per line, and on a line of several units that is usually the line's
   total, not one unit's price. The reading reports both; these settle which one a figure is. */

const cents = n => Math.round(n * 100) / 100
const SUBSET_LINES = 12

/** A per-unit price that, times the quantity, gives the line's total. */
const unitOf = (total, quantity) => {
	const rounded = cents(total / quantity)
	return Math.abs(rounded * quantity - total) <= 0.01 ? rounded : Math.round(total / quantity * 10000) / 10000
}

/** `line` with its price (and the retail price printed beside it) read as a line total, per unit now. */
const asLineTotal = line => ({
	...line,
	price: unitOf(line.price, line.quantity),
	retail: line.retail != null && line.retail >= line.price ? unitOf(line.retail, line.quantity) : line.retail
})

/** A line of several units whose price is the same figure as its printed line total was given the
    line's total as its price: it is read as that, and per unit. */
export function fromPrintedLineTotals(lines) {
	return lines.map(line => {
		const { lineTotal, ...rest } = line
		const mistaken = lineTotal != null && rest.quantity !== 1 && Math.abs(rest.price - lineTotal) <= 0.02
		return mistaken ? { ...asLineTotal(rest), fromLineTotal: true } : rest
	})
}

/** Lines of several units that do not add up to the printed total are tried with their price read as the
    line's total: all of them, else the fewest that make the sum match. Unchanged when none does. */
export function reconcileWithTotal(lines, { total, shipping = 0, discount = 0 }) {
	if (total == null) return lines
	const sum = list => list.reduce((s, l) => s + l.price * l.quantity, 0) + shipping - discount
	const off = list => Math.abs(sum(list) - total) > 0.02
	if (!off(lines)) return lines
	const several = lines.map((l, i) => (l.quantity !== 1 && !l.fromLineTotal ? i : -1)).filter(i => i >= 0)
	if (!several.length || several.length > SUBSET_LINES) return lines
	let best = null
	for (let mask = 1; mask < 1 << several.length; mask++) {
		const picked = several.filter((_, bit) => mask & (1 << bit))
		if (best && picked.length >= best.length) continue
		const converted = lines.map((l, i) => (picked.includes(i) ? { ...asLineTotal(l), fromLineTotal: true } : l))
		if (!off(converted)) best = picked
	}
	return best ? lines.map((l, i) => (best.includes(i) ? { ...asLineTotal(l), fromLineTotal: true } : l)) : lines
}
