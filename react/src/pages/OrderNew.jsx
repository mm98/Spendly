import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { Card } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { FileDrop } from '../components/FileDrop.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { ComboboxEmpty, ComboboxGroup, ComboboxOption } from '../components/Combobox.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Alert, Dialog, DialogActions, DialogBody, DialogTitle, useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Spinner } from '../components/Utilities.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import {
	failureMessage, getCurrentUser, getOrder, getOrderDraft, getOrders, getScanDraft, putScanDocument, scanThumbnailUrl
} from '../api/client.js'
import { amount, dayShortMonth, dot, sep } from '../api/format.js'
import { OrderForm } from './OrderForm.jsx'
import { MAX_MB, OrderFailed, OrderLoading, fileProblem, isPdf } from './OrderParts.jsx'

/* A new order (3a, 3b): a way to start, then the order form unsaved. The address names the
   start, so a reload lands where the reader was. */

const RECEIPTS = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif'
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
	const reads = useApi(getCurrentUser).data?.scanAiEnabled !== false
	const thumb = file.key && file.hasThumbnail ? scanThumbnailUrl(file.key) : null
	const doing = !file.key ? 'Sending the receipt…' : reads ? 'Reading the receipt…' : 'Opening the receipt…'
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
									{file.meta ? <span className="sp-meta sp-nowrap">{file.meta.replaceAll(sep, dot)}</span> : null}
								</div>
							)
							: null}
						<div className="sp-stack sp-gap-8">
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

/** Step 1 (3a): the receipt zone, then an empty order or a copy. */
function Start({ scanOnly, file, picking }) {
	const navigate = useNavigate()
	const toast = useToast()
	const any = useApi(getOrders, [{ pageSize: 1 }])
	const reads = useApi(getCurrentUser).data?.scanAiEnabled !== false
	const [sending, setSending] = useState(null)
	const [refused, setRefused] = useState(null)

	const send = picked => {
		const f = picked?.[0]
		if (!f) return
		const kind = f.name.split('.').pop()
		const problem = fileProblem(f)
		if (problem === 'Not a supported type')
			return setRefused({ title: `.${kind} is not supported`, note: 'Images and PDF only. The file was not sent.' })
		if (problem === 'Too large')
			return setRefused({
				title: `File is ${Math.ceil(f.size / 1024 / 1024)} MB - too large`,
				note: `Up to ${MAX_MB} MB per file. A PDF export or a smaller photo will go through.`
			})
		setRefused(null)
		const pdf = isPdf(f)
		setSending({ name: f.name, kind: pdf ? 'pdf' : 'image', meta: `${pdf ? 'PDF' : 'Image'}${dot}${sizeLabel(f.size)}` })
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
		<Empty>
			<EmptyTitle>{scanOnly ? 'Start from a receipt' : 'Start from a receipt, or from scratch'}</EmptyTitle>
			<EmptyBody>
				{reads
					? 'Drop a PDF or a photo and the vendor, date, amounts and lines are read for you. You confirm everything before it is saved.'
					: 'Drop a PDF or a photo and it is attached to a new order. You type in the details.'}
			</EmptyBody>
			<div className="oc-narrow">
				<FileDrop accept={RECEIPTS} onFiles={send} action="Select a receipt">
					<Mark size="large" aria-label="Receipt" aria-hidden="true"><Icon name="upload" size={24} /></Mark>
					<span className="sp-title">Drop receipt here</span>
					<span className="sp-meta">PDF, JPG, PNG, WebP, HEIC or GIF{dot}up to {MAX_MB} MB per file</span>
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
	const found = useApi(getOrders, [{ pageSize: 6, query: asked }])
	const orders = found.data?.orders ?? []
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
	let rows
	if (!found.data) rows = null
	else if (!orders.length) rows = <ComboboxEmpty>{asked ? `No order matches "${asked}".` : 'There are no orders to copy yet.'}</ComboboxEmpty>
	else rows = (
		<>
			{asked ? null : <ComboboxGroup>Recent</ComboboxGroup>}
			{orders.map((o, i) => (
				<ComboboxOption key={o.id} id={`${listId}-${i}`} active={i === active} onSelect={() => pick(o)}>
					<span className="sp-row-flex sp-gap-8">
						<span className="sp-stacked sp-grow">
							<span className="sp-title sp-truncate">{o.vendor?.name}</span>
							<span className="sp-meta sp-truncate">{[o.itemCount === 1 ? '1 line' : `${o.itemCount} lines`, o.itemTitles?.join(', ')].filter(Boolean).join(dot)}</span>
						</span>
						<span className="sp-stacked sp-cell-amount sp-flex-none">
							<span className="sp-amount">{amount(o.total)}</span>
							<span className="sp-meta">{dayShortMonth(o.date)}</span>
						</span>
					</span>
				</ComboboxOption>
			))}
		</>
	)
	return (
		<Dialog onCancel={onClose} aria-label="Copy a previous order">
			<div className="sp-stack sp-gap-12">
				<div className="sp-stack sp-gap-6">
					<DialogTitle>Copy a previous order</DialogTitle>
					<DialogBody>The vendor, category and item lines are copied. The date becomes today, the status resets, and the receipt stays on the original order.</DialogBody>
				</div>
				<SearchInput value={query} onChange={setQuery} placeholder="Search by vendor or item…" aria-label="Search previous orders"
					inputRef={search} role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list"
					aria-activedescendant={active > -1 ? `${listId}-${active}` : undefined} onKeyDown={keys} />
				<ul className="oc-options" id={listId} role="listbox" aria-label="Previous orders">{rows}</ul>
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
