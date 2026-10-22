import { CHART_EMPTY, numberOf, textOf } from './fields.js'
import { GREY, W, canvas, rgb } from './drawing.js'
import { text } from '../schema.js'

const CHART_COLUMNS_MOST = 12
const CHART_SERIES_MOST = 2
const TOO_MANY = `This chart could not be made: it has too many steps to draw. Ask for at most ${CHART_COLUMNS_MOST}, for example one a month.`

const properties = {
	series: { type: 'array', maxItems: CHART_SERIES_MOST, description: 'With bars: what each bar of a step is, for example [{"name": "2026"}, {"name": "2025"}]. One series when left out.', items: { type: 'object', properties: { name: text('The series\' name.') } } },
	columns: {
		type: 'array', description: 'With bars: the steps, oldest first.',
		items: { type: 'object', properties: {
			tick: text('A short label under the bar, for example "Aug".'),
			label: text('The step\'s full name, for example "August 2026".'),
			values: { type: 'array', items: { type: 'number' }, description: 'The amount of each series in this step.' },
			orders: { type: 'number', description: 'How many orders the step holds, when known.' }
		}, required: ['tick', 'values'] }
	}
}

function shape(asked, chart) {
	const series = (Array.isArray(asked?.series) ? asked.series : []).slice(0, CHART_SERIES_MOST).map(s => ({ name: textOf(s?.name) }))
	const count = Math.max(1, series.length)
	const columns = (Array.isArray(asked?.columns) ? asked.columns : []).map(c => ({
		tick: textOf(c?.tick).slice(0, 12),
		label: textOf(c?.label) || textOf(c?.tick),
		values: Array.from({ length: count }, (_, i) => numberOf((Array.isArray(c?.values) ? c.values : [c?.value])[i])),
		...(Number.isFinite(Number(c?.orders)) && c?.orders !== null && c?.orders !== undefined ? { orders: Math.max(0, Math.round(Number(c.orders))) } : {})
	}))
	if (columns.length > CHART_COLUMNS_MOST) return { failed: TOO_MANY }
	if (!columns.length || columns.every(c => c.values.every(v => v === 0))) return { failed: CHART_EMPTY }
	return { series: series.length ? series : [{ name: chart.name }], columns }
}

const BARS_H = 316
const TICK = 24
const GAP = 16
const KEY_ROW = 44
// the bars' green, then the lighter green a second series takes
const KEYS = ['#4f7f63', '#8caf97', '#2f7a51', '#c6d6c9'].map(rgb)

function picture(chart) {
	const series = chart.series ?? []
	const keyed = series.length > 1
	const height = BARS_H + TICK + 12 + (keyed ? KEY_ROW : 0)
	const pen = canvas(height)
	const columns = chart.columns
	const top = Math.max(0, ...columns.flatMap(c => c.values)) || 1
	const pitch = (W + GAP) / columns.length
	const width = pitch - GAP
	// ticks a step apart where two would touch, the last always written, as the app's chart does
	const widest = Math.max(...columns.map(c => pen.widthOf(c.tick ?? '', 22)))
	const step = Math.max(1, Math.ceil((widest + 24) / pitch))
	columns.forEach((c, i) => {
		const x = i * pitch
		const bars = keyed ? c.values.length : 1
		const inner = keyed ? (width - 4 * (bars - 1)) / bars : width
		c.values.slice(0, bars).forEach((v, s) => {
			const h = Math.max(0, v) / top * BARS_H
			pen.bar(x + s * (inner + 4), BARS_H - h, inner, h, KEYS[s])
		})
		if (c.tick && (i % step === 0 || i === columns.length - 1)) pen.text(c.tick, x + width / 2, BARS_H + TICK + 2, 22, GREY, 'center')
	})
	if (keyed) {
		let x = 0
		const y = BARS_H + TICK + 12 + 28
		series.forEach((s, i) => {
			pen.rect(x, y - 16, 16, 16, KEYS[i])
			pen.text(s.name, x + 24, y, 22, GREY)
			x += 24 + pen.widthOf(s.name, 22) + 32
		})
	}
	return pen.png()
}

// the chart in words: its alt text, and the email's text version
function words(chart, money) {
	const keyed = chart.series.length > 1
	return chart.columns.map(c => (keyed
		? `${c.label}: ${chart.series.map((s, i) => `${s.name} ${money(c.values[i])}`).join(', ')}`
		: `${c.label} ${money(c.values[0])}`)).join(', ')
}

export const bars = { kind: 'bars', use: `over time (at most ${CHART_COLUMNS_MOST} steps, for example months)`, properties, shape, picture, words }
