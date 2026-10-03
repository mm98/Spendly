import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Card, CardBody, Panel, Toolbar } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Totals } from '../components/LineEditor.jsx'
import { Sum } from '../components/Data.jsx'
import { Chip } from '../components/Chip.jsx'
import { Strip, Viewer } from '../components/Attachments.jsx'
import { Alert, useToast } from '../components/Overlays.jsx'
import { Icon } from '../components/Icon.jsx'
import { useApi } from '../api/useApi.js'
import {
	attachmentFileUrl, attachmentThumbnailUrl, deleteOrder, failureMessage, getOrder, invalidateOrderData
} from '../api/client.js'
import { dot, plural, shortDate, today } from '../api/format.js'
import { draftOf, useStacked } from './OrderForm.jsx'
import { useListReturn } from '../app/listMemory.js'
import { useFolded } from '../app/folded.js'
import { useShellShape } from '../app/useMedia.js'
import { OverLimitDot, StatusPill, useOverLimitIds } from '../app/orderRow.jsx'
import { Saving } from '../app/saving.jsx'
import {
	AttachmentTile, LineAmount, LinePhoto, LineText, OrderFailed, OrderLoading, filesOf, itemPhoto, itemsWord, lineMeta, lineTotal, money
} from './OrderParts.jsx'
import { DeleteOrder } from './DeleteOrder.jsx'

/* One order, read (1a): items and attachments in the wide column, details and totals in the
   rail, and the rail ends with what can be done to the order. */

export default function Order() {
	const { id } = useParams()
	const location = useLocation()
	const navigate = useNavigate()
	// off once the order is deleted, so the page never asks for it again on its way out
	const [gone, setGone] = useState(false)
	// what the create screen handed over, taken once so a reload or a return does not offer Undo again
	const [created] = useState(() => (location.state?.created?.id === id ? location.state.created : null))
	useEffect(() => {
		if (location.state?.created) navigate(location.pathname, { replace: true, state: null })
	}, [])
	const state = useApi(getOrder, [id], { enabled: !gone })
	const touch = useShellShape() === 'touch'
	const order = state.data?.id === id ? state.data : null

	if (!order && state.error) return <OrderFailed error={state.error} retry={state.refresh} />
	if (!order) return <OrderLoading />
	return <OrderView key={order.id} order={order} touch={touch} created={created} onGone={() => setGone(true)} />
}

/** The saved state's notice (3a): where the order came from, and Undo, which deletes it and goes
    back to the screen it was created from. */
function Created({ order, created, touch, onGone }) {
	const navigate = useNavigate()
	const toast = useToast()
	const [busy, setBusy] = useState(false)
	const undo = () => {
		setBusy(true)
		deleteOrder(order.id)
			.then(() => {
				onGone()
				invalidateOrderData()
				if (created.documentKey) navigate(`/orders/new?source=scan&doc=${created.documentKey}`, { replace: true })
				else {
					const draft = draftOf(order)
					const lines = draft.lines.map(({ id, photo, ...line }) => ({ ...line, key: `undo-${id}` }))
					navigate('/orders/new?source=empty', { replace: true, state: { seed: { ...draft, lines, reference: created.reference } } })
				}
				toast({ message: created.documentKey ? 'The order was not kept. The receipt is back for you to check.' : 'The order was not kept. What you typed is back in the form.' })
			})
			.catch(e => {
				setBusy(false)
				toast({ message: failureMessage(e, 'The order was not removed. Try again.'), color: 'danger' })
			})
	}
	const files = order.attachments.length + order.items.filter(i => i.attachments?.length).length - (created.documentKey ? 1 : 0)
	const said = [
		created.file ? 'The receipt is kept as an attachment.' : null,
		files > 0 ? `Undo also removes the ${plural(files, 'file')} you added.` : null
	].filter(Boolean).join(' ') || null
	const undoButton = <Button variant="outline" size="small" disabled={busy} onClick={undo}>Undo</Button>
	// after a scan the next receipt is one click away (16a: open the order or scan another)
	const actions = created.documentKey
		? <span className="sp-row-flex sp-gap-8">{undoButton}<Button variant="outline" size="small" to="/orders/new?source=scan">Scan another</Button></span>
		: undoButton
	// a phone's notice is too narrow for words and two buttons side by side, so the buttons go under the words
	const under = touch && created.documentKey
	return (
		<div className="or-span">
			<Alert color="success" mark={<Icon name="check" size={12} />}
				title={created.draft
					? (created.file ? `Saved as a draft from ${created.file}.` : 'Saved as a draft.')
					: (created.file ? `Order created from ${created.file}.` : 'Order created.')}
				action={actions} below={under}>
				{said}
			</Alert>
		</div>
	)
}

function OrderView({ order, touch, created, onGone }) {
	const navigate = useNavigate()
	const list = useListReturn('orders')
	const [viewing, setViewing] = useState(null)
	const [asking, setAsking] = useState(false)
	const files = filesOf(order)
	const open = key => setViewing(files.findIndex(f => f.key === key))
	const column = useRef(null)
	const stacked = useStacked(column)
	const [folded, setFolded] = useFolded('order', 'details', true)

	const items = (
		<Card>
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-section-label sp-nowrap">Items{dot}{order.items.length}</span>
				{/* a narrow phone wraps the line rather than cutting the date */}
				<span className={touch ? 'sp-meta or-wrap' : 'sp-meta sp-truncate'}>{order.vendor?.name}{dot}{shortDate(order.date)}</span>
				<span className="sp-grow" />
				<StatusPill status={order.status} />
			</div>
			<div className="sp-stack sp-gap-8">
				{order.items.map(item => {
					const photo = itemPhoto(order.id, item)
					const fileKey = item.attachments?.[0]?.id
					// on a phone the photo is smaller than a fingertip, so the whole row opens it, and says so
					if (touch && photo)
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
				<div className="sp-row-flex sp-wrap sp-gap-8">
					<span className="sp-section-label">Attachments{dot}{order.attachments.length}</span>
					<span className="sp-grow" />
					<Button variant="outline" size="small" onClick={() => downloadAll(order)}>Download all</Button>
				</div>
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
			<Sum value={order.vendor?.name}>Vendor</Sum>
			<Sum value={shortDate(order.date)}>Date</Sum>
			<Sum value={order.kind}>Kind</Sum>
			<Sum value={<OrderCategories order={order} />}>Categories</Sum>
			{order.reference ? <Sum value={order.reference}>Reference</Sum> : null}
			{order.note ? <Sum variant="stacked" value={order.note}>Note</Sum> : null}
		</div>
	)
	// in one column the details fold to a line above the items (18b)
	const details = stacked
		? (
			<Card variant="flush">
				<Toolbar variant="toggle" expanded={!folded} onClick={() => setFolded(f => !f)} chevron={<Icon name="chevron-down" />}>
					<span className="sp-stacked">
						<span className="sp-title sp-truncate">Order details</span>
						<span className="sp-meta sp-truncate">{[order.categories.map(c => c.name).join(', '), order.kind, order.reference].filter(Boolean).join(dot)}</span>
					</span>
				</Toolbar>
				<CardBody>{sums}</CardBody>
			</Card>
		)
		: (
			<Card>
				<span className="sp-section-label">Order details</span>
				{sums}
			</Card>
		)

	const totals = (
		<Card
			footer={[
				<Button key="copy" variant="outline" to={`/orders/new?duplicate=${order.id}`}>Duplicate</Button>,
				<Button key="edit" to={`/orders/${order.id}/edit`}>Edit order</Button>
			]}
			footerLayout="split"
			footerCommits
			after={<Button size="small" color="danger" fullWidth onClick={() => setAsking(true)}>Delete order</Button>}
		>
			<span className="sp-section-label">Totals</span>
			<div className="sp-stack">
				<Sum value={money(order.subtotal)}>Items ({order.items.length})</Sum>
				<Sum value={order.discount ? money(-order.discount) : money(0)}>Discount</Sum>
				<Sum value={money(order.shipping)}>Shipping</Sum>
				<Sum variant="total" value={money(order.total)}>Total</Sum>
			</div>
			<Saving value={order.saved} variant="stat" />
		</Card>
	)

	const dialog = asking
		? <DeleteOrder order={order} onClose={() => setAsking(false)} onDeleted={() => { onGone(); navigate(list) }} />
		: null

	const viewer = viewing != null && viewing > -1
		? <Viewer items={files} at={viewing} onMove={setViewing} onClose={() => setViewing(null)} />
		: null

	return (
		<>
			{created ? <Created order={order} created={created} touch={touch} onGone={onGone} /> : null}
			<div className="sp-stack sp-gap-12" ref={column}>{stacked ? details : null}{items}{attachments}</div>
			<Panel>{stacked ? null : details}{totals}{dialog}{viewer}</Panel>
		</>
	)
}

/** The order's categories; one over its limit this month carries the problem dot, the mark that
    travels with a category wherever it is named, the order list's rows included (8b). */
function OrderCategories({ order }) {
	const over = useOverLimitIds()
	if (!order.categories.length) return 'None'
	if (!order.categories.some(c => over.has(c.id))) return order.categories.map(c => c.name).join(dot)
	// the dot speaks of this month; an order from another month says which month that is
	const thisMonth = order.date.slice(0, 7) === today().slice(0, 7)
	return (
		<span className="sp-row-flex sp-wrap sp-gap-6 or-chips">
			{order.categories.map(c => <Chip key={c.id} trail={over.has(c.id) ? <OverLimitDot /> : undefined}>{c.name}</Chip>)}
			<span className="sp-meta">{thisMonth ? 'over limit' : 'over limit this month'}</span>
		</span>
	)
}

/** Every file, saved one after another the way the tile's own download saves one. */
function downloadAll(order) {
	for (const a of order.attachments) {
		const link = document.createElement('a')
		link.href = attachmentFileUrl(order.id, a.id)
		link.download = a.name
		document.body.append(link)
		link.click()
		link.remove()
	}
}
