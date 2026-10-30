import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBeforeUnload, useBlocker } from 'react-router'
import { Button, IconButton } from '../components/Button.jsx'
import { Card, CardHeader, Panel } from '../components/Card.jsx'
import { Combobox, ComboboxEmpty, ComboboxOption, usePanelPlace, usePanelRest } from '../components/Combobox.jsx'
import { Sum } from '../components/Data.jsx'
import { Field } from '../components/Field.jsx'
import { Icon } from '../components/Icon.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Alert, Anchor, Dialog, DialogActions, DialogBody, DialogTitle, Menu, MenuHostOf, MenuItem, MenuLabel, MenuSeparator, Popover, Leaving } from '../components/Overlays.jsx'
import { Scrim } from '../components/Shell.jsx'
import { SaveBar, Sheet } from '../components/Touch.jsx'
import { Skeleton, Stacked, useDismiss, useFocusTrap } from '../components/Utilities.jsx'
import { Well } from '../components/Well.jsx'
import { useApi } from '../api/useApi.js'
import { failureMessage, getCategory, getCategoryPage, getOrders } from '../api/client.js'
import { amount, currency, dot, fullStop, plural, shortDate } from '../api/format.js'
import { vendorKey } from '../api/names.js'
import { useShellShape } from '../app/useMedia.js'
import { CategoryMark, VendorMark } from '../app/categoryMark.jsx'
import { OrderAmount, vendorName } from '../app/orderRow.jsx'
import { MoreMatches, groupPicks, pickGroups, usePickList, useRecent } from '../app/pickList.jsx'
import { phrase, usePhrase } from '../language/phrases.js'

/* What the Library's lists (Vendors, Categories, Bookmarks) and their forms share: the colour a
   record stores, the mark it is drawn with, the bars above and around a list, and the parts of a record's form. */

export { SWATCHES, swatchOf, storedColour, CategoryMark } from '../app/categoryMark.jsx'
/** A stored colour as the colour picker's value: one of the eight by name, or the colour itself. */
export { swatchOf as pickedColour } from '../app/categoryMark.jsx'

/** Where the month or the year a limit is for stands today, as a share of it: the gauge's pace marker. */
export function periodPace(period = 'month', now = new Date()) {
	if (period === 'year') {
		const day = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(now.getFullYear(), 0, 1)) / 86400000) + 1
		const days = new Date(now.getFullYear(), 1, 29).getDate() === 29 ? 366 : 365
		return { day, days, at: (day / days) * 100 }
	}
	const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
	return { day: now.getDate(), days, at: (now.getDate() / days) * 100 }
}

/** The bar's sort, a Combobox that only picks (c8). */
export function SortControl({ sorts, value, onChange }) {
	const current = sorts.find(s => s.id === value) ?? sorts[0]
	// a phone draws the value alone, as the order list does (Mobile screens 5a)
	const touch = useShellShape() === 'touch'
	const phrase = usePhrase()
	return (
		<Combobox variant="sort" prefix={touch ? null : phrase('sort.label')} aria-label={phrase('sort.label')} value={phrase(current.label)}>
			{sorts.map(s => (
				<ComboboxOption key={s.id} selected={s.id === current.id} onSelect={() => onChange(s.id)}>
					{phrase(s.label)}
				</ComboboxOption>
			))}
		</Combobox>
	)
}

/** A row's kebab and its menu, named by its row (c9); a click inside stays out of the row. `panel`
    draws a popover an item opened (5a) in the menu's place: `box => <MergePicker anchor={box} />`. */
export function RowMenu({ noun, label, open, onToggle, onClose, panel, children }) {
	const phrase = usePhrase()
	const box = useRef(null)
	useDismiss(box, open || !!panel, onClose)
	return (
		<Anchor ref={box} open={open || !!panel} onClick={ev => ev.stopPropagation()}>
			<IconButton icon="dots-vertical" aria-label={phrase('library.rowMenu', { noun, label })} aria-haspopup="menu"
				aria-expanded={open || panel ? 'true' : 'false'} onClick={onToggle} />
			<Leaving>{panel ? panel(box) : null}</Leaving>
			{panel ? null : <Menu position="floating" aria-label={label}>{children}</Menu>}
		</Anchor>
	)
}

/** A record's card on a phone (c1, touch): a tap opens the record, a long press opens its menu as a
    sheet. A press on the page behind the sheet presses the card, which then closes it. `panel` is as RowMenu's. */
export function CardMenu({ label, to, open, onOpen, onClose, panel, menu, children }) {
	const box = useRef(null)
	const touch = useShellShape() === 'touch'
	// the menu closes on Escape and a press outside; a picker an item opens is a sheet with its own way out
	useDismiss(box, open && !panel, onClose)
	if (!touch) return <Card to={to}>{children}</Card>
	return (
		<div ref={box}>
			<MenuHostOf open={open} box={box}>
				<Card to={to} onLongPress={onOpen} aria-haspopup="menu" aria-expanded={open || panel ? 'true' : 'false'}
					onClick={ev => { if (open || panel) { ev.preventDefault(); onClose() } }}>
					{children}
				</Card>
				<Leaving>{panel ? panel(box) : null}</Leaving>
				{panel ? null : <Menu position="floating" aria-label={label}>{menu}</Menu>}
			</MenuHostOf>
		</div>
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
			<span className="lb-state">{children ?? <Skeleton shape="fill" />}</span>
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
	// the body is the split (18b): the form and the rail are its two columns
	return (
		<>
			<div ref={ref}>{notice}{cards}{bar}</div>
			<Panel>{rail}</Panel>
		</>
	)
}

/** A form's commit bar: the save bar in the tab bar's place on a phone (r13, Mobile 5b), the sticky
    row under the form elsewhere (c27). Without `onSave` there is nothing left to save. */
export function CommitBar({ status, quiet = false, onCancel, onSave, commit, saving = false, disabled = false }) {
	const phrase = usePhrase()
	const touch = useShellShape() === 'touch'
	const buttons = (
		<>
			<Button variant="outline" onClick={onCancel}>{phrase('action.cancel')}</Button>
			{onSave ? <Button onClick={onSave} disabled={saving || disabled}>{saving ? phrase('action.saving') : commit}</Button> : null}
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
			<CardHeader name={label} />
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
	const phrase = usePhrase()
	return (
		<Card aria-busy="true">
			<CardHeader name={phrase('library.recentOrders')} />
			{['62pc', '48pc'].map(w => (
				<ListItem key={w}>
					<Stacked><Bar role="sp-title" w={w} h="13" /><Bar role="sp-meta" w="44pc" h="10" /></Stacked>
					<Bar role="sp-title" w="88" h="13" end />
				</ListItem>
			))}
			<Held shape={<Button variant="outline" size="small">{phrase('library.seeAllOrders')}</Button>} />
		</Card>
	)
}

/** The end-of-life card while the record loads: `title` and `body` are the words it most often
    says, held unseen so the card keeps their size. `action` holds the room of its footer button, `after` of what is under it. */
export function EndLoading({ label, title, body, action, after }) {
	return (
		<Card aria-busy="true" {...(action ? { footer: [<Held key="action" shape={action} />], footerCommits: true } : {})}
			{...(after ? { after: <Held shape={after} /> } : {})}>
			<CardHeader name={label} />
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
	const phrase = usePhrase()
	return (
		<Dialog onCancel={onCancel}>
			<DialogTitle>{title}</DialogTitle>
			<DialogBody>{children}</DialogBody>
			<DialogActions>
				<Button variant="outline" onClick={onCancel}>{phrase('action.cancel')}</Button>
				<span className="sp-grow" />
				<Button color="danger" disabled={busy} onClick={onConfirm}>{action}</Button>
			</DialogActions>
		</Dialog>
	)
}

/** What deleting a vendor takes with it. Only a vendor with no orders can be deleted. */
export const deleteNote = vendor => {
	return phrase('library.vendorDeleteNote', { count: vendor.aliases?.length ?? 0 })
}

/** What deleting a category does (5d, 5f): the label comes off what carries it, and its limit goes.
    `alone` is how many of its orders carry no other category. */
export function categoryDeleteNote({ orders = 0, alone = 0, bookmarks = 0, budget = 0 }) {
	const parts = []
	if (orders) parts.push(alone
		? phrase('library.categoryDelete.ordersAlone', { orders: plural(orders, 'order'), all: String(alone === orders && orders === 1), alone })
		: phrase('library.categoryDelete.orders', { orders: plural(orders, 'order') }))
	if (bookmarks) parts.push(phrase('library.categoryDelete.bookmarks', { bookmarks: plural(bookmarks, 'bookmark') }))
	if (!orders && !bookmarks) parts.push(phrase('library.categoryDelete.none'))
	if (budget > 0) parts.push(phrase('library.categoryDelete.limit', { amount: currency(budget, 0) }))
	return parts.join(' ')
}

/** Deleting a category, confirmed in a dialog (6d) that reads the record first, so it can say how
    many orders are left with no category. The button names what goes, and only that. */
export function DeleteCategory({ category, busy, onConfirm, onCancel }) {
	const phrase = usePhrase()
	const record = useApi(getCategory, [category.id])
	const known = record.data?.id === category.id ? record.data : null
	return (
		<ConfirmDelete title={phrase('library.deleteTitle', { name: category.name })} action={phrase('library.deleteCategory')} busy={busy || !known}
			onConfirm={onConfirm} onCancel={onCancel}>
			{categoryDeleteNote(known ?? category)}
		</ConfirmDelete>
	)
}

/** Archives a vendor or brings it back, and says so in a toast with Undo (6f, 16a): it can be
    undone, so it asks nothing first. `done` runs after the change and after its undo. */
export function archiveVendor({ vendor, to, update, toast, done }) {
	return update(vendor.id, { archived: to }).then(() => {
		done()
		toast({
			message: phrase(to ? 'library.archived' : 'library.unarchived', { name: vendor.name }),
			undo: {
				label: phrase('action.undo'),
				onClick: () => update(vendor.id, { archived: !to }).then(done, e => sayFailure(toast, e, phrase('library.notChangedBack')))
			}
		})
	})
}

// the records a merge can go into: look-alikes first, then the most recently used (5a)
const mergeRequest = (kind, source) => (kind === 'vendor'
	? { except: source.id, near: source.id, sort: 'recent' }
	: { except: source.id, sort: 'orders-desc' })

/** Merge into… (5a, 5d): a popover hung from `anchor` (a sheet on a phone) that picks the target;
    picking is the action, so it has no buttons, and 5j's dialog compares next. */
export function MergePicker({ kind, source, anchor, position = 'end', onPick, onClose }) {
	const phrase = usePhrase()
	const touch = useShellShape() === 'touch'
	const panel = useRef(null)
	const sheet = useRef(null)
	const [find, setFind] = useState('')
	const vendor = kind === 'vendor'
	const noun = vendor ? 'vendors' : 'categories'
	usePanelPlace(anchor, panel, !touch)
	usePanelRest(panel, !touch)
	useFocusTrap(sheet, touch, 'input')
	useEffect(() => { if (!touch) panel.current?.querySelector('input')?.focus({ preventScroll: true }) }, [touch])
	const targets = usePickList(kind, find, mergeRequest(kind, source))
	const recent = useRecent(kind).filter(n => n !== source.name)
	const shown = targets.rows ?? []
	const back = () => anchor.current?.querySelector('[aria-expanded]')?.focus()
	const keys = ev => {
		if (ev.key === 'Escape') { ev.stopPropagation(); back(); onClose() }
		// down from the search goes into the list
		if (ev.key === 'ArrowDown' && ev.target.tagName === 'INPUT') {
			ev.preventDefault()
			panel.current?.querySelector('.sp-menu__item')?.focus()
		}
	}
	const markOf = o => (vendor ? <VendorMark name={o.name} colour={o.colour} size="small" /> : <CategoryMark category={o} size="small" />)
	const orders = source.orders ?? 0
	const moved = { orders: plural(orders, 'order'), count: orders, moving: orders ? 'yes' : 'no', name: source.name }
	const head = (
		<>
			<span className="sp-title sp-truncate">{phrase('library.merge.into', { name: source.name })}</span>
			<span className="sp-subtitle">{phrase(vendor ? 'library.merge.vendorHead' : 'library.merge.categoryHead', moved)}</span>
		</>
	)
	const search = <SearchInput value={find} onChange={setFind} placeholder={targets.total == null ? phrase('library.merge.search', { kind }) : phrase('library.merge.searchCount', { kind, count: amount(targets.total, 0) })} aria-label={phrase('library.merge.searchLabel', { kind })} />
	const list = (
		<Menu position="plain" aria-label={phrase('library.merge.target', { kind })}>
			{!targets.rows ? null : shown.length
				? pickGroups(groupPicks(shown, recent, find, phrase(vendor ? 'form.otherVendors' : 'library.otherCategories')), o => (
					<MenuItem key={o.id} onClick={() => { back(); onPick(o) }}>
						{markOf(o)}
						<span className="sp-truncate">{o.name}</span>
						<span className="sp-grow" />
						<span className="sp-meta sp-nowrap">{plural(o.orders ?? 0, 'order')}</span>
						<Icon name="chevron-right" size={13} />
					</MenuItem>
				), { head: name => <MenuLabel>{name}</MenuLabel>, rule: <MenuSeparator /> })
				: <ComboboxEmpty role="none">{targets.total ? phrase('library.merge.noMatch', { kind, find: find.trim() }) : phrase('library.merge.noOthers', { kind })}</ComboboxEmpty>}
			<MoreMatches role="none" rows={targets.rows} matched={targets.matched} noun={noun} />
		</Menu>
	)
	if (!touch) return (
		<Popover ref={panel} position={position} role="dialog" aria-label={phrase('library.merge.into', { name: source.name })} onKeyDown={keys} head={head} search={search}>
			{list}
		</Popover>
	)
	// on a phone the same parts fill a sheet from the bottom edge
	return createPortal(
		<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) { back(); onClose() } }}>
			<Sheet ref={sheet} role="dialog" aria-modal="true" aria-label={phrase('library.merge.into', { name: source.name })} tabIndex={-1} onKeyDown={keys}>
				<div className="sp-popover__head">{head}</div>
				{search}
				<div className="sp-popover__list" ref={panel}>{list}</div>
			</Sheet>
		</Scrim>,
		document.body
	)
}

/** A record page's Merge button (5c, 5f), with its MergePicker hung from it. `merge` is
    `{ open, onToggle, onClose, picker: box => <MergePicker anchor={box} /> }`. */
export function MergeButton({ merge, size = 'standard', disabled = false, children }) {
	const touch = useShellShape() === 'touch'
	const box = useRef(null)
	// a phone's picker is a sheet with its own way out
	useDismiss(box, merge.open && !touch, merge.onClose)
	return (
		<Anchor ref={box} open={merge.open && !touch}>
			<Button variant="outline" size={size} fullWidth aria-haspopup="dialog" aria-expanded={merge.open ? 'true' : 'false'} disabled={disabled}
				onClick={merge.onToggle}>{children}</Button>
			<Leaving>{merge.open ? merge.picker(box) : null}</Leaving>
		</Anchor>
	)
}

/** Merging a vendor or a category into another (5j): the result is shown before the button, which
    carries the count. `initial` is the target a picker already chose; the source is never offered. */
export function MergeDialog({ kind, source, initial = null, busy, onConfirm, onCancel }) {
	const phrase = usePhrase()
	const [picked, setPicked] = useState(initial)
	const [query, setQuery] = useState('')
	const vendor = kind === 'vendor'
	const options = usePickList(kind, query, vendor ? { except: source.id, archived: 'all' } : { except: source.id })
	const recent = useRecent(kind).filter(n => n !== source.name)
	const shown = options.rows ?? []
	const markOf = o => (vendor ? <VendorMark name={o.name} colour={o.colour} size="small" /> : <CategoryMark category={o} size="small" />)
	// counted as the merge writes them: one alias per spelling a receipt is matched by
	// an order carrying both is counted once: the orders in either one
	const after = useApi(getOrders, [{ categoryId: [source.id, picked?.id], pageSize: 0 }], { enabled: Boolean(picked) && !vendor }).data?.matched
	const aliasCount = picked
		? new Set([...(picked.aliases ?? []), source.name, ...(source.aliases ?? [])].map(vendorKey).filter(k => k && k !== vendorKey(picked.name))).size
		: 0
	return (
		<Dialog onCancel={onCancel}>
			<DialogTitle>{phrase('library.merge.title', { kind })}</DialogTitle>
			<Field id="merge-target"
				label={phrase(vendor ? 'library.merge.vendorLabel' : 'library.merge.categoryLabel', {
					name: source.name, orders: plural(source.orders, 'order'),
					b: words => <b className="sp-ink sp-break">{words}</b>, n: words => <b className="sp-ink">{words}</b>
				})}
				message={vendor ? phrase('library.merge.vendorHelp', { name: source.name }) : phrase('library.merge.categoryHelp')}>
				<Combobox searchable search={query} onSearch={setQuery} noun={vendor ? 'vendors' : 'categories'}
					placeholder={phrase(vendor ? 'form.chooseVendor' : 'library.chooseCategory')}
					value={picked ? picked.name : ''} lead={picked ? markOf(picked) : undefined}>
					{pickGroups(groupPicks(shown, recent, query, phrase(vendor ? 'form.otherVendors' : 'library.otherCategories')), o => (
						<ComboboxOption key={o.id} selected={o.id === picked?.id} mark={markOf(o)} meta={plural(o.orders, 'order')}
							onSelect={() => { setPicked(o); setQuery('') }}>{o.name}</ComboboxOption>
					))}
					<MoreMatches rows={options.rows} matched={options.matched} noun={vendor ? 'vendors' : 'categories'} />
				</Combobox>
			</Field>
			{picked && vendor
				? (
					<div className="sp-list">
						<table className="sp-table sp-table--compact sp-table--static">
							<thead><tr><th /><th>{phrase('library.merge.source')}</th><th>{phrase('library.merge.result')}</th></tr></thead>
							<tbody>
								<tr><td className="sp-ink-2">{phrase('field.name')}</td><td className="sp-ink-5"><span className="sp-truncate">{source.name}</span></td><td className="sp-strong"><span className="sp-truncate">{picked.name}</span></td></tr>
								<tr><td className="sp-ink-2">{phrase('library.aliases')}</td><td className="sp-ink-5">{source.aliases?.length ?? 0}</td><td className="sp-strong">{aliasCount}</td></tr>
								<tr><td className="sp-ink-2">{phrase('page.orders')}</td><td className="sp-ink-5">{source.orders}</td><td className="sp-strong">{source.orders + picked.orders}</td></tr>
							</tbody>
						</table>
					</div>
				)
				: null}
			{picked && !vendor
				? (
					<Well color="danger">
						<span className="sp-title">{phrase('library.merge.deletedOnce', { name: source.name })}</span>
						{after == null ? <Held shape={mergeResult(source, picked, source.orders + picked.orders)} /> : mergeResult(source, picked, after)}
					</Well>
				)
				: null}
			<DialogBody>{phrase('library.noUndo')}</DialogBody>
			<DialogActions>
				<Button variant="outline" onClick={onCancel}>{phrase('action.cancel')}</Button>
				<span className="sp-grow" />
				<Button {...(vendor ? {} : { color: 'danger' })} disabled={busy || !picked} onClick={() => onConfirm(picked)}>
					{phrase('library.merge.button', { orders: plural(source.orders, 'order') })}
				</Button>
			</DialogActions>
		</Dialog>
	)
}

const mergeResult = (source, target, orders) => (
	<span className="sp-subtitle">
		{phrase('library.merge.result.orders', { name: target.name, orders: plural(orders, 'order') })}
		{source.budget > 0
			? ' ' + phrase('library.merge.result.limit', { source: source.name, amount: currency(source.budget, 0), kept: target.budget > 0 ? 'yes' : 'no', target: target.name, targetAmount: currency(target.budget, 0), stop: fullStop() })
			: ''}
	</span>
)

/** What deleting a bookmark takes with it, and the way to keep it instead. */
export const bookmarkDeleteNote = bookmark => phrase('library.bookmarkDeleteNote', { photo: bookmark.photoId ? 'yes' : 'no' })

/** "Leave without saving?", asked before what is not saved is lost (9c). `body` says what that is. */
export function LeaveDialog({ body, onStay, onLeave }) {
	const phrase = usePhrase()
	return (
		<Dialog onCancel={onStay}>
			<DialogTitle>{phrase('library.leave.title')}</DialogTitle>
			<DialogBody>{body}</DialogBody>
			<DialogActions>
				<Button variant="outline" onClick={onStay}>{phrase('form.keepEditing')}</Button>
				<span className="sp-grow" />
				<Button color="danger" onClick={onLeave}>{phrase('library.leave.action')}</Button>
			</DialogActions>
		</Dialog>
	)
}

/** Holds the page while the form has changes: in-app navigation asks first, a reload gets the
    browser's question. `names` say where the changes are (9c), or `body` says it in full; `release`
    lets a save leave. `ask(go)` asks the same question before an action that leaves, and runs `go`
    only on Leave. */
export function useLeaveGuard(dirty, { within, search = false, names = [], uploading = 0, body } = {}) {
	const phrase = usePhrase()
	const released = useRef(false)
	const [asking, setAsking] = useState(null)
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
	const stay = () => (asking ? setAsking(null) : blocker.reset())
	const go = () => {
		if (!asking) return blocker.proceed()
		setAsking(null)
		asking()
	}
	const prompt = blocker.state === 'blocked' || asking
		? <LeaveDialog onStay={stay} onLeave={go}
			body={body ?? phrase('library.leave.body', { where: names.length ? 'named' : 'page', names: names.join(phrase('library.leave.andIn')), uploading })} />
		: null
	const ask = action => (live.current && !released.current ? setAsking(() => action) : action())
	return { prompt, ask, release: () => { released.current = true } }
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
	const phrase = usePhrase()
	const recent = useApi(getOrders, [{ ...filter, pageSize: 2 }])
	const orders = recent.data?.orders ?? []
	if (!total || !orders.length) return null
	return (
		<Card>
			<CardHeader name={phrase('library.recentOrders')} />
			{orders.map(order => <RecentOrder key={order.id} order={order} />)}
			<Button variant="outline" size="small" to={to}>{phrase('library.seeAll', { orders: plural(total, 'order') })}</Button>
		</Card>
	)
}

function RecentOrder({ order }) {
	return (
		<ListItem to={`/orders/${order.id}`}>
			<Stacked>
				<span className="sp-title sp-truncate">{vendorName(order)}</span>
				<span className="sp-meta">{shortDate(order.date)}{dot}{plural(order.itemCount, 'item')}</span>
			</Stacked>
			<span className="sp-stacked sp-cell-amount"><OrderAmount order={order} /></span>
		</ListItem>
	)
}

/** Categories typed as tokens and picked from the one set; a name it does not hold is offered as
    Create "…" and becomes a category when the form is saved (22c). */
export function CategoryTokens({ value, onChange, ...rest }) {
	const phrase = usePhrase()
	const [typing, setTyping] = useState('')
	const query = typing.trim()
	const offered = usePickList('category', query, {})
	// the category the typed name means, wherever it falls in the list
	const exact = useApi(getCategoryPage, [{ name: query, pageSize: 1, shape: 'brief' }], { enabled: Boolean(query) }).data?.categories[0]
	const known = [...(offered.rows ?? []), ...(exact ? [exact] : [])]
	const same = (a, b) => a.toLowerCase() === b.toLowerCase()
	// a typed name takes the spelling of the category it names, and names it once
	const change = next => {
		const out = []
		for (const typed of next) {
			const named = known.find(c => same(c.name, typed))?.name ?? (exact && same(typed, query) ? exact.name : typed)
			if (!out.some(n => same(n, named))) out.push(named)
		}
		onChange(out)
	}
	const matches = (offered.rows ?? []).filter(c => !value.some(n => same(n, c.name)))
	const groups = groupPicks(matches, useRecent('category').filter(n => !value.some(v => same(v, n))), query, phrase('library.otherCategories'), { byName: true })
	const exists = value.some(n => same(n, query)) || Boolean(exact)
	return (
		<Combobox multiple value={value} onChange={change} onSearch={setTyping} noun="categories" placeholder={phrase('library.tokens.placeholder')} aria-label={phrase('library.tokens.label')} {...rest}>
			{[
				...pickGroups(groups, c => <ComboboxOption key={c.id} onSelect={() => change([...value, c.name])}>{c.name}</ComboboxOption>),
				<MoreMatches key="more" rows={offered.rows} matched={offered.matched} noun="categories" />,
				query && !exists
					? <ComboboxOption key="create" create mark={<Icon name="plus" size={13} />} onSelect={() => change([...value, query])}>{phrase('form.createNamed', { name: query })}</ComboboxOption>
					: null
			]}
		</Combobox>
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
