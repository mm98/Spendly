import { Children } from 'react'
import { Link } from 'react-router'
import { join, pick, reject } from './variants.js'

const VARIANT = {
	default: null,
	flush: 'sp-card--flush',
	row: 'sp-card--row',
	shell: 'sp-card--shell',
	// the sign-in card, the one card that floats on the page rather than in the shell (20a)
	float: 'sp-card--float',
	// the first run's card, a step wider for its two-column choices (20d)
	'float-wide': 'sp-card--float sp-card--float-wide',
	// the drill path's bar above the cards it filters (c8)
	crumbs: 'sp-crumbs-bar'
}

const COLOR = { default: null, warning: 'warning', danger: 'danger' }

const FOOTER = { fill: null, split: 'sp-card__footer--split', stack: 'sp-card__footer--stack' }

export function Card({
	variant = 'default',
	color = 'default',
	to,
	footer,
	footerLayout = 'fill',
	footerCommits = false,
	// set under the footer, apart from the commits: the rail's Delete order (1a)
	after,
	chevron,
	children,
	...rest
}) {
	reject(rest, 'Card')
	const classes = join('sp-card', pick(VARIANT, variant, 'variant', 'Card'))
	const paint = color === 'default' ? {} : { 'data-color': pick(COLOR, color, 'color', 'Card') }
	const actions = Children.toArray(footer)
	if (actions.length > 2) console.error('<Card> three actions is a menu, not a footer')
	const body = (
		<>
			{children}
			{chevron ? <span className="sp-card__chevron">{chevron}</span> : null}
			{actions.length
				? (
					<div className={join(
						'sp-card__footer',
						pick(FOOTER, footerLayout, 'footerLayout', 'Card'),
						footerCommits && 'sp-card__footer--commits'
					)}>
						{actions}
					</div>
				)
				: null}
			{after}
		</>
	)
	if (to) return <Link className={classes} to={to} data-go={to} {...paint} {...rest}>{body}</Link>
	return <div className={classes} {...paint} {...rest}>{body}</div>
}

/** The grid cards sit in. `fluid` fills the available width instead of holding a
    column count, for a set whose length the page does not know. */
export function Cards({ fluid = false, children, ...rest }) {
	reject(rest, 'Cards')
	return <div className={join('sp-cards', fluid && 'sp-cards--fluid')} {...rest}>{children}</div>
}

/** A footer row of figures inside the card's body, under its rule, where more follows it: the
    Monthly limit card's "All categories" total (Order statistics). Actions go in Card's `footer`. */
export function CardFooter({ children, ...rest }) {
	reject(rest, 'CardFooter')
	return <div className="sp-card__footer" {...rest}>{children}</div>
}

/** A part of a flush card that needs the padding back. */
export function CardBody({ children, ...rest }) {
	reject(rest, 'CardBody')
	return <div className="sp-card__body" {...rest}>{children}</div>
}

const TOOLBAR = { default: null, loose: 'sp-list__toolbar--loose', link: 'sp-list__toolbar--link', toggle: 'sp-list__toolbar--toggle' }

/** A card's header row. `chevron` ends a link or toggle header (c10): it turns as the card folds. */
export function Toolbar({ variant = 'default', expanded, onClick, chevron, children, ...rest }) {
	reject(rest, 'Toolbar')
	const classes = join('sp-list__toolbar', pick(TOOLBAR, variant, 'variant', 'Toolbar'))
	const body = <>{children}{chevron ? <span className="sp-card__chevron">{chevron}</span> : null}</>
	if (variant === 'toggle')
		return (
			<button type="button" className={classes} aria-expanded={expanded ? 'true' : 'false'} onClick={onClick} {...rest}>
				{body}
			</button>
		)
	if (variant === 'link') return <a className={classes} onClick={onClick} {...rest}>{body}</a>
	return <div className={classes} {...rest}>{body}</div>
}

/** The foot of a card's own set of things. A List builds its own. `loose` takes the
    grid's width, where there is no list border to sit inside. */
export function ListFooter({ loose = false, children, ...rest }) {
	reject(rest, 'ListFooter')
	return <div className={join('sp-list__footer', loose && 'sp-list__footer--loose')} {...rest}>{children}</div>
}

/** The rail beside a record's form (c21): its cards in a column, held in view while the form
    scrolls. `wide` is the 400 rail. */
export function Panel({ wide = false, children, ...rest }) {
	reject(rest, 'Panel')
	return <div className={join('sp-panel', wide && 'sp-panel--wide')} {...rest}>{children}</div>
}
