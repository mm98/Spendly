import { Button, IconButton } from './Button.jsx'
import { Icon } from './Icon.jsx'
import { join, reject } from './variants.js'

/** @param {object} props
    @param {import('react').ReactElement} [props.photo] The line's photo slot. Leave it out for a line with no photo.
    @param {string} [props.hint] The keys the editor answers to, at the start of the button row.
    @param {string} [props.title] The head of the editor, such as Row 7 of 8 in Housing.
    @param {string} [props.what] What one line is, such as line or row. It goes into the buttons' names.
    @param {() => void} [props.onMoveUp] With onMoveDown and onDelete, an existing one.
    @param {() => void} [props.onMoveDown]
    @param {() => void} [props.onDelete] Asks first; the dialog is the caller's.
    @param {boolean} [props.first] The first line: Move up is turned off.
    @param {boolean} [props.last] The last line: Move down is turned off.
    @param {boolean} [props.handle] Keep room for the drag handle column, so the text lines up with the rows around it.
    @param {boolean} [props.sheet] The editor is in a sheet on a phone: the fields sit in one column and the keys are not named.
    @param {string} [props.commit] The words on the save button, such as Save row.
    @param {boolean} [props.saving] The line is being saved: the save button is off and reads Saving…, and Enter does nothing.
    @param {() => void} [props.onCommit]
    @param {() => void} [props.onCommitNext]
    @param {() => void} [props.onCancel]
    @param {import('react').ReactElement | import('react').ReactElement[]} [props.children] The fields of the line. */
export function LineEditor({
	photo,
	hint = 'Enter saves · Escape cancels',
	title,
	what,
	onMoveUp,
	onMoveDown,
	onDelete,
	first = false,
	last = false,
	handle = false,
	sheet = false,
	commit,
	saving = false,
	onCommit,
	onCommitNext,
	onCancel,
	children,
	...rest
}) {
	reject(rest, 'LineEditor')
	const fields = [].concat(children ?? []).filter(Boolean)
	// Enter and Escape belong to an open picker first, which marks the key as handled
	const keys = ev => {
		if (ev.defaultPrevented || ev.target.getAttribute?.('aria-expanded') === 'true') return
		if (ev.key === 'Escape') { ev.preventDefault(); onCancel?.() }
		else if (ev.key === 'Enter' && ev.target instanceof HTMLInputElement) {
			ev.preventDefault()
			// a save in progress is answered once: a second Enter must not write the line again
			if (saving) return
			if ((ev.metaKey || ev.ctrlKey) && onCommitNext) onCommitNext()
			else onCommit?.()
		}
	}
	const parts = (
		<>
			{photo ? null : <div className="sp-line-editor__head">
				<span className="sp-title">{title}</span>
				<span className="sp-grow" />
				{onMoveUp ? <IconButton variant="outline" icon={<Icon name="chevron-up" />} aria-label={`Move the ${what} up`} disabled={first} onClick={onMoveUp} /> : null}
				{onMoveDown ? <IconButton variant="outline" icon={<Icon name="chevron-down" />} aria-label={`Move the ${what} down`} disabled={last} onClick={onMoveDown} /> : null}
				{onDelete ? <IconButton variant="outline" danger icon={<Icon name="trash" />} aria-label={`Delete the ${what}`} onClick={onDelete} /> : null}
			</div>}
			{photo ? children : (
				// on a phone two halves holding unrelated values become two full-width fields (15b)
				<div className={join('sp-line-editor__grid', (fields.length < 2 || sheet) && 'sp-line-editor__grid--one')}>
					{children}
				</div>
			)}
			<div className="sp-dialog__actions">
				{/* in a sheet the two commits share the row (1c), with no keys to name */}
				{sheet ? null : <><span className="sp-note sp-truncate">{hint}</span><span className="sp-grow" /></>}
				<Button variant="outline" fullWidth={sheet} onClick={onCancel}>Cancel</Button>
				<Button disabled={saving} fullWidth={sheet} onClick={onCommit}>{saving ? 'Saving…' : commit}</Button>
			</div>
		</>
	)
	// an open row is not dragged: the column stays empty so the row's text keeps its line
	const handleCol = handle ? <span className="sp-list-item__handle" aria-hidden="true" /> : null
	if (photo) return (
		<div className={join('sp-line-editor', sheet && 'sp-line-editor--sheet')} onKeyDown={keys} {...rest}>
			{handleCol}
			{photo}
			<div className="sp-line-editor__form">{parts}</div>
		</div>
	)
	return (
		<div className="sp-line-editor sp-line-editor--plain" onKeyDown={keys} {...rest}>
			{handleCol}
			<div className="sp-line-editor__form">{parts}</div>
		</div>
	)
}

/** The line under a list of items (c15): what they come to, then the saving.
    @param {object} props
    @param {import('react').ReactNode} [props.children] What the lines come to, then the save state. */
export function Totals({ children, ...rest }) {
	reject(rest, 'Totals')
	return <div className="sp-totals" {...rest}>{children}</div>
}
