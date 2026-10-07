import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, IconButton } from '../components/Button.jsx'
import { Check, Choice, Radio, Switch } from '../components/Choice.jsx'
import { Field } from '../components/Field.jsx'
import { NumberField, SearchInput } from '../components/Inputs.jsx'
import { Alert, Anchor, Dialog, DialogActions, DialogBody, DialogTitle, Popover, useToast } from '../components/Overlays.jsx'
import { Pill } from '../components/Pill.jsx'
import { Scrim } from '../components/Shell.jsx'
import { Sheet } from '../components/Touch.jsx'
import { Skeleton, useDismiss, useFocusTrap } from '../components/Utilities.jsx'
import { changeOrders, failureMessage, getCategoryPage, getOrderImpact, invalidateOrderData } from '../api/client.js'
import { groupPicks, moreText, pickGroups, rowHeads, usePickList, useRecent } from '../app/pickList.jsx'
import { useApi } from '../api/useApi.js'
import { NUMBER_LOCALE, amount, currency, fullStop, monthNames, plural, today } from '../api/format.js'
import { useStatuses, useStatusTypes } from '../app/statuses.js'
import { allMatching, idGroups, linesCsv, linesOf, saveCsv } from '../app/ordersCsv.js'

/* "both orders", "all 5 orders", "this order": how a popover names what it writes to. */
const which = n => (n === 1 ? 'this order' : n === 2 ? 'both orders' : `all ${n} orders`)

/** The bulk bar's actions (2a): a popover writes nothing until Apply; delete asks first (6d). `chosen` is
    the picked orders loaded; `all`, every order `request` matches; `icons`, the phone's head (c12). */
export function BulkActions({ chosen, all, count, request, filtered, touch, icons = false, onDone }) {
	const toast = useToast()
	const [open, setOpen] = useState(null)
	const [busy, setBusy] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const anchor = useRef(null)
	const close = useCallback(() => setOpen(null), [])
	useDismiss(anchor, open && !touch, close)

	// the orders written to: the picked rows, or every match fetched when the whole filter is picked
	const records = async () => (all ? allMatching(request) : chosen)
	const ids = all ? null : chosen.map(o => o.id)

	const undoing = (back, failed) => ({
		label: 'Undo',
		onClick: () => back().then(invalidateOrderData, e => toast({ message: failureMessage(e, failed), color: 'danger' }))
	})

	// a dialog closing is the delete's confirmation, so a delete says nothing more (6f)
	const write = async (change, done, failed) => {
		setBusy(true)
		try {
			const before = await records()
			const out = await changeOrders({ ...change, ids: before.map(o => o.id) })
			invalidateOrderData()
			setOpen(null)
			setDeleting(false)
			onDone()
			if (done) toast(done(before, out))
		} catch (e) {
			toast({ message: failureMessage(e, failed), color: 'danger' })
		} finally {
			setBusy(false)
		}
	}

	const statusName = useStatusName()
	// the picked orders only, never the filter around them (c1), one row per item line (16b)
	const exportCsv = async () => {
		setBusy(true)
		try { saveCsv(linesCsv(await linesOf(request, ids), statusName)) }
		catch (e) { toast({ message: failureMessage(e, 'The file was not made. Try again.'), color: 'danger' }) }
		finally { setBusy(false) }
	}

	const panel = open === 'status'
		? <SetStatus chosen={all ? null : chosen} count={count} busy={busy} onCancel={close}
			onApply={(status, deliveredToday) => write({ status, deliveredToday }, (before, out) => ({
				message: `Status set to ${statusName(status)} on ${plural(before.length, 'order')}.`,
				undo: undoing(() => changeOrders({ ids: out.kept.map(o => o.id), restore: out.kept }), 'The status was not changed back. Try again.')
			}), 'The status was not changed. Try again.')} />
		: open === 'category'
			? <AddCategory chosen={all ? null : chosen} count={count} busy={busy} onCancel={close}
				onApply={names => write({ addCategories: names }, before => ({
					message: `${names.join(', ')} added to ${plural(before.length, 'order')}.`,
					undo: undoing(() => removeAdded(before, names), 'The categories were not changed back. Try again.')
				}), 'No category was added. Try again.')} />
			: null

	const toggle = name => ({
		'aria-expanded': open === name ? 'true' : 'false', 'aria-haspopup': 'dialog', disabled: busy,
		onClick: () => setOpen(open === name ? null : name)
	})
	const remove = () => { setOpen(null); setDeleting(true) }
	const actions = icons
		? (
			<div className="sp-row-flex sp-gap-6">
				<IconButton icon="clock" aria-label="Set status" {...toggle('status')} />
				<IconButton icon="tag" aria-label="Add category" {...toggle('category')} />
				<IconButton icon="download" aria-label="Export" disabled={busy} onClick={exportCsv} />
				<IconButton icon="trash" aria-label="Delete" danger disabled={busy} onClick={remove} />
			</div>
		)
		: (
			<div className="sp-row-flex sp-gap-8">
				<Button variant="outline" size="small" {...toggle('status')}>Set status</Button>
				<Button variant="outline" size="small" {...toggle('category')}>Add category</Button>
				<Button variant="outline" size="small" disabled={busy} onClick={exportCsv}>Export</Button>
				<Button size="small" color="danger" disabled={busy} onClick={remove}>Delete</Button>
			</div>
		)

	return (
		<Anchor ref={anchor} open={!!open && !touch}>
			{actions}
			{panel && touch ? <SheetOf label={open === 'status' ? 'Set status' : 'Add category'} onClose={close}>{panel}</SheetOf> : null}
			{panel && !touch ? panel : null}
			{deleting
				? <DeleteOrders count={count} request={request} ids={ids} filtered={filtered} busy={busy} onCancel={() => setDeleting(false)}
					onDelete={() => write({ delete: true }, null, 'Nothing was deleted. Try again.')} />
				: null}
		</Anchor>
	)
}

/* A category comes off only the orders that did not carry it before. */
async function removeAdded(orders, names) {
	const categories = await Promise.all(names.map(name => getCategoryPage({ name, pageSize: 1 }).then(r => r.categories[0])))
	return Promise.all(names.map((name, i) => {
		const category = categories[i]
		const ids = category ? orders.filter(o => !o.categories.some(x => x.id === category.id)).map(o => o.id) : []
		return ids.length ? changeOrders({ ids, removeCategories: [category.id] }) : null
	}))
}

/* Named getOrderImpact so a write that forgets the orders forgets this too (useApi keys by name).
   Orders picked by hand are asked about a group at a time, and the groups added up. */
const impactOf = {
	async getOrderImpact(request, ids, signal) {
		if (!ids) return getOrderImpact(request, signal)
		const parts = await Promise.all(idGroups(ids).map(group => getOrderImpact({ ids: group.join(',') }, signal)))
		return parts.reduce((a, b) => ({
			orders: a.orders + b.orders, total: a.total + b.total, withFiles: a.withFiles + b.withFiles,
			month: { orders: a.month.orders + b.month.orders, total: a.month.total + b.month.total, spend: a.month.spend }
		}))
	}
}.getOrderImpact

/** What a bulk delete takes, in numbers (6d): how many, what they come to, how many carry files,
    and what this month's total becomes. */
function consequence(n, impact, filtered) {
	const from = filtered ? 'Selected from the current filter' : 'Selected from all your orders'
	const files = impact.withFiles === 0 ? ''
		: impact.withFiles === n ? (n === 1 ? ', with attachments' : ', all of them with attachments')
			: `, ${amount(impact.withFiles, 0)} of them with attachments`
	const said = [`${from}: ${plural(n, 'order')}, ${currency(impact.total)}${files ? `${files}.` : fullStop()}`]
	const month = impact.month
	if (month.orders > 0 && month.total > 0) {
		const name = monthNames('long')[Number(today().slice(5, 7)) - 1]
		const whose = month.orders === n ? (n === 1 ? 'It is' : 'All of them are')
			: `Of these, ${amount(month.orders, 0)} ${month.orders === 1 ? 'is' : 'are'}`
		said.push(`${whose} from this month, so ${name} drops to ${currency(Math.max(0, month.spend - month.total))}${fullStop()}`)
	}
	return said.join(' ')
}

/** Bulk delete (6d): it cannot be undone, so the dialog names what goes, and Delete waits until
    the number of orders is typed. Every number is the server's, so the sentence waits for it. */
function DeleteOrders({ count, request, ids, filtered, busy, onCancel, onDelete }) {
	const impact = useApi(impactOf, [request, ids])
	const [typed, setTyped] = useState(null)
	const field = useRef(null)
	// the field has focus when the dialog opens, never the destructive button (c13)
	useEffect(() => { field.current?.focus() }, [])
	const known = !!impact.data && !impact.loading
	const ready = known && typed === count && !busy
	let body
	if (known) body = <DialogBody>{consequence(count, impact.data, filtered)}</DialogBody>
	else if (impact.error)
		body = (
			<Alert color="danger" mark="!" title="The numbers did not load"
				action={<Button variant="outline" size="small" onClick={impact.refresh}>Try again</Button>}>
				What goes with these orders is not known yet. Check your connection.
			</Alert>
		)
	else
		body = (
			<div className="sp-stack sp-gap-6" aria-busy="true" aria-label="Counting what goes with the orders">
				<Skeleton shape="line" />
				<Skeleton shape="short" />
			</div>
		)
	return (
		<Dialog onCancel={onCancel} aria-label={`Delete ${plural(count, 'order')}?`}>
			<div className="sp-stack sp-gap-12">
				<DialogTitle>Delete {plural(count, 'order')}?</DialogTitle>
				{body}
				<Field label="Type the number to confirm">
					<NumberField inputRef={field} value={typed} onChange={setTyped} decimals={0} locale={NUMBER_LOCALE}
						onKeyDown={ev => { if (ev.key === 'Enter' && ready) onDelete() }} />
				</Field>
				<DialogActions>
					<Button variant="outline" fullWidth disabled={busy} onClick={onCancel}>Cancel</Button>
					<Button color="danger" fullWidth disabled={!ready} onClick={onDelete}>Delete {plural(count, 'order')}</Button>
				</DialogActions>
			</div>
		</Dialog>
	)
}

/** A status's name as the account calls it. */
export function useStatusName() {
	const statuses = useStatuses()
	return key => statuses.find(s => s.key === key)?.name ?? key
}

/* On a phone a popover is a sheet from the bottom edge, holding the same panel. */
function SheetOf({ label, onClose, children }) {
	const box = useRef(null)
	useFocusTrap(box)
	return createPortal(
		<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
			<Sheet role="dialog" aria-modal="true" aria-label={label} ref={box} tabIndex={-1}
				onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); onClose() } }}>
				{children}
			</Sheet>
		</Scrim>,
		document.body
	)
}

/** Set status (2a): one value for every order picked, so a radio list; Apply writes it. */
function SetStatus({ chosen, count, busy, onCancel, onApply }) {
	const statuses = useStatuses()
	const { typeOf } = useStatusTypes()
	const name = useId()
	const today = useId()
	const [status, setStatus] = useState(null)
	const [deliveredToday, setDeliveredToday] = useState(false)
	return (
		<Popover position="start" role="dialog" aria-label="Set status"
			onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); onCancel() } }}
			head={<><span className="sp-title">Set status</span><span className="sp-subtitle">Replaces the status on {which(count)}.</span></>}
			note={typeOf(status) === 'delivered'
				? <><Switch id={today} checked={deliveredToday} onChange={ev => setDeliveredToday(ev.target.checked)} /><label className="sp-subtitle" htmlFor={today}>Also set delivery date to today</label></>
				: null}
			actions={<>
				<Button variant="outline" fullWidth onClick={onCancel}>Cancel</Button>
				<Button fullWidth disabled={!status || busy} onClick={() => onApply(status, deliveredToday)}>Apply</Button>
			</>}>
			{statuses.map(s => {
				const on = chosen ? chosen.filter(o => o.status === s.key).length : 0
				return (
					<Choice key={s.key} variant="row" control={<Radio name={name} checked={status === s.key} onChange={() => setStatus(s.key)} />}>
						<span className="sp-truncate">{s.name}</span>
						<span className="sp-grow" />
						{on ? <span className="sp-meta sp-nowrap">{on} of {count} today</span> : null}
					</Choice>
				)
			})}
		</Popover>
	)
}

/** Add category (2a): adds, never removes, so a category some picked orders carry shows mixed
    until it is ticked. A name nobody has yet becomes a new category. */
function AddCategory({ chosen, count, busy, onCancel, onApply }) {
	const [find, setFind] = useState('')
	const [adding, setAdding] = useState([])
	const categories = usePickList('category', find, {})
	const recent = useRecent('category')
	const needle = find.trim().toLowerCase()
	const shown = categories.rows ?? []
	// the category the typed name means, wherever it falls in the list
	const exact = useApi(getCategoryPage, [{ name: find.trim(), pageSize: 1 }], { enabled: Boolean(needle) }).data?.categories[0]
	const known = exact?.name.toLowerCase() === needle
	const toggle = (name, on) => setAdding(a => (on ? [...a.filter(n => n !== name), name] : a.filter(n => n !== name)))
	return (
		<Popover position="end" role="dialog" aria-label="Add category"
			onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); onCancel() } }}
			head={<>
				<span className="sp-title">Add category</span>
				<span className="sp-subtitle">Added to {which(count)}. Existing categories stay.</span>
			</>}
			search={<SearchInput value={find} onChange={setFind} placeholder="Find a category…" aria-label="Search categories" />}
			summary={adding.length ? <><span className="sp-subtitle">Will add</span>{adding.map(n => <Pill key={n} color="success">{n}</Pill>)}</> : null}
			note={moreText(categories.rows, categories.matched, 'categories')}
			actions={<>
				<Button variant="outline" fullWidth onClick={onCancel}>Cancel</Button>
				<Button fullWidth disabled={!adding.length || busy} onClick={() => onApply(adding)}>Apply</Button>
			</>}>
			{pickGroups(groupPicks(shown, recent, find, 'Other categories', { byName: true }), c => {
				const on = chosen ? chosen.filter(o => o.categories.some(x => x.id === c.id)).length : 0
				const everywhere = chosen && on === count
				const ticked = adding.includes(c.name)
				return (
					<Choice key={c.id} variant="row" control={<Check checked={everywhere || ticked} indeterminate={!everywhere && !ticked && on > 0}
						disabled={everywhere} onChange={ev => toggle(c.name, ev.target.checked)} />}>
						<span className="sp-truncate">{c.name}</span>
						<span className="sp-grow" />
						<span className="sp-meta sp-nowrap">{on ? `on ${on} of ${count}` : plural(c.orders ?? 0, 'order')}</span>
					</Choice>
				)
			}, rowHeads)}
			{needle && !known && !adding.some(n => n.toLowerCase() === needle)
				? (
					<button type="button" className="sp-menu__item" onClick={() => { toggle(find.trim(), true); setFind('') }}>
						<span aria-hidden="true">+</span><span><strong>Create "{find.trim()}"</strong> as a new category</span>
					</button>
				)
				: null}
		</Popover>
	)
}
