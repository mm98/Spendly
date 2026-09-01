import { useRef } from 'react'
import { Icon } from './Icon.jsx'
import { FieldShell } from './Form.jsx'
import { Combobox } from './Combobox.jsx'
import { Chip } from './Chip.jsx'
import { ButtonLink } from './Button.jsx'
import { useToast } from './Toast.jsx'

/* The row every working list opens with, and the chips under it.

   Four lists ask the same two questions -- what are you looking for, and in what order --
   and they were four copies of the same twelve lines, agreeing only until one of them was
   fixed. The sort is the app's one combobox for the job (a native <select> here would be a
   second dropdown pattern), the search is one `input type=search` inside the field shell, and
   the FILTERS disclosure sits between them on the lists that have a panel to open. README:
   Fields and Forms, All Orders. */

export function ListToolbar({
	query, onQuery, placeholder, label, searchRef,
	sortLabel, sorts, sortValue, onSort,
	/* `{ open, onToggle, panelId }`, or nothing at all: a list whose only filter is the
	   keyword must not draw a disclosure over an empty panel. */
	filters
}) {
	return (
		<div className="row-inline toolbar">
			<FieldShell>
				<Icon name="search" />
				<input ref={searchRef} type="search" value={query} placeholder={placeholder}
					aria-label={label} onChange={e => onQuery(e.target.value)} />
			</FieldShell>
			{filters ? (
				<button type="button" className="button button-ghost"
					data-filters-toggle aria-expanded={filters.open} aria-controls={filters.panelId}
					onClick={filters.onToggle}>
					<Icon name="filters" />FILTERS
					<Icon name="chevronDown" className="icon chevron-icon" />
				</button>
			) : null}
			{/* `.toolbar-sort` is the slot and the stylesheet owns its width -- never an inline
			    width on a wrapper, which beats any rule the phone layout could write. */}
			<Combobox className="toolbar-sort" label={sortLabel}
				value={sortValue} onChange={() => {}}
				onSelect={o => onSort(o.id)}
				groups={[{ heading: 'Sort by', options: sorts.map(s => ({ id: s.id, label: s.label })) }]} />
		</div>
	)
}

const countSentence = n => n ? n + (n === 1 ? ' filter still active.' : ' filters still active.') : 'No filters are set.'

/** The filters that are on. A chip is the only place a filter is stored, so a chip that is gone
    is a filter that is off — never a picture of one. Removing one takes away the element focus
    was on, so focus is put somewhere deliberate and the change is announced once. README:
    Honest Affordances, Accessibility.

    `chips` are `{ key, label }`; `onRemove` and `onClearAll` are what actually change the
    list's state, and `focusRef` is where focus lands when no chip is left to take it. */
export function FilterChips({ chips, onRemove, onClearAll, focusRef }) {
	const row = useRef(null)
	const toast = useToast()

	if (!chips.length) return null

	const land = at => {
		const buttons = [...(row.current?.querySelectorAll('[data-chip]') ?? [])]
		const next = buttons[at] || buttons[at - 1] || focusRef?.current || document.getElementById('page-title')
		next?.focus()
	}

	return (
		<div className="row-inline chip-row" ref={row}>
			{chips.map((chip, i) => (
				<Chip key={chip.key} data-chip={chip.key} label={'Remove filter ' + chip.label}
					onRemove={() => {
						onRemove(chip)
						toast(chip.label + ' removed. ' + countSentence(chips.length - 1))
						queueMicrotask(() => land(i))
					}}>{chip.label}</Chip>
			))}
			<ButtonLink className="button-link" onClick={() => {
				onClearAll()
				toast('All filters cleared.')
				queueMicrotask(() => (focusRef?.current || document.getElementById('page-title'))?.focus())
			}}>CLEAR ALL</ButtonLink>
		</div>
	)
}
