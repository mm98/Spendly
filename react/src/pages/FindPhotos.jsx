import { useState } from 'react'
import { IconButton } from '../components/Button.jsx'
import { Spinner } from '../components/Utilities.jsx'
import { useToast } from '../components/Overlays.jsx'
import { findPhotos, useWaitingPhotos } from '../app/photoFinding.js'
import { failureMessage } from '../api/client.js'
import { usePhrase } from '../language/phrases.js'

/** The Find photos button in an order's Items head (Order editing layouts 1a, 1d): there only while
    the order's vendor has a photo finder and a saved line has no photo, and the spinner while it works. */
export function FindPhotos({ orderId, finder, missing }) {
	const phrase = usePhrase()
	const toast = useToast()
	const waiting = useWaitingPhotos(orderId)
	const [asking, setAsking] = useState(false)
	if (!finder || (!missing && !waiting.size)) return null
	if (asking || waiting.size)
		return <IconButton variant="outline" icon={<Spinner />} aria-label={phrase('order.findingPhotos')} aria-busy="true" disabled />
	const find = () => {
		setAsking(true)
		findPhotos(orderId).catch(error => toast({ message: failureMessage(error, phrase('failed.connection')), color: 'danger' })).finally(() => setAsking(false))
	}
	return <IconButton variant="outline" icon="photo" aria-label={phrase('order.findPhotos')} data-tip={phrase('order.findPhotos')} onClick={find} />
}
