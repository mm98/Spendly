import { Link } from 'react-router-dom'
import { Icon } from './Icon.jsx'
import { kr, krRound } from '../api/format.js'

/* Every list row in the app.

   They all share `.data-row` -- one grouped rule owns the display, alignment, gap and
   padding, and each family below declares only its differences. A row family that sets
   those four again is a fifth near-miss with better intentions, and the cascade hides it
   wherever the two happen to agree. README 5.

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
			{avatar ? <span className="entry-avatar" style={{ background: avatar.colour }}>{avatar.initials}</span> : null}
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
			<span className="category-icon" style={{ background: category.colour }}><Icon name={category.icon} /></span>
			<div>
				<div className="category-row-title">{category.name}</div>
				<div className="category-row-meta">{meta ?? `${category.share}% of expenses`}</div>
			</div>
			<span className="amount tabular-figures">{krRound(category.spend)}</span>
			{to ? <Chevron /> : null}
		</Row>
	)
}

/** A line on an order, a line read off a receipt, or a fact in an inset panel.
    `tone` recolours the leading tile where the line is a warning rather than a value. */
export function ItemRow({ icon, iconTone, thumb, grip, title, meta, amount, to, children }) {
	return (
		<Row to={to} family="item-row">
			{grip ? <span className="item-row-grip"><Icon name="grip" /></span> : null}
			{icon ? <span className="item-row-icon" style={iconTone}><Icon name={icon} /></span> : null}
			{thumb ? <span className="document-thumb" style={{ fontSize: 0 }} aria-hidden="true"><Icon name={thumb} /></span> : null}
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
			<div>
				<div className="order-row-vendor">{order.vendor?.name}</div>
				<div className="order-row-meta">
					{order.dateLabel} · {order.itemCount} items · {order.categories.map(c => c.name).join(', ')}
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

/** A panel of rows with the recessed background -- item lists, read lines, fact lists. */
export const InsetPanel = ({ children, ...rest }) => <div className="inset-panel" {...rest}>{children}</div>
