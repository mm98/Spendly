import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { Card } from '../components/Card.jsx'
import { Gauge, SumHead } from '../components/Data.jsx'
import { Button } from '../components/Button.jsx'
import { FILE_TYPES, FileDrop, MAX_FILE_MB, fileProblem } from '../components/FileDrop.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { ComboboxEmpty, ComboboxGroup, ComboboxOption } from '../components/Combobox.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Alert, Dialog, DialogActions, DialogBody, DialogTitle, useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Spinner } from '../components/Utilities.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Viewer } from '../components/Attachments.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import {
	attachmentFileUrl, attachmentPageUrl, discardScanDocument, failureMessage, getCurrentUser, getOftenOrders, getOrder,
	getOrderDraft, getOrders, getScanDraft, rereadScanDocument, scanFileUrl, scanPageUrl, scanThumbnailUrl, sendFile,
	watchScanProgress
} from '../api/client.js'
import { activeLocaleCode, amount, dayShortMonth, dot, plural, sep, shortDate } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import { OrderForm } from './OrderForm.jsx'
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

export default function OrderNew() {
	const [params] = useSearchParams()
	const location = useLocation()
	const duplicate = params.get('duplicate')
	const doc = params.get('doc')
	const source = params.get('source')
	const vendor = params.get('vendor')

	// ?duplicate=id, ?source=scan&doc=key, ?source=empty or ?vendor=name, else step 1
	if (duplicate) return <Copy key={duplicate} id={duplicate} />
	if (doc) return <Scanned key={doc} documentKey={doc} upload={location.state?.upload} />
	if (source === 'empty' || vendor) return <Blank vendor={vendor ?? ''} restored={location.state?.seed} />
	return <Start scanOnly={source === 'scan'} file={location.state?.file} picking={params.get('pick') === 'copy'} />
}

const fromBlank = blank => ({
	vendor: blank.vendor ?? '', date: blank.date, status: blank.status, kind: blank.kind,
	deliveredDate: blank.deliveredDate, returnedDate: blank.returnedDate, categories: blank.categories ?? [],
	shipping: null, discount: null, reference: '', note: '', refunded: false, lines: []
})

/** An empty order, or one an Undo on its saved page sent back as `restored` (3a). */
function Blank({ vendor, restored }) {
	const blank = useApi(getOrderDraft)
	if (restored) return <OrderForm mode="new" region seed={restored} />
	if (blank.error) return <OrderFailed what="The new order" error={blank.error} retry={blank.refresh} />
	if (!blank.data) return <Waiting />
	return <OrderForm mode="new" region seed={{ ...fromBlank(blank.data), vendor }} />
}

/* A copy carries the vendor, categories, kind, note and priced lines; the date is today, the
   status the account's default, the reference a new one (8a), and the files stay where they are. */
function Copy({ id }) {
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
			note: from.note ?? '',
			lines: from.items.map((item, i) => ({
				key: `copy-${i}`, title: item.title, quantity: item.quantity, price: item.price,
				retail: item.retail ?? null, note: item.note ?? ''
			}))
		}
	}, [order.data, blank.data, id])
	if (order.error || blank.error) return <OrderFailed what="The order to copy" error={order.error ?? blank.error} retry={order.error ? order.refresh : blank.refresh} />
	if (!seed) return <Waiting />
	return (
		<OrderForm mode="new" region seed={seed}
			origin={{ copy: { id, vendor: order.data.vendor?.name ?? 'the order', date: order.data.date } }}
			onLeave={() => navigate(`/orders/${id}`)} />
	)
}

function Scanned({ documentKey, upload }) {
	const navigate = useNavigate()
	// a file read before is asked about first (3c); "Use the reading" goes on to the review
	const [asking, setAsking] = useState(Boolean(upload?.seen?.orders?.length))
	// a failed reading is shown as such (6e) until the reader chooses to go on by hand
	const [manual, setManual] = useState(false)
	const read = useApi(getScanDraft, [documentKey], { enabled: !asking })
	const answer = read.data?.documentKey === documentKey ? read.data : null
	const seed = useMemo(() => (answer
		? {
			vendor: answer.vendor ?? '', date: answer.date, status: answer.status, kind: answer.kind,
			deliveredDate: answer.deliveredDate, returnedDate: answer.returnedDate, categories: [],
			shipping: answer.shipping || null, discount: answer.discount || null,
			reference: answer.reference ?? '', note: '', refunded: false,
			lines: answer.lines.map(l => ({
				key: l.id, title: l.title ?? '', quantity: l.quantity ?? 1, price: l.price ?? null,
				retail: null, note: '', uncertain: Boolean(l.uncertain), unclearPart: l.unclearPart ?? null, include: true
			}))
		}
		: null), [answer])
	const back = () => navigate('/orders/new?source=scan')
	const discard = () => discardScanDocument(documentKey).catch(() => {}).finally(back)
	if (asking) return <SeenBefore upload={upload} onUse={() => setAsking(false)} onDiscard={discard} />
	if (read.error)
		return (
			<Alert color="danger" mark="!" title="This receipt could not be opened."
				action={<Button variant="outline" size="small" onClick={back}>Try another file</Button>}>
				{failureMessage(read.error, 'Check your connection, then try again.')}
			</Alert>
		)
	if (!seed) return <Reading file={upload ?? { key: documentKey }} documentKey={documentKey} onCancel={back} />
	if (answer.failure && answer.failure !== 'unread' && !manual)
		return <ReadFailed answer={answer} onManual={() => setManual(true)} onAnother={back} onDiscard={discard} />
	return <OrderForm mode="new" region seed={seed} origin={{ scan: answer }} onLeave={back} />
}

/** Step 2 (3a): the receipt while it is sent and read, with what has been found so far. The
    gauge counts the steps: sent, vendor and date found, the whole reading in. */
function Reading({ file, documentKey, onCancel }) {
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
								<Spinner />
								<strong className="sp-data">{doing}</strong>
							</div>
							{reads && file.key ? <span className="sp-meta">Usually 5 - 10 seconds.</span> : null}
						</div>
						<div className="oc-read__foot">
							<Button variant="outline" size="small" onClick={onCancel}>Cancel</Button>
						</div>
					</div>
				</div>
			</Card>
		</div>
	)
}

const timeFormat = () => new Intl.DateTimeFormat(activeLocaleCode(), { hour: '2-digit', minute: '2-digit' })
const localDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Step 2 replaced (3c): these exact bytes are already on an order. The matched orders first,
    then what to do instead of reading the same file twice. */
function SeenBefore({ upload, onUse, onDiscard }) {
	const toast = useToast()
	const [comparing, setComparing] = useState(null)
	const [busy, setBusy] = useState(false)
	const { seen } = upload
	const newest = seen.orders[0]
	const named = o => o.reference || `the order from ${o.vendor}`
	const readAt = seen.readAt ? new Date(seen.readAt) : null
	const again = () => {
		setBusy(true)
		rereadScanDocument(upload.key)
			.then(() => { invalidate(getScanDraft); onUse() })
			.catch(e => { setBusy(false); toast({ message: failureMessage(e, 'The receipt was not read again. Try again.'), color: 'danger' }) })
	}
	const compare = o => setComparing({
		key: 'new', name: upload.name, kind: upload.kind, label: `New: ${upload.name}`,
		src: upload.kind === 'pdf' ? (upload.hasThumbnail ? scanThumbnailUrl(upload.key) : null) : scanFileUrl(upload.key),
		...(upload.kind === 'pdf' ? { pages: upload.pages, pageSrc: i => scanPageUrl(upload.key, i) } : {}),
		beside: {
			key: o.file.id, name: o.file.name, kind: o.file.kind, label: `On ${named(o)}: ${o.file.name}`,
			src: o.file.kind === 'pdf' ? attachmentPageUrl(o.id, o.file.id, 0) : attachmentFileUrl(o.id, o.file.id),
			...pagesOf(o.id, { ...o.file, pages: null })
		}
	})
	return (
		<div className="oc-narrow">
			<Card>
				<div className="sp-stack sp-gap-6">
					<span className="sp-heading">This receipt has been added before</span>
					<span className="sp-meta">
						{seen.count === 1 ? 'The same file is already on this order.' : `The same file is already on ${seen.count} orders${seen.count > 3 ? '. The newest 3 are shown' : ''}.`}
					</span>
				</div>
				{seen.orders.map(o => (
					<ListItem key={o.id} variant="top" mark={<Mark size="medium" fill="none" aria-hidden="true" aria-label="Receipt"><span>{o.file.kind === 'pdf' ? 'PDF' : 'IMG'}</span></Mark>}>
						<span className="sp-stack sp-gap-8 sp-grow">
							<span className="sp-stacked">
								<span className="sp-title sp-truncate">{o.vendor}</span>
								<span className="sp-subtitle">{[o.reference, dayShortMonth(o.date), plural(o.itemCount, 'line'), o.status].filter(Boolean).join(dot)}</span>
							</span>
							<span className="sp-meta">
								{[readAt && o === newest ? `Read ${dayShortMonth(localDay(readAt))}, ${timeFormat().format(readAt)}` : null, o.file.name].filter(Boolean).join(dot)}
							</span>
							<span className="sp-row-flex sp-gap-8 sp-wrap">
								<Button size="small" to={`/orders/${o.id}`}>Open that order</Button>
								<Button variant="outline" size="small" onClick={() => compare(o)}>Compare the files</Button>
							</span>
						</span>
						<span className="sp-stacked sp-cell-amount sp-flex-none"><span className="sp-amount">{amount(o.total)}</span></span>
					</ListItem>
				))}
				<div className="sp-stack sp-gap-12">
					<span className="sp-section-label">If that is not what you meant</span>
					<SeenChoice icon="file-text" primary title="New order from the saved reading"
						body="Starts a new order with the same lines, ready for you to check and change."
						action={<Button size="small" disabled={busy} onClick={onUse}>Use the reading</Button>} />
					<SeenChoice icon="refresh" title="Read it again" body="Use this if the lines came out wrong last time."
						action={<Button variant="outline" size="small" disabled={busy} onClick={again}>Scan again</Button>} />
					<SeenChoice icon="paperclip" title="Attach it to that order instead"
						body={`${named(newest).replace(/^t/, 'T')} already has this file, so there is nothing to add.`}
						action={<Button variant="outline" size="small" disabled>Attach</Button>} />
				</div>
				<div className="sp-card__footer sp-card__footer--commits">
					<span className="sp-meta sp-grow">If you do nothing, the upload is removed after 7 days.</span>
					<Button variant="outline" disabled={busy} onClick={onDiscard}>Discard the upload</Button>
				</div>
			</Card>
			{comparing
				? <Viewer items={[comparing]} at={0} beside={comparing.beside} onMove={() => {}} onClose={() => setComparing(null)} />
				: null}
		</div>
	)
}

/** One way on from 3c; on a phone the button goes under the words, which need the row's width. */
function SeenChoice({ icon, title, body, action, primary = false }) {
	const touch = useShellShape() === 'touch'
	return (
		<ListItem variant={primary ? 'primary' : 'top'}
			mark={<Mark size="small" fill="plain" aria-hidden="true" aria-label={title}><Icon name={icon} size={16} /></Mark>}>
			<span className="sp-stack sp-gap-6 sp-grow">
				<span className="sp-title">{title}</span>
				<span className="sp-meta">{body}</span>
				{touch ? <span className="sp-row-flex">{action}</span> : null}
			</span>
			{touch ? null : action}
		</ListItem>
	)
}

/** When the scan fails (6e): never a dead end. What came through is named, the file stays with
    the order, and typing it in is one click away. */
function ReadFailed({ answer, onManual, onAnother, onDiscard }) {
	const { file, found } = answer
	const photo = file.kind !== 'pdf'
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
							<Button variant="outline" size="small" onClick={onAnother}>{photo ? 'Try another photo' : 'Try another file'}</Button>
							<Button variant="outline" size="small" onClick={onDiscard}>Discard</Button>
						</div>
					</div>
				</div>
			</Card>
		</div>
	)
}

/** Step 1 (3a): the receipt zone, then an empty order or a copy. */
function Start({ scanOnly, file, picking }) {
	const navigate = useNavigate()
	const any = useApi(getOrders, [{ pageSize: 1 }])
	const reads = useApi(getCurrentUser).data?.scanAiEnabled !== false
	const [sending, setSending] = useState(null)
	const [refused, setRefused] = useState(null)

	const send = picked => {
		const f = picked?.[0]
		if (!f) return
		const kind = f.name.split('.').pop()
		const problem = fileProblem(f, FILE_TYPES)
		if (problem === 'Not a supported type')
			return setRefused({ title: `.${kind} is not supported`, note: 'Images and PDF only. The file was not sent.' })
		if (problem === 'Too large')
			return setRefused({
				title: `File is ${Math.ceil(f.size / 1024 / 1024)} MB - too large`,
				note: `Up to ${MAX_FILE_MB} MB per file. A PDF export or a smaller photo will go through.`
			})
		setRefused(null)
		const pdf = isPdf(f)
		setSending({ name: f.name, kind: pdf ? 'pdf' : 'image', meta: `${pdf ? 'PDF' : 'Image'}${dot}${sizeLabel(f.size)}` })
		sendFile(f, { onSent: sent => setSending(s => (s ? { ...s, sent } : s)) })
			.then(upload => {
				invalidate(getScanDraft)
				navigate(`/orders/new?source=scan&doc=${upload.key}`, { replace: true, state: { upload } })
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

	if (sending) return <Reading file={sending} onCancel={() => navigate('/orders/new?source=scan', { replace: true })} />

	const copyable = (any.data?.total ?? 0) > 0
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
					<span className="sp-meta">PDF, JPG, PNG, WebP, HEIC or GIF{dot}up to {MAX_FILE_MB} MB per file</span>
				</FileDrop>
			</div>
			{refused ? <div className="oc-narrow oc-left"><Alert color="danger" mark="!" title={refused.title}>{refused.note}</Alert></div> : null}
			{scanOnly
				? null
				: (
					<>
						<div className="sp-divider oc-narrow">or</div>
						<div className="oc-choices">
							<StartChoice to="/orders/new?source=empty" icon="file-text" title="Empty order" body="Type the details yourself." />
							{copyable
								? <StartChoice to="/orders/new?pick=copy" icon="copy" title="Copy a previous order" body="Same vendor, same lines, new date." />
								: null}
						</div>
					</>
				)}
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

/** The third way to start (3b): pick the order to copy, by vendor or by an item on it. The
    arrow keys walk the rows from the search field, as in every combobox (14a). */
function CopyPicker({ onClose }) {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')
	const [asked, setAsked] = useState('')
	const [active, setActive] = useState(-1)
	const timer = useRef(null)
	const search = useRef(null)
	const listId = useId()
	useEffect(() => {
		clearTimeout(timer.current)
		timer.current = setTimeout(() => setAsked(query.trim()), 300)
		return () => clearTimeout(timer.current)
	}, [query])
	// after the dialog has focused its first button, so the reader starts where they type
	useEffect(() => { search.current?.focus() }, [])
	const found = useApi(getOrders, [{ pageSize: 6, query: asked, with: 'itemTitles' }])
	// the repeats lead an empty search (3b); a search looks through every order
	const repeats = useApi(getOftenOrders)
	const often = asked ? [] : repeats.data?.orders ?? []
	// six rows in all, as the drawing keeps the dialog small
	const recent = (found.data?.orders ?? []).filter(o => !often.some(r => r.id === o.id)).slice(0, 6 - often.length)
	const orders = [...often, ...recent]
	useEffect(() => setActive(-1), [asked])
	const pick = o => navigate(`/orders/new?duplicate=${o.id}`)
	const keys = ev => {
		if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && orders.length) {
			ev.preventDefault()
			const by = ev.key === 'ArrowDown' ? 1 : -1
			setActive(at => (at + by + orders.length + (at < 0 && by < 0 ? 1 : 0)) % orders.length)
		} else if (ev.key === 'Enter' && orders[active]) {
			ev.preventDefault()
			pick(orders[active])
		}
	}
	const row = (o, i) => (
		<ComboboxOption key={o.id} id={`${listId}-${i}`} active={i === active} onSelect={() => pick(o)}>
			<span className="sp-row-flex sp-gap-8">
				<span className="sp-stacked sp-grow">
					<span className="sp-title sp-truncate">{o.vendor?.name}</span>
					<span className="sp-meta sp-truncate">{plural(o.itemCount, 'line')}{o.itemTitles?.length ? `${dot}${o.itemTitles.join(', ')}${o.itemCount > o.itemTitles.length ? '…' : ''}` : null}</span>
				</span>
				<span className="sp-stacked sp-cell-amount sp-flex-none">
					<span className="sp-amount">{amount(o.total)}</span>
					<span className="sp-meta">{o.times ? `${o.times} times${dot}last ${dayShortMonth(o.date)}` : dayShortMonth(o.date)}</span>
				</span>
			</span>
		</ComboboxOption>
	)
	let rows
	if (!found.data) rows = null
	else if (!orders.length) rows = <ComboboxEmpty>{asked ? `No order matches "${asked}".` : 'There are no orders to copy yet.'}</ComboboxEmpty>
	else rows = (
		<>
			{often.length ? <ComboboxGroup>You order these often</ComboboxGroup> : null}
			{often.map(row)}
			{asked || !recent.length ? null : <ComboboxGroup>Recent</ComboboxGroup>}
			{recent.map((o, i) => row(o, often.length + i))}
		</>
	)
	return (
		<Dialog onCancel={onClose} aria-label="Copy a previous order">
			<div className="sp-stack sp-gap-12">
				<div className="sp-stack sp-gap-6">
					<DialogTitle>Copy a previous order</DialogTitle>
					<DialogBody>The vendor, category and item lines are copied. The date becomes today, the status resets, the copy gets a new order number, and the receipt stays on the original order.</DialogBody>
				</div>
				<SearchInput value={query} onChange={setQuery} placeholder="Search by vendor or item…" aria-label="Search previous orders"
					inputRef={search} role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list"
					aria-activedescendant={active > -1 ? `${listId}-${active}` : undefined} onKeyDown={keys} />
				<ul className="oc-options" id={listId} role="listbox" aria-label="Previous orders">{rows}</ul>
				<span className="sp-announce" aria-live="polite">{asked && found.data ? (orders.length ? plural(orders.length, 'order') : 'No orders') : ''}</span>
				<DialogActions>
					<span className="sp-meta">Nothing is created until you save.</span>
					<span className="sp-grow" />
					<Button variant="outline" onClick={onClose}>Cancel</Button>
				</DialogActions>
			</div>
		</Dialog>
	)
}

function Waiting() {
	return <OrderLoading region form />
}
