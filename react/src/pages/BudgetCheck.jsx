import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { Combobox, ComboboxEmpty, ComboboxGroup, ComboboxOption, ComboboxSeparator } from '../components/Combobox.jsx'
import { BulkBar } from '../components/List.jsx'
import { Gauge, Stat } from '../components/Data.jsx'
import { Field } from '../components/Field.jsx'
import { Check, Choice } from '../components/Choice.jsx'
import { ListItem, ListItemHead } from '../components/ListItem.jsx'
import { Empty, EmptyTitle, Skeleton } from '../components/Utilities.jsx'
import { useToast } from '../components/Overlays.jsx'
import { useShellShape } from '../app/useMedia.js'
import { Failed } from '../components/Failed.jsx'
import { cachedFetch, useApi } from '../api/useApi.js'
import { amount, capitalised, currency, dayShortMonth, dot, fullStop, longDate, monthNames, plural } from '../api/format.js'
import { failureMessage, forgetBankLink, getBankLinks, getBudgetYear, getBudgetYears, saveBankLink, updateBudgetLine } from '../api/client.js'
import { checkPayments, kindOf, onceKey, realAmounts } from '../api/bankStatement.js'
import { BankControls, BankFileColumns, BankPickFile, columnsShown, useBankFile } from './BankCheck.jsx'
import { phrase, usePhrase } from '../language/phrases.js'

/* A bank's export checked against the budget (21g, 21h). The file is read here and never
   sent; only the choices made about its payments are saved. */

const SIDES = [{ kind: 'expense', title: 'budget.group.costs' }, { kind: 'income', title: 'budget.group.income' }]
const TO_PLACE = ['missing', 'near', 'year']
const LEFT_OUT = ['skip', 'once']
const VIEWS = [
	{ value: 'place', label: 'bank.view.place', shows: TO_PLACE },
	{ value: 'amount', label: 'bank.view.amount', shows: ['amount'] },
	{ value: 'left', label: 'bank.view.left', shows: LEFT_OUT },
	{ value: 'all', label: 'bank.view.all', shows: null }
]
// a failure the shell already tells of (the session ended) has no sentence, and takes no toast
const toastFailure = (toast, error, fallback) => {
	const message = failureMessage(error, fallback)
	if (message) toast({ message, color: 'danger' })
}
const cents = n => Math.round(n * 100) / 100
const money = n => currency(cents(n))
const when = g => (g.payments.length === 1 ? dayShortMonth(g.first)
	: g.first === g.last ? phrase('bank.when.day', { payments: plural(g.payments.length, 'payment'), date: dayShortMonth(g.first) })
		: phrase('bank.when.span', { payments: plural(g.payments.length, 'payment'), from: dayShortMonth(g.first), to: dayShortMonth(g.last) }))

/* Payments no row accounts for, one group per text: placing the text once places them all. */
function groupPayments(list) {
	const groups = new Map()
	for (const p of list) {
		const id = `${kindOf(p)}:${p.key}`
		const g = groups.get(id) ?? { id, key: p.key, kind: kindOf(p), text: p.text, payments: [] }
		g.payments.push(p)
		groups.set(id, g)
	}
	return [...groups.values()].map(g => {
		const hints = g.payments.filter(p => p.status === 'near').map(p => p.lineId)
		const best = hints.sort((a, b) => hints.filter(h => h === b).length - hints.filter(h => h === a).length)[0]
		const suggestion = best ? { id: best, name: g.payments.find(p => p.lineId === best).line } : null
		const dates = g.payments.map(p => p.date).sort()
		return {
			...g, suggestion, total: g.payments.reduce((n, p) => n + p.amount, 0), first: dates[0], last: dates[dates.length - 1],
			noSheet: g.payments.every(p => p.status === 'year')
		}
	}).sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
}

export default function BudgetCheck() {
	const phrase = usePhrase()
	// four segments do not fit beside a phone's buttons, so there they take the full row
	const touch = useShellShape() === 'touch'
	const [sheets, setSheets] = useState(null)
	const [view, setView] = useState('place')
	const bank = useBankFile({ onRead: () => setView('place') })
	const { file, rows, payments, unread } = bank
	const saved = useApi(getBankLinks)
	const [links, setLinks] = useState(null)
	useEffect(() => { if (saved.data) setLinks(saved.data) }, [saved.data])

	const years = useMemo(() => [...new Set(payments.map(p => Number(p.date.slice(0, 4))))].sort(), [payments])

	const [sheetsFailed, setSheetsFailed] = useState(null)
	const [attempt, setAttempt] = useState(0)
	useEffect(() => {
		let live = true
		setSheets(null)
		setSheetsFailed(null)
		// only the years the budget holds are asked for, so a year without one is not an error
		cachedFetch(getBudgetYears).then(held => Promise.all(years.map(y => (held.years.includes(y) ? cachedFetch(getBudgetYear, [y]) : null))))
			.then(found => {
			if (live) setSheets(new Map(years.map((y, i) => [y, found[i]]).filter(([, s]) => s)))
		}).catch(error => {
			if (live) setSheetsFailed(error || {})
		})
		return () => { live = false }
	}, [years, attempt])
	const failed = sheetsFailed ?? (links ? null : saved.error)
	const retry = () => {
		if (!links) saved.refresh()
		if (sheetsFailed) setAttempt(n => n + 1)
	}

	const checked = useMemo(() => (sheets && links ? checkPayments(payments, sheets, links) : null), [payments, sheets, links])

	if (!rows) return <BankPickFile onFile={bank.read} body={phrase('bank.dropBody')} />

	return (
		<>
			<BankControls bank={bank}
				show={<Segmented name="bank-show" aria-label={phrase('bookmarks.show')} variant={touch ? 'facet' : 'default'} options={VIEWS.map(v => ({ ...v, label: phrase(v.label) }))} value={view} onChange={setView} />} />
			{columnsShown(bank)
				? <BankFileColumns bank={bank} />
				: !checked
					? failed ? <Failed what={phrase('bank.yourBudget')} error={failed} onRetry={retry} /> : <Card aria-busy="true"><Skeleton shape="title" /><Skeleton shape="line" /><Skeleton shape="short" /></Card>
					: <Results key={file} file={file} payments={payments} unread={unread.length} checked={checked} sheets={sheets} setSheets={setSheets}
						setLinks={setLinks} view={view} onFailed={saved.refresh} />}
		</>
	)
}

/** A budget row picked by typing or from the list of one side of the payment's year, with what each
    holds that month. It takes focus as it opens; Escape on its closed list puts it away. */
function RowPicker({ id, label, kind, sheet, month, onPick, onClose, disabled }) {
	// opened after the field takes focus, so the open list moves focus last
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	useEffect(() => {
		document.getElementById(id)?.focus()
		setOpen(true)
	}, [id])
	const short = monthNames('short')[month]
	const groups = (sheet?.groups ?? []).filter(g => g.kind === kind)
		.map(g => ({ ...g, lines: g.lines.filter(l => l.name.toLocaleLowerCase('da').includes(query.trim().toLocaleLowerCase('da'))) }))
		.filter(g => g.lines.length)
	return (
		<Field label={label} id={id}>
			<Combobox searchable search={query} onSearch={setQuery} noun="rows" open={open} onOpenChange={setOpen}
				placeholder={phrase(kind === 'income' ? 'bank.pickIncome' : 'bank.pickCosts')}
				onKeyDown={ev => { if (ev.key === 'Escape' && !open && onClose) { ev.preventDefault(); onClose() } }}>
				{/* one flat list, so the arrow keys reach every option */}
				{groups.length ? groups.flatMap((g, gi) => [
					gi ? <ComboboxSeparator key={`rule-${g.id}`} /> : null,
					<ComboboxGroup key={g.id}>{g.name}</ComboboxGroup>,
					...g.lines.map(l => {
						const m = l.months[month]
						const value = m.real ?? m.expected
						return (
							<ComboboxOption key={l.id} disabled={disabled}
								meta={value != null ? phrase('bank.inMonth', { amount: money(value), month: short }) : phrase('bank.noAmountIn', { month: short })}
								onSelect={() => onPick(l)}>{l.name}</ComboboxOption>
						)
					})
				]) : <ComboboxEmpty>{phrase('bank.noRow')}</ComboboxEmpty>}
			</Combobox>
		</Field>
	)
}

function Results({ file, payments, unread, checked, sheets, setSheets, setLinks, view, onFailed }) {
	const toast = useToast()
	const touch = useShellShape() === 'touch'
	const long = monthNames('long')
	const [picked, setPicked] = useState(() => new Set())
	const [busy, setBusy] = useState(false)
	const [open, setOpen] = useState(null)
	const [bulkOpen, setBulkOpen] = useState(false)
	// texts placed since the file was read stay listed, marked saved, until the next file
	const [recent, setRecent] = useState([])
	const [leaveAlone, setLeaveAlone] = useState(() => new Set())
	const [writing, setWriting] = useState(false)
	useEffect(() => { setPicked(new Set()); setOpen(null); setBulkOpen(false) }, [view])
	// a picker that closes with focus inside it gives focus back to the button that opened it, or to Undo once its text is placed
	const opened = useRef(null)
	useLayoutEffect(() => {
		if (open != null) { opened.current = open; return }
		const was = opened.current
		opened.current = null
		if (was == null || (document.activeElement && document.activeElement !== document.body)) return
		const back = document.querySelector(`[data-opener="pick:${was}"]`) ?? document.querySelector(`[data-opener="undo:${was}"]`)
		back?.focus()
	}, [open])
	// an action that takes away the control it started from leaves focus on the first of goOn() still there once it is done
	const settle = useRef(null)
	const keepFocus = goOn => {
		const from = document.activeElement
		settle.current = () => [from, ...goOn()].find(el => el?.isConnected && !el.disabled && el !== document.body)
	}
	useLayoutEffect(() => {
		if (busy || writing || !settle.current) return
		const find = settle.current
		settle.current = null
		if (!document.activeElement || document.activeElement === document.body) find()?.focus()
	}, [busy, writing])
	const showing = () => document.querySelector('input[name="bank-show"]:checked')
	// for a row: its Undo once placed, else its first button, else the next row's, the one before's, else Show
	const keepFocusOn = ids => {
		const rows = () => [...document.querySelectorAll('[data-group]')]
		const order = rows().map(r => r.dataset.group)
		const mine = order.filter(id => ids.includes(id))
		const at = order.indexOf(mine[0])
		const later = at < 0 ? [] : order.slice(at + 1).filter(id => !ids.includes(id))
		const earlier = at < 0 ? [] : order.slice(0, at).reverse()
		const row = id => rows().find(r => r.dataset.group === id)
		const button = id => [...(row(id)?.querySelectorAll('button') ?? [])].find(b => !b.disabled)
		keepFocus(() => [...mine.map(id => row(id)?.querySelector('[data-opener^="undo:"]')),
			...[...mine, ...later, ...earlier].map(button), showing()])
	}

	const count = status => checked.filter(p => status.includes(p.status)).length
	const missing = count(TO_PLACE)
	const accounted = checked.length - missing
	const dates = payments.map(p => p.date).sort()
	const groups = useMemo(() => groupPayments(checked.filter(p => TO_PLACE.includes(p.status))), [checked])
	const leftOut = useMemo(() => groupPayments(checked.filter(p => LEFT_OUT.includes(p.status))), [checked])
	const listed = [...groups, ...recent.filter(r => !groups.some(g => g.id === r.id))]
		.sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
	const chosen = groups.filter(g => picked.has(g.id))
	const oneKind = new Set(chosen.map(g => g.kind)).size === 1 && !chosen.some(g => g.noSheet)
	const writes = useMemo(() => realAmounts(checked, sheets), [checked, sheets])
	const toWrite = writes.filter(w => !leaveAlone.has(w.id))
	const skipped = writes.length - toWrite.length
	const sheetOf = p => sheets.get(Number(p.date.slice(0, 4)))
	const monthOf = p => Number(p.date.slice(5, 7)) - 1
	const toggle = (set, id) => set(s => {
		const next = new Set(s)
		if (next.has(id)) next.delete(id); else next.add(id)
		return next
	})

	/* A text placed on a row, or always left out, is one saved choice for every payment with
	   that text; left out once is a choice per payment, so the text teaches nothing for later. */
	const saveGroups = async (list, line, once) => {
		keepFocusOn(list.map(g => g.id))
		setBusy(true)
		try {
			let latest = null
			for (const g of list) {
				if (once) for (const p of g.payments) latest = await saveBankLink({ pattern: onceKey(p), kind: g.kind, lineId: null })
				else latest = await saveBankLink({ pattern: g.key, kind: g.kind, lineId: line?.id ?? null })
			}
			if (latest) setLinks(latest)
			const what = once ? phrase('bank.leftOutOnce') : line ? phrase('bank.on', { name: line.name }) : phrase('bank.alwaysLeftOut')
			setRecent(r => [...r.filter(x => !list.some(g => g.id === x.id)), ...list.map(g => ({ ...g, saved: what, once }))])
			setPicked(new Set())
			setOpen(null)
			setBulkOpen(false)
		} catch (e) {
			toastFailure(toast, e, phrase('bank.notEveryChoice'))
			onFailed()
		} finally {
			setBusy(false)
		}
	}
	const undo = async g => {
		keepFocusOn([g.id])
		setBusy(true)
		try {
			let latest = null
			if (g.once) for (const p of g.payments) latest = await forgetBankLink({ pattern: onceKey(p), kind: g.kind })
			else latest = await forgetBankLink({ pattern: g.key, kind: g.kind })
			if (latest) setLinks(latest)
			setRecent(r => r.filter(x => x.id !== g.id))
		} catch (e) {
			toastFailure(toast, e, phrase('bank.notTakenBack'))
			onFailed()
		} finally {
			setBusy(false)
		}
	}
	const bringBack = async g => {
		keepFocusOn([g.id])
		setBusy(true)
		try {
			let latest = null
			for (const p of g.payments) latest = await forgetBankLink({ pattern: p.placed === 'once' ? onceKey(p) : p.key, kind: g.kind })
			if (latest) setLinks(latest)
			toast({ message: phrase('bank.broughtBack', { payments: plural(g.payments.length, 'payment') }) })
		} catch (e) {
			toastFailure(toast, e, phrase('bank.notEveryBack'))
			onFailed()
		} finally {
			setBusy(false)
		}
	}
	const saveReal = async () => {
		keepFocus(() => [document.getElementById('bank-every-amount'), showing()])
		setWriting(true)
		const next = new Map(sheets)
		let done = 0
		try {
			for (const w of toWrite) {
				next.set(w.year, await updateBudgetLine(w.lineId, { month: w.month, real: w.amount }))
				done++
			}
			toast({ message: phrase('bank.amountsSaved', { amounts: plural(done, 'amount') }) })
		} catch (e) {
			toastFailure(toast, e, phrase('bank.notEveryAmount'))
		} finally {
			setSheets(next)
			setWriting(false)
		}
	}

	const actions = buttons => <span className="sp-row-flex sp-wrap sp-gap-8">{buttons}</span>
	const small = (label, onClick, extra = {}) => <Button key={label} variant="outline" size="small" disabled={busy} onClick={onClick} {...extra}>{label}</Button>
	const line = ({ key, group, check, title, subtitle, note, ink, buttons, children, total }) => (
		<ListItem key={key} variant="top" data-group={group}>
			{check}
			<span className="sp-stack sp-gap-8 sp-grow">
				<span className="sp-stacked">
					<span className="sp-title sp-truncate">{title || phrase('bank.noText')}</span>
					<span className="sp-subtitle">{subtitle}</span>
				</span>
				{note ? <span className={`sp-note ${ink}`}>{note}</span> : null}
				{buttons ? actions(buttons) : null}
				{children}
			</span>
			<span className="sp-amount">{money(Math.abs(total))}</span>
		</ListItem>
	)
	// money out and money in apart, each under its own total, as a month of the budget shows them
	const sides = (items, render) => SIDES.map(({ kind, title }) => {
		const mine = items.filter(i => i.kind === kind)
		return mine.length ? (
			<div className="sp-stack sp-gap-8" key={kind}>
				<ListItemHead label={phrase(title)} amount={money(Math.abs(mine.reduce((n, i) => n + i.total, 0)))} />
				<div className="sp-stack sp-gap-8">{mine.map(render)}</div>
			</div>
		) : null
	})
	const head = title => <CardHeader name={title} />
	const nothing = text => <Empty><EmptyTitle>{text}</EmptyTitle></Empty>

	const placeRow = g => {
		if (g.saved) return line({
			key: g.id, group: g.id, title: g.text, subtitle: when(g), total: g.total,
			check: <Check checked disabled aria-label={phrase('bank.savedLabel', { text: g.text || phrase('bank.thisText') })} />,
			note: phrase('bank.savedNote', { what: g.saved }), ink: 'sp-ink-success', buttons: [small(phrase('action.undo'), () => undo(g), { 'data-opener': `undo:${g.id}` })]
		})
		const last = g.payments[g.payments.length - 1]
		return line({
			key: g.id, group: g.id, title: g.text, subtitle: when(g), total: g.total,
			check: <Check checked={picked.has(g.id)} aria-label={phrase('bank.select', { name: g.text || phrase('bank.thisTextLower') })} onChange={() => toggle(setPicked, g.id)} />,
			note: g.noSheet ? phrase('bank.noBudgetFor', { year: g.payments[0].date.slice(0, 4) }) : g.suggestion ? phrase('bank.closeTo', { name: g.suggestion.name }) : null,
			ink: g.noSheet ? 'sp-ink-danger' : 'sp-ink-warning',
			buttons: [
				g.suggestion ? small(phrase('category.use', { name: g.suggestion.name }), () => saveGroups([g], g.suggestion)) : null,
				g.noSheet ? null : small(phrase('bank.pickFromBudget'), () => setOpen(open === g.id ? null : g.id), { 'aria-expanded': open === g.id ? 'true' : 'false', 'data-opener': `pick:${g.id}` }),
				small(phrase('bank.alwaysLeaveOut'), () => saveGroups([g], null)),
				small(phrase('bank.leaveOutOnce'), () => saveGroups([g], null, true))
			],
			children: open === g.id
				? <RowPicker id={`bank-place-${g.id}`} label={phrase('bank.allGoTo')} kind={g.kind} sheet={sheetOf(last)}
					month={monthOf(last)} disabled={busy} onPick={row => saveGroups([g], row)} onClose={() => setOpen(null)} />
				: null
		})
	}

	const statusText = p => {
		const month = long[monthOf(p)]
		switch (p.status) {
			case 'match': return phrase('bank.status.match', { name: p.line })
			case 'amount': return p.budget == null ? phrase('bank.status.noAmount', { name: p.line, month }) : phrase('bank.status.amount', { name: p.line, amount: money(p.budget), month })
			case 'near': return phrase('bank.status.near', { name: p.line })
			case 'skip': return phrase('bank.alwaysLeftOut')
			case 'once': return phrase('bank.leftOutOnce')
			case 'year': return phrase('bank.status.year', { year: p.date.slice(0, 4) })
			default: return phrase('bank.notInBudget')
		}
	}
	const paymentRow = p => line({
		key: p.row, group: String(p.row), title: p.text, subtitle: `${dayShortMonth(p.date)}${dot}${statusText(p)}`, total: p.amount,
		buttons: p.status === 'year' ? null : [small(open === p.row ? phrase('action.close') : phrase('bank.pickFromBudget'), () => setOpen(open === p.row ? null : p.row), { 'aria-expanded': open === p.row ? 'true' : 'false', 'data-opener': `pick:${p.row}` })],
		children: open === p.row
			? <RowPicker id={`bank-payment-${p.row}`} label={phrase('bank.allGoTo')} kind={kindOf(p)} sheet={sheetOf(p)}
				month={monthOf(p)} disabled={busy} onPick={row => saveGroups(groupPayments([p]), row)} onClose={() => setOpen(null)} />
			: null
	})

	const bulk = [
		oneKind ? small(phrase('bank.putAllOn'), () => setBulkOpen(!bulkOpen), { 'aria-expanded': bulkOpen ? 'true' : 'false', 'data-opener': 'bulk' }) : null,
		small(phrase('bank.alwaysLeaveOut'), () => saveGroups(chosen, null)),
		small(phrase('bank.leaveOutOnce'), () => saveGroups(chosen, null, true))
	]
	const current = VIEWS.find(v => v.value === view)
	const list = view === 'place'
		? (listed.length ? (
			<>
				{chosen.length ? null : <span className="sp-subtitle">{phrase('bank.placeHelp')}</span>}
				{chosen.length ? (
					// a phone has no room for the three in the bar's one line, so they wrap under it
					<>
						<BulkBar loose count={phrase('bank.selected', { texts: plural(chosen.length, 'text') })} onClear={() => setPicked(new Set())}>
							{touch ? null : bulk}
						</BulkBar>
						{touch ? actions(bulk) : null}
					</>
				) : null}
				{chosen.length && bulkOpen && oneKind ? (
					<RowPicker id="bank-bulk" label={phrase('bank.putAllOn')} kind={chosen[0].kind} sheet={sheetOf(chosen[0].payments.at(-1))}
						month={monthOf(chosen[0].payments.at(-1))} disabled={busy} onPick={row => saveGroups(chosen, row)}
						onClose={() => { setBulkOpen(false); document.querySelector('[data-opener="bulk"]')?.focus() }} />
				) : null}
				{groups.length ? (
					<Choice control={<Check checked={chosen.length === groups.length} indeterminate={chosen.length > 0 && chosen.length < groups.length}
						onChange={ev => setPicked(new Set(ev.target.checked ? groups.map(g => g.id) : []))} />}>{phrase('bank.selectEveryText')}</Choice>
				) : null}
				{sides(listed, placeRow)}
			</>
		) : nothing(phrase('bank.allAccounted')))
		: view === 'left'
			? (leftOut.length
				? sides(leftOut, g => line({
					key: g.id, group: g.id, title: g.text, total: g.total,
					subtitle: `${when(g)}${dot}${phrase(g.payments[0].status === 'once' ? 'bank.leftOutOnce' : 'bank.alwaysLeftOut')}`,
					buttons: [small(phrase('bank.bringBack'), () => bringBack(g))]
				}))
				: nothing(phrase('bank.noneLeftOut')))
			: (() => {
				const shown = checked.filter(p => !current.shows || current.shows.includes(p.status)).map(p => ({ ...p, kind: kindOf(p), total: p.amount }))
				return shown.length ? sides(shown, paymentRow)
					: nothing(phrase(view === 'amount' ? 'bank.noOtherAmount' : 'bank.noPaymentsAtAll'))
			})()

	const writeNote = w => {
		const line = sheets.get(w.year)?.groups.flatMap(g => g.lines).find(l => l.id === w.lineId)
		const expected = line?.months[w.month - 1].expected
		if (w.now != null) return phrase('bank.write.holds', { now: money(w.now), stop: fullStop(), amount: money(w.amount) })
		if (expected != null && cents(expected) !== cents(w.amount)) return phrase('bank.write.expects', { expected: money(expected), stop: fullStop(), amount: money(w.amount) })
		return null
	}

	return (
		<>
			<Card variant="shell">
				<CardHeader name={file}
					aside={[phrase('bank.read', { payments: plural(payments.length, 'payment') }), unread ? phrase('bank.unread', { lines: plural(unread, 'line') }) : null,
						phrase('bank.span', { from: longDate(dates[0]), to: longDate(dates[dates.length - 1]) })].filter(Boolean).join(dot)} />
				<div className="sp-row-flex sp-gap-16 sp-wrap sp-top">
					<Stat label={phrase('bank.notInBudget')} figure={plural(missing, 'payment')} />
					<Stat label={phrase('bank.stat.same')} figure={String(count(['match']))} meta={phrase('bank.stat.sameMeta')} />
					<Stat label={phrase('bank.view.amount')} figure={String(count(['amount']))} meta={phrase('bank.stat.otherMeta')} />
					<Stat label={phrase('bank.view.left')} figure={String(count(LEFT_OUT))} meta={phrase('bank.stat.leftMeta')} />
				</div>
				<div className="sp-stack sp-gap-8">
					<Gauge value={Math.round(accounted / payments.length * 100)} aria-label={phrase('bank.shareAccounted')} />
					<div className="sp-row-flex sp-gap-12">
						<span className="sp-meta">{phrase('bank.accounted', { accounted, payments: plural(payments.length, 'payment') })}</span>
						<span className="sp-grow" />
						{groups.length ? <span className="sp-meta">{phrase('bank.toPlace', { texts: plural(groups.length, 'text') })}</span> : null}
					</div>
				</div>
			</Card>
			<Card>
				{head(phrase(current.label))}
				{list}
			</Card>
			{writes.length ? (
				<Card footer={<Button key="save" disabled={writing || !toWrite.length} onClick={saveReal}>
					{writing ? phrase('action.saving') : phrase('bank.saveAmounts', { amounts: plural(toWrite.length, 'amount') })}</Button>}>
					{head(phrase('bank.saveToBudget'))}
					<span className="sp-subtitle">{phrase('bank.saveHelp')}</span>
					<Choice control={<Check id="bank-every-amount" checked={!skipped} indeterminate={skipped > 0 && skipped < writes.length}
						onChange={ev => setLeaveAlone(new Set(ev.target.checked ? [] : writes.map(w => w.id)))} />}>{phrase('bank.selectEveryAmount')}</Choice>
					{sides(writes.map(w => ({ ...w, total: w.amount })), w => line({
						key: w.id, title: w.name, total: w.amount,
						subtitle: `${capitalised(long[w.month - 1])} ${w.year}${dot}${w.group}${w.count > 1 ? `${dot}${plural(w.count, 'payment')}` : ''}`,
						check: <Check checked={!leaveAlone.has(w.id)} aria-label={phrase('bank.select', { name: w.name })} onChange={() => toggle(setLeaveAlone, w.id)} />,
						note: writeNote(w), ink: 'sp-ink-warning'
					}))}
				</Card>
			) : null}
		</>
	)
}
