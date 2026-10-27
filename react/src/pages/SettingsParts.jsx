import { Children, Fragment, createContext, useContext, useEffect, useRef } from 'react'
import { Switch } from '../components/Choice.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'

/** What a card's head carries to be where /settings/<section> lands focus (9c). */
export const landing = section => ({ 'data-section': section, tabIndex: -1 })

/** A combobox over a fixed list of `{ id, label }`. `figure` and `suffix` draw a number and its
    unit in the trigger, as Rows per page does; both sit in the value, so the trigger's name reads them.
    `narrow` caps it at the field width 11a draws a half's combobox at. */
export function Choose({ options, value, onChange, figure, suffix, id, narrow = false, ...named }) {
	const chosen = options.find(o => o.id === value)
	return (
		<Combobox id={id} variant={narrow ? 'narrow' : 'default'} {...named} value={figure ? <span className="sp-row-flex sp-gap-8">{figure} {suffix}</span> : chosen?.label ?? ''}>
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

/** On a phone, the group a Settings page shows, and the section of its first card: that card's head
    carries the group's name before its own, and the way back to the list (25f). Null off a phone. */
export const SettingsGroup = createContext(null)

/** A Settings card's head on a phone, where the group's first card also names the group and leads
    back to the list (25f): `named` puts the group's name before the card's, `back` is All settings. */
export function useSettingsHead(section) {
	const group = useContext(SettingsGroup)
	const first = group?.first === section
	return {
		named: name => (first ? `${group.name} · ${name}` : name),
		back: first ? [{ label: 'All settings', to: '/settings' }] : undefined
	}
}

/** One setting as one row of the wide form (25): its name and help at the left, the control at the
    right. `top` starts both columns at the top, for a control that is a list. `htmlFor` names the
    field the label belongs to; a control without one carries the label's words as its own name. */
export function SettingRow({ label, help, helpDanger = false, htmlFor, top = false, children }) {
	return (
		<div className={top ? 'st-form-row st-form-row--top' : 'st-form-row'}>
			<span className="sp-stacked">
				{htmlFor
					? <label className="sp-field__label" htmlFor={htmlFor}>{label}</label>
					: <span className="sp-field__label">{label}</span>}
				{help
					? <span className={helpDanger ? 'sp-meta sp-ink-danger' : 'sp-meta'} role={helpDanger ? 'alert' : undefined}>{help}</span>
					: null}
			</span>
			{children}
		</div>
	)
}

/** A setting that is a switch: the whole row is its label, so a tap anywhere on it flips the switch. */
export function SwitchRow({ label, help, checked, onChange }) {
	return (
		<label className="st-form-row">
			<span className="sp-stacked">
				<span className="sp-field__label">{label}</span>
				{help ? <span className="sp-meta">{help}</span> : null}
			</span>
			<span className="sp-row-flex">
				<Switch checked={checked} onChange={ev => onChange(ev.target.checked)} />
			</span>
		</label>
	)
}

/** The rows of one card, with the card's rule between each two; a row left out takes its rule with it. */
export function SettingRows({ children }) {
	return Children.toArray(children).filter(Boolean).map((row, i) => (
		<Fragment key={row.key ?? i}>
			{i ? <span className="sp-rule" /> : null}
			{row}
		</Fragment>
	))
}
