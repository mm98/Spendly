import { db } from '../db.js'
import { getClient } from './scanParse.js'
import { MCP_TOOLS, callTool } from './mcpTools.js'
import { FILE_REFUSALS, FILE_ROWS_MOST, FILE_TYPES, askedAtIn, fileWriter, makeFile, sweepFiles } from './assistantFiles.js'
import { CHART_COLUMNS_MOST, CHART_SERIES_MOST, makeChart, sweepCharts } from './assistantCharts.js'

/* The assistant in the app: a question about the reader's own money, answered by Claude with the
   same read-only tools /mcp offers, run as the signed-in reader over this server's own port, and two
   of its own: a file made from the reader's data, and a chart of it. */

export const ASSISTANT_MODEL = 'claude-opus-5-5'

// SPENDLY_ASSISTANT_QUESTIONS_PER_DAY, set in docker-compose.yml; 0 turns the assistant off
const PER_DAY = Math.max(0, Math.floor(Number(process.env.SPENDLY_ASSISTANT_QUESTIONS_PER_DAY ?? 25)) || 0)

// a question that needs more rounds of reading than this is answered as failed, so one question has a bounded cost
const ROUNDS_MOST = 8
const REQUEST_TIMEOUT_MS = 60_000

// what one question may carry: the conversation so far, each turn cut to a readable length
export const TURNS_MOST = 20
export const TEXT_MOST = 2000

const text = (description, extra = {}) => ({ type: 'string', description, ...extra })
const day = description => text(`${description} As YYYY-MM-DD.`, { pattern: '^\\d{4}-\\d{2}-\\d{2}$' })
const COLUMN_KINDS = ['text', 'amount', 'number', 'date']

// what only the app's assistant can do; /mcp never offers these
const MAKING_TOOLS = [
	{
		name: 'make_file',
		description: `Make a file the reader can download: Excel (xlsx), CSV, Word (docx) or PDF. Only when the reader asks for a file. Give "orders" to list the reader's orders (Spendly reads them itself, at most ${FILE_ROWS_MOST}), and "sections" for headings, text and your own tables. Answers a place mark to write on a line of its own in the answer, where the file belongs.`,
		input_schema: {
			type: 'object',
			properties: {
				type: text('The kind of file.', { enum: FILE_TYPES }),
				title: text('The heading at the top of the file, in the language of the question, for example "Orders in October 2026".'),
				orders: {
					type: 'object',
					description: 'List these orders in the file as a table: date, shop, categories, status, reference, lines, saved and total. Every filter is optional.',
					properties: {
						from: day('The first day to include.'),
						to: day('The last day to include.'),
						vendorId: text('Only orders from this shop.'),
						categoryId: text('Only orders in this category.'),
						status: text('Only orders with this status key.'),
						query: text('Text to find in the orders.')
					}
				},
				sections: {
					type: 'array',
					description: 'Parts of the file in order, before the orders. In a CSV only the first table is kept.',
					items: {
						type: 'object',
						properties: {
							heading: text('The part\'s heading.'),
							text: text('Paragraphs, split by an empty line. A line starting with "- " is a list item. Amounts written out with the currency.'),
							table: {
								type: 'object',
								properties: {
									columns: { type: 'array', items: { type: 'object', properties: { name: text('The column\'s heading.'), kind: text('What the column holds. An amount is a plain number.', { enum: COLUMN_KINDS }) }, required: ['name', 'kind'] } },
									rows: { type: 'array', items: { type: 'array', items: { type: ['string', 'number', 'null'] } }, description: 'One array per row, a cell per column. Amounts and numbers as plain numbers, dates as YYYY-MM-DD.' }
								},
								required: ['columns', 'rows']
							}
						}
					}
				}
			},
			required: ['type', 'title']
		}
	},
	{
		name: 'make_chart',
		description: `Draw a chart of the reader's numbers in the answer: "bars" over time (at most ${CHART_COLUMNS_MOST} steps, for example months), or "shares" of a whole (for example the biggest categories). Read the numbers with the other tools first. Answers a place mark to write on a line of its own in the answer, where the chart belongs.`,
		input_schema: {
			type: 'object',
			properties: {
				kind: text('The kind of chart.', { enum: ['bars', 'shares'] }),
				name: text('What the chart shows, for example "Spending per month".'),
				meta: text('The period or the total, short, for example "Oct 2025 - Sep 2026".'),
				from: day('With shares: the first day the shares count, so each one opens its orders in that period.'),
				to: day('With shares: the last day the shares count.'),
				series: { type: 'array', maxItems: CHART_SERIES_MOST, description: 'With bars: what each bar of a step is, for example [{"name": "2026"}, {"name": "2025"}]. One series when left out.', items: { type: 'object', properties: { name: text('The series\' name.') } } },
				columns: {
					type: 'array', description: 'With bars: the steps, oldest first.',
					items: { type: 'object', properties: {
						tick: text('A short label under the bar, for example "Aug".'),
						label: text('The step\'s full name, for example "August 2026".'),
						values: { type: 'array', items: { type: 'number' }, description: 'The amount of each series in this step.' },
						orders: { type: 'number', description: 'How many orders the step holds, when known.' }
					}, required: ['tick', 'values'] }
				},
				shares: {
					type: 'array', description: 'With shares: each part of the whole with its amount; Spendly shows the biggest three and Other.',
					items: { type: 'object', properties: { name: text('What the part is.'), amount: { type: 'number' }, categoryId: text('The category\'s id, when the part is a category.'), vendorId: text('The shop\'s id, when the part is a shop.') }, required: ['name', 'amount'] }
				}
			},
			required: ['kind', 'name']
		}
	}
]

const TOOLS = [...MCP_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, input_schema: inputSchema })), ...MAKING_TOOLS]

const instructions = today => `You answer questions about one person's own money in Spendly: their orders, shops (called vendors), categories and budget. Today is ${today}.

Read what you need with the tools; they only read, and nothing can be changed. Never guess a figure: when the tools do not give it, say so. Amounts from the tools are in the account's own currency.

Answer in the language of the question, in short plain sentences, for a reader who is not technical. Lead with the answer.

Write only this simple format:
- Paragraphs, separated by one empty line.
- A short list: lines that start with "- ".
- A small table: lines that start and end with "|", the first line naming the columns. No line of dashes under it.
- A link to one order: [text](order:ID), with the id from the tools.
- A link to the orders an answer is about: [text](orders:FILTERS). FILTERS joins any of vendor=ID, category=ID, status=NAME, from=YYYY-MM-DD and to=YYYY-MM-DD with "&", for example [Food in August](orders:category=ID&from=2026-08-01&to=2026-08-31). Several ids are joined with ",". Give the period whenever the answer is about one. Use this link for a shop or a category, too.
- Every amount as {{number}}, a plain number with a dot for decimals, for example {{4212.50}}. The app adds the currency.
- A file or a chart: the place mark make_file or make_chart answered, such as {{file:ID}}, on a line of its own. Files made together go on lines next to each other.
Nothing else: no bold, no headings, no other links.

Make a file only when the reader asks for one, and a chart when the numbers read better drawn. Never write a link to a file. You cannot make pictures or photos, only charts.`

const selectAnswered = db.prepare('SELECT answered_count FROM user_assistant_days WHERE user_id = ? AND day = ?')
const countAnswered = db.prepare(`INSERT INTO user_assistant_days (user_id, day, answered_count) VALUES (?, ?, 1)
	ON CONFLICT (user_id, day) DO UPDATE SET answered_count = answered_count + 1`)

export const assistantReady = () => PER_DAY > 0 && !!getClient()

/** What the reader is told about the assistant on `day`: whether it is there, and the questions left.
    An `unlimited` reader (the server's owner) has no daily limit: perDay and left are null. */
export function assistantState(userId, day, { unlimited = false } = {}) {
	if (!assistantReady()) return { ready: false }
	if (unlimited) return { ready: true, perDay: null, left: null }
	const answered = selectAnswered.get(userId, day)?.answered_count ?? 0
	return { ready: true, perDay: PER_DAY, left: Math.max(0, PER_DAY - answered) }
}

/** Counts one answered question; a failed or stopped one is never counted. */
export const noteAnswered = (userId, day) => { countAnswered.run(userId, day) }

const textOf = content => content.filter(b => b.type === 'text').map(b => b.text).join('').trim()

/* ---- making a file and a chart ---- */

const ORDER_COLUMNS = [
	{ name: 'Date', kind: 'date' }, { name: 'Shop', kind: 'text' }, { name: 'Categories', kind: 'text' }, { name: 'Status', kind: 'text' },
	{ name: 'Reference', kind: 'text' }, { name: 'Lines', kind: 'number' }, { name: 'Saved', kind: 'amount' }, { name: 'Total', kind: 'amount' }
]
const ORDERS_PAGE = 1000
const ORDER_FILTERS = ['from', 'to', 'vendorId', 'categoryId', 'status', 'query']

// the reader's orders as the file's table, read over the API like every tool; null when there are too many
async function ordersTable(filter, { token, self, signal }) {
	const read = async params => {
		const search = new URLSearchParams(params)
		for (const key of ORDER_FILTERS) if (typeof filter?.[key] === 'string' && filter[key]) search.set(key, filter[key])
		const answer = await fetch(`${self}/api/orders?${search}`, { headers: { Authorization: `Bearer ${token}` }, signal })
		if (!answer.ok) throw new Error(`orders answered ${answer.status}`)
		return answer.json()
	}
	const { matched } = await read({ pageSize: '0' })
	if (matched > FILE_ROWS_MOST) return null
	const rows = []
	for (let page = 1; rows.length < matched; page++) {
		const out = await read({ with: 'rows', sort: 'date-asc', page: String(page), pageSize: String(ORDERS_PAGE) })
		rows.push(...out.orders.filter(o => !o.draft))
		if (page >= out.pages) break
	}
	return {
		columns: ORDER_COLUMNS,
		rows: rows.map(o => [o.date, o.vendor?.name ?? '', (o.categories ?? []).map(c => c.name).join(', '), o.status ?? '', o.reference ?? '', o.itemCount ?? 0, o.saved ?? 0, o.total ?? 0])
	}
}

// a table the model wrote, held to the shape and size a file takes
function tableOf(table) {
	const columns = (Array.isArray(table?.columns) ? table.columns : []).slice(0, 30)
		.map(c => ({ name: String(c?.name ?? '').slice(0, 200), kind: ['text', 'amount', 'number', 'date'].includes(c?.kind) ? c.kind : 'text' }))
	if (!columns.length) return null
	const rows = (Array.isArray(table?.rows) ? table.rows : []).slice(0, FILE_ROWS_MOST)
		.map(r => columns.map((c, i) => {
			const cell = Array.isArray(r) ? r[i] : null
			if (cell === null || cell === undefined) return null
			if ((c.kind === 'amount' || c.kind === 'number') && Number.isFinite(Number(cell)) && cell !== '') return Number(cell)
			return String(cell).slice(0, 2000)
		}))
	return { columns, rows }
}

const FILE_WORDS = { xlsx: 'spreadsheet', csv: 'CSV', docx: 'document', pdf: 'PDF' }

async function makeFileFor(input, making) {
	const type = FILE_TYPES.includes(input?.type) ? input.type : 'xlsx'
	making.onWorking?.({ working: 'file', type })
	const sections = (Array.isArray(input?.sections) ? input.sections : []).slice(0, 50).map(s => ({
		heading: s?.heading ? String(s.heading).slice(0, 200) : null,
		text: s?.text ? String(s.text).slice(0, 20000) : null,
		table: s?.table ? tableOf(s.table) : null
	}))
	let refusal = null
	if (input?.orders && typeof input.orders === 'object') {
		const table = await ordersTable(input.orders, making)
		if (table) sections.push({ heading: 'Orders', table })
		else refusal = FILE_REFUSALS.tooMany
	}
	const file = makeFile({
		userId: making.userId, day: making.today, unlimited: making.unlimited, title: making.question, askedAt: making.askedAt, type,
		doc: { title: String(input?.title || making.question).slice(0, 200), sections }, write: making.write, refusal
	})
	making.files[file.id] = file
	const said = file.state === 'failed' ? ` It could not be made: ${file.reason} Say so in the answer.` : ''
	return `The ${FILE_WORDS[type]} is {{file:${file.id}}}. Write this place mark on a line of its own in the answer.${said}`
}

function makeChartFor(input, making) {
	making.onWorking?.({ working: 'chart' })
	const chart = makeChart(making.userId, input)
	making.charts[chart.id] = chart
	const said = chart.failed ? ` It could not be drawn. ${chart.failed}` : ''
	return `The chart is {{chart:${chart.id}}}. Write this place mark on a line of its own in the answer.${said}`
}

const MAKERS = { make_file: makeFileFor, make_chart: makeChartFor }

// the place marks the model left out of its answer go at its end, so nothing made is lost
function withPlaces(answer, files, charts) {
	const missing = [...Object.keys(files).map(id => `{{file:${id}}}`), ...Object.keys(charts).map(id => `{{chart:${id}}}`)].filter(mark => !answer.includes(mark))
	return missing.length ? `${answer}\n\n${missing.join('\n')}` : answer
}

/** Removes files and charts past their 30 days, every minute. */
export function scheduleAssistantSweep() {
	const sweep = () => { sweepFiles(); sweepCharts() }
	sweep()
	setInterval(sweep, 60 * 1000).unref()
}

/** The answer to the last of `turns` ({ role, text }, oldest first) as { answer, files, charts }, or null.
    Tools read with the session `token`; a file or chart being made is told to `onWorking`. */
export async function answerQuestion({ turns, token, self, today, signal, userId, unlimited = false, zone, locale, onWorking }) {
	const anthropic = getClient()
	const messages = turns.map(t => ({ role: t.role, content: t.text }))
	const making = {
		token, self, signal, userId, today, unlimited, onWorking, files: {}, charts: {},
		question: turns.at(-1).text, askedAt: askedAtIn(zone), write: fileWriter(userId, locale)
	}
	for (let round = 0; round < ROUNDS_MOST; round++) {
		const response = await anthropic.beta.messages.create({
			model: ASSISTANT_MODEL,
			max_tokens: 16000,
			betas: ['server-side-fallback-2026-07-01'],
			fallbacks: 'default',
			cache_control: { type: 'ephemeral' },
			output_config: { effort: 'low' },
			system: instructions(today),
			tools: TOOLS,
			messages
		}, { signal, timeout: REQUEST_TIMEOUT_MS })
		if (response.stop_reason === 'refusal') return null
		if (response.stop_reason !== 'tool_use' && response.stop_reason !== 'pause_turn') {
			const answer = textOf(response.content)
			return answer ? { answer: withPlaces(answer, making.files, making.charts), files: making.files, charts: making.charts } : null
		}
		messages.push({ role: 'assistant', content: response.content })
		if (response.stop_reason === 'pause_turn') continue
		const calls = response.content.filter(b => b.type === 'tool_use')
		const results = await Promise.all(calls.map(async call => {
			if (MAKERS[call.name]) {
				const said = await Promise.resolve(MAKERS[call.name](call.input ?? {}, making))
					.catch(error => (signal?.aborted ? Promise.reject(error) : `Spendly could not make this: ${error.message}`))
				return { type: 'tool_result', tool_use_id: call.id, content: said }
			}
			const result = await callTool(call.name, call.input ?? {}, token, self)
				.catch(() => ({ content: [{ type: 'text', text: 'Spendly could not read this.' }], isError: true }))
			return result
				? { type: 'tool_result', tool_use_id: call.id, content: result.content, is_error: !!result.isError }
				: { type: 'tool_result', tool_use_id: call.id, content: `No tool named ${call.name}.`, is_error: true }
		}))
		signal?.throwIfAborted()
		messages.push({ role: 'user', content: results })
	}
	return null
}
