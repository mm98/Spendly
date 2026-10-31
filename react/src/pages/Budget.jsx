import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Card, CardHeader, Toolbar } from '../components/Card.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { Combobox, ComboboxGroup, ComboboxOption } from '../components/Combobox.jsx'
import { Controls } from '../components/List.jsx'
import { Gauge, GaugeKey, Stat, Sum } from '../components/Data.jsx'
import { PeriodWindow } from '../components/DatePickers.jsx'
import { Halves, Well } from '../components/Well.jsx'
import { Pill } from '../components/Pill.jsx'
import { LineEditor } from '../components/LineEditor.jsx'
import { Field } from '../components/Field.jsx'
import { NumberField, TextField } from '../components/Inputs.jsx'
import { Choice, Switch } from '../components/Choice.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { ReorderList } from '../components/Reorder.jsx'
import { Icon } from '../components/Icon.jsx'
import { AddRow, Empty, EmptyBody, EmptyTitle, Redacted, Skeleton } from '../components/Utilities.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, useToast, Leaving } from '../components/Overlays.jsx'
import { parseNumber } from '../components/format.js'
import { join } from '../components/variants.js'
import { AnimatePresence, into, m } from '../components/motion.js'
import { useShellShape } from '../app/useMedia.js'
import { useApi } from '../api/useApi.js'
import { NUMBER_LOCALE as LOCALE, amount, capitalised, currency, currencySymbol, dot, monthNames, plural } from '../api/format.js'
import { ImportButton } from './BudgetImport.jsx'
import {
	addBudgetAccount, addBudgetGroup, addBudgetLine, createBudgetYear, deleteBudgetAccount, deleteBudgetGroup,
	deleteBudgetLine, deleteBudgetYear, failureMessage, getBudgetAccounts, getBudgetYear, getBudgetYears,
	updateBudgetAccount, updateBudgetGroup, updateBudgetLine
} from '../api/client.js'
import { useAfterDraw } from '../app/afterDraw.js'
import { phrase, usePhrase } from '../language/phrases.js'

const MONTHS = 12
const SIDES = [{ kind: 'income', title: 'budget.group.income' }, { kind: 'expense', title: 'budget.group.costs' }]

const shown = m => m.real ?? m.expected
const cents = n => Math.round(n * 100) / 100
const clamp = (n, low, high) => Math.min(Math.max(n, low), high)
const linesOf = (sheet, kind) => sheet.groups.filter(g => g.kind === kind).flatMap(g => g.lines)
const sumMonths = lines => Array.from({ length: MONTHS }, (_, m) => lines.reduce((s, l) => s + (shown(l.months[m]) ?? 0), 0))
const sum = values => values.reduce((a, b) => a + b, 0)
const money = n => currency(cents(n))
const figure = n => amount(cents(n))
const toneOf = n => (cents(n) > 0 ? 'success' : cents(n) < 0 ? 'danger' : 'default')
const inkOf = n => (cents(n) > 0 ? 'sp-ink-success' : cents(n) < 0 ? 'sp-ink-danger' : null)
const emptyMonths = () => Array.from({ length: MONTHS }, () => ({ expected: null, real: null }))
const nowMonthOf = year => (year === new Date().getFullYear() ? new Date().getMonth() : -1)

function totalsOf(sheet) {
	const income = sumMonths(linesOf(sheet, 'income'))
	const costs = sumMonths(linesOf(sheet, 'expense'))
	return { income, costs, left: income.map((v, m) => v - costs[m]) }
}

/* A row's tag: Varies when its months differ, Only Mar when it falls in three months or
   fewer, Not every month otherwise, and none when it is the same every month (21a). */
function rowTag(line, short) {
	const values = line.months.map(shown)
	const held = values.map((v, m) => (v != null ? m : -1)).filter(m => m >= 0)
	if (!held.length) return null
	if (held.length < MONTHS) return held.length <= 3 ? phrase('budget.tag.only', { months: held.map(m => short[m]).join(', ') }) : phrase('budget.tag.notEveryMonth')
	return new Set(values.map(v => Math.round(v * 100))).size > 1 ? phrase('budget.tag.varies') : null
}

// Whole percent; costs with no income count as the whole income used.
const percentOf = (part, whole) => (whole > 0 ? Math.round(part / whole * 100) : part > 0 ? 100 : 0)

function monthUse(sheet, totals, month) {
	const income = linesOf(sheet, 'income')
	const costs = linesOf(sheet, 'expense')
	const planned = lines => lines.reduce((s, l) => s + (l.months[month].expected ?? l.months[month].real ?? 0), 0)
	const any = lines => lines.some(l => l.months[month].expected != null)
	return {
		plannedIncome: planned(income), plannedCosts: planned(costs),
		incomePlanned: any(income), costsPlanned: any(costs), hasPlan: any(income) || any(costs),
		used: percentOf(totals.costs[month], totals.income[month]), planned: percentOf(planned(costs), planned(income))
	}
}

function versusExpected(counted, planned, hasPlan) {
	if (!hasPlan) return phrase('budget.versus.none')
	const diff = cents(counted - planned)
	if (!diff) return phrase('budget.versus.same')
	return phrase('budget.versus.diff', { amount: money(Math.abs(diff)), way: diff > 0 ? 'more' : 'less' })
}

/* The expected amount a row holds every month, if it is one figure: null when there is none,
   undefined when the months expect different amounts. */
function expectedOf(line) {
	const set = [...new Set(line.months.map(m => m.expected).filter(v => v != null))]
	if (!set.length) return null
	if (set.length > 1) return undefined
	return line.months.every(m => m.real != null || m.expected === set[0]) ? set[0] : undefined
}

/** What was typed in an amount: a number, null for nothing, or false when it is not an amount. */
function readAmount(text) {
	const clean = String(text ?? '').trim()
	if (!clean) return null
	if (!/^[\d.,\s]+$/.test(clean)) return false
	const n = parseNumber(clean, { locale: LOCALE })
	return n === null || n < 0 ? false : cents(n)
}

/* Writes go out one at a time and each answers with the whole year. A change is drawn at once; a failed
   one reads the year again, unless the writer tells of a record deleted elsewhere itself (ownsGone). */
function useWrites(setSheet, reload) {
	const toast = useToast()
	const queue = useRef(Promise.resolve())
	const newest = useRef(0)
	return useMemo(() => Object.assign((send, optimistic, ownsGone = false) => {
		if (optimistic) setSheet(optimistic)
		const ticket = ++newest.current
		const run = queue.current.then(() => send()).then(fresh => {
			if (ticket === newest.current && fresh?.groups) setSheet(fresh)
			return fresh
		}, error => {
			if (ownsGone && isGone(error)) throw error
			toastFailure(toast, error, phrase('budget.notSaved'))
			reload()
			throw error
		})
		queue.current = run.catch(() => {})
		return run
	}, { reload }), [setSheet, reload, toast])
}

// a failure the shell already tells of (the session ended) has no sentence, and takes no toast
const toastFailure = (toast, error, fallback) => {
	const message = failureMessage(error, fallback)
	if (message) toast({ message, color: 'danger' })
}

// the record a write named was deleted in another window
const isGone = error => !!error?.gone || error?.status === 404

const withReal = (sheet, lineId, month, real) => ({
	...sheet,
	groups: sheet.groups.map(g => ({
		...g, lines: g.lines.map(l => (l.id !== lineId ? l
			: { ...l, months: l.months.map((m, i) => (i === month ? { ...m, real } : m)) }))
	}))
})

const opener = (kind, key) => `[data-opener="${kind}:${key}"]`

/* Closing an editor whose record was deleted in another window reads the page again; focus goes
   first to the add row that stays (`goOn`), since what opened the editor is about to go. */
const leave = (goOn, reload, onClose) => {
	if (goOn) {
		document.querySelector(goOn.join(','))?.focus()
		reload()
	}
	onClose()
}

/* An editor that closes with focus inside it gives focus back to the first of back(what was
   open) still on the page: what opened it, or the add row of its set once that is deleted. */
function useGiveBack(open, back) {
	const was = useRef(null)
	useLayoutEffect(() => {
		if (open) { was.current = open; return }
		const last = was.current
		was.current = null
		if (!last || (document.activeElement && document.activeElement !== document.body)) return
		for (const selector of back(last)) {
			const el = document.querySelector(selector)
			if (el) { el.focus(); return }
		}
	}, [open])
}

function Confirm({ title, body, commit, onConfirm, onCancel, busy }) {
	return (
		<Dialog onCancel={onCancel}>
			<DialogTitle>{phrase(title)}</DialogTitle>
			<DialogBody>{body}</DialogBody>
			<DialogActions>
				<Button variant="outline" onClick={onCancel}>{phrase('action.keepIt')}</Button>
				<span className="sp-grow" />
				<Button color="danger" disabled={busy} onClick={onConfirm}>{commit}</Button>
			</DialogActions>
		</Dialog>
	)
}

export default function Budget() {
	usePhrase()
	const years = useApi(getBudgetYears)
	const [params] = useSearchParams()
	const touch = useShellShape() === 'touch'
	if (!years.data && years.error) return <Failed what={phrase('bank.yourBudget')} error={years.error} onRetry={years.refresh} />
	// a phone has no whole year (Mobile screens 7a)
	const view = !touch && params.get('view') === 'year' ? 'year' : 'months'
	if (!years.data) return <><BarLoading view={view} touch={touch} /><Loading view={view} touch={touch} /></>
	if (!years.data.years.length) return <FirstRun onChanged={years.refresh} />
	return <BudgetYears years={years.data.years} onYearsChanged={years.refresh} />
}

/* ---- while the budget loads: the page's own layout, with bars where its figures and names go ---- */

const bar = (w, h = '13', ink = '') => <span className={join(ink, 'bg-line')}><Skeleton shape="line" data-w={w} data-h={h} /></span>
const VIEWS = [{ value: 'months', label: 'budget.view.months' }, { value: 'year', label: 'budget.view.year' }]

function BarLoading({ view, touch }) {
	const views = <Segmented name="budget-view-loading" aria-label={phrase('budget.view')} value={view} options={VIEWS.map(v => ({ ...v, label: phrase(v.label), disabled: true }))} />
	return (
		touch
			? (
				<ListItem variant="card" aria-busy="true">
					{bar('52', '22')}<span className="sp-grow" /><span className="sp-flex-none"><Button variant="outline" disabled>{phrase('action.edit')}</Button></span>
				</ListItem>
			)
			: (
				<Controls aria-busy="true">
					{bar('130', '22')}{views}<span className="sp-grow" /><Button variant="outline" disabled>{phrase('bank.check')}</Button><Button variant="outline" disabled>{phrase('action.edit')}</Button>
				</Controls>
			)
	)
}

function Loading({ view, touch }) {
	return view === 'year' ? <SheetLoading /> : <><HeroLoading touch={touch} /><MonthsLoading touch={touch} /></>
}

function HeroLoading({ touch }) {
	return (
		<Card variant="shell" aria-busy="true" aria-label={phrase('budget.loading')}>
			<CardHeader name={<Skeleton shape="line" data-w="130" data-h="11" />} />
			<div className="sp-row-flex sp-gap-16 sp-wrap sp-top">
				{['budget.leftOver', 'budget.group.income', 'budget.group.costs', ...(touch ? [] : ['budget.realAmounts'])].map((label, i) => (
					<Stat key={label} label={phrase(label)} figure={bar('96', '22')} meta={i ? bar('130', '11') : undefined} />
				))}
			</div>
			<div className="sp-stack sp-gap-8">
				<Gauge value={0} aria-label={phrase('budget.useOfMonth')} />
				{bar('130', '11', 'sp-meta')}
			</div>
		</Card>
	)
}

// one group of income and two of costs: what a small budget holds
const LOADING_GROUPS = { income: [2], expense: [4, 3] }

function MonthsLoading({ touch }) {
	const card = useRef(null)
	const count = useMonthsThatFit(card, touch)
	const short = useMemo(() => monthNames('short', true), [])
	const stepper = count === 1 ? <PeriodWindow unit="month" label={bar('82', '13')} previousLabel={phrase('budget.earlierMonth')} nextLabel={phrase('budget.laterMonth')} /> : undefined
	const well = key => (
		<Well key={key}>
			<div className="sp-row-flex sp-gap-8">
				{bar('82', '13', 'sp-title')}
				<span className="sp-grow" />
				<Skeleton shape="pill" />
			</div>
			{touch ? null : <div className="sp-stack sp-gap-8"><Gauge thin value={0} aria-label={phrase('budget.useOfMonth')} />{bar('130', '11', 'sp-meta')}</div>}
			{SIDES.map(({ kind, title }) => (
				<div className="sp-stack sp-gap-8" key={kind}>
					<span className="sp-section-label sp-section-label--ruled">{phrase(title)}</span>
					{LOADING_GROUPS[kind].map((rows, g) => (
						<div className="sp-stack sp-gap-6" key={g}>
							{bar('96', '13', 'sp-subtitle')}
							<div className="sp-stack">
								{Array.from({ length: rows }, (_, r) => (
									<Sum key={r} value={bar('76', '13')}>
										<span className="sp-stacked">{bar('120', '13')}{bar('60', '11', 'sp-meta')}</span>
									</Sum>
								))}
							</div>
						</div>
					))}
					<Sum value={bar('76', '13')}><span className="sp-strong">{phrase(title)}</span></Sum>
				</div>
			))}
			<Sum variant="total" value={bar('96', '20')}>{phrase('budget.leftOver')}</Sum>
		</Well>
	)
	return (
		<Card ref={card} aria-busy="true">
			{touch ? stepper : <CardHeader name={<Skeleton shape="line" data-w="130" data-h="11" />} aside={phrase('budget.greyExpected')} asideTone="note" control={stepper} />}
			{count === 1 ? null : (
				<Segmented variant="facet" fixed name="budget-month-loading" aria-label={phrase('budget.month')} value={-1}
					options={short.map((label, m) => ({ value: m, label, disabled: true }))} />
			)}
			{count === 1 ? well(0) : <Halves>{well(0)}{well(1)}</Halves>}
		</Card>
	)
}

function SheetLoading() {
	const short = useMemo(() => monthNames('short', true), [])
	const figures = n => Array.from({ length: n }, (_, m) => <td key={m} className="sp-col-number">{bar('52', '11')}</td>)
	const label = (key, text) => <tr key={key}><td colSpan={MONTHS + 4}><span className="sp-section-label">{text}</span></td></tr>
	return (
		<Card variant="flush" aria-busy="true" aria-label={phrase('budget.loading')}>
			<Toolbar>
				{bar('130', '11', 'sp-section-label')}
				<span className="sp-grow" />
				<span className="sp-note">{phrase('budget.greyExpected')}{dot}{phrase('bank.amountsIn', { symbol: currencySymbol() })}</span>
			</Toolbar>
			<div className="bg-view">
				<div className="bg-scroll">
					<table className="sp-table sp-table--compact sp-table--static sp-table--borderless bg-sheet">
						<SheetColumns short={short} />
						<tbody>
							{SIDES.flatMap(({ kind, title }) => [
								label(kind, phrase(title)),
								...LOADING_GROUPS[kind].flatMap((rows, g) => [
									<tr key={`${kind}-${g}`}><td colSpan={MONTHS + 4}>{bar('96', '13')}</td></tr>,
									...Array.from({ length: rows }, (_, r) => (
										<tr key={`${kind}-${g}-${r}`}><td>{bar('120', '11')}</td><td>{bar('60', '11')}</td>{figures(MONTHS + 2)}</tr>
									))
								])
							])}
							{label('totals', phrase('budget.totals'))}
							{['budget.group.income', 'budget.group.costs', 'budget.leftOver'].map(name => (
								<tr key={name}><td><span className="sp-strong">{phrase(name)}</span></td><td />{figures(MONTHS + 2)}</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</Card>
	)
}

/** The sheet's columns and its header row of months, the month it is now in the accent ink. */
function SheetColumns({ short, thisMonth = -1 }) {
	return (
		<>
			{/* the widths sit on the columns, so the name column takes a width without the amount column's right alignment */}
			<colgroup>
				<col className="bg-col-name" />
				<col className="bg-col-account" />
				{Array.from({ length: MONTHS + 2 }, (_, m) => <col className="sp-col-date" key={m} />)}
			</colgroup>
			<thead>
				<tr>
					<th scope="col">{phrase('budget.head.row')}</th>
					<th scope="col">{phrase('budget.head.account')}</th>
					{short.map((name, m) => (
						<th scope="col" className="sp-col-number" key={m}>
							{m === thisMonth ? <span className="sp-ink-accent">{name} ({m + 1})</span> : `${name} (${m + 1})`}
						</th>
					))}
					<th scope="col" className="sp-col-number">{phrase('budget.year')}</th>
					<th scope="col" className="sp-col-number">{phrase('budget.head.perMonth')}</th>
				</tr>
			</thead>
		</>
	)
}

/** The first visit: bring in the spreadsheet, or start this year with empty rows (21f). */
function FirstRun({ onChanged }) {
	const navigate = useNavigate()
	const toast = useToast()
	const year = new Date().getFullYear()
	const [busy, setBusy] = useState(false)
	const start = async () => {
		setBusy(true)
		try {
			await createBudgetYear(year, null, 'none')
			onChanged()
			navigate(`/budget/${year}`)
		} catch (e) {
			toastFailure(toast, e, phrase('budget.notStarted', { year }))
			setBusy(false)
		}
	}
	return (
		<Card>
			<Empty>
				<Mark size="medium" fill="empty" aria-hidden="true" aria-label={phrase('page.budget')}><Icon name="wallet" size={20} /></Mark>
				<EmptyTitle>{phrase('budget.none.title')}</EmptyTitle>
				<EmptyBody>{phrase('budget.none.body', { year })}</EmptyBody>
				<div className="sp-row-flex sp-gap-8">
					<ImportButton onImported={([newest]) => { onChanged(); navigate(`/budget/${newest}`) }} />
					<Button variant="outline" size="small" disabled={busy} onClick={start}>{phrase('budget.start', { year })}</Button>
				</div>
			</Empty>
		</Card>
	)
}

const COPY = [
	{ value: 'same', label: 'budget.copy.same', note: 'budget.copy.sameNote' },
	{ value: 'expected', label: 'budget.copy.expected', note: 'budget.copy.expectedNote' },
	{ value: 'none', label: 'budget.copy.none', note: 'budget.copy.noneNote' }
]

/** New year starts the year after the newest one, as a copy of it (21e). */
function NewYear({ from, onClose, onStarted }) {
	const toast = useToast()
	const next = from + 1
	const [choice, setChoice] = useState('expected')
	const [busy, setBusy] = useState(false)
	const start = async () => {
		setBusy(true)
		try {
			await createBudgetYear(next, from, choice)
			toast({ message: phrase('budget.ready', { year: next }) })
			onStarted(next)
		} catch (e) {
			toastFailure(toast, e, phrase('budget.notStarted', { year: next }))
			setBusy(false)
		}
	}
	return (
		<Dialog onCancel={onClose}>
			<DialogTitle>{phrase('budget.newYear.title', { year: next })}</DialogTitle>
			<DialogBody>{phrase('budget.newYear.body', { year: next, from })}</DialogBody>
			<Segmented variant="facet" name="budget-copy" aria-label={phrase('budget.amounts')} options={COPY.map(c => ({ ...c, label: phrase(c.label) }))} value={choice} onChange={setChoice} />
			<span className="sp-note">{phrase(COPY.find(c => c.value === choice).note)}</span>
			<DialogActions>
				<Button variant="outline" onClick={onClose}>{phrase('action.cancel')}</Button>
				<span className="sp-grow" />
				<Button disabled={busy} onClick={start}>{phrase('budget.start', { year: next })}</Button>
			</DialogActions>
		</Dialog>
	)
}

function BudgetYears({ years, onYearsChanged }) {
	const { year: param } = useParams()
	const [params, setParams] = useSearchParams()
	const navigate = useNavigate()
	const touch = useShellShape() === 'touch'
	const [editing, setEditing] = useState(false)
	// income stays out of the page until asked for; editing asks for it, since amounts are typed there
	const [asked, setAsked] = useState(false)
	const covered = !asked && !editing
	const [starting, setStarting] = useState(false)
	const thisYear = new Date().getFullYear()
	const latest = years[years.length - 1]
	const year = param ? Number(param) : years.includes(thisYear) ? thisYear : latest
	const view = !touch && params.get('view') === 'year' ? 'year' : 'months'

	const goYear = y => navigate({ pathname: `/budget/${y}`, search: view === 'year' ? '?view=year' : '' })
	const setView = next => setParams(p => {
		const out = new URLSearchParams(p)
		if (next === 'year') out.set('view', 'year')
		else out.delete('view')
		return out
	}, { replace: true })

	const yearPicker = touch || years.length > 4
		? (
			<Combobox value={String(year)} aria-label={phrase('budget.year')} fullWidth={touch}>
				{years.map(y => (
					<ComboboxOption key={y} selected={y === year} onSelect={() => goYear(y)}>{y}</ComboboxOption>
				))}
			</Combobox>
		)
		: (
			<Segmented name="budget-year" aria-label={phrase('budget.year')} value={year} onChange={goYear}
				options={years.map(y => ({ value: y, label: String(y) }))} />
		)
	const viewPicker = editing || touch ? null : (
		<Segmented name="budget-view" aria-label={phrase('budget.view')} value={view} onChange={setView} options={VIEWS.map(v => ({ ...v, label: phrase(v.label) }))} />
	)

	const actions = editing
		? (
			<>
				<Button variant="outline" onClick={() => setStarting(true)}>{phrase('budget.newYear')}</Button>
				<Button onClick={() => setEditing(false)}>{phrase('action.done')}</Button>
			</>
		)
		: (
			<>
				{/* a bank statement is not checked on a phone (21g) */}
				<Button variant="outline" iconStart="eye" aria-pressed={asked} onClick={() => setAsked(!asked)}>{phrase('budget.income', { shown: String(asked) })}</Button>
				{touch ? null : <Button variant="outline" to="/budget/check">{phrase('bank.check')}</Button>}
				<Button variant="outline" onClick={() => setEditing(true)}>{phrase('action.edit')}</Button>
			</>
		)

	return (
		<>
			{touch
				? (
					// on a phone the year and the actions share one bar (Mobile screens 7a)
					<ListItem variant="card">
						{yearPicker}
						{actions}
					</ListItem>
				)
				: (
					<Controls>
						{yearPicker}
						{viewPicker}
						<span className="sp-grow" />
						{actions}
					</Controls>
				)}
			{years.includes(year)
				? <YearView key={year} year={year} view={view} editing={editing} covered={covered} touch={touch} onYearsChanged={onYearsChanged} />
				: (
					<Card>
						<Empty>
							<EmptyTitle>{phrase('budget.missing.title', { year: param })}</EmptyTitle>
							<EmptyBody>{phrase('budget.missing.body')}</EmptyBody>
							<Button variant="outline" size="small" to={`/budget/${latest}`}>{phrase('budget.open', { year: latest })}</Button>
						</Empty>
					</Card>
				)}
			<Leaving>{starting ? (
				<NewYear from={latest} onClose={() => setStarting(false)}
					onStarted={next => { setStarting(false); onYearsChanged(); goYear(next) }} />
			) : null}</Leaving>
		</>
	)
}

function YearView({ year, view, editing, covered, touch, onYearsChanged }) {
	const [busy, setBusy] = useState(false)
	// a year being deleted is not read again, so its view does not ask for what is gone
	const loaded = useApi(getBudgetYear, [year], { enabled: !busy })
	const [sheet, setSheet] = useState(null)
	useEffect(() => { if (loaded.data?.year === year) setSheet(loaded.data) }, [loaded.data, year])
	const write = useWrites(setSheet, loaded.refresh)
	const navigate = useNavigate()
	const toast = useToast()
	const [deleting, setDeleting] = useState(false)
	// one editor open at a time, in the one month it was opened from
	const [panel, setPanel] = useState(null)
	useEffect(() => { if (!editing) setPanel(null) }, [editing])
	useGiveBack(panel, was => was.back)

	if (!sheet) return loaded.error ? <Failed what={phrase('bank.yourBudget')} error={loaded.error} onRetry={loaded.refresh} /> : <Loading view={view} touch={touch} />
	const rows = sheet.groups.reduce((n, g) => n + g.lines.length, 0)
	const removeYear = async () => {
		setBusy(true)
		try {
			await deleteBudgetYear(year)
			toast({ message: phrase('budget.deleted', { year }) })
			onYearsChanged()
			navigate('/budget')
		} catch (e) {
			toastFailure(toast, e, phrase('budget.notDeleted', { year }))
			setBusy(false)
			setDeleting(false)
		}
	}
	const shared = { sheet, write, editing, covered, touch, panel, setPanel }
	return (
		<>
			{view === 'year'
				? <SheetView {...shared} />
				: <MonthsView {...shared} onDelete={() => setDeleting(true)} />}
			{editing ? <AccountsCard sheet={sheet} onChanged={loaded.refresh} /> : null}
			<Leaving>{deleting ? (
				<Confirm title={phrase('library.deleteTitle', { name: year })} commit={phrase('budget.deleteYear', { year })} busy={busy}
					body={phrase('budget.deleteYearBody', { year, rows: plural(rows, 'row') })}
					onConfirm={removeYear} onCancel={() => setDeleting(false)} />
			) : null}</Leaving>
		</>
	)
}

/* ---- the months ---- */

function useMonthsThatFit(ref, touch) {
	const [count, setCount] = useState(touch ? 1 : 2)
	useLayoutEffect(() => {
		const el = ref.current
		if (!el || touch) { setCount(1); return }
		const fit = () => setCount(el.clientWidth < 600 ? 1 : 2)
		fit()
		const watch = new ResizeObserver(fit)
		watch.observe(el)
		return () => watch.disconnect()
	}, [ref, touch])
	return count
}

function MonthsView({ sheet, write, editing, covered, touch, panel, setPanel, onDelete }) {
	const short = useMemo(() => monthNames('short', true), [])
	const long = useMemo(() => monthNames('long'), [])
	const head = useMemo(() => monthNames('long', true), [])
	const card = useRef(null)
	const count = useMonthsThatFit(card, touch)
	const thisMonth = nowMonthOf(sheet.year)
	// the month chosen is the one in front; the window starts there, or one earlier at December
	const [month, setMonth] = useState(Math.max(thisMonth, 0))
	const from = clamp(month, 0, MONTHS - count)
	const totals = totalsOf(sheet)
	const go = to => setMonth(clamp(to, 0, MONTHS - 1))
	const reveal = m => { if (m < from || m >= from + count) go(m) }
	const amounts = useAmounts(sheet, write, long, reveal)
	const strip = useMonthStrip(from, count)
	// the arrow keys page one month a press while no month is being edited (21a)
	useEffect(() => {
		if (touch || editing || panel || amounts.edit) return
		const keys = ev => {
			if ((ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') || ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return
			// a field, a list or an open menu keeps its own arrows; a month's segment moves the month itself
			if (ev.target.closest?.('input, textarea, select, [contenteditable], [role="menu"], [role="listbox"], [role="dialog"], [role="slider"]')) return
			ev.preventDefault()
			go(month + (ev.key === 'ArrowRight' ? 1 : -1))
		}
		document.addEventListener('keydown', keys)
		return () => document.removeEventListener('keydown', keys)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [touch, editing, panel, amounts.edit, month])
	// with the month bar there is no stepper; one month alone, with no bar, keeps its window
	const stepper = count === 1
		? (
			<PeriodWindow unit="month" label={head[from]}
				previousLabel={phrase('budget.earlierMonth')} nextLabel={phrase('budget.laterMonth')}
				onPrevious={month === 0 ? undefined : () => go(month - 1)} onNext={month === MONTHS - 1 ? undefined : () => go(month + 1)} />
		)
		: undefined
	const well = at => (
		// one row, a column each: a well that leaves keeps its last column and slides out over its neighbour
		<m.div key={at} custom={strip.way} variants={STRIP} initial="arrive" animate="shown" exit="leave" layout="position"
			transition={into(2)} style={{ gridRow: 1, gridColumn: at - from + 1 }}>
			{/* the shape is edited in the month in front only, so no control is drawn twice (21c) */}
			<MonthWell month={at} editing={editing && at === month} {...{ sheet, write, touch, covered, panel, setPanel, totals, short, long, thisMonth, amounts }} />
		</m.div>
	)
	const wells = (
		<AnimatePresence initial={false} custom={strip.way} onExitComplete={strip.settled}>
			{(count === 1 ? [from] : [from, from + 1]).map(well)}
		</AnimatePresence>
	)
	return (
		<>
			{editing ? null : <MonthHero sheet={sheet} month={month} totals={totals} long={long} touch={touch} covered={covered} />}
			<Card ref={card} footer={editing ? <Button key="delete" color="danger" onClick={onDelete}>{phrase('budget.deleteYear', { year: sheet.year })}</Button> : null} footerCommits>
				{/* on touch the window fills its row, with no label beside it (Mobile screens 7a) */}
				{touch
					? stepper
					: <CardHeader name={phrase('budget.monthsOf', { year: sheet.year })} aside={phrase('budget.greyExpected')} asideTone="note" control={stepper} />}
				{/* twelve segments fit beside two months only; with one month the window steps through them */}
				{count === 1 ? null : (
					<Segmented variant="facet" fixed name="budget-month" aria-label={phrase('budget.month')} value={month} onChange={go}
						options={short.map((label, m) => ({ value: m, label }))} />
				)}
				{/* the wells glide relative to the strip, so a card above that changes height does not move them up or down */}
				<m.div className="bg-strip" ref={strip.ref} layout="position" layoutRoot data-moving={strip.moving ? 'true' : undefined}>
					{count === 1 ? wells : <Halves>{wells}</Halves>}
				</m.div>
			</Card>
		</>
	)
}

/* The month wells are one strip of paper under the card's edges (21a): a well that stays glides to its
   new place, one that leaves slides out the side it leaves by, and a new one slides in from the other. */
const STRIP = {
	arrive: way => ({ x: way }),
	shown: { x: 0 },
	leave: way => ({ x: -way })
}

/** How far the strip moves for a change of window, in pixels and with its sign: one well and its gap a
    month, the whole pair for a jump. `moving` holds while it moves, so the card clips it only then. */
function useMonthStrip(from, count) {
	const ref = useRef(null)
	const [seen, setSeen] = useState(from)
	const [way, setWay] = useState(0)
	const [moving, setMoving] = useState(false)
	if (seen !== from) {
		const box = ref.current
		const gap = box?.firstElementChild ? parseFloat(getComputedStyle(box.firstElementChild).columnGap) || 0 : 0
		const well = box ? (box.clientWidth - gap * (count - 1)) / count + gap : 0
		const steps = Math.abs(from - seen) === 1 ? 1 : count
		setSeen(from)
		setWay(Math.sign(from - seen) * steps * well)
		setMoving(true)
	}
	return { ref, way, moving, settled: () => setMoving(false) }
}

/** The month in front, on the dark card: what is left, and how much of the income is used. */
function MonthHero({ sheet, month, totals, long, touch, covered }) {
	const use = monthUse(sheet, totals, month)
	const lines = [...linesOf(sheet, 'income'), ...linesOf(sheet, 'expense')]
	const withAmount = lines.filter(l => shown(l.months[month]) != null)
	const real = withAmount.filter(l => l.months[month].real != null).length
	const waiting = withAmount.length - real
	return (
		<Card variant="shell">
			<CardHeader name={`${capitalised(long[month])} ${sheet.year}`} />
			<div className="sp-row-flex sp-gap-16 sp-wrap sp-top">
				<Stat label={phrase('budget.leftOver')} figure={covered ? <Redacted /> : currency(cents(totals.left[month]), 0)} />
				<Stat label={phrase('budget.group.income')} figure={covered ? <Redacted /> : currency(cents(totals.income[month]), 0)}
					meta={incomeMeta(totals.income[month], use, covered)} />
				<Stat label={phrase('budget.group.costs')} figure={currency(cents(totals.costs[month]), 0)}
					meta={versusExpected(totals.costs[month], use.plannedCosts, use.costsPlanned)} />
				{touch ? null : (
					<Stat label={phrase('budget.realAmounts')} figure={phrase('budget.realOf', { real, all: withAmount.length })}
						meta={!withAmount.length ? phrase('budget.real.none') : waiting ? phrase('budget.real.waiting', { rows: plural(waiting, 'row') }) : phrase('budget.real.all')} />
				)}
			</div>
			<Use use={use} month={long[month]} covered={covered} />
		</Card>
	)
}

/* The line under Income says how far it is from what was expected; with income hidden only the words that carry no figure stay. */
function incomeMeta(counted, use, covered) {
	const said = versusExpected(counted, use.plannedIncome, use.incomePlanned)
	return covered && /\d/.test(said) ? undefined : said
}

function Use({ use, month, thin = false, covered = false }) {
	if (covered) return (
		<div className="sp-stack sp-gap-8">
			<Gauge thin={thin} untargeted value={0} aria-label={phrase('budget.useOf', { month })} />
			<span className="sp-meta">{phrase('budget.useCovered')}</span>
		</div>
	)
	return (
		<div className="sp-stack sp-gap-8">
			<Gauge thin={thin} value={Math.min(use.used, 100)} marker={use.hasPlan ? Math.min(use.planned, 100) : undefined}
				aria-label={phrase('budget.useOf', { month })} />
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-meta">{phrase('budget.used', { used: use.used })}</span>
				<span className="sp-grow" />
				{use.hasPlan ? <span className="sp-meta sp-row-flex sp-gap-6"><GaugeKey aria-hidden="true" />{phrase('budget.planned', { planned: use.planned })}</span> : null}
			</div>
		</div>
	)
}

/* Typing a real amount in the months view, in a NumberField in place. Enter saves and moves down,
   Tab saves and moves to the next month, Escape cancels, a digit on a focused row starts the edit. */
function useAmounts(sheet, write, long, reveal) {
	const toast = useToast()
	const afterDraw = useAfterDraw()
	const [edit, setEdit] = useState(null)
	const done = useRef(false)
	// a save that fails puts what was typed back in its field, open but not taking focus (6d)
	const save = (line, month, value) => {
		if ((line.months[month].real ?? null) === value) return
		write(() => updateBudgetLine(line.id, { month: month + 1, real: value }), s => withReal(s, line.id, month, value))
			.catch(error => {
				if (isGone(error)) return
				setEdit(open => {
					if (open) return open
					done.current = false
					return { line: line.id, month, draft: value }
				})
			})
	}
	const focusRow = (el, step) => {
		const rows = [...(el?.closest('.sp-well')?.querySelectorAll('[data-row]') ?? [])]
		const at = rows.findIndex(r => r.dataset.row === el.dataset.row)
		rows[clamp(at + step, 0, rows.length - 1)]?.focus()
	}
	const start = (line, month) => {
		done.current = false
		flushSync(() => setEdit({ line: line.id, month }))
	}
	const finish = (line, month, text) => {
		if (done.current) return
		done.current = true
		setEdit(null)
		const value = readAmount(text)
		if (value === false) toast({ message: phrase('budget.amountUnreadable'), color: 'danger' })
		else save(line, month, value)
	}
	const rowKeys = (line, month) => ev => {
		if (ev.target !== ev.currentTarget) return
		if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); focusRow(ev.currentTarget, ev.key === 'ArrowDown' ? 1 : -1); return }
		if (ev.key === 'F2') { ev.preventDefault(); start(line, month); return }
		if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); save(line, month, null); return }
		// left unprevented, so the digit lands in the field this key has just opened
		if (/^[0-9,]$/.test(ev.key) && !ev.ctrlKey && !ev.metaKey && !ev.altKey) start(line, month)
	}
	const field = (line, month) => {
		const m = line.months[month]
		const id = `${line.id}-${month}`
		const unsaved = edit && 'draft' in edit
		return (
			<NumberField cell locale={LOCALE} autoFocus={!unsaved} value={unsaved ? edit.draft : m.real} aria-invalid={unsaved ? 'true' : undefined}
				placeholder={m.expected != null ? amount(m.expected) : undefined}
				aria-label={phrase('budget.realAmount', { name: line.name, month: long[month] })}
				onKeyDown={ev => {
					if (ev.key === 'Escape') {
						ev.preventDefault(); ev.stopPropagation()
						done.current = true
						setEdit(null)
						afterDraw(() => document.querySelector(`[data-row="${id}"]`)?.focus())
					} else if (ev.key === 'Enter') {
						ev.preventDefault()
						const row = ev.target.closest('[data-row]').dataset.row
						finish(line, month, ev.target.value)
						afterDraw(() => focusRow(document.querySelector(`[data-row="${row}"]`), 1))
					} else if (ev.key === 'Tab') {
						// past December or before January, Tab leaves the months the usual way
						const to = month + (ev.shiftKey ? -1 : 1)
						if (to < 0 || to >= MONTHS) return
						ev.preventDefault()
						finish(line, month, ev.target.value)
						reveal(to)
						afterDraw(() => document.querySelector(`[data-row="${line.id}-${to}"]`)?.focus())
					}
				}}
				onBlur={ev => finish(line, month, ev.target.value)} />
		)
	}
	return { edit, start, rowKeys, field }
}

function MonthWell({ sheet, write, editing, covered, touch, panel, setPanel, totals, short, long, thisMonth, amounts, month }) {
	const accountName = id => sheet.accounts.find(a => a.id === id)?.name
	const isOpen = (kind, key) => panel?.kind === kind && panel.key === key && panel.month === month
	const open = (kind, key, back) => setPanel({ kind, key, month, back })
	const close = () => setPanel(null)
	const left = totals.left[month]

	const row = (group, line, i) => {
		if (isOpen('row', line.id))
			return <RowEditor key={line.id} sheet={sheet} line={line} group={group} index={i} write={write} onClose={close} />
		const m = line.months[month]
		const hidden = covered && group.kind === 'income'
		const value = shown(m)
		const typing = amounts.edit?.line === line.id && amounts.edit.month === month
		const meta = [accountName(line.accountId), rowTag(line, short)].filter(Boolean).join(dot)
		const said = m.real != null ? phrase('budget.said.real', { amount: money(m.real) }) : m.expected != null ? phrase('budget.said.expected', { amount: money(m.expected) }) : phrase('budget.said.empty')
		const edit = () => open('row', line.id, [`[data-row="${line.id}-${month}"]`, opener('new-row', group.id)])
		const control = typing || hidden ? {} : {
			role: 'button',
			tabIndex: 0,
			'aria-label': editing ? phrase('budget.editRow', { name: line.name }) : phrase('budget.realAmountSaid', { name: line.name, month: long[month], said }),
			onClick: ev => (editing && !ev.target.closest('.sp-sum__value') ? edit() : amounts.start(line, month)),
			onKeyDown: ev => {
				if (editing && ev.key === 'Enter' && ev.target === ev.currentTarget) { ev.preventDefault(); edit(); return }
				if (!editing && ev.key === 'Enter' && ev.target === ev.currentTarget) { ev.preventDefault(); amounts.start(line, month); return }
				amounts.rowKeys(line, month)(ev)
			}
		}
		return (
			<Sum key={line.id} edits={!hidden} data-row={`${line.id}-${month}`} tone={!typing && !hidden && m.real == null && m.expected != null ? 'expected' : 'default'}
				value={typing ? amounts.field(line, month) : hidden ? <Redacted /> : value != null ? money(value) : null} meta={meta} {...control}>
				{line.name}
			</Sum>
		)
	}

	const group = (g, gi, siblings) => (
		<div className="sp-stack sp-gap-6" key={g.id}>
			{isOpen('group', g.id)
				? <GroupEditor sheet={sheet} group={g} index={gi} count={siblings.length} write={write} onClose={close} />
				: (
					<div className="sp-row-flex sp-gap-8">
						<span className="sp-subtitle sp-strong sp-ink">{g.name}</span>
						{editing ? <IconButton variant="outline" icon={<Icon name="pencil" size={14} />} aria-label={phrase('budget.editGroup', { name: g.name })} data-opener={`group:${g.id}`}
							onClick={() => open('group', g.id, [opener('group', g.id), opener('new-group', g.kind)])} /> : null}
					</div>
				)}
			{g.lines.length ? <div className="sp-stack">{g.lines.map((line, i) => row(g, line, i))}</div> : null}
			{!editing ? null : isOpen('new-row', g.id)
				? <RowEditor sheet={sheet} group={g} write={write} onClose={close} />
				: <AddRow data-opener={`new-row:${g.id}`} onClick={() => open('new-row', g.id, [opener('new-row', g.id)])}>{phrase('budget.addRow', { name: g.name })}</AddRow>}
		</div>
	)

	return (
		<Well>
			<div className="sp-row-flex sp-gap-8">
				<span className="sp-title">{capitalised(long[month])}</span>
				{month === thisMonth ? <Pill>{phrase('budget.now')}</Pill> : null}
				<span className="sp-grow" />
				<Pill color={covered ? undefined : toneOf(left)}>{phrase('budget.left', { amount: covered ? <Redacted /> : money(left) })}</Pill>
			</div>
			{touch ? null : <Use thin use={monthUse(sheet, totals, month)} month={long[month]} covered={covered} />}
			{SIDES.map(({ kind, title }) => {
				const groups = sheet.groups.filter(g => g.kind === kind)
				return (
					<div className="sp-stack sp-gap-8" key={kind}>
						<span className="sp-section-label sp-section-label--ruled">{phrase(title)}</span>
						{groups.map((g, gi) => group(g, gi, groups))}
						{!editing ? null : isOpen('new-group', kind)
							? <GroupEditor sheet={sheet} kind={kind} write={write} onClose={close} />
							: <AddRow data-opener={`new-group:${kind}`} onClick={() => open('new-group', kind, [opener('new-group', kind)])}>{phrase('budget.addGroup', { kind })}</AddRow>}
						<Sum value={kind === 'income' ? (covered ? <Redacted /> : money(totals.income[month])) : money(totals.costs[month])}>
							<span className="sp-strong">{phrase(title)}</span>
						</Sum>
					</div>
				)
			})}
			<Sum variant="total" tone={covered ? 'default' : toneOf(left)} value={covered ? <Redacted /> : money(left)}>{phrase('budget.leftOver')}</Sum>
		</Well>
	)
}

/* Moving puts the editor back in its new place, which takes focus off its buttons: give it to
   the one pressed again, or to the other where the pressed one is now disabled at an end. */
function useMoveFocus(box, what, index, count) {
	const pressed = useRef(null)
	useEffect(() => {
		if (pressed.current == null) return
		const way = index <= 0 ? 'down' : index >= count - 1 ? 'up' : pressed.current < 0 ? 'up' : 'down'
		pressed.current = null
		box.current?.querySelector(`[aria-label="${phrase(way === 'up' ? 'lineEditor.moveUp' : 'lineEditor.moveDown', { what })}"]`)?.focus()
	}, [box, what, index, count])
	return step => { pressed.current = step }
}

function RowEditor({ sheet, line, group, index, write, onClose }) {
	const [name, setName] = useState(line?.name ?? '')
	const uniform = line ? expectedOf(line) : null
	const [expected, setExpected] = useState(uniform ?? null)
	const [changed, setChanged] = useState(false)
	const [accountId, setAccountId] = useState(line?.accountId ?? null)
	const [groupId, setGroupId] = useState(group.id)
	const [error, setError] = useState('')
	// set when the row, or the group a new row goes in, was deleted in another window: what was typed stays
	const [lost, setLost] = useState('')
	const [saving, setSaving] = useState(false)
	const [asking, setAsking] = useState(false)
	const box = useRef(null)
	// a second Enter while the first save is on its way writes nothing more
	const pending = useRef(false)
	const count = group.lines.length
	const target = sheet.groups.find(g => g.id === groupId)

	const save = async () => {
		if (pending.current) return
		if (!name.trim()) { setError(phrase('budget.nameMissing', { what: 'row' })); box.current?.querySelector('input')?.focus(); return }
		const body = { name: name.trim(), accountId }
		// the months are written only when the expected amount was changed, so twelve different ones survive a rename
		if (changed || !line) body.months = (line?.months ?? emptyMonths()).map(m => ({ expected, real: m.real }))
		if (line && groupId !== group.id) body.groupId = groupId
		pending.current = true
		setSaving(true)
		try {
			await write(() => (line ? updateBudgetLine(line.id, body) : addBudgetLine(groupId, body)), undefined, true)
			onClose()
		} catch (e) {
			pending.current = false
			setSaving(false)
			if (isGone(e)) setLost(line ? phrase('budget.lost', { what: 'row' })
				: phrase('budget.lostGroup', { name: target?.name ?? group.name }))
		}
	}
	const cancel = () => leave(lost && (line ? [opener('new-row', group.id)] : [opener('new-group', group.kind)]), write.reload, onClose)
	const moved = useMoveFocus(box, 'row', index, count)
	const move = step => { moved(step); write(() => updateBudgetLine(line.id, { index: index + step })).catch(() => {}) }
	const remove = () => write(() => deleteBudgetLine(line.id)).then(onClose, () => setAsking(false))

	return (
		<>
			<LineEditor ref={box} title={line ? phrase('budget.row.title', { at: index + 1, count, name: group.name }) : phrase('budget.row.new', { name: group.name })} what="row"
				commit={phrase(line ? 'budget.row.save' : 'budget.row.add')} saving={saving} onCommit={save} onCancel={cancel}
				{...(line ? { onMoveUp: () => move(-1), onMoveDown: () => move(1), onDelete: () => setAsking(true), first: index === 0, last: index === count - 1 } : {})}>
				<Field label={phrase('field.name')} message={error || lost || undefined} messageType={error || lost ? 'danger' : 'hint'}>
					<TextField autoFocus value={name} onChange={v => { setName(v); setError('') }} />
				</Field>
				<Field label={phrase('budget.expectedEachMonth')} unit={currencySymbol()}
					message={uniform === undefined && !changed ? phrase('budget.expectedVaries') : undefined}>
					<NumberField locale={LOCALE} value={expected} onChange={v => { setExpected(v === null ? null : cents(v)); setChanged(true) }} />
				</Field>
				<Field label={phrase('budget.head.account')}>
					<Combobox value={sheet.accounts.find(a => a.id === accountId)?.name ?? phrase('budget.noAccount')}>
						<ComboboxOption selected={!accountId} onSelect={() => setAccountId(null)}>{phrase('budget.noAccount')}</ComboboxOption>
						{sheet.accounts.map(a => (
							<ComboboxOption key={a.id} selected={a.id === accountId} onSelect={() => setAccountId(a.id)}>{a.name}</ComboboxOption>
						))}
					</Combobox>
				</Field>
				<Field label={phrase('budget.group')}>
					<Combobox value={target?.name ?? ''}>
						{SIDES.flatMap(({ kind, title }) => [
							<ComboboxGroup key={kind}>{phrase(title)}</ComboboxGroup>,
							...sheet.groups.filter(g => g.kind === kind).map(g => (
								<ComboboxOption key={g.id} selected={g.id === groupId} onSelect={() => setGroupId(g.id)}>{g.name}</ComboboxOption>
							))
						])}
					</Combobox>
				</Field>
			</LineEditor>
			<Leaving>{asking ? (
				<Confirm title={phrase('library.deleteTitle', { name: line.name })} commit={phrase('lineEditor.delete', { what: 'row' })} body={phrase('budget.deleteRowBody', { name: line.name })}
					onConfirm={remove} onCancel={() => setAsking(false)} />
			) : null}</Leaving>
		</>
	)
}

function GroupEditor({ sheet, group, kind = group?.kind, index = 0, count = 0, write, onClose }) {
	const [name, setName] = useState(group?.name ?? '')
	const [error, setError] = useState('')
	const [lost, setLost] = useState('')
	const [saving, setSaving] = useState(false)
	const [asking, setAsking] = useState(false)
	const box = useRef(null)
	const pending = useRef(false)
	const save = async () => {
		if (pending.current) return
		if (!name.trim()) { setError(phrase('budget.nameMissing', { what: 'group' })); return }
		pending.current = true
		setSaving(true)
		try {
			await write(() => (group ? updateBudgetGroup(group.id, { name: name.trim() }) : addBudgetGroup(sheet.year, { kind, name: name.trim() })), undefined, true)
			onClose()
		} catch (e) {
			pending.current = false
			setSaving(false)
			if (isGone(e)) setLost(group ? phrase('budget.lost', { what: 'group' })
				: phrase('budget.lostYear', { year: sheet.year }))
		}
	}
	const cancel = () => leave(lost && [opener('new-group', kind)], write.reload, onClose)
	const moved = useMoveFocus(box, 'group', index, count)
	const move = step => { moved(step); write(() => updateBudgetGroup(group.id, { index: index + step })).catch(() => {}) }
	const rows = group?.lines.length ?? 0
	return (
		<>
			<LineEditor ref={box} title={group ? phrase('budget.groupEditor.title', { at: index + 1, count, kind }) : phrase('budget.groupEditor.new', { kind })} what="group"
				commit={phrase(group ? 'budget.groupEditor.save' : 'budget.groupEditor.add')} saving={saving} onCommit={save} onCancel={cancel}
				{...(group ? { onMoveUp: () => move(-1), onMoveDown: () => move(1), onDelete: () => setAsking(true), first: index === 0, last: index === count - 1 } : {})}>
				<Field label={phrase('field.name')} message={error || lost || undefined} messageType={error || lost ? 'danger' : 'hint'}>
					<TextField autoFocus value={name} onChange={v => { setName(v); setError('') }} />
				</Field>
			</LineEditor>
			<Leaving>{asking ? (
				<Confirm title={phrase('library.deleteTitle', { name: group.name })} commit={phrase('lineEditor.delete', { what: 'group' })}
					body={rows ? phrase('budget.deleteGroupBody', { name: group.name, rows: plural(rows, 'row') }) : phrase('budget.deleteEmptyGroupBody', { name: group.name })}
					onConfirm={() => write(() => deleteBudgetGroup(group.id)).then(onClose, () => setAsking(false))}
					onCancel={() => setAsking(false)} />
			) : null}</Leaving>
		</>
	)
}

const accountKey = name => name.trim().toLocaleLowerCase('da')
const ACCOUNTS_NOTE = 'budget.accountsNote'

function AccountsLoading() {
	return (
		<Card aria-busy="true" aria-label={phrase('budget.accountsLoading')}>
			<CardHeader name={phrase('budget.accounts')} />
			<span className="sp-subtitle">{phrase(ACCOUNTS_NOTE)}</span>
			<div className="sp-stack sp-gap-8">
				{['96', '120', '82'].map(w => (
					<ListItem key={w}><span className="sp-stacked sp-grow">{bar(w, '13', 'sp-title')}{bar('130', '11', 'sp-subtitle')}</span></ListItem>
				))}
			</div>
		</Card>
	)
}

/** The accounts every year's rows pick from, shown only while editing (21c, 21d). */
function AccountsCard({ sheet, onChanged }) {
	const loaded = useApi(getBudgetAccounts)
	const [list, setList] = useState(null)
	useEffect(() => { if (loaded.data) setList(loaded.data) }, [loaded.data])
	const toast = useToast()
	const [open, setOpen] = useState(null)
	useGiveBack(open, id => [opener('account', id), opener('account', 'new')])
	const write = Object.assign(async (send, optimistic, ownsGone = false) => {
		if (optimistic) setList(optimistic)
		try {
			const fresh = await send()
			setList(fresh)
			onChanged()
			return fresh
		} catch (e) {
			if (ownsGone && isGone(e)) throw e
			toastFailure(toast, e, phrase('budget.notSaved'))
			loaded.refresh()
			throw e
		}
	}, { reload: loaded.refresh })
	const moveTo = (account, to) => {
		const from = list.findIndex(a => a.id === account.id)
		if (to === from || to < 0 || to >= list.length) return
		const next = [...list]
		next.splice(to, 0, next.splice(from, 1)[0])
		write(() => updateBudgetAccount(account.id, { index: to }), next).catch(() => {})
	}
	if (!list) return <AccountsLoading />
	const year = sheet.year
	const lines = sheet.groups.flatMap(g => g.lines.map(l => ({ ...l, kind: g.kind })))
	const through = id => {
		const mine = lines.filter(l => l.accountId === id)
		if (!mine.length) return [phrase('budget.through.none', { year })]
		return SIDES.map(({ kind }) => {
			const own = mine.filter(l => l.kind === kind)
			return own.length ? phrase('budget.through.month', { amount: money(sum(sumMonths(own)) / MONTHS), kind, year }) : null
		}).filter(Boolean)
	}

	return (
		<Card>
			<CardHeader name={phrase('budget.accounts')} />
			<span className="sp-subtitle">{phrase(ACCOUNTS_NOTE)}</span>
			<div className="sp-stack sp-gap-8">
				<ReorderList items={list} keyOf={account => account.id} nameOf={account => account.name}
					onMove={(next, account, to) => write(() => updateBudgetAccount(account.id, { index: to }), next).catch(() => {})}>
					{account => (open === account.id
						? <AccountEditor account={account} index={list.indexOf(account)} list={list} write={write} onMove={to => moveTo(account, to)} onClose={() => setOpen(null)} />
						: (
							<ListItem handle={<Icon name="grip-vertical" size={14} />} handleLabel={phrase('budget.moveAccount', { name: account.name })}>
								<span className="sp-stacked sp-grow bg-opens-account" role="button" tabIndex={0} aria-label={phrase('budget.editAccount', { name: account.name })} data-opener={`account:${account.id}`}
									onClick={() => setOpen(account.id)}
									onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setOpen(account.id) } }}>
									<span className="sp-title sp-truncate">{account.name}</span>
									{through(account.id).map(text => <span className="sp-subtitle" key={text}>{text}</span>)}
								</span>
							</ListItem>
						))}
				</ReorderList>
				{open === 'new'
					? <AccountEditor list={list} write={write} onClose={() => setOpen(null)} />
					: <AddRow data-opener="account:new" onClick={() => setOpen('new')}>{phrase('budget.addAccount', { first: String(!list.length) })}</AddRow>}
			</div>
		</Card>
	)
}

function AccountEditor({ account, index = 0, list, write, onMove, onClose }) {
	const [name, setName] = useState(account?.name ?? '')
	const [grey, setGrey] = useState(account?.grey ?? false)
	const [error, setError] = useState('')
	const [lost, setLost] = useState('')
	const [saving, setSaving] = useState(false)
	const [asking, setAsking] = useState(false)
	const count = list.length
	const box = useRef(null)
	const pending = useRef(false)
	const moved = useMoveFocus(box, 'account', index, count)
	const save = async () => {
		if (pending.current) return
		const clean = name.trim()
		if (!clean) { setError(phrase('budget.nameMissing', { what: 'account' })); return }
		const twin = list.find(a => a.id !== account?.id && accountKey(a.name) === accountKey(clean))
		if (twin) { setError(phrase('budget.accountTwin', { name: twin.name })); return }
		pending.current = true
		setSaving(true)
		try {
			await write(() => (account ? updateBudgetAccount(account.id, { name: clean, grey }) : addBudgetAccount({ name: clean, grey })), undefined, true)
			onClose()
		} catch (e) {
			if (isGone(e)) setLost(phrase('budget.lost', { what: 'account' }))
			else setError(failureMessage(e, ''))
			pending.current = false
			setSaving(false)
		}
	}
	const cancel = () => leave(lost && [opener('account', 'new')], write.reload, onClose)
	return (
		<>
			<LineEditor ref={box} handle title={account ? phrase('budget.accountEditor.title', { at: index + 1, count }) : phrase('budget.accountEditor.new')} what="account"
				commit={phrase(account ? 'budget.accountEditor.save' : 'budget.accountEditor.add')} saving={saving} onCommit={save} onCancel={cancel}
				{...(account ? { onMoveUp: () => { moved(-1); onMove(index - 1) }, onMoveDown: () => { moved(1); onMove(index + 1) }, onDelete: () => setAsking(true), first: index === 0, last: index === count - 1 } : {})}>
				<>
					<Field label={phrase('field.name')} message={error || lost || undefined} messageType={error || lost ? 'danger' : 'hint'}>
						<TextField autoFocus value={name} onChange={v => { setName(v); setError('') }} />
					</Field>
					<Choice variant="described" control={<Switch checked={grey} onChange={ev => setGrey(ev.target.checked)} />}
						description={phrase('budget.grey.note')}>
						{phrase('budget.grey')}
					</Choice>
				</>
			</LineEditor>
			<Leaving>{asking ? (
				<Confirm title={phrase('library.deleteTitle', { name: account.name })} commit={phrase('lineEditor.delete', { what: 'account' })}
					body={account.rows ? phrase('budget.deleteAccountBody', { name: account.name, rows: plural(account.rows, 'row') }) : phrase('budget.deleteUnusedAccountBody', { name: account.name })}
					onConfirm={() => write(() => deleteBudgetAccount(account.id)).then(onClose, () => setAsking(false))}
					onCancel={() => setAsking(false)} />
			) : null}</Leaving>
		</>
	)
}

/* ---- the whole year (21b) ---- */

function SheetView({ sheet, write, editing, covered, panel, setPanel }) {
	const short = useMemo(() => monthNames('short', true), [])
	const long = useMemo(() => monthNames('long'), [])
	const toast = useToast()
	const scroller = useRef(null)
	const table = useRef(null)
	const thisMonth = nowMonthOf(sheet.year)
	const totals = totalsOf(sheet)
	const order = sheet.groups.flatMap(g => g.lines.map(l => l.id))
	const span = MONTHS + 4
	// an editor or an add row spans the sheet, and what it holds stays across the box in view (21c)
	const wide = (key, content) => (
		<tr key={key}>
			<td colSpan={span} className="bg-hold"><div className="bg-held">{content}</div></td>
		</tr>
	)
	// it opens on the month it is now, just right of the row names, with Account and the months before to the left
	useLayoutEffect(() => {
		const box = scroller.current
		if (!box || thisMonth < 0 || box.scrollWidth <= box.clientWidth) return
		const heads = box.querySelectorAll('thead th')
		const month = heads[2 + thisMonth].getBoundingClientRect()
		box.scrollLeft += month.left - box.getBoundingClientRect().left - heads[0].getBoundingClientRect().width
	}, [])
	const isOpen = (kind, key) => panel?.kind === kind && panel.key === key
	const open = (kind, key, back) => setPanel({ kind, key, back })
	const editRow = (line, group) => open('row', line.id, [opener('row', line.id), opener('new-row', group.id)])
	const close = () => setPanel(null)

	// a save that fails keeps what was typed in its cell, marked, until it is saved or Escape drops it (6d)
	const [drafts, setDrafts] = useState(() => new Map())
	const drop = key => setDrafts(d => (d.has(key) ? new Map([...d].filter(([k]) => k !== key)) : d))
	const save = (line, month, value) => {
		const key = `${line.id}:${month}`
		if ((line.months[month].real ?? null) === value) { drop(key); return }
		write(() => updateBudgetLine(line.id, { month: month + 1, real: value }), s => withReal(s, line.id, month, value))
			.then(() => drop(key), error => { if (!isGone(error)) setDrafts(d => new Map(d).set(key, value)) })
	}
	const cellAt = (row, month) => table.current?.querySelector(`[data-cell="${row}:${month}"]`)

	// the cell being typed in, and whether what was typed is to be dropped
	const typing = useRef({ key: null, cancelled: false })
	const cell = (line, month) => {
		const m = line.months[month]
		const row = order.indexOf(line.id)
		const key = `${row}:${month}`
		const typed = () => typing.current.key === key
		const draft = `${line.id}:${month}`
		const unsaved = drafts.has(draft)
		return (
			<td className="sp-col-number" key={month}>
				<NumberField cell locale={LOCALE} value={unsaved ? drafts.get(draft) : m.real} data-cell={key} aria-invalid={unsaved ? 'true' : undefined}
					placeholder={m.real == null && m.expected != null ? amount(m.expected) : undefined}
					aria-label={phrase('budget.realAmount', { name: line.name, month: long[month] })}
					onFocus={ev => { typing.current = { key: null, cancelled: false }; ev.target.select() }}
					onInput={() => { typing.current.key = key }}
					onKeyDown={ev => {
						const k = ev.key
						const to = (r, mo) => { const next = cellAt(r, mo); if (next) { ev.preventDefault(); next.focus() } }
						if (k === 'Enter') { ev.preventDefault(); const next = cellAt(row + 1, month); if (next) next.focus(); else ev.target.blur() }
						else if (k === 'Escape') { typing.current.cancelled = true; ev.target.blur(); ev.target.focus() }
						else if (k === 'ArrowDown') to(row + 1, month)
						else if (k === 'ArrowUp') to(row - 1, month)
						else if (typed()) return
						else if (k === 'ArrowRight') to(row, month + 1)
						else if (k === 'ArrowLeft') to(row, month - 1)
						else if (k === 'Home') to(row, 0)
						else if (k === 'End') to(row, MONTHS - 1)
						else if (k === 'Delete') { ev.preventDefault(); save(line, month, null) }
					}}
					onBlur={ev => {
						if (typing.current.cancelled) { drop(draft); return }
						if (!typed() && !unsaved) return
						const value = readAmount(ev.target.value)
						if (value === false) toast({ message: phrase('budget.amountUnreadable'), color: 'danger' })
						else save(line, month, value)
					}} />
			</td>
		)
	}

	const sumRow = (key, label, values, { ink, grey, signed, hide } = {}) => (
		<tr key={key} className={grey ? 'sp-ink-5' : undefined}>
			<td>{ink ? <span className="sp-strong">{label}</span> : <span className="sp-cell-flex"><span className="sp-truncate">{label}</span></span>}</td>
			<td />
			{values.map((v, m) => <td key={m} className={signed && !hide ? join('sp-col-number', inkOf(v)) : 'sp-col-number'}>{hide ? <Redacted /> : figure(v)}</td>)}
			<td className={join('sp-col-number', ink && 'sp-strong', signed && !hide && inkOf(sum(values)))}>{hide ? <Redacted /> : figure(sum(values))}</td>
			<td className={join('sp-col-number', signed && !hide && inkOf(sum(values)))}>{hide ? <Redacted /> : figure(sum(values) / MONTHS)}</td>
		</tr>
	)

	const hide = group => covered && group.kind === 'income'
	const costLines = linesOf(sheet, 'expense')
	const used = sheet.accounts.filter(a => costLines.some(l => l.accountId === a.id))
	const byAccount = used.length < 2 ? [] : [
		...used.map(a => ({ key: a.id, label: a.name, grey: a.grey, lines: costLines.filter(l => l.accountId === a.id) })),
		...(costLines.some(l => !l.accountId) ? [{ key: 'none', label: phrase('budget.noAccount'), lines: costLines.filter(l => !l.accountId) }] : [])
	]

	return (
		<Card variant="flush">
			<Toolbar>
				<span className="sp-section-label">{phrase('budget.of', { year: sheet.year })}</span>
				<span className="sp-grow" />
				<span className="sp-note">{phrase('budget.greyExpected')}{dot}{phrase('bank.amountsIn', { symbol: currencySymbol() })}</span>
			</Toolbar>
			<div className="bg-view">
				<div className="bg-scroll" ref={scroller}>
					<table ref={table} className="sp-table sp-table--compact sp-table--static sp-table--borderless bg-sheet" aria-label={phrase('budget.sheet', { year: sheet.year, symbol: currencySymbol() })}>
						<SheetColumns short={short} thisMonth={thisMonth} />
						<tbody>
							{SIDES.map(({ kind, title }) => {
								const groups = sheet.groups.filter(g => g.kind === kind)
								return (
									<Fragment key={kind}>
										<tr><td colSpan={span}><span className="sp-section-label">{phrase(title)}</span></td></tr>
										{groups.map((g, gi) => (
											<Fragment key={g.id}>
												{isOpen('group', g.id)
													? wide('group', <GroupEditor sheet={sheet} group={g} index={gi} count={groups.length} write={write} onClose={close} />)
													: (
														<tr>
															<td colSpan={span}>
																{editing
																	? (
																		// the outer span is what holds still at the left while the sheet scrolls
																		<span>
																			<span className="sp-row-flex sp-gap-8">
																				<span className="sp-title">{g.name}</span>
																				<IconButton variant="outline" icon={<Icon name="pencil" size={14} />} aria-label={phrase('budget.editGroup', { name: g.name })} data-opener={`group:${g.id}`}
																					onClick={() => open('group', g.id, [opener('group', g.id), opener('new-group', g.kind)])} />
																			</span>
																		</span>
																	)
																	: <span className="sp-title">{g.name}</span>}
															</td>
														</tr>
													)}
												{g.lines.map((line, i) => (isOpen('row', line.id)
													? wide(line.id, <RowEditor sheet={sheet} line={line} group={g} index={i} write={write} onClose={close} />)
													: (
														<tr key={line.id}>
															{/* while editing, a press anywhere in the name's cell opens the row; the keyboard reaches the name */}
															<td {...(editing ? { className: 'bg-opens', onClick: () => editRow(line, g) } : {})}>
																<span className="sp-cell-flex">
																	<span className="sp-truncate" title={line.name} {...(editing ? {
																		role: 'button', tabIndex: 0, 'aria-label': phrase('budget.editRow', { name: line.name }), 'data-opener': `row:${line.id}`,
																		onKeyDown: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); editRow(line, g) } }
																	} : {})}>{line.name}</span>
																</span>
															</td>
															<td className="sp-truncate">{sheet.accounts.find(a => a.id === line.accountId)?.name ?? ''}</td>
															{hide(g) ? line.months.map((_, m) => <td className="sp-col-number" key={m}><Redacted /></td>) : line.months.map((_, m) => cell(line, m))}
															<td className="sp-col-number">{hide(g) ? <Redacted /> : figure(sum(line.months.map(m => shown(m) ?? 0)))}</td>
															<td className="sp-col-number">{hide(g) ? <Redacted /> : figure(sum(line.months.map(m => shown(m) ?? 0)) / MONTHS)}</td>
														</tr>
													)))}
												{!editing ? null : isOpen('new-row', g.id)
													? wide(`new-${g.id}`, <RowEditor sheet={sheet} group={g} write={write} onClose={close} />)
													: wide(`add-${g.id}`, <AddRow data-opener={`new-row:${g.id}`} onClick={() => open('new-row', g.id, [opener('new-row', g.id)])}>{phrase('budget.addRow', { name: g.name })}</AddRow>)}
											</Fragment>
										))}
										{!editing ? null : isOpen('new-group', kind)
											? wide(`new-group-${kind}`, <GroupEditor sheet={sheet} kind={kind} write={write} onClose={close} />)
											: wide(`add-${kind}`, <AddRow data-opener={`new-group:${kind}`} onClick={() => open('new-group', kind, [opener('new-group', kind)])}>{phrase('budget.addGroup', { kind })}</AddRow>)}
									</Fragment>
								)
							})}
							<tr><td colSpan={span}><span className="sp-section-label">{phrase('budget.totals')}</span></td></tr>
							{byAccount.length ? (
								<>
									<tr><td colSpan={span}><span className="sp-title">{phrase('budget.costsByAccount')}</span></td></tr>
									{byAccount.map(a => sumRow(a.key, a.label, sumMonths(a.lines), { grey: a.grey }))}
								</>
							) : null}
							{sumRow('income', phrase('budget.group.income'), totals.income, { ink: true, hide: covered })}
							{sumRow('costs', phrase('budget.group.costs'), totals.costs, { ink: true })}
							{sumRow('left', phrase('budget.leftOver'), totals.left, { ink: true, signed: true, hide: covered })}
						</tbody>
					</table>
				</div>
			</div>
		</Card>
	)
}
