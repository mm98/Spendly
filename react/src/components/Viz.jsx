import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ImageOrIcon } from './Icon.jsx'
import { IconButton } from './Button.jsx'

/* The small visualisations drawn in CSS rather than by the chart library: the meter and the
   two progress indicators, plus the document preview, the lightbox, and the data-shaping
   helpers the ring cards share. Everything Recharts draws lives in Chart.jsx, so a page that
   only needs a progress bar or a thumbnail never loads the charts chunk. */

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

/** Spend against a projection, with a marker where the previous month ended. */
export const Meter = ({ fill, marker, ariaLabel, className, style }) => (
	<div className={['meter', className].filter(Boolean).join(' ')} style={style} role="img" aria-label={ariaLabel}>
		<span className="meter-fill" style={{ width: fill + '%' }} />
		{marker != null ? <span className="meter-marker" style={{ left: marker + '%' }} /> : null}
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
    image (the backend generates both — see api/src/lib/images.js); without one, or if it fails
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
