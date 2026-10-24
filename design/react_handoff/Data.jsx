import { join, pick, reject } from './variants.js'

/* Measurements, drawn.

   A measurement is the one thing a class cannot carry: no stylesheet can have seen
   the value. The library's own pages state theirs as data attributes with a rule
   each - right for a drawn page, where nothing carries a style attribute - but a
   live component has a number that arrived a moment ago, so it writes the width or
   the height itself. That is a measurement, not a look: nothing here sets a colour,
   a size or a radius, and the component's own rules draw it. */

const pct = n => `${Math.max(0, Math.min(100, n))}%`

/**
 * A measurement against a limit. The gauge is the track: the fill, the overage and
 * the marker are drawn against the same box, so nothing can drift. The <meter> is
 * there for semantics - it is what a screen reader reads - and paints nothing,
 * because a browser insets its own bar inside its box.
 *
 *
 *
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {number} props.value What has been spent, as a percentage of the limit.
 * @param {number} [props.over] How far past the limit it went, as a percentage.
 * @param {number} [props.marker] Where the limit sits, when the gauge is scaled past it.
 * @param {boolean} [props.untargeted] No limit is set, so the track is plain rather than the tint of a limit being approached.
 * @param {boolean} [props.thin] The smaller one, for a gauge inside a row.
 * @param {boolean} [props.negative] Money came back: the fill grows from the right in the danger colour, so a negative reads as a direction and not as a smaller positive.
 */
export function Gauge({ value, over, marker, untargeted = false, thin = false, negative = false, ...rest }) {
	reject(rest, 'Gauge')
	return (
		<span className={join('sp-gauge', untargeted && 'sp-gauge--untargeted', thin && 'sp-gauge--thin')} {...rest}>
			<meter value={value} min="0" max="100" aria-label={rest['aria-label']} />
			<span
				className={join('sp-gauge__fill', over && 'sp-gauge__fill--over', negative && 'sp-gauge__fill--negative')}
				style={{ width: pct(value) }}
			/>
			{over ? <span className="sp-gauge__over" style={{ width: pct(over) }} /> : null}
			{marker !== undefined ? <span className="sp-gauge__marker" style={{ left: pct(marker) }} /> : null}
		</span>
	)
}

/**
 * The marker drawn inline, so a line of text can name what it means.
 */
export function GaugeKey(props) {
	reject(props, 'GaugeKey')
	return <span className="sp-gauge__key" {...props} />
}

const BARS = { default: null, plot: 'sp-bars--plot', spark: 'sp-bars--spark' }

/**
 * A step per column, read against each other. Each column is a button where the
 * chart can be drilled into, and a plain span where it cannot - a column that does
 * nothing must not invite a click.
 *
 *
 *
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {BarsColumn[]} props.columns `height` and `share` are percentages. `segments` splits a column by category; `pair` is two bars read against each other rather than stacked. `from` and `to` are the first and last day the column counts, as ISO dates - a step is a period, and the reader who clicks August wants August's orders, not the string "aug". `label` names a column that cannot be clicked, for a screen reader: "August 2026, 9.840,00 kr., 31 orders". `readout` is the chart tooltip that column shows on hover, focus or a tap - in an answer (Ask 24d), where no column drills in.
 * @param {keyof typeof BARS} [props.variant] `plot` takes the plot frame's height; `spark` is the chart at a stat's size.
 * @param {string} [props.selected] The key of the column the reader drilled into.
 * @param {string} [props.open] The key of the column a finger tapped, whose readout stays open until a tap elsewhere.
 * @param {(key: string, from?: string, to?: string) => void} [props.onSelect] The column's key and the period it covers, in order - reported together the way `RangePicker` reports a range, since a step the reader can drill into is a range. A column with only one end is reported: half a period cannot be filtered on.
 */
export function Bars({ columns = [], variant = 'default', selected, open, onSelect, ...rest }) {
	reject(rest, 'Bars')
	for (const c of columns) {
		if (!!c.from !== !!c.to) console.error(`<Bars> column "${c.key}" has ${c.from ? 'from' : 'to'} without the other: a period is the pair`)
		if (c.from && c.to && c.from > c.to) console.error(`<Bars> column "${c.key}" runs backwards: ${c.from} → ${c.to}`)
	}
	return (
		<span className={join('sp-bars', pick(BARS, variant, 'variant', 'Bars'))} {...rest}>
			{columns.map(column => {
				const body = (
					<>
						{column.segments
							? (
								<span className="sp-bars__stack" style={{ height: pct(column.height) }}>
									{column.segments.map(s => (
										<span className="sp-bars__seg" data-key={s.key} style={{ height: pct(s.share) }} key={s.key} />
									))}
								</span>
							)
							: column.pair
								? (
									<span className="sp-bars__pair">
										{column.pair.map((h, i) => (
											<span className={join('sp-bars__bar', i > 0 && 'sp-bars__bar--muted')} style={{ height: pct(h) }} key={i} />
										))}
									</span>
								)
								: <span className={join('sp-bars__bar', column.muted && 'sp-bars__bar--muted')} style={{ height: pct(column.height) }} />}
						{column.tick ? <span className="sp-bars__tick">{column.tick}</span> : null}
					</>
				)
				if (!onSelect) return (
					<span className="sp-bars__col" tabIndex={column.readout ? 0 : undefined} aria-label={column.label} data-open={open === column.key ? 'true' : undefined} key={column.key}>
						{body}
						{column.readout || null}
					</span>
				)
				return (
					<button
						type="button"
						className="sp-bars__col"
						aria-pressed={selected === column.key ? 'true' : 'false'}
						data-from={column.from}
						data-to={column.to}
						onClick={() => onSelect(column.key, column.from, column.to)}
						key={column.key}
					>
						{body}
					</button>
				)
			})}
		</span>
	)
}

/**
 * What a bar chart needs around it once it is read against a number rather than
 * against its neighbours: a value axis, gridlines, and the limit the bars cross.
 * The plot states its height once and the axis, the grid and the bars take it.
 *
 *
 *
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {string[]} props.axis The values, highest first.
 * @param {number} [props.gridlines] How many rules behind the bars. Default 4.
 * @param {{ at: string }} [props.limit] Where the limit is drawn, in pixels from the plot's top - the axis is what gives it meaning.
 * @param {import('react').ReactNode} props.children The Bars.
 */
export function Plot({ axis = [], gridlines = 4, limit, children, ...rest }) {
	reject(rest, 'Plot')
	return (
		<div className="sp-plot" {...rest}>
			<div className="sp-plot__axis">{axis.map((v, i) => <span key={i}>{v}</span>)}</div>
			<div className="sp-plot__area">
				<div className="sp-plot__grid">
					{Array.from({ length: gridlines }, (unused, i) => <span key={i} />)}
				</div>
				{limit ? <div className="sp-plot__limit" style={{ top: limit.at }}><span>{limit.label}</span></div> : null}
				{children}
			</div>
		</div>
	)
}

/**
 * A figure and what it is. The delta is a saving, so it is an amount and it is
 * green - never a percentage.
 *
 * @param {object} props
 * @param {string} props.figure
 * @param {boolean} [props.large]
 * @param {string} [props.label]
 * @param {import('react').ReactNode} [props.delta]
 */
export function Stat({ figure, large = false, label, delta, ...rest }) {
	reject(rest, 'Stat')
	return (
		<div className="sp-stat" {...rest}>
			{label ? <span className="sp-section-label">{label}</span> : null}
			<span className={join('sp-stat__figure', large && 'sp-stat__figure--large')}>{figure}</span>
			{delta ? <span className="sp-stat__delta">{delta}</span> : null}
		</div>
	)
}

const SUM = { default: null, stacked: 'sp-sum--stacked', total: 'sp-sum--total' }

/**
 * A line of a sum: what it is, and what it comes to. `total` is the last line.
 *
 * @param {object} props
 * @param {keyof typeof SUM} [props.variant]
 * @param {string} props.value
 * @param {import('react').ReactNode} [props.children]
 */
export function Sum({ variant = 'default', value, children, ...rest }) {
	reject(rest, 'Sum')
	return (
		<div className={join('sp-sum', pick(SUM, variant, 'variant', 'Sum'))} {...rest}>
			<span className="sp-grow">{children}</span>
			<span className="sp-sum__value">{value}</span>
		</div>
	)
}


