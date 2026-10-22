import * as mupdf from 'mupdf'
import { CHART_EMPTY, ID, ISO_DAY, numberOf, textOf } from './fields.js'
import { GREY, W, canvas, rgb } from './drawing.js'
import { day, text } from '../schema.js'

const SHARES_SHOWN = 4

const properties = {
	from: day('With shares: the first day the shares count, so each one opens its orders in that period.'),
	to: day('With shares: the last day the shares count.'),
	shares: {
		type: 'array', description: 'With shares: each part of the whole with its amount; Spendly shows the biggest three and Other.',
		items: { type: 'object', properties: { name: text('What the part is.'), amount: { type: 'number' }, categoryId: text('The category\'s id, when the part is a category.'), vendorId: text('The shop\'s id, when the part is a shop.') }, required: ['name', 'amount'] }
	}
}

function shape(asked) {
	const all = (Array.isArray(asked?.shares) ? asked.shares : [])
		.map(s => ({ name: textOf(s?.name), amount: numberOf(s?.amount), ...(ID.test(s?.categoryId ?? '') ? { categoryId: s.categoryId } : {}), ...(ID.test(s?.vendorId ?? '') ? { vendorId: s.vendorId } : {}) }))
		.filter(s => s.name && s.amount > 0)
		.sort((a, b) => b.amount - a.amount)
	if (!all.length) return { failed: CHART_EMPTY }
	// the biggest three and Other, as Statistics shows a share of a whole
	const rest = all.slice(SHARES_SHOWN - 1)
	const noun = rest.every(s => s.categoryId) ? ' categories' : rest.every(s => s.vendorId) ? ' vendors' : ''
	const shown = all.length > SHARES_SHOWN
		? [...all.slice(0, SHARES_SHOWN - 1), { name: noun ? `Other ${rest.length}${noun}` : 'Other', amount: numberOf(rest.reduce((sum, s) => sum + s.amount, 0)), other: noun.trim() || true }]
		: all
	return { from: ISO_DAY.test(asked?.from ?? '') ? asked.from : null, to: ISO_DAY.test(asked?.to ?? '') ? asked.to : null, shares: shown }
}

// the greens of the shares, darkest first
const SHARE_KEYS = ['#2f7a51', '#4f7f63', '#8caf97', '#c6d6c9'].map(rgb)

function picture(chart, write) {
	const shares = chart.shares
	const total = shares.reduce((sum, s) => sum + Math.max(0, s.amount), 0) || 1
	const ring = 256
	const rows = shares.length * 56
	const height = Math.max(ring, rows)
	const pen = canvas(height)
	const cx = ring / 2
	const cy = height / 2
	let from = -Math.PI / 2
	shares.forEach((s, i) => {
		const to = from + Math.max(0, s.amount) / total * Math.PI * 2
		const p = new mupdf.Path()
		const steps = Math.max(2, Math.ceil((to - from) / 0.05))
		for (let k = 0; k <= steps; k++) {
			const a = from + (to - from) * k / steps
			const [x, y] = [cx + Math.cos(a) * ring / 2, cy + Math.sin(a) * ring / 2]
			if (k) p.lineTo(x, y)
			else p.moveTo(x, y)
		}
		for (let k = steps; k >= 0; k--) {
			const a = from + (to - from) * k / steps
			p.lineTo(cx + Math.cos(a) * ring * 0.32, cy + Math.sin(a) * ring * 0.32)
		}
		p.closePath()
		pen.fill(p, SHARE_KEYS[i % 4])
		from = to
	})
	const left = ring + 48
	shares.forEach((s, i) => {
		const y = (height - rows) / 2 + i * 56 + 36
		pen.rect(left, y - 18, 18, 18, SHARE_KEYS[i % 4])
		const share = `${Math.round(Math.max(0, s.amount) / total * 100)}%`
		const amount = write.money(s.amount)
		pen.text(share, W, y, 24, GREY, 'right')
		pen.text(amount, W - 96, y, 24, GREY, 'right')
		pen.text(pen.fit(s.name, W - 96 - pen.widthOf(amount, 24) - 24 - (left + 30), 24), left + 30, y, 24, GREY)
	})
	return pen.png()
}

function words(chart, money) {
	const total = chart.shares.reduce((sum, s) => sum + s.amount, 0) || 1
	return chart.shares.map(s => `${s.name} ${money(s.amount)} (${Math.round(s.amount / total * 100)}%)`).join(', ')
}

export const shares = { kind: 'shares', use: 'of a whole (for example the biggest categories)', properties, shape, picture, words }
