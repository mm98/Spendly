import { Fragment, useMemo, useRef, useState } from 'react'
import { Card, CardBody, Toolbar } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { Controls } from '../components/List.jsx'
import { Field } from '../components/Field.jsx'
import { Check, Choice } from '../components/Choice.jsx'
import { FileDrop } from '../components/FileDrop.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { useToast } from '../components/Overlays.jsx'
import { useShellShape } from '../app/useMedia.js'
import { plural, dot } from '../api/format.js'
import { BANK_FILES, DATE_FORMATS, dateFormatsFor, describeColumn, guessColumns, hasHeader, readBankFile, readPayments } from '../api/bankStatement.js'
import { phrase, usePhrase } from '../language/phrases.js'

/* The parts every bank check shares (Budget 21g, 21h; Order list 2j): the file, its columns and the
   payments read from it. A check supplies its own matching and what is done with a payment. */

const ROLES = [
	{ id: 'date', label: 'field.date' },
	{ id: 'text', label: 'bank.role.text' },
	{ id: 'amount', label: 'field.amount' },
	{ id: 'out', label: 'bank.role.out' },
	{ id: 'none', label: 'bank.role.none' }
]

// The column choice for a file of the same type and width, kept in this browser only, and shared by every check.
const MAPPING_KEY = 'spendly.bankColumns'
// a CSV file is keyed by its width alone, an Excel file by its type and width
const shapeOf = (name, width) => (/\.xlsx$/i.test(name ?? '') ? `xlsx ${width}` : String(width))
const rememberedMapping = shape => {
	try { return JSON.parse(localStorage.getItem(MAPPING_KEY))?.[shape] ?? null } catch { return null }
}
const rememberMapping = (shape, mapping) => {
	try {
		const all = JSON.parse(localStorage.getItem(MAPPING_KEY)) ?? {}
		localStorage.setItem(MAPPING_KEY, JSON.stringify({ ...all, [shape]: mapping }))
	} catch { /* the choice is only a convenience */ }
}

/** A bank file read in the browser, its columns, and the payments they give. `onRead` runs when a new file is read. */
export function useBankFile({ onRead } = {}) {
	const phrase = usePhrase()
	const toast = useToast()
	const [file, setFile] = useState(null)
	const [rows, setRows] = useState(null)
	const [mapping, setMapping] = useState(null)
	const [showColumns, setShowColumns] = useState(false)
	const picker = useRef(null)

	const width = rows ? Math.max(...rows.map(r => r.length)) : 0
	const shape = shapeOf(file, width)

	// a file of a width seen before opens on its remembered columns, folded away
	const read = async chosen => {
		if (!chosen) return
		try {
			const found = await readBankFile(chosen)
			if (!found.length) { toast({ message: phrase('bank.fileEmpty', { file: chosen.name }), color: 'danger' }); return }
			const header = hasHeader(found)
			const remembered = rememberedMapping(shapeOf(chosen.name, Math.max(...found.map(r => r.length))))
			setFile(chosen.name)
			setRows(found)
			setMapping(remembered ?? { header, ...guessColumns(found, header) })
			setShowColumns(!remembered)
			onRead?.()
		} catch (e) {
			toast({ message: phrase('bank.fileUnread', { file: chosen.name, reason: e.message }), color: 'danger' })
		}
	}
	const change = patch => setMapping(m => {
		const next = { ...m, ...patch }
		rememberMapping(shape, next)
		return next
	})
	const toggleColumns = () => {
		if (showColumns) rememberMapping(shape, mapping)
		setShowColumns(!showColumns)
	}

	const body = rows && mapping ? (mapping.header ? rows.slice(1) : rows) : []
	const dateFits = useMemo(() => (mapping?.date == null ? []
		: dateFormatsFor((mapping.header ? rows.slice(1) : rows).map(r => r[mapping.date] ?? ''))), [rows, mapping])
	const dateFormat = dateFits.includes(mapping?.dateFormat) ? mapping.dateFormat : dateFits[0] ?? 'dmy'
	const ready = Boolean(mapping && mapping.date != null && mapping.text != null && mapping.amount != null)
	const { payments, unread } = useMemo(() => (ready ? readPayments(rows, { ...mapping, dateFormat }) : { payments: [], unread: [] }),
		[ready, rows, mapping, dateFormat])

	return { file, rows, mapping, width, body, dateFits, dateFormat, ready, payments, unread, showColumns, picker, read, change, toggleColumns }
}

/** Show, then Columns and Another file, with the file picker they open. `show` is the check's own Segmented. */
export function BankControls({ bank, show }) {
	const phrase = usePhrase()
	const shown = bank.ready && bank.payments.length
	return (
		<Controls>
			{shown ? show : null}
			<span className="sp-grow" />
			{shown
				? <Button variant="outline" aria-pressed={bank.showColumns ? 'true' : 'false'} onClick={bank.toggleColumns}>{phrase(bank.showColumns ? 'bank.closeColumns' : 'bank.columns')}</Button>
				: null}
			<Button variant="outline" onClick={() => bank.picker.current?.click()}>{phrase('bank.anotherFile')}</Button>
			<input ref={bank.picker} type="file" name="bank-file" accept={BANK_FILES} hidden tabIndex={-1}
				onChange={ev => { const chosen = ev.target.files?.[0]; ev.target.value = ''; bank.read(chosen) }} />
		</Controls>
	)
}

/** Whether the columns are what the page shows now: asked for, or needed before any payment reads. */
export const columnsShown = bank => bank.showColumns || !bank.ready || !bank.payments.length

/** The columns of the file, with what stops it from reading (21h). */
export function BankFileColumns({ bank, payments = bank.payments }) {
	const phrase = usePhrase()
	return (
		<Columns file={bank.file} rows={bank.rows} body={bank.body} width={bank.width} mapping={bank.mapping} dateFits={bank.dateFits} dateFormat={bank.dateFormat}
			problem={!bank.ready ? phrase('bank.tellColumns')
				: !payments.length ? phrase('bank.noPayments') : null}
			left={bank.ready && payments.length && bank.unread.length ? phrase('bank.unreadLines', { lines: plural(bank.unread.length, 'line') }) : null}
			onChange={bank.change} />
	)
}

/** Before a file: the one way in, the platform's own file picker (Settings 11b's file card). */
export function BankPickFile({ onFile, body }) {
	return (
		<Card>
			<FileDrop accept={BANK_FILES} onFiles={files => onFile(files?.[0])}>
				<Mark size="medium" fill="solid" aria-hidden="true" aria-label={phrase('bank.file')}><Icon name="upload" size={19} /></Mark>
				<span className="sp-title">{phrase('bank.drop')}</span>
				<span className="sp-subtitle">{body}</span>
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
		const name = mapping.header && rows[0][i] ? rows[0][i] : phrase('bank.column', { number: i + 1 })
		return {
			i,
			name,
			values: (
				<span className="sp-subtitle sp-truncate">
					{(role.id === 'none' ? describeColumn(body.map(r => r[i]), mapping.header ? rows[0][i] : '') : null)
						?? body.slice(0, 3).map(r => r[i] || phrase('bank.emptyValue')).join(dot)}
				</span>
			),
			choice: (
				<div className="sp-stack sp-gap-8">
					<PickOnly aria-label={phrase('bank.mappedTo', { name })}
						value={role.id === 'none' ? <span className="sp-ink-5">{phrase(role.label)}</span> : phrase(role.label)}
						options={ROLES.map(r => ({ id: r.id, label: phrase(r.label), selected: r.id === role.id }))}
						onPick={id => set(i, id)} />
					{mapping.date !== i || dateFits.length === 1 ? null : dateFits.length ? (
						<Field label={phrase('bank.dateTwoWays')}>
							<PickOnly value={phrase(DATE_FORMATS.find(f => f.id === dateFormat)?.label ?? '')}
								options={DATE_FORMATS.filter(f => dateFits.includes(f.id)).map(f => ({ id: f.id, label: phrase(f.label), selected: f.id === dateFormat }))}
								onPick={id => onChange({ dateFormat: id })} />
						</Field>
					) : <span className="sp-note sp-ink-danger">{phrase('bank.notDates')}</span>}
				</div>
			)
		}
	})
	return (
		<Card variant="flush">
			<Toolbar>
				<span className="sp-section-label">{phrase('bank.columns')}</span>
				<span className="sp-grow" />
				<span className={touch ? 'sp-note sp-truncate' : 'sp-note'}>{file}</span>
			</Toolbar>
			<CardBody>
				<div className="sp-stack sp-gap-12">
					<span className="sp-subtitle">{phrase('bank.fileHas', { columns: plural(width, 'column') })}</span>
					{problem ? <span className="sp-note sp-ink-danger">{problem}</span> : null}
					{left ? <span className="sp-note sp-ink-warning">{left}</span> : null}
					<Choice control={<Check checked={!!mapping.header} onChange={ev => onChange({ header: ev.target.checked })} />}>
						{phrase('bank.header')}
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
								<th scope="col" className="sp-col-title">{phrase('bank.th.file')}</th>
								<th scope="col" className="sp-col-flex">{phrase('bank.th.values')}</th>
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
				<span className="sp-note">{phrase('bank.moneyOut')}</span>
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
