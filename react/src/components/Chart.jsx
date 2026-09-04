import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef } from 'react'
import {
	Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ReferenceDot,
	ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { currency, dayMonth, percent } from '../api/format.js'

/* The pixel height Recharts reserves for the x-axis's own tick row, on top of the plot height
   a caller asks for -- so the curve keeps its full allotment with the axis drawn inside the box. */
const X_AXIS_HEIGHT = 20
const TICK_STYLE = { fontSize: 10.5, fill: 'var(--text-muted)' }

/** A real calendar date out of a plotted point's day offset -- UTC, matching the day arithmetic
    the API's own axis marks are cut on (axisFor in api/src/lib/stats.js). */
const addDays = (from, n) => {
	const [y, m, d] = from.split('-').map(Number)
	return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** One tooltip for every chart: the date under the pointer, then one row per series actually
    plotted there. `series` is looked up by dataKey for its swatch colour rather than trusting
    Recharts' own -- a line painted with a gradient stroke has no single colour to report, and
    the swatch needs one regardless. */
function ChartTooltip({ active, payload, series }) {
	if (!active || !payload?.length) return null
	const date = payload[0]?.payload?.date
	return (
		<div className="chart-tooltip">
			{date ? <div className="chart-tooltip-date">{dayMonth(date)}</div> : null}
			{payload.map(entry => (
				<div className="chart-tooltip-row" key={entry.dataKey}>
					<span className="chart-tooltip-swatch"
						style={{ background: series.find(s => s.dataKey === entry.dataKey)?.color }} />
					<span className="chart-tooltip-name">{entry.name}</span>
					<span className="chart-tooltip-value tabular-figures">{currency(entry.value)}</span>
				</div>
			))}
		</div>
	)
}

/**
 * The line/area chart every window in the app draws, over Recharts rather than a hand-rolled
 * SVG path -- a real value axis and a real tooltip come with it.
 *
 * data:       `[{ x, y1, y2?, date }]`. `x` is a real day offset from the window's start, not an
 *             array index -- a year or "all time" draws one point per *month*, and months are
 *             not equal lengths, so the axis marks only line up with the plotted points if both
 *             are positioned on the same day-numbered line. Callers already cut their series
 *             this way (bucketsFor/sampled/bucketed below); this component only plots the result.
 * days:       the window's real day span, so the x-axis always runs start to end of the window
 *             even when only its first day or two has a point to plot.
 * from:       the window's first day (ISO), for the tooltip's own date label.
 * marks:      the window's axis marks, `[{ label, day }]` -- the same shape `view.axis` sends.
 * series:     `[{ key, dataKey: 'y1'|'y2', name, color, area, strokeGradient, dash, strokeWidth,
 *             today }]`. `area` draws a gradient fill under the line, faded from the series' own
 *             colour to nothing; `strokeGradient` (a `[from, to]` pair) paints the line itself
 *             left to right instead of the flat `color`, which still marks the tooltip swatch and
 *             the today dot. `today` draws the "you are here" dot on that series, only once
 *             `todayIndex` resolves to a real point.
 * todayIndex: which point of `data` is today, or null outside the window -- a paged-back window
 *             on Statistics has none, and a comparison series is never today's regardless.
 * yFormat:    label formatter for the value axis (e.g. compactAmount).
 */
export const SpendChart = memo(function SpendChart({
	data, days, from, marks, series, todayIndex, yFormat, height, label, className
}) {
	const uid = useId().replace(/:/g, '')
	const domainEnd = Math.max(days - 1, 1)

	// A single point has nowhere to draw a line to, so it is held twice, at both ends of the
	// domain -- the one value a young window has is still a flat line across it, not a blank chart.
	const plotData = useMemo(() => {
		const base = data.length === 1 ? [{ ...data[0], x: 0 }, { ...data[0], x: domainEnd }] : data
		return base.map(p => ({ ...p, date: addDays(from, p.x) }))
	}, [data, from, domainEnd])

	const ticks = useMemo(() => marks.map(m => m.day), [marks])
	const tickLabel = useMemo(() => {
		const byDay = new Map(marks.map(m => [m.day, m.label]))
		return day => byDay.get(day) ?? ''
	}, [marks])

	const todayPoint = todayIndex != null ? plotData[todayIndex] : null
	const areaSeries = series.filter(s => s.area)
	const gradientSeries = series.filter(s => s.strokeGradient)

	return (
		<ResponsiveContainer className={['chart-plot', className].filter(Boolean).join(' ')}
			width="100%" height={height + X_AXIS_HEIGHT} role="img" aria-label={label}>
			<ComposedChart data={plotData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer={false}>
				{areaSeries.length || gradientSeries.length ? (
					<defs>
						{areaSeries.map(s => (
							<linearGradient key={s.key} id={`${uid}-${s.key}-area`} x1={0} y1={0} x2={0} y2={1}>
								<stop offset="0%" stopColor={s.color} stopOpacity={0.2} />
								<stop offset="100%" stopColor={s.color} stopOpacity={0} />
							</linearGradient>
						))}
						{gradientSeries.map(s => (
							<linearGradient key={s.key} id={`${uid}-${s.key}-stroke`} x1={0} y1={0} x2={1} y2={0}>
								<stop offset="0%" stopColor={s.strokeGradient[0]} />
								<stop offset="100%" stopColor={s.strokeGradient[1]} />
							</linearGradient>
						))}
					</defs>
				) : null}

				<CartesianGrid horizontal vertical={false} stroke="var(--border-divider)" />
				<XAxis dataKey="x" type="number" domain={[0, domainEnd]} ticks={ticks}
					tickFormatter={tickLabel} interval="preserveStartEnd" height={X_AXIS_HEIGHT}
					tickMargin={6} axisLine={false} tickLine={false} tick={TICK_STYLE} />
				<YAxis width="auto" domain={[0, 'auto']} allowDecimals={false} tickFormatter={yFormat}
					axisLine={false} tickLine={false} tick={TICK_STYLE} />
				<Tooltip content={<ChartTooltip series={series} />} isAnimationActive={false}
					cursor={{ stroke: 'var(--border-control)' }} />

				{series.map(s => s.area ? (
					<Area key={s.key} type="monotone" dataKey={s.dataKey} name={s.name} dot={false}
						stroke={s.color} strokeWidth={s.strokeWidth} fill={`url(#${uid}-${s.key}-area)`}
						fillOpacity={1} isAnimationActive={false} />
				) : (
					<Line key={s.key} type="monotone" dataKey={s.dataKey} name={s.name} dot={false}
						stroke={s.strokeGradient ? `url(#${uid}-${s.key}-stroke)` : s.color}
						strokeWidth={s.strokeWidth} strokeDasharray={s.dash} isAnimationActive={false} />
				))}

				{series.map(s => (s.today && todayPoint ? (
					<ReferenceDot key={`${s.key}-today`} x={todayPoint.x} y={todayPoint[s.dataKey]}
						r={4.5} fill="#fff" stroke={s.color} strokeWidth={2} ifOverflow="visible" />
				) : null))}
			</ComposedChart>
		</ResponsiveContainer>
	)
})

/* ---- the rings ----

   The ring is built from the same records the list beside it is, so the two cannot disagree;
   the stylesheet keeps its flat default for anything that does not pass segments. */

/* The hairline between two segments, as a share of the circle: 0.6% is 2.16°, about 3px of arc
   on the 170px gauge and 2.5px on the 132px donut. One number for every ring in the app, so
   the same split drawn on Home and on Statistics reads as one chart.

   A gap is a separator between two segments, so with only one segment there is nothing to
   separate: a "gap after the last" would wrap around the circle and land between that segment
   and itself, reading as a category that is 100% of the spend not filling its own ring.
   README: Charts. */
const RING_GAP = 0.6

/* The figure in the middle of a ring, shrunk to whatever the hole can actually hold.

   The hole is a circle, so the room a line of text has is not the hole's width -- it is the
   chord at that line's own height, and the value sits above centre with its label underneath.
   Nothing clips it, because the hole is painted by a ::before that the text sits on top of --
   so it does not overflow visibly the way a box would, it just quietly touches the ring.

   Measured rather than guessed at from the string's length: the hole is read off the ring's
   own ::before inset, the chord is computed at the box's furthest edge from centre, and the
   size is stepped down until it fits. That way a longer currency suffix, a different face or
   a ring of another size all stay correct without a second number to keep in step. */
const RingCentre = ({ value, label }) => {
	const ref = useRef(null)

	/* The size is written straight onto the node and is never React state: the measuring pass
	   has to clear the inline size to read the stylesheet's own, which is a direct DOM write,
	   and a state set to the value it already holds makes React bail out of re-rendering --
	   nothing would put the cleared property back. One writer per property. */
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

/* Recharts sweeps counterclockwise from 3 o'clock, not clockwise from 12 -- 90 has to run
   backwards a full turn (-270) to point clockwise, not forward to 450. */
const RING_START = 90
const RING_END = -270
const RING_GAP_DEG = RING_GAP / 100 * 360

/* Must match .donut in app.css: a 132px ring, its ::before hole inset 17px. */
const DONUT_SIZE = 132
const DONUT_OUTER = DONUT_SIZE / 2
const DONUT_INNER = DONUT_OUTER - 17

/* Must match .spend-gauge in app.css: a 170px ring, its ::before hole inset 22px. */
const GAUGE_SIZE = 170
const GAUGE_OUTER = GAUGE_SIZE / 2
const GAUGE_INNER = GAUGE_OUTER - 22

/* paddingAngle is one flat degree for every gap, not capped to the segment it separates --
   a sliver smaller than RING_GAP's own width can draw more separator than fill. */
const RingTooltip = ({ active, payload }) => {
	if (!active || !payload?.length) return null
	return <span className="ring-tooltip">{percent(payload[0].payload.share, 0)}</span>
}

/* RingCentre sits as this div's own direct child, so its ::before/getBoundingClientRect
   lookup still resolves the ring; Recharts' own SVG stays aria-hidden, role/name live here. */
const Ring = ({ className, segments, value, label, ariaLabel, size, outerRadius, innerRadius }) => (
	<div className={className} role="img" aria-label={ariaLabel}
		/* The SVG's transparent gaps must show the card colour, matching the centre hole -- the
		   class's own flat background is the empty-state grey and would show through otherwise. */
		style={segments?.length ? { background: 'var(--bg-card)' } : undefined}>
		{segments?.length ? (
			<div aria-hidden="true">
				<PieChart width={size} height={size} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} accessibilityLayer={false}>
					<Pie data={segments} dataKey="share" cx="50%" cy="50%"
						startAngle={RING_START} endAngle={RING_END}
						innerRadius={innerRadius} outerRadius={outerRadius}
						paddingAngle={RING_GAP_DEG} stroke="none" isAnimationActive={false} rootTabIndex={-1}>
						{segments.map((s, i) => <Cell key={i} fill={s.colour} />)}
					</Pie>
					<Tooltip content={RingTooltip} allowEscapeViewBox={{ x: true, y: true }} />
				</PieChart>
			</div>
		) : null}
		<RingCentre value={value} label={label} />
	</div>
)

/** The 132px ring on Home, Orders and Categories. Same separator as the gauge below -- the
    gap is a share of the circle, so one number gives both rings the same hairline. */
export const Donut = ({ segments, value, label, ariaLabel }) => (
	<Ring className="donut" segments={segments} value={value} label={label} ariaLabel={ariaLabel}
		size={DONUT_SIZE} outerRadius={DONUT_OUTER} innerRadius={DONUT_INNER} />
)

export const DonutBox = ({ children, className }) =>
	<div className={['donut-box', className].filter(Boolean).join(' ')}>{children}</div>

/** Statistics' larger ring, which separates its segments with a hairline of the card colour. */
export const SpendGauge = ({ segments, value, label, ariaLabel }) => (
	<Ring className="spend-gauge" segments={segments} value={value} label={label} ariaLabel={ariaLabel}
		size={GAUGE_SIZE} outerRadius={GAUGE_OUTER} innerRadius={GAUGE_INNER} />
)

/* ---- the bar rows ----

   WeekdayBars and MonthColumns share one shape: a bar is a share of a fixed [0,100] domain,
   not a pixel height, so a card that grows still means what its bars say. The real kr figure
   lives in the tooltip; the bars themselves stay relative, so the Y axis stays hidden. */

const BAR_RADIUS = 10		// matches --radius-compact
const BAR_MIN_HEIGHT = 3	// px floor so a zero-spend weekday still draws a sliver
const MONTH_RADIUS = [8, 8, 4, 4]

/* Per-corner rounded rect, clockwise from top-left: SVG's own rx/ry rounds all four corners
   alike, and these bars need only the top rounded, or a smaller radius at the bottom than
   the top. */
const roundedRect = (x, y, width, height, [tl, tr, br, bl]) => {
	const cap = r => Math.min(r, width / 2, height / 2)
	const [a, b, c, d] = [tl, tr, br, bl].map(cap)
	return `M${x} ${y + a} Q${x} ${y} ${x + a} ${y} H${x + width - b} Q${x + width} ${y} ${x + width} ${y + b} `
		+ `V${y + height - c} Q${x + width} ${y + height} ${x + width - c} ${y + height} H${x + d} `
		+ `Q${x} ${y + height} ${x} ${y + height - d} Z`
}

/* The whole peak bar is --green, every other bar the track grey -- same rule MonthBar draws
   the current window by. The height is the value; the fill only says which one is the peak, so
   a fill that stops part-way up reads as a second value the day does not have. */
const WeekdayBar = ({ x, y, width, height, payload }) => {
	const h = Math.max(height, BAR_MIN_HEIGHT)
	const path = roundedRect(x, y + height - h, width, h, [BAR_RADIUS, BAR_RADIUS, 0, 0])
	return <path d={path} fill={payload.peak ? 'var(--green)' : 'var(--bg-bar-track)'} />
}

const MonthBar = ({ x, y, width, height, payload }) => (
	<path d={roundedRect(x, y, width, height, MONTH_RADIUS)}
		fill={payload.current ? 'var(--green)' : 'var(--bg-bar-track)'} />
)

/* Recharts drops ticks when the axis runs out of room, then numbers the survivors from 0 --
   so a tick's `index` is a position among what is still drawn, not into the data. Look the row
   up by the value the axis is keyed on instead: read positionally, a thinned axis printed the
   first three names over the second, fourth and sixth columns and said nothing was wrong. */
const rowForTick = (rows, key, payload, index) =>
	rows.find(row => row[key] === payload?.value) ?? rows[index]

/* Both label spans travel on every tick; app.css swaps them by container query. The
   foreignObject carries real HTML spans, not SVG text, so those class rules still apply. */
const WeekdayTick = ({ x, y, width, visibleTicksCount, index, payload, days }) => {
	const band = width / visibleTicksCount
	const d = rowForTick(days, 'day', payload, index)
	if (!d) return null
	return (
		// A day name may be wider than its own even share of the axis; a foreignObject clips
		// its content by default, so this opts out.
		<foreignObject x={x - band / 2} y={y + 6} width={band} height={18} style={{ overflow: 'visible' }}>
			<div xmlns="http://www.w3.org/1999/xhtml" style={{ textAlign: 'center' }}>
				<span className="weekday-name-short">{d.day}</span>
				<span className="weekday-name-full">{d.dayFull ?? d.day}</span>
			</div>
		</foreignObject>
	)
}

const MonthTick = ({ x, y, width, visibleTicksCount, index, payload, months }) => {
	const band = width / visibleTicksCount
	const m = rowForTick(months, 'label', payload, index)
	if (!m) return null
	return (
		<foreignObject x={x - band / 2} y={y + 6} width={band} height={18} style={{ overflow: 'visible' }}>
			<div xmlns="http://www.w3.org/1999/xhtml" style={{ textAlign: 'center' }}>
				<span className="period-full">{m.labelFull ?? m.label}</span>
				<span className="period-short">{m.label}</span>
			</div>
		</foreignObject>
	)
}

/* The kr amount, not the share the bar's own height already draws -- the height against its
   neighbours is the relative story; the tooltip is where the real figure lives. */
const WeekdayTooltip = ({ active, payload }) => {
	if (!active || !payload?.length) return null
	const d = payload[0].payload
	return <div className="bar-tooltip"><strong>{d.dayFull ?? d.day}</strong><span className="tabular-figures">{currency(d.spend)}</span></div>
}

const MonthTooltip = ({ active, payload }) => {
	if (!active || !payload?.length) return null
	const m = payload[0].payload
	return <div className="bar-tooltip"><strong>{m.labelFull ?? m.label}</strong><span className="tabular-figures">{currency(m.spend)}</span></div>
}

/** A bar per weekday, each a share of the busiest one, with its name underneath.

    `ariaLabel` given makes the whole chart `role="img"` (Stats' own rhythm card); omitted, it
    is `aria-hidden` (Home's copy -- the real numbers are stated elsewhere on that card).
    Recharts' own SVG stays aria-hidden either way, so a screen reader only ever sees the one
    label this component chooses to give it. */
export const WeekdayBars = ({ days, className, style, ariaLabel }) => (
	<div className={['weekday-bars', className].filter(Boolean).join(' ')} style={style}
		{...(ariaLabel ? { role: 'img', 'aria-label': ariaLabel } : { 'aria-hidden': 'true' })}>
		<ResponsiveContainer aria-hidden="true" width="100%" height="100%">
			<BarChart data={days} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
				barCategoryGap="16%" accessibilityLayer={false}>
				<XAxis dataKey="day" tickLine={false} axisLine={false} tickSize={0} tickMargin={0}
					height={26} tick={props => <WeekdayTick {...props} days={days} />} />
				<YAxis hide domain={[0, 100]} />
				<Tooltip content={WeekdayTooltip} cursor={{ fill: 'var(--bg-row-hover)' }} />
				<Bar dataKey="share" isAnimationActive={false} shape={props => <WeekdayBar {...props} />} />
			</BarChart>
		</ResponsiveContainer>
	</div>
)

/** A column per window, on the same fixed [0,100] scale as WeekdayBars above; the current
    window's column is --green, every other --bg-bar-track. */
export const MonthColumns = ({ months }) => (
	<div className="month-columns">
		<ResponsiveContainer width="100%" height="100%">
			<BarChart data={months} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
				barCategoryGap="20%" accessibilityLayer={false}>
				<XAxis dataKey="label" tickLine={false} axisLine={false} tickSize={0} tickMargin={0}
					height={26} tick={props => <MonthTick {...props} months={months} />} />
				<YAxis hide domain={[0, 100]} />
				<Tooltip content={MonthTooltip} cursor={{ fill: 'var(--bg-row-hover)' }} />
				<Bar dataKey="height" isAnimationActive={false} shape={props => <MonthBar {...props} />} />
			</BarChart>
		</ResponsiveContainer>
	</div>
)

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

    Nothing is rounded on the way out: these are order counts and kroner a chart still has to
    sum and average, and a month of days where most hold one order would round to a flat line
    of order-count-1 if this rounded early. */
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
   One cut, used by all three: the two reducers here and the axis have to agree on which point
   a calendar date lands in, or the same date sits a bucket apart on two different charts. */

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

