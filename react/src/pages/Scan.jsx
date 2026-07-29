import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, Note } from '../components/Card.jsx'
import { Stepper } from '../components/Stepper.jsx'
import { InsetPanel, ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { DocumentPreview, ProgressBar } from '../components/Viz.jsx'
import { Button, ButtonLink, IconButton } from '../components/Button.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { StatusChip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import {
	DateInput, Field, FieldPair, FieldShell, FieldUnit, Form, FormActions, FormStatus,
	Segmented, TextInput
} from '../components/Form.jsx'
import { useApi, invalidate } from '../api/useApi.js'
import {
	createOrder, getHomeContent, getOrders, getOrdersOverview, getRecentScans, getScanDocuments,
	getScanDraft, spendKinds
} from '../api/client.js'
import { AMOUNT_PATTERN, WHOLE_NUMBER_PATTERN, amount, kr, parseAmount } from '../api/format.js'

/* Scan, in three steps.

   The hero says the app takes "a PDF, photo or screenshot" and four entry buttons name the
   formats one by one -- and all four used to land on a review screen reading
   kvittering-bilka.jpg, 2,1 MB, drawn with a receipt glyph. Nothing could catch it: one
   document was the only document, so every screenshot, every walk and all three engines
   agreed with each other about the wrong thing.

   So the choice travels: the entry names the document, the URL carries it, and both steps
   after it render what was actually picked. The format is the file's, which is why a page
   count belongs to the PDFs and to nothing else. The draft underneath is the same Bilka
   purchase in every case -- that part really is one document. README 11. */

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
	const go = key => navigate('/scan/reading?doc=' + key)

	return (
		<Page>
			<div className="hero hero-column">
				<h2>Receipts read at your fingertips.</h2>
				<p>Drop a PDF, photo or screenshot. The AI drafts the order; you review every value before it is saved.</p>
				<div className="ai-prompt-bar">
					<span aria-hidden="true"><Icon name="receipt" style={{ color: 'var(--text-faint)' }} /></span>
					<span className="field-shell-placeholder">Drop a receipt here, or click to choose a file…</span>
					<IconButton variant="send" icon="upload" label="Scan" onClick={() => go('photo')} />
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
	const navigate = useNavigate()
	const [showAll, setShowAll] = useState(false)
	const [saving, setSaving] = useState(false)
	const [message, setMessage] = useState({ message: '', good: true })
	/* The draft the review is editing. It starts as what the reader returned and is what SAVE
	   ORDER writes -- so the fields on this page are the order, rather than a picture of one.
	   `null` until the API answers, and the body below only renders once it has. */
	const [draft, setDraft] = useState(null)
	const [editingLine, setEditingLine] = useState(null)
	const [sourceOpen, setSourceOpen] = useState(false)

	/* The draft is seeded in an effect rather than during render: setting state while
	   rendering is how a component ends up re-entering its own render, and React says so.
	   `doc` in the dependency list is what re-seeds it when a different document is chosen. */
	useEffect(() => {
		if (!state.data) return
		setDraft({
			vendor: state.data.vendor, date: state.data.date, status: state.data.status,
			kind: state.data.kind, shipping: amount(state.data.shipping),
			lines: state.data.lines.map(l => ({ ...l, quantity: l.quantity ?? 1, price: l.price ?? l.amount })),
			remainder: state.data.remainder
		})
		setEditingLine(null)
	}, [state.data])

	const patch = p => setDraft(d => ({ ...(d ?? {}), ...p }))

	const saveLine = (id, values) => {
		patch({ lines: (draft.lines).map(l => (l.id === id
			? { ...l, title: values.title, quantity: values.quantity, price: values.price,
				uncertain: false, meta: undefined, amount: undefined }
			: l)) })
		setEditingLine(null)
		setMessage({ message: `${values.title} corrected.`, good: true })
	}

	const save = () => {
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
			.catch(() => { setSaving(false); setMessage({ message: 'That did not save. Try again.', good: false }) })
	}

	return (
		<Page>
			<Stepper steps={SCAN_STEPS(2)} />
			<Async state={state} label="Loading the draft">{answer => {
				/* One render can land between the answer arriving and the effect above seeding the
				   draft from it, so the wait is stated rather than the page half-drawn. */
				const d = draft
				if (!d) return <p className="field-help">Opening the draft…</p>
				const linesTotal = d.lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
					+ (d.remainder?.total ?? 0)
				const shipping = d.shipping && AMOUNT_PATTERN.test(d.shipping) ? parseAmount(d.shipping) : 0
				return (
				<div className="order-list-grid">
					<div className="order-list-column">
						<Card aria-label="Review the draft">
							<CardBody variant="card-body-page">
								<div className="card-headline">Review the draft</div>
								<p className="card-lead">Every value is editable. Nothing is stored until you save.</p>
								{/* The verdict is about the numbers on screen, so it is recomputed from them:
								    correct a line and the note either still says the total matches or stops
								    saying it. A fixed "Total matches." over edited figures is the app
								    asserting something it has not checked. */}
								{Math.abs(linesTotal + shipping - answer.total) < 0.005 ? (
									<Note tone="positive" title="Total matches." style={{ marginBottom: 16 }}>
										{answer.reconciled}
									</Note>
								) : (
									<Note tone="warning" title="Total no longer matches." style={{ marginBottom: 16 }}>
										The lines now add up to {kr(linesTotal + shipping)}, against the document total
										of {kr(answer.total)}. Saving keeps what is on screen.
									</Note>
								)}
								<Form>
									<FormStatus message={message.message} good={message.good} />
									<Field label="Vendor">
										<FieldShell>
											<TextInput value={d.vendor} onChange={v => patch({ vendor: v })}
												placeholder="Search vendors…" aria-label="Vendor" aria-required="true" />
											{answer.vendorMatched && d.vendor === answer.vendor
												? <StatusChip style={{ height: 24, fontSize: 10.5 }}>matched</StatusChip>
												: null}
										</FieldShell>
									</Field>

									<FieldPair>
										<Field label="Date">
											<DateInput label="Order date" value={d.date}
												onChange={v => patch({ date: v })} aria-required="true" />
										</Field>
										<Field label="Status" group>
											<Segmented options={['Ordered', 'Delivered', 'Returned']}
												value={d.status} onChange={v => patch({ status: v })} label="Status" />
										</Field>
									</FieldPair>

									<FieldPair>
										<Field label="Shipping fee"
											help="Not on the receipt; add it if the order was delivered.">
											<FieldShell>
												<TextInput inputMode="decimal" value={d.shipping}
													onChange={v => patch({ shipping: v })} aria-label="Shipping fee" />
												<FieldUnit>kr.</FieldUnit>
											</FieldShell>
										</Field>
										<Field label="Kind" help="Only expenses count towards your totals.">
											<Combobox label="Kind" value={d.kind} onChange={v => patch({ kind: v })} required
												groups={[{ heading: 'Kinds', options: spendKinds.map(k => ({ id: k, label: k })) }]} />
										</Field>
									</FieldPair>

									<div>
										<div className="space-between space-between-tight">
											<span className="section-label">Lines read · {answer.linesRead}</span>
											<span className="field-help">the pencil corrects a line</span>
										</div>
										<InsetPanel>
											{d.lines.map(line => (
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
											{/* The remainder is a count and a total, not a row that pretends to be a
											    line. Opening it is the honest action for it, so SHOW ALL is a button. */}
											{d.remainder?.count ? (
												<ItemRow icon="dots"
													iconTone={{ background: '#EFF3EE', color: 'var(--text-muted)' }}
													title={`${d.remainder.count} more lines`}
													meta={showAll
														? 'Kept as read; the document stays attached to the order.'
														: `${kr(d.remainder.total)} together`}>
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

									<FormActions split>
										<Button variant="ghost" to="/scan">DISCARD</Button>
										<Button variant="caps" onClick={save} disabled={saving}>
											{saving ? 'SAVING…' : 'SAVE ORDER'}</Button>
									</FormActions>
								</Form>
							</CardBody>
						</Card>
					</div>

					<div className="order-list-column">
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
					</div>
					</div>
				)
			}}</Async>
		</Page>
	)
}

/** A line of the receipt, opened for correction. Three fields, the same grammar the rest of
    the app uses for money, and no save until they parse. */
function LineEditor({ line, onSave, onCancel }) {
	const [title, setTitle] = useState(line.title)
	const [quantity, setQuantity] = useState(String(line.quantity))
	const [price, setPrice] = useState(amount(line.price))
	const [error, setError] = useState('')

	const submit = () => {
		if (!title.trim()) { setError('Describe the line.'); return }
		if (!WHOLE_NUMBER_PATTERN.test(quantity) || Number(quantity) < 1) {
			setError('Whole pieces only, such as 2.'); return
		}
		if (!AMOUNT_PATTERN.test(price)) { setError('Amounts take a comma, such as 24,95.'); return }
		setError('')
		onSave({ title: title.trim(), quantity: Number(quantity), price: parseAmount(price) })
	}

	const keys = e => {
		if (e.key === 'Enter') { e.preventDefault(); submit() }
		else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel() }
	}

	return (
		<div className="filter-section" style={{ margin: '4px 0' }}>
			<Field label="Line" error={error} errorId={`line-${line.id}-error`}>
				<FieldShell>
					<TextInput id={`line-${line.id}`} value={title} onChange={setTitle} autoFocus
						aria-label="Line description" invalid={Boolean(error)}
						describedBy={`line-${line.id}-error`} onKeyDown={keys} />
				</FieldShell>
			</Field>
			<FieldPair>
				<Field label="Quantity">
					<FieldShell>
						<TextInput inputMode="numeric" value={quantity} onChange={setQuantity}
							aria-label="Quantity" onKeyDown={keys} />
						<FieldUnit>pcs</FieldUnit>
					</FieldShell>
				</Field>
				<Field label="Price">
					<FieldShell>
						<TextInput inputMode="decimal" value={price} onChange={setPrice}
							aria-label="Price" onKeyDown={keys} />
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
