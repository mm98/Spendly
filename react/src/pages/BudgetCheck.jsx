import { Fragment, useEffect, useMemo, useState } from 'react'
import { Page } from '../components/Shell.jsx'
import { Card, CardBody, EmptyState } from '../components/Card.jsx'
import { ButtonLink, IconButton } from '../components/Button.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { DropZone } from '../components/FileInput.jsx'
import { CheckRow, Field, FilterSection, Segmented } from '../components/Form.jsx'
import { Icon } from '../components/Icon.jsx'
import { EntryRow, SummaryRow } from '../components/Rows.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import { ProgressBar } from '../components/Viz.jsx'
import { useToast } from '../components/Toast.jsx'
import { BANK_FILES } from '../components/fileKinds.js'
import { cachedFetch, useApi } from '../api/useApi.js'
import { currency, monthNames, plural, shortDate } from '../api/format.js'
import { failureMessage, forgetBankLink, getBankLinks, getBudgetYear, saveBankLink } from '../api/client.js'
import {
	DATE_FORMATS, NEAR, checkPayments, guessColumns, guessDateFormat, hasHeader, kindOf, onceKey, parseCsv, readPayments, readText
} from '../api/bankStatement.js'

/* A bank's CSV export checked against the budget: every payment is looked up in its year's
   sheet, and the ones no row accounts for are listed. The file is read here and never sent. */

const NONE = 'none'
const ONCE = 'once'
const TO_PLACE = ['missing', 'near', 'year']
const SHOWN = { 'To place': TO_PLACE, 'Other amount': ['amount'], All: null }
const FILTERS = Object.keys(SHOWN)

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

function Columns({ rows, mapping, onChange }) {
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
		<FilterSection>
			<span className="panel-heading">Your file has {plural(width, 'column')}. What does each one hold?</span>
			<CheckRow id="bank-header" checked={mapping.header} label="The first line of the file holds column names"
				onChange={header => onChange({ header })} />
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
							<span className="field-help bank-map-phone-label">Spendly reads it as</span>
							<div className="bank-map-pick">
								<Icon name="chevronRight" className="icon bank-map-arrow" aria-hidden="true" />
								<Combobox id={`bank-column-${i}`} label={`Spendly reads column ${i + 1} as`} pickOnly
									value={roleOf(i).label} groups={[{ heading: '', options: ROLES }]}
									onSelect={o => set(i, o.id)} />
							</div>
							{mapping.date === i ? (
								<Field label="The date is written" htmlFor="bank-date-format">
									<Combobox id="bank-date-format" label="The date is written" pickOnly
										value={DATE_FORMATS.find(f => f.id === mapping.dateFormat)?.label ?? ''}
										groups={[{ heading: '', options: DATE_FORMATS.map(f => ({ id: f.id, label: f.label })) }]}
										onSelect={o => onChange({ dateFormat: o.id })} />
								</Field>
							) : null}
						</div>
					</li>
				))}
			</ol>
			<p className="field-help">Money out is read as a minus amount. Choose a column as money out only when your bank shows it
				in a column of its own.</p>
		</FilterSection>
	)
}

const statusText = (p, months) => {
	const month = months[Number(p.date.slice(5, 7)) - 1]
	switch (p.status) {
		case 'match': return `In the budget: ${p.line}`
		case 'amount': return p.budget == null
			? `${p.line}: the budget has no amount for ${month}`
			: `${p.line}: the budget says ${currency(p.budget)} for ${month}`
		case 'near': return `Maybe ${p.line}? The budget says ${currency(p.budget)} for ${month}`
		case 'skip': return 'Not part of the budget'
		case 'once': return 'One-time payment'
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
				help="A row or 'every time' is used for all payments with the same text, now and in later files. A one-time payment is only this one.">
				<Combobox id={`bank-place-${payment.row}`} label="This payment belongs to" pickOnly value={current}
					placeholder={kind === 'income' ? 'Choose an income row' : 'Choose a cost row'} groups={groups}
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

export default function BudgetCheck() {
	const toast = useToast()
	const [file, setFile] = useState(null)
	const [rows, setRows] = useState(null)
	const [mapping, setMapping] = useState(null)
	const [sheets, setSheets] = useState(null)
	const [filter, setFilter] = useState('To place')
	const [picked, setPicked] = useState(() => new Set())
	const [bulkBusy, setBulkBusy] = useState(false)
	const [open, setOpen] = useState(null)
	const saved = useApi(getBankLinks)
	const [links, setLinks] = useState(null)
	const months = useMemo(() => monthNames('long'), [])

	useEffect(() => { if (saved.data) setLinks(saved.data) }, [saved.data])

	const read = async ([picked]) => {
		try {
			const found = parseCsv(await readText(picked))
			if (!found.length) { toast(`${picked.name} is empty.`, 'negative'); return }
			const width = Math.max(...found.map(r => r.length))
			const header = hasHeader(found)
			const guess = { header, ...guessColumns(found, header) }
			guess.dateFormat = guessDateFormat(found.slice(header ? 1 : 0, 21).map(r => r[guess.date] ?? ''))
			setFile(picked.name)
			setRows(found)
			setMapping(rememberedMapping(width) ?? guess)
			setOpen(null)
		} catch (e) {
			toast(`${picked.name} could not be read. ${e.message}`, 'negative')
		}
	}

	const change = patch => setMapping(m => {
		const next = { ...m, ...patch }
		rememberMapping(Math.max(...rows.map(r => r.length)), next)
		return next
	})

	const ready = mapping && mapping.date != null && mapping.text != null && mapping.amount != null
	const { payments, unread } = useMemo(() => (ready ? readPayments(rows, mapping) : { payments: [], unread: [] }),
		[ready, rows, mapping])
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

	const count = status => checked?.filter(p => status.includes(p.status)) ?? []
	const tally = list => currency(list.reduce((n, p) => n + p.amount, 0))
	const missing = count(['missing', 'near', 'year'])
	const near = count(['near'])
	const differs = count(['amount'])
	const shown = checked?.filter(p => !SHOWN[filter] || SHOWN[filter].includes(p.status)) ?? []
	const groups = useMemo(() => groupPayments(checked?.filter(p => TO_PLACE.includes(p.status)) ?? []), [checked])
	const chosen = groups.filter(g => picked.has(g.id))
	const chosenKinds = new Set(chosen.map(g => g.kind))
	const sheetList = sheets ? [...sheets.values()] : []
	const accounted = checked ? checked.length - missing.length : 0
	const toggle = id => setPicked(set => {
		const next = new Set(set)
		if (next.has(id)) next.delete(id); else next.add(id)
		return next
	})

	return (
		<Page>
			<div className="order-list-column">
				<Card aria-label="Check a bank statement">
					<CardBody variant="card-body-page">
						<div className="card-headline">Check a bank statement</div>
						<p className="card-lead">
							Choose the file your bank exports, in CSV format. Each payment is looked up in the budget
							for its year and month. The file stays on this device. Only the choices you make below are saved.
						</p>
						{file ? (
							<p className="field-help bank-file">{file}<ButtonLink onClick={() => { setFile(null); setRows(null); setMapping(null) }}>
								CHOOSE ANOTHER FILE</ButtonLink></p>
						) : (
							<DropZone kind={BANK_FILES} multiple={false} label="Choose the bank file" onFiles={read}
								hint="Drop the bank file here" action="CHOOSE A CSV FILE" />
						)}
						{rows ? <Columns rows={rows} mapping={mapping} onChange={change} /> : null}
					</CardBody>
				</Card>

				{!rows ? null : !ready ? (
					<Card><CardBody variant="card-body-page">
						<EmptyState icon="alert"><p>Tell Spendly which column in your file holds the date, the text and the amount.</p></EmptyState>
					</CardBody></Card>
				) : !checked ? <SkeletonCard /> : (
					<Card aria-label="The check">
						<CardBody variant="card-body-page">
							<div className="card-headline">
								{!payments.length ? 'No payments were found in the file'
									: missing.length ? `${plural(missing.length, 'payment')} of ${payments.length} ${missing.length === 1 ? 'is' : 'are'} not in the budget`
										: 'No payment is missing from the budget'}
							</div>
							<p className="card-lead">
								{payments.length ? `From ${shortDate(payments.reduce((a, p) => (p.date < a ? p.date : a), payments[0].date))} to ${shortDate(payments.reduce((a, p) => (p.date > a ? p.date : a), payments[0].date))}. ` : ''}
								A payment is in the budget when a row of the same kind has the same amount in the same month,
								when the row&apos;s name is in the payment&apos;s text, or when you placed it yourself.
								A payment within {NEAR * 100} % of a row&apos;s amount is suggested as that row, and counts once you confirm it.
								{unread.length ? ` ${plural(unread.length, 'line')} of the file had no date or amount that could be read, so ${unread.length === 1 ? 'it is' : 'they are'} left out.` : ''}
							</p>
							<div className="bank-summary">
								<SummaryRow label={`Same amount as the budget: ${count(['match']).length}`} value={tally(count(['match']))} />
								<SummaryRow label={`Other amount than the budget: ${differs.length}`} value={tally(differs)} />
								<SummaryRow label={`Not in the budget: ${missing.length}`} value={tally(missing)} />
								{near.length ? (
									<SummaryRow label={`Of those, close to a row's amount: ${near.length}`} value={tally(near)} />
								) : null}
								{count(['skip', 'once']).length ? (
									<SummaryRow label={`Left out by you: ${count(['skip', 'once']).length}`} value={tally(count(['skip', 'once']))} />
								) : null}
							</div>
							<div className="bank-progress">
								<ProgressBar indeterminate={false} label="Payments accounted for"
									value={payments.length ? Math.round((accounted / payments.length) * 100) : 100} />
								<span className="field-help">{accounted} of {plural(payments.length, 'payment')} are accounted for.
									{groups.length ? ` ${plural(groups.length, 'text')} left to place.` : ''}</span>
							</div>
							<Segmented label="Show" options={FILTERS} value={filter}
								onChange={f => { setFilter(f); setOpen(null); setPicked(new Set()) }} />
							{filter === 'To place' ? (
								groups.length ? (
									<>
										<p className="field-help bank-hint">Payments with the same text are shown together. Place a text once,
											and Spendly uses your choice for all of its payments, also in later files.</p>
										{chosen.length ? (
											<div className="filter-section bank-bulk" aria-label="Selected texts">
												<span className="panel-heading">{plural(chosen.length, 'text')} selected, {plural(chosen.reduce((n, g) => n + g.payments.length, 0), 'payment')}</span>
												{chosenKinds.size === 1 && !chosen.some(g => g.noSheet) ? (
													<Field label="Put them all on" htmlFor="bank-bulk-row">
														<Combobox id="bank-bulk-row" label="Put them all on" pickOnly value=""
															placeholder={chosen[0].kind === 'income' ? 'Choose an income row' : 'Choose a cost row'}
															groups={rowChoices(sheetList, chosen[0].kind, [])}
															onSelect={o => !bulkBusy && saveGroups(chosen, o.id)} />
													</Field>
												) : (
													<p className="field-help">Money in and money out go to different rows, so only the choices below apply to all of them.</p>
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
										<ul className="bank-groups">
											{groups.map(g => (
												<li key={g.id} className={picked.has(g.id) ? 'bank-group is-picked' : 'bank-group'}>
													<label className="bank-group-head">
														<input type="checkbox" className="check-box" checked={picked.has(g.id)} onChange={() => toggle(g.id)}
															aria-label={`Select ${g.text || 'this text'}`} />
														<span className="bank-group-text">
															<span className="bank-group-name">{g.text || '(no text)'}</span>
															<span className="field-help">
																{g.payments.length === 1 ? shortDate(g.payments[0].date)
																	: g.first === g.last ? `${plural(g.payments.length, 'payment')} on ${shortDate(g.first)}`
																		: `${plural(g.payments.length, 'payment')}, ${shortDate(g.first)} to ${shortDate(g.last)}`}
															</span>
														</span>
														<span className="amount tabular-figures bank-group-total">{currency(g.total)}</span>
													</label>
													{g.noSheet ? (
														<p className="field-help bank-status-line">There is no budget for {g.payments[0].date.slice(0, 4)}.</p>
													) : g.suggestion ? (
														<p className="field-help bank-status-line bank-status-near">Close to {g.suggestion} in amount.</p>
													) : null}
													<div className="bank-group-actions">
														{g.suggestion ? (
															<ButtonLink disabled={bulkBusy} onClick={() => saveGroups([g], g.suggestion)}>
																USE {g.suggestion.toLocaleUpperCase('da')}</ButtonLink>
														) : null}
														{g.noSheet ? null : (
															<ButtonLink aria-expanded={open === g.id} onClick={() => setOpen(open === g.id ? null : g.id)}>
																CHOOSE A ROW</ButtonLink>
														)}
														<ButtonLink disabled={bulkBusy} onClick={() => saveGroups([g], null, true)}>ONE-TIME</ButtonLink>
														<ButtonLink disabled={bulkBusy} onClick={() => saveGroups([g], null)}>NOT IN THE BUDGET</ButtonLink>
													</div>
													{open === g.id ? (
														<div className="filter-section bank-place">
															<Field label={`All payments with this text go to`} htmlFor={`bank-group-${g.id}`}>
																<Combobox id={`bank-group-${g.id}`} label="All payments with this text go to" pickOnly value=""
																	placeholder={g.kind === 'income' ? 'Choose an income row' : 'Choose a cost row'}
																	groups={rowChoices(sheetList, g.kind, [])}
																	onSelect={o => !bulkBusy && saveGroups([g], o.id)} />
															</Field>
														</div>
													) : null}
												</li>
											))}
										</ul>
									</>
								) : (
									<EmptyState icon="check"><p>Every payment is accounted for.</p></EmptyState>
								)
							) : shown.length ? (
								<div className="entry-list bank-list">
									{shown.map(p => (
										<Fragment key={p.row}>
											<EntryRow name={p.text || '(no text)'} amount={currency(p.amount)}
												className={`bank-row bank-row-${p.status}`}
												meta={<>{shortDate(p.date)} &middot; <span className="bank-status">{statusText(p, months)}</span></>}>
												<IconButton icon="pencil" label={`Place ${p.text || 'this payment'}`}
													aria-expanded={open === p.row} onClick={() => setOpen(open === p.row ? null : p.row)} />
											</EntryRow>
											{open === p.row ? (
												<Place payment={p} sheet={sheets.get(Number(p.date.slice(0, 4)))}
													onSave={(line, once) => place(p, line, once)} onForget={() => forget(p)} onClose={() => setOpen(null)} />
											) : null}
										</Fragment>
									))}
								</div>
							) : (
								<EmptyState icon="check"><p>{filter === 'Other amount' ? 'No payment has another amount than the budget.'
									: 'There are no payments.'}</p></EmptyState>
							)}
						</CardBody>
					</Card>
				)}
			</div>
		</Page>
	)
}
