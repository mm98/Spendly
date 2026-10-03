import { useId, useState } from 'react'
import { join, pick, reject } from './variants.js'
import { Skeleton } from './Utilities.jsx'

const pct = n => `${Math.max(0, Math.min(100, n))}%`

/** `passed` is a limit already passed, one full fill in the over colour (5i); a list row splits
    it with `over`. `remainder` is the share of what is not listed, that colour at its width (4d). */
export function Gauge({ value, over, marker, untargeted = false, thin = false, negative = false, passed = false, remainder = false, ...rest }) {
	reject(rest, 'Gauge')
	return (
		<span className={join('sp-gauge', untargeted && 'sp-gauge--untargeted', thin && 'sp-gauge--thin')} {...rest}>
			<meter value={value} min="0" max="100" aria-label={rest['aria-label']} />
			<span
				className={join('sp-gauge__fill', (over || passed || remainder) && 'sp-gauge__fill--over', negative && 'sp-gauge__fill--negative')}
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

/** `selected` is the pressed column: the drilled value, or the month on Home that holds today (10a).
    `tip` is a column's readout on hover or focus; `inert` opens nothing (4d's Other); `named` ticks truncate. */
export function Bars({ columns = [], variant = 'default', selected, onSelect, loading = false, named = false, ...rest }) {
	reject(rest, 'Bars')
	const [peek, setPeek] = useState(null)
	const tipId = useId()
	if (loading) return (
		<span className={join('sp-bars', pick(BARS, variant, 'variant', 'Bars'))} {...rest}>
			{LOADING_BARS.map((h, i) => <Skeleton shape="bar" data-h-pc={h} key={i} />)}
		</span>
	)
	/* A chart's readout stands above its bar, 8 clear of the tallest of that bar and its two
	   neighbours; with no room above, inside the plot's top edge; near the ends, inside the card (4a). */
	const placeTip = el => {
		if (!el || variant !== 'plot') return
		const col = el.parentElement
		const bottom = col.getBoundingClientRect().bottom
		const tops = [col.previousElementSibling, col, col.nextElementSibling].filter(Boolean).map(c => {
			const bar = c.querySelector('.sp-bars__stack, .sp-bars__pair, .sp-bars__bar')
			return bar ? bar.getBoundingClientRect().top : bottom
		})
		el.style.setProperty('--tip-at', `${bottom - Math.min(...tops)}px`)
		if (el.getBoundingClientRect().top < col.parentElement.getBoundingClientRect().top) el.dataset.pin = 'top'
		const card = (el.closest('.sp-card') ?? col.parentElement).getBoundingClientRect()
		const r = el.getBoundingClientRect()
		if (r.left < card.left) el.dataset.side = 'start'
		else if (r.right > card.right) el.dataset.side = 'end'
	}
	for (const c of columns) {
		if (!!c.from !== !!c.to) console.error(`<Bars> column "${c.key}" has ${c.from ? 'from' : 'to'} without the other: a period is the pair`)
		if (c.from && c.to && c.from > c.to) console.error(`<Bars> column "${c.key}" runs backwards: ${c.from} → ${c.to}`)
	}
	return (
		<span className={join('sp-bars', pick(BARS, variant, 'variant', 'Bars'))} {...rest}>
			{columns.map((column, i) => {
				const tip = column.tip && peek === column.key ? column.tip : null
				// a figure card's readout keeps to the side with room: the left half of the card carries it on the right
				const side = variant === 'spark' && i < (columns.length - 1) / 2 ? { 'data-side': 'end' } : {}
				const readout = tip ? <span className="sp-bars__tip" id={tipId} ref={placeTip} {...side}>{tip}</span> : null
				// a figure card's readout hangs above the bar itself, a chart's beside its column (4a)
				const onBar = variant === 'spark'
				const body = (
					<>
						{onBar ? null : readout}
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
								: <span className={join('sp-bars__bar', column.muted && 'sp-bars__bar--muted')} style={{ height: pct(column.height) }}>{onBar ? readout : null}</span>}
						{column.tick ? <span className={join('sp-bars__tick', named && 'sp-truncate')}>{column.tick}</span> : null}
					</>
				)
				// the readout follows the pointer and the keyboard alike, and Escape puts it away
				const peeking = column.tip
					? {
						onPointerEnter: () => setPeek(column.key),
						onPointerLeave: () => setPeek(was => (was === column.key ? null : was)),
						onFocus: () => setPeek(column.key),
						onBlur: () => setPeek(was => (was === column.key ? null : was)),
						onKeyDown: ev => { if (ev.key === 'Escape' && peek === column.key) { ev.stopPropagation(); setPeek(null) } },
						...(tip ? { 'aria-describedby': tipId } : {})
					}
					: {}
				if (!onSelect || column.inert) {
					// an inert column among buttons is read by its label, as a picture is
					const read = column.inert && column.label ? { role: 'img', 'aria-label': column.label } : {}
					return <span className="sp-bars__col" key={column.key} {...read} {...peeking}>{body}</span>
				}
				return (
					<button
						type="button"
						className="sp-bars__col"
						aria-label={column.label}
						{...(selected === undefined ? {} : { 'aria-pressed': selected === column.key ? 'true' : 'false' })}
						{...peeking}
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

/** A chart step's readout (c18, the tooltip as a panel): its name and total, a row per series
    drawn, and a line under them. Bars hangs it beside the column it reads. */
export function ChartTip({ title, value, rows = [], note, ...rest }) {
	reject(rest, 'ChartTip')
	return (
		<span className="sp-tip sp-tip--panel" role="tooltip" {...rest}>
			<span className="sp-tip__head"><span className="sp-truncate">{title}</span><span className="sp-nowrap">{value}</span></span>
			{rows.map(row => (
				<span className="sp-tip__row" key={row.key}>
					<span className="sp-legend__key" data-key={pick(SERIES, row.series, 'series', 'ChartTip')} />
					<span className="sp-truncate">{row.name}</span>
					<span>{row.value}</span>
				</span>
			))}
			{note ? <span className="sp-meta">{note}</span> : null}
		</span>
	)
}

const RING = { 1: 'var(--green)', 2: 'var(--green-3)', 3: 'var(--green-4)', 4: 'var(--green-5)' }

/** The ring a share list is read from (c14, 4a): a slice per share in that share's series key, and
    the whole named in its hole. `loading` holds its place before the shares arrive. */
export function Donut({ shares = [], figure, label, loading = false, ...rest }) {
	reject(rest, 'Donut')
	let at = 0
	const stops = shares.map(s => {
		const from = at
		at += Math.max(0, s.value)
		return `${RING[pick(SERIES, s.series, 'series', 'Donut')]} ${pct(from)} ${pct(at)}`
	})
	const background = loading ? 'var(--line-2)' : stops.length ? `conic-gradient(${stops.join(', ')})` : undefined
	return (
		<div className="sp-donut" {...(loading ? { 'aria-hidden': 'true' } : { role: 'img' })} style={{ background }} {...rest}>
			<div className="sp-donut__hole">
				{loading
					? null
					: (
						<>
							<span className="sp-donut__figure">{figure}</span>
							{label ? <span className="sp-meta">{label}</span> : null}
						</>
					)}
			</div>
		</div>
	)
}

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
			<span className="sp-truncate">{children}</span>
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

/** `series="limit"` is the plot's limit line, named here rather than on the line (4a). */
export function LegendItem({ series = 1, children, ...rest }) {
	reject(rest, 'LegendItem')
	return (
		<span className="sp-legend__item" {...rest}>
			{series === 'limit'
				? <span className="sp-legend__key sp-legend__key--limit" />
				: <span className="sp-legend__key" data-key={pick(SERIES, series, 'series', 'LegendItem')} />}
			<span className="sp-truncate">{children}</span>
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
				{limit ? <div className="sp-plot__limit" style={{ top: limit.at }} aria-hidden="true" /> : null}
				{children}
			</div>
		</div>
	)
}

// zero is a figure that holds nothing, a saving of 0 above all: it stays grey
const STAT_INK = { default: null, success: 'sp-ink-success', zero: 'sp-ink-5' }

const HELP_INK = { default: null, warning: 'warning', success: 'success', danger: 'danger' }

/** `meta` is the quiet line under the figure that says what it is measured against; `help` is the
    same line said as a field's help, which a drilled figure uses for its share of the level above (4b). */
export function Stat({ figure, large = false, color = 'default', label, delta, meta, help, helpColor = 'default', ...rest }) {
	reject(rest, 'Stat')
	return (
		<div className="sp-stat" {...rest}>
			{label ? <span className="sp-section-label">{label}</span> : null}
			<span className={join('sp-stat__figure', large && 'sp-stat__figure--large', pick(STAT_INK, color, 'color', 'Stat'))}>{figure}</span>
			{delta ? <span className="sp-stat__delta">{delta}</span> : null}
			{meta ? <span className="sp-meta">{meta}</span> : null}
			{help
				? <span className="sp-field__help" {...(helpColor === 'default' ? {} : { 'data-color': pick(HELP_INK, helpColor, 'helpColor', 'Stat') })}>{help}</span>
				: null}
		</div>
	)
}

const SUM = { default: null, stacked: 'sp-sum--stacked', total: 'sp-sum--total' }
// expected is a figure that is only planned so far (Budget 21a); the other two are a sign
const SUM_TONE = { default: null, expected: 'sp-ink-5', success: 'sp-ink-success', danger: 'sp-ink-danger' }

/** What a summary is about (c21), and as a card that opens it (Order create 3a): its mark, its
    name, one line under it, and the card's chevron when the card is a link. */
export function SumHead({ mark, title, subtitle, chevron, ...rest }) {
	reject(rest, 'SumHead')
	return (
		<span className="sp-sum-head" {...rest}>
			{mark}
			<span className="sp-alert__body">
				<span className="sp-title">{title}</span>
				{subtitle ? <span className="sp-subtitle">{subtitle}</span> : null}
			</span>
			{chevron ? <span className="sp-card__chevron">{chevron}</span> : null}
		</span>
	)
}

/** A line of a sum: what it is, and what it comes to. `total` is the last line. A `named` line is
    a name the reader typed, which ends in an ellipsis rather than wrapping. */
export function Sum({ variant = 'default', tone = 'default', named = false, value, children, ...rest }) {
	reject(rest, 'Sum')
	return (
		<div className={join('sp-sum', pick(SUM, variant, 'variant', 'Sum'))} {...rest}>
			<span className={join('sp-ink-2', named && 'sp-grow sp-truncate')}>{children}</span>
			<span className={join('sp-sum__value', pick(SUM_TONE, tone, 'tone', 'Sum'))}>{value}</span>
		</div>
	)
}

