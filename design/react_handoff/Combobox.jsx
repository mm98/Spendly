import { Children, cloneElement, useEffect, useId, useRef, useState } from 'react'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'

/* The combobox: the system's choosing control.

   The chevron and the tick are the component's own, not a caller's. A combobox that
   opens downward has a chevron pointing down and a chosen option carries a check -
   every call site in the library passed exactly those, and a caller who forgot got a
   control with no affordance and no error. Same rule as the search field's lead.

   It is never a native select. An option here carries a status dot, a mark, a meta
   value and a check for the one chosen, and a native <option> can hold none of
   those - so the trigger is a button and the panel is a list of buttons.

   Two modes, as the library draws them. Pick only: the trigger is a button showing
   the chosen value. Searchable: the trigger is the input itself - `role="combobox"`
   with `aria-autocomplete="list"` - because a set the reader types into is one they
   are narrowing, not one they are opening.

   The component holds the typed text and reports it; the page filters, because only
   the page knows what an option matches on. An option here carries a mark, a dot and
   a meta value, so matching on its rendered text would match on the wrong things.

   The arrow keys walk the options in both modes, which is what `role="combobox"`
   promises: Down opens a closed panel and then moves, Up moves back, Home and End
   jump to the ends where the trigger is a button, Enter picks, Escape closes. In a
   searchable one Home and End are the text's, with or without Shift, as in any field. Focus stays on the trigger and the
   option being walked is named by `aria-activedescendant` - moving real focus into
   the panel would take the reader's cursor out of the field they are typing in.
   Disabled options are stepped over, since a stop the reader cannot use is a stop
   they have to press past.

   The keyboard is the control's and not the element's, so both triggers take the
   same handler: the arrows open the panel and then move through the options, Home
   and End go to its ends on a button trigger, Enter selects, and Escape closes - clearing a query first
   where there is one, since that is two intentions and not one.

   Space selects too, but only where the trigger is a button: in a searchable one the
   reader is typing and a space is a space, so Enter is the select there.

   Open state works either way: pass `open` and own it, or leave it out and the
   component keeps it. */

const VARIANT = {
	default: null,
	sort: 'sp-combobox--sort',
	end: 'sp-combobox--end',
	stretch: 'sp-combobox--stretch'
}

const DOTS = ['draft', 'progress', 'done', 'returned', 'cancelled']

/**
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {keyof typeof VARIANT} [props.variant] `sort` is the pick-only control above a list; `end` anchors a panel wider than its trigger; `stretch` lets the trigger grow to its content.
 * @param {import('react').ReactNode} props.value What the trigger reads when closed.
 * @param {import('react').ReactNode} [props.lead] Shown before the value - the sort control's own word, a mark, a dot.
 * @param {boolean} [props.open] Controlled. Omit to let the component hold it.
 * @param {boolean} [props.defaultOpen]
 * @param {(open: boolean) => void} [props.onOpenChange]
 * @param {boolean} [props.searchable] The reader narrows the set by typing. The trigger becomes the input, and typing opens the panel.
 * @param {string} [props.search] Controlled query. Omit and the component holds it.
 * @param {(text: string) => void} [props.onSearch] Called as the reader types. The page filters its own options with it - matching on an option's rendered text would match on its mark and its meta value too.
 * @param {string} [props.placeholder] Searchable only, and only where the field has no chosen value to show.
 * @param {import('react').ReactNode} props.children Options, groups and separators.
 * @param {string} [props.id]
 */
export function Combobox({
	variant = 'default',
	value,
	lead,
	open,
	defaultOpen = false,
	onOpenChange,
	searchable = false,
	search,
	onSearch,
	placeholder,
	children,
	// a field's label points at whichever element is the trigger in this mode: the
	// input when the set is searched, the button when it is only opened
	id,
	...rest
}) {
	reject(rest, 'Combobox')
	if (searchable && !onSearch) console.error('<Combobox searchable> needs onSearch: the page filters its own options, so typing narrows nothing without it')
	if (!searchable && (onSearch || search !== undefined)) console.error('<Combobox> a query belongs to a searchable one')
	const [held, setHeld] = useState(defaultOpen)
	// the text being typed, which is not the value - null means the reader is not
	// typing, so the field shows what is chosen instead
	const [typed, setTyped] = useState(null)
	// whether the reader is editing the text: while they are, the field shows exactly
	// what they typed, empty included. Kept apart from the query, since a controlled
	// query of '' must still let the field show the chosen value at rest.
	const [editing, setEditing] = useState(false)
	const panel = useRef(null)
	const isOpen = open ?? held
	const panelId = useId()
	const setOpen = next => {
		if (open === undefined) setHeld(next)
		onOpenChange?.(next)
	}
	const query = search ?? typed

	const [active, setActive] = useState(-1)
	// closing drops the cursor: the next open starts from what is chosen, not from
	// wherever the keyboard happened to be left
	const close = () => { setOpen(false); setActive(-1) }
	const toggle = () => (isOpen ? close() : setOpen(true))

	/* The options, in the order they are drawn, so the arrow keys can walk them.
	   Groups and the empty line are not options and are not counted - arrowing onto
	   a heading is a stop that does nothing. */
	const options = []
	const walk = nodes => Children.map(nodes, child => {
		if (!child || typeof child !== 'object' || child.type !== ComboboxOption) return child
		const index = options.length
		// a pick ends the edit, so the field shows the new value and not the query
		const onSelect = child.props.onSelect && (() => { setTyped(null); setEditing(false); child.props.onSelect() })
		options.push({ ...child.props, onSelect })
		return cloneElement(child, { id: panelId + '-' + index, active: index === active, onSelect })
	})
	const list = walk(children)

	/* A new query is a new set of options, so the old position means nothing. Keyed on
	   the query alone: keyed on the open state as well, this fired after the arrow
	   that opened the panel and wiped the cursor it had just set - so a fresh open
	   answered the first arrow press with nothing, and the control read as dead. The
	   cursor is dropped where the panel is closed instead, which is the same intent
	   stated where it happens. */
	useEffect(() => { setActive(-1) }, [query])

	// the starting point is passed, never read back from state: setActive does not
	// apply until the next render, so Home and End walked from the old position
	const step = (by, from = active) => {
		if (!options.length) return
		let next = from
		for (let i = 0; i < options.length; i++) {
			next = next + by
			if (next < 0) next = options.length - 1
			if (next > options.length - 1) next = 0
			if (!options[next].disabled) break
		}
		setActive(next)
	}

	const onKeys = ev => {
		if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
			ev.preventDefault()
			const by = ev.key === 'ArrowDown' ? 1 : -1
			/* Opening and landing are one press. The cursor starts on what is chosen, so
			   arrowing from a set value moves from that value rather than from the top -
			   and where nothing is chosen, down lands on the first option and up on the
			   last. Two presses to reach the first option is a control that feels dead on
			   the first one. */
			if (!isOpen) {
				setOpen(true)
				const at = options.findIndex(o => o.selected)
				return step(by, at > -1 ? at - by : (by > 0 ? -1 : options.length))
			}
			return step(by)
		}
		/* In a searchable one Home and End move the caret and Shift+Home selects to the
		   start, as in any text field; only a button trigger takes them for the panel. */
		if ((ev.key === 'Home' || ev.key === 'End') && !searchable) {
			if (!isOpen) return
			ev.preventDefault()
			return ev.key === 'Home' ? step(1, -1) : step(-1, options.length)
		}
		/* Enter selects in both modes. Space selects only where the trigger is a
		   button - in a searchable one the reader is typing and a space is a space -
		   and on a button it has to be taken here, since letting it through would fire
		   the button's own click and toggle the panel as well. */
		if (ev.key === 'Enter' || (ev.key === ' ' && !searchable)) {
			if (!isOpen) { ev.preventDefault(); return setOpen(true) }
			if (active < 0) { if (ev.key === ' ') ev.preventDefault(); return }
			ev.preventDefault()
			const at = options[active]
			if (!at.disabled) at.onSelect?.()
			return
		}
		if (ev.key === 'Escape' && isOpen) {
			ev.stopPropagation()
			close()
		}
	}
	/* Past its height the panel scrolls, so the cursor has to bring the active option
	   with it - a cursor on something the reader cannot see is worse than none. The
	   panel's own scrollTop, never scrollIntoView, which would move the page too. */
	useEffect(() => {
		const list = panel.current
		if (!list || active < 0) return
		const at = list.querySelector('[id="' + panelId + '-' + active + '"]')
		if (!at) return
		const top = at.offsetTop
		const bottom = top + at.offsetHeight
		if (top < list.scrollTop) list.scrollTop = top
		else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight
	}, [active, panelId])

	const activeId = isOpen && active > -1 ? panelId + '-' + active : undefined
	/* While the reader edits, the field is their text - deleting the last letter or a
	   selection leaves it empty, as they asked. At rest it shows what is chosen; leaving
	   the field or Escape puts the chosen value back. Falling back on an empty query
	   while typing refilled the field on every delete, so it could never be emptied. */
	const shown = editing ? (query ?? '') : (typeof value === 'string' ? value : '')
	return (
		<div
			className={join('sp-combobox', pick(VARIANT, variant, 'variant', 'Combobox'))}
			data-open={isOpen ? 'true' : 'false'}
			{...rest}
		>
			{searchable
				? (
					<span className="sp-field__wrap">
						<input
							id={id}
							className="sp-input sp-input--trail"
							type="text"
							role="combobox"
							aria-expanded={isOpen ? 'true' : 'false'}
							aria-autoComplete="list"
							aria-controls={panelId}
							aria-activedescendant={activeId}
							aria-label={rest['aria-label']}
							autoComplete="off"
							placeholder={placeholder}
							value={shown}
							onChange={ev => {
								setEditing(true)
								if (search === undefined) setTyped(ev.target.value)
								onSearch?.(ev.target.value)
								if (!isOpen) setOpen(true)
							}}
							onFocus={() => { if (!isOpen) setOpen(true) }}
							// the query is display state, not the value: leaving the field
							// puts the chosen value back rather than stranding a half-typed one
							onBlur={() => { setTyped(null); setEditing(false) }}
							onKeyDown={ev => {
								// Escape clears a query before it closes the panel: the reader's
								// first press undoes their typing, which is what they meant
								if (ev.key === 'Escape' && editing) {
									ev.stopPropagation()
									setTyped(null)
									setEditing(false)
									onSearch?.('')
									return
								}
								onKeys(ev)
							}}
						/>
						<span className="sp-field__chevron"><Icon name="chevron-down" /></span>
					</span>
				)
				: (
					<button
						id={id}
						type="button"
						className="sp-combobox__trigger"
						aria-haspopup="listbox"
						aria-expanded={isOpen ? 'true' : 'false'}
						aria-controls={panelId}
						aria-activedescendant={activeId}
						aria-label={rest['aria-label']}
						onClick={toggle}
						onKeyDown={onKeys}
					>
						{lead}
						<span className="sp-grow">{value}</span>
						<span className="sp-combobox__chevron"><Icon name="chevron-down" /></span>
					</button>
				)}
			<ul className="sp-combobox__panel" id={panelId} role="listbox" ref={panel}>{list}</ul>
		</div>
	)
}

/**
 * One option. A row, not an <option>: it can carry a dot, a mark, a meta value and
 * the check that marks the chosen one.
 *
 * @param {object} props
 * @param {boolean} [props.selected] The one currently chosen.
 * @param {boolean} [props.active] Where the arrow keys are. Set by Combobox, never by a page - it is keyboard position, not data.
 * @param {string} [props.id]
 * @param {typeof DOTS[number]} [props.dot] A status: draft, progress, done, returned, cancelled.
 * @param {import('react').ReactNode} [props.mark]
 * @param {import('react').ReactNode} [props.meta] A value at the option's tail.
 * @param {() => void} [props.onSelect]
 * @param {import('react').ReactNode} props.children The option's name.
 */
export function ComboboxOption({ selected = false, active = false, id, dot, mark, meta, onSelect, children, ...rest }) {
	reject(rest, 'ComboboxOption')
	if (dot && !DOTS.includes(dot)) console.error(`<ComboboxOption> dot="${dot}" is not one of: ${DOTS.join(' | ')}`)
	return (
		<li>
			<button
				type="button"
				className="sp-combobox__option"
				id={id}
				role="option"
				aria-selected={selected ? 'true' : 'false'}
				data-active={active ? 'true' : undefined}
				onClick={onSelect}
				{...rest}
			>
				{dot ? <span className="sp-combobox__dot" data-dot={dot} /> : null}
				{mark}
				<span className="sp-grow">{children}</span>
				{meta ? <span className="sp-combobox__meta">{meta}</span> : null}
				{selected ? <span className="sp-combobox__check"><Icon name="check" /></span> : null}
			</button>
		</li>
	)
}

/**
 * The heading over a set of options.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 */
export function ComboboxGroup({ children, ...rest }) {
	reject(rest, 'ComboboxGroup')
	return <li className="sp-combobox__group" {...rest}>{children}</li>
}

/**
 * What the panel says when nothing matches.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 */
export function ComboboxEmpty({ children, ...rest }) {
	reject(rest, 'ComboboxEmpty')
	return <li className="sp-combobox__empty" {...rest}>{children}</li>
}
