import { Children, createContext, useContext } from 'react'
import { join, pick, reject } from './variants.js'
import { Button, IconButton } from './Button.jsx'
import { Icon } from './Icon.jsx'

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
	shell: 'sp-card--shell',
	// a CardHeader, then a drill path: the path stands in the head's line when the card
	// is wide enough, below the head when it is not
	path: 'sp-card--path'
}

const COLOR = { default: null, warning: 'warning', danger: 'danger' }

const FOOTER = { fill: null, split: 'sp-card__footer--split', stack: 'sp-card__footer--stack' }

/**
 * @param {object} props
 * @param {keyof typeof VARIANT} [props.variant]
 * @param {keyof typeof COLOR} [props.color]
 * @param {string} [props.to] Makes the whole card a link. A card is not a control, so there is no onClick: a repeating row the user picks is a ListItem.
 * @param {import('react').ReactNode[]} [props.footer] The card's actions.
 * @param {keyof typeof FOOTER} [props.footerLayout]
 * @param {boolean} [props.footerCommits] The footer closes a decision, so every button on it takes the committing size. A footer that only reveals does not.
 * @param {import('react').ReactNode} [props.chevron] Shown on a card that opens or collapses.
 * @param {import('react').ReactNode} props.children Takes no `className` and no `style`.
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
	/* A CardHeader is passed as a child, and the card renders it first wherever it was
	   written, inside the one context that lets it render. Everything else in the card is
	   outside that context, so a CardHeader nested deeper in the card, or anywhere outside
	   a card, renders nothing and says why. */
	const all = Children.toArray(children)
	const heads = all.filter(c => c && c.type === CardHeader)
	if (heads.length > 1) console.error('<Card> takes one <CardHeader>')
	const content = all.filter(c => !(c && c.type === CardHeader))
	const body = (
		<>
			{heads.length ? <HeadSlot.Provider value={true}>{heads[0]}</HeadSlot.Provider> : null}
			<HeadSlot.Provider value={false}>{content}</HeadSlot.Provider>
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

/**
 * The grid cards sit in. `fluid` fills the available width instead of holding a
 * column count, for a set whose length the page does not know.
 *
 * @param {object} props
 * @param {boolean} [props.fluid]
 * @param {import('react').ReactNode} [props.children]
 */
export function Cards({ fluid = false, children, ...rest }) {
	reject(rest, 'Cards')
	return <div className={join('sp-cards', fluid && 'sp-cards--fluid')} {...rest}>{children}</div>
}

/* The head of a card: its name, and what the card says or offers about itself. It is
   the list toolbar's box, one line at a fixed height: the name never breaks, text
   beside it truncates, controls and buttons keep their width, and anything that grows
   with the data goes below it, in the card.

   Each view has one slot and one place, so a head cannot be assembled two ways. The
   name comes first, the meta beside it; the right-end slots render in a fixed order -
   aside, control, status, actions, dismiss - whatever order they are passed in. */

/* true only where Card places its own head */
const HeadSlot = createContext(false)

const ASIDE = { default: 'sp-meta', note: 'sp-note', danger: 'sp-subtitle sp-ink-danger' }

/**
 * Only a child of Card: <Card><CardHeader name="Top vendors" />...</Card>. The card
 * renders it first. Anywhere else - outside a card, or nested inside a card's content -
 * it renders nothing and reports the call. Takes no `className`, no `style` and no children.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.name The card's name.
 * @param {import('react').ReactNode} [props.meta] Beside the name: what the visible rows are ("newest 3").
 * @param {import('react').ReactNode} [props.aside] At the right end: a fact about the card ("August · top 8 of 10").
 * @param {keyof typeof ASIDE} [props.asideTone]
 * @param {import('react').ReactNode} [props.control] At the right end: one control that changes what the card shows - a Segmented, a period window, a Switch.
 * @param {import('react').ReactNode} [props.status] At the right end: one Pill.
 * @param {{ label: string, to?: string, href?: string, onClick?: () => void, held?: boolean }[]} [props.actions] At most two. Always the small outline button: the caller names the action, not its look.
 * @param {() => void} [props.onDismiss] Closes the card; renders the close button last.
 * @param {string} [props.dismissLabel] What the close button hides ("Hide the August summary").
 */
export function CardHeader({
	name,
	meta,
	aside,
	asideTone = 'default',
	control,
	status,
	actions,
	onDismiss,
	dismissLabel = 'Close',
	...rest
}) {
	const placed = useContext(HeadSlot)
	reject(rest, 'CardHeader')
	if (!placed) { console.error('<CardHeader> is only a child of <Card>'); return null }
	if ('children' in rest) { console.error('<CardHeader> takes no children: every view is a named slot'); delete rest.children }
	if (!name) console.error('<CardHeader> needs a name')
	const list = Array.isArray(actions) ? actions.filter(Boolean) : actions ? [actions] : []
	if (list.length > 2) console.error('<CardHeader> three actions is a menu, not a head')
	const end = aside || control || status || list.length || onDismiss
	return (
		<div className="sp-card__head" {...rest}>
			<span className="sp-section-label">{name}</span>
			{meta ? <span className="sp-meta">{meta}</span> : null}
			{end ? <span className="sp-grow" /> : null}
			{aside ? <span className={pick(ASIDE, asideTone, 'asideTone', 'CardHeader')}>{aside}</span> : null}
			{control || null}
			{status || null}
			{list.slice(0, 2).map(a => (
				<Button key={a.label} variant="outline" size="small" to={a.to} href={a.href} onClick={a.onClick}>{a.label}</Button>
			))}
			{onDismiss ? <IconButton icon={<Icon name="x" />} aria-label={dismissLabel} onClick={onDismiss} /> : null}
		</div>
	)
}

/**
 * A part of a flush card that needs the padding back.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 */
export function CardBody({ children, ...rest }) {
	reject(rest, 'CardBody')
	return <div className="sp-card__body" {...rest}>{children}</div>
}

const TOOLBAR = { default: null, loose: 'sp-list__toolbar--loose', link: 'sp-list__toolbar--link', toggle: 'sp-list__toolbar--toggle' }

/**
 * The header of a card - the same bar a list carries, which is why it has the same
 * name. A List builds its own; this is for a card that needs one.
 *
 * @param {object} props
 * @param {keyof typeof TOOLBAR} [props.variant] `loose` carries its own border, where there is no list border around it. `link` and `toggle` make the whole header the target - one goes somewhere, the other collapses the card.
 * @param {boolean} [props.expanded] Toggle only.
 * @param {() => void} [props.onClick]
 * @param {import('react').ReactNode} [props.children]
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

/**
 * The foot of a card's own set of things. A List builds its own. `loose` takes the
 * grid's width, where there is no list border to sit inside.
 *
 * @param {object} props
 * @param {boolean} [props.loose]
 * @param {import('react').ReactNode} [props.children]
 */
export function ListFooter({ loose = false, children, ...rest }) {
	reject(rest, 'ListFooter')
	return <div className={join('sp-list__footer', loose && 'sp-list__footer--loose')} {...rest}>{children}</div>
}
