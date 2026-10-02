import { Mark } from '../components/Mark.jsx'
import { itemAttachmentThumbnailUrl } from '../api/client.js'

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
export const orderLine = order => [order.reference || 'No reference yet', order.note].filter(Boolean).join(' · ')
