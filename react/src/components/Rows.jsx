import { forwardRef } from 'react'
import { Sep } from './Sep.jsx'
import { Link } from 'react-router'
import { Icon, ImageOrIcon } from './Icon.jsx'
import { currency, percent, plural } from '../api/format.js'
import { inkOn } from '../api/colour.js'

/* Every list row in the app.

   They all share `.data-row` -- one grouped rule owns the display, alignment, gap and
   padding, and each family below declares only its differences. A row family that sets
   those four again is a fifth near-miss with better intentions, and the cascade hides it
   wherever the two happen to agree. README: Data Rows.

   `to` is what makes a row a link. Where it is absent the row is a <div> and announces
   nothing about being actionable, which is the honest rendering of a row that does not go
   anywhere -- three of the four Latest orders rows in the prototype are exactly that. */

const join = (...parts) => parts.filter(Boolean).join(' ')

/** The shell every family below shares: a link when it goes somewhere, a div when it does not. */
function Row({ to, family, children, className, ...rest }) {
	const classes = join('data-row', family, className)
	return to
		? <Link className={classes} to={to} data-go={to} {...rest}>{children}</Link>
		: <div className={classes} {...rest}>{children}</div>
}

const Chevron = () => <span className="chevron"><Icon name="chevronRight" /></span>

/** Vendor and order rows: a mark on the left, two lines of text, an amount on the right. */
export function EntryRow({ avatar, glyph, name, meta, amount, sub, to, children, ...rest }) {
	return (
		<Row to={to} family="entry-list-row" {...rest}>
			{/* The initials are inked from the tile they sit on. The stylesheet says #fff, which is
			    right for the palette that shipped and wrong for any colour the user picks. */}
			{avatar ? (
				<span className="entry-avatar"
					style={{ background: avatar.colour, color: inkOn(avatar.colour) }}>{avatar.initials}</span>
			) : null}
			{glyph ? <span className="entry-glyph"><Icon name={glyph} /></span> : null}
			<div className="entry-text">
				<div className="entry-name">{name}</div>
				{meta ? <div className="entry-meta">{meta}</div> : null}
			</div>
			{sub
				? <div className="amount"><span className="tabular-figures">{amount}</span><div className="entry-amount-sub">{sub}</div></div>
				: amount ? <span className="amount tabular-figures">{amount}</span> : null}
			{children}
			{to ? <Chevron /> : null}
		</Row>
	)
}

/** A category: its own tile colour and glyph, its share of the month, its spend. */
export function CategoryRow({ category, meta, to }) {
	return (
		<Row to={to} family="category-row">
			<span className="category-icon"
				style={{ background: category.colour, color: inkOn(category.colour) }}>
				<Icon name={category.icon} path={category.iconPath} /></span>
			<div>
				<div className="category-row-title">{category.name}</div>
				<div className="category-row-meta">{meta ?? `${percent(category.share)} of expenses`}</div>
			</div>
			<span className="amount tabular-figures">{currency(category.spend, 0)}</span>
			{to ? <Chevron /> : null}
		</Row>
	)
}

/** A line on an order, a line read off a receipt, or a fact in an inset panel.
    `tone` recolours the leading tile where the line is a warning rather than a value. */
export function ItemRow({ icon, iconTone, thumb, thumbSrc, onThumbClick, thumbHref, thumbLabel, handle, title, meta, amount, to, children, ...rest }) {
	return (
		<Row to={to} family="item-row" {...rest}>
			{/* The handle is passed in rather than drawn here: a grip is only honest when
			    something behind it can actually move the row, so the row does not get to draw
			    one on its own. See Reorder.jsx. */}
			{handle}
			{icon ? <span className="item-row-icon" style={iconTone}><Icon name={icon} /></span> : null}
			{/* thumbSrc is a real preview (a thumbnail the backend generated) for the icon named
			    by thumb to fall back to — most callers pass thumb alone and never had bytes to
			    preview in the first place. onThumbClick makes the thumb itself a button that
			    opens the full image, and thumbHref makes it a link to the file, rather than the
			    whole row -- the row's own title and amount are not "open this photo", only the
			    photo is. */}
			{thumb ? (
				thumbHref ? (
					/* A thumb that opens the real file is a link, not a button wearing one: the file
					   lives at a URL, so middle-click, "open in new tab" and the status bar all have
					   to work. README: Honest Affordances. */
					<a className="document-thumb document-thumb-button" href={thumbHref}
						target="_blank" rel="noopener"
						aria-label={thumbLabel ?? `Open ${title ?? 'file'} in a new tab`}>
						<ImageOrIcon src={thumbSrc} icon={thumb} imgClassName="document-thumb-img" />
					</a>
				) : onThumbClick ? (
					<button type="button" className="document-thumb document-thumb-button"
						onClick={onThumbClick} aria-label={thumbLabel ?? `View photo${title ? ` for ${title}` : ''}`}>
						<ImageOrIcon src={thumbSrc} icon={thumb} imgClassName="document-thumb-img" />
					</button>
				) : (
					<span className="document-thumb" aria-hidden="true">
						<ImageOrIcon src={thumbSrc} icon={thumb} imgClassName="document-thumb-img" />
					</span>
				)
			) : null}
			<div>
				<div className="item-row-title">{title}</div>
				{meta ? <div className="item-row-meta">{meta}</div> : null}
			</div>
			{amount ? <span className="amount tabular-figures">{amount}</span> : null}
			{children}
			{to ? <Chevron /> : null}
		</Row>
	)
}

/** The All orders row: vendor, what was in it, where it got to, what it cost. With `action` it
    splits the way EntityRow does -- an <a> cannot hold another, so the name carries the link. */
export function OrderRow({ order, to, action, ...rest }) {
	const vendorName = order.vendor?.name
	const body = (
		<>
			<div className="order-row-identity">
				{order.vendor ? (
					<span className="entry-avatar"
						style={{ background: order.vendor.colour, color: inkOn(order.vendor.colour) }}>{order.vendor.initials}</span>
				) : null}
				<div className="order-row-identity-text">
					<div className="order-row-vendor">
						{action
							? <Link className="row-stretch" to={to} data-go={to} {...rest}>{vendorName}</Link>
							: vendorName}
					</div>
					<div className="order-row-meta">
						{order.dateLabel}<Sep />{plural(order.itemCount, 'item')}
						{order.categories.length ? <><Sep />{order.categories.map(c => c.name).join(', ')}</> : null}
					</div>
				</div>
			</div>
			<span className="chip-status">{order.status}</span>
			{/* The total, then what it saved -- always, including "saved 0,00 kr.". The saved line
			    was drawn only when it was positive, so a row with no saving had a total where
			    every other row had a total and a line under it, and the column changed shape
			    down the list. An absent line is not "nothing saved"; it is a reader wondering
			    whether this row is missing something. README: Data Rows. */}
			<div className="order-row-total tabular-figures">
				{currency(order.total)}
				<div className="order-row-total-saved">saved {currency(order.saved)}</div>
			</div>
		</>
	)

	const chevron = <span className="order-row-chevron"><Icon name="chevronRight" /></span>
	if (action) {
		return (
			<div className="data-row order-row data-row-action" data-go={to}>
				{body}
				<span className="row-inline row-actions">{action}</span>
				{chevron}
			</div>
		)
	}
	return <Row to={to} family="order-row" {...rest}>{body}{chevron}</Row>
}

/** A chart's key, where each entry is also the way into the orders behind it.

    `meta` is a second line under the title, drawn only where there is one to draw: the rows
    that have nothing to add keep the single-line row every other chart's key is, rather than
    every legend in the app growing a blank line so one of them can carry a sentence. */
export function LegendRow({ colour, title, meta, amount, to }) {
	return (
		<Row to={to} family="chart-legend-row">
			<span className="chart-swatch" style={{ background: colour }} />
			{meta ? (
				<span className="chart-legend-row-text">
					<span className="chart-legend-row-title">{title}</span>
					<span className="chart-legend-row-meta">{meta}</span>
				</span>
			) : <span className="chart-legend-row-title">{title}</span>}
			<span className="amount tabular-figures">{amount}</span>
			{to ? <Chevron /> : null}
		</Row>
	)
}

/* A vendor or a category in a long list, with one place to go.

   The record itself is the row: the whole band opens it for editing, the way an order row
   opens the order. Its orders used to be a second link at the end of the row -- a 38px glyph
   with no label on screen, one destination per row that nothing else in the app offers -- and
   they are now where the rest of the record's own actions are, on the record's page: the
   summary rail carries a full-width VIEW ORDERS at the foot of the card the figure is on.
   One row, one destination, and the second one stated in words rather than in a receipt
   glyph. README: Create and Edit. */
/** Wraps a vendor or category's own tile with the small favourite mark, on All vendors and
    All categories only. `children` is the tile at its own size (`.entry-avatar` or
    `.category-icon`); the mark overlaps its corner rather than growing it. A favourite is
    turned on and off from the record's own edit page -- nothing here removes it. */
export function EntityMark({ favourite, children }) {
	return (
		<span className="entity-mark">
			{children}
			{favourite ? <span className="entity-mark-fav" aria-hidden="true"><Icon name="starFilled" /></span> : null}
		</span>
	)
}

export function EntityRow({ mark, name, meta, amount, sub, editTo, action, open }) {
	const body = (
		<>
			{mark}
			<div className="entity-row-text">
				<div className="entity-row-name">
					{open ? (
						<a className="row-stretch" href={open.href} data-go={open.href}
							target="_blank" rel="noopener" aria-label={open.label}>{name}</a>
					) : action ? <Link className="row-stretch" to={editTo} data-go={editTo}>{name}</Link> : name}
				</div>
				{meta ? <div className="entity-row-meta">{meta}</div> : null}
			</div>
			<div className="entity-row-amount tabular-figures">
				{amount}
				{sub ? <div className="entity-row-amount-sub">{sub}</div> : null}
			</div>
		</>
	)

	/* Two destinations, and an <a> cannot hold another <a>: the name carries the row's own and
	   stretches over it, `action` rides on top. The chevron is for a row that opens a page here. */
	if (open || action) {
		return (
			<div className="data-row entity-row data-row-action" data-go={open?.href ?? editTo}>
				{body}
				{action ? <span className="row-inline row-actions">{action}</span> : null}
				{open ? null : <Chevron />}
			</div>
		)
	}
	// No destination, no link and no chevron: an edit form's rail preview draws the row its
	// list draws, inert, for a record that may not exist yet.
	if (!editTo) return <div className="data-row entity-row">{body}</div>
	return (
		<Link className="data-row entity-row" to={editTo} data-go={editTo}>
			{body}
			<Chevron />
		</Link>
	)
}

/** A label and its answer, right-aligned: a figure, a word, a link, a list of them. `variant`
    takes the class words that tone the answer, as Card does. */
export const SummaryRow = ({ label, value, variant, className }) => (
	<div className={join('summary-row', className)}>{label}
		<span className={join('summary-row-value tabular-figures', variant)}>{value}</span></div>
)

/** The bottom line. `estimate` marks a total that is still being built. */
export const SummaryTotal = ({ label = 'Total', value, estimate }) => (
	<div className="summary-total">{label}
		<span className={join('summary-total-value', estimate && 'summary-total-value-estimate', 'tabular-figures')}>{value}</span>
	</div>
)

/** A panel of rows with the recessed background -- item lists, read lines, fact lists.

    It forwards its ref, because a reorderable list has to be able to measure its own rows.
    A ref spread onto a plain function component is silently dropped -- React takes `ref` out
    of the props before the component ever sees it -- so the drag measured an empty list,
    found one row, and moved nothing. Nothing rendered wrongly; the drag just did not work.
    See Reorder.jsx. */
export const InsetPanel = forwardRef(function InsetPanel({ children, ...rest }, ref) {
	return <div className="inset-panel" ref={ref} {...rest}>{children}</div>
})
