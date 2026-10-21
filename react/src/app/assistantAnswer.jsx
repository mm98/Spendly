import { Fragment } from 'react'
import { ChatFigures } from '../components/Chat.jsx'
import { currency } from '../api/format.js'

/* An answer from the assistant, in the small format lib/assistant.js asks for: paragraphs, "- "
   lists, "|" tables, [text](order:ID) and [text](orders:FILTERS) links and {{number}} amounts.
   Anything else shows as text. */

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
// a link's text, so a column of linked amounts still lines up as amounts
const LINK_ONLY = /^\[([^\]\n]+)\]\((?:orders?|vendor|category):[^)\s]+\)$/
const linkText = cell => cell.match(LINK_ONLY)?.[1] ?? cell

function inline(text, onOpen) {
	const parts = []
	let at = 0
	for (const m of text.matchAll(INLINE)) {
		if (m.index > at) parts.push(text.slice(at, m.index))
		if (m[4] !== undefined) parts.push(<span key={m.index} className="sp-amount">{currency(Number(m[4]))}</span>)
		else {
			const to = linkTarget(m[2], m[3])
			const label = m[1].replace(AMOUNT, (_, n) => currency(Number(n)))
			parts.push(to ? <a key={m.index} href={'#' + to} onClick={ev => { ev.preventDefault(); onOpen(to) }}>{label}</a> : <Fragment key={m.index}>{label}</Fragment>)
		}
		at = m.index + m[0].length
	}
	if (at < text.length) parts.push(text.slice(at))
	return parts
}

const cellsOf = line => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())

// a column of amounts or counts lines up on the right, as the compact table draws them (c1)
function columnClass(rows, i) {
	// the first column names the row, so it is never lined up as a figure
	if (i === 0) return undefined
	const cells = rows.map(r => linkText(r[i] ?? '')).filter(Boolean)
	if (cells.length && cells.every(c => AMOUNT_ONLY.test(c))) return 'sp-col-amount'
	if (cells.length && cells.every(c => NUMBER_ONLY.test(c))) return 'sp-col-number'
	return undefined
}

function table(lines, key, onOpen) {
	const [head, ...rows] = lines.map(cellsOf).filter(r => !r.every(c => /^:?-+:?$/.test(c)))
	const classes = head.map((_, i) => columnClass(rows, i))
	return (
		<ChatFigures key={key}>
			<table className="sp-table sp-table--compact sp-table--static">
				<thead><tr>{head.map((c, i) => <th key={i} className={classes[i]}>{inline(c, onOpen)}</th>)}</tr></thead>
				<tbody>
					{rows.map((r, ri) => <tr key={ri}>{head.map((_, i) => <td key={i} className={classes[i]}>{inline(r[i] ?? '', onOpen)}</td>)}</tr>)}
				</tbody>
			</table>
		</ChatFigures>
	)
}

/** The answer's blocks, each link opening its record through `onOpen(to)`. */
export function AnswerText({ text, onOpen }) {
	const blocks = []
	for (const [bi, chunk] of text.split(/\n\s*\n/).entries()) {
		const lines = chunk.split('\n').map(l => l.trimEnd()).filter(l => l.trim())
		// a chunk can hold a sentence, then its list or its table, one after the other
		let run = []
		let kind = null
		const flush = () => {
			if (!run.length) return
			const key = `${bi}-${blocks.length}`
			if (kind === 'list') blocks.push(<ul key={key}>{run.map((l, i) => <li key={i}>{inline(l.replace(/^\s*[-*]\s+/, ''), onOpen)}</li>)}</ul>)
			else if (kind === 'table') blocks.push(table(run, key, onOpen))
			else blocks.push(<p key={key}>{run.map((l, i) => <Fragment key={i}>{i ? <br /> : null}{inline(l, onOpen)}</Fragment>)}</p>)
			run = []
		}
		for (const line of lines) {
			const next = /^\s*\|.*\|\s*$/.test(line) ? 'table' : /^\s*[-*]\s+/.test(line) ? 'list' : 'text'
			if (next !== kind) { flush(); kind = next }
			run.push(line)
		}
		flush()
	}
	return blocks
}
