import { Router } from 'express'
import { TEXT_MOST, TURNS_MOST, answerQuestion, assistantState, noteAnswered } from '../lib/assistant.js'
import { isBillingRefusal } from '../lib/scanParse.js'
import { sessionToken } from '../lib/auth.js'
import { SAVED_MOST, emailConversation, removeQuestion, saveQuestion, savedQuestions } from '../lib/assistantChat.js'
import { mailAvailable } from '../lib/mail.js'

/* Ask Spendly (lib/assistant.js): whether it is there with the questions left today, one question
   answered, the saved questions, and the conversation by email. The day is the reader's own. */
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

router.get('/questions', (req, res) => res.json({ questions: savedQuestions(req.user.id), most: SAVED_MOST }))

router.post('/questions', (req, res) => {
	const question = typeof req.body?.question === 'string' ? req.body.question.trim() : ''
	if (!question || question.length > TEXT_MOST) return res.status(400).json({ error: `Save a question of at most ${TEXT_MOST} characters.` })
	if (!saveQuestion(req.user.id, question)) return res.status(409).json({ error: `${SAVED_MOST} saved. Remove one to save another.` })
	res.json({ questions: savedQuestions(req.user.id), most: SAVED_MOST })
})

router.delete('/questions/:id', (req, res) => {
	removeQuestion(req.user.id, req.params.id)
	res.json({ questions: savedQuestions(req.user.id), most: SAVED_MOST })
})

// a whole conversation, answered: questions and answers in turn, ending with an answer
const EMAIL_TURNS_MOST = 200
const ANSWER_MOST = 20000
function conversationOf(body) {
	const turns = body?.turns
	if (!Array.isArray(turns) || !turns.length || turns.length > EMAIL_TURNS_MOST || turns.length % 2) return null
	const clean = turns.map(t => ({ role: t?.role, text: typeof t?.text === 'string' ? t.text.trim() : '' }))
	return clean.every((t, i) => t.role === (i % 2 ? 'assistant' : 'user') && t.text && t.text.length <= (i % 2 ? ANSWER_MOST : TEXT_MOST)) ? clean : null
}

// one conversation email a minute per account (24c)
const EMAIL_EVERY_MS = 60 * 1000
const lastEmail = new Map()

router.post('/email', async (req, res) => {
	if (!mailAvailable()) return res.status(503).json({ error: 'This server cannot send email.' })
	const turns = conversationOf(req.body)
	if (!turns) return res.status(400).json({ error: 'There is no answered conversation to send.' })
	const wait = (lastEmail.get(req.user.id) ?? 0) + EMAIL_EVERY_MS - Date.now()
	if (wait > 0) return res.status(429).json({ error: 'Wait a minute before emailing this chat again.', retryAfter: Math.ceil(wait / 1000) })
	lastEmail.set(req.user.id, Date.now())
	try {
		res.json({ email: await emailConversation(req.user.id, { turns, day: req.today, locale: String(req.body?.locale ?? '') }) })
	} catch (e) {
		console.error(`[mail] conversation email: ${e.message}`)
		lastEmail.delete(req.user.id)
		res.status(502).json({ error: 'The email could not be sent. Try again.' })
	}
})
