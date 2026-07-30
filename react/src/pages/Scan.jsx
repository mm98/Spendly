import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, Note } from '../components/Card.jsx'
import { Stepper } from '../components/Stepper.jsx'
import { FormPage, RecordWait } from '../components/FormPage.jsx'
import { InsetPanel, ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { DocumentPreview, ProgressBar } from '../components/Viz.jsx'
import { HiddenFileInput, describeFile } from '../components/FileInput.jsx'
import { Button, ButtonLink, IconButton } from '../components/Button.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { StatusChip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import {
	DateInput, Field, FieldPair, FieldShell, FieldUnit, FormActions, Segmented, TextInput,
	focusField, needFixing, useFieldErrors
} from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { useApi, invalidate } from '../api/useApi.js'
import {
	createOrder, getHomeContent, getOrders, getOrdersOverview, getRecentScans, getScanDocuments,
	getScanDraft, putScanDocument, spendKinds
} from '../api/client.js'
import { LINE_FIELDS, ORDER_FIELDS } from '../api/rules.js'
import { AMOUNT_PATTERN, amount, kr, parseAmount } from '../api/format.js'

/* Scan, in three steps.

   The hero says the app takes "a PDF, photo or screenshot" and four entry buttons name the
   formats one by one -- and all four used to land on a review screen reading
   kvittering-bilka.jpg, 2,1 MB, drawn with a receipt glyph. Nothing could catch it: one
   document was the only document, so every screenshot, every walk and all three engines
   agreed with each other about the wrong thing.

   So the choice travels: the entry names the document, the URL carries it, and both steps
   after it render what was actually picked. The format is the file's, which is why a page
   count belongs to the PDFs and to nothing else. The draft underneath is the same Bilka
   purchase in every case -- that part really is one document. README: Scan Flow. */

const SCAN_STEPS = at => [
	{ label: 'Upload', icon: 'upload', done: at > 0, on: at === 0 },
	{ label: 'Reading', icon: 'scan', done: at > 1, on: at === 1 },
	{ label: 'Review', icon: 'document', on: at === 2 }
]

const ENTRIES = [
	{ key: 'invoice', icon: 'document', label: 'PDF invoice' },
	{ key: 'photo', icon: 'camera', label: 'Photo of a paper receipt' },
	{ key: 'screenshot', icon: 'display', label: 'Screenshot of an order email' },
	{ key: 'confirmation', icon: 'cube', label: 'Order confirmation' }
]

/** The document key, read from the URL. Keeping it there rather than in memory means a
    reload of step 2 or 3 still shows the file the user picked, instead of quietly falling
    back to the first one. */
const useDocumentKey = () => useSearchParams()[0].get('doc') ?? 'photo'

/* ---- step 1 ---- */

export function ScanUpload() {
	const recent = useApi(getRecentScans)
	const navigate = useNavigate()
	const picker = useRef(null)
	const [over, setOver] = useState(false)
	const go = key => navigate('/scan/reading?doc=' + key)

	/* The hero says "Drop a receipt here, or click to choose a file" and now it does both. A
	   dropped file is the document the next two steps name, with its own format and its own
	   size; what the reader finds inside is still the one Bilka purchase, which is demo data
	   and is described as such. A prompt bar that says drop and answers only a click is the
	   decorative-control rule wearing a different sense. README: Scan Flow, Honest Affordances. */
	const upload = files => {
		const file = files[0]
		if (!file) return
		putScanDocument(describeFile(file)).then(({ key }) => go(key))
	}

	return (
		<Page>
			<div className="hero hero-column">
				<h2>Receipts read at your fingertips.</h2>
				<p>Drop a PDF, photo or screenshot. The AI drafts the order; you review every value before it is saved.</p>
				<div className="ai-prompt-bar"
					onDragOver={e => { e.preventDefault(); setOver(true) }}
					onDragEnter={e => { e.preventDefault(); setOver(true) }}
					onDragLeave={() => setOver(false)}
					onDrop={e => {
						e.preventDefault(); setOver(false)
						upload([...(e.dataTransfer?.files ?? [])])
					}}
					onClick={() => picker.current?.click()}
					style={{ cursor: 'pointer', ...(over ? { outline: '2px dashed var(--green)', outlineOffset: 3 } : {}) }}>
					<span aria-hidden="true"><Icon name="receipt" style={{ color: 'var(--text-faint)' }} /></span>
					<span className="field-shell-placeholder">Drop a receipt here, or click to choose a file…</span>
					<HiddenFileInput ref={picker} accept="image/*,.pdf" label="Choose a receipt" onFiles={upload} />
					<IconButton variant="send" icon="upload" label="Choose a receipt to scan"
						onClick={e => { e.stopPropagation(); picker.current?.click() }} />
				</div>
				<div className="ai-suggestion-row">
					{ENTRIES.map(entry => (
						<button key={entry.key} type="button" onClick={() => go(entry.key)}>
							<Icon name={entry.icon} />{entry.label}
						</button>
					))}
				</div>
			</div>

			<div className="two-column" style={{ marginTop: 22 }}>
				<div className="card card-question">
					<span className="card-question-label">What the AI checks</span>
					<div className="card-question-title">Nothing is stored until you approve it</div>
					<div className="account-row">
						<span><Icon name="check" style={{ color: '#12A56B' }} /></span>
						<span className="account-row-text">Totals reconciled against the printed total, incl. 25% VAT</span>
					</div>
					<div className="account-row">
						<span><Icon name="eye" style={{ color: 'var(--text-body)' }} /></span>
						<span className="account-row-text">Possible duplicates flagged with date and amount to compare</span>
					</div>
					<div className="account-row">
						<span><Icon name="tag" style={{ color: 'var(--text-body)' }} /></span>
						<span className="account-row-text">Vendor matched to your list, or offered as a new vendor</span>
					</div>
				</div>

				<Card aria-label="Recent scans">
					<CardHeader title="Recent scans" />
					<CardDivider />
					<CardBody variant="card-body-tight">
						<Async state={recent} label="Loading recent scans">{scans => (
							<InsetPanel>
								{scans.map(scan => (
									<ItemRow key={scan.id} icon="check" title={scan.name} meta={scan.meta}
										amount={kr(scan.total)} to={`/orders/${scan.orderId}`} />
								))}
							</InsetPanel>
						)}</Async>
						<Button variant="block" to="/orders/all">VIEW ALL</Button>
					</CardBody>
				</Card>
			</div>
		</Page>
	)
}

/* ---- step 2 ---- */

export function ScanReading() {
	const key = useDocumentKey()
	const documents = useApi(getScanDocuments)

	return (
		<Page>
			<Stepper steps={SCAN_STEPS(1)} />
			<Async state={documents} label="Loading the document">{docs => {
				const file = docs[key] ?? docs.photo
				return (
					<Card aria-label="Reading the document" aria-busy="true">
						<CardBody variant="card-body-centered">
							<DocumentPreview kind={file.kind} style={{ width: 120, height: 150 }} />
							<div>
								<div className="card-headline">Reading {file.name}</div>
								<span className="field-help">
									This usually takes a few seconds. Nothing is stored until you approve the review.</span>
							</div>
							<ProgressBar style={{ width: '100%', maxWidth: 420 }} label="Reading progress" />
							<ButtonLink to={`/scan/review?doc=${key}`}>OPEN THE REVIEW</ButtonLink>
						</CardBody>
					</Card>
				)
			}}</Async>
		</Page>
	)
}

/* ---- step 3 ---- */

export function ScanReview() {
	const key = useDocumentKey()
	const state = useApi(getScanDraft, [key])

	if (!state.data) return <RecordWait state={state} label="Loading the draft" steps={SCAN_STEPS(2)} />
	/* Keyed on the document, so choosing a different one seeds a fresh draft rather than
	   leaving the previous receipt's lines in the form. */
	return <ScanReviewForm key={key} answer={state.data} />
}

function ScanReviewForm({ answer }) {
	const navigate = useNavigate()
	const [showAll, setShowAll] = useState(false)
	const [saving, setSaving] = useState(false)
	const [status, setStatus] = useState({ message: '', good: true })
	const toast = useToast()
	/* The draft the review is editing. It starts as what the reader returned and is what SAVE
	   ORDER writes -- so the fields on this page are the order, rather than a picture of one. */
	const [draft, setDraft] = useState(() => ({
		vendor: answer.vendor, date: answer.date, status: answer.status,
		kind: answer.kind, shipping: amount(answer.shipping),
		lines: answer.lines.map(l => ({ ...l, quantity: l.quantity ?? 1, price: l.price ?? l.amount })),
		remainder: answer.remainder
	}))
	const [editingLine, setEditingLine] = useState(null)
	const [sourceOpen, setSourceOpen] = useState(false)

	/* The same four rules step 1 checks, from the same module. This screen used to check
	   nothing at all: a receipt whose vendor line came back blank saved an order with no
	   vendor on it, through a form whose twin says "Who did you buy from?" about that field.
	   Create and scan are two doors to one saved order. README: Fields and Forms. */
	const values = useMemo(() => ({
		'order-vendor': draft.vendor, 'order-date': draft.date,
		'order-kind': draft.kind, 'order-shipping': draft.shipping
	}), [draft])
	const { check, recheck, propsFor } = useFieldErrors(ORDER_FIELDS, values)
	const vendorField = propsFor('order-vendor')
	const dateField = propsFor('order-date')
	const kindField = propsFor('order-kind')
	const shippingField = propsFor('order-shipping')

	const patch = p => setDraft(d => ({ ...d, ...p }))
	const set = (name, key) => v => { patch({ [key]: v }); recheck(name, v) }

	const saveLine = (id, values) => {
		patch({ lines: draft.lines.map(l => (l.id === id
			? { ...l, title: values.title, quantity: values.quantity, price: values.price,
				uncertain: false, meta: undefined, amount: undefined }
			: l)) })
		setEditingLine(null)
		toast(`${values.title} corrected.`)
	}

	const linesTotal = draft.lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
		+ (draft.remainder?.total ?? 0)
	const shipping = draft.shipping && AMOUNT_PATTERN.test(draft.shipping)
		? parseAmount(draft.shipping) : 0

	const save = () => {
		const failed = check()
		if (failed.length) {
			setStatus({ message: 'Cannot save — ' + needFixing(failed), good: false })
			focusField(failed[0].name)
			return
		}
		if (!draft.lines.length) {
			setStatus({ message: 'An order needs at least one line.', good: false })
			return
		}
		setStatus({ message: '', good: true })
		setSaving(true)
		createOrder({
			vendor: draft.vendor, date: draft.date, status: draft.status, kind: draft.kind,
			categories: [], shipping: draft.shipping,
			items: draft.lines.map(l => ({ id: l.id, title: l.title, quantity: l.quantity, price: l.price }))
		})
			.then(order => {
				invalidate(getOrders); invalidate(getHomeContent); invalidate(getOrdersOverview)
				navigate('/orders/' + order.id)
			})
			.catch(() => { setSaving(false); toast('That did not save. Try again.', 'negative') })
	}

	return (
		<FormPage
			title="Review the draft" lead="Every value is editable. Nothing is stored until you save."
			steps={SCAN_STEPS(2)} status={status}
			cancel={{ to: '/scan', label: 'DISCARD' }}
			submit={{ label: saving ? 'SAVING…' : 'SAVE ORDER', onClick: save, disabled: saving }}
			notice={
				/* The verdict is about the numbers on screen, so it is recomputed from them:
				   correct a line and the note either still says the total matches or stops saying
				   it. A fixed "Total matches." over edited figures is the app asserting something
				   it has not checked. */
				Math.abs(linesTotal + shipping - answer.total) < 0.005 ? (
					<Note tone="positive" title="Total matches." style={{ marginBottom: 16 }}>
						{answer.reconciled}
					</Note>
				) : (
					<Note tone="warning" title="Total no longer matches." style={{ marginBottom: 16 }}>
						The lines now add up to {kr(linesTotal + shipping)}, against the document total
						of {kr(answer.total)}. Saving keeps what is on screen.
					</Note>
				)
			}
			rail={
				<>
					<Card aria-label="Source document">
						<CardHeader title="Source">
							{/* The preview under this button is a thumbnail; OPEN is what makes it big
							    enough to read from. It says which state it is in, and it says CLOSE when
							    it would close -- a toggle labelled the same in both states is a control
							    that tells you nothing about what pressing it does. */}
							<button type="button" className="button button-pill"
								aria-expanded={sourceOpen} aria-controls="scan-source-preview"
								onClick={() => setSourceOpen(o => !o)}>{sourceOpen ? 'CLOSE' : 'OPEN'}</button>
						</CardHeader>
						<CardDivider />
						<CardBody>
							<DocumentPreview kind={answer.file.kind} id="scan-source-preview"
								style={sourceOpen ? { height: 520 } : undefined} />
							<div className="space-between document-name-row" style={{ marginTop: 10 }}>
								<span className="document-name">{answer.file.name}</span>
								<span className="field-help">{answer.file.meta}</span>
							</div>
							<span className="field-help">Saved as an attachment on the order when you save.</span>
						</CardBody>
					</Card>

					<Card aria-label="Possible duplicate">
						<CardHeader title="Possible duplicate" />
						<CardDivider />
						<CardBody>
							<Note tone="warning" title="Check before saving." style={{ marginBottom: 10 }}>
								You already have a {answer.vendor} order within 14 days of this date.
							</Note>
							<ItemRow thumb="receipt" to={`/orders/${answer.duplicate.orderId}`}
								title={answer.duplicate.title} meta={answer.duplicate.meta}
								amount={kr(answer.duplicate.total)} />
						</CardBody>
					</Card>

					<Card aria-label="What was checked">
						<CardHeader title="What was checked" />
						<CardDivider />
						<CardBody>
							<InsetPanel>
								{answer.checks.map(check => (
									<ItemRow key={check.id}
										icon={check.warning ? 'alert' : 'check'}
										iconTone={check.warning ? { background: '#F6ECD9', color: '#84651E' } : undefined}
										title={check.title} meta={check.meta} />
								))}
							</InsetPanel>
						</CardBody>
					</Card>
				</>
			}>

			<Field label="Vendor" error={vendorField.error} errorId={vendorField.errorId}>
				<FieldShell>
					<TextInput id="order-vendor" value={draft.vendor} onChange={set('order-vendor', 'vendor')}
						placeholder="Search vendors…" aria-label="Vendor" aria-required="true"
						invalid={vendorField.invalid} describedBy={vendorField.describedBy} />
					{answer.vendorMatched && draft.vendor === answer.vendor
						? <StatusChip style={{ height: 24, fontSize: 10.5 }}>matched</StatusChip>
						: null}
				</FieldShell>
			</Field>

			<FieldPair>
				<Field label="Date" error={dateField.error} errorId={dateField.errorId}>
					<DateInput id="order-date" label="Order date" value={draft.date}
						onChange={set('order-date', 'date')} aria-required="true"
						invalid={dateField.invalid} describedBy={dateField.describedBy} />
				</Field>
				<Field label="Status" group>
					<Segmented options={['Ordered', 'Delivered', 'Returned']}
						value={draft.status} onChange={v => patch({ status: v })} label="Status" />
				</Field>
			</FieldPair>

			<FieldPair>
				<Field label="Shipping fee" error={shippingField.error} errorId={shippingField.errorId}
					help="Not on the receipt; add it if the order was delivered.">
					<FieldShell>
						<TextInput id="order-shipping" inputMode="decimal" value={draft.shipping}
							onChange={set('order-shipping', 'shipping')} aria-label="Shipping fee"
							invalid={shippingField.invalid} describedBy={shippingField.describedBy} />
						<FieldUnit>kr.</FieldUnit>
					</FieldShell>
				</Field>
				<Field label="Kind" error={kindField.error} errorId={kindField.errorId}
					help="Only expenses count towards your totals.">
					<Combobox id="order-kind" label="Kind" value={draft.kind} required
						onChange={set('order-kind', 'kind')}
						invalid={kindField.invalid} describedBy={kindField.describedBy}
						onSelect={o => { patch({ kind: o.label }); recheck('order-kind', o.label) }}
						groups={[{ heading: 'Kinds', options: spendKinds.map(k => ({ id: k, label: k })) }]} />
				</Field>
			</FieldPair>

			<div>
				<div className="space-between space-between-tight">
					<span className="section-label">Lines read · {answer.linesRead}</span>
					<span className="field-help">the pencil corrects a line</span>
				</div>
				<InsetPanel>
					{draft.lines.map(line => (
						editingLine === line.id ? (
							<LineEditor key={line.id} line={line}
								onSave={values => saveLine(line.id, values)}
								onCancel={() => setEditingLine(null)} />
						) : (
							<ItemRow key={line.id}
								icon={line.uncertain ? 'alert' : 'check'}
								iconTone={line.uncertain ? { background: '#F6ECD9', color: '#84651E' } : undefined}
								title={line.title}
								meta={line.meta ?? `${line.quantity} × ${kr(line.price)}`}
								amount={kr(line.price * line.quantity)}>
								<IconButton icon="pencil" label={`Edit ${line.title}`}
									onClick={() => setEditingLine(line.id)} />
							</ItemRow>
						)
					))}
					{/* The remainder is a count and a total, not a row that pretends to be a line.
					    Opening it is the honest action for it, so SHOW ALL is a button. */}
					{draft.remainder?.count ? (
						<ItemRow icon="dots"
							iconTone={{ background: '#EFF3EE', color: 'var(--text-muted)' }}
							title={`${draft.remainder.count} more lines`}
							meta={showAll
								? 'Kept as read; the document stays attached to the order.'
								: `${kr(draft.remainder.total)} together`}>
							{showAll ? null : (
								<ButtonLink style={{ marginLeft: 'auto' }}
									onClick={() => setShowAll(true)}>SHOW ALL</ButtonLink>
							)}
						</ItemRow>
					) : null}
				</InsetPanel>
			</div>

			<SummaryRow label="Lines subtotal" value={kr(linesTotal)} />
			<SummaryRow label="Shipping" value={kr(shipping)} />
			<div className="card-divider" style={{ margin: '2px 0 0' }} />
			<SummaryTotal value={kr(linesTotal + shipping)} />
		</FormPage>
	)
}

/** A line of the receipt, opened for correction. Three fields, the same three rules the item
    form on New order checks, marked and announced by the same apparatus -- see api/rules.js.
    Its own three-branch if/else agreed with them until the day one of the two was fixed. */
function LineEditor({ line, onSave, onCancel }) {
	const [form, setForm] = useState({
		'line-description': line.title,
		'line-quantity': String(line.quantity),
		'line-price': amount(line.price)
	})
	const { check, recheck, propsFor } = useFieldErrors(LINE_FIELDS, form)
	const description = propsFor('line-description')
	const quantity = propsFor('line-quantity')
	const price = propsFor('line-price')

	const set = name => v => { setForm(f => ({ ...f, [name]: v })); recheck(name, v) }

	const submit = () => {
		const failed = check()
		if (failed.length) { focusField(failed[0].name); return }
		onSave({
			title: form['line-description'].trim(),
			quantity: Number(form['line-quantity']),
			price: parseAmount(form['line-price'])
		})
	}

	const keys = e => {
		if (e.key === 'Enter') { e.preventDefault(); submit() }
		else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel() }
	}

	return (
		<div className="filter-section" style={{ margin: '4px 0' }}>
			<Field label="Line" error={description.error} errorId={description.errorId}>
				<FieldShell>
					<TextInput id="line-description" value={form['line-description']} autoFocus
						onChange={set('line-description')} aria-label="Line description"
						aria-required="true" invalid={description.invalid}
						describedBy={description.describedBy} onKeyDown={keys} />
				</FieldShell>
			</Field>
			<FieldPair>
				<Field label="Quantity" error={quantity.error} errorId={quantity.errorId}>
					<FieldShell>
						<TextInput id="line-quantity" inputMode="numeric" value={form['line-quantity']}
							onChange={set('line-quantity')} aria-label="Quantity" aria-required="true"
							invalid={quantity.invalid} describedBy={quantity.describedBy} onKeyDown={keys} />
						<FieldUnit>pcs</FieldUnit>
					</FieldShell>
				</Field>
				<Field label="Price" error={price.error} errorId={price.errorId}>
					<FieldShell>
						<TextInput id="line-price" inputMode="decimal" value={form['line-price']}
							onChange={set('line-price')} aria-label="Price" aria-required="true"
							invalid={price.invalid} describedBy={price.describedBy} onKeyDown={keys} />
						<FieldUnit>kr.</FieldUnit>
					</FieldShell>
				</Field>
			</FieldPair>
			<FormActions>
				<Button variant="caps compact" icon="check" onClick={submit}>SAVE LINE</Button>
				<Button variant="ghost compact" onClick={onCancel}>CANCEL</Button>
			</FormActions>
		</div>
	)
}
