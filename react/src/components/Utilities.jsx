import { useEffect } from 'react'
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
			<Icon name="plus" size={14} />
			<span>{children}</span>
		</button>
	)
}

// a surface drawn on the body for a control (a menu's sheet on touch) and that control's own box
const owners = new WeakMap()

/** Marks `surface`, drawn on the body, as part of `owner`: inside it counts as inside the owner. */
export function own(surface, owner) {
	if (surface && owner) owners.set(surface, owner)
}

/** Whether `el` sits in `box`, or in a surface drawn on the body for something in it. */
export function within(box, el) {
	for (let at = el; box && at instanceof Node; ) {
		if (box.contains(at)) return true
		const surface = at.closest?.('[data-surface]') ?? at.parentElement?.closest('[data-surface]')
		at = surface ? owners.get(surface) : null
	}
	return false
}

/** The button that opened the menu `el` sits in, if it sits in one: where focus belongs once
    that menu has closed under it. */
export function menuTrigger(el) {
	let menu = el?.closest?.('.sp-menu')
	if (!menu) return null
	while (menu.parentElement?.closest('.sp-menu')) menu = menu.parentElement.closest('.sp-menu')
	const surface = menu.closest('[data-surface]')
	const host = (surface && owners.get(surface)) ?? menu.parentElement
	return [...(host?.querySelectorAll('[aria-haspopup="menu"]') ?? [])].find(b => !menu.contains(b)) ?? null
}

/** Closes an open menu, popover or combobox panel on a press outside, Escape or a Tab out of it,
    and on Escape hands focus back to whatever inside it opened it. */
export function useDismiss(ref, open, onClose) {
	useEffect(() => {
		if (!open) return
		const box = ref.current
		const away = ev => { if (box && !within(box, ev.target)) onClose() }
		const key = ev => {
			if (ev.key !== 'Escape') return
			ev.stopPropagation()
			// the item that had focus is about to be hidden, so focus goes to the control that opened it
			if (within(box, document.activeElement)) box.querySelector('[aria-expanded]')?.focus()
			onClose()
		}
		// a surface drawn on the body sends its keys to the document, not through the box
		const keyAway = ev => { if (box && !box.contains(ev.target) && within(box, ev.target)) key(ev) }
		// only a move to a known element counts: a focused node that leaves the page reports none
		const left = ev => { if (ev.relatedTarget && box && !within(box, ev.relatedTarget)) onClose() }
		document.addEventListener('pointerdown', away)
		document.addEventListener('keydown', keyAway)
		box?.addEventListener('keydown', key)
		box?.addEventListener('focusout', left)
		return () => {
			document.removeEventListener('pointerdown', away)
			document.removeEventListener('keydown', keyAway)
			box?.removeEventListener('keydown', key)
			box?.removeEventListener('focusout', left)
		}
	}, [ref, open, onClose])
}

const STOPS = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'

// what Tab can land on inside `box`: shown, and one radio per group, as the browser walks them
const stopsIn = box => [...box.querySelectorAll(STOPS)].filter(el => {
	if (el.checkVisibility && !el.checkVisibility()) return false
	if (el.type !== 'radio' || el.checked || !el.name) return true
	return !box.querySelector(`input[type="radio"][name="${CSS.escape(el.name)}"]:checked`)
})

/** Holds Tab inside a modal surface while `active`. Opening focuses `initial` (a selector), the box
    or its first stop; closing returns focus to the opener, or to a closed menu's button. */
export function useFocusTrap(ref, active = true, initial) {
	useEffect(() => {
		const box = ref.current
		if (!box || !active) return
		const back = menuTrigger(document.activeElement) ?? document.activeElement
		const first = (initial && box.querySelector(initial)) ?? (box.hasAttribute('tabindex') ? box : stopsIn(box)[0] ?? box)
		first.focus()
		const tab = ev => {
			if (ev.key !== 'Tab') return
			const at = document.activeElement
			// a surface opened over this one holds the keyboard itself
			if (!box.contains(at) && at !== document.body) return
			const stops = stopsIn(box)
			if (!stops.length) { ev.preventDefault(); return }
			const [head, tail] = [stops[0], stops.at(-1)]
			if (!box.contains(at)) { ev.preventDefault(); (ev.shiftKey ? tail : head).focus() }
			else if (ev.shiftKey && (at === head || at === box)) { ev.preventDefault(); tail.focus() }
			else if (!ev.shiftKey && at === tail) { ev.preventDefault(); head.focus() }
		}
		document.addEventListener('keydown', tab)
		return () => {
			document.removeEventListener('keydown', tab)
			const to = back?.isConnected && back.checkVisibility?.() !== false ? back : menuTrigger(back)
			to?.focus?.()
		}
	}, [ref, initial, active])
}
