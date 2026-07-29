import { Icon } from './Icon.jsx'

/* The small visualisations that are drawn in CSS rather than in SVG: the donut, the gauge,
   the meter, the bar rows and the two progress indicators.

   One thing here is deliberately not a copy of the prototype. Its donut is a conic-gradient
   written into the stylesheet with the shares baked in -- 13%, 14%, 6%, 10%, 57% -- beside a
   list of categories that reads 38, 27, 13, 10, 12. Nothing rendered could fail: a ring has
   no opinion about the list beside it. Here the ring is built from the same records the list
   is, so the two cannot disagree; the stylesheet keeps its default for anything that does
   not pass segments. README 6. */

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
		style={segments ? { background: conic(segments) } : undefined}>
		<RingCentre value={value} label={label} />
	</div>
)

export const DonutBox = ({ children, className }) =>
	<div className={['donut-box', className].filter(Boolean).join(' ')}>{children}</div>

/** Statistics' larger ring, which separates its segments with a hairline of the card colour. */
export const SpendGauge = ({ segments, value, label, ariaLabel }) => (
	<div className="spend-gauge" role="img" aria-label={ariaLabel}
		style={segments ? { background: conic(segments, 2) } : undefined}>
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

/** The onboarding dial on the dark card: "1/3" inside a ring drawn to that fraction. */
export const ProgressRing = ({ done, total }) => (
	<span className="progress-ring">
		<span className="progress-ring-value">{done}/{total}</span>
	</span>
)

/** The placeholder for an uploaded document. The glyph is the file's own kind, because a
    PDF invoice drawn with a photo glyph is the screen telling the user it read something
    else. README 11. */
export const DocumentPreview = ({ kind = 'image', style, ...rest }) => (
	<div className={`document-preview document-preview-${kind}`} style={style} aria-hidden="true" {...rest}>
		<Icon name={kind === 'pdf' ? 'document' : 'photo'}
			className={`document-preview-glyph document-preview-glyph-${kind}`} />
	</div>
)
