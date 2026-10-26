import { db } from '../db.js'
import { getClient } from './scanParse.js'
import { MCP_TOOLS, callTool } from './mcpTools.js'
import { askedAtIn, fileWriter } from './askFiles.js'
import { MAKERS, makerOfTool, nothingMade } from '../format/index.js'
import { HEADING_MOST, nameChat, sweepChats } from './askChats.js'
import { offersToolFor } from '../offers/index.js'

/* Ask: a question about the reader's own money, answered by Claude with the
   same read-only tools /mcp offers, run as the signed-in reader over this server's own port, and the
   tools of the makers in format/, which make a file or a chart from the reader's data, and the offers tool
   of offers/, which reads what shops have on offer now from other websites. */

export const ASK_MODEL = 'claude-opus-5-5'
// a chat's heading is a few words, so the smallest model writes it
const HEADING_MODEL = 'claude-haiku-5-5'

// SPENDLY_ASK_QUESTIONS_PER_DAY, set in docker-compose.yml; 0 turns Ask off
const PER_DAY = Math.max(0, Math.floor(Number(process.env.SPENDLY_ASK_QUESTIONS_PER_DAY ?? 25)) || 0)

// a question that needs more rounds of reading than this is answered as failed, so one question has a bounded cost
const ROUNDS_MOST = 8
const REQUEST_TIMEOUT_MS = 60_000

// what one question may carry: the conversation so far, each turn cut to a readable length
export const TURNS_MOST = 20
export const TEXT_MOST = 2000

// the makers' tools are only the app's; /mcp never offers them
const TOOLS = [...MCP_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, input_schema: inputSchema })), ...MAKERS.map(m => m.tool)]

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

const selectAnswered = db.prepare('SELECT answered_count FROM user_ask_days WHERE user_id = ? AND day = ?')
const countAnswered = db.prepare(`INSERT INTO user_ask_days (user_id, day, answered_count) VALUES (?, ?, 1)
	ON CONFLICT (user_id, day) DO UPDATE SET answered_count = answered_count + 1`)

export const askReady = () => PER_DAY > 0 && !!getClient()

/** What the reader is told about Ask on `day`: whether it is there, and the questions left.
    An `unlimited` reader (the server's owner) has no daily limit: perDay and left are null. */
export function askState(userId, day, { unlimited = false } = {}) {
	if (!askReady()) return { ready: false }
	if (unlimited) return { ready: true, perDay: null, left: null }
	const answered = selectAnswered.get(userId, day)?.answered_count ?? 0
	return { ready: true, perDay: PER_DAY, left: Math.max(0, PER_DAY - answered) }
}

/** Counts one answered question; a failed or stopped one is never counted. */
export const noteAnswered = (userId, day) => { countAnswered.run(userId, day) }

const textOf = content => content.filter(b => b.type === 'text').map(b => b.text).join('').trim()

// the place marks the model left out of its answer go at its end, so nothing made is lost
function withPlaces(answer, made) {
	const missing = MAKERS.flatMap(m => Object.keys(made[m.place]).map(id => `{{${m.place}:${id}}}`)).filter(mark => !answer.includes(mark))
	return missing.length ? `${answer}\n\n${missing.join('\n')}` : answer
}

/** Removes chats, files and charts past their 30 days, every minute. */
export function scheduleAskSweep() {
	const sweep = () => { sweepChats(); for (const m of MAKERS) m.sweep() }
	sweep()
	setInterval(sweep, 60 * 1000).unref()
}

/** The answer to the last of `turns` ({ role, text }, oldest first) as { answer, made }, or null; `made` holds
    what each maker made, by id. Tools read with the session `token`; what is being made is told to `onWorking`. */
export async function answerQuestion({ turns, token, self, today, signal, userId, chatId = null, unlimited = false, zone, locale, onWorking }) {
	const anthropic = getClient()
	const messages = turns.map(t => ({ role: t.role, content: t.text }))
	const offers = offersToolFor(userId)
	const tools = offers ? [...TOOLS, offers.tool] : TOOLS
	const system = offers ? `${instructions(today)}\n\n${offers.note}` : instructions(today)
	const making = {
		token, self, signal, userId, chatId, today, unlimited, made: nothingMade(),
		question: turns.at(-1).text, askedAt: askedAtIn(zone), write: fileWriter(userId, locale)
	}
	for (let round = 0; round < ROUNDS_MOST; round++) {
		const response = await anthropic.beta.messages.create({
			model: ASK_MODEL,
			max_tokens: 16000,
			betas: ['server-side-fallback-2026-07-01'],
			fallbacks: 'default',
			cache_control: { type: 'ephemeral' },
			output_config: { effort: 'low' },
			system,
			tools,
			messages
		}, { signal, timeout: REQUEST_TIMEOUT_MS })
		if (response.stop_reason === 'refusal') return null
		if (response.stop_reason !== 'tool_use' && response.stop_reason !== 'pause_turn') {
			const answer = textOf(response.content)
			return answer ? { answer: withPlaces(answer, making.made), made: making.made } : null
		}
		messages.push({ role: 'assistant', content: response.content })
		if (response.stop_reason === 'pause_turn') continue
		const calls = response.content.filter(b => b.type === 'tool_use')
		const results = await Promise.all(calls.map(async call => {
			const maker = makerOfTool(call.name)
			if (maker) {
				onWorking?.({ doing: maker.doing(call.input ?? {}) })
				const said = await Promise.resolve(maker.make(call.input ?? {}, making))
					.then(({ item, said }) => { making.made[maker.place][item.id] = item; return said })
					.catch(error => (signal?.aborted ? Promise.reject(error) : `Spendly could not make this: ${error.message}`))
				return { type: 'tool_result', tool_use_id: call.id, content: said }
			}
			if (offers && call.name === offers.tool.name) {
				const result = await offers.answer(call.input, signal)
				return { type: 'tool_result', tool_use_id: call.id, content: result.content, is_error: !!result.isError }
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

/** Writes the heading of the chat `chatId` from its first question and answer, a few words naming what
    was asked. It is not a question of the day's; a heading that cannot be written leaves the question. */
export async function writeChatHeading(chatId, question, answer) {
	try {
		const response = await getClient().messages.create({
			model: HEADING_MODEL,
			max_tokens: 40,
			system: `Write a heading for this conversation about the reader's own money: a few words naming what was asked, in the language of the question, at most ${HEADING_MOST} characters, for example "Orders at Bilka in 2026". Answer with the heading only.`,
			messages: [{ role: 'user', content: `Question: ${question}\n\nAnswer: ${answer.slice(0, 4000)}` }]
		}, { timeout: REQUEST_TIMEOUT_MS })
		nameChat(chatId, textOf(response.content))
	} catch (error) {
		console.error('Chat heading failed:', error.message)
	}
}

/* Ask turning a sentence typed in a list's search into its filters (Order list 2b): a list is named by its
   read tool, whose arguments less paging and sort are the filters. Another list is one more line here. */
export const FILTER_LISTS = { orders: 'list_orders' }
const NOT_FILTERS = new Set(['page', 'pageSize', 'sort'])

const filterTool = list => {
	const reads = MCP_TOOLS.find(t => t.name === FILTER_LISTS[list])
	const properties = Object.fromEntries(Object.entries(reads.inputSchema.properties).filter(([key]) => !NOT_FILTERS.has(key)))
	return {
		name: `show_${list}`,
		description: `Show the reader their ${list} list with these filters. Every filter is optional; leave out what the sentence does not ask for.`,
		input_schema: { type: 'object', properties }
	}
}

const filterInstructions = (list, today) => `The reader typed a sentence in the search of their ${list} list in Spendly, a money app. Today is ${today}.

Turn the sentence into the list's filters and call show_${list} once with them. Look up the ids of shops (vendors) and categories with the read tools; a shop or category named in the sentence must be one the tools find. A period such as "last month" or "this summer" becomes from and to. Words that are not a filter go in query, as few as the search needs; leave query out when every word was read.

When the sentence cannot be turned into these filters, do not call show_${list}: answer with the word no.`

// a filter Ask gives is kept only in the shape the list can read
const FILTER_VALUES = {
	string: (value, schema) => (typeof value === 'string' && value.trim() && (!schema.enum || schema.enum.includes(value)) && (!schema.pattern || new RegExp(schema.pattern).test(value)) ? value.trim() : undefined),
	number: value => (Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : undefined)
}

/** The filters of `list` that the sentence `text` asks for, as the list's read tool names them, or null when
    it asks for none. Reads with the session `token`, like a question does. */
export async function filtersFor({ list, text, token, self, today, signal }) {
	const anthropic = getClient()
	const show = filterTool(list)
	const tools = [...MCP_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, input_schema: inputSchema })), show]
	const messages = [{ role: 'user', content: text }]
	for (let round = 0; round < ROUNDS_MOST; round++) {
		const response = await anthropic.beta.messages.create({
			model: ASK_MODEL,
			max_tokens: 4000,
			betas: ['server-side-fallback-2026-07-01'],
			fallbacks: 'default',
			cache_control: { type: 'ephemeral' },
			output_config: { effort: 'low' },
			system: filterInstructions(list, today),
			tools,
			messages
		}, { signal, timeout: REQUEST_TIMEOUT_MS })
		const shown = response.content.find(b => b.type === 'tool_use' && b.name === show.name)
		if (shown) {
			const filters = {}
			for (const [key, schema] of Object.entries(show.input_schema.properties)) {
				const value = FILTER_VALUES[schema.type]?.(shown.input?.[key], schema)
				if (value !== undefined) filters[key] = value
			}
			return Object.keys(filters).length ? filters : null
		}
		if (response.stop_reason !== 'tool_use' && response.stop_reason !== 'pause_turn') return null
		messages.push({ role: 'assistant', content: response.content })
		if (response.stop_reason === 'pause_turn') continue
		const calls = response.content.filter(b => b.type === 'tool_use')
		const results = await Promise.all(calls.map(async call => {
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
