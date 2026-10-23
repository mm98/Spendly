import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Card } from '../components/Card.jsx'
import { Gauge, SumHead } from '../components/Data.jsx'
import { Button } from '../components/Button.jsx'
import { FILE_TYPES, FileDrop, MAX_FILE_MB, fileProblem, sniffedProblem } from '../components/FileDrop.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Alert, Dialog, DialogActions, DialogBody, DialogTitle, useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Spinner } from '../components/Utilities.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Viewer } from '../components/Attachments.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import {
	attachmentFileUrl, attachmentPageUrl, discardDraft, discardScanDocument, failureMessage, getCounts, getCurrentUser, getDraft, getOrder, itemAttachmentThumbnailUrl,
	getOrderDraft, getScanReview, invalidateDraftData, rereadScanDocument, scanFileUrl, scanPageUrl, scanThumbnailUrl, sendFile,
	watchScanProgress
} from '../api/client.js'
import { activeLocaleCode, amount, dayShortMonth, dot, plural, sep, shortDate } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import { ScreenBar } from '../app/screenBar.jsx'
import { OrderForm, discardWords, scanSeed } from './OrderForm.jsx'
import { CopyPicker } from './CopyPicker.jsx'
import { OrderFailed, OrderLoading, isPdf, pagesOf } from './OrderParts.jsx'

/* A new order (3a, 3b): a way to start, then the order form unsaved. The address names the
   start, so a reload lands where the reader was. */

const started = new WeakSet()

/** The label the server gives an upload, so the size reads the same before and after it is sent. */
const sizeLabel = bytes => {
	const kb = Math.max(1, Math.round(bytes / 1024))
	return kb > 1024 ? `${(kb / 1024).toFixed(1).replace('.', ',')} MB` : `${kb} KB`
}
const kindWord = file => (file.kind === 'pdf' ? 'PDF' : String(file.name ?? '').split('.').pop().toUpperCase().slice(0, 4) || 'FILE')

// a form made here keeps its place when it becomes a draft and its address names the draft
const madeHere = new Map()

export default function OrderNew() {
	const [params] = useSearchParams()
	const location = useLocation()
	const duplicate = params.get('duplicate')
	const doc = params.get('doc')
	const draft = params.get('draft')
	const source = params.get('source')
	const vendor = params.get('vendor')

	// ?source=scan&doc=key, ?draft=id, ?duplicate=id, ?source=empty or ?vendor=name, else step 1
	if (doc) return <Scanned key={doc} documentKey={doc} upload={location.state?.upload} from={location.state?.from} />
	if (draft || duplicate || source === 'empty' || vendor) {
		const place = (draft && madeHere.get(draft)) ?? location.key
		return <ByHand key={place} place={place} draft={draft} duplicate={duplicate} vendor={vendor ?? ''} restored={location.state?.seed} />
	}
	return <Start scanOnly={source === 'scan'} file={location.state?.file} from={location.state?.from} picking={params.get('pick') === 'copy'} />
}

/** An order made by hand: empty, a copy, or a draft opened again. What it opens on is taken once,
    since its address changes to the draft's at its first change (3a). */
function ByHand({ place, draft, duplicate, vendor, restored }) {
	const navigate = useNavigate()
	const [opened] = useState(() => ({ draft, duplicate, vendor, restored }))
	const named = id => {
		madeHere.set(id, place)
		navigate(`/orders/new?draft=${id}`, { replace: true })
	}
	if (opened.draft) return <Kept id={opened.draft} />
	if (opened.duplicate) return <Copy id={opened.duplicate} onDraft={named} />
	return <Blank vendor={opened.vendor} restored={opened.restored} onDraft={named} />
}

/** A draft's photo: one sent to the draft, or one a copy carried from its order. */
export const draftPhotoUrl = line => {
	if (!line.photo?.hasThumbnail) return null
	if (line.photo.key) return scanThumbnailUrl(line.photo.key)
	return line.copiedFrom ? itemAttachmentThumbnailUrl(line.copiedFrom.orderId, line.copiedFrom.itemId, line.copiedFrom.attachmentId) : null
}

/** A draft made by hand, opened again as it was left: the edit screen, not created yet (3a). */
function Kept({ id }) {
	const navigate = useNavigate()
	const kept = useApi(getDraft, [id])
	const blank = useApi(getOrderDraft)
	const form = kept.data?.id === id ? kept.data.form : null
	const seed = useMemo(() => (form && blank.data ? { ...fromBlank(blank.data), ...form.values, lines: form.lines ?? [], files: form.files ?? [] } : null), [form, blank.data])
	if (kept.error || blank.error) return <OrderFailed what="This draft" error={kept.error ?? blank.error} retry={kept.error ? kept.refresh : blank.refresh} />
	if (kept.data?.file) return <Navigate replace to={`/orders/new?source=scan&doc=${kept.data.file.key}`} state={{ upload: { ...kept.data.file, draftId: id } }} />
	if (!seed) return <Waiting />
	const away = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/', { replace: true }))
	return <OrderForm mode="new" region seed={seed} origin={{ draftId: id, ...(form.origin?.copy ? { copy: form.origin.copy } : {}) }} photoUrl={draftPhotoUrl} onLeave={away} />
}

const fromBlank = blank => ({
	vendor: blank.vendor ?? '', date: blank.date, status: blank.status, kind: blank.kind,
	statusDates: { Delivered: blank.deliveredDate, Returned: blank.returnedDate }, categories: blank.categories ?? [],
	shipping: null, discount: null, reference: '', note: '', refunded: false, excludeFromStats: false, lines: []
})

/** An empty order, or one an Undo on its saved page sent back as `restored` (3a). */
function Blank({ vendor, restored, onDraft }) {
	const blank = useApi(getOrderDraft)
	if (restored) return <OrderForm mode="new" region seed={restored} onDraft={onDraft} />
	if (blank.error) return <OrderFailed what="The new order" error={blank.error} retry={blank.refresh} />
	if (!blank.data) return <Waiting />
	return <OrderForm mode="new" region seed={{ ...fromBlank(blank.data), vendor }} onDraft={onDraft} />
}

/* A copy carries the vendor, categories, kind, reference, note, Leave out of statistics and priced lines with their photos; the
   date is today, the status the account's default (3b, 8b), and the order's own files stay behind. */
function Copy({ id, onDraft }) {
	const order = useApi(getOrder, [id])
	const blank = useApi(getOrderDraft)
	const navigate = useNavigate()
	const seed = useMemo(() => {
		if (!order.data || order.data.id !== id || !blank.data) return null
		const from = order.data
		return {
			...fromBlank(blank.data),
			vendor: from.vendor?.name ?? '', kind: from.kind, categories: from.categories.map(c => c.name),
			shipping: from.shipping || null, discount: from.discount || null,
			reference: from.reference ?? '', note: from.note ?? '', excludeFromStats: from.excludeFromStats,
			lines: from.items.map((item, i) => {
				const photo = item.attachments?.find(a => a.kind === 'image') ?? null
				return {
					key: `copy-${i}`, title: item.title, quantity: item.quantity, price: item.price,
					retail: item.retail ?? null, note: item.note ?? '', url: item.url ?? '',
					photo: photo && { id: photo.id, name: photo.name, hasThumbnail: photo.hasThumbnail },
					copiedFrom: photo && { orderId: id, itemId: item.id, attachmentId: photo.id }
				}
			})
		}
	}, [order.data, blank.data, id])
	if (order.error || blank.error) return <OrderFailed what="The order to copy" error={order.error ?? blank.error} retry={order.error ? order.refresh : blank.refresh} />
	if (!seed) return <Waiting />
	return (
		<OrderForm mode="new" region seed={seed}
			photoUrl={draftPhotoUrl}
			origin={{ copy: { id, vendor: order.data.vendor?.name ?? 'the order', date: order.data.date, files: (order.data.attachments?.length ?? 0) > 0 } }}
			onLeave={() => navigate(`/orders/${id}`)} onDraft={onDraft} />
	)
}

/** A scan (3a): its reading, then the review, a draft until it is created or discarded. Its address is
    the file's, so a draft opened again from Home or the order list is the same page. */
function Scanned({ documentKey, upload, from }) {
	const navigate = useNavigate()
	// a file read before is asked about first (3c); "Use the reading" goes on to the review
	const [asking, setAsking] = useState(Boolean(upload?.seen))
	// a failed reading is shown as such (6e) until the reader chooses to go on by hand
	const [manual, setManual] = useState(false)
	const read = useApi(getScanReview, [documentKey], { enabled: !asking })
	const answer = read.data?.documentKey === documentKey ? read.data : null
	const seed = useMemo(() => (answer ? scanSeed(answer) : null), [answer])
	const back = () => navigate('/orders/new?source=scan')
	// Discard goes back to the page the scan started from, or the one the draft was opened from (6e)
	const away = () => {
		if (from) navigate(from, { replace: true })
		else if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
		else navigate('/', { replace: true })
	}
	const draftId = answer?.draftId ?? upload?.draftId ?? null
	const drop = () => (draftId ? discardDraft(draftId) : discardScanDocument(documentKey)).catch(() => {})
	const discard = () => drop().finally(away)
	// a new file takes the failed one's place and is read from the start (6e)
	const another = file => drop().finally(() => navigate('/orders/new?source=scan', { replace: true, state: { file, from } }))
	if (asking)
		return <SeenBefore upload={upload} onUse={() => setAsking(false)} onDiscard={() => discardScanDocument(documentKey).catch(() => {}).finally(() => navigate('/orders/new'))} />
	if (read.error)
		return (
			<Alert color="danger" mark="!" title="This receipt could not be opened."
				action={<Button variant="outline" size="small" onClick={back}>Try another file</Button>}>
				{failureMessage(read.error, 'Check your connection, then try again.')}
			</Alert>
		)
	if (!seed) return <Reading file={upload ?? { key: documentKey }} documentKey={documentKey} onDiscard={discard} />
	if (answer.failure && answer.failure !== 'unread' && !manual)
		return <ReadFailed answer={answer} onManual={() => setManual(true)} onAnother={another} onDiscard={discard} />
	return <OrderForm mode="new" region seed={seed} origin={{ scan: answer, draftId: answer.draftId }} photoUrl={draftPhotoUrl} onLeave={away} />
}

/** Discard on a scan (6d), asked before the draft and its file go. */
function DiscardScan({ file, onKeep, onDiscard }) {
	return (
		<Dialog onCancel={onKeep} aria-label="Discard this scan?">
			<div className="sp-stack sp-gap-12">
				<DialogTitle>Discard this scan?</DialogTitle>
				<DialogBody>{discardWords({ file })}</DialogBody>
				<DialogActions>
					<Button variant="outline" fullWidth onClick={onKeep}>Keep checking</Button>
					<Button color="danger" fullWidth onClick={onDiscard}>Discard</Button>
				</DialogActions>
			</div>
		</Dialog>
	)
}

/** Step 2 (3a): the receipt while it is sent and read, with what has been found so far. The
    gauge counts the steps: sent, vendor and date found, the whole reading in. A scan has Discard,
    which asks first (6d), since it is a draft by now; a receipt read for another page has Cancel. */
export function Reading({ file, documentKey, onCancel, onDiscard }) {
	const [asking, setAsking] = useState(false)
	const scan = Boolean(onDiscard)
	const reads = useApi(getCurrentUser).data?.scanAiEnabled !== false
	const [progress, setProgress] = useState(null)
	useEffect(() => (documentKey ? watchScanProgress(documentKey, setProgress) : undefined), [documentKey])
	const thumb = file.key && file.hasThumbnail ? scanThumbnailUrl(file.key) : null
	const sending = !file.key
	const found = progress?.found
	const lines = progress?.lines ?? 0
	const doing = sending ? 'Sending the receipt…' : !reads ? 'Opening the receipt…' : found ? 'Reading the lines…' : 'Reading the receipt…'
	const value = sending ? (file.sent ?? 0) * 33 : found ? 67 : 34
	const meta = [file.meta?.replaceAll(sep, dot), file.pages > 1 ? `${file.pages} pages` : null].filter(Boolean).join(dot)
	// a reading still going well past its usual time says so (6e); the server finishes and keeps it either way
	const [slow, setSlow] = useState(false)
	useEffect(() => {
		if (!reads || sending) return
		const timer = setTimeout(() => setSlow(true), SLOW_READING_MS)
		return () => clearTimeout(timer)
	}, [reads, sending])
	const done = text => (
		<div className="sp-row-flex sp-gap-8">
			<Mark size="small" fill="solid" aria-hidden="true" aria-label="Done"><Icon name="check" size={11} /></Mark>
			<span className="sp-data">{text}</span>
		</div>
	)
	return (
		<div className="oc-narrow">
			<Card aria-busy="true">
				<div className="oc-row-top">
					<div className="oc-preview" role="img" aria-label={file.name ?? 'The receipt'}>
						{thumb ? <img src={thumb} alt="" /> : kindWord(file)}
					</div>
					<div className="oc-read">
						{file.name
							? (
								<div className="sp-row-flex sp-gap-12">
									<span className="sp-title sp-truncate">{file.name}</span>
									{meta ? <span className="sp-meta sp-nowrap">{meta}</span> : null}
								</div>
							)
							: null}
						<Gauge value={value} aria-label={sending ? 'Sending the receipt' : 'Reading the receipt'} />
						<div className="sp-stack sp-gap-8">
							{found ? done('Vendor and date found') : null}
							{lines ? done(lines === 1 ? '1 line found' : `${lines} lines found`) : null}
							<div className="sp-row-flex sp-gap-8">
								<Mark size="small" fill="plain" aria-hidden="true"><Spinner /></Mark>
								<strong className="sp-data">{doing}</strong>
							</div>
							{reads && file.key
								? <span className="sp-meta">{scan ? 'Usually 5 - 10 seconds. If you leave, the scan is kept in Drafts on Home.' : 'Usually 5 - 10 seconds. You can keep working.'}</span>
								: null}
						</div>
						<div className="oc-read__foot">
							{scan
								? <Button variant="outline" size="small" onClick={() => setAsking(true)}>Discard</Button>
								: <Button variant="outline" size="small" onClick={onCancel}>Cancel</Button>}
						</div>
					</div>
				</div>
			</Card>
			{slow
				? (
					<Card variant="row" role="status">
						<Mark size="small" aria-hidden="true" aria-label="Slow"><Icon name="wifi" size={15} /></Mark>
						<div className="sp-stack sp-gap-6">
							<span className="sp-title">Reading is taking longer than usual</span>
							<span className="sp-subtitle">
								{scan ? 'You can leave this page. The scan is kept in Drafts on Home and the reading carries on.' : 'You can leave this page - the order appears in the list when it is done.'}
							</span>
						</div>
					</Card>
				)
				: null}
			{asking ? <DiscardScan file={file} onKeep={() => setAsking(false)} onDiscard={() => { setAsking(false); onDiscard() }} /> : null}
		</div>
	)
}

const SLOW_READING_MS = 20000

const timeFormat = () => new Intl.DateTimeFormat(activeLocaleCode(), { hour: '2-digit', minute: '2-digit' })
const localDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Step 2 replaced (3c): these exact bytes are already on an order or in a draft. The matched
    records first, then what to do instead of reading the same file twice. */
function SeenBefore({ upload, onUse, onDiscard }) {
	const toast = useToast()
	const [comparing, setComparing] = useState(null)
	const [busy, setBusy] = useState(false)
	const { seen } = upload
	const newest = seen.orders[0]
	const readAt = seen.readAt ? new Date(seen.readAt) : null
	// the matched file holds these same bytes, so the upload's own picture is a picture of it
	const thumb = upload.hasThumbnail ? scanThumbnailUrl(upload.key) : null
	const again = () => {
		setBusy(true)
		rereadScanDocument(upload.key)
			.then(() => { invalidate(getScanReview); onUse() })
			.catch(e => { setBusy(false); toast({ message: failureMessage(e, 'The receipt was not read again. Try again.'), color: 'danger' }) })
	}
	const compare = o => setComparing({
		key: 'new', name: upload.name, kind: upload.kind,
		src: upload.kind === 'pdf' ? scanPageUrl(upload.key, 0) : scanFileUrl(upload.key),
		...(upload.kind === 'pdf' ? { pages: upload.pages, pageSrc: i => scanPageUrl(upload.key, i) } : {}),
		beside: {
			key: o.file.id, name: o.file.name, kind: o.file.kind,
			src: o.file.kind === 'pdf' ? attachmentPageUrl(o.id, o.file.id, 0) : attachmentFileUrl(o.id, o.file.id),
			...pagesOf(o.id, { ...o.file, pages: null })
		}
	})
	const touch = useShellShape() === 'touch'
	const draft = seen.draft ?? null
	const said = seen.count === 0
		? (draft ? 'The same file is already in Drafts.' : `The same file was read ${readAt ? `${dayShortMonth(localDay(readAt))}, ${timeFormat().format(readAt)}` : 'before'}. No order holds it now.`)
		: seen.count === 1 ? 'The same file is already on this order.' : `The same file is already on ${seen.count} orders${seen.count > 3 ? '. The newest 3 are shown' : ''}.`
	const open = o => <Button size={touch ? undefined : 'small'} fullWidth={touch} to={`/orders/${o.id}`}>{o.draft ? 'Open that draft' : 'Open that order'}</Button>
	// a draft holds this very file, so there is nothing to compare it with
	const side = o => (o.draft ? null : <Button variant="outline" size={touch ? undefined : 'small'} fullWidth={touch} onClick={() => compare(o)}>Compare the files</Button>)
	const useIt = <Button variant="outline" size={touch ? undefined : 'small'} fullWidth={touch} disabled={busy} onClick={onUse}>Use the reading</Button>
	const scanAgain = <Button variant="outline" size={touch ? undefined : 'small'} fullWidth={touch} disabled={busy} onClick={again}>Scan again</Button>
	const discard = <Button variant="outline" fullWidth={touch} disabled={busy} onClick={onDiscard}>Discard the upload</Button>
	const kept = <span className="sp-meta">The upload is kept for 24 hours either way.</span>
	// the draft is named by its vendor, or its file while no vendor was read, and the day it was scanned (3c)
	const records = [
		...(draft ? [{ id: draft.id, draft: true, vendor: draft.vendor || draft.file?.name, total: draft.total, file: draft.file ?? { kind: upload.kind } }] : []),
		...seen.orders
	]
	const matched = o => {
		const mark = (
			<Mark size="medium" fill={thumb ? 'photo' : 'none'} aria-hidden="true" aria-label="Receipt">
				{thumb ? <img src={thumb} alt="" /> : <span>{o.file.kind === 'pdf' ? 'PDF' : 'IMG'}</span>}
			</Mark>
		)
		const facts = o.draft ? `Scanned ${dayShortMonth(draft.scanned)}` : [dayShortMonth(o.date), plural(o.itemCount, 'line'), o.status].filter(Boolean).join(dot)
		const title = (
			<span className="sp-stacked">
				<span className="sp-title sp-truncate">{o.vendor}</span>
				<span className="sp-subtitle">{facts}</span>
			</span>
		)
		const scanned = o.draft ? (draft.vendor ? draft.file?.name : null)
			: [readAt && o === newest ? `Scanned ${dayShortMonth(localDay(readAt))}, ${timeFormat().format(readAt)}` : null, o.file.name].filter(Boolean).join(dot)
		// the amount shares the title's line, so the lines under it run to the row's edge
		if (touch) return (
			<Card key={o.id}>
				<ListItem variant="top" mark={mark}>
					<span className="sp-stacked sp-grow">
						<span className="sp-row-flex sp-baseline sp-gap-12">
							<span className="sp-title sp-truncate sp-grow">{o.vendor}</span>
							{o.total == null ? null : <span className="sp-amount sp-flex-none">{amount(o.total)}</span>}
						</span>
						<span className="sp-subtitle">{facts}</span>
						{scanned ? <span className="sp-meta">{scanned}</span> : null}
					</span>
				</ListItem>
				<div className="sp-stack sp-gap-8">{open(o)}{side(o)}</div>
			</Card>
		)
		return (
			<ListItem key={o.id} variant="top" mark={mark}>
				<span className="sp-stack sp-gap-8 sp-grow">
					{title}
					{scanned ? <span className="sp-meta">{scanned}</span> : null}
					<span className="sp-row-flex sp-gap-8 sp-wrap">{open(o)}{side(o)}</span>
				</span>
				<span className="sp-stacked sp-cell-amount sp-flex-none">{o.total == null ? null : <span className="sp-amount">{amount(o.total)}</span>}</span>
			</ListItem>
		)
	}
	const lead = touch ? <span className="sp-meta">{said}</span> : (
		<div className="sp-stacked">
			<span className="sp-heading">This receipt has been scanned before</span>
			<span className="sp-meta">{said}</span>
		</div>
	)
	const choices = [
		{ key: 'use', title: 'New order from the saved reading', body: 'Starts a new order with the same lines, ready for you to check and change.', action: useIt },
		{ key: 'again', title: 'Read it again', body: 'Use this if the lines came out wrong last time.', action: scanAgain }
	]
	return (
		<div className="oc-narrow">
			{touch ? <ScreenBar onBack={onDiscard} title="Scanned before" meta={upload.name} /> : null}
			{touch ? (
				<div className="sp-stack sp-gap-12">
					{lead}
					{records.map(matched)}
					{records.length ? <span className="sp-section-label">If that is not what you meant</span> : null}
					{choices.map(c => <SeenChoice key={c.key} {...c} touch />)}
					<div className="sp-stack sp-gap-8">{discard}{kept}</div>
				</div>
			) : (
				<Card>
					{lead}
					{records.map(matched)}
					<div className="sp-stack sp-gap-12">
						{records.length ? <span className="sp-section-label">If that is not what you meant</span> : null}
						{choices.map(c => <SeenChoice key={c.key} {...c} />)}
					</div>
					<div className="sp-card__footer sp-card__footer--commits">
						{kept}
						<span className="sp-grow" />
						{discard}
					</div>
				</Card>
			)}
			{comparing
				? <Viewer items={[comparing]} at={0} beside={comparing.beside} onMove={() => {}} onClose={() => setComparing(null)} />
				: null}
		</div>
	)
}

/** One way on from 3c: title, words and a button, with no mark. On a phone it is its own card with the button under the words. */
function SeenChoice({ title, body, action, touch = false }) {
	const words = <span className="sp-stacked sp-grow"><span className="sp-title">{title}</span><span className="sp-meta">{body}</span></span>
	if (touch) return <Card><ListItem variant="top">{words}</ListItem>{action}</Card>
	return <ListItem variant="top">{words}{action}</ListItem>
}

/** When the scan fails (6e): never a dead end. What came through is named, the file stays with
    the order, and typing it in is one click away. */
function ReadFailed({ answer, onManual, onAnother, onDiscard }) {
	const { file, found } = answer
	const photo = file.kind !== 'pdf'
	const picker = useRef(null)
	const [asking, setAsking] = useState(false)
	const take = ev => {
		const chosen = ev.target.files?.[0]
		ev.target.value = ''
		if (chosen) onAnother(chosen)
	}
	const why = answer.failure === 'billing'
		? 'The reading service is not available right now: it reports a problem with its payment.'
		: answer.failure === 'empty'
			? `The ${photo ? 'photo' : 'file'} was opened, but no lines could be picked out of it.`
			: `The ${photo ? 'photo' : 'file'} could not be read.`
	const kept = found?.vendor || found?.date
		? `${found.vendor && found.date ? 'The vendor and date came through' : found.vendor ? 'The vendor came through' : 'The date came through'}, so the order is started with ${found.vendor && found.date ? 'those' : 'that'}.`
		: 'Nothing came through, so you type in the details.'
	return (
		<div className="oc-narrow">
			<Card>
				<div className="sp-row-flex sp-gap-16 sp-top">
					<Mark size="xlarge" fill="none" danger={kindWord(file)} aria-label={file.name}><Icon name="file" size={18} /></Mark>
					<div className="sp-stack sp-gap-12 sp-grow">
						<div className="sp-row-flex sp-gap-12 sp-baseline sp-wrap">
							<span className="sp-heading">Could not read this receipt</span>
							<span className="sp-meta">{[file.name, file.meta?.replace(/^.*?•\s*/, '')].filter(Boolean).join(dot)}</span>
						</div>
						<span className="sp-data">{why} {kept}</span>
						<div className="sp-stack sp-gap-8">
							{found?.vendor || found?.date
								? (
									<div className="sp-row-flex sp-gap-8 sp-data">
										<span className="sp-ink-success"><Icon name="check" size={14} /></span>
										{[found.vendor ? `Vendor: ${found.vendor}` : null, found.date ? `Date: ${shortDate(found.date)}` : null].filter(Boolean).join(dot)}
									</div>
								)
								: null}
							<div className="sp-row-flex sp-gap-8 sp-data sp-ink-danger sp-strong">
								<Icon name="x" size={14} />
								No lines and no total could be read
							</div>
						</div>
						<ListItem>
							{answer.failure === 'billing'
								? 'You can try again later. If you continue, the file is kept with the order.'
								: `${photo ? 'A flatter photo in better light usually works' : 'A clearer copy of the file usually works'}. If you continue, the file is kept with the order.`}
						</ListItem>
						<div className="sp-row-flex sp-gap-8 sp-wrap">
							<Button size="small" onClick={onManual}>Continue manually</Button>
							<Button variant="outline" size="small" onClick={() => picker.current?.click()}>{photo ? 'Try another photo' : 'Try another file'}</Button>
							<input ref={picker} type="file" accept={FILE_TYPES} hidden tabIndex={-1} onChange={take} />
							<Button variant="outline" size="small" onClick={() => setAsking(true)}>Discard</Button>
						</div>
					</div>
				</div>
			</Card>
			{asking ? <DiscardScan file={file} onKeep={() => setAsking(false)} onDiscard={onDiscard} /> : null}
		</div>
	)
}

/** Step 1 (3a): the receipt zone, then an empty order or a copy. */
function Start({ scanOnly, file, from, picking }) {
	const navigate = useNavigate()
	const counts = useApi(getCounts)
	const reads = useApi(getCurrentUser).data?.scanAiEnabled !== false
	const [sending, setSending] = useState(null)
	const [refused, setRefused] = useState(null)
	const origin = from ?? (scanOnly ? '/orders/new?source=scan' : '/orders/new')
	const cancelled = useRef(false)

	const send = async picked => {
		const f = picked?.[0]
		if (!f) return
		const kind = f.name.split('.').pop()
		const named = fileProblem(f, FILE_TYPES)
		const problem = named ?? await sniffedProblem(f, FILE_TYPES)
		if (problem === 'Not a supported type')
			return setRefused({ title: named ? `.${kind} is not supported` : 'Not a supported type', note: 'Images and PDF only. The file was not sent.' })
		if (problem === 'Too large')
			return setRefused({
				title: `File is ${Math.ceil(f.size / 1024 / 1024)} MB - too large`,
				note: `Up to ${MAX_FILE_MB} MB per file. A PDF export or a smaller photo will go through.`
			})
		setRefused(null)
		cancelled.current = false
		const pdf = isPdf(f)
		setSending({ name: f.name, kind: pdf ? 'pdf' : 'image', meta: `${pdf ? 'PDF' : 'Image'}${dot}${sizeLabel(f.size)}` })
		sendFile(f, { scan: true, onSent: sent => setSending(s => (s ? { ...s, sent } : s)) })
			.then(upload => {
				// a scan discarded while it was sent goes as it arrives, its draft with it
				if (cancelled.current) return discardScanDocument(upload.key).catch(() => {})
				invalidate(getScanReview)
				invalidateDraftData()
				navigate(`/orders/new?source=scan&doc=${upload.key}`, { replace: true, state: { upload, from: origin } })
			})
			.catch(e => {
				setSending(null)
				// said on the zone, as the checks above are; a refusal gives the server's own reason
				const refusal = e?.status >= 400 && e?.status < 500
				const note = failureMessage(e, refusal ? 'Images and PDF only. Nothing was added.' : 'Check your connection, then try again.')
				if (note) setRefused({ title: refusal ? `${f.name} was not accepted` : 'The receipt was not sent', note })
			})
	}

	// a file Home already took is read at once, and only once
	useEffect(() => {
		if (!file || started.has(file)) return
		started.add(file)
		send([file])
	}, [file])

	if (sending) return <Reading file={sending} onDiscard={() => { cancelled.current = true; setSending(null); navigate(origin, { replace: true }) }} />

	const copyable = (counts.data?.orders ?? 0) > 0
	return (
		<Empty>
			<EmptyTitle>{scanOnly ? 'Start from a receipt' : 'Start from a receipt, or from scratch'}</EmptyTitle>
			<EmptyBody>
				{reads
					? 'Drop a PDF or a photo and the vendor, date, amounts and lines are read for you. You confirm everything before it is saved.'
					: 'Drop a PDF or a photo and it is attached to a new order. You type in the details.'}
			</EmptyBody>
			<div className="oc-narrow">
				<FileDrop accept={FILE_TYPES} onFiles={send} action="Select a receipt">
					<Mark size="large" aria-label="Receipt" aria-hidden="true"><Icon name="upload" size={24} /></Mark>
					<span className="sp-title">Drop receipt here</span>
					<span className="sp-meta">PDF, JPG, PNG, WebP or GIF{dot}up to {MAX_FILE_MB} MB per file</span>
				</FileDrop>
				{refused ? <div className="oc-left"><Alert color="danger" mark="!" title={refused.title}>{refused.note}</Alert></div> : null}
				{scanOnly
					? null
					: (
						<>
							<div className="sp-divider">or</div>
							<div className="oc-choices">
								<StartChoice to="/orders/new?source=empty" icon="file-text" title="Empty order" body="Type the details yourself." />
								{copyable
									? <StartChoice to="/orders/new?pick=copy" icon="copy" title="Copy an order" body="Same vendor, same lines, new date." />
									: null}
							</div>
						</>
					)}
			</div>
			{picking ? <CopyPicker onClose={() => navigate('/orders/new', { replace: true })} /> : null}
		</Empty>
	)
}

/** One way to start a new order, as a card that opens it (3a). */
function StartChoice({ to, icon, title, body }) {
	return (
		<Card to={to}>
			<SumHead mark={<Mark size="large" aria-label={title} aria-hidden="true"><Icon name={icon} size={24} /></Mark>}
				title={title} subtitle={body} chevron={<Icon name="chevron-right" size={14} />} />
		</Card>
	)
}

function Waiting() {
	return <OrderLoading region form />
}
