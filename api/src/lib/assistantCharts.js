import { db } from '../db.js'
import { newId } from './ids.js'
import { nowEpoch } from './dates.js'
import { FILE_KEPT_DAYS } from './assistantFiles.js'

/* The charts Ask Spendly draws in an answer (Ask 24d): bars over up to 12 steps, or the shares of a
   whole. Kept as long as the chat that drew it, so the chat and its email can draw it again. */

export const CHART_COLUMNS_MOST = 12
export const CHART_SERIES_MOST = 2
const SHARES_SHOWN = 4
const TEXT_MOST = 80
const DAY = 86400
const ID = /^[\w-]{1,64}$/
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

// the line a chart that could not be made shows in its frame
export const CHART_REFUSALS = {
	tooMany: `This chart could not be made: it has too many steps to draw. Ask for at most ${CHART_COLUMNS_MOST}, for example one a month.`,
	empty: 'This chart could not be made: there are no numbers to draw for this.'
}

const insertChart = db.prepare('INSERT INTO user_assistant_charts (id, user_id, chat_id, chart, expires_at) VALUES (?, ?, ?, ?, ?)')
const selectCharts = db.prepare('SELECT c.id, c.chart FROM json_each(?) j CROSS JOIN user_assistant_charts c ON c.id = j.value WHERE c.user_id = ?')
const dropExpired = db.prepare('DELETE FROM user_assistant_charts WHERE expires_at <= ?')

const textOf = value => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, TEXT_MOST)
const numberOf = value => (Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) / 100 : 0)

/** `asked` as the chart it can be drawn as: what the model sent, trimmed to what the app draws. */
function chartOf(asked) {
	const kind = asked?.kind === 'shares' ? 'shares' : 'bars'
	const chart = { kind, name: textOf(asked?.name) || 'Chart', meta: textOf(asked?.meta) || null }
	if (kind === 'shares') {
		const all = (Array.isArray(asked?.shares) ? asked.shares : [])
			.map(s => ({ name: textOf(s?.name), amount: numberOf(s?.amount), ...(ID.test(s?.categoryId ?? '') ? { categoryId: s.categoryId } : {}), ...(ID.test(s?.vendorId ?? '') ? { vendorId: s.vendorId } : {}) }))
			.filter(s => s.name && s.amount > 0)
			.sort((a, b) => b.amount - a.amount)
		if (!all.length) return { ...chart, failed: CHART_REFUSALS.empty }
		// the biggest three and Other, as Statistics shows a share of a whole
		const rest = all.slice(SHARES_SHOWN - 1)
		const noun = rest.every(s => s.categoryId) ? ' categories' : rest.every(s => s.vendorId) ? ' vendors' : ''
		const shown = all.length > SHARES_SHOWN
			? [...all.slice(0, SHARES_SHOWN - 1), { name: noun ? `Other ${rest.length}${noun}` : 'Other', amount: numberOf(rest.reduce((sum, s) => sum + s.amount, 0)), other: noun.trim() || true }]
			: all
		const period = { from: ISO_DAY.test(asked?.from ?? '') ? asked.from : null, to: ISO_DAY.test(asked?.to ?? '') ? asked.to : null }
		return { ...chart, ...period, shares: shown }
	}
	const series = (Array.isArray(asked?.series) ? asked.series : []).slice(0, CHART_SERIES_MOST).map(s => ({ name: textOf(s?.name) }))
	const count = Math.max(1, series.length)
	const columns = (Array.isArray(asked?.columns) ? asked.columns : []).map(c => ({
		tick: textOf(c?.tick).slice(0, 12),
		label: textOf(c?.label) || textOf(c?.tick),
		values: Array.from({ length: count }, (_, i) => numberOf((Array.isArray(c?.values) ? c.values : [c?.value])[i])),
		...(Number.isFinite(Number(c?.orders)) && c?.orders !== null && c?.orders !== undefined ? { orders: Math.max(0, Math.round(Number(c.orders))) } : {})
	}))
	if (columns.length > CHART_COLUMNS_MOST) return { ...chart, failed: CHART_REFUSALS.tooMany }
	if (!columns.length || columns.every(c => c.values.every(v => v === 0))) return { ...chart, failed: CHART_REFUSALS.empty }
	return { ...chart, series: series.length ? series : [{ name: chart.name }], columns }
}

/** Keeps the chart `asked` for, or why it could not be drawn, and answers it with its id. */
export function makeChart(userId, asked, chatId = null) {
	const chart = { id: newId('ac'), ...chartOf(asked) }
	insertChart.run(chart.id, userId, chatId, JSON.stringify(chart), nowEpoch() + FILE_KEPT_DAYS * DAY)
	return chart
}

/** The charts named by `ids` that are still kept, by id. */
export const chartsById = (userId, ids) => Object.fromEntries(selectCharts.all(JSON.stringify(ids), userId).map(r => [r.id, JSON.parse(r.chart)]))

export const sweepCharts = (now = nowEpoch()) => { dropExpired.run(now) }
