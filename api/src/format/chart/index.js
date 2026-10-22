import { chartsById, makeChart, sweepCharts } from '../../lib/askCharts.js'
import { text } from '../schema.js'
import { CHART_PICTURE_WIDTH } from './drawing.js'
import { CHART_KINDS, chartKind } from './kinds.js'

/* The chart maker (Ask 24d): a chart drawn in the answer, of a kind in kinds.js, and a picture of it in the email. */

const uses = CHART_KINDS.map(k => `"${k.kind}" ${k.use}`)

const tool = {
	name: 'make_chart',
	description: `Draw a chart of the reader's numbers in the answer: ${uses.slice(0, -1).join(', ')}, or ${uses.at(-1)}. Read the numbers with the other tools first. Answers a place mark to write on a line of its own in the answer, where the chart belongs.`,
	input_schema: {
		type: 'object',
		properties: {
			kind: text('The kind of chart.', { enum: CHART_KINDS.map(k => k.kind) }),
			name: text('What the chart shows, for example "Spending per month".'),
			meta: text('The period or the total, short, for example "Oct 2025 - Sep 2026".'),
			...Object.assign({}, ...CHART_KINDS.map(k => k.properties))
		},
		required: ['kind', 'name']
	}
}

function make(input, making) {
	const chart = makeChart(making.userId, input, making.chatId)
	const said = chart.failed ? ` It could not be drawn. ${chart.failed}` : ''
	return { item: chart, said: `The chart is {{chart:${chart.id}}}. Write this place mark on a line of its own in the answer.${said}` }
}

// a chart kept from a kind since removed is left out
const drawn = chart => chart && !chart.failed && chartKind(chart.kind)
const cid = chart => `${chart.id}@spendly`

function emailBlocks(ids, charts, { money }) {
	return ids.map(id => charts[id]).filter(c => c?.failed || drawn(c)).map(chart => {
		if (chart.failed) return { p: true, runs: [{ text: `${chart.name}: ${chart.failed}` }] }
		const values = chartKind(chart.kind).words(chart, money)
		return { chart: true, title: chart.name, meta: chart.meta ?? '', src: `cid:${cid(chart)}`, width: CHART_PICTURE_WIDTH, alt: `${chart.name}: ${values}`, values }
	})
}

// every chart goes as a picture the email shows in place, so no address leads to it
function attachments(userId, ids, charts, write) {
	return ids.map(id => charts[id]).filter(drawn)
		.map(chart => ({ id: chart.id, inline: true, filename: `${chart.name}.png`, content: chartKind(chart.kind).picture(chart, write), contentType: 'image/png', cid: cid(chart) }))
}

export const chartMaker = {
	place: 'chart',
	tool,
	doing: () => 'Drawing your chart',
	make,
	byIds: chartsById,
	emailBlocks,
	attachments,
	sweep: () => sweepCharts()
}
