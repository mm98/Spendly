import { join, pick, reject } from './variants.js'
import { Skeleton } from './Utilities.jsx'

const pct = n => `${Math.max(0, Math.min(100, n))}%`

/** `passed` is a limit already passed, drawn as one full fill in the over colour - the rail's
    and the form's shape, where a list row splits it with `over` (5i). */
export function Gauge({ value, over, marker, untargeted = false, thin = false, negative = false, passed = false, ...rest }) {
	reject(rest, 'Gauge')
	return (
		<span className={join('sp-gauge', untargeted && 'sp-gauge--untargeted', thin && 'sp-gauge--thin')} {...rest}>
			<meter value={value} min="0" max="100" aria-label={rest['aria-label']} />
			<span
				className={join('sp-gauge__fill', (over || passed) && 'sp-gauge__fill--over', negative && 'sp-gauge__fill--negative')}
				{...(passed ? { 'data-fill': '100' } : {})}
				style={{ width: pct(passed ? 100 : value) }}
			/>
			{over ? <span className="sp-gauge__over" style={{ width: pct(over) }} /> : null}
			{marker !== undefined ? <span className="sp-gauge__marker" style={{ left: pct(marker) }} /> : null}
		</span>
	)
}

/** The marker drawn inline, so a line of text can name what it means. */
export function GaugeKey(props) {
	reject(props, 'GaugeKey')
	return <span className="sp-gauge__key" {...props} />
}

const BARS = { default: null, plot: 'sp-bars--plot', spark: 'sp-bars--spark' }

// the columns that have not arrived, as States 6b draws them
const LOADING_BARS = ['40', '56', '46', '68', '60', '82', '74', '96']

export function Bars({ columns = [], variant = 'default', selected, onSelect, loading = false, ...rest }) {
	reject(rest, 'Bars')
	if (loading) return (
		<span className={join('sp-bars', pick(BARS, variant, 'variant', 'Bars'))} {...rest}>
			{LOADING_BARS.map((h, i) => <Skeleton shape="bar" data-h-pc={h} key={i} />)}
		</span>
	)
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
				if (!onSelect) return <span className="sp-bars__col" key={column.key}>{body}</span>
				return (
					<button
						type="button"
						className="sp-bars__col"
						aria-label={column.label}
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

const SERIES = { 1: '1', 2: '2', 3: '3', 4: '4' }

/** The share list a donut is read from (c14), one ShareRow per share. */
export function Shares({ children, ...rest }) {
	reject(rest, 'Shares')
	return <div className="sp-shares" {...rest}>{children}</div>
}

/** One share: its series key, what it is, and its value. A share is a filter, so it is a button. */
export function ShareRow({ series = 1, value, onClick, children, ...rest }) {
	reject(rest, 'ShareRow')
	return (
		<button type="button" className="sp-shares__row" onClick={onClick} {...rest}>
			<span className="sp-legend__key" data-key={pick(SERIES, series, 'series', 'ShareRow')} />
			<span>{children}</span>
			<span className="sp-grow" />
			<span className="sp-shares__value">{value}</span>
		</button>
	)
}

/** What each series of a chart is (c14). Drawn only when a chart has more than one. */
export function Legend({ children, ...rest }) {
	reject(rest, 'Legend')
	return <div className="sp-legend" {...rest}>{children}</div>
}

export function LegendItem({ series = 1, children, ...rest }) {
	reject(rest, 'LegendItem')
	return (
		<span className="sp-legend__item" {...rest}>
			<span className="sp-legend__key" data-key={pick(SERIES, series, 'series', 'LegendItem')} />
			{children}
		</span>
	)
}

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

const STAT_INK = { default: null, success: 'sp-ink-success' }

/** `meta` is the quiet line under the figure that says what it is measured against. */
export function Stat({ figure, large = false, color = 'default', label, delta, meta, ...rest }) {
	reject(rest, 'Stat')
	return (
		<div className="sp-stat" {...rest}>
			{label ? <span className="sp-section-label">{label}</span> : null}
			<span className={join('sp-stat__figure', large && 'sp-stat__figure--large', pick(STAT_INK, color, 'color', 'Stat'))}>{figure}</span>
			{delta ? <span className="sp-stat__delta">{delta}</span> : null}
			{meta ? <span className="sp-meta">{meta}</span> : null}
		</div>
	)
}

const SUM = { default: null, stacked: 'sp-sum--stacked', total: 'sp-sum--total' }
// expected is a figure that is only planned so far (Budget 21a); the other two are a sign
const SUM_TONE = { default: null, expected: 'sp-ink-5', success: 'sp-ink-success', danger: 'sp-ink-danger' }

/** A line of a sum: what it is, and what it comes to. `total` is the last line. */
export function Sum({ variant = 'default', tone = 'default', value, children, ...rest }) {
	reject(rest, 'Sum')
	return (
		<div className={join('sp-sum', pick(SUM, variant, 'variant', 'Sum'))} {...rest}>
			<span className="sp-grow">{children}</span>
			<span className={join('sp-sum__value', pick(SUM_TONE, tone, 'tone', 'Sum'))}>{value}</span>
		</div>
	)
}

