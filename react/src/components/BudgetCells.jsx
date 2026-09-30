import { useEffect, useRef, useState } from 'react'
import { AMOUNT_PATTERN, amount, parseAmount, sanitizeAmount } from '../api/format.js'

/* What every view of the budget shares: how a month is counted and summed, and the field an
   amount becomes while it is typed. */

export const join = (...parts) => parts.filter(Boolean).join(' ')
export const MONTHS = 12
/** A month's short name with its number, the way the budget's headers write it: Jan (1). */
export const numbered = (name, m) => <>{name} <span className="month-number">({m + 1})</span></>
export const KINDS = [{ kind: 'income', title: 'Income' }, { kind: 'expense', title: 'Costs' }]

// What the sheet counts for a month: the real amount where there is one, else the expected.
export const shown = m => m.real ?? m.expected
export const sumMonths = lines => Array.from({ length: MONTHS }, (_, m) =>
	lines.reduce((sum, line) => sum + (shown(line.months[m]) ?? 0), 0))
export const sum = values => values.reduce((a, b) => a + b, 0)
// Rounded to two decimals first, so a sum a hair under zero is drawn as 0,00, not -0,00.
export const cents = n => Math.round(n * 100) / 100
export const figure = n => (n == null ? '' : amount(cents(n)))

// A signed row colours each figure by the sign it is shown with, so a figure drawn as 0 stays plain.
export const signOf = value => (cents(value) > 0 ? 'is-positive' : cents(value) < 0 ? 'is-negative' : null)

/* The input a cell becomes. It overlays the cell and grows past it, the way a spreadsheet's does. */
export function CellEditor({ initial, typed, hint, label, onCommit, onCancel, onInvalid }) {
	const [text, setText] = useState(initial)
	const [error, setError] = useState('')
	const input = useRef(null)
	const done = useRef(false)

	useEffect(() => {
		const el = input.current
		el?.focus()
		if (typed == null) el?.select()
		else el?.setSelectionRange(el.value.length, el.value.length)
	}, [typed])

	const valid = clean => !clean || AMOUNT_PATTERN.test(clean)
	const finish = direction => {
		const clean = text.trim()
		if (!valid(clean)) { setError('Amounts take a comma, such as 1.234,56.'); return }
		done.current = true
		onCommit(clean ? parseAmount(clean) : null, direction)
	}

	return (
		<span className="budget-editor">
			<input ref={input} id="budget-cell-editor" inputMode="decimal" autoComplete="off" value={text}
				aria-label={label} aria-invalid={error ? 'true' : undefined}
				aria-describedby={error ? 'budget-cell-editor-error' : hint ? 'budget-cell-editor-hint' : undefined}
				onChange={e => { setText(sanitizeAmount(e.target.value)); setError('') }}
				onKeyDown={e => {
					if (e.key === 'Enter') { e.preventDefault(); finish(e.shiftKey ? 'up' : 'down') }
					else if (e.key === 'Tab') { e.preventDefault(); finish(e.shiftKey ? 'left' : 'right') }
					else if (e.key === 'Escape') { e.preventDefault(); done.current = true; onCancel(true) }
				}}
				onBlur={() => {
					if (done.current) return
					done.current = true
					const clean = text.trim()
					if (text === initial && typed == null) onCancel(false)
					else if (!valid(clean)) { onInvalid(); onCancel(false) }
					else onCommit(clean ? parseAmount(clean) : null, null)
				}} />
			{error ? <span className="budget-editor-note is-error" id="budget-cell-editor-error" role="alert">{error}</span>
				: hint ? <span className="budget-editor-note" id="budget-cell-editor-hint">{hint}</span> : null}
		</span>
	)
}
