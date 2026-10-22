import { db } from '../db.js'
import { chartsById } from './assistantCharts.js'
import { fileDownload, fileStates } from './assistantFiles.js'
import { CHART_PICTURE_WIDTH, chartPicture } from './chartPicture.js'
import { emailMessage } from './emails.js'
import { newId } from './ids.js'
import { publicLink, sendMail } from './mail.js'
import { usableLocale, writerFor } from './statusEmail.js'

/* What Ask keeps beside the conversation (24b, 24c): the reader's saved questions, and the
   conversation sent to the reader's own address. The conversation itself is never stored. */

export const SAVED_MOST = 8

const selectSaved = db.prepare('SELECT id, question FROM user_assistant_questions WHERE user_id = ? ORDER BY created_at, rowid')
const insertSaved = db.prepare('INSERT OR IGNORE INTO user_assistant_questions (id, user_id, question) VALUES (?, ?, ?)')
const deleteSaved = db.prepare('DELETE FROM user_assistant_questions WHERE id = ? AND user_id = ?')

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

// the answer format lib/assistant.js asks for: [text](order:ID) and [text](orders:FILTERS) links and {{number}} amounts
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

// a line that is only the place of a file or a chart the answer made
const PLACE = /^\s*\{\{(file|chart):([\w-]{1,64})\}\}\s*$/
export const placesIn = text => [...text.matchAll(/\{\{(file|chart):([\w-]{1,64})\}\}/g)].map(m => ({ kind: m[1], id: m[2] }))

// the files one answer made together, named and sized, never linked: the download needs a sign-in (emails/README.md)
function filesBlock(ids, outputs) {
	const files = ids.map(id => outputs.files[id]).filter(f => f && f.state !== 'gone')
	if (!files.length) return null
	const ready = files.filter(f => f.state === 'ready')
	return {
		files: true,
		items: files.map((f, i) => (f.state === 'failed'
			? { title: f.title, first: i === 0, failed: true, reason: f.reason }
			: { title: f.title, kind: f.kind, size: f.size, first: i === 0 })),
		ready: ready.length > 0,
		many: ready.length > 1,
		files_url: publicLink('/ask/files'),
		kept_until: ready.map(f => f.keptUntil).sort()[0] ?? null
	}
}

// what a chart shows, in words: its alt text, and the text version's line
function chartValues(chart, write) {
	if (chart.kind === 'shares') {
		const total = chart.shares.reduce((sum, s) => sum + s.amount, 0) || 1
		return chart.shares.map(s => `${s.name} ${amountText(s.amount, write)} (${Math.round(s.amount / total * 100)}%)`).join(', ')
	}
	const keyed = chart.series.length > 1
	return chart.columns.map(c => (keyed
		? `${c.label}: ${chart.series.map((s, i) => `${s.name} ${amountText(c.values[i], write)}`).join(', ')}`
		: `${c.label} ${amountText(c.values[0], write)}`)).join(', ')
}

function chartBlock(id, outputs, write) {
	const chart = outputs.charts[id]
	if (!chart) return null
	if (chart.failed) return { p: true, runs: [{ text: `${chart.name}: ${chart.failed}` }] }
	const values = chartValues(chart, write)
	return { chart: true, title: chart.name, meta: chart.meta ?? '', src: outputs.picture(chart), width: CHART_PICTURE_WIDTH, alt: `${chart.name}: ${values}`, values }
}

/** An answer as the email's blocks: paragraphs, lists, tables, files and charts, as the app draws them.
    `outputs` holds the answer's files and charts by id, and `picture(chart)` names a chart's attached picture. */
export function answerBlocks(text, write, outputs = { files: {}, charts: {}, picture: () => '' }) {
	const blocks = []
	for (const chunk of text.split(/\n\s*\n/)) {
		const lines = chunk.split('\n').map(l => l.trimEnd()).filter(l => l.trim())
		let run = []
		let kind = null
		const flush = () => {
			if (!run.length) return
			if (kind === 'list') blocks.push({ list: true, items: run.map(l => ({ runs: runsOf(l.replace(/^\s*[-*]\s+/, ''), write) })) })
			else if (kind === 'table') blocks.push(tableOf(run, write))
			else if (kind === 'file') blocks.push(filesBlock(run.map(l => l.match(PLACE)[2]), outputs))
			else if (kind === 'chart') blocks.push(...run.map(l => chartBlock(l.match(PLACE)[2], outputs, write)))
			else blocks.push({ p: true, runs: runsOf(run.join(' '), write) })
			run = []
		}
		for (const line of lines) {
			const place = line.match(PLACE)?.[1]
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

/** Sends the conversation `turns` ({ role, text }, a question then its answer) to the reader's own
    address on `day`, written in `locale` when the account leaves it to the browser. Answers the address. */
export async function emailConversation(userId, { turns, day, locale }) {
	const account = selectAccount.get(userId)
	const currency = account.currency ?? 'DKK'
	const write = writerFor({ locale: usableLocale(account.locale, locale), currency })
	const date = write.date(day)
	const questions = turns.filter(t => t.role === 'user').map(t => t.text)
	// the files and charts the answers name, as they are now; a chart is attached as a picture, so no address leads to it
	const places = turns.filter(t => t.role === 'assistant').flatMap(t => placesIn(t.text))
	const attachments = []
	const outputs = {
		files: fileStates(userId, places.filter(p => p.kind === 'file').map(p => p.id)),
		charts: chartsById(userId, places.filter(p => p.kind === 'chart').map(p => p.id)),
		picture: chart => {
			const cid = `${chart.id}@spendly`
			attachments.push({ filename: `${chart.name}.png`, content: chartPicture(chart, write), contentType: 'image/png', cid })
			return `cid:${cid}`
		}
	}
	const message = emailMessage('ask-chat', account.email, {
		subject: `Your Spendly conversation, ${date}`,
		preheader: questions.slice(0, 2).join(' '),
		date,
		currency_name: currencyName(currency),
		email: account.email,
		initials: initialsOf(account.name || account.email.split('@')[0]),
		ask_url: publicLink('/ask'),
		messages: turns.map(t => (t.role === 'user' ? { mine: true, question: t.text } : { mine: false, blocks: answerBlocks(t.text, write, outputs) }))
	})
	// the files still kept go with it, in the order the answers name them, while they fit beside the charts
	let room = ATTACHED_BYTES_MOST - attachments.reduce((sum, a) => sum + a.content.length, 0)
	for (const id of new Set(places.filter(p => p.kind === 'file').map(p => p.id))) {
		const file = outputs.files[id]?.state === 'ready' && fileDownload(userId, id)
		if (!file || file.content.length > room) continue
		attachments.push({ filename: file.name, content: file.content, contentType: file.mime })
		room -= file.content.length
	}
	await sendMail({ ...message, attachments })
	return account.email
}
