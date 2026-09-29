import { Fragment, useEffect, useMemo, useState } from 'react'
import { Page } from '../components/Shell.jsx'
import { Card, CardBody, EmptyState } from '../components/Card.jsx'
import { ButtonLink, IconButton } from '../components/Button.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { DropZone } from '../components/FileInput.jsx'
import { CheckRow, Field, FilterSection, Segmented } from '../components/Form.jsx'
import { EntryRow, SummaryRow } from '../components/Rows.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import { useToast } from '../components/Toast.jsx'
import { BANK_FILES } from '../components/fileKinds.js'
import { cachedFetch, useApi } from '../api/useApi.js'
import { currency, monthNames, plural, shortDate } from '../api/format.js'
import { failureMessage, forgetBankLink, getBankLinks, getBudgetYear, saveBankLink } from '../api/client.js'
import {
	DATE_FORMATS, checkPayments, guessColumns, guessDateFormat, hasHeader, kindOf, parseCsv, readPayments, readText
} from '../api/bankStatement.js'

/* A bank's CSV export checked against the budget: every payment is looked up in its year's
   sheet, and the ones no row accounts for are listed. The file is read here and never sent. */

const NONE = 'none'
const SHOWN = { Missing: ['missing', 'year'], 'Other amount': ['amount'], All: null }
const FILTERS = Object.keys(SHOWN)

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

function Columns({ rows, mapping, onChange }) {
	const body = mapping.header ? rows.slice(1) : rows
	const width = Math.max(...rows.map(r => r.length))
	const name = i => (mapping.header && rows[0][i] ? rows[0][i] : `Column ${i + 1}`)
	const options = Array.from({ length: width }, (_, i) => ({ id: String(i), label: name(i) }))
	const cut = text => (text.length > 32 ? text.slice(0, 31) + '…' : text)
	const sample = i => (i == null ? '' : body.slice(0, 3).map(r => r[i]).filter(Boolean).map(cut).join('  |  '))
	const pick = (key, label, { optional, help, noneLabel } = {}) => {
		const value = mapping[key]
		const groups = [{ heading: '', options: optional ? [{ id: NONE, label: noneLabel }, ...options] : options }]
		return (
			<Field label={label} optional={optional} htmlFor={`bank-${key}`}
				help={value == null ? help : `In the file: ${sample(value)}`}>
				<Combobox id={`bank-${key}`} label={label} pickOnly value={value == null ? noneLabel ?? '' : name(value)}
					groups={groups} onSelect={o => onChange({ [key]: o.id === NONE ? null : Number(o.id) })} />
			</Field>
		)
	}
	return (
		<FilterSection>
			<span className="panel-heading">The columns in the file</span>
			<CheckRow id="bank-header" checked={mapping.header} label="The first line holds the column names"
				onChange={header => onChange({ header })} />
			<div className="bank-columns">
				{pick('date', 'Date')}
				<Field label="How the date is written" htmlFor="bank-date-format">
					<Combobox id="bank-date-format" label="How the date is written" pickOnly
						value={DATE_FORMATS.find(f => f.id === mapping.dateFormat)?.label ?? ''}
						groups={[{ heading: '', options: DATE_FORMATS.map(f => ({ id: f.id, label: f.label })) }]}
						onSelect={o => onChange({ dateFormat: o.id })} />
				</Field>
				{pick('text', 'Text')}
				{pick('amount', 'Amount', { help: 'Money out is a minus amount.' })}
				{pick('out', 'Money out', {
					optional: true, noneLabel: 'Not used', help: 'Only when the bank shows money out in a column of its own.'
				})}
			</div>
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
		case 'skip': return 'Not part of the budget'
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
		{ heading: '', options: [{ id: NONE, label: 'Not part of the budget' }] }
	].filter(g => g.options.length)
	const current = payment.placed ? (payment.status === 'skip' ? 'Not part of the budget' : payment.line) : ''
	return (
		<div className="filter-section bank-place">
			<Field label="This payment belongs to" htmlFor={`bank-place-${payment.row}`}
				help="Every payment with the same text is placed the same way, in this file and in the next.">
				<Combobox id={`bank-place-${payment.row}`} label="This payment belongs to" pickOnly value={current}
					placeholder={kind === 'income' ? 'Choose an income row' : 'Choose a cost row'} groups={groups}
					onSelect={o => onSave(o.id === NONE ? null : o.id)} />
			</Field>
			<div className="bank-place-actions">
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
	const [filter, setFilter] = useState('Missing')
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

	const place = async (payment, line) => {
		try {
			setLinks(await saveBankLink({ pattern: payment.key, kind: kindOf(payment), line }))
			setOpen(null)
			toast(line ? `Payments with this text now go to ${line}.` : 'Payments with this text are now left out of the check.')
		} catch (e) {
			toast(failureMessage(e, 'Your choice was not saved.'), 'negative')
		}
	}
	const forget = async payment => {
		try {
			setLinks(await forgetBankLink({ pattern: payment.key, kind: kindOf(payment) }))
			setOpen(null)
		} catch (e) {
			toast(failureMessage(e, 'Your choice was not removed.'), 'negative')
		}
	}

	const count = status => checked?.filter(p => status.includes(p.status)) ?? []
	const tally = list => currency(list.reduce((n, p) => n + p.amount, 0))
	const missing = count(['missing', 'year'])
	const differs = count(['amount'])
	const shown = checked?.filter(p => !SHOWN[filter] || SHOWN[filter].includes(p.status)) ?? []

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
						<EmptyState icon="alert"><p>Choose the columns for the date, the text and the amount.</p></EmptyState>
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
								{unread.length ? ` ${plural(unread.length, 'line')} of the file had no date or amount that could be read, so ${unread.length === 1 ? 'it is' : 'they are'} left out.` : ''}
							</p>
							<div className="bank-summary">
								<SummaryRow label={`Same amount as the budget: ${count(['match']).length}`} value={tally(count(['match']))} />
								<SummaryRow label={`Other amount than the budget: ${differs.length}`} value={tally(differs)} />
								<SummaryRow label={`Not in the budget: ${missing.length}`} value={tally(missing)} />
								{count(['skip']).length ? (
									<SummaryRow label={`Left out by you: ${count(['skip']).length}`} value={tally(count(['skip']))} />
								) : null}
							</div>
							<Segmented label="Show" options={FILTERS} value={filter} onChange={f => { setFilter(f); setOpen(null) }} />
							{shown.length ? (
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
													onSave={line => place(p, line)} onForget={() => forget(p)} onClose={() => setOpen(null)} />
											) : null}
										</Fragment>
									))}
								</div>
							) : (
								<EmptyState icon="check"><p>{filter === 'Missing' ? 'Every payment is in the budget.'
									: filter === 'Other amount' ? 'No payment has another amount than the budget.' : 'There are no payments.'}</p></EmptyState>
							)}
						</CardBody>
					</Card>
				)}
			</div>
		</Page>
	)
}
