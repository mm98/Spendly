import { useLayoutEffect, useState, useSyncExternalStore } from 'react'

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

/** An element's own width, kept live: a table's columns answer to their column, never the window (2i). */
export function useWidth(ref) {
	const [width, setWidth] = useState(0)
	useLayoutEffect(() => {
		const el = ref.current
		if (!el) return
		setWidth(el.getBoundingClientRect().width)
		const watch = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
		watch.observe(el)
		return () => watch.disconnect()
	}, [ref])
	return width
}

/** Whether the keyboard's command key is ⌘ rather than Ctrl. */
export const MAC = /Mac|iPhone|iPad/.test(navigator.platform)
