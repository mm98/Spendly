import { useEffect, useRef } from 'react'
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

const conic = (segments, gap = 0) => {
	let at = 0
	const total = segments.reduce((sum, s) => sum + s.share, 0) || 100
	const stops = segments.flatMap(s => {
		const from = at
		at += (s.share / total) * 100
		const to = Math.max(from, at - gap)
		const parts = [`${s.colour} ${from.toFixed(2)}% ${to.toFixed(2)}%`]
		if (gap) parts.push(`var(--bg-card) ${to.toFixed(2)}% ${at.toFixed(2)}%`)
		return parts
	})
	return `conic-gradient(${stops.join(', ')})`
}

const RingCentre = ({ value, label }) => (
	<span className="ring-centre">
		<span className="ring-centre-value tabular-figures">{value}</span>
		<span className="ring-centre-label">{label}</span>
	</span>
)

/** The 132px ring on Home, Orders and Categories. */
export const Donut = ({ segments, value, label, ariaLabel }) => (
	<div className="donut" role="img" aria-label={ariaLabel}
		style={segments?.length ? { background: conic(segments) } : undefined}>
		<RingCentre value={value} label={label} />
	</div>
)

export const DonutBox = ({ children, className }) =>
	<div className={['donut-box', className].filter(Boolean).join(' ')}>{children}</div>

/** Statistics' larger ring, which separates its segments with a hairline of the card colour. */
export const SpendGauge = ({ segments, value, label, ariaLabel }) => (
	<div className="spend-gauge" role="img" aria-label={ariaLabel}
		style={segments?.length ? { background: conic(segments, 2) } : undefined}>
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
export const WeekdayBars = ({ days, field = 'home', style }) => (
	<div className="weekday-bars" style={style} aria-hidden="true">
		{days.map(d => (
			<div key={d.day}>
				<div className="chart-bar" style={{ height: d[field] + 'px', background: d.peak ? '#BFE5D2' : undefined }}>
					<div className="chart-bar-fill" style={{ '--f': d.peak ? '55%' : '0%' }} />
				</div>
				<span>{d.day}</span>
			</div>
		))}
	</div>
)

export const MonthColumns = ({ months }) => (
	<div className="month-columns">
		{months.map(m => (
			<div key={m.label} className={m.current ? 'is-on' : undefined}>
				<div className="month-columns-fill" style={{ height: m.height + '%' }} />
				<span>{m.label}</span>
			</div>
		))}
	</div>
)

/** The two-tone rule under the hero number. */
export const SplitBar = ({ segments }) => (
	<div className="chart-split-bar" aria-hidden="true">
		{segments.map((s, i) =>
			<span key={i} className="chart-split-bar-segment" style={{ width: s.width + '%', background: s.colour }} />)}
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
