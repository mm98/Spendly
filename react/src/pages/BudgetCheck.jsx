import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Card, CardBody, CardHeader, Toolbar } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { Combobox, ComboboxEmpty, ComboboxGroup, ComboboxOption, ComboboxSeparator } from '../components/Combobox.jsx'
import { BulkBar, Controls } from '../components/List.jsx'
import { Gauge, Stat } from '../components/Data.jsx'
import { Field } from '../components/Field.jsx'
import { Check, Choice } from '../components/Choice.jsx'
import { ListItem, ListItemHead } from '../components/ListItem.jsx'
import { FileDrop } from '../components/FileDrop.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Empty, EmptyTitle, Skeleton } from '../components/Utilities.jsx'
import { useToast } from '../components/Overlays.jsx'
import { useShellShape } from '../app/useMedia.js'
import { Failed } from '../components/Failed.jsx'
import { cachedFetch, useApi } from '../api/useApi.js'
import { amount, capitalised, currency, currencySymbol, dayShortMonth, dot, fullStop, longDate, monthNames, plural } from '../api/format.js'
import { failureMessage, forgetBankLink, getBankLinks, getBudgetYear, getBudgetYears, saveBankLink, updateBudgetLine } from '../api/client.js'
import {
	DATE_FORMATS, checkPayments, dateFormatsFor, describeColumn, guessColumns, hasHeader, kindOf, onceKey, parseCsv, readPayments, readText,
	realAmounts
} from '../api/bankStatement.js'
import { phrase } from '../language/phrases.js'

/* A bank's CSV export checked against the budget (21g, 21h). The file is read here and never
   sent; only the choices made about its payments are saved. */

const SIDES = [{ kind: 'expense', title: 'Costs' }, { kind: 'income', title: 'Income' }]
const TO_PLACE = ['missing', 'near', 'year']
const LEFT_OUT = ['skip', 'once']
const VIEWS = [
	{ value: 'place', label: 'To place', shows: TO_PLACE },
	{ value: 'amount', label: 'Other amount', shows: ['amount'] },
	{ value: 'left', label: 'Left out', shows: LEFT_OUT },
	{ value: 'all', label: 'All', shows: null }
]
const ROLES = [
	{ id: 'date', label: 'Date' },
	{ id: 'text', label: 'Text' },
	{ id: 'amount', label: 'Amount' },
	{ id: 'out', label: 'Money out, as its own column' },
	{ id: 'none', label: 'Not used' }
]

// a failure the shell already tells of (the session ended) has no sentence, and takes no toast
const toastFailure = (toast, error, fallback) => {
	const message = failureMessage(error, fallback)
	if (message) toast({ message, color: 'danger' })
}
const cents = n => Math.round(n * 100) / 100
const money = n => currency(cents(n))
const when = g => (g.payments.length === 1 ? dayShortMonth(g.first)
	: g.first === g.last ? `${plural(g.payments.length, 'payment')} on ${dayShortMonth(g.first)}`
		: `${plural(g.payments.length, 'payment')}, ${dayShortMonth(g.first)} to ${dayShortMonth(g.last)}`)

/* Payments no row accounts for, one group per text: placing the text once places them all. */
function groupPayments(list) {
	const groups = new Map()
	for (const p of list) {
		const id = `${kindOf(p)}:${p.key}`
		const g = groups.get(id) ?? { id, key: p.key, kind: kindOf(p), text: p.text, payments: [] }
		g.payments.push(p)
		groups.set(id, g)
	}
	return [...groups.values()].map(g => {
		const hints = g.payments.filter(p => p.status === 'near').map(p => p.lineId)
		const best = hints.sort((a, b) => hints.filter(h => h === b).length - hints.filter(h => h === a).length)[0]
		const suggestion = best ? { id: best, name: g.payments.find(p => p.lineId === best).line } : null
		const dates = g.payments.map(p => p.date).sort()
		return {
			...g, suggestion, total: g.payments.reduce((n, p) => n + p.amount, 0), first: dates[0], last: dates[dates.length - 1],
			noSheet: g.payments.every(p => p.status === 'year')
		}
	}).sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
}

// The column choice for a file of the same shape, kept in this browser only.
const MAPPING_KEY = 'spendly.bankColumns'
const rememberedMapping = width => {
	try { return JSON.parse(localStorage.getItem(MAPPING_KEY))?.[width] ?? null } catch { return null }
}
const rememberMapping = (width, mapping) => {
	try {
		const all = JSON.parse(localStorage.getItem(MAPPING_KEY)) ?? {}
		localStorage.setItem(MAPPING_KEY, JSON.stringify({ ...all, [width]: mapping }))
	} catch { /* the choice is only a convenience */ }
}

const BANK_FILES = '.csv,.txt,text/csv'

export default function BudgetCheck() {
	const toast = useToast()
	// four segments do not fit beside a phone's buttons, so there they take the full row
	const touch = useShellShape() === 'touch'
	const [file, setFile] = useState(null)
	const [rows, setRows] = useState(null)
	const [mapping, setMapping] = useState(null)
	const [showColumns, setShowColumns] = useState(false)
	const [sheets, setSheets] = useState(null)
	const [view, setView] = useState('place')
	const picker = useRef(null)
	const saved = useApi(getBankLinks)
	const [links, setLinks] = useState(null)
	useEffect(() => { if (saved.data) setLinks(saved.data) }, [saved.data])

	const width = rows ? Math.max(...rows.map(r => r.length)) : 0

	// a file of a width seen before opens on its remembered columns, folded away
	const read = async chosen => {
		if (!chosen) return
		try {
			const found = parseCsv(await readText(chosen))
			if (!found.length) { toast({ message: `${chosen.name} is empty.`, color: 'danger' }); return }
			const header = hasHeader(found)
			const remembered = rememberedMapping(Math.max(...found.map(r => r.length)))
			setFile(chosen.name)
			setRows(found)
			setMapping(remembered ?? { header, ...guessColumns(found, header) })
			setShowColumns(!remembered)
			setView('place')
		} catch (e) {
			toast({ message: `${chosen.name} could not be read. ${e.message}`, color: 'danger' })
		}
	}
	const change = patch => setMapping(m => {
		const next = { ...m, ...patch }
		rememberMapping(width, next)
		return next
	})
	const toggleColumns = () => {
		if (showColumns) rememberMapping(width, mapping)
		setShowColumns(!showColumns)
	}

	const body = rows && mapping ? (mapping.header ? rows.slice(1) : rows) : []
	const dateFits = useMemo(() => (mapping?.date == null ? []
		: dateFormatsFor((mapping.header ? rows.slice(1) : rows).map(r => r[mapping.date] ?? ''))), [rows, mapping])
	const dateFormat = dateFits.includes(mapping?.dateFormat) ? mapping.dateFormat : dateFits[0] ?? 'dmy'
	const ready = mapping && mapping.date != null && mapping.text != null && mapping.amount != null
	const { payments, unread } = useMemo(() => (ready ? readPayments(rows, { ...mapping, dateFormat }) : { payments: [], unread: [] }),
		[ready, rows, mapping, dateFormat])
	const years = useMemo(() => [...new Set(payments.map(p => Number(p.date.slice(0, 4))))].sort(), [payments])

	const [sheetsFailed, setSheetsFailed] = useState(null)
	const [attempt, setAttempt] = useState(0)
	useEffect(() => {
		let live = true
		setSheets(null)
		setSheetsFailed(null)
		// only the years the budget holds are asked for, so a year without one is not an error
		cachedFetch(getBudgetYears).then(held => Promise.all(years.map(y => (held.years.includes(y) ? cachedFetch(getBudgetYear, [y]) : null))))
			.then(found => {
			if (live) setSheets(new Map(years.map((y, i) => [y, found[i]]).filter(([, s]) => s)))
		}).catch(error => {
			if (live) setSheetsFailed(error || {})
		})
		return () => { live = false }
	}, [years, attempt])
	const failed = sheetsFailed ?? (links ? null : saved.error)
	const retry = () => {
		if (!links) saved.refresh()
		if (sheetsFailed) setAttempt(n => n + 1)
	}

	const checked = useMemo(() => (sheets && links ? checkPayments(payments, sheets, links) : null), [payments, sheets, links])

	if (!rows) return <PickFile onFile={read} />

	return (
		<>
			<Controls>
				{ready && payments.length
					? <Segmented name="bank-show" aria-label="Show" variant={touch ? 'facet' : 'default'} options={VIEWS} value={view} onChange={setView} />
					: null}
				<span className="sp-grow" />
				{ready && payments.length
					? <Button variant="outline" aria-pressed={showColumns ? 'true' : 'false'} onClick={toggleColumns}>{showColumns ? 'Close columns' : 'Columns'}</Button>
					: null}
				<Button variant="outline" onClick={() => picker.current?.click()}>Another file</Button>
				<input ref={picker} type="file" name="bank-file" accept={BANK_FILES} hidden tabIndex={-1}
					onChange={ev => { const chosen = ev.target.files?.[0]; ev.target.value = ''; read(chosen) }} />
			</Controls>
			{showColumns || !ready || !payments.length
				? <Columns file={file} rows={rows} body={body} width={width} mapping={mapping} dateFits={dateFits} dateFormat={dateFormat}
					problem={!ready ? 'Tell Spendly which column holds the date, the text and the amount.'
						: !payments.length ? 'No payments were found with these columns.' : null}
					left={ready && payments.length && unread.length ? `${plural(unread.length, 'line')} could not be read with these columns.` : null}
					onChange={change} />
				: !checked
					? failed ? <Failed what="Your budget" error={failed} onRetry={retry} /> : <Card aria-busy="true"><Skeleton shape="title" /><Skeleton shape="line" /><Skeleton shape="short" /></Card>
					: <Results key={file} file={file} payments={payments} unread={unread.length} checked={checked} sheets={sheets} setSheets={setSheets}
						setLinks={setLinks} view={view} onFailed={saved.refresh} />}
		</>
	)
}

/** Before a file: the one way in, the platform's own file picker (Settings 11b's file card). */
function PickFile({ onFile }) {
	return (
		<Card>
			<FileDrop accept={BANK_FILES} onFiles={files => onFile(files?.[0])}>
				<Mark size="medium" fill="solid" aria-hidden="true" aria-label="Bank file"><Icon name="upload" size={19} /></Mark>
				<span className="sp-title">Drop the bank file, or choose it</span>
				<span className="sp-subtitle">The CSV file your bank exports. Each payment is looked up in the budget for its year and month. The file stays on this device.</span>
			</FileDrop>
		</Card>
	)
}

/** Which column of the file holds what (21h). Each role is taken by one column at most. */
function Columns({ file, rows, body, width, mapping, dateFits, dateFormat, problem, left, onChange }) {
	const roleOf = i => ROLES.find(r => mapping[r.id] === i) ?? ROLES[ROLES.length - 1]
	const set = (i, role) => {
		const patch = Object.fromEntries(ROLES.filter(r => r.id !== 'none' && mapping[r.id] === i).map(r => [r.id, null]))
		if (role !== 'none') patch[role] = i
		onChange(patch)
	}
	const touch = useShellShape() === 'touch'
	const columns = Array.from({ length: width }, (_, i) => {
		const role = roleOf(i)
		const name = mapping.header && rows[0][i] ? rows[0][i] : `Column ${i + 1}`
		return {
			i,
			name,
			values: (
				<span className="sp-subtitle sp-truncate">
					{(role.id === 'none' ? describeColumn(body.map(r => r[i]), mapping.header ? rows[0][i] : '') : null)
						?? body.slice(0, 3).map(r => r[i] || '(empty)').join(dot)}
				</span>
			),
			choice: (
				<div className="sp-stack sp-gap-8">
					<PickOnly aria-label={`${name} is mapped to`}
						value={role.id === 'none' ? <span className="sp-ink-5">{role.label}</span> : role.label}
						options={ROLES.map(r => ({ id: r.id, label: r.label, selected: r.id === role.id }))}
						onPick={id => set(i, id)} />
					{mapping.date !== i || dateFits.length === 1 ? null : dateFits.length ? (
						<Field label="Every date can be read two ways. Which is right?">
							<PickOnly value={phrase(DATE_FORMATS.find(f => f.id === dateFormat)?.label ?? '')}
								options={DATE_FORMATS.filter(f => dateFits.includes(f.id)).map(f => ({ id: f.id, label: phrase(f.label), selected: f.id === dateFormat }))}
								onPick={id => onChange({ dateFormat: id })} />
						</Field>
					) : <span className="sp-note sp-ink-danger">These are not dates Spendly can read.</span>}
				</div>
			)
		}
	})
	return (
		<Card variant="flush">
			<Toolbar>
				<span className="sp-section-label">Columns</span>
				<span className="sp-grow" />
				<span className={touch ? 'sp-note sp-truncate' : 'sp-note'}>{file}</span>
			</Toolbar>
			<CardBody>
				<div className="sp-stack sp-gap-12">
					<span className="sp-subtitle">Your file has {plural(width, 'column')}. What does each one hold?</span>
					{problem ? <span className="sp-note sp-ink-danger">{problem}</span> : null}
					{left ? <span className="sp-note sp-ink-warning">{left}</span> : null}
					<Choice control={<Check checked={!!mapping.header} onChange={ev => onChange({ header: ev.target.checked })} />}>
						The first line of the file holds column names
					</Choice>
				</div>
			</CardBody>
			{touch
				// on a phone a block per column, its choice under it at the full width: nothing scrolls sideways (21h)
				? columns.map(c => (
					<Fragment key={c.i}>
						<span className="sp-rule" />
						<CardBody>
							<div className="sp-stack sp-gap-8">
								<span className="sp-stacked">
									<span className="sp-title">{c.name}</span>
									{c.values}
								</span>
								{c.choice}
							</div>
						</CardBody>
					</Fragment>
				))
				: (
					<table className="sp-table sp-table--static">
						<thead>
							<tr>
								<th scope="col" className="sp-col-title">File</th>
								<th scope="col" className="sp-col-flex">First three values</th>
								<th scope="col" className="bg-col-map">Spendly</th>
							</tr>
						</thead>
						<tbody>
							{columns.map(c => (
								<tr key={c.i}>
									<td><span className="sp-title">{c.name}</span></td>
									<td>{c.values}</td>
									<td>{c.choice}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			<CardBody>
				<span className="sp-note">Money out is read as a minus amount. Choose a column as money out only when your bank shows it in a column of its own.</span>
			</CardBody>
		</Card>
	)
}

function PickOnly({ value, options, onPick, ...rest }) {
	return (
		<Combobox value={value} {...rest}>
			{options.map(o => (
				<ComboboxOption key={o.id} selected={o.selected} onSelect={() => onPick(o.id)}>{o.label}</ComboboxOption>
			))}
		</Combobox>
	)
}

/** A budget row picked by typing or from the list of one side of the payment's year, with what each
    holds that month. It takes focus as it opens; Escape on its closed list puts it away. */
function RowPicker({ id, label, kind, sheet, month, onPick, onClose, disabled }) {
	// opened after the field takes focus, so the open list moves focus last
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	useEffect(() => {
		document.getElementById(id)?.focus()
		setOpen(true)
	}, [id])
	const short = monthNames('short')[month]
	const groups = (sheet?.groups ?? []).filter(g => g.kind === kind)
		.map(g => ({ ...g, lines: g.lines.filter(l => l.name.toLocaleLowerCase('da').includes(query.trim().toLocaleLowerCase('da'))) }))
		.filter(g => g.lines.length)
	return (
		<Field label={label} id={id}>
			<Combobox searchable search={query} onSearch={setQuery} noun="rows" open={open} onOpenChange={setOpen}
				placeholder={kind === 'income' ? 'Type or pick from your income' : 'Type or pick from your costs'}
				onKeyDown={ev => { if (ev.key === 'Escape' && !open && onClose) { ev.preventDefault(); onClose() } }}>
				{/* one flat list, so the arrow keys reach every option */}
				{groups.length ? groups.flatMap((g, gi) => [
					gi ? <ComboboxSeparator key={`rule-${g.id}`} /> : null,
					<ComboboxGroup key={g.id}>{g.name}</ComboboxGroup>,
					...g.lines.map(l => {
						const m = l.months[month]
						const value = m.real ?? m.expected
						return (
							<ComboboxOption key={l.id} disabled={disabled}
								meta={value != null ? `${money(value)} in ${short}` : `No amount in ${short}`}
								onSelect={() => onPick(l)}>{l.name}</ComboboxOption>
						)
					})
				]) : <ComboboxEmpty>No row has that name.</ComboboxEmpty>}
			</Combobox>
		</Field>
	)
}

function Results({ file, payments, unread, checked, sheets, setSheets, setLinks, view, onFailed }) {
	const toast = useToast()
	const touch = useShellShape() === 'touch'
	const long = monthNames('long')
	const [picked, setPicked] = useState(() => new Set())
	const [busy, setBusy] = useState(false)
	const [open, setOpen] = useState(null)
	const [bulkOpen, setBulkOpen] = useState(false)
	// texts placed since the file was read stay listed, marked saved, until the next file
	const [recent, setRecent] = useState([])
	const [leaveAlone, setLeaveAlone] = useState(() => new Set())
	const [writing, setWriting] = useState(false)
	useEffect(() => { setPicked(new Set()); setOpen(null); setBulkOpen(false) }, [view])
	// a picker that closes with focus inside it gives focus back to the button that opened it, or to Undo once its text is placed
	const opened = useRef(null)
	useLayoutEffect(() => {
		if (open != null) { opened.current = open; return }
		const was = opened.current
		opened.current = null
		if (was == null || (document.activeElement && document.activeElement !== document.body)) return
		const back = document.querySelector(`[data-opener="pick:${was}"]`) ?? document.querySelector(`[data-opener="undo:${was}"]`)
		back?.focus()
	}, [open])
	// an action that takes away the control it started from leaves focus on the first of goOn() still there once it is done
	const settle = useRef(null)
	const keepFocus = goOn => {
		const from = document.activeElement
		settle.current = () => [from, ...goOn()].find(el => el?.isConnected && !el.disabled && el !== document.body)
	}
	useLayoutEffect(() => {
		if (busy || writing || !settle.current) return
		const find = settle.current
		settle.current = null
		if (!document.activeElement || document.activeElement === document.body) find()?.focus()
	}, [busy, writing])
	const showing = () => document.querySelector('input[name="bank-show"]:checked')
	// for a row: its Undo once placed, else its first button, else the next row's, the one before's, else Show
	const keepFocusOn = ids => {
		const rows = () => [...document.querySelectorAll('[data-group]')]
		const order = rows().map(r => r.dataset.group)
		const mine = order.filter(id => ids.includes(id))
		const at = order.indexOf(mine[0])
		const later = at < 0 ? [] : order.slice(at + 1).filter(id => !ids.includes(id))
		const earlier = at < 0 ? [] : order.slice(0, at).reverse()
		const row = id => rows().find(r => r.dataset.group === id)
		const button = id => [...(row(id)?.querySelectorAll('button') ?? [])].find(b => !b.disabled)
		keepFocus(() => [...mine.map(id => row(id)?.querySelector('[data-opener^="undo:"]')),
			...[...mine, ...later, ...earlier].map(button), showing()])
	}

	const count = status => checked.filter(p => status.includes(p.status)).length
	const missing = count(TO_PLACE)
	const accounted = checked.length - missing
	const dates = payments.map(p => p.date).sort()
	const groups = useMemo(() => groupPayments(checked.filter(p => TO_PLACE.includes(p.status))), [checked])
	const leftOut = useMemo(() => groupPayments(checked.filter(p => LEFT_OUT.includes(p.status))), [checked])
	const listed = [...groups, ...recent.filter(r => !groups.some(g => g.id === r.id))]
		.sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
	const chosen = groups.filter(g => picked.has(g.id))
	const oneKind = new Set(chosen.map(g => g.kind)).size === 1 && !chosen.some(g => g.noSheet)
	const writes = useMemo(() => realAmounts(checked, sheets), [checked, sheets])
	const toWrite = writes.filter(w => !leaveAlone.has(w.id))
	const skipped = writes.length - toWrite.length
	const sheetOf = p => sheets.get(Number(p.date.slice(0, 4)))
	const monthOf = p => Number(p.date.slice(5, 7)) - 1
	const toggle = (set, id) => set(s => {
		const next = new Set(s)
		if (next.has(id)) next.delete(id); else next.add(id)
		return next
	})

	/* A text placed on a row, or always left out, is one saved choice for every payment with
	   that text; left out once is a choice per payment, so the text teaches nothing for later. */
	const saveGroups = async (list, line, once) => {
		keepFocusOn(list.map(g => g.id))
		setBusy(true)
		try {
			let latest = null
			for (const g of list) {
				if (once) for (const p of g.payments) latest = await saveBankLink({ pattern: onceKey(p), kind: g.kind, lineId: null })
				else latest = await saveBankLink({ pattern: g.key, kind: g.kind, lineId: line?.id ?? null })
			}
			if (latest) setLinks(latest)
			const what = once ? 'Left out once' : line ? `On ${line.name}` : 'Always left out'
			setRecent(r => [...r.filter(x => !list.some(g => g.id === x.id)), ...list.map(g => ({ ...g, saved: what, once }))])
			setPicked(new Set())
			setOpen(null)
			setBulkOpen(false)
		} catch (e) {
			toastFailure(toast, e, 'Not every choice was saved.')
			onFailed()
		} finally {
			setBusy(false)
		}
	}
	const undo = async g => {
		keepFocusOn([g.id])
		setBusy(true)
		try {
			let latest = null
			if (g.once) for (const p of g.payments) latest = await forgetBankLink({ pattern: onceKey(p), kind: g.kind })
			else latest = await forgetBankLink({ pattern: g.key, kind: g.kind })
			if (latest) setLinks(latest)
			setRecent(r => r.filter(x => x.id !== g.id))
		} catch (e) {
			toastFailure(toast, e, 'Your choice was not taken back.')
			onFailed()
		} finally {
			setBusy(false)
		}
	}
	const bringBack = async g => {
		keepFocusOn([g.id])
		setBusy(true)
		try {
			let latest = null
			for (const p of g.payments) latest = await forgetBankLink({ pattern: p.placed === 'once' ? onceKey(p) : p.key, kind: g.kind })
			if (latest) setLinks(latest)
			toast({ message: `${plural(g.payments.length, 'payment')} brought back to the list.` })
		} catch (e) {
			toastFailure(toast, e, 'Not every payment was brought back.')
			onFailed()
		} finally {
			setBusy(false)
		}
	}
	const saveReal = async () => {
		keepFocus(() => [document.getElementById('bank-every-amount'), showing()])
		setWriting(true)
		const next = new Map(sheets)
		let done = 0
		try {
			for (const w of toWrite) {
				next.set(w.year, await updateBudgetLine(w.lineId, { month: w.month, real: w.amount }))
				done++
			}
			toast({ message: `${plural(done, 'amount')} saved in the budget.` })
		} catch (e) {
			toastFailure(toast, e, 'Not every amount was saved.')
		} finally {
			setSheets(next)
			setWriting(false)
		}
	}

	const actions = buttons => <span className="sp-row-flex sp-wrap sp-gap-8">{buttons}</span>
	const small = (label, onClick, extra = {}) => <Button key={label} variant="outline" size="small" disabled={busy} onClick={onClick} {...extra}>{label}</Button>
	const line = ({ key, group, check, title, subtitle, note, ink, buttons, children, total }) => (
		<ListItem key={key} variant="top" data-group={group}>
			{check}
			<span className="sp-stack sp-gap-8 sp-grow">
				<span className="sp-stacked">
					<span className="sp-title sp-truncate">{title || '(no text)'}</span>
					<span className="sp-subtitle">{subtitle}</span>
				</span>
				{note ? <span className={`sp-note ${ink}`}>{note}</span> : null}
				{buttons ? actions(buttons) : null}
				{children}
			</span>
			<span className="sp-amount">{money(Math.abs(total))}</span>
		</ListItem>
	)
	// money out and money in apart, each under its own total, as a month of the budget shows them
	const sides = (items, render) => SIDES.map(({ kind, title }) => {
		const mine = items.filter(i => i.kind === kind)
		return mine.length ? (
			<div className="sp-stack sp-gap-8" key={kind}>
				<ListItemHead label={title} amount={money(Math.abs(mine.reduce((n, i) => n + i.total, 0)))} />
				<div className="sp-stack sp-gap-8">{mine.map(render)}</div>
			</div>
		) : null
	})
	const head = title => <CardHeader name={title} aside={`Amounts in ${currencySymbol()}`} asideTone="note" />
	const nothing = text => <Empty><EmptyTitle>{text}</EmptyTitle></Empty>

	const placeRow = g => {
		if (g.saved) return line({
			key: g.id, group: g.id, title: g.text, subtitle: when(g), total: g.total,
			check: <Check checked disabled aria-label={`${g.text || 'This text'}, saved`} />,
			note: `Saved: ${g.saved}.`, ink: 'sp-ink-success', buttons: [small('Undo', () => undo(g), { 'data-opener': `undo:${g.id}` })]
		})
		const last = g.payments[g.payments.length - 1]
		return line({
			key: g.id, group: g.id, title: g.text, subtitle: when(g), total: g.total,
			check: <Check checked={picked.has(g.id)} aria-label={`Select ${g.text || 'this text'}`} onChange={() => toggle(setPicked, g.id)} />,
			note: g.noSheet ? `There is no budget for ${g.payments[0].date.slice(0, 4)}.` : g.suggestion ? `Close to ${g.suggestion.name} in amount.` : null,
			ink: g.noSheet ? 'sp-ink-danger' : 'sp-ink-warning',
			buttons: [
				g.suggestion ? small(`Use ${g.suggestion.name}`, () => saveGroups([g], g.suggestion)) : null,
				g.noSheet ? null : small('Pick from budget', () => setOpen(open === g.id ? null : g.id), { 'aria-expanded': open === g.id ? 'true' : 'false', 'data-opener': `pick:${g.id}` }),
				small('Always leave out', () => saveGroups([g], null)),
				small('Leave out once', () => saveGroups([g], null, true))
			],
			children: open === g.id
				? <RowPicker id={`bank-place-${g.id}`} label="All payments with this text go to" kind={g.kind} sheet={sheetOf(last)}
					month={monthOf(last)} disabled={busy} onPick={row => saveGroups([g], row)} onClose={() => setOpen(null)} />
				: null
		})
	}

	const statusText = p => {
		const month = long[monthOf(p)]
		switch (p.status) {
			case 'match': return `In the budget: ${p.line}`
			case 'amount': return p.budget == null ? `${p.line}: the budget has no amount for ${month}` : `${p.line}: the budget says ${money(p.budget)} for ${month}`
			case 'near': return `Close to ${p.line} in amount`
			case 'skip': return 'Always left out'
			case 'once': return 'Left out once'
			case 'year': return `There is no budget for ${p.date.slice(0, 4)}`
			default: return 'Not in the budget'
		}
	}
	const paymentRow = p => line({
		key: p.row, group: String(p.row), title: p.text, subtitle: `${dayShortMonth(p.date)}${dot}${statusText(p)}`, total: p.amount,
		buttons: p.status === 'year' ? null : [small(open === p.row ? 'Close' : 'Pick from budget', () => setOpen(open === p.row ? null : p.row), { 'aria-expanded': open === p.row ? 'true' : 'false', 'data-opener': `pick:${p.row}` })],
		children: open === p.row
			? <RowPicker id={`bank-payment-${p.row}`} label="All payments with this text go to" kind={kindOf(p)} sheet={sheetOf(p)}
				month={monthOf(p)} disabled={busy} onPick={row => saveGroups(groupPayments([p]), row)} onClose={() => setOpen(null)} />
			: null
	})

	const bulk = [
		oneKind ? small('Put them all on', () => setBulkOpen(!bulkOpen), { 'aria-expanded': bulkOpen ? 'true' : 'false', 'data-opener': 'bulk' }) : null,
		small('Always leave out', () => saveGroups(chosen, null)),
		small('Leave out once', () => saveGroups(chosen, null, true))
	]
	const current = VIEWS.find(v => v.value === view)
	const list = view === 'place'
		? (listed.length ? (
			<>
				{chosen.length ? null : <span className="sp-subtitle">Payments with the same text are shown together. Place a text once, and Spendly uses your choice for all of its payments, also in later files. Each choice is saved the moment you make it.</span>}
				{chosen.length ? (
					// a phone has no room for the three in the bar's one line, so they wrap under it
					<>
						<BulkBar loose count={`${plural(chosen.length, 'text')} selected`} onClear={() => setPicked(new Set())}>
							{touch ? null : bulk}
						</BulkBar>
						{touch ? actions(bulk) : null}
					</>
				) : null}
				{chosen.length && bulkOpen && oneKind ? (
					<RowPicker id="bank-bulk" label="Put them all on" kind={chosen[0].kind} sheet={sheetOf(chosen[0].payments.at(-1))}
						month={monthOf(chosen[0].payments.at(-1))} disabled={busy} onPick={row => saveGroups(chosen, row)}
						onClose={() => { setBulkOpen(false); document.querySelector('[data-opener="bulk"]')?.focus() }} />
				) : null}
				{groups.length ? (
					<Choice control={<Check checked={chosen.length === groups.length} indeterminate={chosen.length > 0 && chosen.length < groups.length}
						onChange={ev => setPicked(new Set(ev.target.checked ? groups.map(g => g.id) : []))} />}>Select every text</Choice>
				) : null}
				{sides(listed, placeRow)}
			</>
		) : nothing('Every payment is accounted for'))
		: view === 'left'
			? (leftOut.length
				? sides(leftOut, g => line({
					key: g.id, group: g.id, title: g.text, total: g.total,
					subtitle: `${when(g)}${dot}${g.payments[0].status === 'once' ? 'Left out once' : 'Always left out'}`,
					buttons: [small('Bring back', () => bringBack(g))]
				}))
				: nothing('You have not left any payment out'))
			: (() => {
				const shown = checked.filter(p => !current.shows || current.shows.includes(p.status)).map(p => ({ ...p, kind: kindOf(p), total: p.amount }))
				return shown.length ? sides(shown, paymentRow)
					: nothing(view === 'amount' ? 'No payment has another amount than the budget' : 'There are no payments')
			})()

	const writeNote = w => {
		const line = sheets.get(w.year)?.groups.flatMap(g => g.lines).find(l => l.id === w.lineId)
		const expected = line?.months[w.month - 1].expected
		if (w.now != null) return `The budget holds ${money(w.now)} now${fullStop()} Saving makes ${money(w.amount)} the real amount.`
		if (expected != null && cents(expected) !== cents(w.amount)) return `The budget expects ${money(expected)}${fullStop()} Saving makes ${money(w.amount)} the real amount.`
		return null
	}

	return (
		<>
			<Card variant="shell">
				<CardHeader name={file}
					aside={`${plural(payments.length, 'payment')} read${unread ? `${dot}${plural(unread, 'line')} could not be read` : ''}${dot}${longDate(dates[0])} to ${longDate(dates[dates.length - 1])}`} />
				<div className="sp-row-flex sp-gap-16 sp-wrap sp-top">
					<Stat label="Not in the budget" figure={plural(missing, 'payment')} />
					<Stat label="Same amount" figure={String(count(['match']))} meta="Found in the budget" />
					<Stat label="Other amount" figure={String(count(['amount']))} meta="The budget says another amount" />
					<Stat label="Left out" figure={String(count(LEFT_OUT))} meta="Always, or this time only" />
				</div>
				<div className="sp-stack sp-gap-8">
					<Gauge value={Math.round(accounted / payments.length * 100)} aria-label="Share of payments accounted for" />
					<div className="sp-row-flex sp-gap-12">
						<span className="sp-meta">{accounted} of {plural(payments.length, 'payment')} are accounted for</span>
						<span className="sp-grow" />
						{groups.length ? <span className="sp-meta">{plural(groups.length, 'text')} to place</span> : null}
					</div>
				</div>
			</Card>
			<Card>
				{head(current.label)}
				{list}
			</Card>
			{writes.length ? (
				<Card footer={<Button key="save" disabled={writing || !toWrite.length} onClick={saveReal}>
					{writing ? 'Saving…' : `Save ${plural(toWrite.length, 'amount')}`}</Button>}>
					{head('Save to the budget')}
					<span className="sp-subtitle">These amounts from the bank are found on a budget item, but are not yet the real amount for their month. Saving writes them into the budget. Payments that still need a place are not saved.</span>
					<Choice control={<Check id="bank-every-amount" checked={!skipped} indeterminate={skipped > 0 && skipped < writes.length}
						onChange={ev => setLeaveAlone(new Set(ev.target.checked ? [] : writes.map(w => w.id)))} />}>Select every amount</Choice>
					{sides(writes.map(w => ({ ...w, total: w.amount })), w => line({
						key: w.id, title: w.name, total: w.amount,
						subtitle: `${capitalised(long[w.month - 1])} ${w.year}${dot}${w.group}${w.count > 1 ? `${dot}${plural(w.count, 'payment')}` : ''}`,
						check: <Check checked={!leaveAlone.has(w.id)} aria-label={`Select ${w.name}`} onChange={() => toggle(setLeaveAlone, w.id)} />,
						note: writeNote(w), ink: 'sp-ink-warning'
					}))}
				</Card>
			) : null}
		</>
	)
}
