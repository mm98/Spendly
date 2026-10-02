import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { Card } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { FileDrop } from '../components/FileDrop.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Alert, Dialog, DialogActions, DialogBody, DialogTitle, useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Spinner } from '../components/Utilities.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import {
	failureMessage, getOrder, getOrderDraft, getOrders, getScanDraft, putScanDocument, scanThumbnailUrl
} from '../api/client.js'
import { amount, dayMonth } from '../api/format.js'
import { OrderForm } from './OrderForm.jsx'
import { OrderFailed, OrderLoading, SEP, useNarrow, useTouch } from './OrderParts.jsx'

/* A new order (3a, 3b): a way to start, then the order form unsaved. The address names the
   start, so a reload lands where the reader was. */

const RECEIPTS = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif'
const TYPES = /^(application\/pdf|image\/(jpeg|png|webp|heic|heif|gif))$/
const MAX_MB = 25
const started = new WeakSet()

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
	if (source === 'empty' || vendor) return <Blank vendor={vendor ?? ''} />
	return <Start scanOnly={source === 'scan'} file={location.state?.file} picking={params.get('pick') === 'copy'} />
}

const fromBlank = blank => ({
	vendor: blank.vendor ?? '', date: blank.date, status: blank.status, kind: blank.kind,
	deliveredDate: blank.deliveredDate, returnedDate: blank.returnedDate, categories: blank.categories ?? [],
	shipping: null, discount: null, reference: '', note: '', refunded: false, lines: []
})

function Blank({ vendor }) {
	const blank = useApi(getOrderDraft)
	if (blank.error) return <OrderFailed error={blank.error} retry={blank.refresh} />
	if (!blank.data) return <Waiting />
	return <OrderForm mode="new" region seed={{ ...fromBlank(blank.data), vendor }} />
}

/* A copy carries the vendor, categories, kind, reference, note and priced lines; the date is
   today, the status the account's default, and the files stay where they are. */
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
			reference: from.reference ?? '', note: from.note ?? '',
			lines: from.items.map((item, i) => ({
				key: `copy-${i}`, title: item.title, quantity: item.quantity, price: item.price,
				retail: item.retail ?? null, note: item.note ?? ''
			}))
		}
	}, [order.data, blank.data, id])
	if (order.error || blank.error) return <OrderFailed error={order.error ?? blank.error} retry={order.error ? order.refresh : blank.refresh} />
	if (!seed) return <Waiting />
	return (
		<OrderForm mode="new" region seed={seed}
			origin={{ copy: { id, vendor: order.data.vendor?.name ?? 'the order', date: order.data.date } }}
			onLeave={() => navigate(`/orders/${id}`)} />
	)
}

function Scanned({ documentKey, upload }) {
	const read = useApi(getScanDraft, [documentKey])
	const navigate = useNavigate()
	const answer = read.data?.documentKey === documentKey ? read.data : null
	const seed = useMemo(() => (answer
		? {
			vendor: answer.vendor ?? '', date: answer.date, status: answer.status, kind: answer.kind,
			deliveredDate: answer.deliveredDate, returnedDate: answer.returnedDate, categories: [],
			shipping: answer.shipping || null, discount: answer.discount || null,
			reference: '', note: '', refunded: false,
			lines: answer.lines.map(l => ({
				key: l.id, title: l.title ?? '', quantity: l.quantity ?? 1, price: l.price ?? null,
				retail: null, note: '', uncertain: Boolean(l.uncertain), include: true
			}))
		}
		: null), [answer])
	const back = () => navigate('/orders/new?source=scan')
	if (read.error)
		return (
			<Alert color="danger" mark="!" title="This receipt could not be opened."
				action={<Button variant="outline" size="small" onClick={back}>Try another file</Button>}>
				{failureMessage(read.error, 'Check your connection, then try again.')}
			</Alert>
		)
	if (!seed) return <Reading file={upload ?? { key: documentKey }} onCancel={back} />
	return <OrderForm mode="new" region seed={seed} origin={{ scan: answer }} onLeave={back} />
}

/** Step 2 (3a): the receipt while it is sent and read. */
function Reading({ file, onCancel }) {
	const thumb = file.key && file.hasThumbnail ? scanThumbnailUrl(file.key) : null
	return (
		<Card aria-busy="true">
			<div className="sp-row-flex sp-top sp-gap-12">
				{thumb
					? <Mark size="xlarge" fill="photo" aria-label={file.name ?? 'The receipt'}><img src={thumb} alt="" /></Mark>
					: <Mark size="xlarge" fill="none" aria-label={file.name ?? 'The receipt'}><span>{file.kind === 'pdf' ? 'PDF' : 'FILE'}</span></Mark>}
				<div className="sp-stack sp-gap-12 sp-grow">
					{file.name
						? (
							<div className="sp-row-flex sp-gap-12">
								<span className="sp-title sp-truncate">{file.name}</span>
								{file.meta ? <span className="sp-meta">{file.meta.replace(' • ', SEP)}</span> : null}
							</div>
						)
						: null}
					<div className="sp-stack sp-gap-8">
						<div className="sp-row-flex sp-gap-8">
							<Spinner />
							<strong className="sp-data">{file.key ? 'Reading the receipt…' : 'Sending the receipt…'}</strong>
						</div>
						<span className="sp-meta">Usually 5 - 10 seconds.</span>
					</div>
					<div className="sp-row-flex">
						<span className="sp-grow" />
						<Button variant="outline" size="small" onClick={onCancel}>Cancel</Button>
					</div>
				</div>
			</div>
		</Card>
	)
}

/** Step 1 (3a): the receipt zone, then an empty order or a copy. */
function Start({ scanOnly, file, picking }) {
	const navigate = useNavigate()
	const toast = useToast()
	const any = useApi(getOrders, [{ pageSize: 1 }])
	const [sending, setSending] = useState(null)
	const [refused, setRefused] = useState(null)
	const touch = useTouch()

	const send = picked => {
		const f = picked?.[0]
		if (!f) return
		const kind = f.name.split('.').pop()
		if (!TYPES.test(f.type) && !/\.(pdf|jpe?g|png|webp|heic|heif|gif)$/i.test(f.name))
			return setRefused({ title: `.${kind} is not supported`, note: 'Images and PDF only. The file was not sent.' })
		if (f.size > MAX_MB * 1024 * 1024)
			return setRefused({
				title: `File is ${Math.ceil(f.size / 1024 / 1024)} MB - too large`,
				note: `Up to ${MAX_MB} MB per file. A PDF export or a smaller photo will go through.`
			})
		setRefused(null)
		setSending({ name: f.name, meta: `${(f.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB` })
		putScanDocument(f)
			.then(upload => {
				invalidate(getScanDraft)
				navigate(`/orders/new?source=scan&doc=${upload.key}`, { replace: true, state: { upload } })
			})
			.catch(e => {
				setSending(null)
				toast({ message: failureMessage(e, 'The receipt was not sent. Try again.'), color: 'danger' })
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
		<>
			<Empty>
				<EmptyTitle>{scanOnly ? 'Start from a receipt' : 'Start from a receipt, or from scratch'}</EmptyTitle>
				<EmptyBody>Drop a PDF or a photo and the vendor, date, amounts and lines are read for you. You confirm everything before it is saved.</EmptyBody>
			</Empty>
			<FileDrop accept={RECEIPTS} onFiles={send} action="Select a receipt">
				<Mark size="large" aria-label="Receipt" aria-hidden="true"><Icon name="upload" size={24} /></Mark>
				<span className="sp-title">Drop receipt here</span>
				<span className="sp-meta">PDF, JPG, PNG, WebP, HEIC or GIF{SEP}up to {MAX_MB} MB per file</span>
			</FileDrop>
			{refused ? <Alert color="danger" mark="!" title={refused.title}>{refused.note}</Alert> : null}
			{scanOnly
				? null
				: (
					<>
						<div className="sp-divider">or</div>
						<div className={touch ? 'sp-stack sp-gap-12' : 'sp-fields'}>
							<Choice to="/orders/new?source=empty" icon="file-text" title="Empty order" body="Type the details yourself." />
							{copyable
								? <Choice to="/orders/new?pick=copy" icon="copy" title="Copy a previous order" body="Same vendor, same lines, new date." />
								: null}
						</div>
					</>
				)}
			{picking ? <CopyPicker onClose={() => navigate('/orders/new', { replace: true })} /> : null}
		</>
	)
}

function Choice({ to, icon, title, body }) {
	return (
		<Card to={to}>
			<span className="sp-sum-head">
				<Mark size="large" aria-label={title} aria-hidden="true"><Icon name={icon} size={24} /></Mark>
				<span className="sp-alert__body">
					<span className="sp-title">{title}</span>
					<span className="sp-subtitle">{body}</span>
				</span>
				<span className="sp-card__chevron"><Icon name="chevron-right" size={14} /></span>
			</span>
		</Card>
	)
}

/** The third way to start (3b): pick the order to copy, by vendor or by an item on it. */
function CopyPicker({ onClose }) {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')
	const [asked, setAsked] = useState('')
	const timer = useRef(null)
	useEffect(() => {
		clearTimeout(timer.current)
		timer.current = setTimeout(() => setAsked(query.trim()), 300)
		return () => clearTimeout(timer.current)
	}, [query])
	const found = useApi(getOrders, [{ pageSize: 6, query: asked }])
	const orders = found.data?.orders ?? []
	return (
		<Dialog onCancel={onClose} aria-label="Copy a previous order">
			<DialogTitle>Copy a previous order</DialogTitle>
			<DialogBody>The vendor, category and item lines are copied. The date becomes today, the status resets, and the receipt stays on the original order.</DialogBody>
			<SearchInput value={query} onChange={setQuery} placeholder="Search by vendor or item…" aria-label="Search previous orders" />
			<div className="sp-stack sp-gap-6">
				{asked ? null : <span className="sp-combobox__group">Recent</span>}
				{orders.map(o => (
					<ListItem key={o.id} onClick={() => navigate(`/orders/new?duplicate=${o.id}`)}>
						<span className="sp-stacked sp-grow">
							<span className="sp-title sp-truncate">{o.vendor?.name}</span>
							<span className="sp-meta sp-truncate">{o.itemCount === 1 ? '1 line' : `${o.itemCount} lines`}</span>
						</span>
						<span className="sp-stacked sp-cell-amount">
							<span className="sp-amount">{amount(o.total)}</span>
							<span className="sp-meta">{dayMonth(o.date)}</span>
						</span>
					</ListItem>
				))}
				{found.data && !orders.length ? <span className="sp-meta">No order matches "{asked}".</span> : null}
			</div>
			<DialogActions>
				<span className="sp-meta">Nothing is created until you save.</span>
				<span className="sp-grow" />
				<Button variant="outline" onClick={onClose}>Cancel</Button>
			</DialogActions>
		</Dialog>
	)
}

function Waiting() {
	return <OrderLoading touch={useNarrow()} region />
}
