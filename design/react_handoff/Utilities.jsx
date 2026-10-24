import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'

/* The pieces with no domain of their own.

   Every component in this library belongs to something - a list, a card, a field, a
   shell. These do not: they are what those things are built out of, and each one is
   here because more than one of them uses it.

   That is the test for this file. A piece that only ever appears inside one
   component belongs in that component's file, beside what uses it; a piece three
   components reach for belongs here. Nothing lands here for being small. */

/**
 * A column of lines about one thing - in a list row, in a table cell, in a card.
 * Neither list-specific nor title-specific: the lines are whatever the record has
 * to say, a name over a reference, an amount over its saving. It takes the width
 * the mark and any trailing controls leave, and does not clip, since each line
 * truncates its own text and an amount must never be cut.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 */
export function Stacked({ children, ...rest }) {
	reject(rest, 'Stacked')
	return <span className="sp-stacked sp-stacked--fill" {...rest}>{children}</span>
}

/**
 * One line of that column. The first sits to the top of its content, the rest centre.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 */
export function Line({ children, ...rest }) {
	reject(rest, 'Line')
	return <span className="sp-list-item__line" {...rest}>{children}</span>
}

/**
 * A key, as the reader sees it on their keyboard. `accent` is one inside a surface
 * that is already green.
 *
 * @param {object} props
 * @param {boolean} [props.accent]
 * @param {import('react').ReactNode} [props.children]
 */
export function Kbd({ accent = false, children, ...rest }) {
	reject(rest, 'Kbd')
	return <kbd className={join('sp-kbd', accent && 'sp-kbd--accent')} {...rest}>{children}</kbd>
}

/**
 * Nothing here yet, and what to do about it. `dashed` is the one that invites the
 * first record rather than reporting an empty filter.
 *
 * @param {object} props
 * @param {boolean} [props.dashed]
 * @param {import('react').ReactNode} props.children The mark, the title, the body and the action, in the order they are read.
 */
export function Empty({ dashed = false, children, ...rest }) {
	reject(rest, 'Empty')
	return <div className={join('sp-empty', dashed && 'sp-empty--dashed')} {...rest}>{children}</div>
}

/**
 * What is not here.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 */
export function EmptyTitle({ children, ...rest }) {
	reject(rest, 'EmptyTitle')
	return <span className="sp-empty__title" {...rest}>{children}</span>
}

/**
 * What to do about it, under the title.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 */
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

/**
 * The shape of what is loading, not a spinner: a row being fetched looks like the
 * row it will become. For work of unknown length on one line of text there is the
 * spinner instead.
 *
 * @param {object} props
 * @param {keyof typeof SKELETON} props.shape
 */
export function Skeleton({ shape, ...rest }) {
	reject(rest, 'Skeleton')
	return <span className={join('sp-skeleton', pick(SKELETON, shape, 'shape', 'Skeleton'))} aria-hidden="true" {...rest} />
}

/**
 * Work of unknown length, on one line of text.
 */
export function Spinner(props) {
	reject(props, 'Spinner')
	return <span className="sp-spinner" aria-hidden="true" {...props} />
}

/**
 * The control at the end of a set that adds one more to it (c33): a row to a budget
 * group, a group to a side, an account to the list. Order lines keep their own add
 * row in ListItem, which holds a mark where the photo goes.
 *
 * Add, then what, then where: Add a row to Housing.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 * @param {() => void} [props.onClick]
 */
export function AddRow({ children, onClick, ...rest }) {
	reject(rest, 'AddRow')
	return (
		<button type="button" className="sp-add-row" onClick={onClick} {...rest}>
			<Icon name="plus" />
			<span>{children}</span>
		</button>
	)
}
