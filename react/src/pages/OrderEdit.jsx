import { useRef } from 'react'
import { useParams } from 'react-router'
import { useApi } from '../api/useApi.js'
import { getOrder, itemAttachmentThumbnailUrl } from '../api/client.js'
import { OrderForm, draftOf, savedFilesOf } from './OrderForm.jsx'
import { OrderFailed, OrderLoading } from './OrderParts.jsx'

/* Editing a saved order (1d): the read view's grid with controls in it. */

export default function OrderEdit() {
	const { id } = useParams()
	const state = useApi(getOrder, [id])
	// the form seeds once, so it waits for this order rather than painting the last one, and keeps
	// it when the order is asked for again: a copy saved elsewhere is the form's to offer (6d)
	const held = useRef(null)
	if (held.current?.id !== id) held.current = state.data?.id === id && !state.loading ? state.data : null
	const order = held.current

	if (!order && state.error) return <OrderFailed error={state.error} retry={state.refresh} />
	if (!order) return <OrderLoading form />
	return (
		<OrderForm
			key={order.id}
			mode="edit"
			orderId={order.id}
			seed={draftOf(order)}
			revision={order.revision ?? null}
			files={savedFilesOf(order)}
			photoUrl={line => (line.id && line.photo?.hasThumbnail ? itemAttachmentThumbnailUrl(order.id, line.id, line.photo.id) : null)}
		/>
	)
}
