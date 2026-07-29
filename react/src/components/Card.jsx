import { Link } from 'react-router-dom'
import { Icon } from './Icon.jsx'

/* The card, its header band and the hairline between them.

   The header takes `to` when the whole band opens something, and then it needs a label of
   its own: every card header in the app announces "<its own words>, open <destination>",
   so speech recognition can act on what is printed. A header that names only its sub-line
   leaves no spoken phrase that activates the link. S18.

   No padding-top override on the body, ever. Two cards carried a 2px one and put the first
   line 4.5px under the hairline against a 14-24px band everywhere else, which reads as a
   rendering fault rather than as a choice. README 10. */

const join = (...parts) => parts.filter(Boolean).join(' ')

export function Card({ variant, children, className, ...rest }) {
	return <section className={join('card', variant, className)} {...rest}>{children}</section>
}

export function CardHeader({ title, to, label, children, className }) {
	const classes = join('card-header', className)
	const body = (
		<>
			<span className="section-label">{title}</span>
			{children}
			{to ? <span className="chevron" aria-hidden="true"><Icon name="chevronRight" /></span> : null}
		</>
	)
	return to
		? <Link className={classes} to={to} data-go={to} aria-label={label || `${title}, open ${to}`}>{body}</Link>
		: <div className={classes}>{body}</div>
}

export const CardDivider = ({ className }) => <div className={join('card-divider', className)} />

export function CardBody({ variant, children, className, ...rest }) {
	return <div className={join('card-body', variant, className)} {...rest}>{children}</div>
}

export const SectionLabel = ({ children, ...rest }) => <span className="section-label" {...rest}>{children}</span>

/** The label-and-action band that sits above a group of cards rather than inside one. */
export const SectionHeader = ({ children, ...rest }) => <div className="section-header" {...rest}>{children}</div>

/** Statistics' four-across summary tiles. `trend` picks the arrow, `tone` picks the colour,
    and they are separate because spending less is a good down and earning less is not. */
export function KpiCard({ label, value, delta, trend = 'up', tone = 'neutral', note }) {
	return (
		<div className="card card-kpi">
			<span>{label}</span>
			<span className="card-kpi-value tabular-figures">{value}</span>
			<span className={join('delta', 'delta-' + tone)}>
				<Icon name={trend === 'down' ? 'trendDown' : 'trendUp'} />{delta}
			</span>
			<span className="card-kpi-label">{note}</span>
		</div>
	)
}

/** The pale prompt card: a label, a question, and one way to answer it. */
export function QuestionCard({ label, title, children }) {
	return (
		<div className="card card-question">
			<span className="card-question-label">{label}</span>
			<div className="card-question-title">{title}</div>
			{children}
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
export function Note({ tone = 'positive', title, children, ...rest }) {
	return (
		<div className={join('note', 'note-' + tone)} {...rest}>
			{title ? <strong>{title}</strong> : null} {children}
		</div>
	)
}
