import { Fragment, useEffect, useRef, useState } from 'react'
import { ChatChart, ChatFigures, ChatFile, ChatFiles, ChatShares } from '../components/Chat.jsx'
import { Bars, ChartTip, Donut, Legend, LegendItem, ShareRow, Shares } from '../components/Data.jsx'
import { amount, currency, dot, plural, shortDate } from '../api/format.js'

/* An answer from Ask, in the small format lib/ask.js asks for: paragraphs, "- "
   lists, "|" tables, [text](order:ID) and [text](orders:FILTERS) links, {{number}} amounts, and a place
   mark such as {{file:ID}} on a line of its own where something a maker made belongs (PLACES, below).
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


// the second series is the muted bar, as a pair draws it, on the key that matches it (Ask 24d)
const SERIES_KEYS = [1, 4]

function shareLink(share, chart) {
	if (share.other === 'categories') return '/categories'
	if (share.other === 'vendors') return '/vendors'
	const asked = new URLSearchParams()
	if (share.categoryId) asked.set('category', share.categoryId)
	else if (share.vendorId) asked.set('vendor', share.vendorId)
	else return null
	if (chart.from) asked.set('from', chart.from)
	if (chart.to) asked.set('to', chart.to)
	return `/orders?${asked}`
}

// shares of a whole: the Donut and its Shares
function SharesChart({ chart, onOpen }) {
	const total = chart.shares.reduce((sum, s) => sum + s.amount, 0) || 1
	const shares = chart.shares.map((s, i) => ({ ...s, series: i + 1, share: Math.round(s.amount / total * 100) }))
	return (
		<ChatChart name={chart.name} meta={chart.meta}>
			<ChatShares>
				<Donut shares={shares.map(s => ({ series: s.series, value: s.amount / total * 100 }))} aria-label={shares.map(s => `${s.name} ${s.share}%`).join(', ')} />
				<Shares>
					{shares.map(s => {
						const to = shareLink(s, chart)
						return (
							<ShareRow key={s.name} series={s.series} amount={currency(s.amount)} value={`${s.share}%`}
								href={to ? '#' + to : undefined} onClick={to ? ev => { ev.preventDefault(); onOpen(to) } : undefined}>
								{s.name}
							</ShareRow>
						)
					})}
				</Shares>
			</ChatShares>
		</ChatChart>
	)
}

// bars over time, a column's readout on hover or tap
function BarsChart({ chart }) {
	const [open, setOpen] = useState(null)
	const box = useRef(null)
	// a tap shows a column's readout until a tap elsewhere
	useEffect(() => {
		if (open === null) return
		const away = ev => { if (!ev.target.closest?.('.sp-bars__col') || !box.current?.contains(ev.target)) setOpen(null) }
		document.addEventListener('pointerdown', away)
		return () => document.removeEventListener('pointerdown', away)
	}, [open])
	const keyed = chart.series.length > 1
	const top = Math.max(0, ...chart.columns.flatMap(c => c.values)) || 1
	const height = v => Math.max(0, v) / top * 100
	const columns = chart.columns.map((c, i) => {
		const orders = c.orders === undefined ? '' : `, ${plural(c.orders, 'order')}`
		return {
			key: String(i),
			tick: c.tick,
			...(keyed ? { pair: c.values.map(height) } : { height: height(c.values[0]) }),
			label: keyed ? `${c.label}, ${chart.series.map((s, n) => `${s.name} ${currency(c.values[n])}`).join('; ')}` : `${c.label}, ${currency(c.values[0])}${orders}`,
			readout: keyed
				? <ChartTip title={c.label} rows={chart.series.map((s, n) => ({ key: String(n), series: SERIES_KEYS[n], name: s.name, value: currency(c.values[n]) }))} />
				: <ChartTip title={c.label} value={currency(c.values[0])} rows={c.orders === undefined ? [] : [{ key: 'orders', name: 'Orders', value: amount(c.orders, 0) }]} />
		}
	})
	const tap = ev => {
		const col = ev.target.closest?.('.sp-bars__col')
		if (col) setOpen([...col.parentElement.children].indexOf(col).toString())
	}
	return (
		<ChatChart name={chart.name} meta={chart.meta}>
			<Bars columns={columns} open={open ?? undefined} ref={box} onClick={tap} />
			{keyed
				? <Legend>{chart.series.map((s, n) => <LegendItem key={n} series={SERIES_KEYS[n]}>{s.name}</LegendItem>)}</Legend>
				: null}
		</ChatChart>
	)
}

// a chart kind of api/src/format/chart, as the app draws it
const CHART_DRAWINGS = { bars: BarsChart, shares: SharesChart }

/** A chart the answer made, drawn by its kind at its own size. */
export function AnswerChart({ chart, onOpen }) {
	if (chart.failed) return <ChatChart name={chart.name} meta={chart.meta} failed={chart.failed} />
	const Drawing = CHART_DRAWINGS[chart.kind]
	return Drawing ? <Drawing chart={chart} onOpen={onOpen} /> : null
}

/* What a maker of api/src/format made, as the app draws a run of its place marks: the ids in the order the
   answer names them, and the maker's own items by id. */
const PLACES = {
	file: (ids, files, { key }) => {
		const shown = ids.map(id => files?.[id]).filter(Boolean)
		if (!shown.length) return []
		return [
			<ChatFiles key={key}>
				{shown.map(f => <ChatFile key={f.id} title={f.title} kind={f.kind} size={f.size} state={f.state} reason={f.reason} gone={f.gone} href={f.href} />)}
			</ChatFiles>
		]
	},
	chart: (ids, charts, { key, onOpen }) => ids.map(id => charts?.[id]).map((chart, i) => (chart ? <AnswerChart key={`${key}-${i}`} chart={chart} onOpen={onOpen} /> : null))
}
const PLACE = new RegExp(`^\\s*\\{\\{(${Object.keys(PLACES).join('|')}):([\\w-]{1,64})\\}\\}\\s*$`)

/** The answer's blocks, each link opening its record through `onOpen(to)`; `made` holds what it made, by
    maker and id. */
export function AnswerText({ text, made, onOpen }) {
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
			else if (PLACES[kind]) blocks.push(...PLACES[kind](run.map(l => l.match(PLACE)[2]), made?.[kind], { key, onOpen }))
			else blocks.push(<p key={key}>{run.map((l, i) => <Fragment key={i}>{i ? <br /> : null}{inline(l, onOpen)}</Fragment>)}</p>)
			run = []
		}
		for (const line of lines) {
			const next = line.match(PLACE)?.[1] ?? (/^\s*\|.*\|\s*$/.test(line) ? 'table' : /^\s*[-*]\s+/.test(line) ? 'list' : 'text')
			if (next !== kind) { flush(); kind = next }
			run.push(line)
		}
		flush()
	}
	return blocks.filter(Boolean)
}
