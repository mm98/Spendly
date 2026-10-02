import { useEffect, useState } from 'react'
import { join, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'

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

/** Splits what arrived into the files a place takes and the ones it refuses, each with its reason. */
export function sortFiles(list, accept, maxMb) {
	const taken = []
	const refused = []
	for (const file of list ?? []) {
		const problem = fileProblem(file, accept, maxMb)
		if (problem) refused.push({ file, problem })
		else taken.push(file)
	}
	return { taken, refused }
}

/** `action` is the button-shaped words inside the zone (3a): a span, since the zone is the label that
    opens the picker. `onFiles(taken, refused)` gets what was chosen or dropped, checked against
    `accept` and `maxMb`; `grow` takes the room left in its row (10a). */
export function FileDrop({ icon, children, accept, multiple = false, maxMb = MAX_FILE_MB, onFiles, action, grow = false, id, ...rest }) {
	reject(rest, 'FileDrop')
	const take = list => {
		const files = [...(list ?? [])].slice(0, multiple ? undefined : 1)
		if (!files.length) return
		const { taken, refused } = sortFiles(files, accept ?? FILE_TYPES, maxMb)
		onFiles?.(taken, refused)
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

/** The file slot (c17): the frame is the control, empty or filled; choosing, dropping or pasting
    a picture replaces what is there. A file it cannot take keeps the frame with the reason and a
    Remove (17b), and nothing reaches `onFile`. `start` is a slot that is a field of its own. */
export function Slot({ id, src, size = 'large', kind = 'Photo', word = 'Add', name = 'the image', start = false, accept = PHOTO_TYPES, onFile, onRemove, lead, trail, unit, 'aria-describedby': describedBy, ...rest }) {
	reject(rest, 'Slot')
	const [refused, setRefused] = useState(null)
	const take = file => {
		if (!file) return
		const problem = fileProblem(file, accept)
		// a picture too large to keep still shows itself, so the reader sees which one it was
		const shows = problem === 'Too large' && /^image\//.test(file.type)
		setRefused(problem ? { name: file.name, problem, src: shows ? URL.createObjectURL(file) : null } : null)
		if (!problem) onFile?.(file)
	}
	useEffect(() => () => { if (refused?.src) URL.revokeObjectURL(refused.src) }, [refused])
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
				fill={refused ? (refused.src ? 'photo' : 'none') : src ? 'photo' : 'empty'}
				text={src && !refused ? kind : undefined}
				danger={refused?.problem}
				htmlFor={id}
				aria-label={refused ? `${refused.name}: ${refused.problem}. ${what}` : what}
				data-tip={what}
				onDragOver={ev => ev.preventDefault()}
				onDrop={ev => { ev.preventDefault(); take(ev.dataTransfer?.files?.[0]) }}
			>
				{refused ? (refused.src ? <img src={refused.src} alt="" /> : null) : src ? <img src={src} alt="" /> : <Icon name="camera" size={26} />}
				<input id={id} type="file" accept={accept} aria-describedby={describedBy}
					onChange={ev => { take(ev.target.files?.[0]); ev.target.value = '' }} />
			</Mark>
			{refused
				? <button type="button" className="sp-slot__remove" aria-label={`Remove ${refused.name}`} onClick={() => setRefused(null)}>Remove</button>
				: src ? <button type="button" className="sp-slot__remove" onClick={onRemove}>Remove</button> : <span className="sp-meta">{word}</span>}
		</span>
	)
}
