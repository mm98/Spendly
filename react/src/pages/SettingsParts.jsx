import { useEffect, useRef } from 'react'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { reject } from '../components/variants.js'

/** What a card's head carries to be where /settings/<section> lands focus (9c). */
export const landing = section => ({ 'data-section': section, tabIndex: -1 })

/** A combobox over a fixed list of `{ id, label }`. `figure` and `suffix` draw a number and its
    unit in the trigger, as Rows per page does; both sit in the value, so the trigger's name reads them.
    `narrow` caps it at the field width 11a draws a half's combobox at. */
export function Choose({ options, value, onChange, figure, suffix, id, narrow = false }) {
	const chosen = options.find(o => o.id === value)
	return (
		<Combobox id={id} variant={narrow ? 'narrow' : 'default'} value={figure ? <span className="sp-row-flex sp-gap-8">{figure} {suffix}</span> : chosen?.label ?? ''}>
			{options.map(o => (
				<ComboboxOption key={o.id} selected={o.id === value} onSelect={() => onChange(o.id)}>{o.label}</ComboboxOption>
			))}
		</Combobox>
	)
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

const lines = tone => (
	<>
		<span className="st-theme__rail" />
		<span className="st-theme__body">
			<span className={`st-theme__line st-theme__line--${tone}`} />
			<span className={`st-theme__line st-theme__line--${tone}`} />
		</span>
	</>
)

const LOOK = {
	light: <span className="st-theme__preview st-theme__preview--light">{lines('light')}</span>,
	dark: <span className="st-theme__preview st-theme__preview--dark" data-theme="dark">{lines('dark')}</span>,
	system: (
		<span className="st-theme__preview st-theme__preview--split">
			<span className="st-theme__half st-theme__half--light">{lines('light')}</span>
			<span className="st-theme__half st-theme__half--dark" data-theme="dark">{lines('dark')}</span>
		</span>
	)
}

/** The theme to pick, one tile per theme, each drawn as the app looks in it (Settings 11a). */
export function ThemeTiles({ name, options = [], value, onChange, ...rest }) {
	reject(rest, 'ThemeTiles')
	return (
		<div className="st-trio" {...rest}>
			{options.map(option => (
				<label className="sp-well st-theme" key={option.value}>
					<input type="radio" className="sp-radio" name={name} value={option.value}
						checked={value === option.value} onChange={() => onChange?.(option.value)} />
					{LOOK[option.value]}
					<span className="sp-subtitle sp-center st-theme__name">{option.label}</span>
				</label>
			))}
		</div>
	)
}

// a set of radios, so Field names it with a legend rather than a label
ThemeTiles.fieldRole = 'group'
