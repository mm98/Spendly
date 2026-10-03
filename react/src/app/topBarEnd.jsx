import { createContext, useContext } from 'react'
import { createPortal } from 'react-dom'

// the right end of the top bar, where a screen puts the controls that act on the whole screen (4a)
export const TopBarEndSlot = createContext(null)

/** Renders its children at the top bar's right end; on a screen without one, nowhere. */
export function TopBarEnd({ children }) {
	const slot = useContext(TopBarEndSlot)
	return slot ? createPortal(children, slot) : null
}
