import { useEffect, useRef } from 'react'
import { Button } from './Button.jsx'

/* The question the app asks before doing something it cannot take back.

   A native <dialog> is the no-dependency modal: showModal() traps focus, Escape fires `cancel`
   for free, and the backdrop is a real pseudo-element rather than a div pretending to be one.
   Two rules travel with it, and both were learned on the delete flow this was first written for:

   Focus goes to the *safe* answer, not the first focusable. showModal() would hand it to the
   button on the left, and the key the dialog opened under may not be the one the reader meant
   to press -- an Enter still in flight should never be the thing that confirms.

   The dialog leaves by unmounting rather than close(), which skips the element's own focus
   restore, so the opener is put back by hand. If what opened it has just been deleted, focusing
   a detached element is a no-op and focus stays where the page put it.

   Generic because there are two of these now: deleting a record (FormPage.jsx) and reloading
   onto a new build (UpdateNotice.jsx). A second copy of the mechanics is how the two would come
   to disagree about which button focus lands on. README: Deletion, Chrome. */

export function ConfirmDialog({ title, detail, confirmLabel, cancelLabel = 'CANCEL', onConfirm, onCancel, children }) {
	const ref = useRef(null)
	const cancelRef = useRef(null)

	useEffect(() => {
		const opener = document.activeElement
		ref.current?.showModal()
		cancelRef.current?.focus()
		return () => opener?.focus?.()
	}, [])

	return (
		<dialog className="confirm-dialog" ref={ref} aria-label={title}
			onCancel={onCancel}
			onClick={e => { if (e.target === ref.current) onCancel() }}>
			<div className="confirm-dialog-card">
				<strong>{title}</strong>
				<p>{detail}</p>
				{children}
				<div className="form-actions">
					<Button variant="caps compact" onClick={onConfirm}>{confirmLabel}</Button>
					<Button ref={cancelRef} variant="ghost compact" onClick={onCancel}>{cancelLabel}</Button>
				</div>
			</div>
		</dialog>
	)
}
