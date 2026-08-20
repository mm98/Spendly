import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon.jsx'

/* One combobox, used by every dropdown in the app: type to search, grouped results, create
   from the foot. The prototype's own help text promises exactly that, so a second dropdown
   pattern anywhere would be a promise the app breaks in one place.

   ARIA 1.2 puts role=combobox on the input, so the input is what owns aria-expanded --
   not the wrapper, and not the shell. Space types a space in a real input, so only Down and
   Enter open the list; Escape closes it and hands focus back. */

const join = (...parts) => parts.filter(Boolean).join(' ')

/** Marks the typed text inside a result. The prototype hard-codes <mark>Bil</mark>ka, which
    is right for one query and wrong for every other -- doing it from the value means the
    highlight always describes what was actually typed. */
function Marked({ text, query }) {
	const needle = query.trim()
	if (!needle) return text
	const at = text.toLowerCase().indexOf(needle.toLowerCase())
	if (at < 0) return text
	return (
		<>
			{text.slice(0, at)}
			<mark>{text.slice(at, at + needle.length)}</mark>
			{text.slice(at + needle.length)}
		</>
	)
}

/* The value is the selected option's own label whenever nothing is being typed over it --
   true of every non-searchable list (Sort by has no typing at all) and of a searchable one
   at rest. That case reads as "this is the selected row", not "this is what was typed", so
   it gets the row's own sticky highlight rather than a <mark> wrapped around the letters. */
const isSelected = (label, query) => {
	const needle = query.trim()
	return Boolean(needle) && label.toLowerCase() === needle.toLowerCase()
}

/* `pickOnly`: Sort by, a currency, a date format -- every list here that is chosen from
   rather than typed into. The field is still a real `<input>`, because everything about
   opening and walking the list is the same either way, but without this it looks editable:
   a click drops a blinking caret in it and invites the letters that `onChange={() => {}}`
   then quietly discards. `readOnly` on the input is what removes the caret and the mobile
   keyboard along with it, while leaving the click, the arrow keys and Enter exactly as they
   were -- none of those go through `onChange`. README: Combobox. */
export function Combobox({
	value, onChange, onSelect, groups = [], action, placeholder, label, required,
	leadingIcon, id, invalid, describedBy, children, chips, trail, className, pickOnly
}) {
	const [open, setOpen] = useState(false)
	const wrapper = useRef(null)
	const input = useRef(null)
	const panelId = useId().replace(/:/g, '') + '-panel'

	/* Closing on an outside click is a document listener, so it has to ignore clicks inside
	   this combobox -- otherwise choosing an option closes the list before the choice lands. */
	useEffect(() => {
		if (!open) return
		const onDocumentClick = e => { if (!wrapper.current?.contains(e.target)) setOpen(false) }
		const onKey = e => {
			if (e.key !== 'Escape') return
			setOpen(false)
			input.current?.focus()
		}
		document.addEventListener('click', onDocumentClick)
		document.addEventListener('keydown', onKey)
		return () => {
			document.removeEventListener('click', onDocumentClick)
			document.removeEventListener('keydown', onKey)
		}
	}, [open])

	/* preventDefault matters here: a Field renders as <label>, so a click anywhere inside it
	   is forwarded to the labelled control -- and the input's own click handler reopens the
	   list a beat after this closed it. The option is a div, so nothing is lost by stopping
	   the default; focus is put back on the input deliberately below. */
	const choose = useCallback((e, option) => {
		e.preventDefault()
		e.stopPropagation()
		onSelect ? onSelect(option) : onChange?.(option.label)
		setOpen(false)
		input.current?.focus()
	}, [onChange, onSelect])

	/* Chips ride inside the shell, not above it.

	   A field whose values sit in a stack over the input is a field whose input starts lower
	   than the one beside it, and the pair stops lining up the moment one of them has a value.
	   The prototype puts them in the same box for that reason: the shell grows downwards from
	   a shared top edge, so both fields still start on the same line. README: Combobox. */
	const wrapping = Boolean(chips)

	/* The shell is the whole clickable field -- the border, the chevron, the padding around
	   the text -- not just the input inside it. Without this, only the input's own onClick
	   opened the list, so the chevron and the rest of the box did nothing, which reads as a
	   dead control everywhere the input doesn't fill the shell (the width picker, every
	   toolbar sort). A click already on a real button here -- a chip's own remove -- keeps
	   its own effect and does not also reopen the list. */
	const onShellClick = e => {
		if (e.target.closest('button')) return
		input.current?.focus()
		setOpen(true)
	}

	/* The action row is "create what was typed," so there is nothing to create until something
	   is typed -- CREATE VENDOR "" offered a vendor with no name. And typing the name of one
	   that already exists should pick it, not offer a second one of the same name, which is
	   the same rule Enter already follows below. */
	const typed = String(value ?? '').trim()
	const typedMatches = typed && groups.some(g => g.options.some(o => o.label.toLowerCase() === typed.toLowerCase()))
	const showAction = Boolean(action) && Boolean(typed) && !typedMatches

	/* Typing filters the list; marking alone left every non-match in place, so a hit on a long
	   list sat as far below the fold as ever. A value that names an option exactly is the
	   resting selection rather than a search -- filtering by it would shrink the reopened list
	   to the one row already chosen -- so the full list returns the moment a choice lands. A
	   group filtered empty gives up its heading too, Favourites included. An option answers to
	   more than its own label wherever the caller says so -- `search` is what the typed text is
	   matched against when present, `label` is only ever what gets drawn and marked. */
	const searching = Boolean(typed) && !typedMatches
	const shown = (searching
		? groups.map(g => ({ ...g, options: g.options.filter(o =>
			(o.search ?? o.label).toLowerCase().includes(typed.toLowerCase())) }))
		: groups
	).filter(g => g.options.length)
	const noMatch = searching && shown.length === 0

	/* The keyboard walks what the panel shows. `active` indexes the flattened *shown* list --
	   never `groups` -- so Down after a search lands on the first match, not on whatever the
	   full list holds at that position. It resets whenever the list under it can have changed
	   (a keystroke, an open, a close): a highlight that survives a re-filter points at a
	   different row than the one the user marked. */
	const [active, setActive] = useState(-1)
	const flat = shown.flatMap(g => g.options)
	const activeOption = active >= 0 && active < flat.length ? flat[active] : null
	useEffect(() => { setActive(-1) }, [value, open])

	/* The marked row keeps itself in view -- the panel scrolls, and an invisible highlight is
	   no highlight. 'nearest' so walking downwards drags the list the minimum it needs. */
	useEffect(() => {
		if (activeOption) document.getElementById(`${panelId}-opt-${active}`)?.scrollIntoView({ block: 'nearest' })
	}, [active, activeOption, panelId])

	const inputEl = (
		<input ref={input} type="text" id={id} role="combobox" readOnly={pickOnly}
			aria-expanded={open} aria-controls={panelId} aria-autocomplete={pickOnly ? 'none' : 'list'}
			aria-label={label} aria-required={required || undefined}
			aria-invalid={invalid ? 'true' : undefined}
			aria-describedby={invalid ? describedBy : undefined}
			aria-activedescendant={activeOption ? `${panelId}-opt-${active}` : undefined}
			value={value} placeholder={placeholder}
			onChange={e => { onChange?.(e.target.value); setOpen(true) }}
			onClick={() => setOpen(true)}
			onKeyDown={e => {
				if (e.key === 'Escape') { setOpen(false); return }
				if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return
				e.preventDefault()
				/* Down and Up walk the shown options, wrapping at either end. The first Down on
				   a closed field opens it and stops -- see the list, then walk it. */
				if (e.key !== 'Enter') {
					if (!open) { setOpen(true); return }
					if (!flat.length) return
					setActive(a => e.key === 'ArrowDown'
						? (a + 1) % flat.length
						: a <= 0 ? flat.length - 1 : a - 1)
					return
				}
				/* Enter picks the marked row first; with nothing marked it keeps the old rule --
				   an exact name picks the thing named, so typing what exists cannot create a
				   second one, and anything else runs the action at the foot: CREATE VENDOR
				   "...", ADD "...". */
				if (activeOption) { choose(e, activeOption); return }
				if (action && typed) {
					const match = groups.flatMap(g => g.options)
						.find(o => o.label.toLowerCase() === typed.toLowerCase())
					if (match) { choose(e, match); return }
					action.onSelect?.(typed)
					setOpen(false)
					return
				}
				setOpen(true)
			}} />
	)

	/* className is the caller's slot, not a second skin: a combobox standing in a layout the
	   design system has a name for -- the toolbar's sort control -- wears that name itself
	   rather than sitting in a wrapper div holding an inline width. */
	return (
		<div className={join('combobox', open && 'is-open', className)} ref={wrapper}>
			<div className={join('field-shell', wrapping && 'field-shell-chips')} onClick={onShellClick}>
				{leadingIcon ? <Icon name={leadingIcon} /> : null}
				{chips}
				{inputEl}
				{/* Trailing chips ride inside the border like FieldShell's do -- the scan review's
				    "matched" chip sits here, between the input and the chevron. */}
				{trail}
				{/* The chevron used to wrap with the chips and the input, so a full line of
				    chips left it no room and dropped it to a line of its own -- with the input,
				    left to reserve a flex-basis of its own, overflowing the shell's right edge
				    uncut instead of shrinking into whatever room that left behind. Taking the
				    chevron out of the wrapping flow entirely (field-shell-chips in app.css pins
				    it, absolute, to the shell's corner, and reserves its width in the shell's own
				    right padding) means chips+input are the only thing that wraps, and the input
				    -- flex-basis 0, so it competes for room rather than reserving any of its own
				    -- shrinks into whatever's left on the line, truncating the typed text with an
				    ellipsis, instead of pushing the chevron anywhere. README: Combobox. */}
				<Icon name="chevronDown" className="icon chevron-icon" />
			</div>
			<div className="combobox-panel" id={panelId} role="listbox" aria-label={label}>
				{shown.map((group, gi) => {
					/* The flat index this group starts at, so a row's id and the keyboard's
					   `active` agree on which row is which across group boundaries. */
					const before = shown.slice(0, gi).reduce((n, g) => n + g.options.length, 0)
					return (
					<div className="combobox-group" key={group.heading}>
						<div className="combobox-group-heading">{group.heading}</div>
						{group.options.map((option, i) => {
							const selected = isSelected(option.label, value ?? '')
							const marked = before + i === active
							return (
								<div key={option.id ?? option.label} id={`${panelId}-opt-${before + i}`}
									className={join('combobox-option', (option.highlighted || marked) && 'combobox-option-highlighted',
										selected && 'combobox-option-selected')}
									role="option" aria-selected={option.highlighted || marked || selected ? true : undefined}
									onClick={e => choose(e, option)}>
									{option.star ? <span className="combobox-option-star"><Icon name="starFilled" /></span> : null}
									{selected ? option.label : <Marked text={option.label} query={value ?? ''} />}
									{option.meta ? <span className="combobox-option-meta">{option.meta}</span> : null}
								</div>
							)
						})}
					</div>
					)
				})}
				{/* Filtered to nothing is a state to name, not an empty box: the sentence says the
				    search worked and found none, and the action below it (where a caller offers
				    one) is what to do about it. */}
				{noMatch ? <p className="combobox-empty">{`No match for "${typed}".`}</p> : null}
				{children}
				{showAction ? (
					<div className="combobox-action"
						onClick={e => { e.preventDefault(); e.stopPropagation(); action.onSelect?.(value); setOpen(false) }}>
						{action.icon ? <Icon name={action.icon} /> : null}{action.label}
					</div>
				) : null}
			</div>
		</div>
	)
}
