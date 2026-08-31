import { memo, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

/* The charts.

   The viewBox is remapped 1:1 onto the element's real pixel box on every resize, so one
   user unit is always one CSS pixel. Stroke widths hold, marker circles stay circular, and
   only the horizontal spacing of the data changes. Scaling a fixed viewBox instead
   (preserveAspectRatio, or width plus aspect-ratio) zooms the whole drawing, which thickens
   the line and turns the circles into ellipses. README: Buttons.

   In React that means the width has to be state: the path data is computed from it during
   render rather than written onto the DOM afterwards, so a re-render never leaves a path
   drawn for a width the element no longer has. A chart on a route that is not mounted
   measures nothing at all, which is simpler than the prototype's problem of a chart on a
   hidden page measuring zero. */

/* The line/curve/area always run edge to edge -- x=0 to x=width -- rather than inset by some
   guessed-at padding. The one thing that ever needed room was a marker circle landing exactly on
   the first or last point and getting half clipped by the SVG's own boundary, and that is now the
   marker's own problem to solve (see the clamp on cx below): most markers sit mid-series and never
   need the room, so a whole chart being inset on both edges to protect one circle that usually
   isn't even there was the wrong place to pay for it. A card heading, a ruler, an axis tick, and
   the plotted line above them all now share the same left and right edge. README: Charts. */
const buildPath = (points, width, height, kind) => {
	let n = points.length
	if (!n) return ''
	const xAt = i => width * (n > 1 ? i / (n - 1) : 0)
	let pts = points.map((y, i) => [xAt(i), y])
	/* A single point has nowhere to draw a line to -- 'M' with no command after it paints
	   nothing, indistinguishable from an empty series. A window this young (an "all time"
	   range whose only order was placed today) still has a value to show, so stretch that one
	   point across the full width instead of leaving the chart blank. */
	if (n === 1) { pts = [[0, pts[0][1]], [width, pts[0][1]]]; n = 2 }

	if (kind === 'line') return 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1]).join(' L')

	/* Monotone cubic Hermite (Fritsch-Carlson), not a Catmull-Rom tangent -- a Catmull-Rom
	   segment is only confined to the convex hull of its *own* four control points, which is
	   no promise at all about the two data points it's actually drawn between: a flat lead-in
	   that jumps to a total and back is exactly the sharp turn that hull is widest on, so the
	   curve dips below its own flat run before rising, and overshoots above the total before
	   settling back to it -- a claim about values the series never held. Clamping the control
	   points to the chart's [0, height] (the previous fix here) only stopped that overshoot
	   from being clipped by the SVG edge; it never stopped the overshoot from being drawn.

	   Fritsch-Carlson chooses each point's tangent from the slopes on both sides of it -- zero
	   at any point where the series turns (the slopes either side disagree in sign, or one is
	   flat), then rescaled so neither side of a segment can overshoot the pair of values it
	   connects. The curve is therefore confined to [min(y_i, y_i+1), max(y_i, y_i+1)] on every
	   segment, which is what "the curve doesn't invent values" actually means -- a stronger
	   and cheaper guarantee than clamping to the whole chart's height ever was. */
	const slope = new Array(n - 1)
	for (let i = 0; i < n - 1; i++) {
		const dx = pts[i + 1][0] - pts[i][0]
		slope[i] = dx ? (pts[i + 1][1] - pts[i][1]) / dx : 0
	}
	const tangent = new Array(n)
	tangent[0] = slope[0]
	tangent[n - 1] = slope[n - 2]
	for (let i = 1; i < n - 1; i++) {
		const a = slope[i - 1], b = slope[i]
		tangent[i] = (a === 0 || b === 0 || (a > 0) !== (b > 0)) ? 0 : (a + b) / 2
	}
	for (let i = 0; i < n - 1; i++) {
		if (slope[i] === 0) { tangent[i] = 0; tangent[i + 1] = 0; continue }
		const a = tangent[i] / slope[i], b = tangent[i + 1] / slope[i]
		const s = a * a + b * b
		if (s > 9) {
			const tau = 3 / Math.sqrt(s)
			tangent[i] = tau * a * slope[i]
			tangent[i + 1] = tau * b * slope[i]
		}
	}
	let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1]
	for (let i = 0; i < pts.length - 1; i++) {
		const h = pts[i + 1][0] - pts[i][0]
		d += ' C' + (pts[i][0] + h / 3).toFixed(1) + ' ' + (pts[i][1] + h * tangent[i] / 3).toFixed(1)
			+ ' ' + (pts[i + 1][0] - h / 3).toFixed(1) + ' ' + (pts[i + 1][1] - h * tangent[i + 1] / 3).toFixed(1)
			+ ' ' + pts[i + 1][0].toFixed(1) + ' ' + pts[i + 1][1]
	}
	if (kind === 'area') {
		d += ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + height
			+ ' L' + pts[0][0].toFixed(1) + ' ' + height + ' Z'
	}
	return d
}

/** Measures the element and keeps the measurement in state. Rounded, because a fractional
    viewBox width buys nothing and re-renders on every sub-pixel wobble. */
function useMeasuredWidth() {
	const ref = useRef(null)
	const [width, setWidth] = useState(0)
	const measure = useCallback(() => {
		const el = ref.current
		if (el) setWidth(w => {
			const next = Math.round(el.getBoundingClientRect().width)
			return next === w ? w : next
		})
	}, [])

	useLayoutEffect(measure, [measure])
	useEffect(() => {
		const el = ref.current
		if (!el || !window.ResizeObserver) return
		const ro = new ResizeObserver(measure)
		ro.observe(el)
		return () => ro.disconnect()
	}, [measure])

	return [ref, width]
}

/* Today, on a line that runs through it.

   Every line chart in the app draws the same mark in the same place, because it answers the same
   question on all of them -- *where on this line is now*. Two of the five drew one, three did
   not, and the two that did drew it differently, so the same fact was a halo and a dot on one
   page, a bare dot on another, and nothing at all on the rest.

   Null where today is outside the window, which is the whole point of taking `todayIndex` from
   the API rather than reaching for the last point: a month paged back on Statistics has a line
   that ends at its own last day, and marking that would say "you are here" about a day three
   months ago. Null again where the chart is a comparison -- the previous window's line runs
   through its own days, and none of them is today.

   `series` names which line it sits on; `colour` is that line's own stroke, so the mark reads as
   part of it rather than as a fifth colour on the page. */
export const todayMarker = (index, { series = 0, colour } = {}) =>
	(index == null ? [] : [{ index, series, r: 4.5, fill: '#fff', stroke: colour, strokeWidth: 2 }])

/**
 * series:    [{ points, kind: 'line' | 'curve' | 'area', stroke, strokeWidth, fill, dash }]
 * baselines: [{ y, stroke, dash }]
 * markers:   [{ index, series, r, fill, stroke, strokeWidth, opacity }]
 * gradients: [{ key, x1, y1, x2, y2, stops: [{ offset, color, opacity }] }]
 *            reference one as stroke/fill "gradient:<key>"; the id is made unique per
 *            instance, because two charts on a page with the same defs id is a real defect
 *            and an invisible one -- the second silently borrows the first's colours.
 */
export const Chart = memo(function Chart({ height, label, series = [],
	baselines = [], markers = [], gradients = [], className, style, ...rest }) {
	const [ref, width] = useMeasuredWidth()
	const uid = useId().replace(/:/g, '')
	const paint = value => (typeof value === 'string' && value.startsWith('gradient:')
		? `url(#${uid}-${value.slice(9)})` : value)

	return (
		<svg ref={ref} className={['chart', className].filter(Boolean).join(' ')} viewBox={`0 0 ${width || 1} ${height}`}
			style={{ height, ...style }} role="img" aria-label={label} {...rest}>
			{gradients.length ? (
				<defs>
					{gradients.map(g => (
						<linearGradient key={g.key} id={`${uid}-${g.key}`}
							x1={g.x1 ?? 0} y1={g.y1 ?? 0} x2={g.x2 ?? 0} y2={g.y2 ?? 1}>
							{g.stops.map((s, i) =>
								<stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />)}
						</linearGradient>
					))}
				</defs>
			) : null}

			{baselines.map((b, i) =>
				<line key={i} x1={0} x2={width} y1={b.y} y2={b.y} stroke={b.stroke} strokeDasharray={b.dash} />)}

			{series.map((s, i) => (
				<path key={i} d={buildPath(s.points, width, height, s.kind)}
					fill={paint(s.fill) ?? 'none'} stroke={paint(s.stroke) ?? 'none'}
					strokeWidth={s.strokeWidth} strokeDasharray={s.dash} />
			))}

			{markers.map((m, i) => {
				const host = series[m.series ?? 0]
				if (!host?.points.length) return null
				/* A shorter range means fewer points than the marker was authored against, and
				   an index past the end writes cx/cy="undefined" and drops the marker. */
				const n = host.points.length
				const at = Math.min(m.index, n - 1)
				const rawCx = width * (n > 1 ? at / (n - 1) : 0)
				// Clamped into [r, width - r] rather than the path being inset for it: a marker
				// on the first or last point would otherwise have its own circle cut in half by
				// the SVG's edge, and that's the only case this ever needs to move it at all --
				// every other index already lands inside those bounds untouched.
				const r = m.r ?? 0
				const cx = Math.max(r, Math.min(width - r, rawCx))
				return <circle key={i} cx={cx.toFixed(1)} cy={host.points[at]} r={m.r}
					fill={m.fill} stroke={m.stroke} strokeWidth={m.strokeWidth} opacity={m.opacity} />
			})}
		</svg>
	)
})

/* ---- the scale under a chart ----

   One component, one array of marks, both rows drawn from it. It used to be two: a
   `<ChartRuler />` whose ticks were a `repeating-linear-gradient` every 23px, and a
   `<ChartAxis />` of labels spread by `justify-content:space-between`. Neither knew the other
   existed, so the ticks were a fixed comb that landed under the dates by coincidence and never
   again once the range moved -- 14 ticks under 5 labels on a month, the last one nowhere near
   the 29. A tick strip that does not mark the labels is decoration pretending to be a scale.

   Anchoring, and why it is not plain centring: the plotted line runs edge to edge, x=0 to
   x=width (see buildPath), so mark i belongs at p = i/(n-1) of the box -- the first hard against
   the left edge, the last hard against the right. A label centred on either would hang half
   outside the card. So every mark is placed at `left:p%` and pulled back by p of *its own*
   width: p=0 leaves it flush left, p=1 pulls it flush right, p=.5 centres it. That is exactly
   what space-between was already doing to the labels, which is why they have not moved -- but
   now the tick is placed by the same rule, so the point at fraction p across the tick and the
   point at fraction p across the label both sit at p x width. They cannot drift apart again,
   whatever the range or the width, because there is one number behind both.

   Marks come from the window (`window.axis` on the API side), never from a hardcoded month. */

/* Room two marks need between them: half of each label plus daylight, since a label is centred
   on its own tick. Measured off the label rather than assumed for the widest one -- a flat 34px
   is what "Jan" needs when it stands next to "2025", and it costs a phone half the months of a
   year to reserve it for twelve three-letter names that want 26. The axis renders at 10.5px, in
   a face whose digits are tabular, so a character is about 6.5px wide. */
const CHAR = 6.5
const GAP = 7
const spacing = (a, b) => (String(a.label).length + String(b.label).length) * CHAR / 2 + GAP

/** As many marks as fit, left to right, dropping any that would land too close to the last one
    kept. A fortnight of days is 14 marks and a year of them would be 365; the axis has to
    survive both, and a phone has room for a year's twelve months but not for its days.

    By real x, not by counting: the marks are not evenly spaced (months are 28 to 31 days long)
    and a wide window quantises several of them onto one plotted point -- a year drawn as 12
    equal buckets puts Feb and Mar in the same one, and "all time" as 6 puts whole seasons
    there. Thinning to a count kept both of those and drew them on top of each other. Distance
    is the thing that decides whether a label has room, so distance is what it now asks. */
export function fitMarks(marks, width) {
	// Before the first measurement there is no width to fit to, and thinning to a guess would
	// draw a scale that jumps on the next frame. Everything, then the real answer.
	if (!width || marks.length < 3) return marks
	const kept = [marks[0]]
	for (const m of marks.slice(1)) {
		if ((m.p - kept.at(-1).p) * width >= spacing(kept.at(-1), m)) kept.push(m)
	}
	/* The end of the window is worth naming, so when the final mark was dropped for being close
	   it takes the place of the one that crowded it out -- otherwise a year's axis stops at Nov
	   and the last stretch of the line is unlabelled. */
	const last = marks.at(-1)
	if (kept.at(-1) !== last && kept.length > 1
		&& (last.p - kept.at(-2).p) * width >= spacing(kept.at(-2), last)) kept[kept.length - 1] = last
	return kept
}

const at = p => ({ left: p * 100 + '%', transform: `translateX(-${p * 100}%)` })

/**
 * The scale under a chart: a tick per mark, the mark's own label under it.
 *
 * marks:      the window's own marks, `[{ label, fullLabel, day }]` — the days of a week or a
 *             month, the months of a quarter, a year or all time. `day` indexes the window's
 *             daily series. `fullLabel` is the unabbreviated form ("January" for "Jan"); a day
 *             number or a bare year has none to give, since it is already its own full form.
 * span:       how many days that series holds.
 * buckets:    the cut the chart was drawn with (bucketsFor), when it draws fewer points than days.
 * preferFull: draw fullLabel wherever every mark fits at that length, not just short label.
 *             Off by default: Home's and Orders overview's own charts sit in dashboard-card
 *             widths this was never measured against, so only a caller with the room to spend
 *             asks for it (Stats.jsx's own Overview chart).
 */
export const ChartScale = ({ marks = [], span, buckets, preferFull = false }) => {
	const [ref, width] = useMeasuredWidth()
	const days = span ?? marks.length
	const total = pointCount(buckets, days)
	const placed = marks.map(m => ({
		...m,
		// Through the same cut the line was drawn with, not evenly by index: a window's months
		// are 28 to 31 days apart and not one length, and spreading them as though they were
		// put every mark but the first somewhere the chart plots a different date.
		p: total > 1 ? bucketOf(m.day, days, buckets) / (total - 1) : 0
	}))
	/* Tried at the full length first, kept only if every mark still fits at it -- fitMarks
	   dropping even one would leave the axis reading "January Mar May", mixing a spelled-out
	   month against its neighbours' initials rather than falling back as a whole. The short
	   run underneath is exactly today's behaviour, so a width too narrow for the long form
	   costs nothing extra: it draws the same axis it always did. */
	const full = preferFull ? placed.map(m => ({ ...m, label: m.fullLabel ?? m.label })) : null
	const shownFull = full ? fitMarks(full, width) : null
	const shown = shownFull && shownFull.length === full.length ? shownFull : fitMarks(placed, width)
	if (!shown.length) return null

	return (
		<div className="chart-scale" ref={ref}>
			<div className="chart-ruler" aria-hidden="true">
				{/* Keyed by day, not by label: a span of two years names "Feb" twice, and two
				    identical keys is React silently drawing one of them. */}
				{shown.map(m => <i key={m.day} style={at(m.p)} />)}
			</div>
			<div className="chart-axis tabular-figures">
				{shown.map(m => <span key={m.day} style={at(m.p)}>{m.label}</span>)}
			</div>
		</div>
	)
}

/* ---- how a window is cut into the points a chart draws ----

   A window is drawn in the unit its axis names. A week is 7 days, a month its own 28 to 31 and
   a quarter the ~90 it spans -- all of them one point per day, and every mark then sits exactly
   on its own date with nothing to round. Only a year and "all time" are too wide for that, and
   both are marked in months, so months are what they are cut into.

   The cut used to be a count per range -- 13 points for a quarter, 12 for a year, 6 for all
   time -- and that is what the axis could not survive. A year cut into 12 slices of 30.4 days
   is not 12 calendar months: 1 Feb is day 31 and 1 Mar is day 59, and both land in the second
   slice, so the axis printed Jan Feb Apr with March drawn and unnamed. There was nowhere to
   name it that was not already February's. Twelve points across a year *are* its twelve
   months, so the cuts are the months themselves, read off the marks the window already sends.
   One source: the boundary a bucket ends on is the boundary its mark names, so no mark can miss
   its own point, and a quarter's three months no longer land three days from where they are.
   README: Buttons. */

/** The cut for a range: the marks' own days where a window is too wide to draw a point per day,
    and `null` -- one point per day, nothing to bucket -- everywhere else. */
export function bucketsFor(range, marks, days) {
	if (range !== 'year' && range !== 'all') return null
	const cuts = marks.map(m => m.day)
	// Fewer marks than days is what makes them a bucketing; a window young enough to be marked
	// day by day is already one point per day.
	return cuts.length > 1 && cuts.length < days ? cuts : null
}

/** How many points a cut draws. */
export const pointCount = (buckets, days) =>
	(Array.isArray(buckets) ? buckets.length : buckets || days)

/** Averages a day-by-day series down to `n` buckets. Not a running total -- use `sampled` for
    one, for the reason written on it.

    Nothing is rounded on the way out. These are order counts and kroner on their way into
    `plotted`, and a month of days where most hold one order rounds to a row of 1s and draws a
    flat line: the rounding was for the pixel coordinates this used to be handed. */
export function bucketed(values, buckets) {
	const n = pointCount(buckets, values.length)
	if (!buckets || values.length <= n) return values
	return Array.from({ length: n }, (_, i) => {
		const a = cutAt(i, values.length, buckets)
		const part = values.slice(a, Math.max(a + 1, cutAt(i + 1, values.length, buckets)))
		return part.reduce((sum, v) => sum + v, 0) / part.length
	})
}

/* ---- where a day lands once a series is drawn coarser than it was recorded ----
   One cut, used by all three: the two reducers here and the scale that has to say which plotted
   point a calendar date ended up inside. They used to disagree -- bucketed() cut on
   floor(i x L / n) and sampled() kept ceil((i+1) x L / n) - 1, which is the same idea rounded
   the other way, so the two charts on Home and Statistics put the same date up to a bucket
   apart. A scale can only be right about one of them, so there is now one to be right about. */

/** First index of bucket `i`, under either kind of cut. */
const cutAt = (i, L, buckets) =>
	(Array.isArray(buckets) ? (i < buckets.length ? buckets[i] : L) : Math.floor(i * L / buckets))

/** Which plotted point holds day `day` of an `L`-day series. */
export function bucketOf(day, L, buckets) {
	const n = pointCount(buckets, L)
	if (!buckets || L <= n) return Math.min(day, L - 1)
	if (!Array.isArray(buckets)) return Math.min(n - 1, Math.floor(day * n / L))
	let i = 0
	while (i + 1 < n && buckets[i + 1] <= day) i++
	return i
}

/** Thins a running total down to `n` points by keeping the last value in each bucket. Averaging
    one is not one: the mean of a rising series sits below where it actually reached, so a
    three-month window would end short of the total printed above it. */
export function sampled(values, buckets) {
	const n = pointCount(buckets, values.length)
	if (!buckets || values.length <= n) return values
	// The last value of each bucket, on the same cut bucketed() splits on -- and the last value
	// of the last bucket is the series' own last value, which is what a running total has to end
	// on to agree with the total printed above the chart.
	return Array.from({ length: n }, (_, i) =>
		values[Math.max(0, Math.min(values.length - 1, cutAt(i + 1, values.length, buckets) - 1))])
}

/** Kroner onto the chart's pixel box, since one user unit is one CSS pixel and a series has to
    arrive in pixels. `max` is shared by every series in the chart, or two lines drawn each to
    its own scale say the smaller one is the bigger. */
export const plotted = (values, max, top = 180, bottom = 20) =>
	values.map(v => top - (top - bottom) * (max ? v / max : 0))

