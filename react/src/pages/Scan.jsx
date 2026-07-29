import { useState } from 'react'
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
	DateInput, Field, FieldPair, FieldShell, FieldUnit, Form, FormActions, Segmented, TextInput
} from '../components/Form.jsx'
import { useApi, invalidate } from '../api/useApi.js'
import {
	getHomeContent, getOrders, getOrdersOverview, getRecentScans, getScanDocuments, getScanDraft, spendKinds
} from '../api/client.js'
import { kr } from '../api/format.js'

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
	const [status, setStatus] = useState('Delivered')
	const [showAll, setShowAll] = useState(false)

	const save = () => {
		invalidate(getOrders); invalidate(getHomeContent); invalidate(getOrdersOverview)
		navigate('/orders')
	}

	return (
		<Page>
			<Stepper steps={SCAN_STEPS(2)} />
			<Async state={state} label="Loading the draft">{draft => (
				<div className="order-list-grid">
					<div className="order-list-column">
						<Card aria-label="Review the draft">
							<CardBody variant="card-body-page">
								<div className="card-headline">Review the draft</div>
								<p className="card-lead">Every value is editable. Nothing is stored until you save.</p>
								<Note tone="positive" title="Total matches." style={{ marginBottom: 16 }}>
									{draft.reconciled}
								</Note>
								<Form>
									<Field label="Vendor">
										<FieldShell>
											<TextInput defaultValue={draft.vendor} placeholder="Search vendors…"
												aria-label="Vendor" aria-required="true" />
											{draft.vendorMatched
												? <StatusChip style={{ height: 24, fontSize: 10.5 }}>matched</StatusChip>
												: null}
										</FieldShell>
									</Field>

									<FieldPair>
										<Field label="Date">
											<DateInput label="Order date" value={draft.date} onChange={() => {}}
												aria-required="true" />
										</Field>
										<Field label="Status" group>
											<Segmented options={['Ordered', 'Delivered', 'Returned']}
												value={status} onChange={setStatus} label="Status" />
										</Field>
									</FieldPair>

									<FieldPair>
										<Field label="Shipping fee"
											help="Not on the receipt; add it if the order was delivered.">
											<FieldShell>
												<TextInput inputMode="decimal" defaultValue="0,00" aria-label="Shipping fee" />
												<FieldUnit>kr.</FieldUnit>
											</FieldShell>
										</Field>
										<Field label="Kind" help="Only expenses count towards your totals.">
											<Combobox label="Kind" value={draft.kind} onChange={() => {}} required
												groups={[{ heading: 'Kinds', options: spendKinds.map(k => ({ id: k, label: k })) }]} />
										</Field>
									</FieldPair>

									<div>
										<div className="space-between space-between-tight">
											<span className="section-label">Lines read · {draft.linesRead}</span>
											<span className="field-help">tap a line to correct it</span>
										</div>
										<InsetPanel>
											{draft.lines.map(line => (
												<ItemRow key={line.id}
													icon={line.uncertain ? 'alert' : 'check'}
													iconTone={line.uncertain ? { background: '#F6ECD9', color: '#84651E' } : undefined}
													title={line.title}
													meta={line.meta ?? `${line.quantity} × ${kr(line.price)}`}
													amount={kr(line.amount ?? line.price * line.quantity)}>
													<IconButton icon="pencil" label={`Edit ${line.title}`} />
												</ItemRow>
											))}
											{/* The remainder is a count and a total, not a row that pretends to be a
											    line. Opening it is the honest action for it, so SHOW ALL is a button. */}
											{!showAll && draft.remainder.count ? (
												<ItemRow icon="dots"
													iconTone={{ background: '#EFF3EE', color: 'var(--text-muted)' }}
													title={`${draft.remainder.count} more lines`}
													meta={`${kr(draft.remainder.total)} together`}>
													<ButtonLink style={{ marginLeft: 'auto' }}
														onClick={() => setShowAll(true)}>SHOW ALL</ButtonLink>
												</ItemRow>
											) : null}
											{showAll ? (
												<ItemRow icon="dots"
													iconTone={{ background: '#EFF3EE', color: 'var(--text-muted)' }}
													title={`${draft.remainder.count} more lines`}
													meta="The full receipt is attached to the order when you save." />
											) : null}
										</InsetPanel>
									</div>

									<SummaryRow label="Lines subtotal" value={kr(draft.subtotal)} />
									<SummaryRow label="Shipping" value={kr(draft.shipping)} />
									<div className="card-divider" style={{ margin: '2px 0 0' }} />
									<SummaryTotal value={kr(draft.total)} />

									<FormActions split>
										<Button variant="ghost" to="/scan">DISCARD</Button>
										<Button variant="caps" onClick={save}>SAVE ORDER</Button>
									</FormActions>
								</Form>
							</CardBody>
						</Card>
					</div>

					<div className="order-list-column">
						<Card aria-label="Source document">
							<CardHeader title="Source">
								<button type="button" className="button button-pill">OPEN</button>
							</CardHeader>
							<CardDivider />
							<CardBody>
								<DocumentPreview kind={draft.file.kind} />
								<div className="space-between document-name-row" style={{ marginTop: 10 }}>
									<span className="document-name">{draft.file.name}</span>
									<span className="field-help">{draft.file.meta}</span>
								</div>
								<span className="field-help">Saved as an attachment on the order when you save.</span>
							</CardBody>
						</Card>

						<Card aria-label="Possible duplicate">
							<CardHeader title="Possible duplicate" />
							<CardDivider />
							<CardBody>
								<Note tone="warning" title="Check before saving." style={{ marginBottom: 10 }}>
									You already have a {draft.vendor} order within 14 days of this date.
								</Note>
								<ItemRow thumb="receipt" to={`/orders/${draft.duplicate.orderId}`}
									title={draft.duplicate.title} meta={draft.duplicate.meta}
									amount={kr(draft.duplicate.total)} />
							</CardBody>
						</Card>

						<Card aria-label="What was checked">
							<CardHeader title="What was checked" />
							<CardDivider />
							<CardBody>
								<InsetPanel>
									{draft.checks.map(check => (
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
			)}</Async>
		</Page>
	)
}
