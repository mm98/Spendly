import { Router } from 'express'
import { TEXT_MOST, TURNS_MOST, answerQuestion, assistantState, noteAnswered } from '../lib/assistant.js'
import { isBillingRefusal } from '../lib/scanParse.js'
import { sessionToken } from '../lib/auth.js'

/* The assistant in the app (lib/assistant.js): whether it is there with the questions left today,
   and one question answered. The day is the reader's own, so the limit opens again at their midnight. */
export const router = Router()

// one question at a time per account, so questions sent together cannot pass the day's limit
const asking = new Set()

router.get('/', (req, res) => res.json(assistantState(req.user.id, req.today)))

// the conversation so far, oldest first, ending with the question; null when it is not that shape
function turnsOf(body) {
	const turns = body?.turns
	if (!Array.isArray(turns) || !turns.length || turns.length > TURNS_MOST) return null
	const clean = turns.map(t => ({ role: t?.role, text: typeof t?.text === 'string' ? t.text.trim() : '' }))
	const alternates = clean.every((t, i) => t.role === (i % 2 ? 'assistant' : 'user') && t.text && t.text.length <= TEXT_MOST)
	return alternates && clean.at(-1).role === 'user' ? clean : null
}

router.post('/ask', async (req, res) => {
	const state = assistantState(req.user.id, req.today)
	if (!state.ready) return res.status(404).json({ error: 'The assistant is not set up on this server.' })
	if (!state.left) return res.status(429).json({ error: 'No questions left today.', left: 0 })
	const turns = turnsOf(req.body)
	if (!turns) return res.status(400).json({ error: `Ask a question of at most ${TEXT_MOST} characters.` })

	if (asking.has(req.user.id)) return res.status(409).json({ error: 'Wait for the answer to the last question.' })
	asking.add(req.user.id)
	res.on('close', () => asking.delete(req.user.id))

	// the reader leaving or pressing Stop ends the request, and the question is not counted
	const stop = new AbortController()
	res.on('close', () => { if (!res.writableEnded) stop.abort() })
	try {
		const answer = await answerQuestion({
			turns,
			token: sessionToken(req),
			self: `http://127.0.0.1:${req.socket.localPort}`,
			today: req.today,
			signal: stop.signal
		})
		if (!answer) return res.status(502).json({ error: 'Spendly could not answer that just now.' })
		noteAnswered(req.user.id, req.today)
		res.json({ answer, left: state.left - 1 })
	} catch (error) {
		if (stop.signal.aborted) return
		// the log is the one place a bad key, a timeout or a refused account is told apart
		console.error('Assistant answer failed:', isBillingRefusal(error) ? 'billing' : error.message)
		res.status(502).json({ error: 'Spendly could not answer that just now.' })
	}
})
