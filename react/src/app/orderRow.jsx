import { Mark } from '../components/Mark.jsx'
import { Pill } from '../components/Pill.jsx'
import { itemAttachmentThumbnailUrl } from '../api/client.js'
import { dot } from '../api/format.js'

/** An order row's picture (2b): its first line photo with the rest counted over it, or the
    dashed box of an order with none. */
export function OrderPhoto({ order }) {
	if (!order.photo) return <Mark size="medium" fill="empty" aria-label="No photo" />
	const more = order.photoCount > 1 ? `+${order.photoCount - 1}` : null
	return (
		<Mark size="medium" fill="photo" count={more} aria-label={`Photo from ${order.vendor?.name ?? 'this order'}`}>
			<img src={itemAttachmentThumbnailUrl(order.id, order.photo.itemId, order.photo.attachmentId)} alt="" />
		</Mark>
	)
}

/** The line under an order's vendor: its reference and its note (2b). */
export const orderLine = order => [order.reference || 'No reference yet', order.note].filter(Boolean).join(dot)

const PILLS = { Delivered: { color: 'success' }, Returned: { color: 'danger' }, Ordered: { state: 'progress' } }

/** An order's status (2b). */
export function StatusPill({ status }) {
	const look = PILLS[status] ?? {}
	return <Pill color={look.color} state={look.state}>{status}</Pill>
}

/** The columns an order table keeps at its own width (2i): Items goes at 1040 and under, Categories at 880. */
export const columnsFor = width => ({ items: width > 1040, categories: width > 880 })
