import { useEffect, useMemo, useState } from 'react'
import { Page } from '../components/Shell.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState, KpiCard } from '../components/Card.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { DropZone } from '../components/FileInput.jsx'
import { CheckRow, Field, Segmented } from '../components/Form.jsx'
import { Icon } from '../components/Icon.jsx'
import { Sep } from '../components/Sep.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import { Meter } from '../components/Viz.jsx'
import { useToast } from '../components/Toast.jsx'
import { KINDS, figure, join } from '../components/BudgetCells.jsx'
import { BANK_FILES } from '../components/fileKinds.js'
import { cachedFetch, useApi } from '../api/useApi.js'
import { activeCurrency, longDate, monthNames, plural, shortDate } from '../api/format.js'
import { failureMessage, forgetBankLink, getBankLinks, getBudgetYear, saveBankLink } from '../api/client.js'
import {
	DATE_FORMATS, checkPayments, dateFormatsFor, guessColumns, hasHeader, kindOf, onceKey, parseCsv, readPayments, readText
} from '../api/bankStatement.js'

/* A bank's CSV export checked against the budget: every payment is looked up in its year's
   sheet, and the ones no row accounts for are listed. The file is read here and never sent. */

const NONE = 'none'
const ONCE = 'once'
const TO_PLACE = ['missing', 'near', 'year']
const LEFT_OUT = ['skip', 'once']
const SHOWN = { 'To place': TO_PLACE, 'Other amount': ['amount'], 'Left out': LEFT_OUT, All: null }
const VIEWS = Object.keys(SHOWN)

// The rows a payment of this kind can go to, over every year the file covers, as picker groups.
const rowChoices = (sheets, kind, extra) => {
	const byGroup = new Map()
	for (const sheet of sheets) for (const g of sheet.groups.filter(g => g.kind === kind)) {
		const names = byGroup.get(g.name) ?? new Set()
		g.lines.forEach(l => names.add(l.name))
		byGroup.set(g.name, names)
	}
	return [
		...[...byGroup].map(([heading, names]) => ({ heading, options: [...names].map(n => ({ id: n, label: n })) })),
		{ heading: 'Not in the budget', options: extra }
	].filter(g => g.options.length)
}

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
		const hints = g.payments.filter(p => p.status === 'near').map(p => p.line)
		const suggestion = hints.sort((a, b) => hints.filter(h => h === b).length - hints.filter(h => h === a).length)[0] ?? null
		const dates = g.payments.map(p => p.date).sort()
		return { ...g, suggestion, total: g.payments.reduce((n, p) => n + p.amount, 0), first: dates[0], last: dates[dates.length - 1],
			noSheet: g.payments.every(p => p.status === 'year') }
	}).sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
}

const when = g => (g.payments.length === 1 ? shortDate(g.first)
	: g.first === g.last ? `${plural(g.payments.length, 'payment')} on ${shortDate(g.first)}`
		: `${plural(g.payments.length, 'payment')}, ${shortDate(g.first)} to ${shortDate(g.last)}`)

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

// What Spendly can read from a column of the file. Each is taken by one column at most.
const ROLES = [
	{ id: 'date', label: 'Date' },
	{ id: 'text', label: 'Text' },
	{ id: 'amount', label: 'Amount' },
	{ id: 'out', label: 'Money out, as its own column' },
	{ id: NONE, label: 'Not used' }
]

function Columns({ rows, mapping, dateFits, dateFormat, onChange, children }) {
	const body = mapping.header ? rows.slice(1) : rows
	const width = Math.max(...rows.map(r => r.length))
	const cut = text => (text.length > 40 ? text.slice(0, 39) + '…' : text)
	const roleOf = i => ROLES.find(r => mapping[r.id] === i) ?? ROLES[ROLES.length - 1]
	const set = (i, role) => {
		const patch = Object.fromEntries(ROLES.filter(r => r.id !== NONE && mapping[r.id] === i).map(r => [r.id, null]))
		if (role !== NONE) patch[role] = i
		onChange(patch)
	}
	return (
		<div className="bank-columns">
			{children}
			<CheckRow id="bank-header" checked={mapping.header} label="The first line of the file holds column names"
				onChange={header => onChange({ header })} />
			<div className="bank-map-table">
				<div className="bank-map-head" aria-hidden="true">
					<span className="section-label">File</span>
					<span className="section-label">Spendly</span>
				</div>
				<ol className="bank-map">
					{Array.from({ length: width }, (_, i) => (
						<li key={i} className={roleOf(i).id === NONE ? 'bank-map-row is-unused' : 'bank-map-row'}>
							<div className="bank-map-file">
								<span className="panel-heading">
									{mapping.header && rows[0][i] ? rows[0][i] : `Column ${i + 1}`}
								</span>
								<ul className="bank-map-samples">
									{body.slice(0, 3).map((r, n) => <li key={n}>{r[i] ? cut(r[i]) : '(empty)'}</li>)}
								</ul>
							</div>
							<div className="bank-map-spendly">
								<Field label="Mapped to" htmlFor={`bank-column-${i}`}>
									<div className="bank-map-pick">
										<Icon name="chevronRight" className="icon bank-map-arrow" aria-hidden="true" />
										<Combobox id={`bank-column-${i}`} label={`Column ${i + 1} is mapped to`} pickOnly
											value={roleOf(i).label} groups={[{ heading: '', options: ROLES }]}
											onSelect={o => set(i, o.id)} />
									</div>
								</Field>
								{mapping.date !== i || dateFits.length === 1 ? null : dateFits.length ? (
									<Field label="Every date in the file can be read two ways. Which is right?" htmlFor="bank-date-format">
										<Combobox id="bank-date-format" label="How the date is written" pickOnly
											value={DATE_FORMATS.find(f => f.id === dateFormat)?.label ?? ''}
											groups={[{ heading: '', options: DATE_FORMATS.filter(f => dateFits.includes(f.id)).map(f => ({ id: f.id, label: f.label })) }]}
											onSelect={o => onChange({ dateFormat: o.id })} />
									</Field>
								) : (
									<p className="field-help bank-map-problem">These are not dates Spendly can read.</p>
								)}
							</div>
						</li>
					))}
				</ol>
			</div>
			<p className="field-help">Money out is read as a minus amount. Choose a column as money out only when your bank shows it
				in a column of its own.</p>
		</div>
	)
}

const statusText = (p, months) => {
	const month = months[Number(p.date.slice(5, 7)) - 1]
	switch (p.status) {
		case 'match': return `In the budget: ${p.line}`
		case 'amount': return p.budget == null
			? `${p.line}: the budget has no amount for ${month}`
			: `${p.line}: the budget says ${figure(p.budget)} for ${month}`
		case 'near': return `Maybe ${p.line}? The budget says ${figure(p.budget)} for ${month}`
		case 'skip': return 'Not part of the budget'
		case 'once': return 'One-time payment, left out of the budget'
		case 'year': return `There is no budget for ${p.date.slice(0, 4)}`
		default: return 'Not in the budget'
	}
}

/** Where a payment's text goes: a row of the right kind in its year, or none. */
function Place({ payment, sheet, onSave, onForget, onClose }) {
	const kind = kindOf(payment)
	const groups = [
		...(sheet?.groups ?? []).filter(g => g.kind === kind)
			.map(g => ({ heading: g.name, options: g.lines.map(l => ({ id: l.name, label: l.name })) })),
		{ heading: 'Not in the budget', options: [
			{ id: ONCE, label: 'One-time payment, only this one' },
			{ id: NONE, label: 'Not part of the budget, every time' }] }
	].filter(g => g.options.length)
	const current = payment.placed === 'once' ? 'One-time payment, only this one'
		: payment.placed ? (payment.status === 'skip' ? 'Not part of the budget, every time' : payment.line) : ''
	return (
		<div className="filter-section bank-place">
			<Field label="This payment belongs to" htmlFor={`bank-place-${payment.row}`}
				help="A budget item or 'every time' is used for all payments with the same text, now and in later files. A one-time payment is only this one.">
				<Combobox id={`bank-place-${payment.row}`} label="This payment belongs to" pickOnly value={current}
					placeholder={kind === 'income' ? 'Pick from your income' : 'Pick from your costs'} groups={groups}
					onSelect={o => onSave(o.id === NONE ? null : o.id, o.id === ONCE)} />
			</Field>
			<div className="bank-place-actions">
				{!payment.placed && payment.line ? (
					<ButtonLink onClick={() => onSave(payment.line)}>ALWAYS USE {payment.line.toLocaleUpperCase('da')}</ButtonLink>
				) : null}
				{payment.placed ? <ButtonLink onClick={onForget}>FORGET MY CHOICE</ButtonLink> : null}
				<ButtonLink onClick={onClose}>CLOSE</ButtonLink>
			</div>
		</div>
	)
}

/** Money in and money out apart, each under its own total, the way a month of the budget shows them. */
function Sides({ items, render }) {
	return KINDS.map(({ kind, title }) => {
		const mine = items.filter(i => i.kind === kind)
		return mine.length ? (
			<div key={kind} className="budget-month-side">
				<div className="budget-month-side-head">
					<span>{title}</span>
					<b>{figure(Math.abs(mine.reduce((n, i) => n + i.total, 0)))}</b>
				</div>
				<ul className="bank-lines">{mine.map(render)}</ul>
			</div>
		) : null
	})
}

/** A line of the list: its text, when, and the amount, with what can be done to it underneath. */
function Line({ className, check, name, meta, total, note, noteTone, actions, children }) {
	const Head = check ? 'label' : 'div'
	return (
		<li className={join('bank-line', check && 'has-check', className)}>
			<Head className="bank-line-head">
				{check}
				<span className="bank-line-text">
					<span className="bank-line-name">{name || '(no text)'}</span>
					<span className="bank-line-meta">{meta}</span>
				</span>
				<span className="bank-line-amount">{figure(Math.abs(total))}</span>
			</Head>
			{note ? <p className={join('bank-line-note', noteTone)}>{note}</p> : null}
			{actions ? <div className="bank-line-actions">{actions}</div> : null}
			{children}
		</li>
	)
}

export default function BudgetCheck() {
	const toast = useToast()
	const [file, setFile] = useState(null)
	const [rows, setRows] = useState(null)
	const [mapping, setMapping] = useState(null)
	const [showColumns, setShowColumns] = useState(false)
	const [sheets, setSheets] = useState(null)
	const [filter, setFilter] = useState('To place')
	const [picked, setPicked] = useState(() => new Set())
	const [bulkBusy, setBulkBusy] = useState(false)
	const [open, setOpen] = useState(null)
	const saved = useApi(getBankLinks)
	const [links, setLinks] = useState(null)
	const months = useMemo(() => monthNames('long'), [])

	useEffect(() => { if (saved.data) setLinks(saved.data) }, [saved.data])

	const width = rows ? Math.max(...rows.map(r => r.length)) : 0

	// A file of a width seen before opens on its remembered columns, folded away.
	const read = async ([chosen]) => {
		try {
			const found = parseCsv(await readText(chosen))
			if (!found.length) { toast(`${chosen.name} is empty.`, 'negative'); return }
			const header = hasHeader(found)
			const remembered = rememberedMapping(Math.max(...found.map(r => r.length)))
			setFile(chosen.name)
			setRows(found)
			setMapping(remembered ?? { header, ...guessColumns(found, header) })
			setShowColumns(!remembered)
			setFilter('To place')
			setPicked(new Set())
			setOpen(null)
		} catch (e) {
			toast(`${chosen.name} could not be read. ${e.message}`, 'negative')
		}
	}
	const another = () => { setFile(null); setRows(null); setMapping(null); setPicked(new Set()); setOpen(null) }

	const change = patch => setMapping(m => {
		const next = { ...m, ...patch }
		rememberMapping(width, next)
		return next
	})
	// Closing the columns accepts them, so the next file of this width opens without them.
	const toggleColumns = () => {
		if (showColumns) rememberMapping(width, mapping)
		setShowColumns(!showColumns)
	}

	/* The date format comes from the whole column. It is asked only when every date reads both ways. */
	const dateFits = useMemo(() => (mapping?.date == null ? []
		: dateFormatsFor((mapping.header ? rows.slice(1) : rows).map(r => r[mapping.date] ?? ''))), [rows, mapping])
	const dateFormat = dateFits.includes(mapping?.dateFormat) ? mapping.dateFormat : dateFits[0] ?? 'dmy'
	const ready = mapping && mapping.date != null && mapping.text != null && mapping.amount != null
	const { payments, unread } = useMemo(() => (ready ? readPayments(rows, { ...mapping, dateFormat }) : { payments: [], unread: [] }),
		[ready, rows, mapping, dateFormat])
	const years = useMemo(() => [...new Set(payments.map(p => Number(p.date.slice(0, 4))))].sort(), [payments])

	useEffect(() => {
		let live = true
		setSheets(null)
		Promise.all(years.map(y => cachedFetch(getBudgetYear, [y]).catch(e => {
			if (e?.status === 404) return null
			throw e
		}))).then(found => {
			if (live) setSheets(new Map(years.map((y, i) => [y, found[i]]).filter(([, s]) => s)))
		}).catch(e => {
			if (live) toast(failureMessage(e, 'The budget could not be read.'), 'negative')
		})
		return () => { live = false }
	}, [years, toast])

	const checked = useMemo(() => (sheets && links ? checkPayments(payments, sheets, links) : null),
		[payments, sheets, links])

	const place = async (payment, line, once) => {
		try {
			if (payment.placed === 'once' && !once) await forgetBankLink({ pattern: onceKey(payment), kind: kindOf(payment) })
			setLinks(await saveBankLink({ pattern: once ? onceKey(payment) : payment.key, kind: kindOf(payment), line: once ? null : line }))
			setOpen(null)
			toast(once ? 'This payment is marked as a one-time payment.'
				: line ? `Payments with this text now go to ${line}.` : 'Payments with this text are now left out of the check.')
		} catch (e) {
			toast(failureMessage(e, 'Your choice was not saved.'), 'negative')
		}
	}
	const forget = async payment => {
		try {
			setLinks(await forgetBankLink({ pattern: payment.placed === 'once' ? onceKey(payment) : payment.key, kind: kindOf(payment) }))
			setOpen(null)
		} catch (e) {
			toast(failureMessage(e, 'Your choice was not removed.'), 'negative')
		}
	}

	/* A group placed on a row, or outside the budget every time, is one saved choice for its text. A group
	   marked one-time is one choice per payment in it, so the text teaches nothing for later files. */
	const saveGroups = async (list, line, once) => {
		setBulkBusy(true)
		try {
			let latest = null
			for (const g of list) {
				if (once) for (const p of g.payments) latest = await saveBankLink({ pattern: onceKey(p), kind: g.kind, line: null })
				else latest = await saveBankLink({ pattern: g.key, kind: g.kind, line })
			}
			if (latest) setLinks(latest)
			const n = list.reduce((sum, g) => sum + g.payments.length, 0)
			setPicked(new Set())
			setOpen(null)
			toast(`${plural(n, 'payment')} ${once ? 'marked as one-time' : line ? `placed on ${line}` : 'left out of the budget'}.`)
		} catch (e) {
			toast(failureMessage(e, 'Not every choice was saved.'), 'negative')
			saved.refresh()
		} finally {
			setBulkBusy(false)
		}
	}

	// Takes back every choice that left this text's payments out: its one-time marks, or its rule.
	const bringBack = async g => {
		setBulkBusy(true)
		try {
			let latest = null
			for (const p of g.payments) latest = await forgetBankLink({ pattern: p.placed === 'once' ? onceKey(p) : p.key, kind: g.kind })
			if (latest) setLinks(latest)
			toast(`${plural(g.payments.length, 'payment')} brought back to the list.`)
		} catch (e) {
			toast(failureMessage(e, 'Not every payment was brought back.'), 'negative')
			saved.refresh()
		} finally {
			setBulkBusy(false)
		}
	}

	const count = status => checked?.filter(p => status.includes(p.status)) ?? []
	const ofAll = status => `${count(status).length} of ${payments.length}`
	const missing = count(TO_PLACE)
	const shown = (checked ?? []).filter(p => !SHOWN[filter] || SHOWN[filter].includes(p.status))
		.map(p => ({ ...p, kind: kindOf(p), total: p.amount }))
	const groups = useMemo(() => groupPayments(checked?.filter(p => TO_PLACE.includes(p.status)) ?? []), [checked])
	const leftOut = useMemo(() => groupPayments(checked?.filter(p => LEFT_OUT.includes(p.status)) ?? []), [checked])
	const chosen = groups.filter(g => picked.has(g.id))
	const chosenKinds = new Set(chosen.map(g => g.kind))
	const sheetList = sheets ? [...sheets.values()] : []
	const accounted = checked ? checked.length - missing.length : 0
	const dates = payments.map(p => p.date).sort()
	const toggle = id => setPicked(set => {
		const next = new Set(set)
		if (next.has(id)) next.delete(id); else next.add(id)
		return next
	})

	const toPlace = groups.length ? (
		<>
			<p className="field-help bank-hint">Payments with the same text are shown together. Place a text once,
				and Spendly uses your choice for all of its payments, also in later files.</p>
			{chosen.length ? (
				<div className="filter-section bank-bulk" aria-label="Selected texts">
					<span className="panel-heading">{plural(chosen.length, 'text')} selected, {plural(chosen.reduce((n, g) => n + g.payments.length, 0), 'payment')}</span>
					{chosenKinds.size === 1 && !chosen.some(g => g.noSheet) ? (
						<Field label="Put them all on" htmlFor="bank-bulk-row">
							<Combobox id="bank-bulk-row" label="Put them all on" pickOnly value=""
								placeholder={chosen[0].kind === 'income' ? 'Pick from your income' : 'Pick from your costs'}
								groups={rowChoices(sheetList, chosen[0].kind, [])}
								onSelect={o => !bulkBusy && saveGroups(chosen, o.id)} />
						</Field>
					) : (
						<p className="field-help">Money in and money out go to different budget items, so only the choices below apply to all of them.</p>
					)}
					<div className="bank-place-actions">
						<ButtonLink disabled={bulkBusy} onClick={() => saveGroups(chosen, null, true)}>ONE-TIME</ButtonLink>
						<ButtonLink disabled={bulkBusy} onClick={() => saveGroups(chosen, null)}>NOT IN THE BUDGET</ButtonLink>
						<ButtonLink onClick={() => setPicked(new Set())}>CLEAR</ButtonLink>
					</div>
				</div>
			) : null}
			<CheckRow id="bank-pick-all" checked={chosen.length === groups.length} label="Select every text"
				onChange={all => setPicked(new Set(all ? groups.map(g => g.id) : []))} />
			<Sides items={groups} render={g => (
				<Line key={g.id} className={picked.has(g.id) ? 'is-picked' : null} name={g.text} meta={when(g)} total={g.total}
					check={<input type="checkbox" className="check-box" checked={picked.has(g.id)} onChange={() => toggle(g.id)}
						aria-label={`Select ${g.text || 'this text'}`} />}
					note={g.noSheet ? `There is no budget for ${g.payments[0].date.slice(0, 4)}.`
						: g.suggestion ? `Close to ${g.suggestion} in amount.` : null}
					noteTone={g.noSheet ? 'is-negative' : 'is-warn'}
					actions={<>
						{g.suggestion ? (
							<ButtonLink disabled={bulkBusy} onClick={() => saveGroups([g], g.suggestion)}>
								USE {g.suggestion.toLocaleUpperCase('da')}</ButtonLink>
						) : null}
						{g.noSheet ? null : (
							<ButtonLink aria-expanded={open === g.id} onClick={() => setOpen(open === g.id ? null : g.id)}>
								PICK FROM BUDGET</ButtonLink>
						)}
						<ButtonLink disabled={bulkBusy} onClick={() => saveGroups([g], null, true)}>ONE-TIME</ButtonLink>
						<ButtonLink disabled={bulkBusy} onClick={() => saveGroups([g], null)}>NOT IN THE BUDGET</ButtonLink>
					</>}>
					{open === g.id ? (
						<div className="filter-section bank-place">
							<Field label="All payments with this text go to" htmlFor={`bank-group-${g.id}`}>
								<Combobox id={`bank-group-${g.id}`} label="All payments with this text go to" pickOnly value=""
									placeholder={g.kind === 'income' ? 'Pick from your income' : 'Pick from your costs'}
									groups={rowChoices(sheetList, g.kind, [])}
									onSelect={o => !bulkBusy && saveGroups([g], o.id)} />
							</Field>
						</div>
					) : null}
				</Line>
			)} />
		</>
	) : <EmptyState icon="check"><p>Every payment is accounted for.</p></EmptyState>

	const left = leftOut.length ? (
		<Sides items={leftOut} render={g => (
			<Line key={g.id} name={g.text} total={g.total}
				meta={<>{when(g)}<Sep />{g.payments[0].status === 'once' ? 'One-time' : 'Not in the budget, every time'}</>}
				actions={<ButtonLink disabled={bulkBusy} onClick={() => bringBack(g)}>BRING BACK</ButtonLink>} />
		)} />
	) : <EmptyState icon="check"><p>You have not left any payment out.</p></EmptyState>

	const each = shown.length ? (
		<Sides items={shown} render={p => (
			<Line key={p.row} className={`is-${p.status}`} name={p.text} total={p.amount}
				meta={<>{shortDate(p.date)}<Sep /><span className="bank-status">{statusText(p, months)}</span></>}
				actions={<ButtonLink aria-expanded={open === p.row} onClick={() => setOpen(open === p.row ? null : p.row)}>
					{p.placed || p.status === 'match' || p.status === 'amount' ? 'CHANGE' : 'PLACE'}</ButtonLink>}>
				{open === p.row ? (
					<Place payment={p} sheet={sheets.get(Number(p.date.slice(0, 4)))}
						onSave={(line, once) => place(p, line, once)} onForget={() => forget(p)} onClose={() => setOpen(null)} />
				) : null}
			</Line>
		)} />
	) : <EmptyState icon="check"><p>{filter === 'Other amount' ? 'No payment has another amount than the budget.'
		: 'There are no payments.'}</p></EmptyState>

	return (
		<Page>
			<div className="page-grid">
				{!rows ? (
					<Card aria-label="Bank statement">
						<CardHeader title="Bank statement" />
						<CardDivider />
						<CardBody>
							<p className="card-lead">
								Choose the file your bank exports, in CSV format. Each payment is looked up in the budget
								for its year and month. The file stays on this device. Only the choices you make are saved.
							</p>
							<DropZone kind={BANK_FILES} multiple={false} label="Choose the bank file" onFiles={read}
								hint="Drop the bank file here" action="CHOOSE A CSV FILE" />
						</CardBody>
					</Card>
				) : (
					<>
						<div className="budget-bar bank-bar">
							{ready && payments.length ? (
								<>
									<div className="budget-views">
										<Segmented label="Show" options={VIEWS} value={filter}
											onChange={f => { setFilter(f); setOpen(null); setPicked(new Set()) }} />
									</div>
									<Button variant="pill" icon={showColumns ? 'close' : 'document'} aria-pressed={showColumns}
										onClick={toggleColumns}>{showColumns ? 'CLOSE COLUMNS' : 'COLUMNS'}</Button>
								</>
							) : null}
							<Button variant="pill" icon="upload" onClick={another}>ANOTHER FILE</Button>
						</div>

						{showColumns || !ready || !payments.length ? (
							<Card aria-label="Columns">
								<CardHeader title="Columns"><span className="budget-key">{file}</span></CardHeader>
								<CardDivider />
								<CardBody>
									<Columns rows={rows} mapping={mapping} dateFits={dateFits} dateFormat={dateFormat} onChange={change}>
										<p className="card-lead">Your file has {plural(width, 'column')}. What does each one hold?</p>
										{!ready ? <p className="field-help bank-map-problem">Tell Spendly which column holds the date, the text and the amount.</p>
											: !payments.length ? <p className="field-help bank-map-problem">No payments were found with these columns.</p> : null}
									</Columns>
								</CardBody>
							</Card>
						) : null}

						{!ready || !payments.length ? null : !checked ? <SkeletonCard lines={8} /> : (
							<>
								<div className="stats-hero-row budget-hero-row bank-hero-row">
									<section className="card card-ai stats-hero budget-hero" aria-label="The check">
										<div className="bank-hero-head">
											<span className="panel-heading bank-hero-file">{file}</span>
											<span className="stats-hero-caption">{longDate(dates[0])} to {longDate(dates[dates.length - 1])}</span>
										</div>
										<div>
											<span className="stats-hero-caption">Not in the budget</span>
											<div className="stats-hero-total tabular-figures">{plural(missing.length, 'payment')}</div>
										</div>
										<div className="budget-hero-use">
											<Meter fill={Math.round(accounted / payments.length * 100)}
												ariaLabel={`${accounted} of ${payments.length} payments are accounted for.`} />
											<p className="stats-hero-caption">
												{accounted} of {plural(payments.length, 'payment')} are accounted for
												{groups.length ? <><Sep />{plural(groups.length, 'text')} to place</> : null}</p>
											{unread.length ? (
												<p className="stats-hero-caption">{plural(unread.length, 'line')} of the file had no date or amount
													that could be read, so {unread.length === 1 ? 'it is' : 'they are'} left out.</p>
											) : null}
										</div>
									</section>
									<div className="kpi-row">
										<KpiCard label="Same amount" value={ofAll(['match'])} note="Found in the budget" />
										<KpiCard label="Other amount" value={ofAll(['amount'])} note="The budget says another amount" />
										<KpiCard label="Suggested" value={ofAll(['near'])} note="Close to a budget item" />
										<KpiCard label="Left out" value={ofAll(LEFT_OUT)} note="One-time, or not in the budget" />
									</div>
								</div>

								<Card aria-label={filter}>
									<CardHeader title={filter}>
										<span className="budget-key">Amounts in {activeCurrency().label}</span>
									</CardHeader>
									<CardDivider />
									<CardBody className="bank-panel">
										{filter === 'To place' ? toPlace : filter === 'Left out' ? left : each}
									</CardBody>
								</Card>
							</>
						)}
					</>
				)}
			</div>
		</Page>
	)
}
