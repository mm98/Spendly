import { Link } from 'react-router'
import { Icon } from './Icon.jsx'

/* Buttons, and the one rule that decides which element to render.

   A control that goes somewhere is a link and a control that acts in place is a button --
   pass `to` and you get the first, pass `onClick` and you get the second. That is not
   pedantry about elements: an <a href> fires click on Enter itself and leaves Space to
   scroll the page, which is what the prototype's rows used to hand-roll and get wrong, and
   only a link offers open-in-new-tab. README: Honest Affordances.

   `data-go` rides along on every link because the stylesheet keys the row treatment off it
   (`a[data-go] { color:inherit; text-decoration:none }`), and it still says what it said in
   the prototype: where this element goes. */

const join = (...parts) => parts.filter(Boolean).join(' ')

export function Button({ variant = '', to, icon, iconAfter, children, className, ...rest }) {
	const classes = join('button', variant && variant.split(' ').map(v => 'button-' + v).join(' '), className)
	const content = (
		<>
			{icon ? <Icon name={icon} /> : null}
			{children}
			{iconAfter ? <Icon name={iconAfter} /> : null}
		</>
	)
	return to
		? <Link className={classes} to={to} data-go={to} {...rest}>{content}</Link>
		: <button type="button" className={classes} {...rest}>{content}</button>
}

/** A square control carrying nothing but a glyph, so the label has to be given. `href` is the
    third case the file comment above doesn't name: a real URL outside this app's own routes
    (an API file download), so it takes a plain `<a>` rather than the router's `Link` -- same
    reasoning as `to`, one rung further out, and it's what lets a caller pass `download` through
    `...rest` and get a real save-this-file button instead of a navigation. */
export function IconButton({ variant = 'arrow', icon, label, to, href, className, ...rest }) {
	const classes = join('icon-button', variant && 'icon-button-' + variant, className)
	if (to) return <Link className={classes} to={to} data-go={to} aria-label={label} {...rest}><Icon name={icon} /></Link>
	if (href) return <a className={classes} href={href} aria-label={label} {...rest}><Icon name={icon} /></a>
	return <button type="button" className={classes} aria-label={label} {...rest}><Icon name={icon} /></button>
}

/** The underlined text action -- SEE ALL, SCAN A RECEIPT, CLEAR ALL. */
export function ButtonLink({ to, children, className, ...rest }) {
	const classes = join('button-link', className)
	return to
		? <Link className={classes} to={to} data-go={to} {...rest}>{children}</Link>
		: <button type="button" className={classes} {...rest}>{children}</button>
}
