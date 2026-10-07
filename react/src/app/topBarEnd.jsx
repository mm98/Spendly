import { createContext, useContext, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from '../components/Button.jsx'

// the right end of the top bar, where a screen puts the controls that act on the whole screen (4a)
export const TopBarEndSlot = createContext(null)

/** Renders its children at the top bar's right end; on a screen without one, nowhere. */
export function TopBarEnd({ children }) {
	const slot = useContext(TopBarEndSlot)
	return slot ? createPortal(children, slot) : null
}

/* On a phone a screen one level down swaps the search field for Back and a title. The shell
   holds the slot and hides the search while a screen fills it. */
export const ScreenBarSlot = createContext({ slot: null, setOn: () => {} })

/** Back and a title in the phone's top bar for as long as this is drawn; on a desktop, nothing. */
export function ScreenBar({ onBack, title, meta }) {
	const { slot, setOn } = useContext(ScreenBarSlot)
	useEffect(() => {
		setOn(true)
		return () => setOn(false)
	}, [setOn])
	if (!slot) return null
	return createPortal(
		<>
			<IconButton variant="outline" icon="chevron-left" aria-label="Back" onClick={onBack} />
			<div className="sp-stacked sp-grow">
				<span className="sp-title sp-truncate">{title}</span>
				{meta ? <span className="sp-meta sp-truncate">{meta}</span> : null}
			</div>
		</>,
		slot
	)
}
