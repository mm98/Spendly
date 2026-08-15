import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { Icon, ImageOrIcon } from './Icon.jsx'
import { IconButton } from './Button.jsx'

/* The small visualisations that are drawn in CSS rather than in SVG: the donut, the gauge,
   the meter, the bar rows and the two progress indicators.

   One thing here is deliberately not a copy of the prototype. Its donut is a conic-gradient
   written into the stylesheet with the shares baked in -- 13%, 14%, 6%, 10%, 57% -- beside a
   list of categories that reads 38, 27, 13, 10, 12. Nothing rendered could fail: a ring has
   no opinion about the list beside it. Here the ring is built from the same records the list
   is, so the two cannot disagree; the stylesheet keeps its default for anything that does
   not pass segments. README: Buttons. */

/* The hairline between two segments, as a share of the circle: 0.6% is 2.16°, about 3px of arc
   on the 170px gauge and 2.5px on the 132px donut. One number for every ring in the app --
   the gauge carried 2% and the donut carried none at all, so the same split drawn on Home and
   on Statistics read as two different charts. 2% was 7.2°, which put 43 of the ring's 360
   degrees into white space and left the smallest category drawing less colour than the gap
   beside it.

   A gap is a separator between two segments, so with only one segment there is nothing to
   separate: the "gap after the last" would wrap around the circle and land between that
   segment and itself, which read as a category that is 100% of the spend somehow not filling
   its own ring. README: Charts. */
const RING_GAP = 0.6

/* A ring's legend is a list, and a list that grows with the account is a list that stops being
   a summary. Past this many the tail is folded into one segment rather than drawn as twenty
   slivers with twenty rows under them -- the full list is its own page, and the fold row says
   how many it is holding and links there.

   The folded segment's share is real: it is the sum of everything inside it, so the ring still
   adds up to the figure in its middle. That is the part a cap gets wrong when it simply drops
   the tail -- a ring of the top ten drawn around a total of all twenty is a circle that does
   not close. README: Charts. */
export const RING_LEGEND_MAX = 5

/* The fold's colour has to be one no entry in the ring is already using, or the segment
   standing for "everything else I did not draw" is the same colour as some real row -- which
   happened immediately: a category actually named "Everything else" is #45524C, and so was the
   fold, so the ring had two identical greys meaning different things. Neutral greys in order
   of preference; the first one not already on screen wins. */
const FOLD_COLOURS = ['#8A968D', '#5B6660', '#A7B0A8', '#6E7A72']

export function foldForRing(entries, foldLabel, max = RING_LEGEND_MAX) {
	const ranked = entries.filter(e => e.spend > 0).sort((a, b) => b.spend - a.spend)
	if (ranked.length <= max) return ranked
	const tail = ranked.slice(max)
	const head = ranked.slice(0, max)
	const taken = new Set(head.map(e => String(e.colour).toLowerCase()))
	const colour = FOLD_COLOURS.find(c => !taken.has(c.toLowerCase())) ?? FOLD_COLOURS.at(-1)
	return [...head, {
		id: null, name: foldLabel(tail.length), colour,
		spend: tail.reduce((sum, e) => sum + e.spend, 0)
	}]
}

const conic = (segments, gap = 0) => {
	let at = 0
	const total = segments.reduce((sum, s) => sum + s.share, 0) || 100
	const effectiveGap = segments.length > 1 ? gap : 0
	const stops = segments.flatMap(s => {
		const from = at
		const width = (s.share / total) * 100
		at += width
		/* The separator is carved out of the segment's own arc, so a gap set as a share of the
		   whole circle costs every segment the same number of degrees no matter how little it
		   owns. At the 2% this was, the smallest category on a real month drew 4.46° of colour
		   with a 7.2° gap beside it -- the separator was wider than the thing it separated, and
		   a category read as a sliver of a rounding error. Capped at a third of the arc it is
		   cut from, so a small share stays a share. README: Charts. */
		const own = Math.min(effectiveGap, width / 3)
		const to = Math.max(from, at - own)
		const parts = [`${s.colour} ${from.toFixed(2)}% ${to.toFixed(2)}%`]
		if (own) parts.push(`var(--bg-card) ${to.toFixed(2)}% ${at.toFixed(2)}%`)
		return parts
	})
	return `conic-gradient(${stops.join(', ')})`
}

/* The figure in the middle of a ring, shrunk to whatever the hole can actually hold.

   The hole is a circle, so the room a line of text has is not the hole's width -- it is the
   chord at that line's own height, and the value sits above centre with its label underneath.
   At the authored 16.5px the Categories ring gave the value 90px of chord and "237.538 kr."
   measured 91.2px, so the figure this app ships today already runs 1.1px past the white and
   over the segments; a million takes it 11.8px past, ten million 21.7px. Nothing clips it,
   because the hole is painted by a ::before that the text sits on top of -- so it does not
   overflow visibly the way a box would, it just quietly touches the ring.

   Measured rather than guessed at from the string's length: the hole is read off the ring's
   own ::before inset, the chord is computed at the box's furthest edge from centre, and the
   size is stepped down until it fits. That way a longer currency suffix, a different face or
   a ring of another size all stay correct without a second number to keep in step. */
const RingCentre = ({ value, label }) => {
	const ref = useRef(null)

	/* The size is written straight onto the node and is never React state. It was both for a
	   while, and that is a bug with a very quiet failure: the measuring pass has to clear the
	   inline size to read the stylesheet's own, which is a direct DOM write, and then setting
	   state to the value it already held made React bail out of re-rendering -- so nothing put
	   the cleared property back and the figure stayed at its authored size. It measured
	   correctly on every run and applied on none of them. One writer per property. */
	const fit = useCallback(() => {
		const el = ref.current
		if (!el) return
		const ring = el.parentElement?.parentElement
		if (!ring) return
		const box = ring.getBoundingClientRect()
		if (!box.width) return
		const inset = parseFloat(getComputedStyle(ring, '::before').inset) || 0
		const holeR = box.width / 2 - inset
		// Start from the stylesheet's own size every time, or a re-fit can only ever shrink.
		const base = parseFloat(getComputedStyle(el).fontSize)
		el.style.fontSize = ''
		const authored = parseFloat(getComputedStyle(el).fontSize) || base
		const cy = box.top + box.height / 2
		let next = authored
		// Shrinking moves the box, which changes the chord it has to fit inside, so the fit is
		// re-checked rather than solved once. Six steps covers 16.5px down to about 9px.
		for (let i = 0; i < 6; i++) {
			el.style.fontSize = next + 'px'
			const t = el.getBoundingClientRect()
			const dy = Math.max(Math.abs(t.top - cy), Math.abs(t.bottom - cy))
			const room = dy >= holeR ? 0 : Math.sqrt(holeR * holeR - dy * dy) * 2
			if (t.width <= room) break
			// No room at all means the line is taller than the hole, which is still a reason to
			// shrink -- breaking out of the loop there would give up in the one case that needs
			// this most, and leave the figure at its authored size lying across the segments.
			next = Math.max(9, room ? next * Math.max(0.72, room / t.width) - 0.25 : next * 0.8)
		}
		el.style.fontSize = next < authored ? next + 'px' : ''
	}, [])

	useLayoutEffect(fit, [fit, value, label])
	useEffect(() => {
		const ring = ref.current?.parentElement?.parentElement
		const ro = ring && window.ResizeObserver ? new ResizeObserver(fit) : null
		ro?.observe(ring)
		/* A layout effect runs before a webfont has loaded, so the first measurement is of the
		   fallback face -- which is narrower here, fits, and leaves the figure unshrunk for the
		   Poppins that swaps in a moment later and does not. The ring's own box never changes
		   when that happens, so the observer above cannot see it either. Re-fit when the fonts
		   this page actually uses are ready. */
		let live = true
		document.fonts?.ready?.then(() => { if (live) fit() })
		return () => { live = false; ro?.disconnect() }
	}, [fit])

	return (
		<span className="ring-centre">
			<span ref={ref} className="ring-centre-value tabular-figures">{value}</span>
			<span className="ring-centre-label">{label}</span>
		</span>
	)
}

/** The 132px ring on Home, Orders and Categories. Same separator as the gauge below: these
    drew their segments butted straight up against each other while Statistics' ring had
    hairlines between its, so two rings of the same data read as two different charts. The
    gap is a share of the circle, so one number gives both rings the same hairline. */
export const Donut = ({ segments, value, label, ariaLabel }) => (
	<div className="donut" role="img" aria-label={ariaLabel}
		style={segments?.length ? { background: conic(segments, RING_GAP) } : undefined}>
		<RingCentre value={value} label={label} />
	</div>
)

export const DonutBox = ({ children, className }) =>
	<div className={['donut-box', className].filter(Boolean).join(' ')}>{children}</div>

/** Statistics' larger ring, which separates its segments with a hairline of the card colour. */
export const SpendGauge = ({ segments, value, label, ariaLabel }) => (
	<div className="spend-gauge" role="img" aria-label={ariaLabel}
		style={segments?.length ? { background: conic(segments, RING_GAP) } : undefined}>
		<RingCentre value={value} label={label} />
	</div>
)

/** Spend against a projection, with a marker where the previous month ended. */
export const Meter = ({ fill, marker, ariaLabel, style }) => (
	<div className="meter" style={style} role="img" aria-label={ariaLabel}>
		<span className="meter-fill" style={{ width: fill + '%' }} />
		{marker != null ? <span className="meter-marker" style={{ left: marker + '%' }} /> : null}
	</div>
)

/** Seven bars, one per weekday. The peak days carry a lighter track with a filled portion,
    which is how the prototype marks them; everything else is the plain track. */
/** A bar per weekday, each a share of the busiest one, with its name underneath.

    Same shape as MonthColumns below and for the same reason: the bar sits in a track, and the
    track -- not the column, and not a number chosen in the API -- is the box the percentage
    resolves against. It used to take a pixel height per day and a `field` naming which of two
    identical copies of that height to read, so the chart was exactly as tall as the API had
    decided and the card around it kept whatever was left. */
export const WeekdayBars = ({ days, style }) => (
	<div className="weekday-bars" style={style} aria-hidden="true">
		{days.map(d => (
			<div key={d.day}>
				<div className="weekday-bars-track">
					<div className="chart-bar" style={{ height: d.share + '%', background: d.peak ? '#BFE5D2' : undefined }}>
						<div className="chart-bar-fill" style={{ '--f': d.peak ? '55%' : '0%' }} />
					</div>
				</div>
				<span>{d.day}</span>
			</div>
		))}
	</div>
)

/** A column per window, at a fixed scale-height, with its name underneath.

    The bar sits in a track of its own rather than sharing the column's box with the label. It
    used to be a flex sibling of that label inside a 150px column, so the space a percentage
    resolved against was 150px while the space a bar could actually occupy was 128.05 -- 150
    less the 6px gap and the 15.95px line of text -- and flex-shrink quietly took every bar
    above 85% down to exactly that. 100%, 96% and 85% drew three bars the same height, on a
    chart whose entire job is comparing heights, and the one that happened to be right was the
    85. A percentage needs a box that means it. */
export const MonthColumns = ({ months }) => (
	<div className="month-columns">
		{months.map(m => (
			<div key={m.label} className={m.current ? 'is-on' : undefined}>
				<div className="month-columns-track">
					<div className="month-columns-fill" style={{ height: m.height + '%' }} />
				</div>
				<span>{m.label}</span>
			</div>
		))}
	</div>
)

/** Indeterminate by default: the scan step cannot say how far through a document it is, and
    a bar that claims a percentage it has not got is a worse answer than one that does not. */
export const ProgressBar = ({ indeterminate = true, value, label, style }) => (
	<div className={['progress-bar', indeterminate && 'progress-bar-indeterminate'].filter(Boolean).join(' ')}
		style={style} role="progressbar" aria-label={label}
		aria-valuenow={indeterminate ? undefined : value}
		aria-valuemin={indeterminate ? undefined : 0} aria-valuemax={indeterminate ? undefined : 100}>
		<div className="progress-bar-fill" style={indeterminate ? undefined : { width: value + '%' }} />
	</div>
)

/** The onboarding dial on the dark card: "1/3" inside a ring drawn to that fraction -- the
    fill is computed from done/total, not a fixed share, so a ring reading "0/3" or "2/3"
    isn't stuck showing the same third the CSS default used to draw regardless. */
export const ProgressRing = ({ done, total }) => {
	const pct = total ? (done / total) * 100 : 0
	return (
		<span className="progress-ring"
			style={{ background: `conic-gradient(var(--green) 0 ${pct}%, rgb(255 255 255 / .22) ${pct}% 100%)` }}>
			<span className="progress-ring-value">{done}/{total}</span>
		</span>
	)
}

/** The preview for an uploaded document. `src`, when given, is a real thumbnail or display
    image (the backend generates both — see api/src/lib/images.js); without one, or if it fails
    to load, this falls back to the glyph for the file's own kind, because a PDF invoice drawn
    with a photo glyph is the screen telling the user it read something else. README: Views. */
export const DocumentPreview = ({ kind = 'image', src, style, ...rest }) => (
	<div className={`document-preview document-preview-${kind}`} style={style} aria-hidden="true" {...rest}>
		<ImageOrIcon src={src} icon={kind === 'pdf' ? 'document' : 'photo'}
			className={`document-preview-glyph document-preview-glyph-${kind}`}
			imgClassName="document-preview-photo" />
	</div>
)

/** The full-size view behind a thumbnail's click. A native <dialog> rather than a fixed box:
    it sizes to its image, and the image's own max-width/max-height are the viewport's, so the
    picture never asks for more room than the window already has -- it grows up to that ceiling
    and no further, never past it. showModal() traps focus and wires Escape for free; a click on
    the backdrop closes it the same way ConfirmDialog's does (FormPage.jsx). */
export function ImageLightbox({ src, alt, onClose }) {
	const ref = useRef(null)
	useEffect(() => {
		const opener = document.activeElement
		ref.current?.showModal()
		return () => opener?.focus?.()
	}, [])
	return (
		<dialog className="image-lightbox" ref={ref} aria-label={alt || 'Photo'}
			onCancel={onClose}
			onClick={e => { if (e.target === ref.current) onClose() }}>
			<IconButton icon="close" label="Close" className="image-lightbox-close" onClick={onClose} />
			<img src={src} alt={alt || ''} className="image-lightbox-img" />
		</dialog>
	)
}
