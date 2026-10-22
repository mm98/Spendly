import { Router } from 'express'
import { TEXT_MOST, TURNS_MOST, answerQuestion, assistantState, noteAnswered, writeChatHeading } from '../lib/assistant.js'
import { isBillingRefusal } from '../lib/scanParse.js'
import { sessionToken, sessionUser } from '../lib/auth.js'
import { SAVED_MOST, emailConversation, placesIn, removeQuestion, saveQuestion, savedQuestions } from '../lib/assistantChat.js'
import { answeredTurnsOf, chatOf, deleteChat, endTurn, keptChats, restartFailedTurn, restoreChat, startTurn } from '../lib/assistantChats.js'
import { chartsById } from '../lib/assistantCharts.js'
import { deleteFile, fileDownload, fileStates, keptFiles, restoreFile } from '../lib/assistantFiles.js'
import { mailAvailable } from '../lib/mail.js'
import { ownsServer } from './account.js'

/* Ask (lib/assistant.js): whether it is there with the questions left today, one question
   answered, the chats kept (Chats, 24f), the saved questions, the files it made (Files, 24e), and a
   chat by email.
   The day is the reader's own. */
export const router = Router()

// one question at a time per account, so questions sent together cannot pass the day's limit
const asking = new Set()

// the server's owner asks without a daily limit
const stateOf = req => assistantState(req.user.id, req.today, { unlimited: ownsServer(req.user) })

router.get('/', (req, res) => res.json(stateOf(req)))

// the earlier questions and answers a question is sent with, in pairs, beside the question itself
const PAIRS_MOST = Math.floor((TURNS_MOST - 1) / 2)
const GONE = 'That chat is no longer kept.'
const idOf = value => (typeof value === 'string' && /^[\w-]{1,64}$/.test(value) ? value : null)

/* One question answered, in the chat `chatId` or a new one, or a failed question asked again in its
   place (`retry`, its turn's id). The first line names the chat and the turn. */
router.post('/ask', async (req, res) => {
	const state = stateOf(req)
	if (!state.ready) return res.status(404).json({ error: 'The assistant is not set up on this server.' })
	if (state.left === 0) return res.status(429).json({ error: 'No questions left today.', left: 0 })
	const chatId = idOf(req.body?.chatId)
	const retry = Number.isInteger(req.body?.retry) ? req.body.retry : null
	const question = typeof req.body?.question === 'string' ? req.body.question.trim() : ''
	if (retry === null && (!question || question.length > TEXT_MOST)) return res.status(400).json({ error: `Ask a question of at most ${TEXT_MOST} characters.` })
	if (retry !== null && !chatId) return res.status(400).json({ error: 'There is no question to ask again.' })

	if (asking.has(req.user.id)) return res.status(409).json({ error: 'Wait for the answer to the last question.' })
	const turn = retry === null
		? startTurn({ userId: req.user.id, chatId, question, day: req.today, pairsMost: PAIRS_MOST })
		: restartFailedTurn({ userId: req.user.id, chatId, turnId: retry, day: req.today, pairsMost: PAIRS_MOST })
	if (!turn) return res.status(404).json({ error: retry === null ? GONE : 'There is no question to ask again.', gone: retry === null })
	asking.add(req.user.id)
	res.on('close', () => asking.delete(req.user.id))

	// the reader leaving or pressing Stop ends the request, and the question is not counted
	const stop = new AbortController()
	res.on('close', () => { if (!res.writableEnded) stop.abort() })
	// one line of JSON per step: the chat, what is being made while it is made, then the answer or the refusal
	res.status(200).type('application/x-ndjson').set('Cache-Control', 'no-store')
	const say = line => res.write(JSON.stringify(line) + '\n')
	say({ chat: turn.chatId, turn: turn.turnId })
	const place = field => (typeof req.body?.[field] === 'string' ? req.body[field].slice(0, 64) : undefined)
	try {
		const out = await answerQuestion({
			turns: turn.turns,
			token: sessionToken(req),
			self: `http://127.0.0.1:${req.socket.localPort}`,
			today: req.today,
			signal: stop.signal,
			userId: req.user.id,
			chatId: turn.chatId,
			unlimited: state.left === null,
			zone: place('zone'),
			locale: place('locale'),
			onWorking: say
		})
		if (!out) {
			endTurn(turn.turnId, 'failed')
			return res.end(JSON.stringify({ error: 'Spendly could not answer that just now.', status: 502 }) + '\n')
		}
		endTurn(turn.turnId, 'answered', out.answer)
		noteAnswered(req.user.id, req.today)
		if (turn.first) writeChatHeading(turn.chatId, turn.turns.at(-1).text, out.answer)
		res.end(JSON.stringify({ ...out, left: state.left === null ? null : state.left - 1 }) + '\n')
	} catch (error) {
		endTurn(turn.turnId, stop.signal.aborted ? 'stopped' : 'failed')
		if (stop.signal.aborted) return
		// the log is the one place a bad key, a timeout or a refused account is told apart
		console.error('Assistant answer failed:', isBillingRefusal(error) ? 'billing' : error.message)
		res.end(JSON.stringify({ error: 'Spendly could not answer that just now.', status: 502 }) + '\n')
	}
})

/* ---- the chats kept (24f) ---- */

router.get('/chats', (req, res) => res.json(keptChats(req.user.id, {
	q: typeof req.query.q === 'string' ? req.query.q : '',
	page: Number(req.query.page) || 1,
	pageSize: req.query.pageSize === undefined ? 25 : Number(req.query.pageSize)
})))

// a chat as Ask shows it again, with what its answers' files are now and the charts they drew
router.get('/chats/:id', (req, res) => {
	const chat = chatOf(req.user.id, req.params.id)
	if (!chat) return res.status(404).json({ error: GONE, gone: true })
	const places = chat.turns.flatMap(t => (t.answer ? placesIn(t.answer) : []))
	const files = fileStates(req.user.id, places.filter(p => p.kind === 'file').map(p => p.id))
	const charts = chartsById(req.user.id, places.filter(p => p.kind === 'chart').map(p => p.id))
	res.json({
		...chat,
		turns: chat.turns.map(t => {
			const own = t.answer ? placesIn(t.answer) : []
			const pick = (kind, from) => Object.fromEntries(own.filter(p => p.kind === kind && from[p.id]).map(p => [p.id, from[p.id]]))
			return { ...t, files: pick('file', files), charts: pick('chart', charts) }
		})
	})
})

router.delete('/chats/:id', (req, res) => {
	const gone = deleteChat(req.user.id, req.params.id)
	if (!gone) return res.status(404).json({ error: 'This chat was already deleted.' })
	res.json({ ok: true, files: gone.files })
})

router.post('/chats/:id/restore', (req, res) => {
	if (!restoreChat(req.user.id, req.params.id)) return res.status(404).json({ error: 'This chat cannot be brought back any more.' })
	res.json({ ok: true })
})

/* ---- the files Ask made (24e) ---- */

router.get('/files', (req, res) => res.json(keptFiles(req.user.id, { page: Number(req.query.page) || 1, pageSize: req.query.pageSize === undefined ? 25 : Number(req.query.pageSize) })))

// what each file an answer names is now: ready, deleted, or removed after its days
router.get('/files/states', (req, res) => {
	const ids = String(req.query.ids ?? '').split(',').filter(id => /^[\w-]{1,64}$/.test(id)).slice(0, 100)
	res.json({ files: fileStates(req.user.id, ids) })
})

router.delete('/files/:id', (req, res) => {
	if (!deleteFile(req.user.id, req.params.id)) return res.status(404).json({ error: 'This file was already deleted.' })
	res.json({ ok: true })
})

router.post('/files/:id/restore', (req, res) => {
	if (!restoreFile(req.user.id, req.params.id)) return res.status(404).json({ error: 'This file cannot be brought back any more.' })
	res.json({ ok: true })
})

/** A file's download, before the sign-in gate: a tab that is signed out opens sign-in, and Files
    starts the download after it. Only the owner's session reads the bytes. */
export function downloadFile(req, res) {
	const user = sessionUser(req)
	if (!user) return res.redirect(302, `/#/signin?next=${encodeURIComponent(`/ask/files?download=${encodeURIComponent(req.params.id)}`)}`)
	const file = fileDownload(user.id, req.params.id)
	if (!file) return res.redirect(302, '/#/ask/files')
	res.set('Content-Type', file.mime)
	res.set('Content-Disposition', `attachment; filename="${file.name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'")}"; filename*=UTF-8''${encodeURIComponent(file.name)}`)
	res.set('Cache-Control', 'private, no-store')
	res.send(file.content)
}

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

// one conversation email a minute per account (24c)
const EMAIL_EVERY_MS = 60 * 1000
const lastEmail = new Map()

router.post('/email', async (req, res) => {
	if (!mailAvailable()) return res.status(503).json({ error: 'This server cannot send email.' })
	const chatId = idOf(req.body?.chatId)
	const turns = chatId && answeredTurnsOf(req.user.id, chatId)
	if (!turns) return res.status(404).json({ error: GONE, gone: true })
	if (!turns.length) return res.status(400).json({ error: 'There is no answered question in this chat to send.' })
	const wait = (lastEmail.get(req.user.id) ?? 0) + EMAIL_EVERY_MS - Date.now()
	if (wait > 0) return res.status(429).json({ error: 'Wait a minute before emailing this chat again.', retryAfter: Math.ceil(wait / 1000) })
	lastEmail.set(req.user.id, Date.now())
	try {
		res.json({ email: await emailConversation(req.user.id, { chatId, turns, day: req.today, locale: String(req.body?.locale ?? '') }) })
	} catch (e) {
		console.error(`[mail] conversation email: ${e.message}`)
		lastEmail.delete(req.user.id)
		res.status(502).json({ error: 'The email could not be sent. Try again.' })
	}
})
