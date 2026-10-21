import { Children, Fragment, cloneElement, isValidElement, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { SearchInput } from './Inputs.jsx'
import { Scrim, ShellTouch } from './Shell.jsx'
import { Sheet } from './Touch.jsx'
import { own as ownedBy, useDismiss, useFocusTrap } from './Utilities.jsx'
import { singular } from './format.js'

const VARIANT = {
	default: null,
	sort: 'sp-combobox--sort',
	// a sort control last in its bar opens leftward, so its panel stays inside the window
	'sort-end': 'sp-combobox--sort sp-combobox--end',
	end: 'sp-combobox--end',
	stretch: 'sp-combobox--stretch',
	bare: 'sp-combobox--bare',
	// a pick field whose values are short: at most the field width, not the whole form column (11a)
	narrow: 'sp-combobox--narrow'
}

const DOTS = ['draft', 'progress', 'done', 'returned', 'cancelled']

/** The list half of every combobox in the library - Combobox, and TokensField's suggestions: the
    options in order, the one the keyboard is on, and what picking one does. Internal. */
export function useListbox(children, { panelId, onPick }) {
	const [active, setActive] = useState(-1)
	const panel = useRef(null)
	const options = []
	// into fragments too: a page groups its options under headings that way
	const walk = nodes => Children.map(nodes, child => {
		if (!isValidElement(child)) return child
		if (child.type === Fragment) return cloneElement(child, {}, walk(child.props.children))
		if (child.type !== ComboboxOption) return child
		const index = options.length
		const pick = () => {
			if (child.props.disabled) return
			child.props.onSelect?.()
			onPick?.()
		}
		options.push({ ...child.props, pick })
		return cloneElement(child, { id: panelId + '-' + index, active: index === active, onSelect: pick })
	})
	const list = walk(children)

	// pass the starting index: setActive applies only on the next render
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

	useEffect(() => {
		const box = panel.current
		if (!box || active < 0) return
		const at = box.querySelector('[id="' + panelId + '-' + active + '"]')
		if (!at) return
		const top = at.offsetTop
		const bottom = top + at.offsetHeight
		if (top < box.scrollTop) box.scrollTop = top
		else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight
	}, [active, panelId])

	return {
		list,
		options,
		active,
		setActive,
		step,
		panel,
		activeId: active > -1 ? panelId + '-' + active : undefined,
		// a press on an option must not take focus from the field: it stays where the reader typed
		hold: ev => { if (ev.target.closest?.('.sp-combobox__option')) ev.preventDefault() }
	}
}

// the nearest box that would cut a panel off: an ancestor that clips or scrolls
const clipperOf = el => {
	for (let at = el?.parentElement; at && at !== document.body; at = at.parentElement) {
		const style = getComputedStyle(at)
		if (style.overflowX !== 'visible' || style.overflowY !== 'visible') return at
	}
	return null
}

// the window's room less the bars pinned over its edges (the top bar, the tab bar, a save bar)
export const roomOf = root => {
	let top = 0
	let bottom = window.innerHeight
	for (const bar of document.querySelectorAll('.sp-topbar, .sp-tabbar, .sp-savebar')) {
		if (bar.contains(root) || bar.checkVisibility?.() === false) continue
		if (!['fixed', 'sticky'].includes(getComputedStyle(bar).position)) continue
		const r = bar.getBoundingClientRect()
		if (r.top <= 0.5) top = Math.max(top, r.bottom)
		else if (r.bottom >= window.innerHeight - 0.5) bottom = Math.min(bottom, r.top)
	}
	return { top, bottom }
}

/** Opens a panel where it can be read (c9): below, above when only above has room (bars pinned over
    the window count as none), scrolling inside when neither has, lifted out of a box that would cut it. */
export function usePanelPlace(root, panel, open, size) {
	useLayoutEffect(() => {
		const list = panel.current
		if (!open || !list || !root.current) return
		const reset = () => { list.removeAttribute('style'); delete list.dataset.place }
		const place = () => {
			reset()
			const at = root.current.getBoundingClientRect()
			let drawn = list.getBoundingClientRect()
			// wider than the room on its side: it hangs from the field's edge with more room beyond it
			const view = { left: 8, right: document.documentElement.clientWidth - 8 }
			if (drawn.right > view.right + 0.5 || drawn.left < view.left - 0.5) {
				const rightward = view.right - at.left
				const leftward = at.right - view.left
				Object.assign(list.style, leftward > rightward
					? { left: 'auto', right: '0px', width: drawn.width + 'px' }
					: { left: '0px', right: 'auto', width: drawn.width + 'px' })
				drawn = list.getBoundingClientRect()
			}
			// measured as drawn: that holds its own cap (--list-max, --menu-max), and not a hidden submenu laid out beside it
			const height = drawn.height
			const gap = drawn.top - at.bottom
			const edge = roomOf(root.current)
			const below = edge.bottom - at.bottom - gap - 8
			const above = at.top - edge.top - gap - 8
			const up = height > below && above > below
			// a menu too tall for either side slides along the window until it fits, over its own button;
			// a list never does, since it would cover the field being typed into
			const slides = list.getAttribute('role') === 'menu' && height <= edge.bottom - edge.top - 16
			const room = Math.max(0, slides ? height : up ? above : below)
			const shown = Math.min(height, room)
			const top = up ? Math.max(edge.top + 8, at.top - gap - shown) : Math.min(at.bottom + gap, edge.bottom - 8 - shown)
			const clip = clipperOf(root.current)?.getBoundingClientRect()
			const outside = drawn.left < view.left - 0.5 || drawn.right > view.right + 0.5
			const moved = top !== (up ? at.top - gap - shown : at.bottom + gap)
			const cut = outside || moved || (!!clip && (top < clip.top - 0.5 || top + shown > clip.bottom + 0.5 || drawn.left < clip.left - 0.5 || drawn.right > clip.right + 0.5))
			if (height > room) Object.assign(list.style, { maxHeight: room + 'px', overflowY: 'auto' })
			if (!cut) {
				if (up) list.dataset.place = 'up'
				return
			}
			const left = Math.min(Math.max(view.left, drawn.left), view.right - drawn.width)
			Object.assign(list.style, { position: 'fixed', top: top + 'px', left: left + 'px', right: 'auto', bottom: 'auto', width: drawn.width + 'px' })
			// a transformed ancestor moves what fixed is measured from, so correct by where it landed
			const landed = list.getBoundingClientRect()
			Object.assign(list.style, { top: top + (top - landed.top) + 'px', left: left + (left - landed.left) + 'px' })
		}
		place()
		// a resize comes from the window, which is no node a panel can contain
		const again = ev => { if (!(ev.target instanceof Node) || !list.contains(ev.target)) place() }
		window.addEventListener('scroll', again, true)
		window.addEventListener('resize', again)
		return () => {
			window.removeEventListener('scroll', again, true)
			window.removeEventListener('resize', again)
			reset()
		}
	}, [root, panel, open, size])
}

// a basis past the sheet's cap holds the sheet at its full height; the list scrolls inside it, under the search
const SHEET_LIST = { flex: '1 1 100vh', minHeight: 0, overflowY: 'auto' }

/** On touch the panel is a sheet from the bottom edge (15b): the search at the top, the options
    under it. A press on the backdrop closes it and lands on nothing under it. */
function ComboboxSheet({ owner, name, search, onClose, children }) {
	const sheet = useRef(null)
	useLayoutEffect(() => ownedBy(sheet.current, owner.current), [owner])
	useFocusTrap(sheet, true, search ? 'input' : '[role="listbox"]')
	const bare = ev => ev.target === ev.currentTarget
	return createPortal(
		<Scrim dialog
			onPointerDown={ev => { if (bare(ev)) ev.stopPropagation() }}
			onMouseDown={ev => { if (bare(ev)) ev.preventDefault() }}
			onClick={ev => { if (bare(ev)) onClose() }}>
			<Sheet ref={sheet} data-surface="" role="dialog" aria-modal="true" {...name}>
				{search}
				{children}
			</Sheet>
		</Scrim>,
		document.body
	)
}

/** What a filtered list reads out as it narrows (c9: "6 vendors"): its options, less the create row,
    which is not one of them. `noun` is the plural. Internal. */
export function countOf(options, noun = 'options') {
	const n = options.filter(o => !o.create).length
	return n === 0 ? `No ${noun}` : `${n} ${n === 1 ? singular(noun) : noun}`
}

/** Picking an option applies it and closes the panel (c5), focus staying on the trigger. `prefix`
    is the word kept inside the trigger ahead of the value, as the sort control's Sort (c8). `noun`
    names the options in the count a narrowed list reads out, plural ("vendors"). */
export function Combobox({
	variant = 'default',
	value,
	lead,
	prefix,
	open,
	defaultOpen = false,
	onOpenChange,
	searchable = false,
	search,
	onSearch,
	placeholder,
	noun,
	children,
	// a field's label points at whichever element is the trigger in this mode: the
	// input when the set is searched, the button when it is only opened
	id,
	'aria-label': label,
	// what Field hands the control belongs on the element that takes focus, not on the box around it
	'aria-invalid': invalid,
	'aria-describedby': describedBy,
	required,
	trail,
	unit,
	autoFocus = false,
	disabled = false,
	...rest
}) {
	reject(rest, 'Combobox')
	const told = { 'aria-describedby': describedBy, ...(invalid === true || invalid === 'true' ? { 'aria-invalid': 'true' } : {}) }
	if (searchable && !onSearch) console.error('<Combobox searchable> needs onSearch: the page filters its own options, so typing narrows nothing without it')
	if (!searchable && (onSearch || search !== undefined)) console.error('<Combobox> a query belongs to a searchable one')
	const [held, setHeld] = useState(defaultOpen)
	// the text being typed, which is not the value - null means the reader is not
	// typing, so the field shows what is chosen instead
	const [typed, setTyped] = useState(null)
	// apart from the query: a page's own query of '' must still show the chosen value at rest
	const [editing, setEditing] = useState(false)
	const root = useRef(null)
	// a page outside the shell (the first run) marks its own touch surface, as a date field reads it
	const shellTouch = useContext(ShellTouch)
	const [near, setNear] = useState(false)
	useLayoutEffect(() => { setNear(!!root.current?.closest('.sp-touch')) })
	const touch = shellTouch || near
	const isOpen = open ?? held
	const panelId = useId()
	const own = useId()
	const triggerId = id ?? own
	// a figure drawn before the value is part of what the trigger holds, so it is read with it
	const leadId = isValidElement(lead) ? lead.props.id ?? triggerId + '-lead' : null
	const leading = leadId ? cloneElement(lead, { id: leadId }) : lead
	const setOpen = next => {
		if (open === undefined) setHeld(next)
		onOpenChange?.(next)
	}
	const query = search ?? typed
	const box = useListbox(children, { panelId, onPick: () => { setTyped(null); close() } })
	const { options, active, step } = box

	// closing drops the cursor: the next open starts from what is chosen, not from
	// wherever the keyboard happened to be left
	const close = () => { setOpen(false); setTyped(null); setEditing(false); box.setActive(-1) }
	const toggle = () => (isOpen ? close() : setOpen(true))
	useDismiss(root, isOpen, close)

	const { setActive } = box
	useEffect(() => { setActive(-1) }, [query, setActive])
	usePanelPlace(root, box.panel, isOpen && !touch, options.length)

	const onKeys = ev => {
		if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
			ev.preventDefault()
			const by = ev.key === 'ArrowDown' ? 1 : -1
			if (!isOpen) {
				setOpen(true)
				const at = options.findIndex(o => o.selected)
				return step(by, at > -1 ? at - by : (by > 0 ? -1 : options.length))
			}
			return step(by)
		}
		if ((ev.key === 'Home' || ev.key === 'End') && !searchable) {
			if (!isOpen) return
			ev.preventDefault()
			return ev.key === 'Home' ? step(1, -1) : step(-1, options.length)
		}
		if (ev.key === 'Enter' || (ev.key === ' ' && !searchable)) {
			if (!isOpen) { ev.preventDefault(); return setOpen(true) }
			if (active < 0) { if (ev.key === ' ') ev.preventDefault(); return }
			ev.preventDefault()
			options[active].pick()
			return
		}
		if (ev.key === 'Escape' && isOpen) {
			ev.stopPropagation()
			close()
		}
	}

	const activeId = isOpen ? box.activeId : undefined
	// the reader's text while they edit, empty included, else what is chosen; on touch they type in the sheet
	const shown = !touch && editing ? (query ?? '') : (typeof value === 'string' ? value : '')
	const typeQuery = text => {
		if (search === undefined) setTyped(text)
		onSearch?.(text)
	}
	// Escape ends the edit before it closes the panel: the reader's first press undoes their typing
	const searchKeys = ev => {
		if (ev.key === 'Escape' && (editing || query)) {
			ev.stopPropagation()
			setEditing(false)
			typeQuery('')
			setTyped(null)
			return
		}
		onKeys(ev)
	}
	// on touch the keyboard works in the sheet, so the field on the page names no option
	const pointed = touch ? undefined : activeId
	const named = label ? { 'aria-label': label } : { 'aria-labelledby': prefix ? triggerId + '-prefix' : triggerId + '-label' }
	return (
		<div
			ref={root}
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
							aria-autocomplete="list"
							aria-controls={panelId}
							aria-activedescendant={pointed}
							aria-label={label}
							required={required}
							{...told}
							autoFocus={autoFocus}
							autoComplete="off"
							placeholder={placeholder}
							value={shown}
							// on touch the typing happens in the sheet's own search
							readOnly={touch}
							onChange={ev => {
								setEditing(true)
								typeQuery(ev.target.value)
								if (!isOpen) setOpen(true)
							}}
							// a press opens it, focus alone does not: focus a page moves here must not cover the field
							onClick={() => { if (!isOpen) setOpen(true) }}
							// the query is display state, not the value: leaving the field
							// puts the chosen value back rather than stranding a half-typed one
							onBlur={() => { setTyped(null); setEditing(false) }}
							onKeyDown={searchKeys}
						/>
						<span className="sp-field__chevron"><Icon name="chevron-down" size={14} /></span>
						<span className="sp-announce" aria-live="polite">{query ? countOf(options, noun) : ''}</span>
					</span>
				)
				: (
					/* a select-style trigger (c9): its name is what it picks, then the value it holds,
					   so the value is read with it however the trigger is labelled */
					<button
						id={triggerId}
						type="button"
						className="sp-combobox__trigger"
						role="combobox"
						aria-haspopup="listbox"
						aria-expanded={isOpen ? 'true' : 'false'}
						aria-controls={panelId}
						aria-activedescendant={pointed}
						aria-label={label}
						aria-labelledby={`${label ? triggerId : prefix ? triggerId + '-prefix' : triggerId + '-label'}${leadId ? ' ' + leadId : ''} ${triggerId}-value`}
						{...told}
						autoFocus={autoFocus}
						disabled={disabled}
						onClick={toggle}
						onKeyDown={onKeys}
					>
						{prefix ? <span className="sp-combobox__chevron" id={triggerId + '-prefix'}>{prefix}</span> : null}
						{leading}
						<span className="sp-grow" id={triggerId + '-value'}>{value}</span>
						<span className="sp-combobox__chevron"><Icon name="chevron-down" size={14} /></span>
					</button>
				)}
			{!touch ? <ul className="sp-combobox__panel" id={panelId} role="listbox" ref={box.panel} onMouseDown={box.hold}>{box.list}</ul> : null}
			{touch && isOpen
				? (
					<ComboboxSheet owner={root} name={named} onClose={close}
						search={searchable
							? <SearchInput value={query ?? ''} onChange={typeQuery} placeholder={placeholder} role="combobox" aria-expanded="true"
								aria-autocomplete="list" aria-controls={panelId} aria-activedescendant={activeId} autoComplete="off" onKeyDown={searchKeys} {...named} />
							: null}>
						{/* a select-style list takes the keys itself, as its trigger does off touch */}
						<ul className="sp-menu sp-menu--plain" id={panelId} role="listbox" ref={box.panel} onMouseDown={box.hold} style={SHEET_LIST}
							{...(searchable ? {} : { tabIndex: -1, 'aria-activedescendant': activeId, onKeyDown: onKeys })}>{box.list}</ul>
					</ComboboxSheet>
				)
				: null}
		</div>
	)
}

/** `create` marks the row that makes the typed value (c5), left out of the count a narrowed list reads out.
    `truncate` keeps a long option on one line, cut with ..., as a saved question is (24b 8). */
export function ComboboxOption({ selected = false, active = false, id, dot, mark, meta, onSelect, create = false, truncate = false, children, ...rest }) {
	reject(rest, 'ComboboxOption')
	if (dot && !DOTS.includes(dot)) console.error(`<ComboboxOption> dot="${dot}" is not one of: ${DOTS.join(' | ')}`)
	return (
		<li>
			<button
				type="button"
				className="sp-combobox__option"
				id={id}
				// the keyboard stays on the trigger and names this option through it (c9), so it is no tab stop
				tabIndex={-1}
				role="option"
				aria-selected={selected ? 'true' : 'false'}
				data-active={active ? 'true' : undefined}
				onClick={onSelect}
				{...rest}
			>
				{dot ? <span className="sp-combobox__dot" data-dot={dot} /> : null}
				{mark}
				<span className={truncate ? 'sp-truncate' : 'sp-grow'}>{children}</span>
				{meta ? <span className="sp-combobox__meta">{meta}</span> : null}
				{selected ? <span className="sp-combobox__check"><Icon name="check" size={13} /></span> : null}
			</button>
		</li>
	)
}

/** The heading over a set of options. */
export function ComboboxGroup({ children, ...rest }) {
	reject(rest, 'ComboboxGroup')
	return <li className="sp-combobox__group" {...rest}>{children}</li>
}

/** A rule between sets of options (c5). */
export function ComboboxSeparator(props) {
	reject(props, 'ComboboxSeparator')
	return <li {...props}><hr /></li>
}

/** What the panel says when nothing matches. */
export function ComboboxEmpty({ children, ...rest }) {
	reject(rest, 'ComboboxEmpty')
	return <li className="sp-combobox__empty" {...rest}>{children}</li>
}
