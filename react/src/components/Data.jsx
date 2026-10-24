import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { join, pick, reject } from './variants.js'
import { Skeleton } from './Utilities.jsx'
import { count, useStill } from './motion.js'

const pct = n => `${Math.max(0, Math.min(100, n))}%`

/* Counts a changed figure in its own digit slots, so separators and currency stay put and the last
   frame is the formatted figure; the first value, a non-text figure and reduced motion show as is. */
function useCounted(figure) {
	const [shown, setShown] = useState(figure)
	const last = useRef(figure)
	const still = useStill()
	useEffect(() => {
		const from = digitsOf(last.current), to = digitsOf(figure)
		last.current = figure
		if (from === null || to === null || from === to) { setShown(figure); return }
		// Motion counts over twice --motion-in on the way-in curve; the last frame is the formatted figure
		return count(from, to, still, n => setShown(n === to ? figure : intoSlots(String(figure), Math.round(n))))
	}, [figure, still])
	return shown
}
const digitsOf = v => {
	if (typeof v !== 'string' && typeof v !== 'number') return null
	const d = String(v).replace(/\D/g, '')
	return d ? Number(d) : null
}
// writes n into the figure's digit slots from the right, dropping leading slots it does not need;
// a figure ending in two decimals keeps them and the digit before them
function intoSlots(figure, n) {
	const run = figure.match(/\d[\d.,\s\u00a0]*\d|\d/)
	if (!run) return figure
	const chars = [...run[0]]
	const decimals = /[.,]\d{2}$/.test(run[0]) ? 2 : 0
	let digits = String(Math.abs(n)).padStart(decimals + 1, '0')
	const out = []
	for (let i = chars.length - 1; i >= 0; i--) {
		if (/\d/.test(chars[i])) {
			if (!digits.length) break
			out.unshift(digits.at(-1))
			digits = digits.slice(0, -1)
		} else if (digits.length) out.unshift(chars[i])
	}
	if (digits.length) out.unshift(digits)
	return figure.slice(0, run.index) + out.join('') + figure.slice(run.index + run[0].length)
}

/** `passed` is a limit already passed, one full fill in the over colour (5i); a list row splits
    it with `over`. `remainder` is the share of what is not listed, that colour at its width (4d).
    @param {object} props
    @param {number} props.value the fill, 0 to 100
    @param {number} [props.over] the part past the limit, 0 to 100
    @param {number} [props.marker] where the marker stands, 0 to 100
    @param {boolean} [props.untargeted] No limit is set, so the track is plain rather than the tint of a limit being approached.
    @param {boolean} [props.thin] The smaller one, for a gauge inside a row.
    @param {boolean} [props.negative] Money came back: the fill grows from the right, in red.
    @param {boolean} [props.passed] The limit is already passed: one full fill in the over colour.
    @param {boolean} [props.remainder] The share of what is not listed: drawn in that colour at its width. */
export function Gauge({ value, over, marker, untargeted = false, thin = false, negative = false, passed = false, remainder = false, ...rest }) {
	reject(rest, 'Gauge')
	return (
		<span className={join('sp-gauge', untargeted && 'sp-gauge--untargeted', thin && 'sp-gauge--thin')} {...rest}>
			<meter value={value} min="0" max="100" aria-label={rest['aria-label']} />
			<span
				className={join('sp-gauge__fill', (over || passed || remainder) && 'sp-gauge__fill--over', negative && 'sp-gauge__fill--negative')}
				// a full fill ends where the track does, so its tip is rounded as the track's is
				{...(passed || (value >= 100 && !over) ? { 'data-fill': '100' } : {})}
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

const BARS = { default: null, plot: 'sp-bars--plot', card: 'sp-bars--plot sp-bars--card', spark: 'sp-bars--spark' }

// the columns that have not arrived, as States 6b draws them
const LOADING_BARS = ['40', '56', '46', '68', '60', '82', '74', '96']

/** Labels stand a step apart from the first bar, and the last is always labelled (c14): the smallest step
    keeping `--sp-16` x 3 clear, one dividing the span where one does, else one leaving a last gap of half or more. */
function stepOf(span, least) {
	if (least <= 1) return 1
	for (let k = least; k < least * 2; k++) if (span % k === 0) return k
	for (let k = least; ; k++) if (span % k === 0 || span % k >= k / 2) return k
}

function useTickStep(box, columns, skip) {
	const [step, setStep] = useState(1)
	const ticks = columns.map(c => c.tick ?? '').join('\n')
	useLayoutEffect(() => {
		const el = box.current
		if (!el || skip) return
		const pen = document.createElement('canvas').getContext('2d')
		const fit = () => {
			const cols = el.querySelectorAll(':scope > .sp-bars__col')
			const tick = el.querySelector('.sp-bars__tick')
			if (cols.length < 2 || !tick) return setStep(1)
			const pitch = cols[1].getBoundingClientRect().left - cols[0].getBoundingClientRect().left
			const look = getComputedStyle(tick)
			pen.font = `${look.fontWeight} ${look.fontSize} ${look.fontFamily}`
			const widest = Math.max(...ticks.split('\n').map(t => pen.measureText(t).width))
			const clear = 3 * (parseFloat(look.getPropertyValue('--sp-16')) || 0)
			setStep(pitch > 0 ? stepOf(cols.length - 1, Math.ceil((widest + clear) / pitch)) : 1)
		}
		fit()
		document.fonts?.ready.then(fit)
		const watch = new ResizeObserver(fit)
		watch.observe(el)
		return () => watch.disconnect()
	}, [box, ticks, skip])
	return step
}

/** @typedef {{ key: string, height?: number, tick?: string, label?: string, from?: string, to?: string,
    muted?: boolean, future?: boolean, inert?: boolean, pair?: number[], segments?: { key: string, share: number }[],
    tip?: import('react').ReactNode, readout?: import('react').ReactNode }} BarsColumn */

/** `selected` is the pressed column: the drilled value, or the month on Home that holds today (10a).
    `tip` is a column's readout on hover or focus; `inert` opens nothing (4d's Other); `future` is a step still to come;
    A `card` variant is the plot at a card's height (10a); `days` is one bar per day (4g). A column that opens
    nothing may carry `readout`, its chart tooltip, and `label`, its name for a screen reader; `open` is the
    column a finger tapped, whose readout stays until a tap elsewhere (Ask 24d).
    @param {object} props
    @param {BarsColumn[]} [props.columns] The columns, in order. Each has a key, a label, a height in percent, and may be split in parts or paired.
    @param {keyof typeof BARS} [props.variant] `default`; `plot` takes the plot frame's height; `card` the height of a card; `spark` is the chart at a figure's size.
    @param {boolean} [props.days] One bar per day.
    @param {string} [props.selected] The key of the column the reader drilled into.
    @param {string} [props.open] The key of the column a finger tapped, whose readout stays open until a tap elsewhere.
    @param {(key: string, from?: string, to?: string) => void} [props.onSelect]
    @param {boolean} [props.loading] Draw grey placeholder bars while the figures load.
    @param {import('react').Ref<HTMLDivElement>} [props.ref] */
export function Bars({ columns = [], variant = 'default', days = false, selected, open, onSelect, loading = false, ref, ...rest }) {
	reject(rest, 'Bars')
	const [peek, setPeek] = useState(null)
	const tipId = useId()
	const box = useRef(null)
	const step = useTickStep(box, columns, loading)
	const hold = el => {
		box.current = el
		if (typeof ref === 'function') ref(el)
		else if (ref) ref.current = el
	}
	if (loading) return (
		<span className={join('sp-bars', pick(BARS, variant, 'variant', 'Bars'), days && 'sp-bars--days')} ref={hold} {...rest}>
			{LOADING_BARS.map((h, i) => <Skeleton shape="bar" data-h-pc={h} key={i} />)}
		</span>
	)
	/* A chart's readout stands above its bar, 8 clear of the tallest of that bar and its two
	   neighbours, even above the chart: a readout is never held inside its container; near the ends, inside the card (4a). */
	const placeTip = el => {
		if (!el || (variant !== 'plot' && variant !== 'card')) return
		const col = el.parentElement
		const bottom = col.getBoundingClientRect().bottom
		const tops = [col.previousElementSibling, col, col.nextElementSibling].filter(Boolean).map(c => {
			const bar = c.querySelector('.sp-bars__stack, .sp-bars__pair, .sp-bars__bar')
			return bar ? bar.getBoundingClientRect().top : bottom
		})
		el.style.setProperty('--tip-at', `${bottom - Math.min(...tops)}px`)
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
		<span className={join('sp-bars', pick(BARS, variant, 'variant', 'Bars'), days && 'sp-bars--days')} ref={hold} {...rest}>
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
						{column.future && !onBar
							? null
							: column.segments
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
									: <span className={join('sp-bars__bar', column.muted && 'sp-bars__bar--muted')} style={{ height: pct(column.height) }} {...(column.future ? { 'data-future': '' } : {})}>{onBar ? readout : null}</span>}
						{column.tick ? <span className="sp-bars__tick">{i % step && i < columns.length - 1 ? null : column.tick}</span> : null}
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
				// a column that opens nothing still shows its readout on hover, focus or a tap (Ask 24d); `open` is the tapped one
				if (!onSelect && column.readout) return (
					<span className="sp-bars__col" tabIndex={0} aria-label={column.label} data-open={open === column.key ? 'true' : undefined} key={column.key}>
						{body}
						{column.readout}
					</span>
				)
				if (!onSelect || column.inert) {
					// an inert column among buttons is read by its label, as a picture is
					const read = column.inert && column.label ? { role: 'img', 'aria-label': column.label } : {}
					return <span className="sp-bars__col" key={column.key} {...read} {...peeking} {...(column.future ? { 'data-future': '' } : {})}>{body}</span>
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
    drawn, and a line under them. Bars hangs it beside the column it reads.
    @param {object} props
    @param {string} props.title The step's name, such as a month.
    @param {string} [props.value] The step's total.
    @param {{ key: string, name: string, series: keyof typeof SERIES, value: string }[]} [props.rows] One row per series drawn: its name, its colour and its value.
    @param {import('react').ReactNode} [props.note] A line under the rows, such as 12 orders. */
export function ChartTip({ title, value, rows = [], note, ...rest }) {
	reject(rest, 'ChartTip')
	return (
		<span className="sp-tip sp-tip--panel" role="tooltip" {...rest}>
			<span className="sp-tip__head"><span className="sp-truncate">{title}</span><span className="sp-nowrap">{value}</span></span>
			{rows.map(row => (
				<span className="sp-tip__row" key={row.key}>
					{/* a row with no series, such as an order count, has no key */}
					{row.series === undefined ? null : <span className="sp-legend__key" data-key={pick(SERIES, row.series, 'series', 'ChartTip')} />}
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
    the whole named in its hole. `loading` holds its place before the shares arrive.
    @param {object} props
    @param {{ series: keyof typeof SERIES, value: number }[]} [props.shares] The slices: each one's series colour and its value.
    @param {string} [props.figure] The figure in the ring's hole, such as the total.
    @param {string} [props.label] What the figure is, under it.
    @param {boolean} [props.loading] Hold the ring's place before the shares arrive. */
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

/** The share list a donut is read from (c14), one ShareRow per share.
    @param {object} props
    @param {import('react').ReactNode} [props.children] One ShareRow for each share. */
export function Shares({ children, ...rest }) {
	reject(rest, 'Shares')
	return <div className="sp-shares" {...rest}>{children}</div>
}

/** One share: its series key, what it is, its `amount` when shown, and its value. A share is a filter, so it
    is a button; in an answer it opens its orders, so it is a link to `href` (Ask 24d).
    @param {object} props
    @param {keyof typeof SERIES} [props.series] The series colour, 1 to 4.
    @param {string} props.value The share, such as 42 %.
    @param {string} [props.amount] The amount, when it is shown.
    @param {string} [props.href] In an answer: the address of the share's orders. The row is then a link.
    @param {() => void} [props.onClick]
    @param {import('react').ReactNode} [props.children] What the share is. */
export function ShareRow({ series = 1, value, amount, href, onClick, children, ...rest }) {
	reject(rest, 'ShareRow')
	const body = (
		<>
			<span className="sp-legend__key" data-key={pick(SERIES, series, 'series', 'ShareRow')} />
			<span className="sp-truncate">{children}</span>
			<span className="sp-grow" />
			{amount === undefined ? null : <span className="sp-amount">{amount}</span>}
			<span className="sp-shares__value">{value}</span>
		</>
	)
	if (href) return <a className="sp-shares__row" href={href} onClick={onClick} {...rest}>{body}</a>
	// a share that opens nothing does not invite a click
	if (!onClick) return <div className="sp-shares__row" {...rest}>{body}</div>
	return <button type="button" className="sp-shares__row" onClick={onClick} {...rest}>{body}</button>
}

/** What each series of a chart is (c14). Drawn only when a chart has more than one.
    @param {object} props
    @param {import('react').ReactNode} [props.children] One LegendItem for each series. */
export function Legend({ children, ...rest }) {
	reject(rest, 'Legend')
	return <div className="sp-legend" {...rest}>{children}</div>
}

/** `series="limit"` is the plot's limit line, named here rather than on the line (4a).
    @param {object} props
    @param {keyof typeof SERIES | 'limit'} [props.series] The series colour, 1 to 4, or `limit` for the limit line.
    @param {import('react').ReactNode} [props.children] What the series is. */
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

/** @param {object} props
    @param {string[]} [props.axis] The values, highest first.
    @param {number} [props.gridlines] How many rules behind the bars.
    @param {{ at: string }} [props.limit] Where the limit line is drawn, from the top of the plot.
    @param {import('react').ReactNode} [props.children] The Bars. */
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
    same line said as a field's help, which a drilled figure uses for its share of the level above (4b).
    `bare` sets the parts straight in what holds the figure, a card or a row, with no box of their
    own. A card's name is its CardHeader (4a), so a bare figure's label is only ever the quiet line
    a phone tile names it with (7a).
    @param {object} props
    @param {string} props.figure The figure, written out, such as 12.400 kr.
    @param {boolean} [props.large] Draw the figure at the large size.
    @param {keyof typeof STAT_INK} [props.color] The figure's colour: `default`, `success` (green), or `zero` (grey).
    @param {string} [props.label] The grey line that names the figure on a phone tile.
    @param {import('react').ReactNode} [props.delta] How the figure moved, such as +4 %.
    @param {import('react').ReactNode} [props.meta] The grey line under the figure: what it is measured against.
    @param {import('react').ReactNode} [props.help] The same line written as a field's hint, such as a drilled figure's share of the level above.
    @param {keyof typeof HELP_INK} [props.helpColor] The hint's colour: `default`, `warning`, `success` or `danger`.
    @param {boolean} [props.bare] No box of its own: the parts sit straight in the card or row that holds them. */
export function Stat({ figure, large = false, color = 'default', label, delta, meta, help, helpColor = 'default', bare = false, ...rest }) {
	reject(rest, 'Stat')
	const counted = useCounted(figure)
	const parts = (
		<>
			{label ? <span className={bare ? 'sp-meta' : 'sp-section-label'}>{label}</span> : null}
			<span className={join('sp-stat__figure', large && 'sp-stat__figure--large', pick(STAT_INK, color, 'color', 'Stat'))}>{counted}</span>
			{delta ? <span className="sp-stat__delta">{delta}</span> : null}
			{meta ? <span className="sp-meta">{meta}</span> : null}
			{help
				? <span className="sp-field__help" {...(helpColor === 'default' ? {} : { 'data-color': pick(HELP_INK, helpColor, 'helpColor', 'Stat') })}>{help}</span>
				: null}
		</>
	)
	return bare ? parts : <div className="sp-stat" {...rest}>{parts}</div>
}

const SUM = { default: null, stacked: 'sp-sum--stacked', total: 'sp-sum--total' }
// expected is a figure that is only planned so far (Budget 21a); the other two are a sign
const SUM_TONE = { default: null, expected: 'sp-ink-5', success: 'sp-ink-success', danger: 'sp-ink-danger' }

/** What a summary is about (c21), and as a card that opens it (Order create 3a): its mark, its
    name, one line under it, and the card's chevron when the card is a link.
    @param {object} props
    @param {import('react').ReactNode} [props.mark] The mark at the start.
    @param {string} props.title What the summary is about.
    @param {string} [props.subtitle] One line under it.
    @param {import('react').ReactNode} [props.chevron] An arrow at the end, when the card opens it. */
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
    a name the reader typed, which ends in an ellipsis rather than wrapping. An `edits` line opens its
    amount in place when pressed, and shows it under the pointer (Budget 21a); `meta` is the line under its name.
    @param {object} props
    @param {keyof typeof SUM} [props.variant] `default`; `stacked` puts the amount under the name; `total` is the last line.
    @param {keyof typeof SUM_TONE} [props.tone] The amount's colour: `default`, `expected` (grey), `success` or `danger`.
    @param {boolean} [props.named] A name the reader typed: it ends in an ellipsis rather than wrapping.
    @param {boolean} [props.edits] Pressing the line opens its amount for editing in place.
    @param {import('react').ReactNode} [props.meta] The grey line under the name.
    @param {import('react').ReactNode} props.value What the line comes to: written out, or a part such as a link to the vendor, the categories, a note's well or a loading line.
    @param {import('react').ReactNode} [props.children] What the line is. */
export function Sum({ variant = 'default', tone = 'default', named = false, edits = false, meta, value, children, ...rest }) {
	reject(rest, 'Sum')
	const counted = useCounted(value)
	// a line typed into is a title stack, the row's own child: the touch rule cuts its name there (7a)
	const name = edits || meta
		? <span className="sp-stacked"><span className="sp-ink-2">{children}</span>{meta ? <span className="sp-meta">{meta}</span> : null}</span>
		: <span className={join('sp-ink-2', named && 'sp-grow sp-truncate')}>{children}</span>
	return (
		<div className={join('sp-sum', pick(SUM, variant, 'variant', 'Sum'), edits && 'sp-sum--edits')} {...rest}>
			{name}
			<span className={join('sp-sum__value', pick(SUM_TONE, tone, 'tone', 'Sum'))}>{counted}</span>
		</div>
	)
}

