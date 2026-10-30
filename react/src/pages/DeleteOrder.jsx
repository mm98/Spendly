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
import { names } from './orderSave.js'
import { phrase, usePhrase } from '../language/phrases.js'

/** Deleting reaches past what is on screen, so it asks first and names what goes (6d). `order` needs only its
    id: the sentence and Delete wait for the whole order, so every number in it is true. */
export function DeleteOrder({ order, onClose, onDeleted }) {
	const phrase = usePhrase()
	const toast = useToast()
	const [busy, setBusy] = useState(false)
	// off before the order data is forgotten, so nothing asks for the order just deleted
	const [gone, setGone] = useState(false)
	const full = useApi(getOrder, [order.id], { enabled: !gone })
	const detail = full.data?.id === order.id ? full.data : null

	const remove = () => {
		setBusy(true)
		const vendor = detail.vendor?.name ?? null
		deleteOrder(order.id)
			.then(({ undo }) => {
				setGone(true)
				onDeleted()
				invalidateOrderData()
				const bringBack = () => restoreOrder(undo)
					.then(() => {
						invalidateOrderData()
						toast({ message: phrase('deleteOrder.back', { vendor, named: vendor ? 'yes' : 'no' }) })
					})
					.catch(e => toast({ message: failureMessage(e, phrase('deleteOrder.notBack')), color: 'danger' }))
				toast({ message: phrase('deleteOrder.deleted', { vendor, named: vendor ? 'yes' : 'no' }), undo: undo ? { label: phrase('action.undo'), onClick: bringBack } : undefined })
			})
			.catch(e => {
				setBusy(false)
				onClose()
				toast({ message: failureMessage(e, phrase('deleteOrder.notDeleted')), color: 'danger' })
			})
	}

	let body
	if (detail) body = <DialogBody>{consequence(detail)}</DialogBody>
	else if (full.error?.status === 404) body = <DialogBody>{phrase('deleteOrder.alreadyGone')}</DialogBody>
	else if (full.error)
		body = (
			<Alert color="danger" mark="!" title={phrase('deleteOrder.notLoaded')}
				action={<Button variant="outline" size="small" onClick={full.refresh}>{phrase('action.tryAgain')}</Button>}>
				{phrase('deleteOrder.notLoadedBody')}
			</Alert>
		)
	else
		body = (
			<div className="sp-stack sp-gap-6" aria-busy="true" aria-label={phrase('deleteOrder.counting')}>
				<Skeleton shape="line" />
				<Skeleton shape="short" />
			</div>
		)

	return (
		<Dialog onCancel={onClose} aria-label={phrase('deleteOrder.title')}>
			<div className="sp-stack sp-gap-12">
				<div className="sp-row-flex sp-gap-12">
					<Mark size="medium" aria-hidden="true" aria-label={phrase('action.delete')}><Icon name="trash" size={17} /></Mark>
					<DialogTitle>{phrase('deleteOrder.title')}</DialogTitle>
				</div>
				{body}
				<ListItem>{phrase('deleteOrder.undoHint')}</ListItem>
				<DialogActions>
					<Button variant="outline" fullWidth disabled={busy} onClick={onClose}>{phrase('action.keepIt')}</Button>
					<Button color="danger" fullWidth disabled={busy || !detail} onClick={remove}>{phrase('deleteOrder.confirm')}</Button>
				</DialogActions>
			</div>
		</Dialog>
	)
}

/** What goes, in numbers. The month's total counts every order dated in it, whatever its kind. */
function consequence(order) {
	const lines = order.items.length
	const files = order.attachments.length + order.items.reduce((n, item) => n + (item.attachments?.length ?? 0), 0)
	const counted = [[lines, 'line'], [files, 'attachment']].filter(([n]) => n > 0)
	const one = counted.length === 1 && counted[0][0] === 1
	const [year, month] = order.date.split('-').map(Number)
	const monthName = monthNames('long')[month - 1] + (year === new Date().getFullYear() ? '' : ` ${year}`)
	const drop = order.total > 0 ? { month: monthName, amount: currency(order.total), stop: fullStop() } : null
	const said = [phrase('deleteOrder.which', { vendor: order.vendor?.name, named: order.vendor ? 'yes' : 'no', date: shortDate(order.date), amount: currency(order.total), stop: fullStop() })]
	const goes = names(counted.map(([n, noun]) => plural(n, noun)))
	if (counted.length) said.push(drop ? phrase('deleteOrder.goesAndDrops', { goes, one: String(one), ...drop }) : phrase('deleteOrder.goes', { goes, one: String(one) }))
	else if (drop) said.push(phrase('deleteOrder.drops', drop))
	return said.join(' ')
}
