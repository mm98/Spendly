import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { BulkBar, ListMore, ListToolbar } from '../components/List.jsx'
import { Gauge, Stat } from '../components/Data.jsx'
import { Check } from '../components/Choice.jsx'
import { Anchor, Dialog, DialogActions, DialogBody, DialogTitle, Leaving, Menu, MenuItem, Popover, useToast } from '../components/Overlays.jsx'
import { Empty, EmptyTitle, Skeleton, useDismiss } from '../components/Utilities.jsx'
import { RangeSlider } from '../components/Inputs.jsx'
import { Failed } from '../components/Failed.jsx'
import { useShellShape } from '../app/useMedia.js'
import { VendorPicker } from '../app/vendorPicker.jsx'
import { useApi } from '../api/useApi.js'
import { currency, dayShortMonth, dot, longDate, plural } from '../api/format.js'
import {
	bringBackOrderBank, checkOrderBank, createOrderBank, failureMessage, getOrderBankLeftOut, leaveOutOrderBank, markOrdersReconciled, undoOrderBank
} from '../api/client.js'
import { ORDER_MATCH, checkOrderPayments, onceKey, paymentKey } from '../api/bankStatement.js'
import { orderLine } from '../app/orderRow.jsx'
import { BankControls, BankFileColumns, BankPickFile, columnsShown, useBankFile } from './BankCheck.jsx'
import { usePhrase } from '../language/phrases.js'

/* A bank's export checked against the orders (Order list 2j). The file is read here; its days, totals
   and texts are sent to find the orders and vendors, and only the choices made are saved. */

const VIEWS = [
	{ value: 'missing', label: 'bank.view.notRegistered' },
	{ value: 'registered', label: 'bank.view.registered' },
	{ value: 'left', label: 'bank.view.left' },
	{ value: 'all', label: 'bank.view.all' }
]
const LEFT_OUT = ['skip', 'once']
// past this many lines a list ends in Load more (2j)
const PAGE = 50

const money = n => currency(Math.round(n * 100) / 100)

export default function OrdersCheck() {
	const phrase = usePhrase()
	// four segments do not fit beside a phone's buttons, so there they take the full row
	const touch = useShellShape() === 'touch'
	const [view, setView] = useState('missing')
	const bank = useBankFile({ onRead: () => setView('missing') })
	const out = useMemo(() => bank.payments.filter(p => p.amount < 0), [bank.payments])
	const saved = useApi(getOrderBankLeftOut)
	const [leftOut, setLeftOut] = useState(null)
	useEffect(() => { if (saved.data) setLeftOut(saved.data) }, [saved.data])

	const span = useMemo(() => {
		const dates = out.map(p => p.date).sort()
		return dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null
	}, [out])
	const texts = useMemo(() => [...new Set(out.map(p => p.text.trim()).filter(Boolean))], [out])
	const [found, setFound] = useState(null)
	const [foundFailed, setFoundFailed] = useState(null)
	const [attempt, setAttempt] = useState(0)
	useEffect(() => {
		if (!span) return undefined
		let live = true
		setFoundFailed(null)
		checkOrderBank({ ...span, texts }).then(answer => { if (live) setFound(answer) }, error => { if (live) setFoundFailed(error || {}) })
		return () => { live = false }
	}, [span, texts, attempt])
	const refresh = () => setAttempt(n => n + 1)
	const failed = foundFailed ?? (leftOut ? null : saved.error)
	const retry = () => {
		if (!leftOut) saved.refresh()
		if (foundFailed) refresh()
	}

	// how far apart a payment and its order may be; both start again each time the page opens (2j)
	const [match, setMatch] = useState({ days: ORDER_MATCH.days, percent: ORDER_MATCH.percent })
	const checked = useMemo(() => (found && leftOut ? checkOrderPayments(out, found.orders, leftOut, match) : null), [out, found, leftOut, match])
	// an order a payment matches is noted as reconciled; nothing on the page shows it yet
	useEffect(() => {
		const ids = (checked?.payments ?? []).filter(p => p.order && !p.order.reconciled).map(p => p.order.id)
		if (ids.length) markOrdersReconciled(ids).catch(() => { /* noted again at the next check */ })
	}, [checked])

	if (!bank.rows) return <BankPickFile onFile={bank.read} body={phrase('bank.dropBodyOrders')} />

	return (
		<>
			<BankControls bank={bank}
				show={<Segmented name="bank-show" aria-label={phrase('bookmarks.show')} variant={touch ? 'facet' : 'default'} options={VIEWS.map(v => ({ ...v, label: phrase(v.label) }))} value={view} onChange={setView} />} />
			{columnsShown(bank) || !out.length
				? <BankFileColumns bank={bank} payments={out} />
				: !checked
					? failed ? <Failed what={phrase('page.orders')} error={failed} onRetry={retry} /> : <Card aria-busy="true"><Skeleton shape="title" /><Skeleton shape="line" /><Skeleton shape="short" /></Card>
					: <Results key={bank.file} file={bank.file} unread={bank.unread.length} span={span} checked={checked} found={found} setLeftOut={setLeftOut}
						view={view} onChanged={refresh} match={match} onMatch={setMatch} />}
		</>
	)
}

function Results({ file, unread, span, checked, found, setLeftOut, view, onChanged, match, onMatch }) {
	const phrase = usePhrase()
	const toast = useToast()
	const navigate = useNavigate()
	const [picked, setPicked] = useState(() => new Set())
	const [busy, setBusy] = useState(false)
	// the vendor picked for a payment, by its row; a payment not here holds its suggestion
	const [chosen, setChosen] = useState(() => new Map())
	const [keep, setKeep] = useState(() => new Set())
	// payments left out since the file was read stay on their line, marked saved, until the next file
	const [recent, setRecent] = useState(() => new Map())
	const [asking, setAsking] = useState(null)
	const [shown, setShown] = useState(PAGE)
	useEffect(() => { setPicked(new Set()); setShown(PAGE) }, [view])

	const suggestions = useMemo(() => new Map(found.vendors.map(v => [v.text, v])), [found])
	const suggestionOf = p => suggestions.get(p.text.trim()) ?? null
	const vendorOf = p => (chosen.has(p.row) ? chosen.get(p.row) : suggestionOf(p)?.vendor ?? '')
	const matchedFromText = p => !chosen.has(p.row) && Boolean(suggestionOf(p)?.vendor)
	// the text already files under the picked vendor, so there is nothing to keep
	const keepable = p => Boolean(vendorOf(p)) && suggestionOf(p)?.owner?.toLocaleLowerCase('da') !== vendorOf(p).toLocaleLowerCase('da')
	const keeping = p => keep.has(p.row) && keepable(p)

	const all = checked.payments
	const missing = all.filter(p => p.status === 'missing')
	const registered = all.filter(p => p.status === 'registered')
	const closeMatches = registered.filter(p => p.order.difference).length
	const left = all.filter(p => LEFT_OUT.includes(p.status))
	const counted = all.length - left.length
	const noPayment = found.orders.filter(o => o.date >= span.from && o.date <= span.to && !checked.matchedOrders.has(o.id))
	const listed = [...missing, ...[...recent.values()].filter(r => !missing.some(p => p.row === r.row))]
		.sort((a, b) => b.date.localeCompare(a.date) || a.row - b.row)
	const ready = missing.filter(p => vendorOf(p))
	const selected = missing.filter(p => picked.has(p.row))

	const fail = (e, fallback) => {
		const message = failureMessage(e, fallback)
		if (message) toast({ message, color: 'danger' })
	}
	const toggle = (set, key) => set(s => {
		const next = new Set(s)
		if (next.has(key)) next.delete(key); else next.add(key)
		return next
	})

	/* Always left out is kept by the payment's text, so every payment with that text is left out;
	   once is kept by the one payment. */
	const leave = async (list, once) => {
		setBusy(true)
		try {
			setLeftOut(await leaveOutOrderBank([...new Set(list.map(p => (once ? onceKey(p) : paymentKey(p.text))))]))
			setRecent(r => new Map([...r, ...list.map(p => [p.row, { ...p, saved: phrase(once ? 'bank.leftOutOnce' : 'bank.alwaysLeftOut'), once }])]))
			setPicked(new Set())
		} catch (e) {
			fail(e, phrase('bank.notEveryChoice'))
		} finally {
			setBusy(false)
		}
	}
	const undoLeave = async p => {
		setBusy(true)
		try {
			setLeftOut(await bringBackOrderBank([p.once ? onceKey(p) : paymentKey(p.text)]))
			setRecent(r => { const next = new Map(r); next.delete(p.row); return next })
		} catch (e) {
			fail(e, phrase('bank.notTakenBack'))
		} finally {
			setBusy(false)
		}
	}
	const bringBack = async p => {
		setBusy(true)
		try {
			setLeftOut(await bringBackOrderBank([p.status === 'once' ? onceKey(p) : paymentKey(p.text)]))
			toast({ message: phrase('bank.broughtBack', { payments: plural(1, 'payment') }) })
		} catch (e) {
			fail(e, phrase('bank.notEveryBack'))
		} finally {
			setBusy(false)
		}
	}

	/* A kept text another vendor already has is asked about once, at Create, for every such text (2j). */
	const taken = () => {
		const texts = new Map()
		for (const p of ready) {
			const s = suggestionOf(p)
			if (keeping(p) && s?.owner && s.byAlias) texts.set(p.text.trim(), { text: p.text.trim(), owner: s.owner, vendor: vendorOf(p) })
		}
		return [...texts.values()]
	}
	const create = async (moves = new Map()) => {
		setBusy(true)
		try {
			const keptTexts = new Map(ready.filter(keeping).map(p => [p.text.trim(), { text: p.text.trim(), vendor: vendorOf(p), move: moves.get(p.text.trim()) === true }]))
			const made = await createOrderBank({
				orders: ready.map(p => ({ payment: String(p.row), date: p.date, total: p.total, vendor: vendorOf(p), text: p.text })),
				keep: [...keptTexts.values()]
			})
			const rows = new Set(ready.map(p => p.row))
			setChosen(c => new Map([...c].filter(([row]) => !rows.has(row))))
			setKeep(k => new Set([...k].filter(row => !rows.has(row))))
			setPicked(new Set())
			setAsking(null)
			onChanged()
			toast({
				message: phrase('bank.ordersCreated', { orders: plural(made.orders.length, 'order') }),
				undo: { label: phrase('action.undo'), onClick: () => undoOrderBank(made.undo).then(onChanged, e => fail(e, phrase('deleteOrder.notDeleted'))) }
			})
		} catch (e) {
			fail(e, phrase('order.notSaved'))
		} finally {
			setBusy(false)
		}
	}
	const startCreate = () => {
		const asked = taken()
		if (asked.length) setAsking(asked)
		else create()
	}

	const pickVendor = (rows, name) => setChosen(c => new Map([...c, ...rows.map(row => [row, name.trim()])]))

	const head = (title, aside, button) => (
		<ListToolbar>
			<strong className="sp-data">{title}</strong>
			{aside ? <span className="sp-subtitle">{aside}</span> : null}
			<span className="sp-grow" />
			{button}
		</ListToolbar>
	)
	const nothing = text => <Empty><EmptyTitle>{text}</EmptyTitle></Empty>
	const more = list => (list.length > PAGE ? <ListMore shown={Math.min(shown, list.length)} total={list.length} pageSize={PAGE} onMore={() => setShown(s => s + PAGE)} /> : null)
	const openOrder = id => (
		<span data-tip={phrase('bank.openOrder')}>
			<IconButton icon="chevron-right" aria-label={phrase('bank.openOrder')} onClick={() => navigate(`/orders/${id}`)} />
		</span>
	)
	const amountCell = total => <td><div className="sp-stacked sp-cell-amount"><span className="sp-amount">{money(total)}</span></div></td>
	const orderCell = (o, withDate) => (
		<span className="sp-stacked">
			<span className="sp-title sp-truncate">{o.vendor}</span>
			<span className="sp-subtitle sp-truncate">{[o.reference || orderLine(o), withDate ? dayShortMonth(o.date) : null].filter(Boolean).join(dot)}
				{o.difference ? <>{dot}<span className="sp-ink-warning">{phrase(o.difference > 0 ? 'bank.closeMore' : 'bank.closeLess', { amount: money(Math.abs(o.difference)) })}</span></> : null}</span>
		</span>
	)
	const text = p => p.text || phrase('bank.noText')

	const vendorCell = p => {
		const vendor = vendorOf(p)
		const on = keeping(p)
		const keepLabel = phrase('bank.keepOtherName', { text: p.text.trim(), vendor })
		return (
			<div className="sp-row-flex sp-gap-6">
				<span className="sp-grow" data-tip={matchedFromText(p) ? phrase('bank.vendorMatched') : undefined}>
					<VendorPicker recent={[]} value={vendor} onPick={name => pickVendor([p.row], name)}
						placeholder={phrase('bank.pickVendor')} aria-label={phrase('bank.vendorFor', { text: text(p) })} />
				</span>
				{keepable(p)
					? <span data-tip={keepLabel}><IconButton icon="tag" aria-pressed={on ? 'true' : 'false'} aria-label={keepLabel} onClick={() => toggle(setKeep, p.row)} /></span>
					: <IconButton icon="tag" disabled aria-label={phrase('bank.keepAsOtherName')} />}
			</div>
		)
	}

	const missingRow = p => (p.saved
		? (
			<tr key={p.row}>
				<td><Check checked disabled aria-label={phrase('bank.savedLabel', { text: p.text || phrase('bank.thisText') })} /></td>
				<td className="sp-data">{dayShortMonth(p.date)}</td>
				<td><span className="sp-title sp-truncate">{text(p)}</span></td>
				<td><div className="sp-row-flex sp-gap-8"><span className="sp-note sp-ink-success sp-grow">{phrase('bank.savedNote', { what: p.saved })}</span>
					<Button variant="outline" size="small" disabled={busy} onClick={() => undoLeave(p)}>{phrase('action.undo')}</Button></div></td>
				{amountCell(p.total)}
				<td className="sp-cell-menu-cell" />
			</tr>
		)
		: (
			<tr key={p.row} aria-selected={picked.has(p.row) ? 'true' : 'false'}>
				<td><Check checked={picked.has(p.row)} aria-label={phrase('bank.select', { name: text(p) })} onChange={() => toggle(setPicked, p.row)} /></td>
				<td className="sp-data">{dayShortMonth(p.date)}</td>
				<td><span className="sp-title sp-truncate">{text(p)}</span></td>
				<td>{vendorCell(p)}</td>
				{amountCell(p.total)}
				<td className="sp-cell-menu-cell"><div className="sp-cell-menu"><PaymentMenu label={phrase('bank.paymentMenu', { text: text(p) })} busy={busy} onLeave={once => leave([p], once)} /></div></td>
			</tr>
		))

	const missingList = () => {
		const total = missing.reduce((n, p) => n + p.total, 0)
		const every = selected.length === missing.length
		return (
			<div className="sp-list">
				{selected.length
					? <BulkBar count={phrase('bank.selected', { texts: String(selected.length) })} onClear={() => setPicked(new Set())}>
						<SetVendor count={selected.length} busy={busy} onApply={name => pickVendor(selected.map(p => p.row), name)} />
						<Button variant="outline" size="small" disabled={busy} onClick={() => leave(selected, false)}>{phrase('bank.alwaysLeaveOut')}</Button>
						<Button variant="outline" size="small" disabled={busy} onClick={() => leave(selected, true)}>{phrase('bank.leaveOutOnce')}</Button>
					</BulkBar>
					: head(phrase('bank.view.notRegistered'), `${dot.trimStart()}${phrase('bank.notRegisteredTotal', { payments: plural(missing.length, 'payment'), amount: money(total) })}`,
						<Button size="small" disabled={busy || !ready.length} onClick={startCreate}>{phrase('bank.createOrders', { orders: plural(ready.length, 'order') })}</Button>)}
				<table className="sp-table">
					<thead>
						<tr>
							<th className="sp-col-box"><Check checked={missing.length > 0 && every} indeterminate={selected.length > 0 && !every} aria-label={phrase('list.selectAll', { noun: 'other', count: missing.length, shown: String(missing.length) })}
								onChange={ev => setPicked(new Set(ev.target.checked ? missing.map(p => p.row) : []))} /></th>
							<th scope="col" className="sp-col-date">{phrase('field.date')}</th>
							<th scope="col" className="sp-col-title">{phrase('bank.th.bankText')}</th>
							<th scope="col" className="sp-col-picker">{phrase('field.vendor')}</th>
							<th scope="col" className="sp-col-amount">{phrase('field.amount')}</th>
							<th scope="col" className="sp-col-menu"><span className="sp-announce">{phrase('list.actions')}</span></th>
						</tr>
					</thead>
					<tbody>{listed.slice(0, shown).map(missingRow)}</tbody>
				</table>
				{more(listed)}
			</div>
		)
	}

	const statusOf = p => (p.status === 'registered' ? null : p.status === 'missing' ? phrase('bank.view.notRegistered')
		: phrase(p.status === 'once' ? 'bank.leftOutOnce' : 'bank.alwaysLeftOut'))
	const paymentList = (title, list, cell, button) => (
		<div className="sp-list">
			{head(title, `${dot.trimStart()}${plural(list.length, 'payment')}`)}
			<table className="sp-table">
				<thead>
					<tr>
						<th scope="col" className="sp-col-date">{phrase('field.date')}</th>
						<th scope="col" className="sp-col-title">{phrase('bank.th.bankText')}</th>
						<th scope="col" className="sp-col-picker">{phrase('bank.th.order')}</th>
						<th scope="col" className="sp-col-amount">{phrase('field.amount')}</th>
						<th scope="col" className="sp-col-menu"><span className="sp-announce">{phrase('list.actions')}</span></th>
					</tr>
				</thead>
				<tbody>
					{list.slice(0, shown).map(p => (
						<tr key={p.row}>
							<td className="sp-data">{dayShortMonth(p.date)}</td>
							<td><span className="sp-title sp-truncate">{text(p)}</span></td>
							<td>{cell(p)}</td>
							{amountCell(p.total)}
							<td className="sp-cell-menu-cell"><div className="sp-cell-menu">{button(p)}</div></td>
						</tr>
					))}
				</tbody>
			</table>
			{more(list)}
		</div>
	)

	const list = view === 'missing'
		? (listed.length ? missingList() : nothing(phrase('bank.allAccounted')))
		: view === 'registered'
			? (registered.length ? paymentList(phrase('bank.view.registered'), registered, p => orderCell(p.order, true), p => openOrder(p.order.id)) : nothing(phrase('bank.noPaymentsAtAll')))
			: view === 'left'
				? (left.length
					? paymentList(phrase('bank.view.left'), left, p => <span className="sp-subtitle sp-truncate">{statusOf(p)}</span>,
						p => <Button variant="outline" size="small" disabled={busy} onClick={() => bringBack(p)}>{phrase('bank.bringBack')}</Button>)
					: nothing(phrase('bank.noneLeftOut')))
				: paymentList(phrase('bank.view.all'), all, p => (p.order ? orderCell(p.order, true) : <span className="sp-subtitle sp-truncate">{statusOf(p)}</span>),
					p => (p.order ? openOrder(p.order.id) : null))

	return (
		<>
			<Card variant="shell">
				<CardHeader name={file}
					aside={[phrase('bank.outRead', { payments: plural(all.length, 'payment') }), unread ? phrase('bank.unread', { lines: plural(unread, 'line') }) : null,
						phrase('bank.span', { from: longDate(span.from), to: longDate(span.to) })].filter(Boolean).join(dot)} />
				{view === 'missing' ? (
					<div className="sp-halves">
						{[['days', 'bank.match.daysLabel', n => phrase('bank.match.days', { count: n })], ['percent', 'bank.match.percentLabel', n => phrase('bank.match.percent', { percent: n })]]
							.map(([key, label, said]) => (
								<div key={key} className="sp-field">
									<div className="sp-row-flex">
										<span className="sp-section-label sp-grow">{phrase(label)}</span>
										<span className="sp-meta">{said(match[key])}</span>
									</div>
									<RangeSlider value={match[key]} min={0} max={ORDER_MATCH.most} entry={false} label={phrase(label)} format={said}
										onChange={n => onMatch(m => ({ ...m, [key]: n }))} />
								</div>
							))}
					</div>
				) : null}
				<div className="sp-row-flex sp-gap-16 sp-wrap sp-top">
					<Stat label={phrase('bank.view.notRegistered')} figure={plural(missing.length, 'payment')} />
					<Stat label={phrase('bank.view.registered')} figure={String(registered.length)}
						meta={closeMatches ? phrase('bank.stat.registeredMetaClose', { close: closeMatches }) : phrase('bank.stat.registeredMeta')} />
					<Stat label={phrase('bank.view.left')} figure={String(left.length)} meta={phrase('bank.stat.leftMeta')} />
					{noPayment.length ? <Stat label={phrase('bank.stat.noPayment')} figure={String(noPayment.length)} meta={phrase('bank.stat.noPaymentMeta')} /> : null}
				</div>
				<div className="sp-stack sp-gap-8">
					<Gauge value={counted ? Math.round(registered.length / counted * 100) : 100} aria-label={phrase('bank.shareRegistered')} />
					<div className="sp-row-flex sp-gap-12">
						<span className="sp-meta">{phrase('bank.haveOrder', { matched: registered.length, payments: plural(counted, 'payment') })}</span>
						<span className="sp-grow" />
						{missing.length ? <span className="sp-meta">{phrase('bank.toRegister', { payments: plural(missing.length, 'payment') })}</span> : null}
					</div>
				</div>
			</Card>
			{list}
			{noPayment.length ? (
				<div className="sp-list">
					{head(phrase('bank.noPayment'), `${dot.trimStart()}${phrase('bank.notRegisteredTotal', { payments: plural(noPayment.length, 'order'), amount: money(noPayment.reduce((n, o) => n + o.total, 0)) })}`)}
					<table className="sp-table">
						<thead>
							<tr>
								<th scope="col" className="sp-col-date">{phrase('field.date')}</th>
								<th scope="col" className="sp-col-title">{phrase('bank.th.order')}</th>
								<th scope="col" className="sp-col-amount">{phrase('field.amount')}</th>
								<th scope="col" className="sp-col-menu"><span className="sp-announce">{phrase('list.actions')}</span></th>
							</tr>
						</thead>
						<tbody>
							{noPayment.map(o => (
								<tr key={o.id}>
									<td className="sp-data">{dayShortMonth(o.date)}</td>
									<td>{orderCell(o, false)}</td>
									{amountCell(o.total)}
									<td className="sp-cell-menu-cell"><div className="sp-cell-menu">{openOrder(o.id)}</div></td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}
			<Leaving>{asking
				? <TextsTaken texts={asking} busy={busy} onCancel={() => setAsking(null)} count={ready.length}
					onCreate={moves => create(moves)} />
				: null}</Leaving>
		</>
	)
}

/** Set vendor in the bulk bar (2j): a popover with the vendor picker, as Set status in 2a. Nothing is saved before Create. */
/** A payment line's menu (2j), the order list's row menu with the two ways to leave the line out. */
function PaymentMenu({ label, busy, onLeave }) {
	const phrase = usePhrase()
	const [open, setOpen] = useState(false)
	const anchor = useRef(null)
	const close = () => setOpen(false)
	useDismiss(anchor, open, close)
	const pick = once => () => { close(); onLeave(once) }
	return (
		<Anchor ref={anchor} open={open}>
			<IconButton icon="dots-vertical" aria-label={label} aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'}
				disabled={busy} onClick={() => setOpen(!open)} />
			{open ? (
				<Menu position="floating" aria-label={label}>
					<MenuItem icon="refresh" onClick={pick(false)}>{phrase('bank.alwaysLeaveOut')}</MenuItem>
					<MenuItem icon="x" onClick={pick(true)}>{phrase('bank.leaveOutOnce')}</MenuItem>
				</Menu>
			) : null}
		</Anchor>
	)
}

function SetVendor({ count, busy, onApply }) {
	const phrase = usePhrase()
	const [open, setOpen] = useState(false)
	const [vendor, setVendor] = useState('')
	const anchor = useRef(null)
	useDismiss(anchor, open, () => setOpen(false))
	return (
		<Anchor ref={anchor} open={open}>
			<Button variant="outline" size="small" aria-expanded={open ? 'true' : 'false'} disabled={busy} onClick={() => setOpen(!open)}>{phrase('bank.setVendor')}</Button>
			<Leaving>{open ? (
				<Popover position="start" role="dialog" aria-label={phrase('bank.setVendor')}
					onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); setOpen(false) } }}
					head={<><span className="sp-title">{phrase('bank.setVendor')}</span><span className="sp-subtitle">{phrase('bank.setVendorHelp', { payments: plural(count, 'payment') })}</span></>}
					search={<VendorPicker recent={[]} value={vendor} onPick={setVendor} placeholder={phrase('bank.pickVendor')} aria-label={phrase('field.vendor')} />}
					actions={<>
						<Button variant="outline" fullWidth onClick={() => setOpen(false)}>{phrase('action.cancel')}</Button>
						<Button fullWidth disabled={!vendor} onClick={() => { onApply(vendor); setOpen(false); setVendor('') }}>{phrase('action.apply')}</Button>
					</>} />
			) : null}</Leaving>
		</Anchor>
	)
}

/** The texts kept as another name that another vendor already has, asked once at Create (2j). */
function TextsTaken({ texts, count, busy, onCancel, onCreate }) {
	const phrase = usePhrase()
	const [moves, setMoves] = useState(() => new Map())
	return (
		<Dialog onCancel={onCancel}>
			<div className="sp-stack sp-gap-6">
				<DialogTitle>{phrase('bank.textTaken.title', { texts: texts.length })}</DialogTitle>
				<DialogBody>{phrase('bank.textTaken.body')}</DialogBody>
			</div>
			{texts.map((t, i) => (
				<div className="sp-list-item sp-list-item--setting" key={t.text}>
					<span className="sp-stacked sp-grow">
						<span className="sp-title sp-truncate" id={`bank-taken-${i}`}>{t.text}</span>
						<span className="sp-subtitle">{phrase('bank.textTaken.line', { owner: t.owner, vendor: t.vendor })}</span>
					</span>
					<Segmented name={`bank-taken-${i}`} size="small" aria-labelledby={`bank-taken-${i}`} value={moves.get(t.text) ? 'move' : 'keep'}
						options={[{ value: 'move', label: phrase('bank.moveTo', { vendor: t.vendor }) }, { value: 'keep', label: phrase('bank.keepOn', { vendor: t.owner }) }]}
						onChange={v => setMoves(m => new Map([...m, [t.text, v === 'move']]))} />
				</div>
			))}
			<DialogActions>
				<Button variant="outline" onClick={onCancel}>{phrase('action.cancel')}</Button>
				<Button disabled={busy} onClick={() => onCreate(moves)}>{phrase('bank.createOrders', { orders: plural(count, 'order') })}</Button>
			</DialogActions>
		</Dialog>
	)
}
