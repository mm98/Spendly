import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Card } from '../components/Card.jsx'
import { Gauge, SumHead } from '../components/Data.jsx'
import { Button } from '../components/Button.jsx'
import { FILE_TYPES, FileDrop, MAX_FILE_MB, fileProblem, sniffedProblem } from '../components/FileDrop.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Alert, Dialog, DialogActions, DialogBody, DialogTitle, useToast, Leaving } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Spinner } from '../components/Utilities.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import {
	discardDraft, discardScanDocument, failureMessage, getCounts, getCurrentUser, getDraft, getOrder, getOrderLookalike, itemAttachmentThumbnailUrl,
	getOrderDraft, getScanReview, invalidateDraftData, rereadScanDocument, scanThumbnailUrl, sendFile,
	watchScanProgress
} from '../api/client.js'
import { dot, plural, sep, shortDate } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import { OrderForm, discardWords, scanSeed } from './OrderForm.jsx'
import { CopyPicker } from './CopyPicker.jsx'
import { OrderFailed, OrderLoading, isPdf } from './OrderParts.jsx'
import { OrderRepeats, repeatIds, repeatsOf } from './OrderRepeats.jsx'
import { usePhrase } from '../language/phrases.js'

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

/** A scan (3a): its reading, then the review, a draft from its first change until it is created or discarded.
    Its address is the file's, so a draft opened again from Home or the order list is the same page.
    An order it repeats is asked about first (3c): one holding the same file at once, over step 1, and a
    look-alike once the reading is ready, over step 2. */
function Scanned({ documentKey, upload, from }) {
	const phrase = usePhrase()
	const navigate = useNavigate()
	const toast = useToast()
	const seen = upload?.seen ?? null
	// a draft opened again was asked about when it was scanned
	const [asking, setAsking] = useState(Boolean(seen && (seen.count || seen.draft) && !upload?.draftId))
	// what the dialog showed, so it is not asked about again on this scan
	const [shown, setShown] = useState([])
	const [passed, setPassed] = useState(false)
	// a failed reading is shown as such (6e) until the reader chooses to go on by hand
	const [manual, setManual] = useState(false)
	const read = useApi(getScanReview, [documentKey], { enabled: !asking })
	const answer = read.data?.documentKey === documentKey ? read.data : null
	const seed = useMemo(() => (answer ? scanSeed(answer) : null), [answer])
	const self = answer && !answer.failure && !answer.draftId && !passed ? readOrder(answer) : null
	const alike = useApi(getOrderLookalike, [self?.vendor ?? '', self?.date ?? '', self?.total ?? 0, ''], { enabled: Boolean(self) })
	const fresh = self && alike.data ? alike.data.orders.filter(o => !shown.includes(o.id)) : null
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
	// the dialog's Discard deletes the upload, and Escape keeps it 24 hours; both go back to step 1 (3c)
	const toStart = () => navigate('/orders/new', { replace: true })
	const throwAway = () => discardScanDocument(documentKey).catch(() => {}).finally(toStart)
	const go = ids => {
		setShown(s => [...s, ...ids])
		setAsking(false)
		setPassed(true)
	}
	if (asking) {
		const repeats = repeatsOf({ file: seen })
		// Read it again only where a listed record has a saved reading
		const rereads = Boolean(seen.readAt && (seen.draft || seen.orders.some(o => o.readAt)))
		const again = () => rereadScanDocument(documentKey)
			.then(() => { invalidate(getScanReview); setShown(s => [...s, ...repeatIds(repeats)]); setAsking(false) })
			.catch(e => toast({ message: failureMessage(e, phrase('scan.notReread')), color: 'danger' }))
		return (
			<>
				<Start from={from} />
				<OrderRepeats file={seen} upload={upload}
					onCreate={() => { setShown(s => [...s, ...repeatIds(repeats)]); setAsking(false) }}
					onReread={rereads ? again : undefined} onDiscard={throwAway} onCancel={toStart} />
			</>
		)
	}
	if (read.error)
		return (
			<Alert color="danger" mark="!" title={phrase('compare.notOpened')}
				action={<Button variant="outline" size="small" onClick={back}>{phrase('scan.anotherFile')}</Button>}>
				{failureMessage(read.error, phrase('failed.connection'))}
			</Alert>
		)
	const reading = <Reading file={upload ?? answer?.file ?? { key: documentKey }} documentKey={documentKey} onDiscard={discard} />
	if (!seed) return reading
	if (answer.failure && answer.failure !== 'unread' && !manual)
		return <ReadFailed answer={answer} onManual={() => setManual(true)} onAnother={another} onDiscard={discard} />
	// the review waits for the look-alike search, and asks over step 2 when it finds an order not shown yet
	if (self && !alike.data && !alike.error) return reading
	if (fresh?.length) {
		const found = { count: alike.data.count - (alike.data.orders.length - fresh.length), orders: fresh }
		return (
			<>
				{reading}
				<OrderRepeats alike={found} self={self} upload={upload ?? answer.file}
					onCreate={() => go(fresh.map(o => o.id))} onDiscard={throwAway} onCancel={toStart} />
			</>
		)
	}
	return <OrderForm mode="new" region seed={seed} origin={{ scan: answer, draftId: answer.draftId, shownOrders: [...shown, ...(fresh ?? []).map(o => o.id)] }} photoUrl={draftPhotoUrl} onLeave={away} />
}

/** The order a reading makes, as the look-alike search takes it: its vendor, date and paid total. */
function readOrder(answer) {
	const lines = answer.lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0)
	const total = Math.round((answer.total ?? lines + (answer.shipping || 0) - (answer.discount || 0)) * 100) / 100
	return answer.vendor && answer.date && total > 0 ? { vendor: answer.vendor, date: answer.date, total } : null
}

/** Discard on a scan (6d), asked before the draft and its file go. */
function DiscardScan({ file, onKeep, onDiscard }) {
	const phrase = usePhrase()
	return (
		<Dialog onCancel={onKeep} aria-label={phrase('scan.discardTitle')}>
			<div className="sp-stack sp-gap-12">
				<DialogTitle>{phrase('scan.discardTitle')}</DialogTitle>
				<DialogBody>{discardWords({ file })}</DialogBody>
				<DialogActions>
					<Button variant="outline" fullWidth onClick={onKeep}>{phrase('scan.keepChecking')}</Button>
					<Button color="danger" fullWidth onClick={onDiscard}>{phrase('action.discard')}</Button>
				</DialogActions>
			</div>
		</Dialog>
	)
}

/** Step 2 (3a): the receipt while it is sent and read, with what has been found so far. The
    gauge counts the steps: sent, vendor and date found, the whole reading in. A scan has Discard,
    which asks first (6d), since the file goes with it; a receipt read for another page has Cancel. */
export function Reading({ file, documentKey, onCancel, onDiscard }) {
	const phrase = usePhrase()
	const [asking, setAsking] = useState(false)
	const scan = Boolean(onDiscard)
	const touch = useShellShape() === 'touch'
	const reads = useApi(getCurrentUser).data?.scanAiEnabled !== false
	const [progress, setProgress] = useState(null)
	useEffect(() => (documentKey ? watchScanProgress(documentKey, setProgress) : undefined), [documentKey])
	const thumb = file.key && file.hasThumbnail ? scanThumbnailUrl(file.key) : null
	const sending = !file.key
	const found = progress?.found
	const lines = progress?.lines ?? 0
	const doing = phrase(sending ? 'scan.sending' : !reads ? 'scan.opening' : found ? 'scan.readingLines' : 'scan.reading')
	const value = sending ? (file.sent ?? 0) * 33 : found ? 67 : 34
	const meta = [file.meta?.replaceAll(sep, dot), file.pages > 1 ? plural(file.pages, 'page') : null].filter(Boolean).join(dot)
	// a reading still going well past its usual time says so (6e); the server finishes and keeps it either way
	const [slow, setSlow] = useState(false)
	useEffect(() => {
		if (!reads || sending) return
		const timer = setTimeout(() => setSlow(true), SLOW_READING_MS)
		return () => clearTimeout(timer)
	}, [reads, sending])
	const done = text => (
		<div className="sp-row-flex sp-gap-8">
			<Mark size="small" fill="solid" aria-hidden="true" aria-label={phrase('action.done')}><Icon name="check" size={11} /></Mark>
			<span className="sp-data">{text}</span>
		</div>
	)
	const name = file.name
		? (
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-title sp-truncate">{file.name}</span>
				{meta ? <span className="sp-meta sp-nowrap">{meta}</span> : null}
			</div>
		)
		: null
	const steps = (
		<>
			<Gauge value={value} aria-label={phrase(sending ? 'scan.sendingLabel' : 'scan.readingLabel')} />
			<div className="sp-stack sp-gap-8">
				{found ? done(phrase('scan.vendorFound')) : null}
				{lines ? done(phrase('scan.linesFound', { count: lines })) : null}
				<div className="sp-row-flex sp-gap-8">
					<Mark size="small" fill="plain" aria-hidden="true"><Spinner /></Mark>
					<strong className="sp-data">{doing}</strong>
				</div>
				{reads && file.key
					? <span className="sp-meta">{phrase(scan ? 'scan.usuallyScan' : 'scan.usually')}</span>
					: null}
			</div>
		</>
	)
	const leave = scan
		? <Button variant="outline" size={touch ? undefined : 'small'} fullWidth={touch} onClick={() => setAsking(true)}>{phrase('action.discard')}</Button>
		: <Button variant="outline" size={touch ? undefined : 'small'} fullWidth={touch} onClick={onCancel}>{phrase('action.cancel')}</Button>
	return (
		<div className="oc-narrow">
			<Card aria-busy="true">
				{touch
					? (
						// on a phone the receipt is a mark beside its name, so the steps get the card's width (3a, step 2 · phone)
						<div className="sp-stack sp-gap-12">
							<div className="sp-row-flex sp-gap-12">
								<Mark size="large" fill={thumb ? 'photo' : 'none'} aria-hidden="true" aria-label={file.name ?? phrase('scan.theReceipt')}>
									{thumb ? <img src={thumb} alt="" /> : <span>{kindWord(file)}</span>}
								</Mark>
								{file.name
									? (
										<span className="sp-stacked sp-grow">
											<span className="sp-title sp-truncate">{file.name}</span>
											{meta ? <span className="sp-meta">{meta}</span> : null}
										</span>
									)
									: null}
							</div>
							{steps}
							{leave}
						</div>
					)
					: (
						<div className="oc-row-top">
							<div className="oc-preview" role="img" aria-label={file.name ?? phrase('scan.theReceipt')}>
								{thumb ? <img src={thumb} alt="" /> : kindWord(file)}
							</div>
							<div className="oc-read">
								{name}
								{steps}
								<div className="oc-read__foot">{leave}</div>
							</div>
						</div>
					)}
			</Card>
			{slow
				? (
					<Card variant="row" role="status">
						<Mark size="small" aria-hidden="true" aria-label={phrase('scan.slow')}><Icon name="wifi" size={15} /></Mark>
						<div className="sp-stack sp-gap-6">
							<span className="sp-title">{phrase('scan.slowTitle')}</span>
							<span className="sp-subtitle">
								{phrase(scan ? 'scan.slowScan' : 'scan.slowOther')}
							</span>
						</div>
					</Card>
				)
				: null}
			<Leaving>{asking ? <DiscardScan file={file} onKeep={() => setAsking(false)} onDiscard={() => { setAsking(false); onDiscard() }} /> : null}</Leaving>
		</div>
	)
}

const SLOW_READING_MS = 20000

/** When the scan fails (6e): never a dead end. What came through is named, the file stays with
    the order, and typing it in is one click away. */
function ReadFailed({ answer, onManual, onAnother, onDiscard }) {
	const phrase = usePhrase()
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
		? phrase('scan.billing')
		: phrase(answer.failure === 'empty' ? 'scan.noLines' : 'scan.notRead', { photo: String(photo) })
	const kept = phrase(found?.vendor && found?.date ? 'scan.keptBoth' : found?.vendor ? 'scan.keptVendor' : found?.date ? 'scan.keptDate' : 'scan.keptNothing')
	return (
		<div className="oc-narrow">
			<Card>
				<div className="sp-row-flex sp-gap-16 sp-top">
					<Mark size="xlarge" fill="none" danger={kindWord(file)} aria-label={file.name}><Icon name="file" size={18} /></Mark>
					<div className="sp-stack sp-gap-12 sp-grow">
						<div className="sp-row-flex sp-gap-12 sp-baseline sp-wrap">
							<span className="sp-heading">{phrase('scan.failedTitle')}</span>
							<span className="sp-meta">{[file.name, file.meta?.replace(/^.*?•\s*/, '')].filter(Boolean).join(dot)}</span>
						</div>
						<span className="sp-data">{why} {kept}</span>
						<div className="sp-stack sp-gap-8">
							{found?.vendor || found?.date
								? (
									<div className="sp-row-flex sp-gap-8 sp-data">
										<span className="sp-ink-success"><Icon name="check" size={14} /></span>
										{[found.vendor ? phrase('scan.foundVendor', { name: found.vendor }) : null, found.date ? phrase('scan.foundDate', { date: shortDate(found.date) }) : null].filter(Boolean).join(dot)}
									</div>
								)
								: null}
							<div className="sp-row-flex sp-gap-8 sp-data sp-ink-danger sp-strong">
								<Icon name="x" size={14} />
								{phrase('scan.noLinesNoTotal')}
							</div>
						</div>
						<ListItem>
							{answer.failure === 'billing'
								? phrase('scan.tryLater')
								: phrase('scan.tryBetter', { photo: String(photo) })}
						</ListItem>
						<div className="sp-row-flex sp-gap-8 sp-wrap">
							<Button size="small" onClick={onManual}>{phrase('scan.manual')}</Button>
							<Button variant="outline" size="small" onClick={() => picker.current?.click()}>{phrase(photo ? 'scan.anotherPhoto' : 'scan.anotherFile')}</Button>
							<input ref={picker} type="file" name="receipt" accept={FILE_TYPES} hidden tabIndex={-1} onChange={take} />
							<Button variant="outline" size="small" onClick={() => setAsking(true)}>{phrase('action.discard')}</Button>
						</div>
					</div>
				</div>
			</Card>
			<Leaving>{asking ? <DiscardScan file={file} onKeep={() => setAsking(false)} onDiscard={onDiscard} /> : null}</Leaving>
		</div>
	)
}

/** Step 1 (3a): the receipt zone, then an empty order or a copy. */
function Start({ scanOnly, file, from, picking }) {
	const phrase = usePhrase()
	const navigate = useNavigate()
	const counts = useApi(getCounts)
	// a phone cannot drop a file: its zone is a tap that opens the picker (3a, step 1 · phone)
	const touch = useShellShape() === 'touch'
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
		if (problem === phrase('file.unsupported'))
			return setRefused({ title: named ? phrase('scan.kindNotSupported', { kind }) : phrase('file.unsupported'), note: phrase('scan.notSent') })
		if (problem === phrase('file.tooLarge'))
			return setRefused({
				title: phrase('scan.tooLarge', { size: Math.ceil(f.size / 1024 / 1024) }),
				note: phrase('scan.tooLargeNote', { most: MAX_FILE_MB })
			})
		setRefused(null)
		cancelled.current = false
		const pdf = isPdf(f)
		setSending({ name: f.name, kind: pdf ? 'pdf' : 'image', meta: `${pdf ? 'PDF' : phrase('scan.image')}${dot}${sizeLabel(f.size)}` })
		sendFile(f, { scan: true, onSent: sent => setSending(s => (s ? { ...s, sent } : s)) })
			.then(upload => {
				// a scan discarded while it was sent goes as it arrives
				if (cancelled.current) return discardScanDocument(upload.key).catch(() => {})
				invalidate(getScanReview)
				invalidateDraftData()
				navigate(`/orders/new?source=scan&doc=${upload.key}`, { replace: true, state: { upload, from: origin } })
			})
			.catch(e => {
				setSending(null)
				// said on the zone, as the checks above are; a refusal gives the server's own reason
				const refusal = e?.status >= 400 && e?.status < 500
				const note = failureMessage(e, refusal ? phrase('scan.nothingAdded') : phrase('failed.connection'))
				if (note) setRefused({ title: refusal ? phrase('scan.notAccepted', { name: f.name }) : phrase('scan.receiptNotSent'), note })
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
			<EmptyTitle>{phrase(scanOnly ? 'scan.start' : 'scan.startOrScratch')}</EmptyTitle>
			<EmptyBody>
				{reads
					? phrase('scan.introRead', { touch: String(touch) })
					: phrase('scan.introAttach', { touch: String(touch) })}
			</EmptyBody>
			<div className="oc-narrow">
				<FileDrop accept={FILE_TYPES} onFiles={send} action={touch ? undefined : phrase('scan.select')}>
					<Mark size="large" aria-label={phrase('repeats.receipt')} aria-hidden="true"><Icon name="upload" size={24} /></Mark>
					<span className="sp-title">{phrase(touch ? 'scan.add' : 'scan.drop')}</span>
					<span className="sp-meta">{phrase('scan.types', { dot, most: MAX_FILE_MB })}</span>
				</FileDrop>
				{refused ? <div className="oc-left"><Alert color="danger" mark="!" title={refused.title}>{refused.note}</Alert></div> : null}
				{scanOnly
					? null
					: (
						<>
							<div className="sp-divider">{phrase('scan.or')}</div>
							<div className={touch ? 'oc-choices oc-choices--stack' : 'oc-choices'}>
								<StartChoice to="/orders/new?source=empty" icon="file-text" title={phrase('orders.empty')} body={phrase('scan.emptyBody')} />
								{copyable
									? <StartChoice to="/orders/new?pick=copy" icon="copy" title={phrase('copy.title')} body={phrase('scan.copyBody')} />
									: null}
							</div>
						</>
					)}
			</div>
			<Leaving>{picking ? <CopyPicker onClose={() => navigate('/orders/new', { replace: true })} /> : null}</Leaving>
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
