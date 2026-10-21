import { createContext, useContext, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from '../components/Button.jsx'

/* On a phone a screen one level down swaps the search field for Back and a title. The shell
   holds the slot and hides the search while a screen fills it, and the tab bar on a task. */
export const ScreenBarSlot = createContext({ slot: null, setOn: () => {} })

/** Back and a title in the phone's top bar for as long as this is drawn, ended by `end`; on a desktop,
    nothing. A `place` keeps the tab bar under it (9h). */
export function ScreenBar({ onBack, title, meta, end, place = false }) {
	const { slot, setOn } = useContext(ScreenBarSlot)
	useEffect(() => {
		setOn(place ? 'place' : 'task')
		return () => setOn(null)
	}, [setOn, place])
	if (!slot) return null
	return createPortal(
		<>
			<IconButton variant="outline" icon="chevron-left" aria-label="Back" onClick={onBack} />
			<div className="sp-stacked sp-grow">
				<span className="sp-title sp-truncate">{title}</span>
				{meta ? <span className="sp-meta sp-truncate">{meta}</span> : null}
			</div>
			{end}
		</>,
		slot
	)
}
