import { forwardRef } from 'react'
import { Link } from 'react-router'
import { Icon, ImageOrIcon } from './Icon.jsx'
import { kr, krRound, percent } from '../api/format.js'
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
export function EntryRow({ avatar, glyph, name, meta, amount, sub, to, children }) {
	return (
		<Row to={to} family="entry-list-row">
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
			<span className="amount tabular-figures">{krRound(category.spend)}</span>
			{to ? <Chevron /> : null}
		</Row>
	)
}

/** A line on an order, a line read off a receipt, or a fact in an inset panel.
    `tone` recolours the leading tile where the line is a warning rather than a value. */
export function ItemRow({ icon, iconTone, thumb, thumbSrc, onThumbClick, handle, title, meta, amount, to, children, ...rest }) {
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
			    opens the full image, rather than the whole row -- the row's own title and amount
			    are not "open this photo", only the photo is. */}
			{thumb ? (
				onThumbClick ? (
					<button type="button" className="document-thumb document-thumb-button" style={{ fontSize: 0 }}
						onClick={onThumbClick} aria-label={`View photo${title ? ` for ${title}` : ''}`}>
						<ImageOrIcon src={thumbSrc} icon={thumb} imgClassName="document-thumb-img" />
					</button>
				) : (
					<span className="document-thumb" style={{ fontSize: 0 }} aria-hidden="true">
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

/** The All orders row: vendor, what was in it, where it got to, what it cost. */
export function OrderRow({ order, to }) {
	return (
		<Row to={to} family="order-row">
			<div className="order-row-identity">
				{order.vendor ? (
					<span className="entry-avatar"
						style={{ background: order.vendor.colour, color: inkOn(order.vendor.colour) }}>{order.vendor.initials}</span>
				) : null}
				<div className="order-row-identity-text">
					<div className="order-row-vendor">{order.vendor?.name}</div>
					<div className="order-row-meta">
						{order.dateLabel} · {order.itemCount} items · {order.categories.map(c => c.name).join(', ')}
					</div>
				</div>
			</div>
			<span className="chip-status">{order.status}</span>
			<div className="order-row-total tabular-figures">
				{kr(order.total)}
				{order.saved > 0 ? <div className="order-row-total-saved">saved {kr(order.saved)}</div> : null}
			</div>
			<span className="order-row-chevron"><Icon name="chevronRight" /></span>
		</Row>
	)
}

/** A chart's key, where each entry is also the way into the orders behind it. */
export function LegendRow({ colour, title, amount, to }) {
	return (
		<Row to={to} family="chart-legend-row">
			<span className="chart-swatch" style={{ background: colour }} />
			<span className="chart-legend-row-title">{title}</span>
			<span className="amount tabular-figures">{amount}</span>
			{to ? <Chevron /> : null}
		</Row>
	)
}

/* A vendor or a category in a long list, with two places to go.

   The record itself is the row: the whole band opens it for editing, the way an order row
   opens the order. Its orders are the other thing anyone wants from a category called Health,
   and that is a different destination -- so it is a second link at the end of the row rather
   than a second meaning for the first one.

   Two links, not a link inside a link: Row renders an <a> when it is given `to`, and nesting
   one anchor in another is invalid and lands the click wherever the browser decides. They are
   siblings under one bordered strip, which is what makes them read as a single row. */
export function EntityRow({ mark, name, meta, amount, sub, editTo, ordersTo, ordersLabel }) {
	return (
		<div className="entity-row">
			<Link className="data-row entity-row-main" to={editTo} data-go={editTo}>
				{mark}
				<div className="entity-row-text">
					<div className="entity-row-name">{name}</div>
					{meta ? <div className="entity-row-meta">{meta}</div> : null}
				</div>
				<div className="entity-row-amount tabular-figures">
					{amount}
					{sub ? <div className="entity-row-amount-sub">{sub}</div> : null}
				</div>
				<Chevron />
			</Link>
			<Link className="entity-row-orders" to={ordersTo} data-go={ordersTo} aria-label={ordersLabel}>
				<Icon name="receipt" />
			</Link>
		</div>
	)
}

/** One line of a summary panel. Values are figures, so they take the tabular face. */
export const SummaryRow = ({ label, value, className }) => (
	<div className={join('summary-row', className)}>{label}<span className="summary-row-value tabular-figures">{value}</span></div>
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
