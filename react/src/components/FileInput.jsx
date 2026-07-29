import { forwardRef, useRef, useState } from 'react'
import { Icon } from './Icon.jsx'
import { ButtonLink } from './Button.jsx'

/* Choosing files, and dropping them.

   The stylesheet hides a file input with `.field-shell > .field-file-input` -- note the child
   combinator. That rule is right where the prototype uses it, inside the field shell, and it
   silently does nothing anywhere else: put the input one level deeper, or in a card body, and
   the browser's own "Browse… No file selected" appears in the middle of the page. It did, in
   two places. So the hiding is carried by the element itself here rather than by where it
   happens to sit.

   `DropZone` is the other half. The scan page's prompt bar says "Drop a receipt here" and the
   attachments card offers to take one; a control that says drop and only answers a click is
   the same defect as a button with no handler, one sense down. dragover has to be cancelled
   for a drop to fire at all -- without `preventDefault` the browser navigates to the file
   instead, which is the failure mode that looks like nothing happening. */

const HIDDEN = {
	position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none',
	overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap'
}

/** A file input that is hidden wherever it is put, and opened by something else. */
export const HiddenFileInput = forwardRef(function HiddenFileInput({ onFiles, multiple, accept, label }, ref) {
	return (
		<input ref={ref} type="file" multiple={multiple} accept={accept}
			className="field-file-input" style={HIDDEN} tabIndex={-1} aria-hidden="true"
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
export function DropZone({ onFiles, multiple = true, accept, label, hint, action = 'CHOOSE FILES', icon = 'upload' }) {
	const input = useRef(null)
	const [over, setOver] = useState(false)

	const take = list => {
		const files = [...(list ?? [])]
		if (files.length) onFiles(files)
	}

	return (
		<div className="empty-state"
			style={over ? { outline: '2px dashed var(--green)', outlineOffset: 2, borderRadius: 14 } : undefined}
			onDragOver={e => { e.preventDefault(); setOver(true) }}
			onDragEnter={e => { e.preventDefault(); setOver(true) }}
			onDragLeave={() => setOver(false)}
			onDrop={e => { e.preventDefault(); setOver(false); take(e.dataTransfer?.files) }}>
			<span className="empty-state-icon"><Icon name={icon} /></span>
			<p>{hint}</p>
			<ButtonLink onClick={() => input.current?.click()}>{action}</ButtonLink>
			<HiddenFileInput ref={input} onFiles={onFiles} multiple={multiple} accept={accept} label={label} />
		</div>
	)
}

/** Turns a File into the record the phantom API stores: what it is, and how big. */
export const describeFile = file => ({
	name: file.name,
	size: file.size ?? 0,
	kind: /\.pdf$/i.test(file.name) ? 'pdf' : 'image'
})
