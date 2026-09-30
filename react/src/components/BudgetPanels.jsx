import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, IconButton } from './Button.jsx'
import { Combobox } from './Combobox.jsx'
import { CheckRow, Field, FieldShell, FormActions, TextInput, focusField, useFieldErrors } from './Form.jsx'
import { useRowDelete } from './FormPage.jsx'
import { Sep } from './Sep.jsx'
import { KINDS, MONTHS, join } from './BudgetCells.jsx'
import { amount, monthNames, parseAmount, plural, sanitizeAmount } from '../api/format.js'
import { BUDGET_ACCOUNT_FIELDS, BUDGET_AMOUNT, BUDGET_GROUP_FIELDS, BUDGET_ROW_FIELDS } from '../api/rules.js'
import {
	addBudgetAccount, addBudgetGroup, addBudgetLine, deleteBudgetGroup, deleteBudgetLine, updateBudgetAccount,
	updateBudgetGroup, updateBudgetLine
} from '../api/client.js'

/* Focus that waits for the next render, since the button it goes back to may be one that
   render draws: an add button a panel stood in for, or a row that has just moved. */
export function useFocusLater() {
	const target = useRef(null)
	useEffect(() => {
		if (!target.current) return
		const el = document.getElementById(target.current)
		target.current = null
		if (el && !el.disabled) el.focus()
	})
	return useCallback(id => { target.current = id }, [])
}

// A thing moved to the top or the bottom leaves that button disabled, so focus takes the other one.
const buttonAfterMove = (id, to, step, count) =>
	`${id}-${to <= 0 ? 'down' : to >= count - 1 ? 'up' : step < 0 ? 'up' : 'down'}`

const MoveButtons = ({ id, what, index, count, onMove }) => (
	<span className="row-inline row-actions">
		<IconButton icon="chevronUp" label={`Move the ${what} up`} id={`${id}-up`} disabled={index <= 0} onClick={() => onMove(-1)} />
		<IconButton icon="chevronDown" label={`Move the ${what} down`} id={`${id}-down`} disabled={index >= count - 1}
			onClick={() => onMove(1)} />
	</span>
)

/* Focus once, when a panel opens. The effect runs again when the row or group the panel edits is
   moved, and then focus stays on the button that moved it. */
function useFocusOnOpen(id) {
	const opened = useRef(false)
	useEffect(() => {
		if (opened.current) return
		opened.current = true
		focusField(id)
	}, [id])
}

const toNumber = text => (text.trim() ? parseAmount(text.trim()) : null)
const amountField = (kind, m) => `budget-row-${kind}-${m}`
const ROW_FIELDS = [
	...BUDGET_ROW_FIELDS,
	...Array.from({ length: MONTHS }, (_, m) => ['expected', 'real'].map(kind =>
		({ name: amountField(kind, m), label: kind, check: BUDGET_AMOUNT }))).flat()
]

const formOf = line => {
	const form = { 'budget-row-name': line?.name ?? '' }
	for (let m = 0; m < MONTHS; m++) for (const kind of ['expected', 'real']) {
		const value = line?.months[m][kind]
		form[amountField(kind, m)] = value != null ? amount(value) : ''
	}
	return form
}

/* Escape and Enter belong to an open list or dialog first: a combobox showing its options, or
   the question a delete asks, takes them before the panel behind it does. */
const listOpen = e => e.target.getAttribute?.('aria-expanded') === 'true' || e.defaultPrevented
	|| Boolean(e.target.closest?.('dialog'))

/** A row's own fields: its name, its account, its group and both amounts for each month. Given its
    place among the group's rows (`index` of `count`), the row can be moved up and down from here too. */
export function RowPanel({ sheet, line, groupId, heading, index, count, write, onClose }) {
	const months = useMemo(() => monthNames('short'), [])
	const longMonths = useMemo(() => monthNames('long'), [])
	const [form, setForm] = useState(() => formOf(line))
	const [target, setTarget] = useState(groupId)
	const [accountId, setAccountId] = useState(line?.accountId ?? null)
	const [fill, setFill] = useState('')
	const [fillError, setFillError] = useState('')
	const [saving, setSaving] = useState(false)
	const errors = useFieldErrors(ROW_FIELDS, form)
	const set = name => value => { setForm(f => ({ ...f, [name]: value })); errors.recheck(name, value) }
	const setAmount = name => value => set(name)(sanitizeAmount(value))
	const focusLater = useFocusLater()
	const move = step => write(() => updateBudgetLine(line.id, { index: index + step }))
		.then(() => focusLater(buttonAfterMove('budget-row', index + step, step, count)), () => {})

	useFocusOnOpen('budget-row-name')

	const groupName = sheet.groups.find(g => g.id === target)?.name ?? ''
	const groupChoices = KINDS.map(({ kind, title }) => ({
		heading: title, options: sheet.groups.filter(g => g.kind === kind).map(g => ({ id: g.id, label: g.name }))
	}))
	const accountName = sheet.accounts.find(a => a.id === accountId)?.name ?? 'No account'
	const accountChoices = [{ heading: 'Accounts', options: [{ id: 'none', label: 'No account' },
		...sheet.accounts.map(a => ({ id: a.id, label: a.name }))] }]

	const everyMonth = (kind, value) => setForm(f => {
		const next = { ...f }
		for (let m = 0; m < MONTHS; m++) next[amountField(kind, m)] = value
		return next
	})
	const fillWith = kind => {
		const clean = fill.trim()
		const problem = !clean ? 'Write the amount first.' : BUDGET_AMOUNT(clean)
		if (problem) { setFillError(problem); focusField('budget-row-fill'); return }
		setFillError('')
		everyMonth(kind, amount(parseAmount(clean)))
	}

	const save = async () => {
		if (saving) return
		const failed = errors.check()
		if (failed.length) { focusField(failed[0].name); return }
		const body = {
			name: form['budget-row-name'].trim(),
			accountId,
			months: Array.from({ length: MONTHS }, (_, m) => ({
				expected: toNumber(form[amountField('expected', m)]), real: toNumber(form[amountField('real', m)])
			}))
		}
		setSaving(true)
		try {
			await write(() => (line
				? updateBudgetLine(line.id, target !== groupId ? { ...body, groupId: target } : body)
				: addBudgetLine(target, body)))
			onClose()
		} catch {
			setSaving(false)
		}
	}

	const rowDelete = useRowDelete({
		what: 'row',
		label: l => `Delete the row ${l.name}`,
		detail: l => `${l.name}, with every amount in it.`,
		onDelete: l => write(() => deleteBudgetLine(l.id)).then(() => onClose(true), () => {})
	})

	const keys = e => {
		if (listOpen(e)) return
		if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
		if (e.key === 'Enter' && e.target instanceof HTMLInputElement) { e.preventDefault(); save() }
	}

	const name = errors.propsFor('budget-row-name')

	return (
		<div className="filter-section line-card budget-panel" onKeyDown={keys}>
			<div className="line-card-head">
				<span className="section-label line-card-title">{heading}</span>
				{line && count != null ? <MoveButtons id="budget-row" what="row" index={index} count={count} onMove={move} /> : null}
				<span className="field-help push-end line-card-keys">Enter saves<Sep />Escape cancels</span>
			</div>
			<div className="budget-panel-fields">
				<Field label="Name" htmlFor="budget-row-name" error={name.error} errorId={name.errorId}>
					<FieldShell>
						<TextInput id="budget-row-name" aria-required="true" value={form['budget-row-name']}
							onChange={set('budget-row-name')} invalid={name.invalid} describedBy={name.describedBy} />
					</FieldShell>
				</Field>
				<Field label="Account" optional htmlFor="budget-row-account"
					help="Where the money is paid from, or paid into. The list of accounts is under the sheet.">
					<Combobox id="budget-row-account" label="Account" pickOnly value={accountName} groups={accountChoices}
						onSelect={o => setAccountId(o.id === 'none' ? null : o.id)} />
				</Field>
				<Field label="Group" htmlFor="budget-row-group">
					<Combobox id="budget-row-group" label="Group" pickOnly value={groupName} groups={groupChoices}
						onSelect={o => setTarget(o.id)} />
				</Field>
			</div>
			<div className="budget-panel-months" role="group" aria-label="Amounts for each month">
				<p className="field-help budget-panel-legend">In each month, the upper field is the expected amount.
					The lower field is the real amount. The sheet shows the real amount when there is one.</p>
				{months.map((month, m) => {
					const expected = errors.propsFor(amountField('expected', m))
					const real = errors.propsFor(amountField('real', m))
					return (
						<div key={m} className="budget-panel-month">
							<span className="budget-panel-month-name">{month}</span>
							{[['expected', expected, 'Expected'], ['real', real, 'Real']].map(([kind, props, word]) => (
								<Fragment key={kind}>
									<input id={amountField(kind, m)} inputMode="decimal" autoComplete="off"
										className={join('budget-panel-amount', kind === 'expected' && 'is-expected')}
										aria-label={`${word} amount, ${longMonths[m]}`} value={form[amountField(kind, m)]}
										aria-invalid={props.invalid ? 'true' : undefined}
										aria-describedby={props.invalid ? props.describedBy : undefined}
										onChange={e => setAmount(amountField(kind, m))(e.target.value)} />
									{props.error ? <span className="field-error" id={props.errorId}>{props.error}</span> : null}
								</Fragment>
							))}
						</div>
					)
				})}
			</div>
			<div className="field budget-panel-tools">
				<span id="budget-row-fill-label">Same amount in every month</span>
				<div className="row-inline budget-panel-tool-buttons">
					<input id="budget-row-fill" inputMode="decimal" autoComplete="off" className="budget-panel-amount"
						aria-labelledby="budget-row-fill-label" value={fill} aria-invalid={fillError ? 'true' : undefined}
						aria-describedby={fillError ? 'budget-row-fill-error' : undefined}
						onChange={e => { setFill(sanitizeAmount(e.target.value)); setFillError('') }} />
					<Button variant="ghost compact" onClick={() => fillWith('expected')}>SET AS EXPECTED</Button>
					<Button variant="ghost compact" onClick={() => fillWith('real')}>SET AS REAL</Button>
					<Button variant="ghost compact" onClick={() => everyMonth('expected', '')}>CLEAR EXPECTED</Button>
					<Button variant="ghost compact" onClick={() => everyMonth('real', '')}>CLEAR REAL</Button>
				</div>
				{fillError ? <span className="field-error" id="budget-row-fill-error">{fillError}</span> : null}
			</div>
			<FormActions>
				<Button variant="caps compact" icon="check" onClick={save}>
					{saving ? 'SAVING...' : line ? 'SAVE ROW' : 'ADD ROW'}</Button>
				<Button variant="ghost compact" onClick={() => onClose()}>CANCEL</Button>
				{line ? (
					<span className="push-end">
						{rowDelete.button(line, <span className="line-delete-label">DELETE ROW</span>, `Delete row, ${line.name}`)}
					</span>
				) : null}
			</FormActions>
			{rowDelete.dialog}
		</div>
	)
}

/** One name, saved or dropped: what a group and an account both are to edit. `onSave` answers
    with the write, so a refused name keeps the panel open with what was typed. */
function NamePanel({ id, heading, rules, initial, what, onSave, onClose, head, del, children }) {
	const [form, setForm] = useState({ [id]: initial ?? '' })
	const [saving, setSaving] = useState(false)
	const errors = useFieldErrors(rules, form)
	const name = errors.propsFor(id)

	useFocusOnOpen(id)

	const save = async () => {
		if (saving) return
		const failed = errors.check()
		if (failed.length) { focusField(failed[0].name); return }
		setSaving(true)
		try {
			await onSave(form[id].trim())
			onClose()
		} catch {
			setSaving(false)
		}
	}

	const keys = e => {
		if (listOpen(e)) return
		if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
		if (e.key === 'Enter' && e.target instanceof HTMLInputElement) { e.preventDefault(); save() }
	}

	return (
		<div className="filter-section line-card budget-panel" onKeyDown={keys}>
			<div className="line-card-head">
				<span className="section-label line-card-title">{heading}</span>
				{head}
				<span className="field-help push-end line-card-keys">Enter saves<Sep />Escape cancels</span>
			</div>
			<div className="budget-panel-fields budget-panel-fields-one">
				<Field label="Name" htmlFor={id} error={name.error} errorId={name.errorId}>
					<FieldShell>
						<TextInput id={id} aria-required="true" value={form[id]}
							onChange={v => { setForm({ [id]: v }); errors.recheck(id, v) }}
							invalid={name.invalid} describedBy={name.describedBy} />
					</FieldShell>
				</Field>
				{children}
			</div>
			<FormActions>
				<Button variant="caps compact" icon="check" onClick={save}>
					{saving ? 'SAVING...' : initial == null ? `ADD ${what}` : `SAVE ${what}`}</Button>
				<Button variant="ghost compact" onClick={() => onClose()}>CANCEL</Button>
				{del ? <span className="push-end">{del.button}</span> : null}
			</FormActions>
			{del?.dialog}
		</div>
	)
}

/** A group's name and place, or a new group for one side of the sheet. */
export function GroupPanel({ sheet, group, kind, index = 0, count = 0, write, onClose }) {
	const focusLater = useFocusLater()
	const move = step => write(() => updateBudgetGroup(group.id, { index: index + step }))
		.then(() => focusLater(buttonAfterMove('budget-group', index + step, step, count)), () => {})
	const groupDelete = useRowDelete({
		what: 'group',
		label: g => `Delete the group ${g.name}`,
		detail: g => (g.lines.length
			? `${g.name} and its ${plural(g.lines.length, 'row')}, with every amount in them.`
			: `${g.name}, which has no rows.`),
		onDelete: g => write(() => deleteBudgetGroup(g.id)).then(() => onClose(true), () => {})
	})
	return (
		<NamePanel id="budget-group-name" rules={BUDGET_GROUP_FIELDS} initial={group?.name} what="GROUP"
			heading={group ? `Group ${index + 1} of ${count}` : `New group in ${kind === 'income' ? 'income' : 'costs'}`}
			onSave={name => write(() => (group ? updateBudgetGroup(group.id, { name }) : addBudgetGroup(sheet.year, { kind, name })))}
			onClose={onClose}
			head={group ? <MoveButtons id="budget-group" what="group" index={index} count={count} onMove={move} /> : null}
			del={group ? {
				button: groupDelete.button(group, <span className="line-delete-label">DELETE GROUP</span>, `Delete group, ${group.name}`),
				dialog: groupDelete.dialog
			} : null} />
	)
}

const accountKey = name => name.trim().toLocaleLowerCase('da')

/** An account's name and whether its line in the totals is grey, or a new account at the end of
    the list. Two accounts cannot share a name, since the rows and the totals tell them apart by it. */
export function AccountPanel({ account, list, write, del, onClose }) {
	const [grey, setGrey] = useState(account?.grey ?? false)
	const rules = useMemo(() => BUDGET_ACCOUNT_FIELDS.map(rule => ({
		...rule,
		check: v => {
			const twin = list.find(a => a.id !== account?.id && accountKey(a.name) === accountKey(v))
			return rule.check(v) || (twin ? `You already have an account called ${twin.name}.` : '')
		}
	})), [list, account?.id])
	return (
		<NamePanel id="budget-account-name" rules={rules} initial={account?.name} what="ACCOUNT"
			heading={account ? 'Account' : 'New account'} onClose={onClose} del={del}
			onSave={name => write(() => (account ? updateBudgetAccount(account.id, { name, grey }) : addBudgetAccount({ name, grey })))}>
			<CheckRow id="budget-account-grey" checked={grey} onChange={setGrey} label="Grey in the totals"
				help="The account's line under Totals is shown in grey. Its costs still count in every sum." />
		</NamePanel>
	)
}
