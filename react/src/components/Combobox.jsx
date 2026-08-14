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

export function Combobox({
	value, onChange, onSelect, groups = [], action, placeholder, label, required,
	leadingIcon, id, invalid, describedBy, children, chips, className
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

	/* The action row is "create what was typed," so there is nothing to create until something
	   is typed -- CREATE VENDOR "" offered a vendor with no name. And typing the name of one
	   that already exists should pick it, not offer a second one of the same name, which is
	   the same rule Enter already follows below. */
	const typed = String(value ?? '').trim()
	const typedMatches = typed && groups.some(g => g.options.some(o => o.label.toLowerCase() === typed.toLowerCase()))
	const showAction = Boolean(action) && Boolean(typed) && !typedMatches

	const inputEl = (
		<input ref={input} type="text" id={id} role="combobox"
			aria-expanded={open} aria-controls={panelId} aria-autocomplete="list"
			aria-label={label} aria-required={required || undefined}
			aria-invalid={invalid ? 'true' : undefined}
			aria-describedby={invalid ? describedBy : undefined}
			value={value} placeholder={placeholder}
			onChange={e => { onChange?.(e.target.value); setOpen(true) }}
			onClick={() => setOpen(true)}
			onKeyDown={e => {
				if (e.key === 'Escape') { setOpen(false); return }
				if (e.key !== 'ArrowDown' && e.key !== 'Enter') return
				e.preventDefault()
				/* Enter runs the action at the foot of the list -- CREATE VENDOR "…", ADD
				   CATEGORY "…" -- but only when what was typed matches nothing already there.
				   Typing the name of something that exists and pressing Enter should pick it,
				   not make a second one. */
				if (e.key === 'Enter' && action && typed) {
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
			<div className={join('field-shell', wrapping && 'field-shell-chips')}
				style={wrapping ? { height: 'auto', minHeight: 48 } : undefined}>
				{leadingIcon ? <Icon name={leadingIcon} /> : null}
				{chips}
				{inputEl}
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
				{groups.map(group => (
					<div className="combobox-group" key={group.heading}>
						<div className="combobox-group-heading">{group.heading}</div>
						{group.options.map((option, i) => {
							const selected = isSelected(option.label, value ?? '')
							return (
								<div key={option.id ?? option.label}
									className={join('combobox-option', option.highlighted && 'combobox-option-highlighted',
										selected && 'combobox-option-selected')}
									role="option" aria-selected={option.highlighted || selected ? true : undefined}
									onClick={e => choose(e, option)}>
									{option.star ? <span className="combobox-option-star"><Icon name="starFilled" /></span> : null}
									{selected ? option.label : <Marked text={option.label} query={value ?? ''} />}
									{option.meta ? <span className="combobox-option-meta">{option.meta}</span> : null}
								</div>
							)
						})}
					</div>
				))}
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
