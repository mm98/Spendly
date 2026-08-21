import { Link } from 'react-router'
import { Icon } from './Icon.jsx'
import { currency } from '../api/format.js'

/* The card, its header band and the hairline between them.

   The header takes `to` when the whole band opens something, and then it needs a label of
   its own: every card header in the app announces "<its own words>, open <destination>",
   so speech recognition can act on what is printed. A header that names only its sub-line
   leaves no spoken phrase that activates the link. README: Accessibility.

   No padding-top override on the body, ever. Two cards carried a 2px one and put the first
   line 4.5px under the hairline against a 14-24px band everywhere else, which reads as a
   rendering fault rather than as a choice. README: Cards. */

const join = (...parts) => parts.filter(Boolean).join(' ')

export function Card({ variant, children, className, ...rest }) {
	return <section className={join('card', variant, className)} {...rest}>{children}</section>
}

export function CardHeader({ title, to, label, onToggle, open, controls, children, className }) {
	const classes = join('card-header', className)
	const body = (
		<>
			<span className="section-label">{title}</span>
			{children}
			{to ? <span className="chevron" aria-hidden="true"><Icon name="chevronRight" /></span> : null}
			{onToggle ? <span className="chevron" aria-hidden="true"><Icon name="chevronDown" /></span> : null}
		</>
	)
	if (to) return <Link className={classes} to={to} data-go={to} aria-label={label || `${title}, open ${to}`}>{body}</Link>
	/* A disclosure band is the nav band with a different destination: the whole band is the
	   control, the same bare chevron sits in the same right-hand slot, pointing down or up
	   instead of right. Never a boxed icon-button riding a passive header -- one band, two
	   verbs (README: Cards, Progressive Disclosure). */
	if (onToggle) {
		return (
			<button type="button" className={classes} onClick={onToggle}
				aria-expanded={open} aria-controls={controls}
				aria-label={label || `${title}, ${open ? 'collapse' : 'expand'}`}>{body}</button>
		)
	}
	return <div className={classes}>{body}</div>
}

export const CardDivider = ({ className }) => <div className={join('card-divider', className)} />

export function CardBody({ variant, children, className, ...rest }) {
	return <div className={join('card-body', variant, className)} {...rest}>{children}</div>
}

export const SectionLabel = ({ children, ...rest }) => <span className="section-label" {...rest}>{children}</span>

/** The label-and-action band that sits above a group of cards rather than inside one. */
export const SectionHeader = ({ children, ...rest }) => <div className="section-header" {...rest}>{children}</div>

/** Statistics' four-across summary tiles. `trend` picks the arrow, `tone` picks the colour,
    and they are separate because spending less is a good down and earning less is not.

    The delta and the note are drawn only when there is one. A tile for the oldest stretch of
    time the records hold has nothing before it to be up or down against, and an arrow with no
    sentence after it is a claim about a comparison that was never made. */
/* A tile carries either `amount` (a figure, printed in the account's currency here) or
   `value` (already a string, because a count is not money). The server used to send the
   money ones pre-rendered with a hardcoded "kr.", which made it the one place deciding how
   an amount looks -- and the wrong one, since the currency belongs to the account. */
export function KpiCard({ label, value, amount, delta, trend = 'up', tone = 'neutral', note }) {
	return (
		<div className="card card-kpi">
			<span>{label}</span>
			<span className="card-kpi-value tabular-figures">{amount == null ? value : currency(amount, 0)}</span>
			{delta ? (
				<span className={join('delta', 'delta-' + tone)}>
					{trend === 'level' ? null : <Icon name={trend === 'down' ? 'trendDown' : 'trendUp'} />}
					<span className="delta-text">{delta}</span>
				</span>
			) : null}
			{note ? <span className="card-kpi-label">{note}</span> : null}
		</div>
	)
}

export function EmptyState({ icon = 'search', children, className, ...rest }) {
	return (
		<div className={join('empty-state', className)} {...rest}>
			{icon ? <span className="empty-state-icon"><Icon name={icon} /></span> : null}
			{children}
		</div>
	)
}

/** The tinted callout used for a verdict on a draft: positive, warning. */
export function Note({ tone = 'positive', title, children, className, ...rest }) {
	return (
		<div className={join('note', 'note-' + tone, className)} {...rest}>
			{title ? <strong>{title}</strong> : null} {children}
		</div>
	)
}
