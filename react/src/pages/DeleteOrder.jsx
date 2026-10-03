import { useState } from 'react'
import { Button } from '../components/Button.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Alert, Dialog, DialogActions, DialogBody, DialogTitle, useToast } from '../components/Overlays.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Skeleton } from '../components/Utilities.jsx'
import { useApi } from '../api/useApi.js'
import { deleteOrder, failureMessage, getOrder, invalidateOrderData, restoreOrder } from '../api/client.js'
import { currency, fullStop, monthNames, plural, shortDate } from '../api/format.js'

/** Deleting reaches past what is on screen, so it asks first and names what goes (6d). `order` needs only its
    id: the sentence and Delete wait for the whole order, so every number in it is true. */
export function DeleteOrder({ order, onClose, onDeleted }) {
	const toast = useToast()
	const [busy, setBusy] = useState(false)
	// off before the order data is forgotten, so nothing asks for the order just deleted
	const [gone, setGone] = useState(false)
	const full = useApi(getOrder, [order.id], { enabled: !gone })
	const detail = full.data?.id === order.id ? full.data : null

	const remove = () => {
		setBusy(true)
		const vendor = detail.vendor?.name ?? 'no vendor'
		deleteOrder(order.id)
			.then(({ undo }) => {
				setGone(true)
				onDeleted()
				invalidateOrderData()
				const bringBack = () => restoreOrder(undo)
					.then(() => {
						invalidateOrderData()
						toast({ message: `The order from ${vendor} is back.` })
					})
					.catch(e => toast({ message: failureMessage(e, 'The order was not brought back. Check your connection.'), color: 'danger' }))
				toast({ message: `The order from ${vendor} was deleted.`, undo: undo ? { label: 'Undo', onClick: bringBack } : undefined })
			})
			.catch(e => {
				setBusy(false)
				onClose()
				toast({ message: failureMessage(e, 'The order was not deleted. Try again.'), color: 'danger' })
			})
	}

	let body
	if (detail) body = <DialogBody>{consequence(detail)}</DialogBody>
	else if (full.error?.status === 404) body = <DialogBody>This order is already deleted.</DialogBody>
	else if (full.error)
		body = (
			<Alert color="danger" mark="!" title="This order did not load"
				action={<Button variant="outline" size="small" onClick={full.refresh}>Try again</Button>}>
				What goes with it is not known yet. Check your connection.
			</Alert>
		)
	else
		body = (
			<div className="sp-stack sp-gap-6" aria-busy="true" aria-label="Counting what goes with the order">
				<Skeleton shape="line" />
				<Skeleton shape="short" />
			</div>
		)

	return (
		<Dialog onCancel={onClose} aria-label="Delete this order?">
			<div className="sp-stack sp-gap-12">
				<div className="sp-row-flex sp-gap-12">
					<Mark size="medium" aria-hidden="true" aria-label="Delete"><Icon name="trash" size={17} /></Mark>
					<DialogTitle>Delete this order?</DialogTitle>
				</div>
				{body}
				<ListItem>You can undo this from the message that follows. After the message goes away, it cannot be undone.</ListItem>
				<DialogActions>
					<Button variant="outline" fullWidth disabled={busy} onClick={onClose}>Keep it</Button>
					<Button color="danger" fullWidth disabled={busy || !detail} onClick={remove}>Delete order</Button>
				</DialogActions>
			</div>
		</Dialog>
	)
}

/** What goes, in numbers. The month's total counts every order dated in it, whatever its kind. */
function consequence(order) {
	const vendor = order.vendor?.name ?? 'no vendor'
	const which = order.reference ? `Order ${order.reference} from ${vendor}` : `The order from ${vendor} on ${shortDate(order.date)}`
	const lines = order.items.length
	const files = order.attachments.length + order.items.reduce((n, item) => n + (item.attachments?.length ?? 0), 0)
	const counted = [[lines, 'line'], [files, 'attachment']].filter(([n]) => n > 0)
	const one = counted.length === 1 && counted[0][0] === 1
	const [year, month] = order.date.split('-').map(Number)
	const monthName = monthNames('long')[month - 1] + (year === new Date().getFullYear() ? '' : ` ${year}`)
	const drop = order.total > 0 ? `the ${monthName} total drops by ${currency(order.total)}${fullStop()}` : null
	const said = [`${which}, ${currency(order.total)}${fullStop()}`]
	if (counted.length) said.push(`Its ${counted.map(([n, noun]) => plural(n, noun)).join(' and ')} ${one ? 'goes' : 'go'} with it${drop ? `, and ${drop}` : '.'}`)
	else if (drop) said.push(drop.replace(/^t/, 'T'))
	return said.join(' ')
}
