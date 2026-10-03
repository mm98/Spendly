import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useToast } from '../components/Overlays.jsx'
import { flushOutbox, onOrphanSaved, waitingSaves } from '../pages/orderSave.js'

/* An order saved without a connection (6d) whose form was closed before the connection
   returned: sent from here, on any page, and its outcome said in a toast. */

export function SavedLater() {
	const toast = useToast()
	const navigate = useNavigate()
	useEffect(() => onOrphanSaved(({ plan, outcome }) => {
		const from = plan.label ? `the order from ${plan.label}` : 'the order'
		const From = from.charAt(0).toUpperCase() + from.slice(1)
		if (outcome.kind === 'saved')
			return toast(outcome.lapse
				? { message: outcome.lapse, color: 'danger' }
				: { message: `${From} is saved. It waited for the connection.`, undo: { label: 'Open', onClick: () => navigate(`/orders/${outcome.order.id}`) } })
		if (outcome.kind === 'conflict')
			return toast({
				message: `${From} was changed somewhere else while your change waited. Open it to choose which to keep.`,
				color: 'danger',
				undo: { label: 'Open', onClick: () => navigate(`/orders/${plan.orderId}/edit`) }
			})
		if (outcome.kind === 'gone') return toast({ message: outcome.message, color: 'danger' })
		// refused: what was typed goes back to a new order's form, never lost with the toast
		toast({
			message: [`${From} was not saved.`, outcome.message].filter(Boolean).join(' '),
			color: 'danger',
			undo: plan.creating
				? { label: 'Open', onClick: () => navigate('/orders/new?source=empty', { state: { seed: { ...plan.form.draft, lines: plan.form.lines } } }) }
				: { label: 'Open', onClick: () => navigate(`/orders/${plan.orderId}/edit`) }
		})
	}), [toast, navigate])
	// saves kept from an earlier visit go as soon as there is a page to tell
	useEffect(() => { if (waitingSaves().some(w => w.state === 'waiting')) flushOutbox() }, [])
	return null
}
