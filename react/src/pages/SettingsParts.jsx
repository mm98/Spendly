import { useEffect, useRef } from 'react'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'

/** A card's heading, which is where /settings/<section> lands focus. */
export function Heading({ section, children }) {
	return <span className="sp-section-label st-landing" data-section={section} tabIndex={-1}>{children}</span>
}

/** A combobox over a fixed list of `{ id, label }`. `figure` and `suffix` draw a number and its
    unit in the trigger, as Rows per page does; both sit in the value, so the trigger's name reads them.
    `narrow` caps it at the 280 that 11a draws a half's combobox at. */
export function Choose({ options, value, onChange, figure, suffix, id, narrow = false }) {
	const chosen = options.find(o => o.id === value)
	const box = (
		<Combobox id={id} value={figure ? <span className="sp-row-flex sp-gap-8">{figure} {suffix}</span> : chosen?.label ?? ''}>
			{options.map(o => (
				<ComboboxOption key={o.id} selected={o.id === value} onSelect={() => onChange(o.id)}>{o.label}</ComboboxOption>
			))}
		</Combobox>
	)
	return narrow ? <div className="st-w280">{box}</div> : box
}

/** `then(target)` before a step sends focus, once drawn, to the id `target`, the first footer
    button ('action') or the heading; only while focus is in the card or has dropped to the page. */
export function useStepFocus(stage) {
	const box = useRef(null)
	const next = useRef(null)
	useEffect(() => {
		const target = next.current
		next.current = null
		const card = box.current
		if (!target || !card) return
		const at = document.activeElement
		if (at && at !== document.body && !card.contains(at)) return
		const el = target === 'heading' ? card.querySelector('[data-section]')
			: target === 'action' ? card.querySelector('.sp-card__footer button:not(:disabled)')
			: document.getElementById(target)
		el?.focus()
	}, [stage])
	return { box, then: target => { next.current = target } }
}
