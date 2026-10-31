import { useEffect } from 'react'
import { useToast } from '../components/Overlays.jsx'
import { onPhotosFound } from './photoFinding.js'
import { phrase } from '../language/phrases.js'

/* Find photos ends on whatever page the reader is on (Order editing layouts 1a): said here, in a toast. */
export function PhotosFound() {
	const toast = useToast()
	useEffect(() => onPhotosFound(({ found, of }) => toast({ message: phrase('order.photosFound', { found, of }) })), [toast])
	return null
}
