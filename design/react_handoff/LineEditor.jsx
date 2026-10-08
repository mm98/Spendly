import { Button, IconButton } from './Button.jsx'
import { Icon } from './Icon.jsx'
import { join, reject } from './variants.js'

/* The line editor (c15): what a list row opens into, in place. The order line keeps
   its photo slot (`photo`); any other row - a budget row, a group, an account - is
   the plain form, with a head naming what is open and the fields as children. One
   frame, one form column and one action row for both, so an open row reads alike
   wherever it is.

   The fields are the caller's, as children, so this owns the frame and the parts that
   are the same every time, and no field is drawn here twice. */

/**
 * @param {object} props
 * @param {React.ReactNode} [props.photo] The order line's photo slot. Omitted, the editor
 *   is the plain form, for a row with no photo.
 * @param {React.ReactNode} [props.title] The head, for the plain form: Row 7 of 8 in Housing, New group in costs.
 * @param {string} [props.what] The thing edited, for the move and delete labels: row, group, account.
 * @param {() => void} [props.onMoveUp] With onMoveDown and onDelete, an existing
 *   one. A new one passes none of the three, and the head shows only the title.
 * @param {() => void} [props.onMoveDown]
 * @param {() => void} [props.onDelete] Asks first; the dialog is the caller's.
 * @param {boolean} [props.first] Disables Move up.
 * @param {boolean} [props.last] Disables Move down.
 * @param {boolean} [props.handle] Open in a list that reorders: keeps the rows' handle
 *   column, so the row's text stays on its line when it opens.
 * @param {React.ReactNode} props.commit Save row, Add group.
 * @param {boolean} [props.saving]
 * @param {() => void} props.onCommit
 * @param {() => void} props.onCancel
 * @param {React.ReactNode} [props.hint] The keys, at the start of the action row. An order
 *   line adds its own: Enter saves · Escape cancels · ⌘↵ saves and opens the next line.
 * @param {React.ReactNode} props.children The fields. With a photo they are passed as the
 *   order line lays them out - the item, then its grid - and rendered as given. Without, they sit two by two in reading order - a budget row's
 *   Name, Expected each month, Account, Group - or alone, for a group or an account.
 *
 * Takes no `className` and no `style`.
 */
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
	commit,
	saving = false,
	onCommit,
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
		else if (ev.key === 'Enter' && ev.target instanceof HTMLInputElement) { ev.preventDefault(); onCommit?.() }
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
				<div className={join('sp-line-editor__grid', fields.length < 2 && 'sp-line-editor__grid--one')}>
					{children}
				</div>
			)}
			<div className="sp-dialog__actions">
				<span className="sp-note">{hint}</span>
				<span className="sp-grow" />
				<Button variant="outline" onClick={onCancel}>Cancel</Button>
				<Button disabled={saving} onClick={onCommit}>{saving ? 'Saving...' : commit}</Button>
			</div>
		</>
	)
	const handleCol = handle ? <span className="sp-list-item__handle" aria-hidden="true"><Icon name="grip-vertical" /></span> : null
	if (photo) return (
		<div className="sp-line-editor" onKeyDown={keys} {...rest}>
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
