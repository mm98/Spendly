import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'

export function Stacked({ children, ...rest }) {
	reject(rest, 'Stacked')
	return <span className="sp-stacked sp-stacked--fill" {...rest}>{children}</span>
}

/** One line of that column. The first sits to the top of its content, the rest centre. */
export function Line({ children, ...rest }) {
	reject(rest, 'Line')
	return <span className="sp-list-item__line" {...rest}>{children}</span>
}

/** A key, as the reader sees it on their keyboard. `accent` is one inside a surface
    that is already green. */
export function Kbd({ accent = false, children, ...rest }) {
	reject(rest, 'Kbd')
	return <kbd className={join('sp-kbd', accent && 'sp-kbd--accent')} {...rest}>{children}</kbd>
}

export function Empty({ dashed = false, children, ...rest }) {
	reject(rest, 'Empty')
	return <div className={join('sp-empty', dashed && 'sp-empty--dashed')} {...rest}>{children}</div>
}

/** What is not here. */
export function EmptyTitle({ children, ...rest }) {
	reject(rest, 'EmptyTitle')
	return <span className="sp-empty__title" {...rest}>{children}</span>
}

/** What to do about it, under the title. */
export function EmptyBody({ children, ...rest }) {
	reject(rest, 'EmptyBody')
	return <span className="sp-empty__body" {...rest}>{children}</span>
}

const SKELETON = {
	line: 'sp-skeleton--line',
	short: 'sp-skeleton--short',
	end: 'sp-skeleton--end',
	title: 'sp-skeleton--title',
	pill: 'sp-skeleton--pill',
	bar: 'sp-skeleton--bar',
	mark: 'sp-skeleton--mark',
	'mark-large': 'sp-skeleton--mark-large',
	check: 'sp-skeleton--check',
	icon: 'sp-skeleton--icon'
}

export function Skeleton({ shape, ...rest }) {
	reject(rest, 'Skeleton')
	return <span className={join('sp-skeleton', pick(SKELETON, shape, 'shape', 'Skeleton'))} aria-hidden="true" {...rest} />
}

/** Work of unknown length, on one line of text. */
export function Spinner(props) {
	reject(props, 'Spinner')
	return <span className="sp-spinner" aria-hidden="true" {...props} />
}

export function AddRow({ children, onClick, ...rest }) {
	reject(rest, 'AddRow')
	return (
		<button type="button" className="sp-add-row" onClick={onClick} {...rest}>
			<Icon name="plus" />
			<span>{children}</span>
		</button>
	)
}
