import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Card, Panel } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Totals } from '../components/LineEditor.jsx'
import { Sum } from '../components/Data.jsx'
import { Strip, Viewer } from '../components/Attachments.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, useToast } from '../components/Overlays.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { useApi } from '../api/useApi.js'
import {
	attachmentFileUrl, attachmentThumbnailUrl, deleteOrder, failureMessage, getOrder, getSettings, invalidateOrderData
} from '../api/client.js'
import { monthNames, shortDate } from '../api/format.js'
import {
	AttachmentTile, LineAmount, LinePhoto, LineText, OrderFailed, OrderLoading, SEP, Saving, StatusPill, filesOf, itemPhoto,
	itemsWord, money, useNarrow, useTouch
} from './OrderParts.jsx'

/* One order, read (1a): items and attachments in the wide column, details and totals in the
   rail, and the rail ends with what can be done to the order. */

export default function Order() {
	const { id } = useParams()
	const state = useApi(getOrder, [id])
	const touch = useTouch()
	const narrow = useNarrow()
	const order = state.data?.id === id ? state.data : null

	if (!order && state.error) return <OrderFailed error={state.error} retry={state.refresh} />
	if (!order) return <OrderLoading touch={narrow} />
	return <OrderView key={order.id} order={order} touch={touch} narrow={narrow} />
}

function OrderView({ order, touch, narrow }) {
	const navigate = useNavigate()
	const toast = useToast()
	const settings = useApi(getSettings)
	const [viewing, setViewing] = useState(null)
	const [asking, setAsking] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const files = filesOf(order)
	const open = key => setViewing(files.findIndex(f => f.key === key))

	const remove = () => {
		setDeleting(true)
		deleteOrder(order.id)
			.then(() => {
				invalidateOrderData()
				toast({ message: `The order from ${order.vendor?.name ?? 'this vendor'} was deleted.` })
				navigate('/orders')
			})
			.catch(e => {
				setDeleting(false)
				setAsking(false)
				toast({ message: failureMessage(e, 'The order was not deleted. Try again.'), color: 'danger' })
			})
	}
	const askDelete = () => (settings.data?.confirmDelete === false ? remove() : setAsking(true))

	const items = (
		<Card>
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-section-label">Items{SEP}{order.items.length}</span>
				<span className="sp-meta">{order.vendor?.name}{SEP}{shortDate(order.date)}</span>
				<span className="sp-grow" />
				<StatusPill status={order.status} />
			</div>
			<div className="sp-stack sp-gap-8">
				{order.items.map(item => {
					const photo = itemPhoto(order.id, item)
					const fileKey = item.attachments?.[0]?.id
					return (
						<ListItem key={item.id} mark={<LinePhoto src={photo} name={item.title} onOpen={photo ? () => open(fileKey) : undefined} />}>
							<LineText line={item} compact={touch} />
							<span className="sp-grow" />
							<LineAmount line={item} compact={touch} />
						</ListItem>
					)
				})}
			</div>
			<Totals>
				<span className="sp-strong">{itemsWord(order.items.length)}{SEP}{money(order.subtotal)} paid</span>
				<span className="sp-grow" />
				<Saving value={order.saved} />
			</Totals>
		</Card>
	)

	const attachments = order.attachments.length
		? (
			<Card>
				<div className="sp-row-flex sp-wrap sp-gap-8">
					<span className="sp-section-label">Attachments{SEP}{order.attachments.length}</span>
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

	const details = (
		<Card>
			<span className="sp-section-label">Order details</span>
			<div className="sp-stack">
				<Sum value={order.vendor?.name}>Vendor</Sum>
				<Sum value={shortDate(order.date)}>Date</Sum>
				<Sum value={order.kind}>Kind</Sum>
				<Sum value={order.categories.length ? order.categories.map(c => c.name).join(SEP) : 'None'}>Categories</Sum>
				{order.reference ? <Sum value={order.reference}>Reference</Sum> : null}
				{order.note ? <Sum variant="stacked" value={order.note}>Note</Sum> : null}
			</div>
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
			after={<Button size="small" color="danger" fullWidth onClick={askDelete}>Delete order</Button>}
		>
			<span className="sp-section-label">Totals</span>
			<div className="sp-stack">
				<Sum value={money(order.subtotal)}>Items ({order.items.length})</Sum>
				<Sum value={order.discount ? money(-order.discount) : money(0)}>Discount</Sum>
				<Sum value={money(order.shipping)}>Shipping</Sum>
				<Sum variant="total" value={money(order.total)}>Total</Sum>
			</div>
			{order.saved > 0
				? <span className="sp-stat__delta">Saved {money(order.saved)}</span>
				: <Saving value={0} />}
		</Card>
	)

	const dialog = asking
		? (
			<Dialog onCancel={() => setAsking(false)}>
				<div className="sp-row-flex sp-gap-12">
					<Mark size="medium" aria-label="Delete" aria-hidden="true"><Icon name="trash" /></Mark>
					<DialogTitle>Delete this order?</DialogTitle>
				</div>
				<DialogBody>{deleteSentence(order)}</DialogBody>
				<ListItem>This cannot be undone.</ListItem>
				<DialogActions>
					<Button variant="outline" onClick={() => setAsking(false)}>Keep it</Button>
					<span className="sp-grow" />
					<Button color="danger" iconStart="trash" disabled={deleting} onClick={remove}>Delete order</Button>
				</DialogActions>
			</Dialog>
		)
		: null

	const viewer = viewing != null && viewing > -1
		? <Viewer items={files} at={viewing} onMove={setViewing} onClose={() => setViewing(null)} />
		: null

	if (narrow) return (
		<div className="sp-stack sp-gap-12">
			{items}{attachments}{details}{totals}{dialog}{viewer}
		</div>
	)
	return (
		<>
			<div className="sp-stack sp-gap-12">{items}{attachments}</div>
			<Panel>{details}{totals}{dialog}{viewer}</Panel>
		</>
	)
}

/** What deleting takes with it, in numbers (6d). Only an expense counts in a month's total. */
function deleteSentence(order) {
	const who = order.reference ? `${order.reference} from ${order.vendor?.name}` : `The order from ${order.vendor?.name}`
	const lines = itemsWord(order.items.length).replace('item', 'line')
	const files = order.attachments.length
		? ` and ${order.attachments.length === 1 ? '1 attachment' : `${order.attachments.length} attachments`}`
		: ''
	const [year, month] = order.date.split('-').map(Number)
	const monthName = monthNames('long')[month - 1] + (year === new Date().getFullYear() ? '' : ` ${year}`)
	const drop = order.kind === 'Expense' ? `, and the ${monthName} total drops by ${money(order.total)}` : ''
	return `${who}, ${money(order.total)}. Its ${lines}${files} go with it${drop}.`
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
