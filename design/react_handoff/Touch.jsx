import { reject } from './variants.js'
import { Icon } from './Icon.jsx'

/* The touch surface's own furniture.

   These are not the desktop shell's parts at a smaller size: a bar welded to the
   frame's edge, a row of destinations a thumb reaches, a surface that rises from the
   bottom. They exist because a touch screen has places a pointer page does not, and
   grouping them here keeps a pointer page from reaching for one by accident.

   Nothing here is named for a device. A component named `Phone-` anything promises
   one screen size and forbids the next, and it disagrees with the prop the library
   actually switches on, which is `touch`. The bar at the top of a touch screen is
   the shell's `TopBar` with `touch` - see Shell.jsx. */


/** The surface's destinations, at the bottom where a thumb reaches. */
export function TabBar({ children, ...rest }) {
	reject(rest, 'TabBar')
	return <nav className="sp-tabbar" {...rest}>{children}</nav>
}

/** One destination in that bar. */
export function TabBarItem({ icon, current = false, onClick, children, ...rest }) {
	reject(rest, 'TabBarItem')
	return (
		<button
			type="button"
			className="sp-tabbar__item"
			onClick={onClick}
			{...(current ? { 'aria-current': 'page' } : {})}
			{...rest}
		>
			{icon ? <Icon name={icon} /> : null}
			<span>{children}</span>
		</button>
	)
}

/**
 * A surface that rises from the bottom of the screen. Inside the frame it bleeds past
 * the frame's padding and takes its bottom corners, as the bars do.
 *
 * @param {object} props
 * @param {boolean} [props.handle] The grip that says it can be dragged away.
 */
export function Sheet({ handle = true, children, ...rest }) {
	reject(rest, 'Sheet')
	return (
		<div className="sp-sheet" {...rest}>
			{handle ? <span className="sp-sheet__handle" /> : null}
			{children}
		</div>
	)
}

/**
 * The bar welded to the bottom of the frame: a border-top and no radius, which
 * is a different shape from a row. On a page the bar a form commits from is
 * `<ListItem variant="sticky">` - it was the card row all along.
 *
 * @param {React.ReactNode} props.children
 */
export function SaveBar({ children, ...rest }) {
	reject(rest, 'SaveBar')
	return <div className="sp-savebar" {...rest}>{children}</div>
}
