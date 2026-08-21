import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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

/* How many rows a card's list has room for, measured by the list itself -- and only where the
   card has a neighbour to stay level with.

   A card's entry count is one number for the whole app, and cards share grid rows -- so a card
   that spends 138px on a donut before its first row and then draws the same number of rows as
   its neighbour stands taller than the neighbour by exactly the donut. Whatever is above the
   list is not free space; it is space the list does not get.

   Measured, not declared, and measured by the list about itself. A table of "the donut costs 3
   rows, the sparkline costs 2" is a second copy of the layout kept in JavaScript, right until
   someone changes a chart's height or a row's line-height -- both of which have happened here
   -- and then it is a wrong copy that nothing renders and no probe can fail. Worse, it would
   have to name every card. This instead reads its own top against the card body's, and its own
   first row's height: a donut, a sparkline, a headline figure, a caption, a segmented control,
   or any three of them together all measure the same way, and the next thing put above a list
   needs no code at all.

   The two passes settle in one step, because what sits above the list does not depend on how
   long the list is -- cutting the list cannot change the measurement that cut it.

   A number rather than a shortened list, because how a list is shortened is the card's own
   business: most drop the tail, and the category ring cannot -- it is drawn from the same array
   as its rows, so dropping the tail leaves a circle that does not add up to the figure in its
   own middle, and the graphic above the rows has to be built from whatever the rows end up
   being. A component that cut the list itself could not tell the donut what it had done.

   Never below one row. A card reduced to a graphic and nothing else has stopped being a list,
   and the setting offers 1 so that "one example under the headline" can be asked for on purpose
   rather than arrived at by subtraction. */
export function useListBudget(rows) {
	const ref = useRef(null)
	const [budget, setBudget] = useState(rows)

	const measure = useCallback(() => {
		const list = ref.current
		const body = list?.closest('.card-body')
		if (!list || !body) return
		/* The deduction only exists to keep a card level with the card beside it, so a card with
		   nothing beside it does not pay it. Standing alone, a shorter card is not a hole in a
		   row -- it is just a card, and cutting its list to leave room for a neighbour it does
		   not have costs entries and buys nothing. This is the phone case for every card on
		   Home, where the grid is one column and each card is on its own.

		   Read from the layout rather than from a prop, for the same reason the deduction itself
		   is measured: whether a card has a neighbour is a fact about the grid at this width, and
		   a card told once at build time would go on believing it at every other width. */
		const card = body.closest('.card')
		const box = card?.getBoundingClientRect()
		const beside = card && [...document.querySelectorAll('.card')].some(other => {
			if (other === card || card.contains(other) || other.contains(card)) return false
			const r = other.getBoundingClientRect()
			if (!r.height) return false
			const sharesRow = r.top < box.bottom - 1 && r.bottom > box.top + 1
			const sideBySide = r.right <= box.left + 1 || r.left >= box.right - 1
			return sharesRow && sideBySide
		})
		if (!beside) return setBudget(rows)
		/* A row, not the first *child*: an entry list opens with its own heading, so measuring
		   `firstElementChild` measures a 15px label and divides the graphic above by that --
		   the budget then comes out near zero and the card draws one row whatever the setting
		   says. Skip the heading and take the first actual row.

		   The first row, though -- not the last. It used to be the last, and the last row's
		   identity is not fixed: it is `items[budget - 1]`, so it changes every time this
		   function changes budget. Two rows of different height is all that takes to close a
		   loop on itself -- a long name wrapping to two lines where a short one does not is
		   the ordinary case, not a rare one. Budget 6 can measure off a short last row and ask
		   for 7; budget 7 can measure off a tall last row and ask back for 6, forever, which is
		   React's "Maximum update depth exceeded" (error #185) thrown out of exactly this
		   useLayoutEffect, on an account whose real vendor and category names are not all the
		   same length -- a condition demo data with short generated names rarely hits and a
		   resize is not required to trigger, only a width where the two measurements disagree.
		   The first row is `items[0]`: its identity never depends on the budget being computed
		   from it, for any budget from 1 up, so there is no value left for the loop to close
		   on. */
		const row = [...list.children].find(el => !el.classList.contains('list-heading'))
		const rowHeight = row?.getBoundingClientRect().height ?? 0
		if (!rowHeight) return setBudget(rows)
		const above = list.getBoundingClientRect().top - body.getBoundingClientRect().top
			- parseFloat(getComputedStyle(body).paddingTop || 0)
		/* Rounded, not ceiled. Ceiling charges a whole row for any overflow at all, and Top
		   vendors' headline figure and caption come to 58.7px against a 56px row -- 1.05 rows,
		   billed as two, so the card gave up 56px to cover 2.7px and stood a row shorter than
		   the card beside it. Rounding is the answer that minimises what is left over: a card's
		   content lands within half a row of the height it is aiming at, rather than up to a
		   full row under it. */
		const next = Math.max(1, rows - Math.round(Math.max(0, above) / rowHeight))
		setBudget(b => (b === next ? b : next))
	}, [rows])

	useLayoutEffect(measure)
	useEffect(() => {
		const body = ref.current?.closest('.card-body')
		if (!body || !window.ResizeObserver) return
		const ro = new ResizeObserver(measure)
		ro.observe(body)
		return () => ro.disconnect()
	}, [measure])

	return [ref, budget]
}

/* The fold's colour has to be one no entry in the ring is already using, or the segment
   standing for "everything else I did not draw" is the same colour as some real row -- which
   happened immediately: a category actually named "Everything else" is #45524C, and so was the
   fold, so the ring had two identical greys meaning different things. Neutral greys in order
   of preference; the first one not already on screen wins. */
const FOLD_COLOURS = ['#8A968D', '#5B6660', '#A7B0A8', '#6E7A72']

export function foldForRing(entries, foldLabel, max = RING_LEGEND_MAX) {
	const ranked = entries.filter(e => e.spend > 0).sort((a, b) => b.spend - a.spend)
	if (ranked.length <= max) return ranked
	/* `max` is how many rows come back, fold included -- it used to be how many *real* rows came
	   back, so a card given room for seven drew eight and stood a row taller than its neighbour.
	   The fold is a row like any other: it takes a line, an icon and a figure, and the card pays
	   for it out of the same budget. */
	/* At least one real entry survives the fold. A budget of one spends its single row on the
	   fold itself, which draws a ring of one grey segment under a row reading "6 more
	   categories" -- a chart with nothing in it and a legend naming nothing, from a card that
	   was asked for one entry and could have shown the biggest. One over budget is the right
	   trade there; the alternative is a card that says less than nothing. */
	const keep = Math.max(1, max - 1)
	const tail = ranked.slice(keep)
	const head = ranked.slice(0, keep)
	const taken = new Set(head.map(e => String(e.colour).toLowerCase()))
	const colour = FOLD_COLOURS.find(c => !taken.has(c.toLowerCase())) ?? FOLD_COLOURS.at(-1)
	/* The fold carries every field a real entry carries, not just the two the first caller
	   happened to read. It was `{id, name, colour, spend}` because the only thing drawing it was
	   a legend row, which takes its parts as props -- and the first component to receive one of
	   these as a *record* crashed on it, because a category row asks the record for its share
	   and got undefined. A stand-in for N things has to be the same shape as one thing.
	   `share` is the tail's real share, so the row says truthfully what fraction it stands for;
	   the tag is the neutral glyph a group has, since the categories inside it have several. */
	const sum = (field) => tail.reduce((total, e) => total + (e[field] ?? 0), 0)
	return [...head, {
		id: null, name: foldLabel(tail.length), colour, icon: 'tag', iconPath: null,
		spend: sum('spend'), share: sum('share'), saved: sum('saved'), orders: sum('orders')
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
export const Meter = ({ fill, marker, ariaLabel, className, style }) => (
	<div className={['meter', className].filter(Boolean).join(' ')} style={style} role="img" aria-label={ariaLabel}>
		<span className="meter-fill" style={{ width: fill + '%' }} />
		{marker != null ? <span className="meter-marker" style={{ left: marker + '%' }} /> : null}
	</div>
)

/** Seven bars, one per weekday. The peak days are marked by the filled portion alone; the
    track is the same --bg-bar-track as every other day. It used to be an inline lighter
    green, which no theme can reach: a hardcoded style is a light-mode leak, and the dark
    theme rendered it as a pale slab on the busiest day of both rhythm cards. */
/** A bar per weekday, each a share of the busiest one, with its name underneath.

    Same shape as MonthColumns below and for the same reason: the bar sits in a track, and the
    track -- not the column, and not a number chosen in the API -- is the box the percentage
    resolves against. It used to take a pixel height per day and a `field` naming which of two
    identical copies of that height to read, so the chart was exactly as tall as the API had
    decided and the card around it kept whatever was left. */
export const WeekdayBars = ({ days, className, style }) => (
	<div className={['weekday-bars', className].filter(Boolean).join(' ')} style={style} aria-hidden="true">
		{days.map(d => (
			<div key={d.day}>
				<div className="weekday-bars-track">
					<div className="chart-bar" style={{ height: d.share + '%' }}>
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
export const ProgressBar = ({ indeterminate = true, value, label, className, style }) => (
	<div className={['progress-bar', indeterminate && 'progress-bar-indeterminate', className].filter(Boolean).join(' ')}
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
    image (the backend generates both — see src/api/src/lib/images.js); without one, or if it fails
    to load, this falls back to the glyph for the file's own kind, because a PDF invoice drawn
    with a photo glyph is the screen telling the user it read something else. README: Views. */
export const DocumentPreview = ({ kind = 'image', src, className, style, ...rest }) => (
	<div className={[`document-preview document-preview-${kind}`, className].filter(Boolean).join(' ')}
		style={style} aria-hidden="true" {...rest}>
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
