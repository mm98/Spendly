import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Card, CardDivider, CardHeader } from '../components/Card.jsx'
import { IconButton } from '../components/Button.jsx'
import { CellEditor, KINDS, MONTHS, figure, join, shown, signOf, sum, sumMonths } from '../components/BudgetCells.jsx'
import { useToast } from '../components/Toast.jsx'
import { activeCurrency, amount, monthNames } from '../api/format.js'
import { updateBudgetLine } from '../api/client.js'

/* The budget's smaller views: a few months at a time, the year as twelve tiles, and each row's
   year on its own. The full sheet stays in Budget.jsx and is the one place the shape is edited. */

const linesOf = (sheet, kind) => sheet.groups.filter(g => g.kind === kind).flatMap(g => g.lines)
const clamp = (n, low, high) => Math.min(Math.max(n, low), high)

function yearTotals(sheet) {
	const income = sumMonths(linesOf(sheet, 'income'))
	const costs = sumMonths(linesOf(sheet, 'expense'))
	return { income, costs, left: income.map((v, m) => v - costs[m]) }
}

// The phone shows one month; anything wider shows the month it is now and the one after it.
function useMonthsThatFit(ref) {
	const [count, setCount] = useState(2)
	useLayoutEffect(() => {
		const el = ref.current
		if (!el) return
		const fit = () => setCount(el.clientWidth < 600 ? 1 : 2)
		fit()
		const watch = new ResizeObserver(fit)
		watch.observe(el)
		return () => watch.disconnect()
	}, [ref])
	return count
}

function MonthStrip({ months, from, count, thisMonth, onPick }) {
	return (
		<div className="budget-strip" role="group" aria-label="Months">
			{months.map((name, m) => (
				<button key={m} type="button" aria-pressed={m >= from && m < from + count}
					className={join('budget-strip-month', m === thisMonth && 'is-now')}
					onClick={() => onPick(m)}>{name}</button>
			))}
		</div>
	)
}

/** A few months side by side, which slide sideways: arrows, the strip of months, or a swipe. */
export function MonthsCard({ sheet, write, start, onStart }) {
	const months = useMemo(() => monthNames('short'), [])
	const longMonths = useMemo(() => monthNames('long'), [])
	const toast = useToast()
	const box = useRef(null)
	const count = useMonthsThatFit(box)
	const now = new Date()
	const thisMonth = sheet.year === now.getFullYear() ? now.getMonth() : -1
	const from = clamp(start ?? Math.max(thisMonth, 0), 0, MONTHS - count)
	const shownMonths = Array.from({ length: count }, (_, i) => from + i)
	const [slide, setSlide] = useState(null)
	const [editing, setEditing] = useState(null)
	const totals = yearTotals(sheet)
	const lineOrder = sheet.groups.flatMap(g => g.lines)

	const go = to => {
		const next = clamp(to, 0, MONTHS - count)
		if (next === from) return
		setEditing(null)
		setSlide(next > from ? 'next' : 'back')
		onStart(next)
	}

	const touch = useRef(null)
	const swipe = {
		onPointerDown: e => { if (e.pointerType !== 'mouse') touch.current = { x: e.clientX, y: e.clientY } },
		onPointerUp: e => {
			const t = touch.current
			touch.current = null
			if (!t) return
			const dx = e.clientX - t.x
			if (Math.abs(dx) > 48 && Math.abs(dx) > 2 * Math.abs(e.clientY - t.y)) go(from + (dx < 0 ? 1 : -1))
		},
		onPointerCancel: () => { touch.current = null }
	}

	const focusAmount = (lineId, month) => queueMicrotask(() => document.getElementById(`budget-slide-${lineId}-${month}`)?.focus())
	const moveFrom = (lineId, month, direction) => {
		const at = lineOrder.findIndex(l => l.id === lineId)
		if (direction === 'down' && at < lineOrder.length - 1) return focusAmount(lineOrder[at + 1].id, month)
		if (direction === 'up' && at > 0) return focusAmount(lineOrder[at - 1].id, month)
		if (direction === 'right' && month < from + count - 1) return focusAmount(lineId, month + 1)
		if (direction === 'left' && month > from) return focusAmount(lineId, month - 1)
		focusAmount(lineId, month)
	}
	const saveReal = (line, month, value) => {
		if ((line.months[month].real ?? null) === value) return
		write(() => updateBudgetLine(line.id, { month: month + 1, real: value }), s => ({
			...s, groups: s.groups.map(g => ({ ...g, lines: g.lines.map(l => (l.id !== line.id ? l
				: { ...l, months: l.months.map((v, i) => (i === month ? { ...v, real: value } : v)) })) }))
		})).catch(() => {})
	}

	const cell = (line, month) => {
		const value = line.months[month]
		const isEditing = editing?.line === line.id && editing.month === month
		const differs = value.real != null && value.expected != null && value.real !== value.expected
		return (
			<span key={month} role="gridcell" className={join('budget-slide-cell', month === thisMonth && 'is-now')}>
				{isEditing ? (
					<CellEditor typed={editing.typed} initial={editing.typed ?? (value.real != null ? amount(value.real) : '')}
						hint={value.real == null && value.expected != null ? `Expected ${amount(value.expected)}` : null}
						label={`Real amount, ${line.name}, ${longMonths[month]}`}
						onCommit={(next, direction) => {
							setEditing(null)
							saveReal(line, month, next)
							if (direction) moveFrom(line.id, month, direction)
						}}
						onCancel={refocus => { setEditing(null); if (refocus) focusAmount(line.id, month) }}
						onInvalid={() => toast('Not saved. Amounts take a comma, such as 1.234,56.', 'negative')} />
				) : (
					<button type="button" id={`budget-slide-${line.id}-${month}`}
						className={join('budget-amount', value.real == null && value.expected != null && 'is-expected')}
						aria-label={`${line.name}, ${longMonths[month]}: ${value.real != null ? `real ${amount(value.real)}`
							: value.expected != null ? `expected ${amount(value.expected)}` : 'empty'}`}
						onClick={() => setEditing({ line: line.id, month })}
						onKeyDown={e => {
							const direction = { ArrowDown: 'down', ArrowUp: 'up', ArrowRight: 'right', ArrowLeft: 'left' }[e.key]
							if (direction) { e.preventDefault(); moveFrom(line.id, month, direction); return }
							if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); saveReal(line, month, null); return }
							if (/^[0-9,]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
								e.preventDefault()
								setEditing({ line: line.id, month, typed: e.key })
							}
						}}>
						{figure(shown(value))}
					</button>
				)}
				{differs ? <span className="budget-slide-planned">Expected {amount(value.expected)}</span> : null}
			</span>
		)
	}

	const style = { '--budget-shown': count }
	return (
		<Card aria-label={`Budget ${sheet.year}`} className="budget-card">
			<CardHeader title={`Budget ${sheet.year}`}>
				<span className="budget-key"><span className="budget-key-expected">Grey</span> amounts are expected</span>
			</CardHeader>
			<CardDivider />
			<div className="budget-slide" ref={box} style={style}>
				<div className="budget-slide-top">
					<div className="budget-slide-nav">
						<IconButton icon="chevronLeft" label="Earlier months" disabled={from === 0} onClick={() => go(from - 1)} />
						<MonthStrip months={months} from={from} count={count} thisMonth={thisMonth} onPick={m => go(m)} />
						<IconButton icon="chevronRight" label="Later months" disabled={from >= MONTHS - count}
							onClick={() => go(from + 1)} />
					</div>
					<div className="budget-slide-row budget-slide-head" key={`head-${from}`} data-slide={slide}>
						<span className="budget-slide-name" />
						{shownMonths.map(m => (
							<span key={m} className={join('budget-slide-month', m === thisMonth && 'is-now')}>
								<span className="budget-slide-month-name">{longMonths[m]}{m === thisMonth ? <em className="budget-now-tag">Now</em> : null}</span>
								<span className="budget-slide-sums">
									<span>In <b>{figure(totals.income[m])}</b></span>
									<span>Out <b>{figure(totals.costs[m])}</b></span>
									<span className={signOf(totals.left[m]) ?? undefined}>Left <b>{figure(totals.left[m])}</b></span>
								</span>
							</span>
						))}
					</div>
				</div>
				<div className="budget-slide-body" role="grid" key={from} data-slide={slide} {...swipe}
					aria-label={`Budget ${sheet.year}, ${shownMonths.map(m => longMonths[m]).join(' and ')}, amounts in ${activeCurrency().label}`}>
					{KINDS.map(({ kind, title }) => (
						<Fragment key={kind}>
							<div className="budget-slide-section" role="row"><span role="rowheader">{title}</span></div>
							{sheet.groups.filter(g => g.kind === kind).map(group => (
								<Fragment key={group.id}>
									<div className="budget-slide-group" role="row"><span role="rowheader">{group.name}</span></div>
									{group.lines.map(line => (
										<div key={line.id} className="budget-slide-row budget-slide-line" role="row">
											<span role="rowheader" className="budget-slide-name">
												<span className="budget-slide-line-name" title={line.name}>{line.name}</span>
												{line.accountId ? (
													<span className="budget-slide-account">
														{sheet.accounts.find(a => a.id === line.accountId)?.name}</span>
												) : null}
											</span>
											{shownMonths.map(m => cell(line, m))}
										</div>
									))}
								</Fragment>
							))}
						</Fragment>
					))}
					<div className="budget-slide-section" role="row"><span role="rowheader">Totals</span></div>
					{[['Income', totals.income], ['Costs', totals.costs], ['Left over', totals.left, true]].map(([label, values, signed]) => (
						<div key={label} className={join('budget-slide-row budget-slide-sum', signed && 'is-strong')} role="row">
							<span role="rowheader" className="budget-slide-name">{label}</span>
							{shownMonths.map(m => (
								<span key={m} role="gridcell"
									className={join('budget-slide-figure', m === thisMonth && 'is-now', signed && signOf(values[m]))}>
									{figure(values[m])}</span>
							))}
						</div>
					))}
				</div>
			</div>
		</Card>
	)
}

/** The year as twelve tiles: what comes in, what goes out and what is left, month by month. */
export function OverviewCard({ sheet, onOpenMonth }) {
	const longMonths = useMemo(() => monthNames('long'), [])
	const now = new Date()
	const thisMonth = sheet.year === now.getFullYear() ? now.getMonth() : -1
	const totals = yearTotals(sheet)
	const lines = sheet.groups.flatMap(g => g.lines)
	const realIn = m => lines.filter(l => l.months[m].real != null).length
	const planned = m => lines.filter(l => shown(l.months[m]) != null).length
	const year = { income: sum(totals.income), costs: sum(totals.costs), left: sum(totals.left) }

	return (
		<Card aria-label={`Budget ${sheet.year}`} className="budget-card">
			<CardHeader title={`Budget ${sheet.year}`} />
			<CardDivider />
			<div className="budget-overview">
				<div className="budget-overview-year">
					<span><span className="budget-overview-label">Income in {sheet.year}</span><b>{figure(year.income)}</b></span>
					<span><span className="budget-overview-label">Costs in {sheet.year}</span><b>{figure(year.costs)}</b></span>
					<span className={signOf(year.left) ?? undefined}>
						<span className="budget-overview-label">Left over</span><b>{figure(year.left)}</b></span>
				</div>
				<div className="budget-overview-months">
					{longMonths.map((name, m) => {
						const income = totals.income[m]
						const share = income > 0 ? Math.min(totals.costs[m] / income, 1) : totals.costs[m] > 0 ? 1 : 0
						const over = totals.left[m] < 0
						const rows = planned(m)
						return (
							<button key={m} type="button" className={join('budget-tile', m === thisMonth && 'is-now')}
								onClick={() => onOpenMonth(m)} aria-label={`${name}: left over ${figure(totals.left[m])}. Open ${name}`}>
								<span className="budget-tile-name">{name}{m === thisMonth ? <em className="budget-now-tag">Now</em> : null}</span>
								<span className="budget-tile-line"><span>In</span><b>{figure(income)}</b></span>
								<span className="budget-tile-line"><span>Out</span><b>{figure(totals.costs[m])}</b></span>
								<span className="budget-tile-bar" aria-hidden="true">
									<span className={join('budget-tile-fill', over && 'is-over')} style={{ width: `${share * 100}%` }} />
								</span>
								<span className={join('budget-tile-line budget-tile-left', signOf(totals.left[m]))}>
									<span>Left</span><b>{figure(totals.left[m])}</b></span>
								<span className="budget-tile-note">
									{rows ? `Real amounts: ${realIn(m)} of ${rows}` : 'Nothing written yet'}</span>
							</button>
						)
					})}
				</div>
			</div>
		</Card>
	)
}

function RowBars({ values, thisMonth, top, signed }) {
	return (
		<span className="budget-sparks" aria-hidden="true">
			{values.map((v, m) => (
				<span key={m} className={join('budget-spark-slot', m === thisMonth && 'is-now')}>
					<span className={join('budget-spark', v.expected && 'is-expected', signed && signOf(v.value))}
						style={{ height: top ? `${Math.max(Math.abs(v.value ?? 0) / top * 100, v.value ? 4 : 0)}%` : 0 }} />
				</span>
			))}
		</span>
	)
}

/** Each row's year on one line: a small bar for every month, then the year and the monthly average. */
export function RowsCard({ sheet }) {
	const months = useMemo(() => monthNames('short'), [])
	const longMonths = useMemo(() => monthNames('long'), [])
	const now = new Date()
	const thisMonth = sheet.year === now.getFullYear() ? now.getMonth() : -1
	const [open, setOpen] = useState(null)
	const totals = yearTotals(sheet)
	const leftTop = Math.max(...totals.left.map(Math.abs))

	const row = line => {
		const values = line.months.map(v => ({ value: shown(v), expected: v.real == null && v.expected != null }))
		const top = Math.max(...values.map(v => Math.abs(v.value ?? 0)))
		const year = sum(values.map(v => v.value ?? 0))
		const isOpen = open === line.id
		const account = sheet.accounts.find(a => a.id === line.accountId)?.name
		return (
			<Fragment key={line.id}>
				<button type="button" className={join('budget-rows-line', isOpen && 'is-open')} aria-expanded={isOpen}
					onClick={() => setOpen(isOpen ? null : line.id)}>
					<span className="budget-rows-name">
						<span className="budget-slide-line-name">{line.name}</span>
						{account ? <span className="budget-slide-account">{account}</span> : null}
					</span>
					<RowBars values={values} thisMonth={thisMonth} top={top} />
					<span className="budget-rows-figures">
						<b>{figure(year)}</b>
						<span>{figure(year / MONTHS)} a month</span>
					</span>
				</button>
				{isOpen ? (
					<div className="budget-rows-months" role="list" aria-label={`${line.name}, every month`}>
						{line.months.map((v, m) => (
							<span key={m} role="listitem" className={join('budget-rows-month', m === thisMonth && 'is-now')}
								aria-label={`${longMonths[m]}: ${shown(v) == null ? 'empty' : figure(shown(v))}`}>
								<span className="budget-rows-month-name">{months[m]}</span>
								<span className={join('budget-rows-month-figure', v.real == null && v.expected != null && 'is-expected')}>
									{figure(shown(v))}</span>
							</span>
						))}
					</div>
				) : null}
			</Fragment>
		)
	}

	return (
		<Card aria-label={`Budget ${sheet.year}`} className="budget-card">
			<CardHeader title={`Budget ${sheet.year}`}>
				<span className="budget-key"><span className="budget-key-expected">Pale</span> bars are expected</span>
			</CardHeader>
			<CardDivider />
			<div className="budget-rows">
				<div className="budget-rows-scale" aria-hidden="true">
					<span />
					<span className="budget-sparks">
						{months.map((name, m) => (
							<span key={m} className={join('budget-spark-slot budget-spark-name', m === thisMonth && 'is-now')}>{name[0]}</span>
						))}
					</span>
					<span />
				</div>
				{KINDS.map(({ kind, title }) => (
					<Fragment key={kind}>
						<div className="budget-slide-section">{title}</div>
						{sheet.groups.filter(g => g.kind === kind).map(group => (
							<Fragment key={group.id}>
								<div className="budget-slide-group">{group.name}</div>
								{group.lines.map(row)}
							</Fragment>
						))}
					</Fragment>
				))}
				<div className="budget-slide-section">Totals</div>
				<div className="budget-rows-line budget-rows-sum">
					<span className="budget-rows-name"><span className="budget-slide-line-name">Left over</span></span>
					<RowBars signed thisMonth={thisMonth} top={leftTop}
						values={totals.left.map(value => ({ value, expected: false }))} />
					<span className={join('budget-rows-figures', signOf(sum(totals.left)))}>
						<b>{figure(sum(totals.left))}</b>
						<span>{figure(sum(totals.left) / MONTHS)} a month</span>
					</span>
				</div>
			</div>
		</Card>
	)
}

