import { db } from '../db.js'
import { newId } from './ids.js'
import { nowEpoch } from './dates.js'
import { FILE_KEPT_DAYS } from './assistantFiles.js'
import { CHART_KINDS, chartKind } from '../format/chart/kinds.js'
import { textOf } from '../format/chart/fields.js'

/* The charts Ask Spendly draws in an answer (Ask 24d), of a kind in format/chart. Kept as long as the chat
   that drew it, so the chat and its email can draw it again. */

const DAY = 86400

const insertChart = db.prepare('INSERT INTO user_assistant_charts (id, user_id, chat_id, chart, expires_at) VALUES (?, ?, ?, ?, ?)')
const selectCharts = db.prepare('SELECT c.id, c.chart FROM json_each(?) j CROSS JOIN user_assistant_charts c ON c.id = j.value WHERE c.user_id = ?')
const dropExpired = db.prepare('DELETE FROM user_assistant_charts WHERE expires_at <= ?')

/** `asked` as the chart it can be drawn as: what the model sent, trimmed to what the app draws. */
function chartOf(asked) {
	const kind = chartKind(asked?.kind) ?? CHART_KINDS[0]
	const chart = { kind: kind.kind, name: textOf(asked?.name) || 'Chart', meta: textOf(asked?.meta) || null }
	return { ...chart, ...kind.shape(asked, chart) }
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
