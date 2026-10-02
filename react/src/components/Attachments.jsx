import { Children, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './Button.jsx'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'
import { Scrim } from './Shell.jsx'
import { reject } from './variants.js'

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
				<Icon name="chevron-left" />
			</button>
			<div className="sp-strip" ref={box} onScroll={measure}>{children}</div>
			<button type="button" className="sp-strip-nav" data-strip="next" aria-label="Show later attachments" disabled={ends.end} onClick={() => by(1)}>
				<Icon name="chevron-right" />
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

/** The tile the strip always ends with: a label over a file input, so it needs no script. */
export function AttachmentAdd({ accept = 'application/pdf,image/*', multiple = true, onFiles, ...rest }) {
	reject(rest, 'AttachmentAdd')
	return (
		<Mark as="label" size="xlarge" fill="add" aria-label="Add attachment" data-tip="Add attachment" {...rest}>
			<Icon name="plus" size={18} />
			<input
				type="file"
				accept={accept}
				multiple={multiple}
				aria-label="Add attachment"
				onChange={ev => { const files = [...ev.target.files]; ev.target.value = ''; if (files.length) onFiles?.(files) }}
			/>
		</Mark>
	)
}

/** One file at full size over the page, with the set it belongs to (12b). `items` are
    `{ name, src, download }`: `src` is what the stage shows, `download` the file as stored. */
export function Viewer({ items = [], at = 0, onMove, onClose, ...rest }) {
	reject(rest, 'Viewer')
	const box = useRef(null)
	const shown = items[at]
	const step = useCallback(by => {
		if (items.length < 2) return
		onMove?.((at + by + items.length) % items.length)
	}, [at, items.length, onMove])
	useEffect(() => {
		const back = document.activeElement
		box.current?.querySelector('.sp-viewer__bar > :last-child')?.focus()
		return () => back?.focus?.()
	}, [])
	if (!shown) return null
	const keys = ev => {
		if (ev.key === 'Escape') { ev.stopPropagation(); onClose?.() }
		else if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(-1) }
		else if (ev.key === 'ArrowRight') { ev.preventDefault(); step(1) }
	}
	return createPortal(
		<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) onClose?.() }}>
			<div className="sp-viewer" role="dialog" aria-modal="true" aria-label={shown.name} tabIndex={-1} ref={box} onKeyDown={keys}>
				<div className="sp-viewer__stage">{shown.src ? <img src={shown.src} alt={shown.name} /> : null}</div>
				<div className="sp-viewer__bar">
					<IconButton icon="chevron-left" aria-label="Previous" disabled={items.length < 2} onClick={() => step(-1)} />
					<span className="sp-viewer__count">{at + 1} of {items.length}</span>
					<IconButton icon="chevron-right" aria-label="Next" disabled={items.length < 2} onClick={() => step(1)} />
					<span className="sp-grow" />
					{shown.download ? <IconButton icon="download" aria-label="Download" href={shown.download} download={shown.name} /> : null}
					<IconButton icon="x" aria-label="Close" onClick={onClose} />
				</div>
			</div>
		</Scrim>,
		document.body
	)
}
