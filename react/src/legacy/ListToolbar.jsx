import { useId, useRef } from 'react'
import { Icon } from './Icon.jsx'
import { FieldShell } from './Form.jsx'
import { Combobox } from './Combobox.jsx'
import { Chip } from './Chip.jsx'
import { Button, ButtonLink } from './Button.jsx'
import { useToast } from './Toast.jsx'

/* The row four working lists open with. The sort is the app's one combobox for the job -- a
   native <select> here would be a second dropdown pattern. README: Fields and Forms. */

export function ListToolbar({
	query, onQuery, placeholder, label, searchRef,
	sortLabel, sorts, sortValue, onSort,
	/* `{ open, onToggle, panelId }`, or nothing at all: a list whose only filter is the
	   keyword must not draw a disclosure over an empty panel. */
	filters
}) {
	const id = useId()
	return (
		<div className="row-inline toolbar">
			<FieldShell>
				<Icon name="search" />
				<input ref={searchRef} type="search" id={id} value={query} placeholder={placeholder}
					aria-label={label} onChange={e => onQuery(e.target.value)} />
			</FieldShell>
			{filters ? (
				<Button variant="ghost" icon="filters"
					data-filters-toggle aria-expanded={filters.open} aria-controls={filters.panelId}
					onClick={filters.onToggle}>
					FILTERS
					<Icon name="chevronDown" className="icon chevron-icon" />
				</Button>
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

/** A chip is the only place a filter is stored, so a chip that is gone is a filter that is off.
    Removing one takes away the element focus was on, so `focusRef` is where it lands. */
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
