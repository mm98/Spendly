import { useEffect, useRef, useState } from 'react'
import { join, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'
import { Spinner } from './Utilities.jsx'

/** What a photo place takes, and what an attachment place takes: a photo, or a PDF besides. */
export const PHOTO_TYPES = 'image/jpeg,image/png,image/webp,image/gif'
export const FILE_TYPES = 'application/pdf,' + PHOTO_TYPES
/** The largest file the server keeps, in MB. */
export const MAX_FILE_MB = 25

// a file whose type the browser does not report is read by its ending
const ENDINGS = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }

const typesOf = file => {
	const ending = String(file?.name ?? '').includes('.') ? file.name.split('.').pop().toLowerCase() : ''
	return { ending, types: [file?.type?.toLowerCase(), ENDINGS[ending]].filter(Boolean) }
}

const ascii = text => [...text].map(c => c.charCodeAt(0))
// the first bytes of each type taken here, read again by the server (api/src/lib/fileType.js): [offset, bytes] pairs that all match
const SIGNATURES = [
	[[0, ascii('%PDF')]],
	[[0, [0xff, 0xd8, 0xff]]],
	[[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]],
	[[0, ascii('GIF8')]],
	[[0, ascii('RIFF')], [8, ascii('WEBP')]],
	...['avif', 'avis'].map(brand => [[4, ascii('ftyp')], [8, ascii(brand)]]),
	[[0, [0x49, 0x49, 0x2a, 0x00]]],
	[[0, [0x4d, 0x4d, 0x00, 0x2a]]],
	[[0, ascii('BM')]]
]

/** `fileProblem`, and then an image or a PDF must also start with its own first bytes (17a step 1),
    so a renamed file is refused before it is sent. */
export async function sniffedProblem(file, accept = FILE_TYPES, maxMb = MAX_FILE_MB) {
	const problem = fileProblem(file, accept, maxMb)
	if (problem || !typesOf(file).types.some(t => FILE_TYPES.split(',').includes(t))) return problem
	let head
	try { head = new Uint8Array(await file.slice(0, 12).arrayBuffer()) } catch { return null }
	return SIGNATURES.some(parts => parts.every(([at, bytes]) => bytes.every((byte, i) => head[at + i] === byte)))
		? null : 'Not a supported type'
}

/** Why a file cannot be taken where `accept` (the input's own list) names what can, in the words its
    tile shows (17b): "Not a supported type" or "Too large". Null when it can be taken. */
export function fileProblem(file, accept = FILE_TYPES, maxMb = MAX_FILE_MB) {
	const { ending, types } = typesOf(file)
	const fits = String(accept).split(',').map(a => a.trim().toLowerCase()).filter(Boolean).some(a =>
		a.startsWith('.') ? a === '.' + ending : a.endsWith('/*') ? types.some(t => t.startsWith(a.slice(0, -1))) : types.includes(a))
	if (!fits) return 'Not a supported type'
	if (file.size > maxMb * 1024 * 1024) return 'Too large'
	return null
}

/** `action` is the button-shaped words inside the zone (3a); `grow` takes the room left in its row (10a);
    `row` lays the zone on its side, the mark at the left and its lines beside it (c4).
    `onFiles(files, problems)`: each file chosen or dropped, and why it cannot be taken (`sniffedProblem`) or null.
    `disabled` draws the zone muted with no file input (20b); its children say why. */
export function FileDrop({ icon, children, accept, multiple = false, maxMb = MAX_FILE_MB, onFiles, action, grow = false, row = false, disabled = false, id, ...rest }) {
	reject(rest, 'FileDrop')
	const field = useRef(null)
	const take = async list => {
		const files = [...(list ?? [])].slice(0, multiple ? undefined : 1)
		if (files.length) onFiles?.(files, await Promise.all(files.map(file => sniffedProblem(file, accept ?? FILE_TYPES, maxMb))))
	}
	usePastePlace(field, file => take([file]))
	if (disabled) return (
		<div className={join('sp-filedrop', row && 'sp-filedrop--row', grow && 'sp-grow', 'sp-muted')} aria-disabled="true" {...rest}>
			{icon ? <Icon name={icon} /> : null}
			{children}
		</div>
	)
	const dropping = onFiles
		? {
			onDragOver: ev => ev.preventDefault(),
			onDrop: ev => { ev.preventDefault(); take(ev.dataTransfer?.files) }
		}
		: {}
	return (
		<label className={join('sp-filedrop', row && 'sp-filedrop--row', grow && 'sp-grow')} {...dropping} {...rest}>
			{icon ? <Icon name={icon} /> : null}
			{children}
			{action ? <span className="sp-btn sp-btn--small">{action}</span> : null}
			<input
				ref={field}
				id={id}
				type="file"
				name="file"
				accept={accept}
				multiple={multiple}
				onChange={ev => { take(ev.target.files); ev.target.value = '' }}
			/>
		</label>
	)
}

/* A picture pasted anywhere goes to the place on screen that takes pictures (17a), so no page has to
   ask for it: the newest place shown wins, inside an open window when there is one. */
const places = []
function usePastePlace(input, take) {
	const latest = useRef(take)
	latest.current = take
	useEffect(() => {
		const place = { input, take: file => latest.current(file) }
		places.push(place)
		return () => { places.splice(places.indexOf(place), 1) }
	}, [input])
}
const shown = el => Boolean(el?.isConnected && el.getClientRects().length)
// a file field is hidden behind its frame or its button, so what is seen is what holds it
const holderOf = input => input.labels?.[0] ?? input.closest('label') ?? input.parentElement

/** The page's one paste listener (AppShell). A place built from these components takes the picture
    itself; any other file field shown is handed it as if it had been chosen. */
export function pasteAnywhere(ev) {
	if (ev.defaultPrevented) return
	const file = [...(ev.clipboardData?.files ?? [])].find(f => f.type.startsWith('image/'))
	if (!file) return
	const open = [...document.querySelectorAll('[aria-modal="true"]')].filter(shown).at(-1)
	const takes = input => Boolean(input && !input.disabled && shown(holderOf(input)) && (!open || open.contains(input))
		&& fileProblem(file, input.accept || FILE_TYPES, Infinity) !== 'Not a supported type')
	const place = places.findLast(p => takes(p.input.current))
	if (place) { ev.preventDefault(); return place.take(file) }
	const input = [...(open ?? document).querySelectorAll('input[type="file"]')].find(takes)
	if (!input) return
	ev.preventDefault()
	const chosen = new DataTransfer()
	chosen.items.add(file)
	input.files = chosen.files
	input.dispatchEvent(new Event('change', { bubbles: true }))
}

/** The file slot (c17): a refused file, or a page's `problem`, shows its reason with a Remove, or a
    Retry when `onRetry` is given (17b); `busy` draws the spinner over the picture while it is sent (17a).
    `inspect(file)` answers the reason a file is refused, or null, in place of the type and size check. */
export function Slot({ id, src, size = 'large', kind = 'Photo', word = 'Add', name = 'the image', start = false, accept = PHOTO_TYPES, inspect, problem, busy = false, onFile, onRemove, onRetry, lead, trail, unit, 'aria-describedby': describedBy, ...rest }) {
	reject(rest, 'Slot')
	const [refused, setRefused] = useState(null)
	const field = useRef(null)
	const take = async file => {
		if (!file) return
		const own = inspect ? await inspect(file) : await sniffedProblem(file, accept)
		setRefused(own ? { name: file.name, problem: own } : null)
		if (!own) onFile?.(file)
	}
	usePastePlace(field, take)
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
				<input ref={field} id={id} type="file" accept={accept} aria-describedby={describedBy}
					onChange={ev => { take(ev.target.files?.[0]); ev.target.value = '' }} />
			</Mark>
			{refused
				? <button type="button" className="sp-slot__remove" aria-label={`Remove ${refused.name}`} onClick={() => setRefused(null)}>Remove</button>
				: problem && onRetry ? <button type="button" className="sp-slot__remove" aria-label={`Send ${name} again`} onClick={onRetry}>Retry</button>
					: src || problem ? <button type="button" className="sp-slot__remove" onClick={onRemove}>Remove</button> : <span className="sp-meta">{word}</span>}
		</span>
	)
}
