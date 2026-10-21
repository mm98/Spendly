import { db } from '../db.js'
import { getClient } from './scanParse.js'
import { MCP_TOOLS, callTool } from './mcpTools.js'

/* The assistant in the app: a question about the reader's own money, answered by Claude with the
   same read-only tools /mcp offers, run as the signed-in reader over this server's own port. */

export const ASSISTANT_MODEL = 'claude-opus-5-5'

// SPENDLY_ASSISTANT_QUESTIONS_PER_DAY, set in docker-compose.yml; 0 turns the assistant off
const PER_DAY = Math.max(0, Math.floor(Number(process.env.SPENDLY_ASSISTANT_QUESTIONS_PER_DAY ?? 25)) || 0)

// a question that needs more rounds of reading than this is answered as failed, so one question has a bounded cost
const ROUNDS_MOST = 8
const REQUEST_TIMEOUT_MS = 60_000

// what one question may carry: the conversation so far, each turn cut to a readable length
export const TURNS_MOST = 20
export const TEXT_MOST = 2000

const TOOLS = MCP_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, input_schema: inputSchema }))

const instructions = today => `You answer questions about one person's own money in Spendly: their orders, shops (called vendors), categories and budget. Today is ${today}.

Read what you need with the tools; they only read, and nothing can be changed. Never guess a figure: when the tools do not give it, say so. Amounts from the tools are in the account's own currency.

Answer in the language of the question, in short plain sentences, for a reader who is not technical. Lead with the answer.

Write only this simple format:
- Paragraphs, separated by one empty line.
- A short list: lines that start with "- ".
- A small table: lines that start and end with "|", the first line naming the columns. No line of dashes under it.
- A link to a record: [text](order:ID), [text](vendor:ID) or [text](category:ID), with the id from the tools.
- Every amount as {{number}}, a plain number with a dot for decimals, for example {{4212.50}}. The app adds the currency.
Nothing else: no bold, no headings, no other links.`

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

/** The answer to the last of `turns` ({ role, text }, oldest first), or null; every tool reads with the
    reader's session `token`. Throws when the request fails or is stopped through `signal`. */
export async function answerQuestion({ turns, token, self, today, signal }) {
	const anthropic = getClient()
	const messages = turns.map(t => ({ role: t.role, content: t.text }))
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
		if (response.stop_reason !== 'tool_use' && response.stop_reason !== 'pause_turn') return textOf(response.content) || null
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
