import { Children, Fragment, cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { join, pick, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { useDismiss } from './Utilities.jsx'

const VARIANT = {
	default: null,
	sort: 'sp-combobox--sort',
	// a sort control last in its bar opens leftward, so its panel stays inside the window
	'sort-end': 'sp-combobox--sort sp-combobox--end',
	end: 'sp-combobox--end',
	stretch: 'sp-combobox--stretch'
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

/** Opens a panel where it can be read (c9): below, above when only above has room, scrolling
    inside when neither has, and lifted out of a card or scroller that would cut it off. */
export function usePanelPlace(root, panel, open, size) {
	useLayoutEffect(() => {
		const list = panel.current
		if (!open || !list || !root.current) return
		const reset = () => { list.removeAttribute('style'); delete list.dataset.place }
		const place = () => {
			reset()
			const at = root.current.getBoundingClientRect()
			const drawn = list.getBoundingClientRect()
			const height = list.scrollHeight
			const gap = drawn.top - at.bottom
			const below = window.innerHeight - at.bottom - gap - 8
			const above = at.top - gap - 8
			const up = height > below && above > below
			const room = Math.max(0, up ? above : below)
			const shown = Math.min(height, room)
			const top = up ? at.top - gap - shown : at.bottom + gap
			const clip = clipperOf(root.current)?.getBoundingClientRect()
			const cut = !!clip && (top < clip.top - 0.5 || top + shown > clip.bottom + 0.5 || drawn.left < clip.left - 0.5 || drawn.right > clip.right + 0.5)
			if (height > room) Object.assign(list.style, { maxHeight: room + 'px', overflowY: 'auto' })
			if (!cut) {
				if (up) list.dataset.place = 'up'
				return
			}
			const left = Math.min(Math.max(8, drawn.left), window.innerWidth - 8 - drawn.width)
			Object.assign(list.style, { position: 'fixed', top: top + 'px', left: left + 'px', right: 'auto', bottom: 'auto', width: drawn.width + 'px' })
			// a transformed ancestor moves what fixed is measured from, so correct by where it landed
			const landed = list.getBoundingClientRect()
			Object.assign(list.style, { top: top + (top - landed.top) + 'px', left: left + (left - landed.left) + 'px' })
		}
		place()
		const again = ev => { if (!list.contains(ev.target)) place() }
		window.addEventListener('scroll', again, true)
		window.addEventListener('resize', again)
		return () => {
			window.removeEventListener('scroll', again, true)
			window.removeEventListener('resize', again)
			reset()
		}
	}, [root, panel, open, size])
}

/** Picking an option applies it and closes the panel (c5), focus staying on the trigger. `prefix`
    is the word kept inside the trigger ahead of the value, as the sort control's Sort (c8). */
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
	children,
	// a field's label points at whichever element is the trigger in this mode: the
	// input when the set is searched, the button when it is only opened
	id,
	'aria-label': label,
	...rest
}) {
	reject(rest, 'Combobox')
	if (searchable && !onSearch) console.error('<Combobox searchable> needs onSearch: the page filters its own options, so typing narrows nothing without it')
	if (!searchable && (onSearch || search !== undefined)) console.error('<Combobox> a query belongs to a searchable one')
	const [held, setHeld] = useState(defaultOpen)
	// the text being typed, which is not the value - null means the reader is not
	// typing, so the field shows what is chosen instead
	const [typed, setTyped] = useState(null)
	const root = useRef(null)
	const isOpen = open ?? held
	const panelId = useId()
	const setOpen = next => {
		if (open === undefined) setHeld(next)
		onOpenChange?.(next)
	}
	const query = search ?? typed
	const box = useListbox(children, { panelId, onPick: () => { setTyped(null); close() } })
	const { options, active, step } = box

	// closing drops the cursor: the next open starts from what is chosen, not from
	// wherever the keyboard happened to be left
	const close = () => { setOpen(false); box.setActive(-1) }
	const toggle = () => (isOpen ? close() : setOpen(true))
	useDismiss(root, isOpen, close)

	const { setActive } = box
	useEffect(() => { setActive(-1) }, [query, setActive])
	usePanelPlace(root, box.panel, isOpen, options.length)

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
		if (ev.key === 'Home' || ev.key === 'End') {
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
	const shown = query || (typeof value === 'string' ? value : '')
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
							aria-activedescendant={activeId}
							aria-label={label}
							autoComplete="off"
							placeholder={placeholder}
							value={shown}
							onChange={ev => {
								if (search === undefined) setTyped(ev.target.value)
								onSearch?.(ev.target.value)
								if (!isOpen) setOpen(true)
							}}
							onFocus={() => { if (!isOpen) setOpen(true) }}
							// the query is display state, not the value: leaving the field
							// puts the chosen value back rather than stranding a half-typed one
							onBlur={() => setTyped(null)}
							onKeyDown={ev => {
								// Escape clears a query before it closes the panel: the reader's
								// first press undoes their typing, which is what they meant
								if (ev.key === 'Escape' && query) {
									ev.stopPropagation()
									setTyped('')
									onSearch?.('')
									return
								}
								onKeys(ev)
							}}
						/>
						<span className="sp-field__chevron"><Icon name="chevron-down" size={14} /></span>
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
						aria-label={label}
						onClick={toggle}
						onKeyDown={onKeys}
					>
						{prefix ? <span className="sp-combobox__chevron">{prefix}</span> : null}
						{lead}
						<span className="sp-grow">{value}</span>
						<span className="sp-combobox__chevron"><Icon name="chevron-down" size={14} /></span>
					</button>
				)}
			<ul className="sp-combobox__panel" id={panelId} role="listbox" ref={box.panel} onMouseDown={box.hold}>{box.list}</ul>
		</div>
	)
}

export function ComboboxOption({ selected = false, active = false, id, dot, mark, meta, onSelect, children, ...rest }) {
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
				<span className="sp-grow">{children}</span>
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
