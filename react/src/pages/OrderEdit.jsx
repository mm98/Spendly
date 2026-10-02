import { useParams } from 'react-router'
import { useApi } from '../api/useApi.js'
import { attachmentThumbnailUrl, getOrder, itemAttachmentThumbnailUrl } from '../api/client.js'
import { OrderForm, draftOf } from './OrderForm.jsx'
import { OrderFailed, OrderLoading } from './OrderParts.jsx'

/* Editing a saved order (1d): the read view's grid with controls in it. */

export default function OrderEdit() {
	const { id } = useParams()
	const state = useApi(getOrder, [id])
	// the form seeds once, so it waits for this order rather than painting the last one
	const order = state.data?.id === id && !state.loading ? state.data : null

	if (!order && state.error) return <OrderFailed error={state.error} retry={state.refresh} />
	if (!order) return <OrderLoading form />
	return (
		<OrderForm
			key={order.id}
			mode="edit"
			orderId={order.id}
			seed={draftOf(order)}
			files={order.attachments.map(a => ({
				id: a.id, name: a.name, kind: a.kind, thumb: a.hasThumbnail ? attachmentThumbnailUrl(order.id, a.id) : null
			}))}
			photoUrl={line => (line.id && line.photo?.hasThumbnail ? itemAttachmentThumbnailUrl(order.id, line.id, line.photo.id) : null)}
		/>
	)
}
