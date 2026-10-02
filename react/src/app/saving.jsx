import { currency, isSaving } from '../api/format.js'

const LOOK = {
	amount: { on: { className: 'sp-amount-secondary', 'data-color': 'success' }, off: { className: 'sp-amount-secondary' } },
	stat: { on: { className: 'sp-stat__delta' }, off: { className: 'sp-amount-secondary' } },
	help: { on: { className: 'sp-field__help', 'data-color': 'success' }, off: { className: 'sp-field__help' } }
}

/** What was saved, always as an amount: green when it reads above zero, else a grey 0,00. `variant`
    is the line it sits on: under an amount, a card's figure, or a caption. */
export function Saving({ value, variant = 'amount' }) {
	const on = isSaving(value)
	return <span {...LOOK[variant][on ? 'on' : 'off']}>Saved {currency(on ? Number(value) : 0)}</span>
}
