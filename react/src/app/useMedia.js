import { useSyncExternalStore } from 'react'

/** Whether a media query matches now, kept live as the window changes. */
export function useMedia(query) {
	return useSyncExternalStore(
		change => {
			const list = matchMedia(query)
			list.addEventListener('change', change)
			return () => list.removeEventListener('change', change)
		},
		() => matchMedia(query).matches
	)
}

/** The shell's three shapes, and the only two viewport breakpoints in the app (9h). */
export function useShellShape() {
	const touch = useMedia('(max-width: 639.98px)')
	const rail = useMedia('(max-width: 1279.98px)')
	return touch ? 'touch' : rail ? 'rail' : 'wide'
}
