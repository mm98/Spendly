import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../components/Button.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { ComboboxEmpty, ComboboxGroup, ComboboxOption } from '../components/Combobox.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '../components/Overlays.jsx'
import { useApi } from '../api/useApi.js'
import { getOftenOrders, getOrders } from '../api/client.js'
import { amount, dayShortMonth, dot, plural } from '../api/format.js'

/** The third way to start (3b), and Home's copy button: pick the order to copy, by vendor or by an
    item on it. The arrow keys walk the rows from the search field, as in every combobox (14a). */
export function CopyPicker({ onClose }) {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')
	const [asked, setAsked] = useState('')
	const [active, setActive] = useState(-1)
	const timer = useRef(null)
	const search = useRef(null)
	const listId = useId()
	useEffect(() => {
		clearTimeout(timer.current)
		timer.current = setTimeout(() => setAsked(query.trim()), 300)
		return () => clearTimeout(timer.current)
	}, [query])
	// after the dialog has focused its first button, so the reader starts where they type
	useEffect(() => { search.current?.focus() }, [])
	const found = useApi(getOrders, [{ pageSize: 6, query: asked, with: 'itemTitles' }])
	// the repeats lead an empty search (3b); a search looks through every order
	const repeats = useApi(getOftenOrders)
	const often = asked ? [] : repeats.data?.orders ?? []
	// six rows in all, as the drawing keeps the dialog small
	const recent = (found.data?.orders ?? []).filter(o => !often.some(r => r.id === o.id)).slice(0, 6 - often.length)
	const orders = [...often, ...recent]
	useEffect(() => setActive(-1), [asked])
	const pick = o => navigate(`/orders/new?duplicate=${o.id}`)
	const keys = ev => {
		if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && orders.length) {
			ev.preventDefault()
			const by = ev.key === 'ArrowDown' ? 1 : -1
			setActive(at => (at + by + orders.length + (at < 0 && by < 0 ? 1 : 0)) % orders.length)
		} else if (ev.key === 'Enter' && orders[active]) {
			ev.preventDefault()
			pick(orders[active])
		}
	}
	const row = (o, i) => (
		<ComboboxOption key={o.id} id={`${listId}-${i}`} active={i === active} onSelect={() => pick(o)}>
			<span className="sp-row-flex sp-gap-8">
				<span className="sp-stacked sp-grow">
					<span className="sp-title sp-truncate">{o.vendor?.name}</span>
					<span className="sp-meta sp-truncate">{plural(o.itemCount, 'line')}{o.itemTitles?.length ? `${dot}${o.itemTitles.join(', ')}${o.itemCount > o.itemTitles.length ? '…' : ''}` : null}</span>
				</span>
				<span className="sp-stacked sp-cell-amount sp-flex-none">
					<span className="sp-amount">{amount(o.total)}</span>
					<span className="sp-meta">{o.times ? `${o.times} times${dot}last ${dayShortMonth(o.date)}` : dayShortMonth(o.date)}</span>
				</span>
			</span>
		</ComboboxOption>
	)
	let rows
	if (!found.data) rows = null
	else if (!orders.length) rows = <ComboboxEmpty>{asked ? `No order matches "${asked}".` : 'There are no orders to copy yet.'}</ComboboxEmpty>
	else rows = (
		<>
			{often.length ? <ComboboxGroup>You order these often</ComboboxGroup> : null}
			{often.map(row)}
			{asked || !recent.length ? null : <ComboboxGroup>Recent</ComboboxGroup>}
			{recent.map((o, i) => row(o, often.length + i))}
		</>
	)
	return (
		<Dialog onCancel={onClose} aria-label="Copy a previous order">
			<div className="sp-stack sp-gap-12">
				<div className="sp-stack sp-gap-6">
					<DialogTitle>Copy a previous order</DialogTitle>
					<DialogBody>The vendor, category and item lines are copied, with each item's photo. The date becomes today, the status resets, and the receipt stays on the original order.</DialogBody>
				</div>
				<SearchInput value={query} onChange={setQuery} placeholder="Search by vendor or item…" aria-label="Search previous orders"
					inputRef={search} role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list"
					aria-activedescendant={active > -1 ? `${listId}-${active}` : undefined} onKeyDown={keys} />
				<ul className="oc-options" id={listId} role="listbox" aria-label="Previous orders">{rows}</ul>
				<span className="sp-announce" aria-live="polite">{asked && found.data ? (orders.length ? plural(orders.length, 'order') : 'No orders') : ''}</span>
				<DialogActions>
					<span className="sp-meta">Nothing is created until you save.</span>
					<span className="sp-grow" />
					<Button variant="outline" onClick={onClose}>Cancel</Button>
				</DialogActions>
			</div>
		</Dialog>
	)
}
