import { forwardRef, useId, useImperativeHandle, useRef, useState } from 'react'
import { Icon } from './Icon.jsx'
import { ButtonLink } from './Button.jsx'
import { acceptAttribute } from './fileKinds.js'

/* Choosing files, and dropping them.

   The stylesheet hides a file input with `.field-shell > .field-file-input` -- note the child
   combinator. That rule is right where the prototype uses it, inside the field shell, and it
   silently does nothing anywhere else: put the input one level deeper, or in a card body, and
   the browser's own "Browse... No file selected" appears in the middle of the page. It did, in
   two places. So the hiding is carried by the element itself here rather than by where it
   happens to sit.

   `DropZone` is the other half. The scan page's prompt bar says "Drop a receipt here" and the
   attachments card offers to take one; a control that says drop and only answers a click is
   the same defect as a button with no handler, one sense down. dragover has to be cancelled
   for a drop to fire at all -- without `preventDefault` the browser navigates to the file
   instead, which is the failure mode that looks like nothing happening. */

/* Opening the picker, in the best way the browser offers.

   `<input type="file">` cannot hide "All files (*.*)": the accept attribute becomes the
   dialog's default filter, and Chromium then appends an all-files entry that no web API
   removes. showOpenFilePicker takes `excludeAcceptAllOption`, which is the one way to leave it
   out -- so where it exists (Chromium desktop, secure context) the dialog opens with only the
   named filter, and everywhere else the input opens exactly as it always has.

   Called straight from the click handler, never after an await: the picker needs the user
   gesture it was opened with, and a gesture does not survive a turn of the event loop. It
   throws AbortError when the reader cancels -- an outcome, not a failure -- and SecurityError
   where the page is not allowed to ask, which is the case that has to fall back rather than
   report anything. */
const canPick = spec => Boolean(spec) && typeof window.showOpenFilePicker === 'function'

async function pickWithFileSystemAccess(spec, multiple) {
	try {
		const handles = await window.showOpenFilePicker({
			multiple: Boolean(multiple),
			excludeAcceptAllOption: true,
			types: [{ description: spec.description, accept: spec.accept }]
		})
		return await Promise.all(handles.map(handle => handle.getFile()))
	} catch (e) {
		// The reader closed the dialog: nothing was chosen, and nothing else should open.
		if (e?.name === 'AbortError') return []
		return null
	}
}

/** A file input that is hidden wherever it is put, and opened by something else.

    The ref it hands back is not the input: it is a `click()` that opens the best picker
    available, so every existing caller keeps calling `ref.current.click()` and gets the
    filtered dialog wherever the browser can draw one. */
export const HiddenFileInput = forwardRef(function HiddenFileInput({ onFiles, multiple, kind, accept, label }, ref) {
	const input = useRef(null)
	// A page can hold several of these at once -- one per line photo -- so the id has to be
	// per instance, not a name shared by every hidden input on the page.
	const id = useId()

	useImperativeHandle(ref, () => ({
		click() {
			// Asked synchronously, so the gesture is still the reader's when the picker opens.
			if (!canPick(kind)) { input.current?.click(); return }
			pickWithFileSystemAccess(kind, multiple).then(files => {
				// null means the API is unavailable or refused the ask -- open the plain input
				// instead. An empty list means the reader cancelled, and nothing should reopen.
				if (files === null) input.current?.click()
				else if (files.length) onFiles(files)
			})
		}
	}), [kind, multiple, onFiles])

	return (
		<input ref={input} type="file" id={id} multiple={multiple} accept={accept ?? (kind && acceptAttribute(kind))}
			className="field-file-input" tabIndex={-1} aria-hidden="true"
			aria-label={label}
			onChange={e => {
				const files = [...(e.target.files ?? [])]
				// The value is cleared so choosing the same file twice still fires a change.
				e.target.value = ''
				if (files.length) onFiles(files)
			}} />
	)
}
)

/**
 * A dashed area that takes a drop, and a link that opens the picker for anyone not dragging.
 * `.empty-state` is the system's existing dashed block, so this invents no new box.
 */
export function DropZone({ onFiles, multiple = true, kind, accept, label, hint, action = 'CHOOSE FILES', icon = 'upload' }) {
	const input = useRef(null)
	const [over, setOver] = useState(false)

	const take = list => {
		const files = [...(list ?? [])]
		if (files.length) onFiles(files)
	}

	return (
		<div className={over ? 'empty-state is-dragover' : 'empty-state'}
			onDragOver={e => { e.preventDefault(); setOver(true) }}
			onDragEnter={e => { e.preventDefault(); setOver(true) }}
			onDragLeave={() => setOver(false)}
			onDrop={e => { e.preventDefault(); setOver(false); take(e.dataTransfer?.files) }}>
			<span className="empty-state-icon"><Icon name={icon} /></span>
			<p>{hint}</p>
			<ButtonLink onClick={() => input.current?.click()}>{action}</ButtonLink>
			<HiddenFileInput ref={input} onFiles={onFiles} multiple={multiple} kind={kind} accept={accept} label={label} />
		</div>
	)
}
