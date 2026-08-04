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

const buildPath = (points, width, height, pad, kind) => {
	const n = points.length
	if (!n) return ''
	const xAt = i => pad + (width - pad * 2) * (n > 1 ? i / (n - 1) : 0)
	const pts = points.map((y, i) => [xAt(i), y])

	if (kind === 'line') return 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1]).join(' L')

	/* A Catmull-Rom style tangent at each point, expressed as a cubic. The endpoints
	   duplicate their neighbour so the curve starts and ends flat rather than overshooting. */
	let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1]
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
		d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)
			+ ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)
			+ ' ' + p2[0].toFixed(1) + ' ' + p2[1]
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

/**
 * series:    [{ points, kind: 'line' | 'curve' | 'area', stroke, strokeWidth, fill, dash }]
 * baselines: [{ y, stroke, dash }]
 * markers:   [{ index, series, r, fill, stroke, strokeWidth, opacity }]
 * gradients: [{ key, x1, y1, x2, y2, stops: [{ offset, color, opacity }] }]
 *            reference one as stroke/fill "gradient:<key>"; the id is made unique per
 *            instance, because two charts on a page with the same defs id is a real defect
 *            and an invisible one -- the second silently borrows the first's colours.
 */
export const Chart = memo(function Chart({ height, pad = 0, label, series = [],
	baselines = [], markers = [], gradients = [], style, ...rest }) {
	const [ref, width] = useMeasuredWidth()
	const uid = useId().replace(/:/g, '')
	const paint = value => (typeof value === 'string' && value.startsWith('gradient:')
		? `url(#${uid}-${value.slice(9)})` : value)

	return (
		<svg ref={ref} className="chart" viewBox={`0 0 ${width || 1} ${height}`}
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
				<path key={i} d={buildPath(s.points, width, height, pad, s.kind)}
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
				const cx = pad + (width - pad * 2) * (n > 1 ? at / (n - 1) : 0)
				return <circle key={i} cx={cx.toFixed(1)} cy={host.points[at]} r={m.r}
					fill={m.fill} stroke={m.stroke} strokeWidth={m.strokeWidth} opacity={m.opacity} />
			})}
		</svg>
	)
})

/** The day-of-month scale under a chart. */
export const ChartAxis = ({ labels = ['01', '08', '15', '22', '29'] }) => (
	<div className="chart-axis tabular-figures">{labels.map(l => <span key={l}>{l}</span>)}</div>
)

export const ChartRuler = () => <div className="chart-ruler" aria-hidden="true" />

/* ---- ranges ----
   How many points a range is drawn with once it is wider than a chart can plot day by day.
   Statistics reads these against a window of the timeline; Home's hero has one month and no
   pager, so there `ranged` slices and buckets that month. README: Buttons. */

export const RANGE_POINTS = { '3M': 13, YTD: 12, ALL: 6 }

export function ranged(full, key) {
	if (key === '1W') return full.slice(-7)          // inside the month: the last seven days
	const n = RANGE_POINTS[key]
	if (!n) return full                              // 1M, and anything unrecognised
	const out = []
	for (let i = 0; i < n; i++) {
		const a = Math.floor(i * full.length / n)
		const b = Math.max(a + 1, Math.floor((i + 1) * full.length / n))
		const part = full.slice(a, b)
		out.push(Math.round(part.reduce((sum, v) => sum + v, 0) / part.length))
	}
	return out
}

/** Thins a running total down to `n` points by keeping the last value in each bucket. Averaging
    one is not one: the mean of a rising series sits below where it actually reached, so a
    three-month window would end short of the total printed above it. */
export function sampled(values, n) {
	if (!n || values.length <= n) return values
	return Array.from({ length: n }, (_, i) =>
		values[Math.min(values.length - 1, Math.ceil((i + 1) * values.length / n) - 1)])
}

/** Kroner onto the chart's pixel box, since one user unit is one CSS pixel and a series has to
    arrive in pixels. `max` is shared by every series in the chart, or two lines drawn each to
    its own scale say the smaller one is the bigger. */
export const plotted = (values, max, top = 180, bottom = 20) =>
	values.map(v => top - (top - bottom) * (max ? v / max : 0))

/** The range buttons. aria-pressed is the state, because these choose how much of one series to
    plot rather than which of several to show -- that is a group of toggles, not a tablist. The
    list of ranges is passed in rather than held here: on Statistics the same list is what the
    pager steps by, and a second copy is how a width gets offered that nothing can page. */
export function RangeTabs({ options, value, onChange }) {
	return (
		<div className="range-tabs" role="group" aria-label="Range">
			{options.map(key => (
				<button key={key} type="button" className={key === value ? 'is-on' : undefined}
					aria-pressed={key === value} onClick={() => onChange(key)}>{key}</button>
			))}
		</div>
	)
}
