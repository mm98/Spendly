import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'
import { BudgetImport } from '../components/BudgetImport.jsx'
import { ConfirmDialog } from '../components/ConfirmDialog.jsx'
import { Segmented } from '../components/Form.jsx'
import { useDelete, useRowDelete } from '../components/FormPage.jsx'
import { Icon } from '../components/Icon.jsx'
import { useReorder } from '../components/Reorder.jsx'
import { Sep } from '../components/Sep.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import { useToast } from '../components/Toast.jsx'
import { CellEditor, KINDS, MONTHS, figure, join, shown, signOf, sum, sumMonths } from '../components/BudgetCells.jsx'
import { AccountPanel, GroupPanel, RowPanel, useFocusLater } from '../components/BudgetPanels.jsx'
import { useApi } from '../api/useApi.js'
import { MonthsCard } from './BudgetMonths.jsx'
import { activeCurrency, amount, monthNames, plural } from '../api/format.js'
import {
	createBudgetYear, deleteBudgetAccount, deleteBudgetYear, failureMessage, getBudgetAccounts, getBudgetYear,
	getBudgetYears, updateBudgetAccount, updateBudgetLine
} from '../api/client.js'

/* The yearly budget, drawn the way the spreadsheet it replaces was: rows down the side in
   groups, the twelve months across, the year and the monthly average at the end of each row. */

const cellId = (lineId, month) => `budget-cell-${lineId}-${month}`

const mapLines = (sheet, fn) => ({ ...sheet, groups: sheet.groups.map(g => ({ ...g, lines: g.lines.map(fn) })) })
const withMonth = (sheet, lineId, month, change) => mapLines(sheet, line => (line.id !== lineId ? line
	: { ...line, months: line.months.map((m, i) => (i === month ? { ...m, ...change } : m)) }))
const moved = (list, from, to) => {
	const next = [...list]
	next.splice(to, 0, next.splice(from, 1)[0])
	return next
}
const withMove = (sheet, groupId, from, to) => ({
	...sheet, groups: sheet.groups.map(g => (g.id === groupId ? { ...g, lines: moved(g.lines, from, to) } : g))
})

/* Reordering saved once per move: at once for a key press, and where a drag is let go rather than
   at every row it passes on the way. */
function useSavedReorder({ items, describe, onAnnounce, onMove, onPlace }) {
	const dragging = useRef(null)
	const lifted = useRef(null)
	const latest = useRef(items)
	latest.current = items
	const reorder = useReorder({
		items, describe, onAnnounce,
		onReorder: (from, to) => {
			onMove(from, to)
			if (!dragging.current) onPlace(items[from].id, to)
		}
	})
	dragging.current = reorder.draggingId
	useEffect(() => {
		if (reorder.draggingId) {
			lifted.current ??= { id: reorder.draggingId, from: latest.current.findIndex(i => i.id === reorder.draggingId) }
			return
		}
		const was = lifted.current
		lifted.current = null
		const index = was ? latest.current.findIndex(i => i.id === was.id) : -1
		if (was && index >= 0 && index !== was.from) onPlace(was.id, index)
	}, [reorder.draggingId])
	return reorder
}

export default function Budget() {
	const years = useApi(getBudgetYears)
	return (
		<Page>
			<Async state={years} label="Loading the budget" skeleton={<SkeletonCard lines={10} />}>
				{data => (data.years.length
					? <BudgetYears years={data.years} onYearsChanged={years.refresh} />
					: <FirstRun onYearsChanged={years.refresh} />)}
			</Async>
		</Page>
	)
}

function FirstRun({ onYearsChanged }) {
	const navigate = useNavigate()
	const toast = useToast()
	const year = new Date().getFullYear()
	const start = async () => {
		try {
			await createBudgetYear(year, null, 'none')
			onYearsChanged()
			navigate(`/budget/${year}`)
		} catch (e) {
			toast(failureMessage(e, `${year} could not be started.`), 'negative')
		}
	}
	return (
		<Card aria-label="Budget">
			<CardBody variant="card-body-centered">
				<EmptyState icon="budget">
					<p>No budget yet. Bring in your Excel budget, with one sheet for each year, or start {year} with empty rows.</p>
					<div className="row-inline budget-first-actions">
						<BudgetImport onImported={([newest]) => { onYearsChanged(); navigate(`/budget/${newest}`) }} />
						<Button variant="ghost" icon="plus" onClick={start}>START {year}</Button>
					</div>
				</EmptyState>
			</CardBody>
		</Card>
	)
}

function BudgetYears({ years, onYearsChanged }) {
	const { year: param } = useParams()
	const [params, setParams] = useSearchParams()
	const [arranging, setArranging] = useState(false)
	const now = new Date().getFullYear()
	const latest = years[years.length - 1]
	const year = param ? Number(param) : years.includes(now) ? now : latest
	const view = params.get('view') === 'all' ? 'all' : 'months'
	const start = params.has('month') ? Number(params.get('month')) - 1 : null
	// The address carries the month in front, and `view=all` opens the full sheet over the same month.
	const show = (next, month) => setParams(p => {
		const out = new URLSearchParams(p)
		if (next === 'all') out.set('view', 'all')
		else out.delete('view')
		if (month != null) out.set('month', String(month + 1))
		return out
	}, { replace: true })
	return (
		<div className="page-grid">
			<YearBar years={years} year={year} view={view} onView={show} arranging={arranging} onArrange={setArranging}
				onYearsChanged={onYearsChanged} />
			{years.includes(year) ? (
				<YearSheet key={year} year={year} view={view} start={start} onView={show}
					arranging={arranging} onYearsChanged={onYearsChanged} />
			) : (
				<Card aria-label="Budget">
					<CardBody>
						<EmptyState icon="budget">
							<p>There is no budget for {param}.</p>
							<ButtonLink to={`/budget/${latest}`}>OPEN {latest}</ButtonLink>
						</EmptyState>
					</CardBody>
				</Card>
			)}
		</div>
	)
}

/* Amounts are typed straight into the sheet at all times. Everything that changes its shape --
   rows, groups, accounts, years -- waits behind EDIT, because it is done a few times a year. */
function YearBar({ years, year, view, onView, arranging, onArrange, onYearsChanged }) {
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const [starting, setStarting] = useState(false)
	const all = view === 'all'
	return (
		<div className="budget-bar">
			<div className="budget-years">
				<Segmented label="Year" options={years.map(String)} value={String(year)}
					onChange={y => navigate({ pathname: `/budget/${y}`, search: params.has('view') ? `?view=${params.get('view')}` : '' })} />
			</div>
			{arranging ? null : (
				<Button variant="pill" icon={all ? 'close' : 'calendar'} aria-pressed={all}
					onClick={() => onView(all ? 'months' : 'all')}>{all ? 'CLOSE ALL MONTHS' : 'ALL MONTHS'}</Button>
			)}
			{arranging ? (
				<Button variant="pill" icon="plus" aria-haspopup="dialog" onClick={() => setStarting(true)}>
					NEW YEAR</Button>
			) : null}
			<Button variant="pill" icon={arranging ? 'check' : 'pencil'} aria-pressed={arranging}
				onClick={() => onArrange(!arranging)}>{arranging ? 'DONE' : 'EDIT'}</Button>
			{arranging ? null : <Button variant="pill" icon="upload" to="/budget/check">CHECK A BANK STATEMENT</Button>}
			{starting ? (
				<NewYearDialog from={years[years.length - 1]} onClose={() => setStarting(false)}
					onStarted={next => { setStarting(false); onYearsChanged(); navigate(`/budget/${next}`) }} />
			) : null}
		</div>
	)
}

const COPY_CHOICES = {
	'As they are': { amounts: 'same', help: 'Every amount is copied as it is. Then clear the ones you do not know yet, like your salary, and write what you expect instead.' },
	'As expected': { amounts: 'expected', help: 'Every amount is copied as an expected amount, shown light. Write the real amount as each month happens.' },
	'No amounts': { amounts: 'none', help: 'The groups and rows are copied, and every month is left empty.' }
}

function NewYearDialog({ from, onClose, onStarted }) {
	const toast = useToast()
	const next = from + 1
	const [choice, setChoice] = useState('As they are')
	const [busy, setBusy] = useState(false)
	const start = async () => {
		if (busy) return
		setBusy(true)
		try {
			await createBudgetYear(next, from, COPY_CHOICES[choice].amounts)
			toast(`${next} is ready.`)
			onStarted(next)
		} catch (e) {
			toast(failureMessage(e, `${next} could not be started.`), 'negative')
			setBusy(false)
		}
	}
	return (
		<ConfirmDialog title={`Start ${next}?`}
			detail={`${next} starts as a copy of ${from}, with the same groups and rows. Choose what happens to the amounts.`}
			confirmLabel={busy ? 'STARTING...' : `START ${next}`} onConfirm={start} onCancel={onClose}>
			<div className="budget-copy-choice">
				<Segmented label="Amounts" options={Object.keys(COPY_CHOICES)} value={choice} onChange={setChoice}
					tablist={false} />
				<p className="field-help">{COPY_CHOICES[choice].help}</p>
			</div>
		</ConfirmDialog>
	)
}

/* Writes go out one at a time and each answers with the whole year. A cell change is drawn at
   once; if a write fails, the year is read again so the sheet shows what is stored. */
function useWrites(setSheet, reload) {
	const toast = useToast()
	const queue = useRef(Promise.resolve())
	const newest = useRef(0)
	return useCallback((send, optimistic) => {
		if (optimistic) setSheet(optimistic)
		const ticket = ++newest.current
		const run = queue.current.then(() => send()).then(fresh => {
			if (ticket === newest.current) setSheet(fresh)
			return fresh
		}, error => {
			toast(failureMessage(error, 'That was not saved.'), 'negative')
			reload()
			throw error
		})
		queue.current = run.catch(() => {})
		return run
	}, [setSheet, reload, toast])
}

function YearSheet({ year, view, start, onView, arranging, onYearsChanged }) {
	const navigate = useNavigate()
	const toast = useToast()
	const loaded = useApi(getBudgetYear, [year])
	const [sheet, setSheet] = useState(null)
	useEffect(() => { if (loaded.data?.year === year) setSheet(loaded.data) }, [loaded.data, year])
	const write = useWrites(setSheet, loaded.refresh)
	const rows = sheet ? sheet.groups.reduce((n, g) => n + g.lines.length, 0) : 0
	const del = useDelete({
		what: 'year', variant: 'ghost compact', label: `DELETE ${year}`,
		detail: `The ${year} budget, with its ${plural(rows, 'row')} and every amount in them.`,
		onDelete: async () => {
			try {
				await deleteBudgetYear(year)
				toast(`${year} deleted.`)
				onYearsChanged()
				navigate('/budget')
			} catch (e) {
				toast(failureMessage(e, `${year} was not deleted.`), 'negative')
			}
		}
	})
	if (!sheet) {
		return <Async state={loaded} label={`Loading ${year}`} skeleton={<SkeletonCard lines={12} />}>{() => null}</Async>
	}
	return (
		<>
			{view === 'all' ? <SheetCard sheet={sheet} setSheet={setSheet} write={write} del={del} arranging={arranging} />
				: <MonthsCard sheet={sheet} write={write} start={start} onStart={m => onView('months', m)} arranging={arranging} del={del} />}
			{arranging ? <AccountsCard sheet={sheet} onChanged={loaded.refresh} /> : null}
		</>
	)
}

function SheetCard({ sheet, setSheet, write, del, arranging }) {
	const months = useMemo(() => monthNames('short'), [])
	const longMonths = useMemo(() => monthNames('long'), [])
	const now = new Date()
	const thisMonth = sheet.year === now.getFullYear() ? now.getMonth() : -1
	const [panel, setPanel] = useState(null)
	const [active, setActive] = useState(null)
	const [editing, setEditing] = useState(null)
	const [said, setSaid] = useState('')
	const toast = useToast()
	const scroller = useRef(null)
	const head = useRef(null)
	// The month names sit in a strip of their own, which stays in view while the page scrolls down.
	const follow = () => { if (head.current && scroller.current) head.current.scrollLeft = scroller.current.scrollLeft }

	// Where the year does not fit, it opens on the month it is now rather than on January.
	useEffect(() => {
		const box = scroller.current
		const now = head.current?.querySelector('.budget-month.is-now')
		const names = head.current?.querySelector('.budget-name')
		if (!box || !now || !names || box.scrollWidth <= box.clientWidth) return
		box.scrollLeft += now.getBoundingClientRect().left - names.getBoundingClientRect().right
		follow()
	}, [])

	const lineOrder = sheet.groups.flatMap(g => g.lines.map(l => l.id))
	const lineById = id => sheet.groups.flatMap(g => g.lines).find(l => l.id === id)
	const current = active && lineOrder.includes(active.line) ? active
		: lineOrder.length ? { line: lineOrder[0], month: Math.max(thisMonth, 0) } : null

	const focusCell = (line, month) => {
		setActive({ line, month })
		queueMicrotask(() => document.getElementById(cellId(line, month))?.focus())
	}

	const moveFrom = (line, month, direction) => {
		const at = lineOrder.indexOf(line)
		if (direction === 'down' && at < lineOrder.length - 1) return focusCell(lineOrder[at + 1], month)
		if (direction === 'up' && at > 0) return focusCell(lineOrder[at - 1], month)
		if (direction === 'right' && month < MONTHS - 1) return focusCell(line, month + 1)
		if (direction === 'left' && month > 0) return focusCell(line, month - 1)
		focusCell(line, month)
	}

	const saveReal = (lineId, month, value) => {
		if ((lineById(lineId)?.months[month].real ?? null) === value) return
		write(() => updateBudgetLine(lineId, { month: month + 1, real: value }),
			s => withMonth(s, lineId, month, { real: value })).catch(() => {})
	}

	const startEdit = (line, month, typed) => {
		setActive({ line, month })
		setEditing({ line, month, typed })
	}

	const openPanel = next => {
		setEditing(null)
		setPanel(next)
	}
	useEffect(() => { if (!arranging) setPanel(null) }, [arranging])

	// Where focus goes when a panel closes: back to what opened it, which may have moved.
	const focusLater = useFocusLater()
	const closePanel = back => {
		setPanel(null)
		if (back) focusLater(back)
	}

	const cellKeys = (line, month) => e => {
		const direction = { ArrowDown: 'down', ArrowUp: 'up', ArrowRight: 'right', ArrowLeft: 'left' }[e.key]
		if (direction) { e.preventDefault(); moveFrom(line.id, month, direction); return }
		if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); focusCell(line.id, e.key === 'Home' ? 0 : MONTHS - 1); return }
		if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEdit(line.id, month); return }
		if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); saveReal(line.id, month, null); return }
		if (/^[0-9,]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); startEdit(line.id, month, e.key) }
	}

	const cell = (line, month) => {
		const value = line.months[month]
		const isEditing = editing?.line === line.id && editing.month === month
		const text = value.real != null ? `real ${amount(value.real)}`
			: value.expected != null ? `expected ${amount(value.expected)}` : 'empty'
		return (
			<span key={month} role="gridcell" className={join('budget-cell', month === thisMonth && 'is-now')}>
				{isEditing ? (
					<CellEditor typed={editing.typed}
						initial={editing.typed ?? (value.real != null ? amount(value.real) : '')}
						hint={value.real == null && value.expected != null ? `Expected ${amount(value.expected)}` : null}
						label={`Real amount, ${line.name}, ${longMonths[month]}`}
						onCommit={(next, direction) => {
							setEditing(null)
							saveReal(line.id, month, next)
							if (direction) moveFrom(line.id, month, direction)
						}}
						onCancel={refocus => { setEditing(null); if (refocus) focusCell(line.id, month) }}
						onInvalid={() => toast('Not saved. Amounts take a comma, such as 1.234,56.', 'negative')} />
				) : (
					<button type="button" id={cellId(line.id, month)}
						tabIndex={current?.line === line.id && current.month === month ? 0 : -1}
						className={join('budget-amount', value.real == null && value.expected != null && 'is-expected')}
						aria-label={`${line.name}, ${longMonths[month]}: ${text}`}
						onFocus={() => setActive({ line: line.id, month })}
						onClick={() => startEdit(line.id, month)} onKeyDown={cellKeys(line, month)}>
						{figure(shown(value))}
					</button>
				)}
			</span>
		)
	}

	return (
		<Card aria-label={`Budget ${sheet.year}`} className="budget-card">
			<CardHeader title={`Budget ${sheet.year}`}>
				<span className="budget-key"><span className="budget-key-expected">Grey</span> amounts are expected</span>
			</CardHeader>
			<CardDivider />
			<div className="budget-table" role="grid" aria-label={`Budget ${sheet.year}, amounts in ${activeCurrency().label}`}>
				<div className="budget-sheet budget-sheet-head" ref={head}>
					<div className="budget-grid">
						<HeadRow months={months} thisMonth={thisMonth} />
					</div>
				</div>
				<div className="budget-sheet" ref={scroller} onScroll={follow}>
					<div className="budget-grid">
						{KINDS.map(({ kind, title }) => (
							<Fragment key={kind}>
								<SectionRow title={title} />
								{sheet.groups.filter(g => g.kind === kind).map(group => (
									<GroupBlock key={group.id} group={group} sheet={sheet} panel={panel} cell={cell} arranging={arranging}
										openPanel={openPanel} closePanel={closePanel} write={write} onAnnounce={setSaid}
										onMoveLocal={(from, to) => setSheet(s => withMove(s, group.id, from, to))}
										onPlace={(lineId, index) => write(() => updateBudgetLine(lineId, { index })).catch(() => {})} />
								))}
								{panel?.kind === 'new-group' && panel.section === kind ? (
									<PanelRow>
										<GroupPanel sheet={sheet} kind={kind} write={write}
											onClose={() => closePanel(`budget-add-group-${kind}`)} />
									</PanelRow>
								) : arranging ? (
									<div className="budget-row budget-add" role="row">
										<span role="gridcell" className="budget-span">
											<button type="button" className="line-add-row" id={`budget-add-group-${kind}`}
												onClick={() => openPanel({ kind: 'new-group', section: kind })}>
												<span className="line-add-glyph" aria-hidden="true"><Icon name="plus" /></span>
												<span className="line-add-text">Add a group to {title.toLowerCase()}</span>
											</button>
										</span>
									</div>
								) : null}
							</Fragment>
						))}
						<Totals sheet={sheet} thisMonth={thisMonth} />
					</div>
				</div>
			</div>
			<p className="screenreader-only" role="status" aria-live="polite">{said}</p>
			{arranging ? <div className="budget-foot">{del.button}</div> : null}
			{del.dialog}
		</Card>
	)
}

const SectionRow = ({ title, quiet }) => (
	<div className={join('budget-row budget-section', quiet && 'budget-section-quiet')} role="row">
		<span role="rowheader" className="budget-span"><span>{title}</span></span>
	</div>
)

function HeadRow({ months, thisMonth }) {
	return (
		<div className="budget-row budget-head" role="row">
			<span role="columnheader" className="budget-name">Row</span>
			<span role="columnheader" className="budget-account">Account</span>
			{months.map((name, m) => (
				<span key={m} role="columnheader" className={join('budget-month', m === thisMonth && 'is-now')}>{name}</span>
			))}
			<span role="columnheader" className="budget-total">Year</span>
			<span role="columnheader" className="budget-total">Per month</span>
		</div>
	)
}

const PanelRow = ({ children }) => (
	<div className="budget-row budget-panel-row" role="row">
		<div role="gridcell" className="budget-span">{children}</div>
	</div>
)

function GroupBlock({ group, sheet, panel, cell, arranging, openPanel, closePanel, write, onAnnounce, onMoveLocal, onPlace }) {
	const reorder = useSavedReorder({
		items: group.lines, describe: line => line.name, onAnnounce, onMove: onMoveLocal, onPlace
	})
	const accountName = id => sheet.accounts.find(a => a.id === id)?.name ?? ''

	const groupOpen = panel?.kind === 'group' && panel.id === group.id
	const index = sheet.groups.filter(g => g.kind === group.kind).findIndex(g => g.id === group.id)
	const siblings = sheet.groups.filter(g => g.kind === group.kind).length
	const annual = line => sum(line.months.map(m => shown(m) ?? 0))

	return (
		<div {...reorder.listProps} className="budget-group-block">
			<div className="budget-row budget-group" role="row">
				<span role="rowheader" className="budget-span">
					{arranging ? (
						<button type="button" className="budget-group-name" id={`budget-group-${group.id}`} aria-expanded={groupOpen}
							onClick={() => openPanel(groupOpen ? null : { kind: 'group', id: group.id })}>
							{group.name}<Icon name="pencil" />
						</button>
					) : <span className="budget-group-name">{group.name}</span>}
				</span>
			</div>
			{groupOpen ? (
				<PanelRow>
					<GroupPanel sheet={sheet} group={group} kind={group.kind} index={index} count={siblings} write={write}
						onClose={gone => closePanel(gone ? `budget-add-group-${group.kind}` : `budget-group-${group.id}`)} />
				</PanelRow>
			) : null}
			{group.lines.map((line, i) => {
				const open = panel?.kind === 'row' && panel.id === line.id
				const total = annual(line)
				return (
					<Fragment key={line.id}>
						{reorder.placeholder(line)}
						<div className={join('budget-row budget-line', open && 'is-open')} role="row" {...reorder.rowProps(line)}>
							<span role="rowheader" className="budget-name">
								{arranging ? reorder.handle(line, i, panel !== null) : null}
								{arranging ? (
									<button type="button" className="budget-line-name" id={`budget-line-${line.id}`}
										aria-expanded={open} title={line.name}
										onClick={() => openPanel(open ? null : { kind: 'row', id: line.id })}>{line.name}</button>
								) : <span className="budget-line-name" title={line.name}>{line.name}</span>}
							</span>
							<span role="gridcell" className="budget-account" title={accountName(line.accountId)}>
								{accountName(line.accountId)}</span>
							{line.months.map((_, m) => cell(line, m))}
							<span role="gridcell" className="budget-total">{figure(total)}</span>
							<span role="gridcell" className="budget-total budget-average">{figure(total / MONTHS)}</span>
						</div>
						{open ? (
							<PanelRow>
								<RowPanel sheet={sheet} line={line} groupId={group.id} write={write}
									heading={`Row ${i + 1} of ${group.lines.length} in ${group.name}`}
									onClose={gone => closePanel(gone ? `budget-add-row-${group.id}` : `budget-line-${line.id}`)} />
							</PanelRow>
						) : null}
					</Fragment>
				)
			})}
			{panel?.kind === 'new-row' && panel.groupId === group.id ? (
				<PanelRow>
					<RowPanel sheet={sheet} groupId={group.id} write={write} heading={`New row in ${group.name}`}
						onClose={() => closePanel(`budget-add-row-${group.id}`)} />
				</PanelRow>
			) : arranging ? (
				<div className="budget-row budget-add" role="row">
					<span role="gridcell" className="budget-span">
						<button type="button" className="line-add-row" id={`budget-add-row-${group.id}`}
							onClick={() => openPanel({ kind: 'new-row', groupId: group.id })}>
							<span className="line-add-glyph" aria-hidden="true"><Icon name="plus" /></span>
							<span className="line-add-text">Add a row to {group.name}</span>
						</button>
					</span>
				</div>
			) : null}
		</div>
	)
}

/* The spreadsheet's Accounts sheet: set up once, so it is shown only while editing. Every change
   reads the year again, since the sheet draws the names and adds up the costs per account. */
function AccountsCard({ sheet, onChanged }) {
	const loaded = useApi(getBudgetAccounts)
	const [list, setList] = useState(null)
	useEffect(() => { if (loaded.data) setList(loaded.data) }, [loaded.data])
	const writeList = useWrites(setList, loaded.refresh)
	const write = useCallback((send, optimistic) => writeList(send, optimistic).then(fresh => {
		onChanged()
		return fresh
	}), [writeList, onChanged])
	const [panel, setPanel] = useState(null)
	const [said, setSaid] = useState('')
	const focusLater = useFocusLater()
	const reorder = useSavedReorder({
		items: list ?? [], describe: a => a.name, onAnnounce: setSaid,
		onMove: (from, to) => setList(l => moved(l, from, to)),
		onPlace: (id, index) => write(() => updateBudgetAccount(id, { index })).catch(() => {})
	})
	const close = back => {
		setPanel(null)
		focusLater(back)
	}
	// The list is shared by every year, so a delete counts the rows in all of them.
	const accountDelete = useRowDelete({
		what: 'account',
		label: a => `Delete the account ${a.name}`,
		detail: a => (a.rows
			? `${a.name}. Counting all years, ${plural(a.rows, 'row')} will have no account.`
			: `${a.name}, which no row uses in any year.`),
		onDelete: a => write(() => deleteBudgetAccount(a.id)).then(() => close('budget-add-account'), () => {})
	})
	const inYear = id => sheet.groups.reduce((n, g) => n + g.lines.filter(l => l.accountId === id).length, 0)

	return (
		<Card aria-label="Accounts">
			<CardHeader title="Accounts" />
			<CardDivider />
			<CardBody>
				<p className="card-lead card-lead-flush">The accounts a row is paid from, or paid into. Each row picks one,
					and the sheet adds up the costs on each account in this order. Every year uses this list. Click a name
					to rename or delete the account.</p>
				{list === null ? <Async state={loaded} label="Loading the accounts">{() => null}</Async> : (
					<div className="budget-accounts" {...reorder.listProps}>
						{list.map((account, i) => {
							const open = panel === account.id
							const rows = inYear(account.id)
							return (
								<Fragment key={account.id}>
									{reorder.placeholder(account)}
									<div className={join('budget-account-row', open && 'is-open')} {...reorder.rowProps(account)}>
										{reorder.handle(account, i, panel !== null)}
										<button type="button" className="budget-line-name" id={`budget-account-${account.id}`}
											aria-expanded={open} title={account.name}
											onClick={() => setPanel(open ? null : account.id)}>{account.name}</button>
										<span className="field-help">
											{rows ? `Used by ${plural(rows, 'row')} in ${sheet.year}` : `Not used in ${sheet.year}`}</span>
									</div>
									{open ? (
										<AccountPanel account={account} list={list} write={write}
											del={{ button: accountDelete.button(account, <span className="line-delete-label">DELETE ACCOUNT</span>,
												`Delete account, ${account.name}`) }}
											onClose={() => close(`budget-account-${account.id}`)} />
									) : null}
								</Fragment>
							)
						})}
						{panel === 'new' ? (
							<AccountPanel list={list} write={write} onClose={() => close('budget-add-account')} />
						) : (
							<div className="budget-add">
								<button type="button" className="line-add-row" id="budget-add-account" onClick={() => setPanel('new')}>
									<span className="line-add-glyph" aria-hidden="true"><Icon name="plus" /></span>
									<span className="line-add-text">{list.length ? 'Add an account' : 'Add the first account'}</span>
								</button>
							</div>
						)}
					</div>
				)}
				{accountDelete.dialog}
				<p className="screenreader-only" role="status" aria-live="polite">{said}</p>
			</CardBody>
		</Card>
	)
}

function SumRow({ label, values, strong, signed, thisMonth }) {
	const year = sum(values)
	const tone = value => (signed ? signOf(value) : null)
	return (
		<div className={join('budget-row budget-sum', strong && 'is-strong')} role="row">
			<span role="rowheader" className="budget-name"><span className="budget-sum-label" title={label}>{label}</span></span>
			<span role="gridcell" className="budget-account" />
			{values.map((value, m) => (
				<span key={m} role="gridcell" className={join('budget-figure', m === thisMonth && 'is-now', tone(value))}>
					{figure(value)}</span>
			))}
			<span role="gridcell" className={join('budget-figure budget-total', tone(year))}>{figure(year)}</span>
			<span role="gridcell" className={join('budget-figure budget-total budget-average', tone(year / MONTHS))}>
				{figure(year / MONTHS)}</span>
		</div>
	)
}

/** The sheet's own totals: what each account pays, then income, costs and what is left. */
function Totals({ sheet, thisMonth }) {
	const linesOf = kind => sheet.groups.filter(g => g.kind === kind).flatMap(g => g.lines)
	const income = sumMonths(linesOf('income'))
	const costLines = linesOf('expense')
	const costs = sumMonths(costLines)
	const used = sheet.accounts.filter(a => costLines.some(l => l.accountId === a.id))
	const byAccount = !used.length ? [] : [
		...used.map(a => ({ key: a.id, label: a.name, lines: costLines.filter(l => l.accountId === a.id) })),
		...(costLines.some(l => !l.accountId)
			? [{ key: 'none', label: 'No account', lines: costLines.filter(l => !l.accountId) }] : [])
	]
	return (
		<>
			<SectionRow title="Totals" />
			{byAccount.length ? (
				<>
					<SectionRow title="Costs by account" quiet />
					{byAccount.map(a => <SumRow key={a.key} label={a.label} thisMonth={thisMonth} values={sumMonths(a.lines)} />)}
				</>
			) : null}
			<SumRow label="Income" values={income} thisMonth={thisMonth} />
			<SumRow label="Costs" values={costs} thisMonth={thisMonth} />
			<SumRow label="Left over" values={income.map((v, m) => v - costs[m])} strong signed thisMonth={thisMonth} />
		</>
	)
}
