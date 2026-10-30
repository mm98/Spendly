import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useToast } from '../components/Overlays.jsx'
import { flushOutbox, onOrphanSaved, shortened, waitingSaves } from '../pages/orderSave.js'
import { phrase } from '../language/phrases.js'

/* An order saved without a connection (6d) whose form was closed before the connection
   returned: sent from here, on any page, and its outcome said in a toast. */

export function SavedLater() {
	const toast = useToast()
	const navigate = useNavigate()
	useEffect(() => onOrphanSaved(({ plan, outcome }) => {
		// the vendor's name when the order has one; `from` picks the phrase that names it
		const said = key => phrase(key, { from: plan.label ? 'vendor' : 'none', vendor: plan.label ? shortened(plan.label) : '' })
		const open = phrase('action.open')
		if (outcome.kind === 'saved')
			return toast(outcome.lapse
				? { message: outcome.lapse, color: 'danger' }
				: { message: said('savedLater.saved'), undo: { label: open, onClick: () => navigate(`/orders/${outcome.order.id}`) } })
		if (outcome.kind === 'conflict')
			return toast({
				message: said('savedLater.conflict'),
				color: 'danger',
				undo: { label: open, onClick: () => navigate(`/orders/${plan.orderId}/edit`) }
			})
		if (outcome.kind === 'gone') return toast({ message: outcome.message, color: 'danger' })
		// refused: what was typed goes back to a new order's form, never lost with the toast
		toast({
			message: [said('savedLater.refused'), outcome.message].filter(Boolean).join(' '),
			color: 'danger',
			undo: plan.creating
				? { label: open, onClick: () => navigate('/orders/new?source=empty', { state: { seed: { ...plan.form.draft, lines: plan.form.lines } } }) }
				: { label: open, onClick: () => navigate(`/orders/${plan.orderId}/edit`) }
		})
	}), [toast, navigate])
	// saves kept from an earlier visit go as soon as there is a page to tell
	useEffect(() => { if (waitingSaves().some(w => w.state === 'waiting')) flushOutbox() }, [])
	return null
}
