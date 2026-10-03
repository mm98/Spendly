import { Children, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './Button.jsx'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'
import { Scrim } from './Shell.jsx'
import { reject } from './variants.js'
import { useFocusTrap } from './Utilities.jsx'
import { FILE_TYPES, fileProblem } from './FileDrop.jsx'

/** The attachment strip (c16): tiles in one row that scrolls sideways under two chevrons. A
    chevron is disabled, and so hidden, when there is nothing further that way. */
export function Strip({ children, ...rest }) {
	reject(rest, 'Strip')
	const box = useRef(null)
	const [ends, setEnds] = useState({ start: true, end: true })
	const tiles = Children.count(children)
	const measure = useCallback(() => {
		const el = box.current
		if (!el) return
		setEnds({ start: el.scrollLeft <= 0, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 })
	}, [])
	useEffect(() => {
		const el = box.current
		if (!el) return
		measure()
		const watch = new ResizeObserver(measure)
		watch.observe(el)
		for (const tile of el.children) watch.observe(tile)
		return () => watch.disconnect()
	}, [measure, tiles])
	const by = way => box.current?.scrollBy({ left: way * box.current.clientWidth * 0.9, behavior: 'smooth' })
	return (
		<div className="sp-strip-wrap" {...rest}>
			<button type="button" className="sp-strip-nav" data-strip="prev" aria-label="Show earlier attachments" disabled={ends.start} onClick={() => by(-1)}>
				<Icon name="chevron-left" size={14} />
			</button>
			<div className="sp-strip" ref={box} onScroll={measure}>{children}</div>
			<button type="button" className="sp-strip-nav" data-strip="next" aria-label="Show later attachments" disabled={ends.end} onClick={() => by(1)}>
				<Icon name="chevron-right" size={14} />
			</button>
		</div>
	)
}

/** One tile in the strip: its mark, then the file's name beneath it. */
export function Attachment({ name, children, ...rest }) {
	reject(rest, 'Attachment')
	return (
		<span className="sp-attachment" {...rest}>
			{children}
			<span className="sp-attachment__name">{name}</span>
		</span>
	)
}

/** The tile the strip ends with, a label over a file input. `onFiles(files, problems)`: each file chosen
    or dropped, and why it cannot be kept (`fileProblem`) or null, so its tile can say so (17b). */
export function AttachmentAdd({ accept = FILE_TYPES, multiple = true, onFiles, ...rest }) {
	reject(rest, 'AttachmentAdd')
	const take = list => {
		const files = [...(list ?? [])].slice(0, multiple ? undefined : 1)
		if (files.length) onFiles?.(files, files.map(file => fileProblem(file, accept)))
	}
	return (
		<Mark as="label" size="xlarge" fill="add" aria-label="Add attachment" data-tip="Add attachment"
			onDragOver={ev => ev.preventDefault()} onDrop={ev => { ev.preventDefault(); take(ev.dataTransfer?.files) }} {...rest}>
			<Icon name="plus" size={18} />
			<input
				type="file"
				accept={accept}
				multiple={multiple}
				aria-label="Add attachment"
				onChange={ev => { const files = [...ev.target.files]; ev.target.value = ''; take(files) }}
			/>
		</Mark>
	)
}

// what a file is, as its tile names it when there is no picture of it
const kindOf = item => (item.kind === 'pdf' ? 'PDF' : String(item.name).includes('.') ? String(item.name).split('.').pop().toUpperCase().slice(0, 4) : 'File')

/** How many pages a viewer item has: its own `pages`, else what `countPages()` answers. */
function usePages(item) {
	const [counted, setCounted] = useState(null)
	useEffect(() => {
		setCounted(null)
		if (item?.pages != null || !item?.countPages) return
		let live = true
		item.countPages().then(n => { if (live) setCounted(n) }).catch(() => {})
		return () => { live = false }
	}, [item?.key, item?.name])
	return item?.pages ?? counted ?? 1
}

/** One file on a stage, with the page rail when it has more than one page (17d: page thumbnail). */
function ViewerFile({ item, label }) {
	const pages = usePages(item)
	const [page, setPage] = useState(0)
	useEffect(() => setPage(0), [item?.key, item?.name])
	const many = pages > 1 && item.pageSrc
	const src = many ? item.pageSrc(page) : item.src
	const stage = (
		<div className="sp-viewer__stage">
			{src
				? <img src={src} alt={many ? `${item.name}, page ${page + 1} of ${pages}` : item.name} />
				: <Mark size="xlarge" fill="none" aria-label={item.name}><span>{kindOf(item)}</span></Mark>}
		</div>
	)
	const body = many
		? (
			<div className="sp-viewer__paged">
				<div className="sp-viewer__pages" role="group" aria-label={`Pages of ${item.name}`}>
					{Array.from({ length: pages }, (_, i) => (
						<Mark key={i} size="xlarge" fill="photo" text={String(i + 1)} aria-label={`Page ${i + 1}`}
							aria-current={i === page ? 'true' : undefined} onClick={() => setPage(i)}>
							<img src={item.pageSrc(i)} alt="" loading="lazy" />
						</Mark>
					))}
				</div>
				{stage}
			</div>
		)
		: stage
	if (!label) return body
	return <div className="sp-viewer__side"><span className="sp-viewer__label">{label}</span>{body}</div>
}

/** One file at full size over the page, with its set (12b). `items` are `{ name, src, download, kind }`:
    `src` is what the stage shows, else the tile naming its kind; `download` the file as stored. A
    file with pages adds `pageSrc(i)` and `pages`, or `countPages()` when its count is not known.
    `beside` is a second file shown next to the first, to compare the two (3c); each then wears
    its `label`. */
export function Viewer({ items = [], at = 0, beside, onMove, onClose, ...rest }) {
	reject(rest, 'Viewer')
	const box = useRef(null)
	const shown = items[at]
	const step = useCallback(by => {
		if (items.length < 2) return
		onMove?.((at + by + items.length) % items.length)
	}, [at, items.length, onMove])
	useFocusTrap(box, true, '.sp-viewer__bar > :last-child')
	// the viewer is modal, so its keys are the page's while it is open, wherever focus is
	useEffect(() => {
		const keys = ev => {
			if (ev.key === 'Escape') { ev.stopPropagation(); onClose?.() }
			else if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(-1) }
			else if (ev.key === 'ArrowRight') { ev.preventDefault(); step(1) }
		}
		document.addEventListener('keydown', keys)
		return () => document.removeEventListener('keydown', keys)
	}, [step, onClose])
	if (!shown) return null
	return createPortal(
		<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) onClose?.() }}>
			<div className={beside ? 'sp-viewer sp-viewer--compare' : 'sp-viewer'} role="dialog" aria-modal="true"
				aria-label={beside ? `${shown.name} beside ${beside.name}` : shown.name} tabIndex={-1} ref={box}>
				{beside
					? <div className="sp-viewer__compare"><ViewerFile item={shown} label={shown.label} /><ViewerFile item={beside} label={beside.label} /></div>
					: <ViewerFile item={shown} />}
				<div className="sp-viewer__bar">
					<IconButton icon="chevron-left" aria-label="Previous" disabled={items.length < 2} onClick={() => step(-1)} />
					<span className="sp-viewer__count">{at + 1} of {items.length}</span>
					<IconButton icon="chevron-right" aria-label="Next" disabled={items.length < 2} onClick={() => step(1)} />
					<span className="sp-grow" />
					{shown.download ? <IconButton icon="download" aria-label={`Download ${shown.name}`} href={shown.download} download={shown.name} /> : null}
					<IconButton icon="x" aria-label="Close" onClick={onClose} />
				</div>
			</div>
		</Scrim>,
		document.body
	)
}
