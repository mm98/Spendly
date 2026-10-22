import { db } from '../db.js'
import { MAKERS, PLACE_LINE, madeIn, makerOfPlace, placesIn } from '../format/index.js'
import { emailMessage } from './emails.js'
import { newId } from './ids.js'
import { publicLink, sendMail } from './mail.js'
import { usableLocale, writerFor } from './statusEmail.js'

/* What Ask keeps beside the conversation (24b, 24c): the reader's saved questions, and the
   conversation sent to the reader's own address. The conversation itself is never stored. */

export const SAVED_MOST = 8

const selectSaved = db.prepare('SELECT id, question FROM user_ask_questions WHERE user_id = ? ORDER BY created_at, rowid')
const insertSaved = db.prepare('INSERT OR IGNORE INTO user_ask_questions (id, user_id, question) VALUES (?, ?, ?)')
const deleteSaved = db.prepare('DELETE FROM user_ask_questions WHERE id = ? AND user_id = ?')

/** The reader's saved questions, oldest first. */
export const savedQuestions = userId => selectSaved.all(userId)

/** Saves `question` as typed; the same wording twice is kept once. False when SAVED_MOST are saved. */
export const saveQuestion = db.transaction((userId, question) => {
	const saved = selectSaved.all(userId)
	if (saved.some(s => s.question === question)) return true
	if (saved.length >= SAVED_MOST) return false
	insertSaved.run(newId('aq'), userId, question)
	return true
})

export const removeQuestion = (userId, id) => { deleteSaved.run(id, userId) }

/* ---- the conversation by email (emails/README.md, "Ask conversation") ---- */

// the answer format lib/ask.js asks for: [text](order:ID) and [text](orders:FILTERS) links and {{number}} amounts
const INLINE = /\[([^\]\n]+)\]\((orders?|vendor|category):([^)\s]+)\)|\{\{(-?\d+(?:\.\d+)?)\}\}/g
// where a link in an answer opens: an order itself, or the order list filtered to what the answer is about
const FILTERS = { vendor: /^[\w-]+(?:,[\w-]+)*$/, category: /^[\w-]+(?:,[\w-]+)*$/, status: /^[^&=]+$/, from: /^\d{4}-\d{2}-\d{2}$/, to: /^\d{4}-\d{2}-\d{2}$/ }
function linkTarget(kind, value) {
	if (kind === 'order') return /^[\w-]+$/.test(value) ? `/orders/${value}` : null
	const asked = kind === 'orders' ? new URLSearchParams(value) : new URLSearchParams({ [kind]: value })
	// a filter the list cannot apply would open more orders than the text names, so such a link shows as text
	const usable = asked.size && [...asked].every(([key, v]) => FILTERS[key]?.test(v) && asked.getAll(key).length === 1)
	return usable ? `/orders?${asked}` : null
}
const AMOUNT = /\{\{(-?\d+(?:\.\d+)?)\}\}/g
const AMOUNT_ONLY = /^\{\{-?\d+(?:\.\d+)?\}\}$/
const NUMBER_ONLY = /^-?[\d.,\s]+$/
// a link's text, so a column of linked amounts still sits on the right
const LINK_ONLY = /^\[([^\]\n]+)\]\((?:orders?|vendor|category):[^)\s]+\)$/
const linkText = cell => cell.match(LINK_ONLY)?.[1] ?? cell

// a no-break space: Outlook ignores nowrap and would put the currency on the next line
const amountText = (n, write) => write.money(Number(n)).replace(/ /g, '\u00a0')

function runsOf(text, write) {
	const runs = []
	let at = 0
	for (const m of text.matchAll(INLINE)) {
		if (m.index > at) runs.push({ text: text.slice(at, m.index) })
		if (m[4] !== undefined) runs.push({ text: amountText(m[4], write), amount: true })
		else {
			const text = m[1].replace(AMOUNT, (_, n) => amountText(n, write)), to = linkTarget(m[2], m[3])
			runs.push(to ? { text, url: publicLink(to) } : { text })
		}
		at = m.index + m[0].length
	}
	if (at < text.length) runs.push({ text: text.slice(at) })
	return runs
}

const cellsOf = line => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())

// a column of amounts or counts sits on the right, as the app's table draws it
function alignOf(rows, i) {
	if (i === 0) return 'left'
	const cells = rows.map(r => linkText(r[i] ?? '')).filter(Boolean)
	return cells.length && cells.every(c => AMOUNT_ONLY.test(c) || NUMBER_ONLY.test(c)) ? 'right' : 'left'
}

function tableOf(lines, write) {
	const [head, ...rows] = lines.map(cellsOf).filter(r => !r.every(c => /^:?-+:?$/.test(c)))
	const aligns = head.map((_, i) => alignOf(rows, i))
	return {
		table: true,
		head: head.map((c, i) => ({ label: runsOf(c, write).map(r => r.text).join(''), align: aligns[i] })),
		rows: rows.map(r => ({ cells: head.map((_, i) => ({ runs: runsOf(r[i] ?? '', write), align: aligns[i], last: i === head.length - 1 })) }))
	}
}

/** An answer as the email's blocks: paragraphs, lists, tables, and what its makers made, as the app draws them.
    `made` holds what was made, by maker and id, and `attached` the ids of what goes with the email. */
export function answerBlocks(text, write, { made, attached }) {
	const email = { attached, write, money: n => amountText(n, write) }
	const blocks = []
	for (const chunk of text.split(/\n\s*\n/)) {
		const lines = chunk.split('\n').map(l => l.trimEnd()).filter(l => l.trim())
		let run = []
		let kind = null
		const flush = () => {
			if (!run.length) return
			if (kind === 'list') blocks.push({ list: true, items: run.map(l => ({ runs: runsOf(l.replace(/^\s*[-*]\s+/, ''), write) })) })
			else if (kind === 'table') blocks.push(tableOf(run, write))
			else if (makerOfPlace(kind)) blocks.push(...makerOfPlace(kind).emailBlocks(run.map(l => l.match(PLACE_LINE)[2]), made[kind], email))
			else blocks.push({ p: true, runs: runsOf(run.join(' '), write) })
			run = []
		}
		for (const line of lines) {
			const place = line.match(PLACE_LINE)?.[1]
			const next = place ?? (/^\s*\|.*\|\s*$/.test(line) ? 'table' : /^\s*[-*]\s+/.test(line) ? 'list' : 'text')
			if (next !== kind) { flush(); kind = next }
			run.push(line)
		}
		flush()
	}
	return blocks.filter(Boolean)
}

const initialsOf = name => {
	const words = String(name).trim().split(/\s+/).filter(Boolean)
	if (!words.length) return ''
	if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase()
	return (words[0][0] + words[1][0]).toLocaleUpperCase()
}

// the currency's English name as an amount says it: "Danish kroner"
const currencyName = code => {
	try { return new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'name' }).formatToParts(2).find(p => p.type === 'currency').value } catch { return code }
}

// the most the attachments of one emailed conversation hold, so it stays under a mail server's 25 MB once encoded
const ATTACHED_BYTES_MOST = 15 * 1024 * 1024

const selectAccount = db.prepare('SELECT u.email, u.name, s.locale, s.currency FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.id = ?')

/** Sends the chat `chatId`, its answered `turns` ({ role, text }, a question then its answer), to the
    reader's own address on `day`, written in `locale` when the account leaves it to the browser. Answers the address. */
export async function emailConversation(userId, { chatId, turns, day, locale }) {
	const account = selectAccount.get(userId)
	const currency = account.currency ?? 'DKK'
	const write = writerFor({ locale: usableLocale(account.locale, locale), currency })
	const date = write.date(day)
	const questions = turns.filter(t => t.role === 'user').map(t => t.text)
	// what the answers name, as it is now: the pictures the email shows in place all go with it, then the
	// rest in the order the answers name it, while it fits
	const places = turns.filter(t => t.role === 'assistant').flatMap(t => placesIn(t.text))
	const made = madeIn(userId, places)
	const offered = MAKERS.flatMap(m => m.attachments(userId, [...new Set(places.filter(p => p.place === m.place).map(p => p.id))], made[m.place], write))
	const attachments = offered.filter(a => a.inline)
	const attached = new Set()
	let room = ATTACHED_BYTES_MOST - attachments.reduce((sum, a) => sum + a.content.length, 0)
	for (const a of offered.filter(a => !a.inline)) {
		if (a.content.length > room) continue
		attachments.push(a)
		attached.add(a.id)
		room -= a.content.length
	}
	const outputs = { made, attached }
	const message = emailMessage('ask-chat', account.email, {
		subject: `Your Spendly conversation, ${date}`,
		preheader: questions.slice(0, 2).join(' '),
		date,
		currency_name: currencyName(currency),
		email: account.email,
		initials: initialsOf(account.name || account.email.split('@')[0]),
		chat_url: publicLink(`/ask/${chatId}`),
		messages: turns.map(t => (t.role === 'user' ? { mine: true, question: t.text } : { mine: false, blocks: answerBlocks(t.text, write, outputs) }))
	})
	await sendMail({ ...message, attachments: attachments.map(({ id, inline, ...a }) => a) })
	return account.email
}
