import { useState } from 'react'
import { join, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'
import { Spinner } from './Utilities.jsx'

/** What a photo place takes, and what an attachment place takes: a photo, or a PDF besides. */
export const PHOTO_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif'
export const FILE_TYPES = 'application/pdf,' + PHOTO_TYPES
/** The largest file the server keeps, in MB. */
export const MAX_FILE_MB = 25

// a file whose type the browser does not report is read by its ending
const ENDINGS = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', gif: 'image/gif' }

/** Why a file cannot be taken where `accept` (the input's own list) names what can, in the words its
    tile shows (17b): "Not a supported type" or "Too large". Null when it can be taken. */
export function fileProblem(file, accept = FILE_TYPES, maxMb = MAX_FILE_MB) {
	const ending = String(file?.name ?? '').includes('.') ? file.name.split('.').pop().toLowerCase() : ''
	const types = [file?.type?.toLowerCase(), ENDINGS[ending]].filter(Boolean)
	const fits = String(accept).split(',').map(a => a.trim().toLowerCase()).filter(Boolean).some(a =>
		a.startsWith('.') ? a === '.' + ending : a.endsWith('/*') ? types.some(t => t.startsWith(a.slice(0, -1))) : types.includes(a))
	if (!fits) return 'Not a supported type'
	if (file.size > maxMb * 1024 * 1024) return 'Too large'
	return null
}

/** `action` is the button-shaped words inside the zone (3a); `grow` takes the room left in its row (10a).
    `onFiles(files, problems)`: each file chosen or dropped, and why it cannot be taken (`fileProblem`) or null. */
export function FileDrop({ icon, children, accept, multiple = false, maxMb = MAX_FILE_MB, onFiles, action, grow = false, id, ...rest }) {
	reject(rest, 'FileDrop')
	const take = list => {
		const files = [...(list ?? [])].slice(0, multiple ? undefined : 1)
		if (files.length) onFiles?.(files, files.map(file => fileProblem(file, accept ?? FILE_TYPES, maxMb)))
	}
	const dropping = onFiles
		? {
			onDragOver: ev => ev.preventDefault(),
			onDrop: ev => { ev.preventDefault(); take(ev.dataTransfer?.files) }
		}
		: {}
	return (
		<label className={join('sp-filedrop', grow && 'sp-grow')} {...dropping} {...rest}>
			{icon ? <Icon name={icon} /> : null}
			{children}
			{action ? <span className="sp-btn sp-btn--small">{action}</span> : null}
			<input
				id={id}
				type="file"
				accept={accept}
				multiple={multiple}
				onChange={ev => { take(ev.target.files); ev.target.value = '' }}
			/>
		</label>
	)
}

/** The file slot (c17): a refused file, or a page's `problem`, shows its reason with a Remove, or a
    Retry when `onRetry` is given (17b); `busy` draws the spinner over the picture while it is sent (17a). */
export function Slot({ id, src, size = 'large', kind = 'Photo', word = 'Add', name = 'the image', start = false, accept = PHOTO_TYPES, problem, busy = false, onFile, onRemove, onRetry, lead, trail, unit, 'aria-describedby': describedBy, ...rest }) {
	reject(rest, 'Slot')
	const [refused, setRefused] = useState(null)
	const take = file => {
		if (!file) return
		const own = fileProblem(file, accept)
		setRefused(own ? { name: file.name, problem: own } : null)
		if (!own) onFile?.(file)
	}
	const failed = refused?.problem ?? problem
	const what = src ? `Replace ${name}` : `Add ${name}`
	return (
		<span
			className={join('sp-slot', start && 'sp-slot--start')}
			onPaste={ev => {
				const file = [...(ev.clipboardData?.files ?? [])][0]
				if (file) { ev.preventDefault(); take(file) }
			}}
			{...rest}
		>
			<Mark
				as="label"
				size={size}
				fill={src ? 'photo' : 'empty'}
				goods={Boolean(src)}
				text={src && !failed && !busy ? kind : undefined}
				danger={failed || undefined}
				htmlFor={id}
				aria-label={failed ? `${refused ? refused.name + ': ' : ''}${failed}. ${what}` : busy ? `${what}, still sending` : what}
				data-tip={what}
				onDragOver={ev => ev.preventDefault()}
				onDrop={ev => { ev.preventDefault(); take(ev.dataTransfer?.files?.[0]) }}
			>
				{src ? <img src={src} alt="" /> : <Icon name="camera" size={26} />}
				{src && busy ? <Spinner /> : null}
				<input id={id} type="file" accept={accept} aria-describedby={describedBy}
					onChange={ev => { take(ev.target.files?.[0]); ev.target.value = '' }} />
			</Mark>
			{refused
				? <button type="button" className="sp-slot__remove" aria-label={`Remove ${refused.name}`} onClick={() => setRefused(null)}>Remove</button>
				: problem && onRetry ? <button type="button" className="sp-slot__remove" aria-label={`Send ${name} again`} onClick={onRetry}>Retry</button>
					: src || problem ? <button type="button" className="sp-slot__remove" onClick={onRemove}>Remove</button> : <span className="sp-meta">{word}</span>}
		</span>
	)
}
