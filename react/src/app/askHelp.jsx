import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../components/Button.jsx'
import { ChatHelp } from '../components/Chat.jsx'
import { Dialog, DialogActions, DialogTitle } from '../components/Overlays.jsx'
import { Scrim } from '../components/Shell.jsx'
import { Sheet } from '../components/Touch.jsx'
import { useFocusTrap } from '../components/Utilities.jsx'
import { phrase } from '../language/phrases.js'

/** What Ask can do (24c, 7a): `onHelp` opens it, `help` draws it. An example replaces the field's text, not
    sent; a computer puts the cursor after it, a phone leaves the keyboard down. */
export function useAskHelp({ makes, disabled, touch, field, setText }) {
	const [open, setOpen] = useState(false)
	const chosen = useRef(null)
	// runs after the help's own focus trap has given focus back to its button
	useEffect(() => {
		const question = chosen.current
		if (open || question === null) return
		chosen.current = null
		const el = field.current
		if (touch || !el) return
		el.focus()
		el.setSelectionRange(question.length, question.length)
	}, [open, touch, field])
	const choose = question => {
		chosen.current = question
		setText(question)
		setOpen(false)
	}
	const close = () => setOpen(false)
	const help = open
		? (touch
			? <AskHelpSheet makes={makes ?? []} disabled={disabled} onChoose={choose} onClose={close} />
			: <AskHelpDialog makes={makes ?? []} disabled={disabled} onChoose={choose} onClose={close} />)
		: null
	return { onHelp: () => setOpen(true), help }
}

// the footnotes of the kinds this server makes, "Files are kept for 30 days"
const notesOf = makes => makes.map(m => m.note).filter(Boolean)

function AskHelpDialog({ makes, disabled, onChoose, onClose }) {
	return (
		<Dialog onCancel={onClose}>
			<DialogTitle>{phrase('chat.help')}</DialogTitle>
			<ChatHelp makes={makes} disabled={disabled} onChoose={onChoose} />
			<DialogActions>
				{notesOf(makes).map(note => <span key={note} className="sp-note">{note}</span>)}
				<span className="sp-grow" />
				<Button variant="outline" onClick={onClose}>{phrase('action.close')}</Button>
			</DialogActions>
		</Dialog>
	)
}

function AskHelpSheet({ makes, disabled, onChoose, onClose }) {
	const box = useRef(null)
	const title = useId()
	useFocusTrap(box)
	return createPortal(
		<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
			<Sheet role="dialog" aria-modal="true" aria-labelledby={title} ref={box} onDismiss={onClose}
				onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); onClose() } }}>
				<span className="sp-heading" id={title}>{phrase('chat.help')}</span>
				<ChatHelp makes={makes} disabled={disabled} onChoose={onChoose} />
				{notesOf(makes).map(note => <span key={note} className="sp-note">{note}</span>)}
				<Button variant="outline" fullWidth onClick={onClose}>{phrase('action.close')}</Button>
			</Sheet>
		</Scrim>,
		document.body
	)
}
