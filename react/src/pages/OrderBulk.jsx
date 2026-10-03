import { useCallback, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../components/Button.jsx'
import { Check, Choice, Radio, Switch } from '../components/Choice.jsx'
import { Icon } from '../components/Icon.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Anchor, Dialog, DialogActions, DialogBody, DialogTitle, Popover, useToast } from '../components/Overlays.jsx'
import { Pill } from '../components/Pill.jsx'
import { Scrim } from '../components/Shell.jsx'
import { Sheet } from '../components/Touch.jsx'
import { useDismiss, useFocusTrap } from '../components/Utilities.jsx'
import { changeOrders, failureMessage, getCategories, invalidateOrderData } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { plural } from '../api/format.js'
import { useStatuses } from '../app/statuses.js'
import { allMatching, ordersCsv, saveCsv } from '../app/ordersCsv.js'

/* "both orders", "all 5 orders", "this order": how a popover names what it writes to. */
const which = n => (n === 1 ? 'this order' : n === 2 ? 'both orders' : `all ${n} orders`)

/** The bulk bar's actions (2a): a popover writes nothing until Apply; delete asks first (6d).
    `chosen` is the picked orders loaded; `all` means every order `request` matches. */
export function BulkActions({ chosen, all, count, request, touch, onDone }) {
	const toast = useToast()
	const [open, setOpen] = useState(null)
	const [busy, setBusy] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const anchor = useRef(null)
	const close = useCallback(() => setOpen(null), [])
	useDismiss(anchor, open && !touch, close)

	// the orders written to: the picked rows, or every match fetched when the whole filter is picked
	const records = async () => (all ? allMatching(request) : chosen)

	const write = async (change, done, failed) => {
		setBusy(true)
		try {
			const ids = (await records()).map(o => o.id)
			await changeOrders({ ...change, ids })
			invalidateOrderData()
			setOpen(null)
			setDeleting(false)
			onDone()
			toast({ message: done(ids.length) })
		} catch (e) {
			toast({ message: failureMessage(e, failed), color: 'danger' })
		} finally {
			setBusy(false)
		}
	}

	const statusName = useStatusName()
	const exportCsv = async () => {
		setBusy(true)
		try { saveCsv(ordersCsv(await records(), statusName)) }
		catch (e) { toast({ message: failureMessage(e, 'The file was not made. Try again.'), color: 'danger' }) }
		finally { setBusy(false) }
	}

	const panel = open === 'status'
		? <SetStatus chosen={all ? null : chosen} count={count} busy={busy} onCancel={close}
			onApply={(status, deliveredToday) => write({ status, deliveredToday }, n => `Status set on ${plural(n, 'order')}.`, 'The status was not changed. Try again.')} />
		: open === 'category'
			? <AddCategory chosen={all ? null : chosen} count={count} busy={busy} onCancel={close}
				onApply={names => write({ addCategories: names }, n => `${names.join(', ')} added to ${plural(n, 'order')}.`, 'No category was added. Try again.')} />
			: null

	return (
		<Anchor ref={anchor} open={!!open && !touch}>
			<div className="sp-row-flex sp-gap-8">
				<Button variant="outline" size="small" aria-expanded={open === 'status' ? 'true' : 'false'} aria-haspopup="dialog" disabled={busy}
					onClick={() => setOpen(open === 'status' ? null : 'status')}>Set status</Button>
				<Button variant="outline" size="small" aria-expanded={open === 'category' ? 'true' : 'false'} aria-haspopup="dialog" disabled={busy}
					onClick={() => setOpen(open === 'category' ? null : 'category')}>Add category</Button>
				<Button variant="outline" size="small" disabled={busy} onClick={exportCsv}>Export</Button>
				<Button size="small" color="danger" disabled={busy} onClick={() => { setOpen(null); setDeleting(true) }}>Delete</Button>
			</div>
			{panel && touch ? <SheetOf label={open === 'status' ? 'Set status' : 'Add category'} onClose={close}>{panel}</SheetOf> : null}
			{panel && !touch ? panel : null}
			{deleting
				? (
					<Dialog onCancel={() => setDeleting(false)} aria-label={`Delete ${plural(count, 'order')}?`}>
						<div className="sp-stack sp-gap-12">
							<div className="sp-row-flex sp-gap-12">
								<Mark size="medium" aria-hidden="true" aria-label="Delete"><Icon name="trash" size={17} /></Mark>
								<DialogTitle>Delete {plural(count, 'order')}?</DialogTitle>
							</div>
							<DialogBody>Their lines and files are deleted with them.</DialogBody>
							<ListItem>This cannot be undone.</ListItem>
							<DialogActions>
								<Button variant="outline" fullWidth disabled={busy} onClick={() => setDeleting(false)}>Keep them</Button>
								<Button color="danger" fullWidth disabled={busy}
									onClick={() => write({ delete: true }, n => `${plural(n, 'order')} deleted.`, 'Nothing was deleted. Try again.')}>
									Delete {plural(count, 'order')}
								</Button>
							</DialogActions>
						</div>
					</Dialog>
				)
				: null}
		</Anchor>
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
	const name = useId()
	const today = useId()
	const [status, setStatus] = useState(null)
	const [deliveredToday, setDeliveredToday] = useState(false)
	return (
		<Popover position="start" role="dialog" aria-label="Set status"
			onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); onCancel() } }}
			head={<><span className="sp-title">Set status</span><span className="sp-subtitle">Replaces the status on {which(count)}.</span></>}
			note={status === 'Delivered'
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
	const categories = useApi(getCategories)
	const [find, setFind] = useState('')
	const [adding, setAdding] = useState([])
	const all = categories.data ?? []
	const needle = find.trim().toLowerCase()
	const shown = needle ? all.filter(c => c.name.toLowerCase().includes(needle)) : all
	const known = all.some(c => c.name.toLowerCase() === needle)
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
			actions={<>
				<Button variant="outline" fullWidth onClick={onCancel}>Cancel</Button>
				<Button fullWidth disabled={!adding.length || busy} onClick={() => onApply(adding)}>Apply</Button>
			</>}>
			{shown.map(c => {
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
			})}
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
