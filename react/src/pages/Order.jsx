import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { Card, CardBody, CardHeader, Panel, Toolbar } from '../components/Card.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Totals } from '../components/LineEditor.jsx'
import { Sum } from '../components/Data.jsx'
import { Chip } from '../components/Chip.jsx'
import { Well } from '../components/Well.jsx'
import { Strip, Viewer } from '../components/Attachments.jsx'
import { Icon } from '../components/Icon.jsx'
import { Alert, Leaving } from '../components/Overlays.jsx'
import { useApi } from '../api/useApi.js'
import { attachmentDownloadUrl, attachmentThumbnailUrl, getOrder } from '../api/client.js'
import { dot, plural, shortDate } from '../api/format.js'
import { useStacked } from './OrderForm.jsx'
import { useListReturn } from '../app/listMemory.js'
import { useFolded } from '../app/folded.js'
import { useShellShape } from '../app/useMedia.js'
import { OverLimitDot, useOverLimitIds, useStatus } from '../app/orderRow.jsx'
import { Saving } from '../app/saving.jsx'
import {
	AttachmentTile, LineAmount, LinePhoto, LineText, OrderFailed, OrderLoading, filesOf, itemPhoto, itemsWord, lineMeta, lineTotal, money
} from './OrderParts.jsx'
import { DeleteOrder } from './DeleteOrder.jsx'
import { OfferTag, OffersTotal, offersHead, useOrderOffers } from './orderOffers.jsx'

/* One order, read (1a): items and attachments in the wide column, details and totals in the
   rail, and the rail ends with what can be done to the order. */

export default function Order() {
	const { id } = useParams()
	// off once the order is deleted, so the page never asks for it again on its way out
	const [gone, setGone] = useState(false)
	const state = useApi(getOrder, [id], { enabled: !gone })
	const touch = useShellShape() === 'touch'
	const order = state.data?.id === id ? state.data : null

	if (!order && state.error) return <OrderFailed error={state.error} retry={state.refresh} />
	if (!order) return <OrderLoading />
	// a draft opens where it is finished: a scan in its review, one made by hand in the edit screen (3a)
	if (order.draft) return <Navigate replace to={draftAddress(order)} state={order.draft.file ? { upload: { ...order.draft.file, draftId: order.id } } : null} />
	return <OrderView key={order.id} order={order} touch={touch} onGone={() => setGone(true)} />
}

/** Where a draft is finished: a scan at the address of its file, one made by hand at its own. */
export const draftAddress = d => (d.draft.file ? `/orders/new?source=scan&doc=${d.draft.file.key}` : `/orders/new?draft=${d.id}`)

function OrderView({ order, touch, onGone }) {
	const navigate = useNavigate()
	const list = useListReturn('orders')
	const [viewing, setViewing] = useState(null)
	const [asking, setAsking] = useState(false)
	const files = filesOf(order)
	const open = key => setViewing(files.findIndex(f => f.key === key))
	const column = useRef(null)
	const stacked = useStacked(column)
	const [folded, setFolded] = useFolded('order', 'details', true)
	const status = useStatus(order.status)
	// what the comparison with a receipt handed over (3d), taken once so a reload does not show it again
	const here = useLocation()
	const [validated] = useState(() => here.state?.validated ?? null)
	useEffect(() => {
		if (here.state?.validated) navigate(here.pathname, { replace: true, state: null })
	}, [])
	// a status with a date of its own has it recorded; one on the order's own date has none
	const stamped = order.statusHistory.findLast(s => s.status === order.status)
	const offers = useOrderOffers({ vendor: order.vendor, date: order.date, lines: order.items })
	const [offerOpen, setOfferOpen] = useState(null)
	const tagOf = (item, index) => {
		const offer = offers.offerOf(index)
		return offer
			? <OfferTag line={item} offer={offer} source={offers.source} open={offerOpen === index} onOpen={() => setOfferOpen(index)} onClose={() => setOfferOpen(null)} />
			: null
	}

	const items = (
		<Card>
			<CardHeader name={`Items${dot}${order.items.length}`} meta={`${order.vendor?.name ?? ''}${dot}${shortDate(order.date)}`} {...offersHead(offers)} />
			<div className="sp-stack sp-gap-8">
				{order.items.map((item, index) => {
					const photo = itemPhoto(order.id, item)
					const fileKey = item.attachments?.[0]?.id
					const tag = tagOf(item, index)
					// on a phone the photo is smaller than a fingertip, so the whole row opens it, and says so;
					// a row with an offer's tag opens the photo from its mark, as no button sits inside a button
					if (touch && photo && !tag)
						return (
							<ListItem key={item.id} mark={<LinePhoto src={photo} name={item.title} />} onClick={() => open(fileKey)}
								aria-label={`Open the photo of ${item.title}, ${lineMeta(item, true)}, ${money(lineTotal(item))}`}>
								<LineText line={item} compact />
								<LineAmount line={item} compact />
							</ListItem>
						)
					return (
						<ListItem key={item.id} mark={<LinePhoto src={photo} name={item.title} onOpen={photo ? () => open(fileKey) : undefined} />}>
							<LineText line={item} compact={touch} />
							{tag}
							<LineAmount line={item} compact={touch} />
						</ListItem>
					)
				})}
			</div>
			<Totals>
				<span className="sp-strong">{itemsWord(order.items.length)}{dot}{money(order.subtotal)} paid</span>
				<span className="sp-grow" />
				<Saving value={order.saved} />
			</Totals>
		</Card>
	)

	const attachments = order.attachments.length
		? (
			<Card>
				<CardHeader name={`Attachments${dot}${order.attachments.length}`} actions={[{ label: 'Download all', onClick: () => downloadAll(order) }]} />
				<Strip>
					{order.attachments.map(a => (
						<AttachmentTile key={a.id} name={a.name} kind={a.kind} bare={touch}
							thumb={a.hasThumbnail ? attachmentThumbnailUrl(order.id, a.id) : null}
							onOpen={() => open(a.id)} />
					))}
				</Strip>
			</Card>
		)
		: null

	const sums = (
		<div className="sp-stack">
			<Sum value={order.vendor ? <Link to={`/orders?vendor=${order.vendor.id}`}>{order.vendor.name}</Link> : undefined}>Vendor</Sum>
			<Sum value={shortDate(order.date)}>Date</Sum>
			<Sum value={order.kind}>Kind</Sum>
			<Sum value={status.name}>Status</Sum>
			{stamped ? <Sum value={shortDate(stamped.date)}>{status.name}</Sum> : null}
			{order.validated ? <Sum value={shortDate(order.validated.date)}>Validated</Sum> : null}
			<Sum value={<OrderCategories order={order} />}>Categories</Sum>
			{order.reference ? <Sum value={order.reference}>Reference</Sum> : null}
			{order.excludeFromStats ? <Sum value="Left out">Statistics</Sum> : null}
			{order.note ? <Sum variant="stacked" value={<Well>{order.note.split('\n').map((line, i) => <Fragment key={i}>{i ? <br /> : null}{line}</Fragment>)}</Well>}>Note</Sum> : null}
		</div>
	)
	// in one column the details fold to a line above the items (18b)
	const details = stacked
		? (
			<Card variant="flush">
				<Toolbar variant="toggle" expanded={!folded} onClick={() => setFolded(f => !f)} chevron={<Icon name="chevron-down" />}>
					<span className="sp-stacked">
						<span className="sp-title sp-truncate">Order details</span>
						<span className="sp-meta sp-truncate">{[order.categories.map(c => c.name).join(', '), order.kind].filter(Boolean).join(dot)}</span>
					</span>
				</Toolbar>
				<CardBody open={!folded}>{sums}</CardBody>
			</Card>
		)
		: (
			<Card>
				<CardHeader name="Order details" />
				{sums}
			</Card>
		)

	const totals = (
		<Card
			footer={[
				<Button key="delete" variant="outline" color="danger" onClick={() => setAsking(true)}>Delete order</Button>,
				<Button key="edit" to={`/orders/${order.id}/edit`}>Edit order</Button>
			]}
			footerLayout="split"
			footerCommits
		>
			<CardHeader name="Totals" control={
				<IconButton variant="outline" icon="copy" aria-label="Duplicate order" data-tip="Duplicate" to={`/orders/new?duplicate=${order.id}`} />
			} />
			<div className="sp-stack">
				<Sum value={money(order.subtotal)}>Items ({order.items.length})</Sum>
				<Sum value={order.discount ? money(-order.discount) : money(0)}>Discount</Sum>
				<Sum value={money(order.shipping)}>Shipping</Sum>
				<Sum variant="total" value={money(order.total)}>Total</Sum>
			</div>
			<Saving value={order.saved} variant="stat" />
			<OffersTotal offers={offers} lineCount={order.items.length} />
		</Card>
	)

	const dialog = asking
		? <DeleteOrder order={order} onClose={() => setAsking(false)} onDeleted={() => { onGone(); navigate(list) }} />
		: null

	const viewer = viewing != null && viewing > -1
		? <Viewer items={files} at={viewing} onMove={setViewing} onClose={() => setViewing(null)} />
		: null

	const validatedNotice = validated
		? (
			<Alert color="success" mark={<Icon name="check" size={12} />} title={`Validated against ${validated.name}.`}>
				{validated.changes ? `${plural(validated.changes, 'change')} applied. The receipt is kept as an attachment.` : 'The lines match the receipt. Nothing was changed.'}
			</Alert>
		)
		: null

	return (
		<>
			<div className="sp-stack sp-gap-12" ref={column}>{validatedNotice}{stacked ? details : null}{items}{attachments}</div>
			<Panel>{stacked ? null : details}{totals}<Leaving>{dialog}</Leaving>{viewer}</Panel>
		</>
	)
}

/** The order's categories; one over its limit this month carries the problem dot, the mark that
    travels with a category wherever it is named, the order list's rows included (8b). */
function OrderCategories({ order }) {
	const over = useOverLimitIds(order.date)
	if (!order.categories.length) return 'None'
	const named = c => <Link to={`/orders?category=${c.id}`}>{c.name}</Link>
	if (!order.categories.some(c => over.has(c.id))) {
		return order.categories.map((c, i) => <span key={c.id}>{i ? ', ' : ''}{named(c)}</span>)
	}
	return (
		<span className="sp-row-flex sp-wrap sp-gap-6 or-chips">
			{order.categories.map(c => <Chip key={c.id} trail={over.has(c.id) ? <OverLimitDot /> : undefined}>{named(c)}</Chip>)}
			<span className="sp-meta">over limit</span>
		</span>
	)
}

/** Every file, saved one after another the way the tile's own download saves one. */
function downloadAll(order) {
	for (const a of order.attachments) {
		const link = document.createElement('a')
		link.href = attachmentDownloadUrl(order.id, a.id)
		link.download = a.name
		document.body.append(link)
		link.click()
		link.remove()
	}
}
