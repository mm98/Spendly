import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon.jsx'

/* Toasts: what the app says back after you do something.

   One place for all of it, top right, above everything. Before this each page printed its own
   result wherever there happened to be room -- a file removed from the attachments card was
   reported beside the vendor name a column away, and a reordered line was announced at the top
   of a form the user was not looking at. Feedback nobody sees is feedback that was not given.

   There is a line this does not cross. A toast is for what *happened*: saved, added, removed,
   moved, refused. A form's verdict on its own fields -- "Cannot continue — Vendor and Date need
   fixing." -- is not that. It has to stay on screen while the form is still wrong, it names the
   fields you must go and fix, and it belongs next to them. Those stay where they are. README: Fields and Forms.

   Announcement is by one region. `role="status"` with `aria-live="polite"` waits for a pause
   rather than cutting in, which is right for a result you did not have to act on.

   No CSS is added for this: the stylesheet is the prototype's and is synced from it, so a toast
   is a `.card` with the system's own tokens and a coloured edge, placed by inline geometry. */

const ToastContext = createContext(() => {})

/** `toast('Saved.')`, or `toast('That did not save.', 'negative')`. */
export const useToast = () => useContext(ToastContext)

const LIFE = 5000        // ms on screen; long enough to read a sentence, short enough to leave
const REDUCED = () => typeof window !== 'undefined'
	&& window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function Toast({ toast, onDismiss }) {
	const [shown, setShown] = useState(REDUCED())

	useEffect(() => {
		if (REDUCED()) return
		const frame = requestAnimationFrame(() => setShown(true))
		return () => cancelAnimationFrame(frame)
	}, [])

	const negative = toast.tone === 'negative'
	return (
		<div className="card" role="group" aria-label={negative ? 'Error' : 'Notice'}
			style={{
				display: 'flex', alignItems: 'flex-start', gap: 10,
				padding: '12px 12px 12px 14px',
				borderLeft: `3px solid ${negative ? 'var(--text-negative)' : 'var(--green)'}`,
				boxShadow: '0 12px 28px rgb(11 26 18 / .16)',
				pointerEvents: 'auto',
				/* Motion is a fade and a short slide, and it is skipped outright where the reader
				   has asked for that -- the stylesheet's reduced-motion block cannot reach an
				   inline transition, so this has to honour the preference itself. */
				opacity: shown ? 1 : 0,
				transform: shown ? 'none' : 'translateY(-6px)',
				transition: REDUCED() ? undefined : 'opacity .18s ease, transform .18s ease'
			}}>
			<span aria-hidden="true" style={{
				display: 'grid', placeItems: 'center', flex: 'none', marginTop: 1,
				color: negative ? 'var(--text-negative)' : 'var(--green)'
			}}>
				<Icon name={negative ? 'alert' : 'check'} />
			</span>
			<span style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.45, color: 'var(--text-body)' }}>
				{toast.message}
			</span>
			<button type="button" className="icon-button icon-button-clear"
				aria-label="Dismiss" onClick={onDismiss} style={{ marginLeft: 0 }}>
				<Icon name="close" />
			</button>
		</div>
	)
}

export function ToastProvider({ children }) {
	const [toasts, setToasts] = useState([])
	const [below, setBelow] = useState(14)
	const next = useRef(0)
	const timers = useRef(new Map())

	/* Under the top bar, not over it. Pinned to the viewport's own top edge, a toast covers the
	   search field and the two buttons beside it -- and it takes pointer events, so it does not
	   merely sit on them, it takes their clicks. The bar is a different height at each
	   breakpoint, so the offset is measured rather than guessed. */
	useEffect(() => {
		const bar = document.querySelector('.topbar')
		if (!bar) return
		const measure = () => setBelow(Math.round(bar.getBoundingClientRect().height) + 12)
		measure()
		if (!window.ResizeObserver) return
		const ro = new ResizeObserver(measure)
		ro.observe(bar)
		return () => ro.disconnect()
	}, [])

	const dismiss = useCallback(id => {
		setToasts(list => list.filter(t => t.id !== id))
		const timer = timers.current.get(id)
		if (timer) { clearTimeout(timer); timers.current.delete(id) }
	}, [])

	const toast = useCallback((message, tone = 'positive') => {
		if (!message) return
		const id = ++next.current
		/* Newest first, and never more than a handful: a column of them down the screen is a
		   wall, and the ones underneath are the ones already read. */
		setToasts(list => [{ id, message, tone }, ...list].slice(0, 4))
		timers.current.set(id, setTimeout(() => dismiss(id), LIFE))
	}, [dismiss])

	useEffect(() => () => { for (const t of timers.current.values()) clearTimeout(t) }, [])

	const value = useMemo(() => toast, [toast])

	return (
		<ToastContext.Provider value={value}>
			{children}
			{/* Fixed to the top right, clear of the top bar, and narrow enough on a phone to sit
			    inside the same 12px gutter the rest of the phone layout uses. The container never
			    takes pointer events -- only the toasts in it do -- so it cannot swallow a click
			    on whatever is underneath. */}
			<div role="status" aria-live="polite" aria-relevant="additions"
				style={{
					position: 'fixed', top: below, right: 14, zIndex: 80,
					display: 'grid', gap: 8, width: 'min(360px, calc(100vw - 28px))',
					pointerEvents: 'none'
				}}>
				{toasts.map(t => <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />)}
			</div>
		</ToastContext.Provider>
	)
}
