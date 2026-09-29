import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Card, CardDivider, CardHeader, KpiCard } from '../components/Card.jsx'
import { IconButton } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { CellEditor, KINDS, MONTHS, figure, join, shown, signOf, sum, sumMonths } from '../components/BudgetCells.jsx'
import { GroupPanel, RowPanel, useFocusLater } from '../components/BudgetPanels.jsx'
import { Meter } from '../components/Viz.jsx'
import { Sep } from '../components/Sep.jsx'
import { useToast } from '../components/Toast.jsx'
import { activeCurrency, amount, monthNames } from '../api/format.js'
import { updateBudgetLine } from '../api/client.js'

/* The budget's smaller views: a few months at a time, the year as twelve tiles, and each row's
   year on its own. The full sheet stays in Budget.jsx; the months open the same panels as it does. */

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

// Whole percent. Costs with no income to pay them count as the whole income used.
const percentOf = (part, whole) => (whole > 0 ? Math.round(part / whole * 100) : part > 0 ? 100 : 0)
// A row without an expected amount is taken at its real one: only a row with a plan can differ from it.
const plannedOf = (lines, m) => lines.reduce((s, l) => s + (l.months[m].expected ?? l.months[m].real ?? 0), 0)
const anyExpected = (lines, m) => lines.some(l => l.months[m].expected != null)

// How much of a month's income its costs take, against what the expected amounts said, where there are any.
function monthUse(sheet, totals, month) {
	const income = linesOf(sheet, 'income')
	const costs = linesOf(sheet, 'expense')
	const plannedIncome = plannedOf(income, month)
	const plannedCosts = plannedOf(costs, month)
	const incomePlanned = anyExpected(income, month)
	const costsPlanned = anyExpected(costs, month)
	return {
		plannedIncome, plannedCosts, incomePlanned, costsPlanned, hasPlan: incomePlanned || costsPlanned,
		used: percentOf(totals.costs[month], totals.income[month]), planned: percentOf(plannedCosts, plannedIncome)
	}
}

const planWords = use => (use.hasPlan ? <><Sep />The plan was {use.planned}%</> : null)

const UseMeter = ({ use, caption }) => (
	<>
		<Meter fill={Math.min(use.used, 100)} marker={use.hasPlan && use.plannedIncome > 0 ? Math.min(use.planned, 100) : null}
			ariaLabel={`${use.used}% of the income is used.${use.hasPlan ? ` The plan was ${use.planned}%.` : ''}`} />
		{caption}
	</>
)

/* A row's tag: most agreements cost the same every month, so the eye goes to the ones that vary
   with use, like electricity, and the ones that fall in only some months, like a yearly insurance. */
function rowTag(line, months) {
	const values = line.months.map(shown)
	const held = values.map((v, m) => (v != null ? m : -1)).filter(m => m >= 0)
	if (!held.length) return null
	if (held.length < MONTHS) return held.length <= 3 ? `Only ${held.map(m => months[m]).join(', ')}` : 'Not every month'
	return new Set(values.map(v => Math.round(v * 100))).size > 1 ? 'Varies' : null
}

function versusExpected(counted, planned, hasPlan, kind) {
	if (!hasPlan) return { note: 'No expected amounts yet' }
	const diff = counted - planned
	if (!Math.round(diff * 100)) return { note: 'As expected' }
	const good = (diff > 0) === (kind === 'income')
	return {
		delta: `${figure(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than expected`,
		trend: diff > 0 ? 'up' : 'down', tone: good ? 'good' : 'bad'
	}
}

/** The month in front: what is left, how much of the income is used, and how it compares to the plan. */
function MonthHero({ sheet, month, longMonths, thisMonth, totals, onGo, count }) {
	const use = monthUse(sheet, totals, month)
	const lines = [...linesOf(sheet, 'income'), ...linesOf(sheet, 'expense')]
	const withAmount = lines.filter(l => shown(l.months[month]) != null)
	const real = withAmount.filter(l => l.months[month].real != null).length
	const next = month < MONTHS - 1
	return (
		<div className="stats-hero-row budget-hero-row">
			<section className="card card-ai stats-hero budget-hero" aria-label={`${longMonths[month]} ${sheet.year}`}>
				<div className="stats-hero-pager">
					<IconButton icon="chevronLeft" label="Earlier month" disabled={month === 0} className="pager-arrow"
						onClick={() => onGo(month - 1)} />
					<span className="panel-heading pager-heading budget-hero-month">
						{longMonths[month]} {sheet.year}{month === thisMonth ? <em className="budget-now-tag">Now</em> : null}</span>
					<IconButton icon="chevronRight" label="Later month" disabled={month >= MONTHS - count} className="pager-arrow"
						onClick={() => onGo(month + 1)} />
				</div>
				<div>
					<span className="stats-hero-caption">Left over</span>
					<div className="stats-hero-total tabular-figures">{figure(totals.left[month])}</div>
				</div>
				<div className="budget-hero-use">
					<UseMeter use={use} caption={<p className="stats-hero-caption">{use.used}% of the income is used{planWords(use)}</p>} />
				</div>
			</section>
			<div className="kpi-row">
				<KpiCard label="Income" value={figure(totals.income[month])}
					{...versusExpected(totals.income[month], use.plannedIncome, use.incomePlanned, 'income')} />
				<KpiCard label="Costs" value={figure(totals.costs[month])}
					{...versusExpected(totals.costs[month], use.plannedCosts, use.costsPlanned, 'expense')} />
				<KpiCard label="Real amounts" value={`${real} of ${withAmount.length}`}
					note={real === withAmount.length ? 'Every row has its real amount' : `${withAmount.length - real} rows still show the expected amount`} />
				<KpiCard label={next ? `Left over in ${longMonths[month + 1]}` : `Left over in ${sheet.year}`}
					value={figure(next ? totals.left[month + 1] : sum(totals.left))}
					note={next ? (thisMonth === month ? 'Next month' : 'The month after') : 'The whole year'} />
			</div>
		</div>
	)
}

/** Every month as a panel in a row that slides sideways: swipe it, or use the arrows and the strip.
    While arranging, a name opens the row's or the group's panel in the month it was clicked in. */
export function MonthsCard({ sheet, write, start, onStart, arranging, del }) {
	const months = useMemo(() => monthNames('short'), [])
	const longMonths = useMemo(() => monthNames('long'), [])
	const toast = useToast()
	const box = useRef(null)
	const track = useRef(null)
	const count = useMonthsThatFit(box)
	const now = new Date()
	const thisMonth = sheet.year === now.getFullYear() ? now.getMonth() : -1
	const from = clamp(start ?? Math.max(thisMonth, 0), 0, MONTHS - count)
	const [editing, setEditing] = useState(null)
	const [panel, setPanel] = useState(null)
	const totals = yearTotals(sheet)
	const lineOrder = sheet.groups.flatMap(g => g.lines)

	const step = () => {
		const el = track.current
		const first = el?.firstElementChild
		return first ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap) : 0
	}
	// The row opens on the chosen month and keeps it when the panels change width, since the
	// browser keeps the distance in pixels, which would land on another month.
	const at = useRef(from)
	at.current = from
	useLayoutEffect(() => {
		const el = track.current
		if (!el) return
		const place = () => { el.scrollLeft = at.current * step() }
		place()
		const watch = new ResizeObserver(place)
		watch.observe(el)
		return () => watch.disconnect()
	}, [count])
	const go = to => {
		const next = clamp(to, 0, MONTHS - count)
		setEditing(null)
		track.current?.scrollTo({ left: next * step(), behavior: 'smooth' })
		onStart(next)
	}
	const settled = useRef(null)
	const onScroll = () => {
		clearTimeout(settled.current)
		settled.current = setTimeout(() => {
			const landed = step() ? clamp(Math.round(track.current.scrollLeft / step()), 0, MONTHS - count) : from
			if (landed !== from) onStart(landed)
		}, 120)
	}

	useEffect(() => { if (!arranging) setPanel(null) }, [arranging])
	const openPanel = next => { setEditing(null); setPanel(next) }
	// Where focus goes when a panel closes: back to what opened it, which may have moved.
	const focusLater = useFocusLater()
	const closePanel = back => { setPanel(null); if (back) focusLater(back) }
	const isOpen = (kind, key, month) => panel?.kind === kind && panel.key === key && panel.month === month

	const focusAmount = (lineId, month) => queueMicrotask(() => document.getElementById(`budget-slide-${lineId}-${month}`)?.focus())
	const moveFrom = (lineId, month, direction) => {
		const at = lineOrder.findIndex(l => l.id === lineId)
		if (direction === 'down' && at < lineOrder.length - 1) return focusAmount(lineOrder[at + 1].id, month)
		if (direction === 'up' && at > 0) return focusAmount(lineOrder[at - 1].id, month)
		focusAmount(lineId, month)
	}
	const saveReal = (line, month, value) => {
		if ((line.months[month].real ?? null) === value) return
		write(() => updateBudgetLine(line.id, { month: month + 1, real: value }), s => ({
			...s, groups: s.groups.map(g => ({ ...g, lines: g.lines.map(l => (l.id !== line.id ? l
				: { ...l, months: l.months.map((v, i) => (i === month ? { ...v, real: value } : v)) })) }))
		})).catch(() => {})
	}

	const amountCell = (line, month) => {
		const value = line.months[month]
		const isEditing = editing?.line === line.id && editing.month === month
		return (
			<span className="budget-slide-cell">
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
							const direction = { ArrowDown: 'down', ArrowUp: 'up' }[e.key]
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
			</span>
		)
	}

	const addLine = (id, text, next) => (
		<div className="budget-add">
			<button type="button" className="line-add-row" id={id} onClick={() => openPanel(next)}>
				<span className="line-add-glyph" aria-hidden="true"><Icon name="plus" /></span>
				<span className="line-add-text">{text}</span>
			</button>
		</div>
	)

	const lineRow = (group, line, i, month, addId) => {
		const open = isOpen('row', line.id, month)
		const id = `budget-slide-name-${line.id}-${month}`
		const account = sheet.accounts.find(a => a.id === line.accountId)?.name
		const tag = rowTag(line, months)
		return (
			<Fragment key={line.id}>
				<div className={join('budget-month-line', open && 'is-open')}>
					<span className="budget-slide-name">
						{arranging ? (
							<button type="button" className="budget-slide-line-name" id={id} aria-expanded={open} title={line.name}
								onClick={() => openPanel(open ? null : { kind: 'row', key: line.id, month })}>{line.name}</button>
						) : <span className="budget-slide-line-name" title={line.name}>{line.name}</span>}
						{account || tag ? (
							<span className="budget-slide-meta">
								{account ? <span className="budget-slide-account">{account}</span> : null}
								{tag ? <em className="budget-row-tag">{tag}</em> : null}
							</span>
						) : null}
					</span>
					{amountCell(line, month)}
				</div>
				{open ? (
					<RowPanel sheet={sheet} line={line} groupId={group.id} index={i} count={group.lines.length} write={write}
						heading={`Row ${i + 1} of ${group.lines.length} in ${group.name}`}
						onClose={gone => closePanel(gone ? addId : id)} />
				) : null}
			</Fragment>
		)
	}

	const groupBlock = (group, month) => {
		const open = isOpen('group', group.id, month)
		const id = `budget-slide-group-${group.id}-${month}`
		const addId = `budget-slide-add-row-${group.id}-${month}`
		const siblings = sheet.groups.filter(g => g.kind === group.kind)
		return (
			<div key={group.id} className="budget-month-group">
				<div className="budget-month-group-head">
					{arranging ? (
						<button type="button" className="budget-group-name" id={id} aria-expanded={open}
							onClick={() => openPanel(open ? null : { kind: 'group', key: group.id, month })}>
							{group.name}<Icon name="pencil" />
						</button>
					) : <span>{group.name}</span>}
					<span>{figure(group.lines.reduce((s, l) => s + (shown(l.months[month]) ?? 0), 0))}</span>
				</div>
				{open ? (
					<GroupPanel sheet={sheet} group={group} kind={group.kind} write={write}
						index={siblings.findIndex(g => g.id === group.id)} count={siblings.length}
						onClose={gone => closePanel(gone ? `budget-slide-add-group-${group.kind}-${month}` : id)} />
				) : null}
				{group.lines.map((line, i) => lineRow(group, line, i, month, addId))}
				{isOpen('new-row', group.id, month) ? (
					<RowPanel sheet={sheet} groupId={group.id} write={write} heading={`New row in ${group.name}`}
						onClose={() => closePanel(addId)} />
				) : arranging ? addLine(addId, `Add a row to ${group.name}`, { kind: 'new-row', key: group.id, month }) : null}
			</div>
		)
	}

	const panelOf = month => {
		const use = monthUse(sheet, totals, month)
		return (
			<section key={month} className={join('budget-month-panel', month === thisMonth && 'is-now')}
				aria-label={`${longMonths[month]} ${sheet.year}`}>
				<div className="budget-month-head">
					<span className="budget-month-title">{longMonths[month]}
						{month === thisMonth ? <em className="budget-now-tag">Now</em> : null}</span>
					<span className={join('budget-left-chip', signOf(totals.left[month]))}>Left {figure(totals.left[month])}</span>
				</div>
				<div className="budget-month-use">
					<UseMeter use={use} caption={<span className="field-help">{use.used}% of the income is used{planWords(use)}</span>} />
				</div>
				{KINDS.map(({ kind, title }) => {
					const addId = `budget-slide-add-group-${kind}-${month}`
					return (
						<div key={kind} className="budget-month-side">
							<div className="budget-month-side-head">
								<span>{title}</span>
								<b>{figure(kind === 'income' ? totals.income[month] : totals.costs[month])}</b>
							</div>
							{sheet.groups.filter(g => g.kind === kind).map(group => groupBlock(group, month))}
							{isOpen('new-group', kind, month) ? (
								<GroupPanel sheet={sheet} kind={kind} write={write} onClose={() => closePanel(addId)} />
							) : arranging ? addLine(addId, `Add a group to ${title.toLowerCase()}`, { kind: 'new-group', key: kind, month }) : null}
						</div>
					)
				})}
				<div className={join('budget-month-left', signOf(totals.left[month]))}>
					<span>Left over</span><b>{figure(totals.left[month])}</b>
				</div>
			</section>
		)
	}

	return (
		<div className="budget-months" ref={box}>
			<MonthHero sheet={sheet} month={from} longMonths={longMonths} thisMonth={thisMonth} totals={totals}
				onGo={go} count={count} />
			<Card aria-label={`Budget ${sheet.year}, month by month`} className="budget-card">
				<CardHeader title={`Months ${sheet.year}`}>
					<span className="budget-key"><span className="budget-key-expected">Grey</span> amounts are expected</span>
				</CardHeader>
				<CardDivider />
				<div className="budget-slide">
					<div className="budget-slide-top">
						<div className="budget-slide-nav">
							<IconButton icon="chevronLeft" label="Earlier month" disabled={from === 0} onClick={() => go(from - 1)} />
							<MonthStrip months={months} from={from} count={count} thisMonth={thisMonth} onPick={m => go(m)} />
							<IconButton icon="chevronRight" label="Later month" disabled={from >= MONTHS - count}
								onClick={() => go(from + 1)} />
						</div>
					</div>
					<div className="budget-carousel" ref={track} onScroll={onScroll}
						aria-label={`Amounts in ${activeCurrency().label}`}>
						{Array.from({ length: MONTHS }, (_, m) => panelOf(m))}
					</div>
				</div>
				{arranging ? <div className="budget-foot">{del.button}</div> : null}
				{del.dialog}
			</Card>
		</div>
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
								<span className="progress-bar" aria-hidden="true">
									<span className={join('progress-bar-fill', over && 'is-over')} style={{ width: `${share * 100}%` }} />
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

