import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'
import { Button, IconButton } from '../components/Button.jsx'
import { Card, Panel } from '../components/Card.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { Sum } from '../components/Data.jsx'
import { Field } from '../components/Field.jsx'
import { Icon } from '../components/Icon.jsx'
import { TokensField } from '../components/Inputs.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Alert, Anchor, Dialog, DialogActions, DialogBody, DialogTitle, Menu } from '../components/Overlays.jsx'
import { SaveBar } from '../components/Touch.jsx'
import { Skeleton, Stacked, useDismiss } from '../components/Utilities.jsx'
import { Well } from '../components/Well.jsx'
import { useApi } from '../api/useApi.js'
import { failureMessage, getCategories, getCategory, getOrders } from '../api/client.js'
import { currency, dot, fullStop, plural, shortDate } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import { CategoryMark, VendorMark } from '../app/categoryMark.jsx'

/* What the Library's lists (Vendors, Categories, Bookmarks) and their forms share: the colour a
   record stores, the mark it is drawn with, the bars above and around a list, and the parts of a record's form. */

export { SWATCHES, swatchOf, storedColour, CategoryMark } from '../app/categoryMark.jsx'
/** A stored colour as the colour picker's value: one of the eight by name, or the colour itself. */
export { swatchOf as pickedColour } from '../app/categoryMark.jsx'

/** Where the month stands today, as a share of it: the gauge's pace marker. */
export function monthPace(now = new Date()) {
	const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
	return { day: now.getDate(), days, at: (now.getDate() / days) * 100 }
}

/** The bar's sort, a Combobox that only picks (c8). */
export function SortControl({ sorts, value, onChange }) {
	const current = sorts.find(s => s.id === value) ?? sorts[0]
	return (
		<Combobox variant="sort" prefix="Sort" value={current.label}>
			{sorts.map(s => (
				<ComboboxOption key={s.id} selected={s.id === current.id} onSelect={() => onChange(s.id)}>
					{s.label}
				</ComboboxOption>
			))}
		</Combobox>
	)
}

/** A row's kebab and its menu. A click inside stays out of the row, which opens the record. The
    button names its row (c9), so a list of the page's buttons tells the rows apart. */
export function RowMenu({ noun, label, open, onToggle, onClose, children }) {
	const box = useRef(null)
	useDismiss(box, open, onClose)
	return (
		<Anchor ref={box} open={open} onClick={ev => ev.stopPropagation()}>
			<IconButton icon="dots-vertical" aria-label={`${noun} menu, ${label}`} aria-haspopup="menu"
				aria-expanded={open ? 'true' : 'false'} onClick={onToggle} />
			<Menu position="floating" aria-label={label}>{children}</Menu>
		</Anchor>
	)
}

/** Whether the page's column is at or under the 900 fold (18b), where a rail stacks under its form
    and the list's bar takes its phone shape. Measured on the body, as the stylesheet's queries are. */
export function useFold() {
	const ref = useRef(null)
	const [folded, setFolded] = useState(false)
	useLayoutEffect(() => {
		const body = ref.current?.closest('.sp-shell__body')
		if (!body) return
		const inner = () => {
			const s = getComputedStyle(body)
			return body.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)
		}
		setFolded(inner() <= 900)
		const watch = new ResizeObserver(([entry]) => setFolded(entry.contentRect.width <= 900))
		watch.observe(body)
		return () => watch.disconnect()
	}, [])
	return [ref, folded]
}

/** A skeleton over the part it stands in for: `shape` is that part, laid out unseen, so a loading
    page is the loaded page's size (6b). With no children the skeleton fills the part. */
export function Held({ shape, children }) {
	return (
		<span className="lb-hold">
			<span className="lb-ghost" aria-hidden="true" inert>{shape}</span>
			<span className="lb-state">{children ?? <Skeleton shape="bar" />}</span>
		</span>
	)
}
function HeldGroup(props) { return <Held {...props} /> }
// a Field lays a group of options out under a legend, so the stand-in for one keeps that layout
HeldGroup.fieldRole = 'group'

/** `control` while the record loads: held, so its Field keeps its layout. */
export const hold = control => (control?.type?.fieldRole === 'group'
	? <HeldGroup key={control.key} shape={control} />
	: <Held key={control?.key} shape={control} />)

/** A skeleton line at the height of the text it stands in for; `role` is that text's class. */
export function Bar({ role, w, h, end = false }) {
	return (
		<span className="sp-row-flex">
			<span className={role} aria-hidden="true">{'\u200b'}</span>
			<Skeleton shape={end ? 'end' : 'line'} data-w={w} data-h={h} />
		</span>
	)
}

/** A record's page (5b, 22c): below the 900 fold the rail follows the form and the bar comes
    last, so it never scrolls away (c27). `alone` is what a phone keeps of the rail. */
export function RecordPage({ notice, cards, rail, alone = rail, bar }) {
	const [ref, folded] = useFold()
	const touch = useShellShape() === 'touch'
	if (touch || folded)
		return <div className="sp-stack sp-gap-12" ref={ref}>{notice}{cards}{touch ? alone : rail}{bar}</div>
	return (
		<div ref={ref}>
			<div className="lb-split">
				<div className="sp-stack sp-gap-12">{notice}{cards}{bar}</div>
				<Panel>{rail}</Panel>
			</div>
		</div>
	)
}

/** A form's commit bar: the save bar in the tab bar's place on a phone (r13, Mobile 5b), the sticky
    row under the form elsewhere (c27). Without `onSave` there is nothing left to save. */
export function CommitBar({ status, quiet = false, onCancel, onSave, commit, saving = false, disabled = false }) {
	const touch = useShellShape() === 'touch'
	const buttons = (
		<>
			<Button variant="outline" onClick={onCancel}>Cancel</Button>
			{onSave ? <Button onClick={onSave} disabled={saving || disabled}>{saving ? 'Saving…' : commit}</Button> : null}
		</>
	)
	if (touch) return <SaveBar><span className={quiet ? 'sp-subtitle sp-grow sp-ink-5' : 'sp-subtitle sp-grow'}>{status}</span>{buttons}</SaveBar>
	return <ListItem variant="sticky"><span className={quiet ? 'sp-data sp-grow sp-ink-5' : 'sp-data sp-grow'}>{status}</span>{buttons}</ListItem>
}

/** A save that found its record deleted: the client's sentence, kept above the form, with the
    way back to the list. */
export function GoneNotice({ message, list }) {
	return (
		<Alert color="danger" mark="!" action={<Button variant="outline" size="small" to={list.to}>{list.label}</Button>}>
			{message}
		</Alert>
	)
}
export const isGone = error => Boolean(error?.gone)

/** The rail's cards while the record loads (5c, 5f, 22d), each at its loaded size. */
export function SummaryLoading({ label, sums, action, children }) {
	return (
		<Card aria-busy="true">
			<span className="sp-section-label">{label}</span>
			<div className="sp-row-flex sp-gap-12">
				<Skeleton shape="mark" />
				<Stacked><Bar role="sp-title" w="62pc" h="13" /><Bar role="sp-meta" w="44pc" h="10" /></Stacked>
			</div>
			{children}
			<div className="sp-stack">
				{sums.map(([name, w]) => <Sum key={name} value={<Skeleton shape="end" data-w={w} data-h="13" />}>{name}</Sum>)}
			</div>
			{action ? <Held shape={<Button variant="outline" size="small">{action}</Button>} /> : null}
		</Card>
	)
}

export function RecentLoading() {
	return (
		<Card aria-busy="true">
			<span className="sp-section-label">Recent orders</span>
			{['62pc', '48pc'].map(w => (
				<ListItem key={w}>
					<Stacked><Bar role="sp-title" w={w} h="13" /><Bar role="sp-meta" w="44pc" h="10" /></Stacked>
					<Bar role="sp-title" w="88" h="13" end />
				</ListItem>
			))}
			<Held shape={<Button variant="outline" size="small">See all orders</Button>} />
		</Card>
	)
}

/** The end-of-life card while the record loads: `title` and `body` are the words it most often
    says, held unseen so the card keeps their size. `action` holds the room of its footer button. */
export function EndLoading({ label, title, body, action }) {
	return (
		<Card aria-busy="true" {...(action ? { footer: [<Held key="action" shape={action} />], footerCommits: true } : {})}>
			<span className="sp-section-label">{label}</span>
			<Well>
				<Held shape={<span className="sp-title">{title}</span>}><Skeleton shape="line" data-w="62pc" data-h="13" /></Held>
				<Held shape={<span className="sp-subtitle">{body}</span>} />
			</Well>
		</Card>
	)
}

/** A failed write said as a toast; a session that ended has its own dialog, so it says nothing. */
export function sayFailure(toast, error, fallback) {
	const message = failureMessage(error, fallback)
	if (message) toast({ message, color: 'danger' })
}

/** An irreversible delete, confirmed in a dialog that names what goes (6d). */
export function ConfirmDelete({ title, action, busy, onConfirm, onCancel, children }) {
	return (
		<Dialog onCancel={onCancel}>
			<DialogTitle>{title}</DialogTitle>
			<DialogBody>{children}</DialogBody>
			<DialogActions>
				<Button variant="outline" onClick={onCancel}>Cancel</Button>
				<span className="sp-grow" />
				<Button color="danger" disabled={busy} onClick={onConfirm}>{action}</Button>
			</DialogActions>
		</Dialog>
	)
}

/** What deleting a vendor takes with it. Only a vendor with no orders can be deleted. */
export const deleteNote = vendor => {
	const n = vendor.aliases?.length ?? 0
	if (!n) return 'It has no orders.'
	return n === 1
		? 'It has no orders. The other name it matches on receipts goes with it.'
		: `It has no orders. The ${n} other names it matches on receipts go with it.`
}

/** What deleting a category does (5d, 5f): the label comes off what carries it, and its limit goes.
    `alone` is how many of its orders carry no other category. */
export function categoryDeleteNote({ orders = 0, alone = 0, bookmarks = 0, budget = 0 }) {
	const parts = []
	if (orders) parts.push(`The label comes off ${plural(orders, 'order')}${alone
		? `; ${alone === orders && orders === 1 ? 'it carries' : `${alone} of them ${alone === 1 ? 'carries' : 'carry'}`} no other category`
		: ''}.`)
	if (bookmarks) parts.push(`It also comes off ${plural(bookmarks, 'bookmark')}.`)
	if (!orders && !bookmarks) parts.push('No order or bookmark carries it.')
	if (budget > 0) parts.push(`Its limit of ${currency(budget, 0)} goes with it.`)
	return parts.join(' ')
}

/** Deleting a category, confirmed in a dialog (6d) that reads the record first, so it can say how
    many orders are left with no category. The button names what goes, and only that. */
export function DeleteCategory({ category, busy, onConfirm, onCancel }) {
	const record = useApi(getCategory, [category.id])
	const known = record.data?.id === category.id ? record.data : null
	return (
		<ConfirmDelete title={`Delete ${category.name}?`} action="Delete category" busy={busy || !known}
			onConfirm={onConfirm} onCancel={onCancel}>
			{categoryDeleteNote(known ?? category)}
		</ConfirmDelete>
	)
}

/** Archiving a vendor, confirmed in a dialog. It can be undone, so the commit is the primary one. */
export function ConfirmArchive({ vendor, busy, onConfirm, onCancel }) {
	return (
		<Dialog onCancel={onCancel}>
			<DialogTitle>Archive {vendor.name}?</DialogTitle>
			<DialogBody>
				It leaves the vendor list and the order list's filters. {vendor.orders
					? `Its ${plural(vendor.orders, 'order')} ${vendor.orders === 1 ? 'keeps' : 'keep'} it as their vendor, and`
					: 'Its details stay, and'} the Archived view brings it back.
			</DialogBody>
			<DialogActions>
				<Button variant="outline" onClick={onCancel}>Cancel</Button>
				<span className="sp-grow" />
				<Button disabled={busy} onClick={onConfirm}>Archive</Button>
			</DialogActions>
		</Dialog>
	)
}

/** Merging a vendor or a category into another (5j). The target is searched, never the source
    itself; what the result will be is shown before the button, which carries the count. */
export function MergeDialog({ kind, source, options, busy, onConfirm, onCancel }) {
	const [target, setTarget] = useState(null)
	const [query, setQuery] = useState('')
	const vendor = kind === 'vendor'
	const others = options.filter(o => o.id !== source.id)
	const needle = query.trim().toLowerCase()
	const shown = others.filter(o => !needle || o.name.toLowerCase().includes(needle))
	const picked = others.find(o => o.id === target) ?? null
	const markOf = o => (vendor ? <VendorMark name={o.name} colour={o.colour} size="small" /> : <CategoryMark category={o} size="small" />)
	const names = o => new Set([o.name, ...(o.aliases ?? [])].map(n => n.toLowerCase()))
	const aliasCount = picked ? new Set([...(picked.aliases ?? []), ...names(source)].map(n => n.toLowerCase()).filter(n => n !== picked.name.toLowerCase())).size : 0
	return (
		<Dialog onCancel={onCancel}>
			<DialogTitle>{vendor ? 'Merge a vendor' : 'Merge a category'}</DialogTitle>
			<Field id="merge-target"
				label={vendor
					? <>Move everything from <b className="sp-ink">{source.name}</b> into</>
					: <>Merge <b className="sp-ink">{source.name}</b> and its <b className="sp-ink">{plural(source.orders, 'order')}</b> into</>}
				message={vendor
					? `"${source.name}" becomes an alias, so the next receipt printing that name files here.`
					: 'Every category except this one. Totals and charts count it under the one you pick.'}>
				<Combobox searchable search={query} onSearch={setQuery} noun={vendor ? 'vendors' : 'categories'}
					placeholder={vendor ? 'Choose a vendor' : 'Choose a category'}
					value={picked ? picked.name : ''} lead={picked ? markOf(picked) : undefined}>
					{shown.map(o => (
						<ComboboxOption key={o.id} selected={o.id === target} mark={markOf(o)} meta={plural(o.orders, 'order')}
							onSelect={() => { setTarget(o.id); setQuery('') }}>{o.name}</ComboboxOption>
					))}
				</Combobox>
			</Field>
			{picked && vendor
				? (
					<div className="sp-list">
						<table className="sp-table sp-table--compact sp-table--static">
							<thead><tr><th /><th>Source</th><th>Result</th></tr></thead>
							<tbody>
								<tr><td className="sp-ink-2">Name</td><td className="sp-ink-5">{source.name}</td><td className="sp-strong">{picked.name}</td></tr>
								<tr><td className="sp-ink-2">Aliases</td><td className="sp-ink-5">{source.aliases?.length ?? 0}</td><td className="sp-strong">{aliasCount}</td></tr>
								<tr><td className="sp-ink-2">Orders</td><td className="sp-ink-5">{source.orders}</td><td className="sp-strong">{source.orders + picked.orders}</td></tr>
							</tbody>
						</table>
					</div>
				)
				: null}
			{picked && !vendor
				? (
					<Well color="danger">
						<span className="sp-title">{source.name} is deleted once its orders have moved</span>
						<span className="sp-subtitle">
							{picked.name} gets its {plural(source.orders, 'order')}. An order carrying both keeps one label, not two.
							{source.budget > 0 ? ` ${source.name}'s limit of ${currency(source.budget, 0)} goes with it` : ''}
							{source.budget > 0 && picked.budget > 0 ? `; ${picked.name}'s stays at ${currency(picked.budget, 0)}${fullStop()}` : source.budget > 0 ? '.' : ''}
						</span>
					</Well>
				)
				: null}
			<DialogBody>This cannot be undone.</DialogBody>
			<DialogActions>
				<Button variant="outline" onClick={onCancel}>Cancel</Button>
				<span className="sp-grow" />
				<Button {...(vendor ? {} : { color: 'danger' })} disabled={busy || !picked} onClick={() => onConfirm(picked)}>
					Merge {plural(source.orders, 'order')}
				</Button>
			</DialogActions>
		</Dialog>
	)
}

/** What deleting a bookmark takes with it, and the way to keep it instead. */
export const bookmarkDeleteNote = bookmark => `${bookmark.photoId ? 'The bookmark and its picture are' : 'The bookmark is'} removed. To keep it off the list without losing it, archive it instead.`

/** Holds the page while the form has changes: in-app navigation asks first, a reload gets the
    browser's question. `names` say where the changes are (9c); `release` lets a save leave. */
export function useLeaveGuard(dirty, { within, search = false, names = [], uploading = 0 } = {}) {
	const released = useRef(false)
	const live = useRef(dirty)
	live.current = dirty
	// pages under `within` share the changes, so moving among them does not ask
	const stays = path => within != null && (path === within || path.startsWith(within + '/'))
	// with `search`, the same path with another query is another page too
	const moves = (from, to) => from.pathname !== to.pathname || (search && from.search !== to.search)
	const blocker = useBlocker(useCallback(({ currentLocation, nextLocation }) =>
		live.current && !released.current && moves(currentLocation, nextLocation) && !stays(nextLocation.pathname), [within, search]))
	useBeforeUnload(useCallback(ev => {
		if (live.current && !released.current) { ev.preventDefault(); ev.returnValue = '' }
	}, []))
	const prompt = blocker.state === 'blocked'
		? (
			<Dialog onCancel={() => blocker.reset()}>
				<DialogTitle>Leave without saving?</DialogTitle>
				<DialogBody>Your changes {names.length ? `in ${names.join(' and in ')}` : 'on this page'} are not saved.{uploading ? ` ${uploading === 1 ? '1 file is' : `${uploading} files are`} still uploading.` : ''} If you leave now, they are lost.</DialogBody>
				<DialogActions>
					<Button variant="outline" onClick={() => blocker.reset()}>Keep editing</Button>
					<span className="sp-grow" />
					<Button color="danger" onClick={() => blocker.proceed()}>Leave</Button>
				</DialogActions>
			</Dialog>
		)
		: null
	return { prompt, release: () => { released.current = true } }
}

/** Moves focus to the first field the save refused, so pressing Save always does something. */
export function focusFirst(ids) {
	for (const id of ids) {
		const el = id && document.getElementById(id)
		if (el) { el.focus(); return }
	}
}

/** The two newest orders behind a record, and the way to all of them (5c, 5f). */
export function RecentOrders({ filter, to, total }) {
	const recent = useApi(getOrders, [{ ...filter, pageSize: 2 }])
	const orders = recent.data?.orders ?? []
	if (!total || !orders.length) return null
	return (
		<Card>
			<span className="sp-section-label">Recent orders</span>
			{orders.map(order => <RecentOrder key={order.id} order={order} />)}
			<Button variant="outline" size="small" to={to}>See all {plural(total, 'order')}</Button>
		</Card>
	)
}

function RecentOrder({ order }) {
	return (
		<ListItem to={`/orders/${order.id}`}>
			<Stacked>
				<span className="sp-title sp-truncate">{order.reference || 'No reference yet'}</span>
				<span className="sp-meta">{shortDate(order.date)}{dot}{plural(order.itemCount, 'item')}</span>
			</Stacked>
			<span className="sp-title sp-nowrap">{currency(order.total)}</span>
		</ListItem>
	)
}

/** Categories typed as tokens and picked from the one set; a name it does not hold is offered as
    Create "…" and becomes a category when the form is saved (22c). */
export function CategoryTokens({ value, onChange, ...rest }) {
	const categories = useApi(getCategories)
	const [typing, setTyping] = useState('')
	const known = categories.data ?? []
	const same = (a, b) => a.toLowerCase() === b.toLowerCase()
	// a typed name takes the spelling of the category it names, and names it once
	const change = next => {
		const out = []
		for (const typed of next) {
			const named = known.find(c => same(c.name, typed))?.name ?? typed
			if (!out.some(n => same(n, named))) out.push(named)
		}
		onChange(out)
	}
	const query = typing.trim()
	const matches = known.filter(c => !value.some(n => same(n, c.name)) && c.name.toLowerCase().includes(query.toLowerCase()))
	const exists = [...value, ...known.map(c => c.name)].some(n => same(n, query))
	return (
		<TokensField value={value} onChange={change} onSearch={setTyping} noun="categories" placeholder="Add…" aria-label="Add a category" {...rest}>
			{[
				...matches.map(c => <ComboboxOption key={c.id} onSelect={() => change([...value, c.name])}>{c.name}</ComboboxOption>),
				query && !exists
					? <ComboboxOption key="create" create mark={<Icon name="plus" size={13} />} onSelect={() => change([...value, query])}>Create "{query}"</ComboboxOption>
					: null
			]}
		</TokensField>
	)
}

/** Where focus goes once a record leaves the list under it: the record now in its place, else the
    last one, else `fallback`. Focus the reader has since moved elsewhere is left where it is. */
export function useRefocus(rows, selector, fallback) {
	const pending = useRef(null)
	useEffect(() => {
		const gone = pending.current
		if (!gone || !rows || rows.some(r => r.id === gone.id)) return
		pending.current = null
		if (document.activeElement && document.activeElement !== document.body) return
		const all = document.querySelectorAll(selector)
		;(all[Math.min(gone.index, all.length - 1)] ?? document.querySelector(fallback))?.focus()
	}, [rows, selector, fallback])
	return (row, index) => { pending.current = { id: row.id, index } }
}
