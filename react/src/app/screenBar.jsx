import { createContext, useContext, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from '../components/Button.jsx'

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
