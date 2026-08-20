import { useEffect, useMemo, useRef, useState } from 'react'
import { Sep } from '../components/Sep.jsx'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async, Waiting } from '../components/Async.jsx'
import { SkeletonRows } from '../components/Skeleton.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState, Note } from '../components/Card.jsx'
import { Stepper } from '../components/Stepper.jsx'
import { FormPage, RecordWait, useDelete } from '../components/FormPage.jsx'
import { InsetPanel, ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { DocumentPreview, ProgressBar } from '../components/Viz.jsx'
import { JsonDialog } from '../components/Json.jsx'
import { HiddenFileInput } from '../components/FileInput.jsx'
import { RECEIPT_FILES } from '../components/fileKinds.js'
import { Button, ButtonLink, IconButton } from '../components/Button.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { StatusChip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import {
	DateInput, Field, FieldPair, FieldShell, FieldUnit, FormActions, Segmented, TextInput,
	focusField, useFieldErrors
} from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { useApi, invalidate } from '../api/useApi.js'
import { useVendorPicker } from '../api/useVendorPicker.js'
import {
	addVendorAlias, attachScanDocument, createOrder, deleteScanDocument, failureMessage, getCurrentUser,
	getRecentScans, getScanDraft, getVendors, invalidateOrderData, invalidateVendorData, putScanDocument,
	scanFileUrl, scanThumbnailUrl, spendKinds
} from '../api/client.js'
import { LINE_FIELDS, ORDER_FIELDS } from '../api/rules.js'
import { amount, AMOUNT_PATTERN, currency, currencySymbol, fullStop, parseAmount, plural, sep } from '../api/format.js'

/* Scan, in three steps.

   The hero says the app takes "a PDF, photo or screenshot" and four entry buttons name the
   formats one by one -- they used to each carry their own fixed key ('invoice', 'photo', ...)
   straight to step 2, so a click needed no document at all: the reading step then asked the
   server for a draft of a document that had never been uploaded, which 404s. All four are
   entries to the *same* picker now -- they describe what the app accepts, they do not stand
   in for a file -- so the document the next two steps name is always one the reader actually
   chose, with its own format and its own size.

   There is no OCR behind any of it when ANTHROPIC_API_KEY is unset -- the draft is the same
   honest blank in that case, today's date and the account's own defaults, nothing read from
   the file. Where it is set, the draft is a real read (lib/scanParse.js on the server); either
   way this page does not know which, and renders the same three steps. README: Scan Flow. */

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
	const location = useLocation()
	const recent = useApi(getRecentScans)
	// Cached by the route loader already (react/src/routes.jsx), so this costs nothing extra --
	// it just reads back whether the server this account is talking to can actually read a
	// document (ANTHROPIC_API_KEY set) or only store one, so the hero and the checklist below
	// don't promise a read this install cannot do. README: Honest Affordances.
	const aiEnabled = useApi(getCurrentUser).data?.scanAiEnabled ?? false
	const navigate = useNavigate()
	const picker = useRef(null)
	const [over, setOver] = useState(false)
	const toast = useToast()

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
			.then(({ key, name, kind, meta, hasThumbnail }) => {
				invalidate(getRecentScans)
				/* The thumbnail already exists server-side the moment this response comes back --
				   handing its facts down as navigation state lets the reading step draw it straight
				   away, instead of waiting on the document read (which can take several seconds) to
				   learn what the upload itself already knows. README: Scan Flow. */
				navigate('/scan/reading?doc=' + key, { state: { documentKey: key, name, kind, meta, hasThumbnail } })
			})
			/* A dropped file that fails to upload used to do nothing at all -- no navigation and
			   no sentence, which reads as the drop not registering. README: Feedback. */
			.catch(e => toast(failureMessage(e, 'The upload failed. Try again.'), 'negative'))
	}

	return (
		<Page>
			<div className="hero hero-column">
				<h2>{aiEnabled ? 'Scan a receipt and Spendly reads it for you.' : 'Attach a receipt to an order.'}</h2>
				<p>{aiEnabled
					? 'Drop a PDF, photo or screenshot. The AI drafts the order; you review every value before it is saved.'
					: 'Drop a PDF, photo or screenshot, then fill in the order yourself. Nothing here reads the file for you.'}</p>
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
					<HiddenFileInput ref={picker} kind={RECEIPT_FILES} label="Choose a receipt" onFiles={upload} />
					<IconButton variant="send" icon="upload" label="Choose a receipt to scan"
						onClick={e => { e.stopPropagation(); picker.current?.click() }} />
				</div>
				{/* Each of these names a format the drop zone above already takes -- there is one
				    picker, filtered the same way for all four, since a chip is a description of
				    what the app accepts and not a second way to start a scan without a document.
				    README: Scan Flow. */}
				<div className="ai-suggestion-row">
					{ENTRIES.map(entry => (
						<button key={entry.key} type="button" onClick={() => picker.current?.click()}>
							<Icon name={entry.icon} />{entry.label}
						</button>
					))}
				</div>
			</div>

			<div className="two-column scan-info-row">
				<div className="card card-question">
					<span className="card-question-label">{aiEnabled ? 'What the AI checks' : 'What happens next'}</span>
					<div className="card-question-title">Nothing is stored until you approve it</div>
					{aiEnabled ? (
						<>
							<div className="account-row">
								<span><Icon name="check" className="icon scan-check-icon" /></span>
								<span className="account-row-text">Totals checked against the printed total, including VAT</span>
							</div>
							<div className="account-row">
								<span><Icon name="eye" className="icon scan-info-icon" /></span>
								<span className="account-row-text">Possible duplicates flagged with date and amount to compare</span>
							</div>
							<div className="account-row">
								<span><Icon name="tag" className="icon scan-info-icon" /></span>
								<span className="account-row-text">Vendor matched to your list, or offered as a new vendor</span>
							</div>
						</>
					) : (
						<>
							<div className="account-row">
								<span><Icon name="pencil" className="icon scan-info-icon" /></span>
								<span className="account-row-text">You fill in the vendor, date and line items yourself</span>
							</div>
							<div className="account-row">
								<span><Icon name="receipt" className="icon scan-info-icon" /></span>
								<span className="account-row-text">The file is kept and attached to the order for reference</span>
							</div>
						</>
					)}
				</div>

				<Card aria-label="Recent scans">
					<CardHeader title="Recent scans" />
					<CardDivider />
					<CardBody variant="card-body-tight">
						<Async state={recent} label="Loading recent scans" skeleton={<SkeletonRows count={3} />}>{scans => (
							scans.length ? (
								<>
									<InsetPanel>
										{scans.map(scan => (
											<ItemRow key={scan.id} icon="check" title={scan.name} meta={scan.meta}
												amount={currency(scan.total)} to={`/orders/${scan.orderId}`}
												state={{ from: location.pathname + location.search }} />
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
	const navigate = useNavigate()
	const location = useLocation()
	// Same fetch ScanReview makes for the same key — useApi caches it, so this doesn't cost a
	// second round trip once step 3 opens.
	const draft = useApi(getScanDraft, [key])

	/* Handed down from the upload itself (ScanUpload's navigate call) -- the thumbnail and the
	   file's own facts exist the moment the upload responds, well before the read behind
	   `draft` above has anything to say. Only trusted for the document this render is actually
	   showing: a reload of this URL, or a second scan whose route hasn't remounted yet, carries
	   no state (or a stale one) and falls back to what the draft response itself names. */
	const uploaded = location.state?.documentKey === key ? location.state : null
	const file = uploaded ?? draft.data?.file

	/* The read finishes behind this same card, so once it has there is nothing left for a
	   button to open -- OPEN THE REVIEW used to sit here regardless, asking the reader to
	   confirm a wait that was already over. The progress bar now runs for exactly as long as
	   the read actually takes, and review opens the moment it does. */
	useEffect(() => {
		if (draft.data && !draft.loading) navigate(`/scan/review?doc=${key}`, { replace: true })
	}, [draft.data, draft.loading, key, navigate])

	return (
		<Page>
			<Stepper steps={SCAN_STEPS(1)} />
			{draft.error ? (
				<Card>
					<CardBody>
						<EmptyState icon="alert">
							<p>{draft.error.status === 404 ? 'Nothing here.' : 'That did not load.'} {draft.error.message}</p>
						</EmptyState>
					</CardBody>
				</Card>
			) : !file ? (
				<Waiting label="Loading the document" />
			) : (
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
					</CardBody>
				</Card>
			)}
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
	/* Set only once SAVE ORDER has actually been tried with an empty line list -- validation
	   errors show on submit, not while the list is still being built. Clears itself the
	   moment a line exists. */
	const [linesTried, setLinesTried] = useState(false)
	/* The one line SAVE ORDER opened because it failed the same three rules the line editor
	   itself checks -- marked the instant its card opens, since that open *is* the rejection,
	   rather than waiting for a second press of SAVE LINE to say so. A line opened by its own
	   pencil is not this: nothing is wrong with it yet, so nothing is marked until it is. */
	const [autoCheckLine, setAutoCheckLine] = useState(null)
	const toast = useToast()
	/* The draft the review is editing. It starts as what the reader returned and is what SAVE
	   ORDER writes -- so the fields on this page are the order, rather than a picture of one. */
	const [draft, setDraft] = useState(() => ({
		vendor: answer.vendor, date: answer.date, status: answer.status,
		kind: answer.kind, shipping: amount(answer.shipping), discount: answer.discount ? amount(answer.discount) : '',
		lines: answer.lines.map(l => ({ ...l, quantity: l.quantity ?? 1, price: l.price ?? l.amount })),
		remainder: answer.remainder
	}))
	const [editingLine, setEditingLine] = useState(null)
	const [newLineId, setNewLineId] = useState(null)
	const [sourceOpen, setSourceOpen] = useState(false)
	const [jsonOpen, setJsonOpen] = useState(false)

	/* The escape hatch for a document the model read wrong: DISCARD below only abandons this
	   form's edits, and re-uploading the same file afterwards would still hit the server's
	   hash-dedup lookup and hand back the very same misread draft (routes/scan.js) for as long
	   as it stays cached. Deleting the upload outright, not just this draft, is what lets a
	   retry actually retry. Same asking, same setting as every other delete (README: Deletion). */
	const documentDel = useDelete({
		what: 'document', variant: 'pill', icon: false, label: 'DELETE',
		detail: 'This also deletes what was read from it. Uploading it again reads it again, from the start.',
		onDelete: () => deleteScanDocument(answer.documentKey)
			.then(() => { invalidate(getRecentScans); navigate('/scan') })
			.catch(e => toast(failureMessage(e, 'That did not delete.'), 'negative'))
	})

	/* There is no OCR behind this review yet (see api/scan/draft/:key on the server) — a
	   freshly uploaded document reads back with no lines at all, and the only way this form
	   could edit a line was to already have one. ADD LINE opens a blank one the same editor
	   below already knows how to save; cancelling a line that was never saved removes it again
	   rather than leaving an empty row behind. */
	const addLine = () => {
		/* crypto.randomUUID only exists in a secure context (HTTPS, or localhost) -- opening the
		   app over plain HTTP from another machine on the network throws here rather than
		   returning a string, and this id is a React key and a scratch draft value only: the
		   server never trusts a client-supplied item id (routes/orders.js generates its own for
		   anything that isn't already a real saved item), so nothing downstream needs it to be
		   cryptographically random, only unique for this render. */
		const id = 'l-new-' + (typeof crypto?.randomUUID === 'function'
			? crypto.randomUUID()
			: Math.random().toString(36).slice(2) + Date.now().toString(36))
		patch({ lines: [...draft.lines, { id, title: '', quantity: 1, price: 0 }] })
		setNewLineId(id)
		setEditingLine(id)
		setAutoCheckLine(null)
	}
	const cancelLine = id => {
		if (id === newLineId) { patch({ lines: draft.lines.filter(l => l.id !== id) }); setNewLineId(null) }
		setEditingLine(null)
		setAutoCheckLine(null)
	}
	const removeLine = line => {
		patch({ lines: draft.lines.filter(l => l.id !== line.id) })
		setEditingLine(null)
		setAutoCheckLine(null)
		toast(`${line.title || 'Line'} removed.`)
	}
	/* No confirmation here, unlike every other row delete in the app (README: Deletion normally
	   asks). Nothing on this screen is saved yet -- SAVE ORDER is the one commit -- so removing
	   a misread line is exactly as reversible as never having typed it, and DISCARD already
	   throws away the whole draft with no question asked either. */
	const removeLineButton = line => (
		<IconButton icon="trash" label={`Delete ${line.title || 'this line'}`}
			onClick={() => removeLine(line)} />
	)

	/* The same four rules step 1 checks, from the same module. This screen used to check
	   nothing at all: a receipt whose vendor line came back blank saved an order with no
	   vendor on it, through a form whose twin says "Who did you buy from?" about that field.
	   Create and scan are two doors to one saved order. README: Fields and Forms. */
	const values = useMemo(() => ({
		'order-vendor': draft.vendor, 'order-date': draft.date,
		'order-kind': draft.kind, 'order-shipping': draft.shipping,
		'order-discount': draft.discount
	}), [draft])
	const { check, recheck, propsFor } = useFieldErrors(ORDER_FIELDS, values)
	const vendorField = propsFor('order-vendor')
	const dateField = propsFor('order-date')
	const kindField = propsFor('order-kind')
	const shippingField = propsFor('order-shipping')
	const discountField = propsFor('order-discount')

	const patch = p => setDraft(d => ({ ...d, ...p }))
	const set = (name, key) => v => { patch({ [key]: v }); recheck(name, v) }

	/* The info card on step 1 promises "Vendor matched to your list, or offered as a new
	   vendor", and CREATE VENDOR "..." at the foot of the list is the second half of that
	   promise doing the verb -- the same wiring as New order and Edit order, because create
	   and scan are two doors to one saved order. README: Honest Affordances. A receipt's
	   misspelt-but-known vendor line is exactly the string aliases exist to catch, so this is
	   the same useVendorPicker every order form shares. */
	const pickVendor = name => { patch({ vendor: name }); recheck('order-vendor', name) }
	const vendorPicker = useVendorPicker(vendors, draft.vendor, pickVendor, toast)

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
	const discount = draft.discount && AMOUNT_PATTERN.test(draft.discount)
		? parseAmount(draft.discount) : 0
	/* What the order comes to, and what the reconciliation note below is checked against: a
	   discount is part of what the receipt says was paid, so leaving it out of this would put
	   the note back to disagreeing with the figures beside it. */
	const orderTotal = linesTotal + shipping - discount

	const save = () => {
		const failed = check()
		if (failed.length) {
			focusField(failed[0].name)
			return
		}
		if (!draft.lines.length) {
			setLinesTried(true)
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
				setAutoCheckLine(line.id)
				focusField(failedLine[0].name)
				return
			}
		}
		setLinesTried(false)
		setSaving(true)
		createOrder({
			vendor: draft.vendor, date: draft.date, status: draft.status, kind: draft.kind,
			categories: [], shipping: draft.shipping, discount: draft.discount,
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
			steps={SCAN_STEPS(2)}
			cancel={{ to: '/scan', label: 'DISCARD' }}
			submit={{ label: saving ? 'SAVING...' : 'SAVE ORDER', onClick: save, disabled: saving }}
			notice={
				/* The verdict is about the numbers on screen, so it is recomputed from them:
				   correct a line and the note either still says the total matches or stops saying
				   it. A fixed "Total matches." over edited figures is the app asserting something
				   it has not checked. */
				Math.abs(orderTotal - answer.total) < 0.005 ? (
					<Note tone="positive" title="Total matches." className="note-lead">
						{answer.reconciled}
					</Note>
				) : (
					<Note tone="warning" title="Total no longer matches." className="note-lead">
						The lines now total {currency(orderTotal)}, against the document total
						of {currency(answer.total)}{fullStop()} Saving keeps what is on screen.
					</Note>
				)
			}
			rail={
				<>
					<Card aria-label="Source document">
						<CardHeader title="Source">
							<span className="row-inline">
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
							{/* What the source's own OPEN shows is the document; this is the other half --
							    what the review screen is actually built from, in the same formatted-JSON
							    shape Settings > Import already teaches a reader to read, rather than a
							    screen's worth of labelled fields standing in for it. */}
							<button type="button" className="button button-pill"
								aria-haspopup="dialog" onClick={() => setJsonOpen(true)}>DETAILS</button>
							{documentDel.button}
							</span>
						</CardHeader>
						{documentDel.dialog}
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
											iconTone={check.warning ? { background: 'var(--bg-warn)', color: 'var(--text-warn)' } : undefined}
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
					onSelect={o => pickVendor(o.label)}
					leadingIcon="search"
					trail={answer.vendorMatched && draft.vendor === answer.vendor
						? <StatusChip className="chip-matched">matched</StatusChip>
						: null}
					groups={vendorPicker.groups}
					action={vendorPicker.action} />
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
				<Field label="Discount" error={discountField.error} errorId={discountField.errorId} htmlFor="order-discount"
					help="Any discount taken off the whole order.">
					<FieldShell>
						<TextInput id="order-discount" inputMode="decimal" value={draft.discount}
							onChange={set('order-discount', 'discount')} aria-label="Discount"
							placeholder="0,00"
							invalid={discountField.invalid} describedBy={discountField.describedBy} />
						<FieldUnit>{currencySymbol()}</FieldUnit>
					</FieldShell>
				</Field>
				<Field label="Shipping fee" error={shippingField.error} errorId={shippingField.errorId} htmlFor="order-shipping"
					help="Not on the receipt; add it if the order was delivered.">
					<FieldShell>
						<TextInput id="order-shipping" inputMode="decimal" value={draft.shipping}
							onChange={set('order-shipping', 'shipping')} aria-label="Shipping fee"
							invalid={shippingField.invalid} describedBy={shippingField.describedBy} />
						<FieldUnit>{currencySymbol()}</FieldUnit>
					</FieldShell>
				</Field>
			</FieldPair>

			<FieldPair>
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
				{/* Same shape as a line's own rejections -- `.field > span.field-error` -- in a
				    bare `.field` div rather than a page-level summary, since no single field
				    here describes "the list has at least one line". */}
				{linesTried && !draft.lines.length ? (
					<div className="field">
						<span className="field-error" role="status">An order needs at least one line.</span>
					</div>
				) : null}
				<InsetPanel>
					{draft.lines.map((line, index) => (
						editingLine === line.id ? (
							<LineEditor key={line.id} line={line} index={index} count={draft.lines.length}
								isNew={line.id === newLineId}
								autoCheck={autoCheckLine === line.id}
								onSave={values => saveLine(line.id, values)}
								onCancel={() => cancelLine(line.id)}
								deleteButton={line.id === newLineId ? null : (
									<Button variant="ghost compact" icon="trash"
										aria-label={`Delete line, ${line.title || 'this line'}`}
										onClick={() => removeLine(line)}>
										<span className="line-delete-label">DELETE LINE</span>
									</Button>
								)} />
						) : (
							<ItemRow key={line.id}
								icon={line.uncertain ? 'alert' : 'check'}
								iconTone={line.uncertain ? { background: 'var(--bg-warn)', color: 'var(--text-warn)' } : undefined}
								title={line.title}
								meta={line.meta ?? `${line.quantity} × ${currency(line.price)}`}
								amount={currency(line.price * line.quantity)}>
								{/* Pencil and trash side by side, the same pair ItemLines.jsx draws on a
								    saved order's own item rows -- a line read off a receipt is corrected
								    or removed the same two ways one typed by hand is, not a lesser set
								    just because nothing here has been saved yet. */}
								<span className="row-inline row-actions">
									<IconButton icon="pencil" label={`Edit ${line.title}`}
										onClick={() => { setEditingLine(line.id); setAutoCheckLine(null) }} />
									{removeLineButton(line)}
								</span>
							</ItemRow>
						)
					))}
					{/* The remainder is a count and a total, not a row that pretends to be a line.
					    Opening it is the honest action for it, so SHOW ALL is a button. */}
					{draft.remainder?.count ? (
						<ItemRow icon="dots"
							iconTone={{ background: 'var(--bg-tile)', color: 'var(--text-muted)' }}
							title={plural(draft.remainder.count, 'more line', 'more lines')}
							meta={showAll
								? 'Not reviewed one by one. The document stays attached to the order.'
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

			{jsonOpen ? (
				<JsonDialog value={answer} title="What Spendly read from the file" onClose={() => setJsonOpen(false)} />
			) : null}

			<SummaryRow label="Lines subtotal" value={currency(linesTotal)} />
			{discount ? <SummaryRow label="Discount" value={'-' + currency(discount)} /> : null}
			<SummaryRow label="Shipping" value={currency(shipping)} />
			<div className="card-divider card-divider-tight" />
			<SummaryTotal value={currency(orderTotal)} />
		</FormPage>
	)
}

/** A line of the receipt, opened for correction. Three fields, the same three rules the item
    form on New order checks, marked and announced by the same apparatus -- see api/rules.js.
    Its own three-branch if/else agreed with them until the day one of the two was fixed.

    The card itself is ItemLines.jsx's own `.line-card` -- the header band, the green title, the
    Enter/Escape hint, the bottom-divided action row -- so a line corrected here looks like a
    line corrected on New or Edit order, rather than a second, plainer editor the design system
    never drew. No photo and no retail price: a scanned line has neither, so the card is the
    same header and field grid without the parts that have nothing to hold.

    `autoCheck` is true only when this card was opened *by* a rejected SAVE ORDER, never by its
    own pencil -- the open is itself the rejection then, so the fields mark themselves the
    moment the card mounts rather than waiting for a second press of SAVE LINE to say so. */
function LineEditor({ line, index, count, isNew, onSave, onCancel, autoCheck = false, deleteButton }) {
	const [form, setForm] = useState({
		'line-description': line.title,
		'line-quantity': String(line.quantity),
		'line-price': amount(line.price)
	})
	const { check, recheck, propsFor } = useFieldErrors(LINE_FIELDS, form)
	const description = propsFor('line-description')
	const quantity = propsFor('line-quantity')
	const price = propsFor('line-price')

	useEffect(() => { if (autoCheck) check() }, [autoCheck, check])

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

	/* Escape works from anywhere in the card, matching ItemLines' own line card -- one editing
	   session, one set of shortcuts, wherever a line happens to be open. */
	const keys = e => {
		if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); return }
		if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return
		e.preventDefault()
		submit()
	}

	const heading = isNew ? 'New line' : `Editing line ${index + 1} of ${count}`
	const qty = Number(form['line-quantity'])
	const paid = parseAmount(form['line-price'])
	const figures = Number.isFinite(qty) && qty > 0 && Number.isFinite(paid)

	return (
		<div className="filter-section line-card" onKeyDown={keys}>
			<div className="line-card-head">
				<span className="section-label line-card-title">{heading}</span>
				<span className="field-help push-end line-card-keys">Enter saves<Sep />Escape cancels</span>
			</div>
			<div className="line-card-fields">
				<Field className="line-field-wide" label="Line" error={description.error} errorId={description.errorId} htmlFor="line-description">
					<FieldShell>
						<TextInput id="line-description" value={form['line-description']} autoFocus
							onChange={set('line-description')} aria-label="Line description"
							aria-required="true" invalid={description.invalid}
							describedBy={description.describedBy} />
					</FieldShell>
				</Field>
				<Field label="Quantity" error={quantity.error} errorId={quantity.errorId} htmlFor="line-quantity">
					<FieldShell>
						<TextInput id="line-quantity" inputMode="numeric" value={form['line-quantity']}
							onChange={set('line-quantity')} aria-label="Quantity" aria-required="true"
							invalid={quantity.invalid} describedBy={quantity.describedBy} />
						<FieldUnit>pcs</FieldUnit>
					</FieldShell>
				</Field>
				<Field label="Price" error={price.error} errorId={price.errorId} htmlFor="line-price"
					help={figures && qty > 1
						? `Per piece${sep}line total ${currency(paid * qty)}`
						: 'What one piece cost.'}>
					<FieldShell>
						<TextInput id="line-price" inputMode="decimal" value={form['line-price']}
							onChange={set('line-price')} aria-label="Price" aria-required="true"
							invalid={price.invalid} describedBy={price.describedBy} />
						<FieldUnit>{currencySymbol()}</FieldUnit>
					</FieldShell>
				</Field>
			</div>
			<FormActions>
				<Button variant="caps compact" icon="check" onClick={submit}>SAVE LINE</Button>
				<Button variant="ghost compact" onClick={onCancel}>CANCEL</Button>
				{deleteButton ? <span className="push-end">{deleteButton}</span> : null}
			</FormActions>
		</div>
	)
}
