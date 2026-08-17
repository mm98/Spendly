import { useMemo, useRef, useState } from 'react'
import { Sep } from '../components/Sep.jsx'
import { useNavigate, useSearchParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState, Note } from '../components/Card.jsx'
import { Stepper } from '../components/Stepper.jsx'
import { FormPage, RecordWait } from '../components/FormPage.jsx'
import { InsetPanel, ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { DocumentPreview, ProgressBar } from '../components/Viz.jsx'
import { HiddenFileInput } from '../components/FileInput.jsx'
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
	addVendorAlias, attachScanDocument, createOrder, createVendor, failureMessage, getRecentScans,
	getScanDraft, getVendors, invalidateOrderData, invalidateVendorData, putScanDocument,
	scanFileUrl, scanThumbnailUrl, spendKinds, vendorByAnyName
} from '../api/client.js'
import { LINE_FIELDS, ORDER_FIELDS } from '../api/rules.js'
import { amount, AMOUNT_PATTERN, currency, currencySymbol, fullStop, parseAmount } from '../api/format.js'

/* Scan, in three steps.

   The hero says the app takes "a PDF, photo or screenshot" and four entry buttons name the
   formats one by one -- and all four used to land on a review screen reading
   kvittering-bilka.jpg, 2,1 MB, drawn with a receipt glyph. Nothing could catch it: one
   document was the only document, so every screenshot, every walk and all three engines
   agreed with each other about the wrong thing.

   So the choice travels: the entry names the document, the URL carries it, and both steps
   after it render what was actually picked. The format is the file's, which is why a page
   count belongs to the PDFs and to nothing else. There is no OCR behind any of it -- the
   draft underneath is the same honest blank in every case, today's date and the account's
   own defaults, nothing read from the file. README: Scan Flow. */

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
	const toast = useToast()
	const go = key => navigate('/scan/reading?doc=' + key)

	/* The hero says "Drop a receipt here, or click to choose a file" and now it does both. A
	   dropped file is the document the next two steps name, with its own format and its own
	   size; what the reader finds inside is an honest blank draft, since nothing here reads
	   the file. A prompt bar that says drop and answers only a click is the decorative-control
	   rule wearing a different sense. README: Scan Flow, Honest Affordances. */
	const upload = files => {
		const file = files[0]
		if (!file) return
		/* The upload is a write to the recent-scans list this very page draws -- walking back
		   here has to show the document that was just dropped. */
		putScanDocument(file)
			.then(({ key }) => { invalidate(getRecentScans); go(key) })
			/* A dropped file that fails to upload used to do nothing at all -- no navigation and
			   no sentence, which reads as the drop not registering. README: Feedback. */
			.catch(e => toast(failureMessage(e, 'The upload failed. Try again.'), 'negative'))
	}

	return (
		<Page>
			<div className="hero hero-column">
				<h2>Receipts read at your fingertips.</h2>
				<p>Drop a PDF, photo or screenshot. The AI drafts the order; you review every value before it is saved.</p>
				<div className={'ai-prompt-bar scan-drop' + (over ? ' is-dragover' : '')}
					onDragOver={e => { e.preventDefault(); setOver(true) }}
					onDragEnter={e => { e.preventDefault(); setOver(true) }}
					onDragLeave={() => setOver(false)}
					onDrop={e => {
						e.preventDefault(); setOver(false)
						upload([...(e.dataTransfer?.files ?? [])])
					}}
					onClick={() => picker.current?.click()}>
					<span aria-hidden="true"><Icon name="receipt" className="icon scan-drop-icon" /></span>
					<span className="field-shell-placeholder">Drop a receipt here, or click to choose a file...</span>
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

			<div className="two-column scan-info-row">
				<div className="card card-question">
					<span className="card-question-label">What the AI checks</span>
					<div className="card-question-title">Nothing is stored until you approve it</div>
					<div className="account-row">
						<span><Icon name="check" className="icon scan-check-icon" /></span>
						<span className="account-row-text">Totals reconciled against the printed total, incl. 25% VAT</span>
					</div>
					<div className="account-row">
						<span><Icon name="eye" className="icon scan-info-icon" /></span>
						<span className="account-row-text">Possible duplicates flagged with date and amount to compare</span>
					</div>
					<div className="account-row">
						<span><Icon name="tag" className="icon scan-info-icon" /></span>
						<span className="account-row-text">Vendor matched to your list, or offered as a new vendor</span>
					</div>
				</div>

				<Card aria-label="Recent scans">
					<CardHeader title="Recent scans" />
					<CardDivider />
					<CardBody variant="card-body-tight">
						<Async state={recent} label="Loading recent scans">{scans => (
							scans.length ? (
								<>
									<InsetPanel>
										{scans.map(scan => (
											<ItemRow key={scan.id} icon="check" title={scan.name} meta={scan.meta}
												amount={currency(scan.total)} to={`/orders/${scan.orderId}`} />
										))}
									</InsetPanel>
									{/* Says orders, because that is where it goes: a scan becomes an order and
									    there is no list of scans to show all of. Inside the branch with rows:
									    over an empty panel it was a closing action for a list with nothing in
									    it, under a panel drawn as a bare grey band. README: Empty states,
									    Honest Affordances. */}
									<Button variant="block" to="/orders/all">SEE ALL ORDERS</Button>
								</>
							) : (
								<EmptyState>
									<p>No scans yet. A receipt you scan becomes an order and lands here.</p>
								</EmptyState>
							)
						)}</Async>
					</CardBody>
				</Card>
			</div>
		</Page>
	)
}

/* ---- step 2 ---- */

export function ScanReading() {
	const key = useDocumentKey()
	// Same fetch ScanReview makes for the same key — useApi caches it, so this doesn't cost a
	// second round trip once step 3 opens.
	const draft = useApi(getScanDraft, [key])

	return (
		<Page>
			<Stepper steps={SCAN_STEPS(1)} />
			<Async state={draft} label="Loading the document">{answer => {
				const file = answer.file
				return (
					<Card aria-label="Reading the document" aria-busy="true">
						<CardBody variant="card-body-centered">
							<DocumentPreview kind={file.kind} className="scan-reading-preview"
								src={file.hasThumbnail ? scanThumbnailUrl(key) : undefined} />
							<div>
								<div className="card-headline">Reading {file.name}</div>
								<span className="field-help">
									This usually takes a few seconds. Nothing is stored until you approve the review.</span>
							</div>
							<ProgressBar className="scan-reading-progress" label="Reading progress" />
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
	const vendors = useApi(getVendors)
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
	const [newLineId, setNewLineId] = useState(null)
	const [sourceOpen, setSourceOpen] = useState(false)

	/* There is no OCR behind this review yet (see api/scan/draft/:key on the server) — a
	   freshly uploaded document reads back with no lines at all, and the only way this form
	   could edit a line was to already have one. ADD LINE opens a blank one the same editor
	   below already knows how to save; cancelling a line that was never saved removes it again
	   rather than leaving an empty row behind. */
	const addLine = () => {
		const id = 'l-new-' + crypto.randomUUID()
		patch({ lines: [...draft.lines, { id, title: '', quantity: 1, price: 0 }] })
		setNewLineId(id)
		setEditingLine(id)
	}
	const cancelLine = id => {
		if (id === newLineId) { patch({ lines: draft.lines.filter(l => l.id !== id) }); setNewLineId(null) }
		setEditingLine(null)
	}

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

	/* The info card on step 1 promises "Vendor matched to your list, or offered as a new
	   vendor", and CREATE VENDOR "..." at the foot of the list is the second half of that
	   promise doing the verb -- the same wiring as New order and Edit order, because create
	   and scan are two doors to one saved order. README: Honest Affordances. */
	/* Same rule as New order: typed text that is an existing vendor's alias picks that vendor,
	   never creates a twin -- the action row says USE before it is pressed, and the guard in
	   addVendor resolves identically if pressed anyway. A receipt's misspelt-but-known vendor
	   line is exactly the string aliases exist to catch. */
	const aliasHit = vendorByAnyName(vendors.data ?? [], draft.vendor)

	const addVendor = name => {
		const clean = String(name).trim()
		if (!clean) return
		const existing = vendorByAnyName(vendors.data ?? [], clean)
		if (existing) {
			patch({ vendor: existing.name })
			recheck('order-vendor', existing.name)
			toast(`"${clean}" is an alias of ${existing.name}, so ${existing.name} is used.`)
			return
		}
		createVendor(clean)
			.then(vendor => {
				invalidateVendorData()
				vendors.refresh()
				patch({ vendor: vendor.name })
				recheck('order-vendor', vendor.name)
				toast(`${vendor.name} added to your vendors.`)
			})
			.catch(e => toast(failureMessage(e, 'The vendor was not created. Try again.'), 'negative'))
	}

	const saveLine = (id, values) => {
		patch({ lines: draft.lines.map(l => (l.id === id
			? { ...l, title: values.title, quantity: values.quantity, price: values.price,
				uncertain: false, meta: undefined, amount: undefined }
			: l)) })
		const wasNew = id === newLineId
		if (wasNew) setNewLineId(null)
		setEditingLine(null)
		toast(wasNew ? `${values.title} added.` : `${values.title} corrected.`)
	}

	const linesTotal = draft.lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
		+ (draft.remainder?.total ?? 0)
	const shipping = draft.shipping && AMOUNT_PATTERN.test(draft.shipping)
		? parseAmount(draft.shipping) : 0

	const save = () => {
		const failed = check()
		if (failed.length) {
			setStatus({ message: 'Cannot save: ' + needFixing(failed), good: false })
			focusField(failed[0].name)
			return
		}
		if (!draft.lines.length) {
			setStatus({ message: 'An order needs at least one line.', good: false })
			return
		}
		/* The draft is what gets submitted, so the draft is what gets checked. ADD LINE puts its
		   blank row into the draft the moment the editor opens, so a line abandoned mid-edit --
		   editor still open, or left behind by opening another line's pencil -- reaches this
		   button as an item the server rejects. The same three rules the line editor runs, over
		   the values the editor would have been given. */
		for (const line of draft.lines) {
			const lineValues = {
				'line-description': line.title, 'line-quantity': String(line.quantity),
				'line-price': amount(line.price)
			}
			const failedLine = LINE_FIELDS.filter(f => f.check(String(lineValues[f.name] ?? '').trim()))
			if (failedLine.length) {
				setEditingLine(line.id)
				setStatus({ message: 'Cannot save: ' + needFixing(failedLine), good: false })
				focusField(failedLine[0].name)
				return
			}
		}
		setStatus({ message: '', good: true })
		setSaving(true)
		createOrder({
			vendor: draft.vendor, date: draft.date, status: draft.status, kind: draft.kind,
			categories: [], shipping: draft.shipping,
			items: draft.lines.map(l => ({ id: l.id, title: l.title, quantity: l.quantity, price: l.price }))
		})
			/* The order is saved either way -- navigation proceeds -- but a receipt that quietly
			   failed to attach is the one claim this flow exists to keep, so the failure is said. */
			.then(order => attachScanDocument(answer.documentKey, order.id).then(() => order)
				.catch(() => { toast('Order saved, but the receipt did not attach.', 'negative'); return order }))
			.then(order => {
				/* The document's vendor line said one string and the order was just filed under
				   another -- the correction is the mapping, so it is kept: the scanned string
				   becomes an alias of the chosen vendor, and the next receipt naming it matches
				   without being corrected. Best-effort, quietly: the order is already saved, and
				   an alias that cannot be kept (the string is some other vendor's name) is not
				   this save's failure. The server no-ops an alias the vendor already has. */
				const scanned = String(answer.vendor ?? '').trim()
				if (scanned && order.vendor?.id
					&& scanned.toLowerCase() !== draft.vendor.trim().toLowerCase())
					addVendorAlias(order.vendor.id, scanned)
						.then(() => invalidateVendorData()).catch(() => {})
				invalidateOrderData()
				/* Attaching consumed the scanned document, so the recent-scans list on the
				   landing step no longer holds it. */
				invalidate(getRecentScans)
				navigate('/orders/' + order.id)
			})
			.catch(e => { setSaving(false)
				toast(failureMessage(e, 'That did not save. Try again.'), 'negative') })
	}

	return (
		<FormPage
			title="Review the draft" lead="Every value is editable. Nothing is stored until you save."
			steps={SCAN_STEPS(2)} status={status}
			cancel={{ to: '/scan', label: 'DISCARD' }}
			submit={{ label: saving ? 'SAVING...' : 'SAVE ORDER', onClick: save, disabled: saving }}
			notice={
				/* The verdict is about the numbers on screen, so it is recomputed from them:
				   correct a line and the note either still says the total matches or stops saying
				   it. A fixed "Total matches." over edited figures is the app asserting something
				   it has not checked. */
				Math.abs(linesTotal + shipping - answer.total) < 0.005 ? (
					<Note tone="positive" title="Total matches." className="note-lead">
						{answer.reconciled}
					</Note>
				) : (
					<Note tone="warning" title="Total no longer matches." className="note-lead">
						The lines now add up to {currency(linesTotal + shipping)}, against the document total
						of {currency(answer.total)}{fullStop()} Saving keeps what is on screen.
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
							    that tells you nothing about what pressing it does.

							    A PDF's toggle swapped this same <img> to the raw PDF's own bytes, which
							    no browser decodes as an image -- ImageOrIcon's onError fallback silently
							    replaced the thumbnail with a bare document glyph, the opposite of "big
							    enough to read from". A real link, opened in a new tab, hands it to the
							    browser's own PDF viewer instead; an image has no such problem; the swap
							    already showed its own real bytes correctly. */}
							{answer.file.kind === 'pdf' ? (
								<a className="button button-pill" href={scanFileUrl(answer.documentKey)}
									target="_blank" rel="noopener noreferrer">OPEN</a>
							) : (
								<button type="button" className="button button-pill"
									aria-expanded={sourceOpen} aria-controls="scan-source-preview"
									onClick={() => setSourceOpen(o => !o)}>{sourceOpen ? 'CLOSE' : 'OPEN'}</button>
							)}
						</CardHeader>
						<CardDivider />
						<CardBody>
							<DocumentPreview kind={answer.file.kind} id="scan-source-preview"
								className={sourceOpen ? 'scan-source-open' : undefined}
								src={answer.file.hasThumbnail
									? (sourceOpen ? scanFileUrl(answer.documentKey) : scanThumbnailUrl(answer.documentKey))
									: undefined} />
							<div className="space-between document-name-row">
								<span className="document-name">{answer.file.name}</span>
								<span className="field-help">{answer.file.meta}</span>
							</div>
							<span className="field-help">Saved as an attachment on the order when you save.</span>
						</CardBody>
					</Card>

					{answer.duplicate ? (
						<Card aria-label="Possible duplicate">
							<CardHeader title="Possible duplicate" />
							<CardDivider />
							<CardBody>
								<Note tone="warning" title="Check before saving." className="note-above-row">
									You already have a {answer.vendor} order within 14 days of this date.
								</Note>
								<ItemRow thumb="receipt" to={`/orders/${answer.duplicate.orderId}`}
									title={answer.duplicate.title} meta={answer.duplicate.meta}
									amount={currency(answer.duplicate.total)} />
							</CardBody>
						</Card>
					) : null}

					{answer.checks.length ? (
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
					) : null}
				</>
			}>

			<Field label="Vendor" error={vendorField.error} errorId={vendorField.errorId} htmlFor="order-vendor">
				<Combobox id="order-vendor" label="Vendor" required
					placeholder="Search vendors..." value={draft.vendor}
					invalid={vendorField.invalid} describedBy={vendorField.describedBy}
					onChange={set('order-vendor', 'vendor')}
					onSelect={o => { patch({ vendor: o.label }); recheck('order-vendor', o.label) }}
					leadingIcon="search"
					trail={answer.vendorMatched && draft.vendor === answer.vendor
						? <StatusChip className="chip-matched">matched</StatusChip>
						: null}
					groups={[
						{ heading: 'Favourites', options: (vendors.data ?? []).filter(v => v.favourite)
							.map(v => ({ id: v.id, label: v.name, meta: `${v.orders} orders`, star: true })) },
						{ heading: 'All vendors', options: (vendors.data ?? []).filter(v => !v.favourite)
							.map(v => ({ id: v.id, label: v.name, meta: `${v.orders} orders` })) }
					]}
					action={aliasHit
						? { icon: 'check',
							label: `USE ${aliasHit.name.toUpperCase()}: "${draft.vendor.trim().toUpperCase()}" IS ITS ALIAS`,
							onSelect: addVendor }
						: { icon: 'plus', label: `CREATE VENDOR "${draft.vendor.toUpperCase()}"`,
							onSelect: addVendor }} />
			</Field>

			<FieldPair>
				<Field label="Date" error={dateField.error} errorId={dateField.errorId} htmlFor="order-date">
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
				<Field label="Shipping fee" error={shippingField.error} errorId={shippingField.errorId} htmlFor="order-shipping"
					help="Not on the receipt; add it if the order was delivered.">
					<FieldShell>
						<TextInput id="order-shipping" inputMode="decimal" value={draft.shipping}
							onChange={set('order-shipping', 'shipping')} aria-label="Shipping fee"
							invalid={shippingField.invalid} describedBy={shippingField.describedBy} />
						<FieldUnit>{currencySymbol()}</FieldUnit>
					</FieldShell>
				</Field>
				<Field label="Kind" error={kindField.error} errorId={kindField.errorId} htmlFor="order-kind"
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
					<span className="section-label">Lines read<Sep />{answer.linesRead}</span>
					<span className="field-help">the pencil corrects a line<Sep />ADD LINE for one that wasn't read</span>
				</div>
				<InsetPanel>
					{draft.lines.map(line => (
						editingLine === line.id ? (
							<LineEditor key={line.id} line={line}
								onSave={values => saveLine(line.id, values)}
								onCancel={() => cancelLine(line.id)} />
						) : (
							<ItemRow key={line.id}
								icon={line.uncertain ? 'alert' : 'check'}
								iconTone={line.uncertain ? { background: '#F6ECD9', color: '#84651E' } : undefined}
								title={line.title}
								meta={line.meta ?? `${line.quantity} × ${currency(line.price)}`}
								amount={currency(line.price * line.quantity)}>
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
								: `${currency(draft.remainder.total)} together`}>
							{showAll ? null : (
								<ButtonLink className="push-end"
									onClick={() => setShowAll(true)}>SHOW ALL</ButtonLink>
							)}
						</ItemRow>
					) : null}
				</InsetPanel>
				{editingLine === null ? (
					<Button variant="ghost compact" icon="plus" className="panel-cta"
						onClick={addLine}>ADD LINE</Button>
				) : null}
			</div>

			<SummaryRow label="Lines subtotal" value={currency(linesTotal)} />
			<SummaryRow label="Shipping" value={currency(shipping)} />
			<div className="card-divider card-divider-tight" />
			<SummaryTotal value={currency(linesTotal + shipping)} />
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
		<div className="filter-section line-editor">
			<Field label="Line" error={description.error} errorId={description.errorId} htmlFor="line-description">
				<FieldShell>
					<TextInput id="line-description" value={form['line-description']} autoFocus
						onChange={set('line-description')} aria-label="Line description"
						aria-required="true" invalid={description.invalid}
						describedBy={description.describedBy} onKeyDown={keys} />
				</FieldShell>
			</Field>
			<FieldPair>
				<Field label="Quantity" error={quantity.error} errorId={quantity.errorId} htmlFor="line-quantity">
					<FieldShell>
						<TextInput id="line-quantity" inputMode="numeric" value={form['line-quantity']}
							onChange={set('line-quantity')} aria-label="Quantity" aria-required="true"
							invalid={quantity.invalid} describedBy={quantity.describedBy} onKeyDown={keys} />
						<FieldUnit>pcs</FieldUnit>
					</FieldShell>
				</Field>
				<Field label="Price" error={price.error} errorId={price.errorId} htmlFor="line-price">
					<FieldShell>
						<TextInput id="line-price" inputMode="decimal" value={form['line-price']}
							onChange={set('line-price')} aria-label="Price" aria-required="true"
							invalid={price.invalid} describedBy={price.describedBy} onKeyDown={keys} />
						<FieldUnit>{currencySymbol()}</FieldUnit>
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
