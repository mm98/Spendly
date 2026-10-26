import { Children, createContext, useContext, useRef } from 'react'
import { Link } from 'react-router'
import { join, pick, reject } from './variants.js'
import { Button, IconButton } from './Button.jsx'
import { Fold, m } from './motion.js'

const VARIANT = {
	default: null,
	flush: 'sp-card--flush',
	row: 'sp-card--row',
	shell: 'sp-card--shell',
	// the Showing bar: its path stands in the head's line where the card is wide enough (c8)
	path: 'sp-card--path',
	// the sign-in card, the one card that floats on the page rather than in the shell (20a)
	float: 'au-panel',
	// the first run's card, a step wider for its two-column choices (20d)
	'float-wide': 'au-panel au-panel--wide'
}

const COLOR = { default: null, warning: 'warning', danger: 'danger' }

const FOOTER = { fill: null, split: 'sp-card__footer--split', stack: 'sp-card__footer--stack' }

// a touch held this long on a row opens its record menu (c1); one that travels this far first is a scroll
const HOLD_MS = 500
const SCROLLED = 8

/* A long press on a touch row: a finger held still for HOLD_MS calls `onLongPress`, and the tap that
   ends it opens nothing. A pointer has its menu button, so only a touch counts. One hook for every
   part a phone list draws its rows with: Card, ListItem and Record. */
export function useLongPress(onLongPress) {
	const timer = useRef(null)
	const fired = useRef(false)
	if (!onLongPress) return {}
	const stop = () => { clearTimeout(timer.current); timer.current = null }
	return {
		'data-long-press': '',
		onPointerDown: ev => {
			fired.current = false
			if (ev.pointerType !== 'touch') return
			const x0 = ev.clientX, y0 = ev.clientY
			const move = e => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > SCROLLED) end() }
			const end = () => { stop(); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end) }
			timer.current = setTimeout(() => { end(); fired.current = true; navigator.vibrate?.(10); onLongPress() }, HOLD_MS)
			window.addEventListener('pointermove', move)
			window.addEventListener('pointerup', end)
			window.addEventListener('pointercancel', end)
		},
		// the press that opened the menu does not also open the record
		onClickCapture: ev => { if (fired.current) { fired.current = false; ev.preventDefault(); ev.stopPropagation() } },
		// a long press on Android is a context menu, which the record menu replaces
		onContextMenu: ev => { if (fired.current || timer.current) ev.preventDefault() }
	}
}

/** @param {object} props
    @param {keyof typeof VARIANT} [props.variant] `default`; `flush` has no padding; `row` lays its parts in a row; `shell` is the card the app frame draws; `path` is the Showing bar; `float` and `float-wide` float on the page, as the sign-in card does.
    @param {keyof typeof COLOR} [props.color] A tint for a card that needs attention: `warning` (amber) or `danger`.
    @param {boolean} [props.spread] In a card stretched to the height of the card beside it, share the free height between the parts.
    @param {string} [props.to] An address inside the app. The whole card is a link.
    @param {import('react').ReactNode[]} [props.footer] The buttons at the foot of the card, one each.
    @param {keyof typeof FOOTER} [props.footerLayout] How the footer buttons sit: `fill` in a row, `split` in two equal halves, `stack` one under the other.
    @param {boolean} [props.footerCommits] The footer closes a decision, so every button on it takes the full size.
    @param {import('react').ReactNode} [props.after] A part drawn under the footer.
    @param {import('react').ReactNode} [props.chevron] An arrow at the end, for a card that opens or folds.
    @param {() => void} [props.onLongPress] On touch, a row held still opens its record menu: this opens it (c1).
    @param {import('react').ReactNode} [props.children] The card's parts: a CardHeader first, then what the card shows. */
export function Card({
	variant = 'default',
	color = 'default',
	// stretched to the card beside it, the card shares the free height out between its groups (10a)
	spread = false,
	to,
	footer,
	footerLayout = 'fill',
	footerCommits = false,
	// set under the footer, apart from the commits
	after,
	chevron,
	onLongPress,
	children,
	...rest
}) {
	reject(rest, 'Card')
	const held = useLongPress(onLongPress)
	const classes = join('sp-card', pick(VARIANT, variant, 'variant', 'Card'), spread && 'sp-card--spread')
	const paint = color === 'default' ? {} : { 'data-color': pick(COLOR, color, 'color', 'Card') }
	const actions = Children.toArray(footer)
	if (actions.length > 2) console.error('<Card> three actions is a menu, not a footer')
	// the head renders first wherever it was written; one nested anywhere else renders nothing (c10)
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
			{after}
		</>
	)
	if (to) return <Link className={classes} to={to} data-go={to} {...paint} {...held} {...rest}>{body}</Link>
	return <div className={classes} {...paint} {...held} {...rest}>{body}</div>
}

/* true only where Card places its own head */
const HeadSlot = createContext(false)

const ASIDE = { default: 'sp-meta', note: 'sp-note', danger: 'sp-subtitle sp-ink-danger' }

// the head's buttons: small in a card, xsmall in a rail heading (Order list 2b, 2d)
const ACTION_SIZE = { small: 'small', xsmall: 'xsmall' }

/** A card's head (c10): one slot per view, drawn in a fixed order, so it cannot be assembled by hand.
    Only a child of Card; `actions` are at most two `{ label, to, href, onClick, held }`;
    a `held` action is hidden but keeps its place, so the head does not change height.
    @param {object} props
    @param {import('react').ReactNode} props.name The card's name.
    @param {import('react').ReactNode} [props.meta] Beside the name: what the rows shown are, such as newest 3.
    @param {import('react').ReactNode} [props.aside] At the right end: a fact about the card, such as August, top 8 of 10.
    @param {keyof typeof ASIDE} [props.asideTone] How the aside reads: `default` grey, `note`, or `danger` in red.
    @param {import('react').ReactNode} [props.control] At the right end: one control that changes what the card shows, such as a Segmented or a Switch.
    @param {import('react').ReactNode} [props.status] At the right end: one Pill.
    @param {{ label: string, to?: string, href?: string, onClick?: () => void, held?: boolean }[]} [props.actions] At most two small buttons at the right end: each with its words, and an address or a click. A held one keeps its place but is hidden.
    @param {keyof typeof ACTION_SIZE} [props.actionSize] The size of the action buttons: `small` in a card, `xsmall` in a rail heading.
    @param {() => void} [props.onDismiss] Closes the card; renders the close button last.
    @param {string} [props.dismissLabel] The name of the close button, such as Hide the August summary. */
export function CardHeader({
	name,
	meta,
	aside,
	asideTone = 'default',
	control,
	status,
	actions,
	actionSize = 'small',
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
	const size = pick(ACTION_SIZE, actionSize, 'actionSize', 'CardHeader')
	return (
		<div className="sp-card__head" {...rest}>
			<span className="sp-section-label">{name}</span>
			{meta ? <span className="sp-meta">{meta}</span> : null}
			{end ? <span className="sp-grow" /> : null}
			{aside ? <span className={pick(ASIDE, asideTone, 'asideTone', 'CardHeader')}>{aside}</span> : null}
			{control || null}
			{status || null}
			{list.slice(0, 2).map(a => {
				const button = <Button key={a.label} variant="outline" size={size} to={a.to} href={a.href} onClick={a.onClick}>{a.label}</Button>
				return a.held ? <span key={a.label} className="sp-held">{button}</span> : button
			})}
			{onDismiss ? <IconButton icon="x" aria-label={dismissLabel} onClick={onDismiss} /> : null}
		</div>
	)
}

/** The grid cards sit in. `fluid` fills the available width instead of holding a
    column count, for a set whose length the page does not know.
    @param {object} props
    @param {boolean} [props.fluid] Fill the width, instead of a fixed number of columns.
    @param {import('react').ReactNode} [props.children] The cards. */
export function Cards({ fluid = false, children, ...rest }) {
	reject(rest, 'Cards')
	return <div className={join('sp-cards', fluid && 'sp-cards--fluid')} {...rest}>{children}</div>
}

/** A footer row of figures inside the card's body, under its rule, where more follows it: the
    Top vendors card's total (Order statistics). Actions go in Card's `footer`.
    @param {object} props
    @param {import('react').ReactNode} [props.children] The figures in the footer row, such as a total. */
export function CardFooter({ children, ...rest }) {
	reject(rest, 'CardFooter')
	return <div className="sp-card__footer" {...rest}>{children}</div>
}

/** A part of a flush card that needs the padding back. Under a `toggle` Toolbar it is the card's
    folding body: `open` is the toolbar's `expanded`, and it folds by height as that changes.
    @param {object} props
    @param {boolean} [props.open] Under a toggle Toolbar: whether the body is unfolded.
    @param {import('react').ReactNode} [props.children] The part of a flush card that needs its padding back. */
export function CardBody({ open, children, ...rest }) {
	reject(rest, 'CardBody')
	const body = <div className="sp-card__body" {...rest}>{children}</div>
	return open === undefined ? body : <Fold open={open}>{body}</Fold>
}

const TOOLBAR = { default: null, loose: 'sp-list__toolbar--loose', link: 'sp-list__toolbar--link', toggle: 'sp-list__toolbar--toggle' }

/** A card's header row. `chevron` ends a link or toggle header (c10): it turns as the card folds.
    @param {object} props
    @param {keyof typeof TOOLBAR} [props.variant] `default`; `loose` has its own border; `link` makes the whole row a link; `toggle` makes it fold the card.
    @param {boolean} [props.expanded] Toggle only. Whether the card is unfolded.
    @param {() => void} [props.onClick]
    @param {import('react').ReactNode} [props.chevron] An arrow at the end of a link or toggle row. It turns as the card folds.
    @param {import('react').ReactNode} [props.children] What the row holds. */
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
    grid's width, where there is no list border to sit inside.
    @param {object} props
    @param {boolean} [props.loose] Take the full width, where there is no list border around it.
    @param {import('react').ReactNode} [props.children] What the footer holds. */
export function ListFooter({ loose = false, children, ...rest }) {
	reject(rest, 'ListFooter')
	return <div className={join('sp-list__footer', loose && 'sp-list__footer--loose')} {...rest}>{children}</div>
}

/** The rail beside a record's form (c21): its cards in a column, held in view while the form
    scrolls. `wide` is the 400 rail.
    @param {object} props
    @param {boolean} [props.wide] The wider rail.
    @param {import('react').ReactNode} [props.children] The cards in the rail beside a form. */
export function Panel({ wide = false, children, ...rest }) {
	reject(rest, 'Panel')
	// sticky beside the page: a marker inside it is measured on the screen, not on the page
	return <m.div className={join('sp-panel', wide && 'sp-panel--wide')} layoutRoot {...rest}>{children}</m.div>
}
