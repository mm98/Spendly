import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { Button, ButtonLink, IconButton } from '../components/Button.jsx'
import { BudgetImport } from '../components/BudgetImport.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { ConfirmDialog } from '../components/ConfirmDialog.jsx'
import { Field, FieldShell, FormActions, Segmented, TextInput, focusField, useFieldErrors } from '../components/Form.jsx'
import { useDelete, useRowDelete } from '../components/FormPage.jsx'
import { Icon } from '../components/Icon.jsx'
import { useReorder } from '../components/Reorder.jsx'
import { Sep } from '../components/Sep.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import { useToast } from '../components/Toast.jsx'
import { useApi } from '../api/useApi.js'
import { AMOUNT_PATTERN, activeCurrency, amount, amountRound, monthNames, parseAmount, plural, sanitizeAmount } from '../api/format.js'
import { BUDGET_ACCOUNT_FIELDS, BUDGET_AMOUNT, BUDGET_GROUP_FIELDS, BUDGET_ROW_FIELDS } from '../api/rules.js'
import {
	addBudgetAccount, addBudgetGroup, addBudgetLine, createBudgetYear, deleteBudgetAccount, deleteBudgetGroup,
	deleteBudgetLine, deleteBudgetYear, failureMessage, getBudgetAccounts, getBudgetYear, getBudgetYears,
	updateBudgetAccount, updateBudgetGroup, updateBudgetLine
} from '../api/client.js'

/* The yearly budget, drawn the way the spreadsheet it replaces was: rows down the side in
   groups, the twelve months across, the year and the monthly average at the end of each row. */

const join = (...parts) => parts.filter(Boolean).join(' ')
const MONTHS = 12
const KINDS = [{ kind: 'income', title: 'Income' }, { kind: 'expense', title: 'Costs' }]

// What the sheet counts for a month: the real amount where there is one, else the expected.
const shown = m => m.real ?? m.expected
const sumMonths = lines => Array.from({ length: MONTHS }, (_, m) =>
	lines.reduce((sum, line) => sum + (shown(line.months[m]) ?? 0), 0))
const sum = values => values.reduce((a, b) => a + b, 0)
const figure = n => (n == null ? '' : amountRound(Math.round(n)))
const toNumber = text => (text.trim() ? parseAmount(text.trim()) : null)
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

/* Focus that waits for the next render, since the button it goes back to may be one that
   render draws: an add button a panel stood in for, or a row that has just moved. */
function useFocusLater() {
	const target = useRef(null)
	useEffect(() => {
		if (!target.current) return
		const el = document.getElementById(target.current)
		target.current = null
		if (el && !el.disabled) el.focus()
	})
	return useCallback(id => { target.current = id }, [])
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
	const [arranging, setArranging] = useState(false)
	const now = new Date().getFullYear()
	const latest = years[years.length - 1]
	const year = param ? Number(param) : years.includes(now) ? now : latest
	return (
		<div className="page-grid">
			<YearBar years={years} year={year} arranging={arranging} onArrange={setArranging} onYearsChanged={onYearsChanged} />
			{years.includes(year) ? (
				<YearSheet key={year} year={year} arranging={arranging} onYearsChanged={onYearsChanged} />
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
function YearBar({ years, year, arranging, onArrange, onYearsChanged }) {
	const navigate = useNavigate()
	const [starting, setStarting] = useState(false)
	return (
		<div className="budget-bar">
			<div className="budget-years">
				<Segmented label="Year" options={years.map(String)} value={String(year)}
					onChange={y => navigate(`/budget/${y}`)} />
			</div>
			{arranging ? (
				<Button variant="pill" icon="plus" aria-haspopup="dialog" onClick={() => setStarting(true)}>
					NEW YEAR</Button>
			) : null}
			<Button variant="pill" icon={arranging ? 'check' : 'pencil'} aria-pressed={arranging}
				onClick={() => onArrange(!arranging)}>{arranging ? 'DONE' : 'EDIT'}</Button>
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

function YearSheet({ year, arranging, onYearsChanged }) {
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
			<SheetCard sheet={sheet} setSheet={setSheet} write={write} del={del} arranging={arranging} />
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

	// Where the year does not fit, it opens on the month it is now rather than on January.
	useEffect(() => {
		const box = scroller.current
		const now = box?.querySelector('.budget-head .budget-month.is-now')
		const names = box?.querySelector('.budget-head .budget-name')
		if (!now || !names || box.scrollWidth <= box.clientWidth) return
		box.scrollLeft += now.getBoundingClientRect().left - names.getBoundingClientRect().right
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
				<span className="budget-key">
					<span className="budget-key-expected">1.234</span> expected<Sep /><span>1.234</span> real
				</span>
			</CardHeader>
			<CardDivider />
			<div className="budget-sheet" ref={scroller}>
				<div className="budget-grid" role="grid" aria-label={`Budget ${sheet.year}, amounts in whole ${activeCurrency().label}`}>
					<HeadRow months={months} thisMonth={thisMonth} first="Row" />
					{KINDS.map(({ kind, title }) => (
						<Fragment key={kind}>
							<div className="budget-row budget-section" role="row">
								<span role="rowheader" className="budget-span"><span>{title}</span></span>
							</div>
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
					<Totals sheet={sheet} months={months} thisMonth={thisMonth} />
				</div>
			</div>
			<p className="screenreader-only" role="status" aria-live="polite">{said}</p>
			<div className="budget-foot">
				{arranging ? (
					<p className="field-help">Drag a row by its dots to move it. Click a row's name to change the row,
						its account and its expected amounts, or a group's name to rename or move the group. The list
						of accounts is under the sheet. Amounts can still be typed straight into the sheet.</p>
				) : (
					<p className="field-help">Click an amount to write the real one. Enter saves it and moves down.
						Clear it to show the expected amount again. To add, move or rename rows, groups and accounts,
						or to change expected amounts, press EDIT. The sheet shows whole {activeCurrency().label}.</p>
				)}
				{arranging ? del.button : null}
				{del.dialog}
			</div>
		</Card>
	)
}

function HeadRow({ months, thisMonth, first }) {
	return (
		<div className="budget-row budget-head" role="row">
			<span role="columnheader" className="budget-name">{first}</span>
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

/* The input a cell becomes. It overlays the cell and grows past it, the way a spreadsheet's does. */
function CellEditor({ initial, typed, hint, label, onCommit, onCancel, onInvalid }) {
	const [text, setText] = useState(initial)
	const [error, setError] = useState('')
	const input = useRef(null)
	const done = useRef(false)

	useEffect(() => {
		const el = input.current
		el?.focus()
		if (typed == null) el?.select()
		else el?.setSelectionRange(el.value.length, el.value.length)
	}, [typed])

	const valid = clean => !clean || AMOUNT_PATTERN.test(clean)
	const finish = direction => {
		const clean = text.trim()
		if (!valid(clean)) { setError('Amounts take a comma, such as 1.234,56.'); return }
		done.current = true
		onCommit(clean ? parseAmount(clean) : null, direction)
	}

	return (
		<span className="budget-editor">
			<input ref={input} id="budget-cell-editor" inputMode="decimal" autoComplete="off" value={text}
				aria-label={label} aria-invalid={error ? 'true' : undefined}
				aria-describedby={error ? 'budget-cell-editor-error' : hint ? 'budget-cell-editor-hint' : undefined}
				onChange={e => { setText(sanitizeAmount(e.target.value)); setError('') }}
				onKeyDown={e => {
					if (e.key === 'Enter') { e.preventDefault(); finish(e.shiftKey ? 'up' : 'down') }
					else if (e.key === 'Tab') { e.preventDefault(); finish(e.shiftKey ? 'left' : 'right') }
					else if (e.key === 'Escape') { e.preventDefault(); done.current = true; onCancel(true) }
				}}
				onBlur={() => {
					if (done.current) return
					done.current = true
					const clean = text.trim()
					if (text === initial && typed == null) onCancel(false)
					else if (!valid(clean)) { onInvalid(); onCancel(false) }
					else onCommit(clean ? parseAmount(clean) : null, null)
				}} />
			{error ? <span className="budget-editor-note is-error" id="budget-cell-editor-error" role="alert">{error}</span>
				: hint ? <span className="budget-editor-note" id="budget-cell-editor-hint">{hint}</span> : null}
		</span>
	)
}

const amountField = (kind, m) => `budget-row-${kind}-${m}`
const ROW_FIELDS = [
	...BUDGET_ROW_FIELDS,
	...Array.from({ length: MONTHS }, (_, m) => ['expected', 'real'].map(kind =>
		({ name: amountField(kind, m), label: kind, check: BUDGET_AMOUNT }))).flat()
]

const formOf = line => {
	const form = { 'budget-row-name': line?.name ?? '' }
	for (let m = 0; m < MONTHS; m++) for (const kind of ['expected', 'real']) {
		const value = line?.months[m][kind]
		form[amountField(kind, m)] = value != null ? amount(value) : ''
	}
	return form
}

/* Escape and Enter belong to an open list or dialog first: a combobox showing its options, or
   the question a delete asks, takes them before the panel behind it does. */
const listOpen = e => e.target.getAttribute?.('aria-expanded') === 'true' || e.defaultPrevented
	|| Boolean(e.target.closest?.('dialog'))

/** A row's own fields: its name, its account, its group and both amounts for each month. */
function RowPanel({ sheet, line, groupId, heading, write, onClose }) {
	const months = useMemo(() => monthNames('short'), [])
	const longMonths = useMemo(() => monthNames('long'), [])
	const [form, setForm] = useState(() => formOf(line))
	const [target, setTarget] = useState(groupId)
	const [accountId, setAccountId] = useState(line?.accountId ?? null)
	const [fill, setFill] = useState('')
	const [fillError, setFillError] = useState('')
	const [saving, setSaving] = useState(false)
	const errors = useFieldErrors(ROW_FIELDS, form)
	const set = name => value => { setForm(f => ({ ...f, [name]: value })); errors.recheck(name, value) }
	const setAmount = name => value => set(name)(sanitizeAmount(value))

	useEffect(() => { focusField('budget-row-name') }, [])

	const groupName = sheet.groups.find(g => g.id === target)?.name ?? ''
	const groupChoices = KINDS.map(({ kind, title }) => ({
		heading: title, options: sheet.groups.filter(g => g.kind === kind).map(g => ({ id: g.id, label: g.name }))
	}))
	const accountName = sheet.accounts.find(a => a.id === accountId)?.name ?? 'No account'
	const accountChoices = [{ heading: 'Accounts', options: [{ id: 'none', label: 'No account' },
		...sheet.accounts.map(a => ({ id: a.id, label: a.name }))] }]

	const everyMonth = (kind, value) => setForm(f => {
		const next = { ...f }
		for (let m = 0; m < MONTHS; m++) next[amountField(kind, m)] = value
		return next
	})
	const fillWith = kind => {
		const clean = fill.trim()
		const problem = !clean ? 'Write the amount first.' : BUDGET_AMOUNT(clean)
		if (problem) { setFillError(problem); focusField('budget-row-fill'); return }
		setFillError('')
		everyMonth(kind, amount(parseAmount(clean)))
	}

	const save = async () => {
		if (saving) return
		const failed = errors.check()
		if (failed.length) { focusField(failed[0].name); return }
		const body = {
			name: form['budget-row-name'].trim(),
			accountId,
			months: Array.from({ length: MONTHS }, (_, m) => ({
				expected: toNumber(form[amountField('expected', m)]), real: toNumber(form[amountField('real', m)])
			}))
		}
		setSaving(true)
		try {
			await write(() => (line
				? updateBudgetLine(line.id, target !== groupId ? { ...body, groupId: target } : body)
				: addBudgetLine(target, body)))
			onClose()
		} catch {
			setSaving(false)
		}
	}

	const rowDelete = useRowDelete({
		what: 'row',
		label: l => `Delete the row ${l.name}`,
		detail: l => `${l.name}, with every amount in it.`,
		onDelete: l => write(() => deleteBudgetLine(l.id)).then(() => onClose(true), () => {})
	})

	const keys = e => {
		if (listOpen(e)) return
		if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
		if (e.key === 'Enter' && e.target instanceof HTMLInputElement) { e.preventDefault(); save() }
	}

	const name = errors.propsFor('budget-row-name')

	return (
		<div className="filter-section line-card budget-panel" onKeyDown={keys}>
			<div className="line-card-head">
				<span className="section-label line-card-title">{heading}</span>
				<span className="field-help push-end line-card-keys">Enter saves<Sep />Escape cancels</span>
			</div>
			<div className="budget-panel-fields">
				<Field label="Name" htmlFor="budget-row-name" error={name.error} errorId={name.errorId}>
					<FieldShell>
						<TextInput id="budget-row-name" aria-required="true" value={form['budget-row-name']}
							onChange={set('budget-row-name')} invalid={name.invalid} describedBy={name.describedBy} />
					</FieldShell>
				</Field>
				<Field label="Account" optional htmlFor="budget-row-account"
					help="Where the money is paid from, or paid into. The list of accounts is under the sheet.">
					<Combobox id="budget-row-account" label="Account" pickOnly value={accountName} groups={accountChoices}
						onSelect={o => setAccountId(o.id === 'none' ? null : o.id)} />
				</Field>
				<Field label="Group" htmlFor="budget-row-group">
					<Combobox id="budget-row-group" label="Group" pickOnly value={groupName} groups={groupChoices}
						onSelect={o => setTarget(o.id)} />
				</Field>
			</div>
			<div className="budget-panel-months" role="group" aria-label="Amounts for each month">
				<p className="field-help budget-panel-legend">In each month, the upper field is the expected amount.
					The lower field is the real amount. The sheet shows the real amount when there is one.</p>
				{months.map((month, m) => {
					const expected = errors.propsFor(amountField('expected', m))
					const real = errors.propsFor(amountField('real', m))
					return (
						<div key={m} className="budget-panel-month">
							<span className="budget-panel-month-name">{month}</span>
							{[['expected', expected, 'Expected'], ['real', real, 'Real']].map(([kind, props, word]) => (
								<Fragment key={kind}>
									<input id={amountField(kind, m)} inputMode="decimal" autoComplete="off"
										className={join('budget-panel-amount', kind === 'expected' && 'is-expected')}
										aria-label={`${word} amount, ${longMonths[m]}`} value={form[amountField(kind, m)]}
										aria-invalid={props.invalid ? 'true' : undefined}
										aria-describedby={props.invalid ? props.describedBy : undefined}
										onChange={e => setAmount(amountField(kind, m))(e.target.value)} />
									{props.error ? <span className="field-error" id={props.errorId}>{props.error}</span> : null}
								</Fragment>
							))}
						</div>
					)
				})}
			</div>
			<div className="field budget-panel-tools">
				<span id="budget-row-fill-label">Same amount in every month</span>
				<div className="row-inline budget-panel-tool-buttons">
					<input id="budget-row-fill" inputMode="decimal" autoComplete="off" className="budget-panel-amount"
						aria-labelledby="budget-row-fill-label" value={fill} aria-invalid={fillError ? 'true' : undefined}
						aria-describedby={fillError ? 'budget-row-fill-error' : undefined}
						onChange={e => { setFill(sanitizeAmount(e.target.value)); setFillError('') }} />
					<Button variant="ghost compact" onClick={() => fillWith('expected')}>SET AS EXPECTED</Button>
					<Button variant="ghost compact" onClick={() => fillWith('real')}>SET AS REAL</Button>
					<Button variant="ghost compact" onClick={() => everyMonth('expected', '')}>CLEAR EXPECTED</Button>
					<Button variant="ghost compact" onClick={() => everyMonth('real', '')}>CLEAR REAL</Button>
				</div>
				{fillError ? <span className="field-error" id="budget-row-fill-error">{fillError}</span> : null}
			</div>
			<FormActions>
				<Button variant="caps compact" icon="check" onClick={save}>
					{saving ? 'SAVING...' : line ? 'SAVE ROW' : 'ADD ROW'}</Button>
				<Button variant="ghost compact" onClick={() => onClose()}>CANCEL</Button>
				{line ? (
					<span className="push-end">
						{rowDelete.button(line, <span className="line-delete-label">DELETE ROW</span>, `Delete row, ${line.name}`)}
					</span>
				) : null}
			</FormActions>
			{rowDelete.dialog}
		</div>
	)
}

/** One name, saved or dropped: what a group and an account both are to edit. `onSave` answers
    with the write, so a refused name keeps the panel open with what was typed. */
function NamePanel({ id, heading, rules, initial, what, onSave, onClose, head, del }) {
	const [form, setForm] = useState({ [id]: initial ?? '' })
	const [saving, setSaving] = useState(false)
	const errors = useFieldErrors(rules, form)
	const name = errors.propsFor(id)

	// Once, when the panel opens: a group moved from its panel keeps focus on the button that moved it.
	const opened = useRef(false)
	useEffect(() => {
		if (opened.current) return
		opened.current = true
		focusField(id)
	}, [id])

	const save = async () => {
		if (saving) return
		const failed = errors.check()
		if (failed.length) { focusField(failed[0].name); return }
		setSaving(true)
		try {
			await onSave(form[id].trim())
			onClose()
		} catch {
			setSaving(false)
		}
	}

	const keys = e => {
		if (listOpen(e)) return
		if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
		if (e.key === 'Enter' && e.target instanceof HTMLInputElement) { e.preventDefault(); save() }
	}

	return (
		<div className="filter-section line-card budget-panel" onKeyDown={keys}>
			<div className="line-card-head">
				<span className="section-label line-card-title">{heading}</span>
				{head}
				<span className="field-help push-end line-card-keys">Enter saves<Sep />Escape cancels</span>
			</div>
			<div className="budget-panel-fields budget-panel-fields-one">
				<Field label="Name" htmlFor={id} error={name.error} errorId={name.errorId}>
					<FieldShell>
						<TextInput id={id} aria-required="true" value={form[id]}
							onChange={v => { setForm({ [id]: v }); errors.recheck(id, v) }}
							invalid={name.invalid} describedBy={name.describedBy} />
					</FieldShell>
				</Field>
			</div>
			<FormActions>
				<Button variant="caps compact" icon="check" onClick={save}>
					{saving ? 'SAVING...' : initial == null ? `ADD ${what}` : `SAVE ${what}`}</Button>
				<Button variant="ghost compact" onClick={() => onClose()}>CANCEL</Button>
				{del ? <span className="push-end">{del.button}</span> : null}
			</FormActions>
			{del?.dialog}
		</div>
	)
}

/** A group's name and place, or a new group for one side of the sheet. */
function GroupPanel({ sheet, group, kind, index = 0, count = 0, write, onClose }) {
	const focusLater = useFocusLater()
	// A group moved to the top or the bottom leaves that button disabled, so focus takes the other one.
	const move = step => write(() => updateBudgetGroup(group.id, { index: index + step })).then(() => {
		const to = index + step
		focusLater(to <= 0 ? 'budget-group-down' : to >= count - 1 ? 'budget-group-up'
			: step < 0 ? 'budget-group-up' : 'budget-group-down')
	}, () => {})
	const groupDelete = useRowDelete({
		what: 'group',
		label: g => `Delete the group ${g.name}`,
		detail: g => (g.lines.length
			? `${g.name} and its ${plural(g.lines.length, 'row')}, with every amount in them.`
			: `${g.name}, which has no rows.`),
		onDelete: g => write(() => deleteBudgetGroup(g.id)).then(() => onClose(true), () => {})
	})
	return (
		<NamePanel id="budget-group-name" rules={BUDGET_GROUP_FIELDS} initial={group?.name} what="GROUP"
			heading={group ? `Group ${index + 1} of ${count}` : `New group in ${kind === 'income' ? 'income' : 'costs'}`}
			onSave={name => write(() => (group ? updateBudgetGroup(group.id, { name }) : addBudgetGroup(sheet.year, { kind, name })))}
			onClose={onClose}
			head={group ? (
				<span className="row-inline row-actions">
					<IconButton icon="chevronUp" label="Move the group up" id="budget-group-up" disabled={index <= 0}
						onClick={() => move(-1)} />
					<IconButton icon="chevronDown" label="Move the group down" id="budget-group-down"
						disabled={index >= count - 1} onClick={() => move(1)} />
				</span>
			) : null}
			del={group ? {
				button: groupDelete.button(group, <span className="line-delete-label">DELETE GROUP</span>, `Delete group, ${group.name}`),
				dialog: groupDelete.dialog
			} : null} />
	)
}

const accountKey = name => name.trim().toLocaleLowerCase('da')

/** An account's name, or a new account at the end of the list. Two accounts cannot share a name,
    since the rows and the totals tell them apart by it. */
function AccountPanel({ account, list, write, del, onClose }) {
	const rules = useMemo(() => BUDGET_ACCOUNT_FIELDS.map(rule => ({
		...rule,
		check: v => {
			const twin = list.find(a => a.id !== account?.id && accountKey(a.name) === accountKey(v))
			return rule.check(v) || (twin ? `You already have an account called ${twin.name}.` : '')
		}
	})), [list, account?.id])
	return (
		<NamePanel id="budget-account-name" rules={rules} initial={account?.name} what="ACCOUNT"
			heading={account ? 'Account' : 'New account'} onClose={onClose} del={del}
			onSave={name => write(() => (account ? updateBudgetAccount(account.id, { name }) : addBudgetAccount(name)))} />
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

function SumRow({ label, values, strong, thisMonth }) {
	const year = sum(values)
	return (
		<div className={join('budget-row budget-sum', strong && 'is-strong')} role="row">
			<span role="rowheader" className="budget-name"><span className="budget-sum-label" title={label}>{label}</span></span>
			<span role="gridcell" className="budget-account" />
			{values.map((value, m) => (
				<span key={m} role="gridcell" className={join('budget-figure', m === thisMonth && 'is-now')}>
					{figure(value)}</span>
			))}
			<span role="gridcell" className="budget-total">{figure(year)}</span>
			<span role="gridcell" className="budget-total budget-average">{figure(year / MONTHS)}</span>
		</div>
	)
}

/** The sheet's own totals: what each account pays, then income, costs and what is left. */
function Totals({ sheet, months, thisMonth }) {
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
			<HeadRow months={months} thisMonth={thisMonth} first="Totals" />
			{byAccount.length ? (
				<>
					<div className="budget-row budget-section budget-section-quiet" role="row">
						<span role="rowheader" className="budget-span"><span>Costs by account</span></span>
					</div>
					{byAccount.map(a => <SumRow key={a.key} label={a.label} thisMonth={thisMonth} values={sumMonths(a.lines)} />)}
				</>
			) : null}
			<SumRow label="Income" values={income} thisMonth={thisMonth} />
			<SumRow label="Costs" values={costs} thisMonth={thisMonth} />
			<SumRow label="Left over" values={income.map((v, m) => v - costs[m])} strong thisMonth={thisMonth} />
		</>
	)
}
