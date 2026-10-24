import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './Button.jsx'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'
import { Scrim } from './Shell.jsx'
import { reject } from './variants.js'
import { useFocusTrap } from './Utilities.jsx'
import { FILE_TYPES, sniffedProblem } from './FileDrop.jsx'

/** The attachment strip (c16): tiles in one row that scrolls sideways under two chevrons. A
    chevron is disabled, and so hidden, when there is nothing further that way.
    @param {object} props
    @param {import('react').ReactNode} [props.children] The attachments, and an AttachmentAdd at the end. */
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

/** One tile in the strip: its mark, then the file's name beneath it.
    @param {object} props
    @param {string} props.name
    @param {import('react').ReactNode} [props.children] The picture or icon of the file, usually a Mark. */
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
    or dropped, and why it cannot be kept (`sniffedProblem`) or null, so its tile can say so (17b).
    @param {object} props
    @param {string} [props.accept] The file types that may be chosen.
    @param {boolean} [props.multiple] Several files can be chosen at once.
    @param {(files: File[], problems: (string | null)[]) => void} [props.onFiles] */
export function AttachmentAdd({ accept = FILE_TYPES, multiple = true, onFiles, ...rest }) {
	reject(rest, 'AttachmentAdd')
	const take = async list => {
		const files = [...(list ?? [])].slice(0, multiple ? undefined : 1)
		if (files.length) onFiles?.(files, await Promise.all(files.map(file => sniffedProblem(file, accept))))
	}
	return (
		<Mark as="label" size="xlarge" fill="add" data-tip="Add attachment"
			onDragOver={ev => ev.preventDefault()} onDrop={ev => { ev.preventDefault(); take(ev.dataTransfer?.files) }} {...rest}>
			<Icon name="plus" size={18} />
			<input
				type="file"
				name="attachment"
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

// how far a picture zooms: a tap or click goes to TAP_ZOOM at the point pressed, a pinch anywhere up to MAX_ZOOM
const TAP_ZOOM = 2.5
const MAX_ZOOM = 4
// a press that moves less than this is a tap; a sideways swipe past SWIPE_PX moves to the next file
const TAP_SLOP_PX = 6
const SWIPE_PX = 48

/** A picture at full size that zooms (17d): a click or tap at a point, a pinch or Ctrl and the wheel; zoomed,
    it is dragged around. Unzoomed, a sideways swipe calls `onSwipe(1)` for the next file, -1 for the one before. */
function ZoomStage({ src, zoomSrc, alt, onSwipe }) {
	const stage = useRef(null)
	const img = useRef(null)
	const [scale, setScale] = useState(1)
	// zoomed in, an order's picture swaps to its full-size copy once that has arrived (17a)
	const [full, setFull] = useState(null)
	useEffect(() => {
		if (scale === 1 || !zoomSrc || full) return
		const loading = new Image()
		loading.onload = () => setFull(zoomSrc)
		loading.src = zoomSrc
		return () => { loading.onload = null }
	}, [scale, zoomSrc, full])
	// the picture's size and the stage's own at fit, which a zoomed stage keeps so the viewer does not grow
	const [fit, setFit] = useState(null)
	const anchor = useRef(null)
	const pointers = useRef(new Map())
	const gesture = useRef(null)
	const current = useRef(scale)
	current.current = scale

	const zoomTo = useCallback((next, x, y) => {
		const el = img.current
		const box = stage.current
		if (!el || !box) return
		const to = next < 1.02 ? 1 : Math.min(MAX_ZOOM, next)
		if (current.current === 1 && to > 1) setFit({ w: el.offsetWidth, h: el.offsetHeight, frameW: box.offsetWidth, frameH: box.offsetHeight })
		const r = el.getBoundingClientRect()
		anchor.current = { fx: (x - r.left) / r.width, fy: (y - r.top) / r.height, x, y }
		setScale(to)
	}, [])
	// the point that was pressed stays under the finger or pointer as the picture grows
	useLayoutEffect(() => {
		const at = anchor.current
		anchor.current = null
		const el = img.current
		const box = stage.current
		if (!at || !el || !box || scale === 1) return
		const r = el.getBoundingClientRect()
		box.scrollLeft += r.left + at.fx * r.width - at.x
		box.scrollTop += r.top + at.fy * r.height - at.y
	}, [scale])
	useEffect(() => {
		const box = stage.current
		if (!box) return
		// Ctrl and the wheel is a trackpad's pinch too; the page must not zoom instead
		const wheel = ev => {
			if (!ev.ctrlKey) return
			ev.preventDefault()
			zoomTo(current.current * Math.exp(-ev.deltaY * 0.01), ev.clientX, ev.clientY)
		}
		box.addEventListener('wheel', wheel, { passive: false })
		return () => box.removeEventListener('wheel', wheel)
	}, [zoomTo])

	const spread = () => {
		const [a, b] = [...pointers.current.values()]
		return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
	}
	const events = {
		onPointerDown: ev => {
			if (ev.pointerType === 'mouse' && ev.button !== 0) return
			ev.currentTarget.setPointerCapture(ev.pointerId)
			pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
			const box = stage.current
			if (pointers.current.size === 2) gesture.current = { pinch: { ...spread(), scale: current.current }, moved: true }
			else if (pointers.current.size === 1) gesture.current = { x: ev.clientX, y: ev.clientY, left: box.scrollLeft, top: box.scrollTop, touch: ev.pointerType !== 'mouse', moved: false }
		},
		onPointerMove: ev => {
			const g = gesture.current
			if (!g || !pointers.current.has(ev.pointerId)) return
			pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
			if (g.pinch) {
				if (pointers.current.size < 2) return
				const now = spread()
				zoomTo(g.pinch.scale * now.d / g.pinch.d, now.x, now.y)
				return
			}
			const dx = ev.clientX - g.x
			const dy = ev.clientY - g.y
			if (!g.moved && Math.hypot(dx, dy) < TAP_SLOP_PX) return
			g.moved = true
			if (current.current > 1) {
				stage.current.scrollLeft = g.left - dx
				stage.current.scrollTop = g.top - dy
			} else if (g.touch && onSwipe && img.current) img.current.style.transform = `translateX(${dx}px)`
		},
		onPointerUp: ev => {
			const g = gesture.current
			pointers.current.delete(ev.pointerId)
			if (!g) return
			if (pointers.current.size) return
			gesture.current = null
			img.current?.style.removeProperty('transform')
			if (g.pinch) return
			// a press that did not move is a tap or a click: in at that point, or back out
			if (!g.moved) return zoomTo(current.current > 1 ? 1 : TAP_ZOOM, ev.clientX, ev.clientY)
			if (current.current > 1 || !g.touch || !onSwipe) return
			const dx = ev.clientX - g.x
			const dy = ev.clientY - g.y
			if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1)
		},
		onPointerCancel: ev => {
			pointers.current.delete(ev.pointerId)
			gesture.current = null
			img.current?.style.removeProperty('transform')
		}
	}
	const zoomed = scale > 1 && fit
	return (
		<div className={zoomed ? 'sp-viewer__stage sp-viewer__stage--zoomed' : 'sp-viewer__stage'} ref={stage}
			style={zoomed ? { width: fit.frameW, height: fit.frameH } : undefined} {...events}>
			<img ref={img} src={full ?? src} alt={alt} draggable={false}
				style={zoomed ? { width: fit.w * scale, height: fit.h * scale } : undefined} />
		</div>
	)
}

/** One file on a stage, with the page rail when it has more than one page (17d: page thumbnail). */
function ViewerFile({ item, onSwipe }) {
	const pages = usePages(item)
	const [page, setPage] = useState(0)
	useEffect(() => setPage(0), [item?.key, item?.name])
	const many = pages > 1 && item.pageSrc
	const src = many ? item.pageSrc(page) : item.src
	const stage = src
		? <ZoomStage key={src} src={src} zoomSrc={many ? undefined : item.zoomSrc} alt={many ? `${item.name}, page ${page + 1} of ${pages}` : item.name} onSwipe={onSwipe} />
		: (
			<div className="sp-viewer__stage">
				<Mark size="xlarge" fill="none" aria-label={item.name}><span>{kindOf(item)}</span></Mark>
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
	return body
}

/** @typedef {{ name: string, src: string, zoomSrc?: string, download: string, kind: string, pageSrc?: string, pages?: number, countPages?: () => Promise<number> }} ViewerItem */

/** One file at full size (12b); `items` are `{ name, src, zoomSrc?, download, kind, pageSrc?, pages?, countPages? }`.
    `beside` is a second file shown next to the first to compare them (3c).
    @param {object} props
    @param {ViewerItem[]} [props.items] The files to show, in order.
    @param {number} [props.at] which of the items is shown
    @param {ViewerItem} [props.beside] A second file shown next to the first, to compare them.
    @param {(at: number) => void} [props.onMove]
    @param {() => void} [props.onClose] */
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
	// on a phone the viewer is the whole screen
	const touch = document.body.classList.contains('sp-touch')
	return createPortal(
		<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) onClose?.() }}>
			<div className="sp-viewer" role="dialog" aria-modal="true"
				aria-label={beside ? `${shown.name} beside ${beside.name}` : shown.name} tabIndex={-1} ref={box}>
				{beside
					? <div className="sp-viewer__compare"><ViewerFile item={shown} /><ViewerFile item={beside} /></div>
					: <ViewerFile item={shown} onSwipe={items.length > 1 ? step : undefined} />}
				{/* on a phone the bar is the file's name, then Previous, Next, download and close (18b) */}
				<div className="sp-viewer__bar">
					{touch ? <span className="sp-viewer__count sp-truncate sp-grow">{shown.name}</span> : null}
					<IconButton icon="chevron-left" aria-label="Previous" disabled={items.length < 2} onClick={() => step(-1)} />
					{touch ? null : <span className="sp-viewer__count">{at + 1} of {items.length}</span>}
					<IconButton icon="chevron-right" aria-label="Next" disabled={items.length < 2} onClick={() => step(1)} />
					{touch ? null : <span className="sp-grow" />}
					{shown.download ? <IconButton icon="download" aria-label={`Download ${shown.name}`} href={shown.download} download={shown.name} /> : null}
					<IconButton icon="x" aria-label="Close" onClick={onClose} />
				</div>
			</div>
		</Scrim>,
		document.body
	)
}
