import { Children, cloneElement, useEffect, useId, useRef, useState } from 'react'
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
	const panel = useRef(null)
	const root = useRef(null)
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
	useDismiss(root, isOpen, close)

	const options = []
	const walk = nodes => Children.map(nodes, child => {
		if (!child || typeof child !== 'object' || child.type !== ComboboxOption) return child
		const index = options.length
		options.push(child.props)
		return cloneElement(child, { id: panelId + '-' + index, active: index === active })
	})
	const list = walk(children)

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
			const at = options[active]
			if (!at.disabled) at.onSelect?.()
			return
		}
		if (ev.key === 'Escape' && isOpen) {
			ev.stopPropagation()
			close()
		}
	}
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
							aria-label={rest['aria-label']}
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

/** The heading over a set of options. */
export function ComboboxGroup({ children, ...rest }) {
	reject(rest, 'ComboboxGroup')
	return <li className="sp-combobox__group" {...rest}>{children}</li>
}

/** What the panel says when nothing matches. */
export function ComboboxEmpty({ children, ...rest }) {
	reject(rest, 'ComboboxEmpty')
	return <li className="sp-combobox__empty" {...rest}>{children}</li>
}
