import { useCallback, useLayoutEffect, useState } from 'react'
import { useLocation } from 'react-router'

/** Runs `then` once the page has drawn the change made with it: a field that this change shows, opens
    or gives back from being locked takes focus only then. Called from a click, a key or an answer. */
export function useAfterDraw() {
	const [asked, setAsked] = useState(null)
	useLayoutEffect(() => { asked?.then() }, [asked])
	return useCallback(then => setAsked({ then }), [])
}

// the visits whose search field has taken focus, so Back to one does not take it again
const searched = new Set()

/** The ref for a page's own search field. G and a letter (9d) opens the page with `pageSearch` in the
    visit's state, and the field takes focus as it is drawn for that visit, however late that is. */
export function usePageSearch() {
	const { state, key } = useLocation()
	const asked = state?.pageSearch === true && !searched.has(key)
	return useCallback(el => {
		if (!el || !asked) return
		searched.add(key)
		el.focus()
	}, [asked, key])
}
