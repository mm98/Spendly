import { useState } from 'react'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'

/** A card's heading, which is where /settings/<section> lands focus. */
export function Heading({ section, children }) {
	return <span className="sp-section-label st-landing" data-section={section} tabIndex={-1}>{children}</span>
}

/** A combobox over a fixed list of `{ id, label }`, closed again once one is picked.
    `figure` and `suffix` draw a number and its unit in the trigger, as Rows per page does. */
export function Choose({ options, value, onChange, figure, suffix, id }) {
	const [open, setOpen] = useState(false)
	const chosen = options.find(o => o.id === value)
	return (
		<Combobox id={id} open={open} onOpenChange={setOpen} lead={figure} value={suffix ?? chosen?.label ?? ''}>
			{options.map(o => (
				<ComboboxOption key={o.id} selected={o.id === value}
					onSelect={() => { setOpen(false); onChange(o.id) }}>{o.label}</ComboboxOption>
			))}
		</Combobox>
	)
}
