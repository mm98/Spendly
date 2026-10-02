import { join, pick, reject } from './variants.js'

/* The card: a surface. It owns a ground, an edge and padding, and holds a section of
   a page.

   A surface is not a row. `row` lays the card's own children in a line - layout, and
   nothing else - and a row that wants a card's ground is `ListItem variant="card"`,
   because it repeats and a surface does not.

   `flush` is for a card whose content owns the padding - a table, a list, an image.
   Everything else keeps the card's own padding and column gap, so a caller never
   states either.

   The footer is the part with rules worth encoding. One action fills the width, a
   pair splits it into equal halves, three is a menu rather than a footer. A text
   action is the exception: it is a link, and a link stretched across a card reads
   as a button, so it keeps its own width. The component reports a third action
   rather than laying it out. */

const VARIANT = {
	default: null,
	flush: 'sp-card--flush',
	row: 'sp-card--row',
	shell: 'sp-card--shell'
}

const COLOR = { default: null, warning: 'warning', danger: 'danger' }

const FOOTER = { fill: null, split: 'sp-card__footer--split', stack: 'sp-card__footer--stack' }

/**
 * @param {object} props
 * @param {'default'|'flush'|'row'|'shell'} [props.variant]
 * @param {'default'|'warning'|'danger'} [props.color]
 * @param {string} [props.to] Makes the whole card a link. A card is not a control,
 *   so there is no onClick: a repeating row the user picks is a ListItem.
 * @param {React.ReactNode} [props.footer] The card's actions.
 * @param {'fill'|'split'|'stack'} [props.footerLayout]
 * @param {React.ReactNode} [props.chevron] Shown on a card that opens or collapses.
 * @param {boolean} [props.footerCommits] The footer closes a decision, so every
 *   button on it takes the committing size. A footer that only reveals does not.
 * @param {React.ReactNode} props.children
 *
 * Takes no `className` and no `style`.
 */
export function Card({
	variant = 'default',
	color = 'default',
	to,
	footer,
	footerLayout = 'fill',
	footerCommits = false,
	chevron,
	children,
	...rest
}) {
	reject(rest, 'Card')
	const classes = join('sp-card', pick(VARIANT, variant, 'variant', 'Card'))
	const paint = color === 'default' ? {} : { 'data-color': pick(COLOR, color, 'color', 'Card') }
	const actions = Array.isArray(footer) ? footer.filter(Boolean) : footer ? [footer] : []
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
		</>
	)
	if (to) return <a className={classes} href={to} data-go={to} {...paint} {...rest}>{body}</a>
	return <div className={classes} {...paint} {...rest}>{body}</div>
}

/** The grid cards sit in. `fluid` fills the available width instead of holding a
    column count, for a set whose length the page does not know. */
export function Cards({ fluid = false, children, ...rest }) {
	reject(rest, 'Cards')
	return <div className={join('sp-cards', fluid && 'sp-cards--fluid')} {...rest}>{children}</div>
}

/** A part of a flush card that needs the padding back. */
export function CardBody({ children, ...rest }) {
	reject(rest, 'CardBody')
	return <div className="sp-card__body" {...rest}>{children}</div>
}

/**
 * The header of a card - the same bar a list carries, which is why it has the same
 * name. A List builds its own; this is for a card that needs one.
 *
 * @param {object} props
 * @param {'default'|'loose'|'link'|'toggle'} [props.variant] `loose` carries its own
 *   border, where there is no list border around it. `link` and `toggle` make the
 *   whole header the target - one goes somewhere, the other collapses the card.
 * @param {boolean} [props.expanded] Toggle only.
 * @param {() => void} [props.onClick]
 */
export function Toolbar({ variant = 'default', expanded, onClick, children, ...rest }) {
	reject(rest, 'Toolbar')
	const classes = join('sp-list__toolbar', pick(TOOLBAR, variant, 'variant', 'Toolbar'))
	if (variant === 'toggle')
		return (
			<button type="button" className={classes} aria-expanded={expanded ? 'true' : 'false'} onClick={onClick} {...rest}>
				{children}
			</button>
		)
	if (variant === 'link') return <a className={classes} onClick={onClick} {...rest}>{children}</a>
	return <div className={classes} {...rest}>{children}</div>
}

/** The foot of a card's own set of things. A List builds its own. `loose` takes the
    grid's width, where there is no list border to sit inside. */
export function ListFooter({ loose = false, children, ...rest }) {
	reject(rest, 'ListFooter')
	return <div className={join('sp-list__footer', loose && 'sp-list__footer--loose')} {...rest}>{children}</div>
}
