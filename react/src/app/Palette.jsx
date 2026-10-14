import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { useStatusTypes } from './statuses.js'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router'
import { Palette as Surface, PaletteAll, PaletteGroup, PaletteRow, PaletteRule, Scrim } from '../components/Shell.jsx'
import { getCurrentUser, getOrder, getOrders, getOverLimitCategories, getStatsSlice, getVendor, getVendorPage, searchRecords, thisMonthSlice } from '../api/client.js'
import { forgetOlder, freshFetch, peek, useApi } from '../api/useApi.js'
import { amount, currency, dayShortMonth, dot, plural } from '../api/format.js'
import { MAC } from './useMedia.js'
import { setTheme, useTheme } from './theme.js'
import { forgetRecent, noteRecent, readRecent } from './recent.js'
import { useScanPicker } from './scanPicker.jsx'
import { vendorName } from './orderRow.jsx'

export { forgetRecent }

const WAIT_MS = 300
// rows a group of records shows before its "See all" (9d)
const SHOWN = 3

/* ---- Jump back in: the last five records opened, kept in this browser for each account ---- */

/** Notes each order and vendor the reader opens, newest first. The shell calls it once. */
export function useRecentRecords() {
	const { pathname } = useLocation()
	const user = useApi(getCurrentUser).data?.id
	useEffect(() => {
		if (!user) return
		const order = pathname.match(/^\/orders\/([^/]+)(?:\/edit)?$/)
		const vendor = pathname.match(/^\/vendors\/([^/]+)\/edit$/)
		const seen = order && order[1] !== 'new' ? { kind: 'order', id: order[1] }
			: vendor ? { kind: 'vendor', id: vendor[1] } : null
		if (seen) noteRecent(user, seen)
	}, [pathname, user])
}

// a phone keeps the name and one line of detail, without the amount (7b)
const orderRow = (o, touch) => ({
	key: 'recent-order-' + o.id, icon: 'receipt', name: vendorName(o), open: true, read: [getOrder, [o.id]],
	meta: [dayShortMonth(o.date), touch ? null : currency(o.total)].filter(Boolean).join(dot), to: `/orders/${o.id}`
})
const vendorRow = v => ({
	key: 'recent-vendor-' + v.id, icon: 'building-store', name: v.name, open: true, read: [getVendor, [v.id]],
	meta: 'vendor' + dot + plural(v.orders, 'order'), to: `/vendors/${v.id}/edit`
})

const rowsOf = (list, answers, touch) => list.flatMap((r, i) => (answers[i] == null ? []
	: [r.kind === 'order' ? orderRow(answers[i], touch) : vendorRow(answers[i])]))

// the vendors of Jump back in, by id, archived ones too
const recentVendors = list => {
	const ids = list.filter(r => r.kind === 'vendor').map(r => r.id)
	return { ids: ids.join(','), archived: 'all', pageSize: Math.max(1, ids.length) }
}

// what the cache already knows, painted while the server is asked; null when any is missing
function cachedRows(list, touch) {
	const vendors = peek(getVendorPage, [recentVendors(list)])?.vendors
	const answers = list.map(r => (r.kind === 'order' ? peek(getOrder, [r.id]) : vendors?.find(v => v.id === r.id)))
	return answers.every(Boolean) ? rowsOf(list, answers, touch) : null
}

/* Each record is asked for again, never taken from the cache, so one deleted elsewhere drops out
   without a trace (9d) and opening it never shows it as live. */
function useRecentRows(touch) {
	const user = useApi(getCurrentUser).data?.id
	const [rows, setRows] = useState(() => {
		const list = user ? readRecent(user) : []
		return list.length ? cachedRows(list, touch) : []
	})
	useEffect(() => {
		if (!user) return
		const list = readRecent(user)
		if (!list.length) return
		const controller = new AbortController()
		const vendors = list.some(r => r.kind === 'vendor')
			? freshFetch(getVendorPage, [recentVendors(list)], controller.signal).then(page => page.vendors) : Promise.resolve([])
		vendors.then(all => Promise.allSettled(list.map(r => (r.kind === 'order'
			? freshFetch(getOrder, [r.id], controller.signal)
			: Promise.resolve(all.find(v => v.id === r.id) ?? Promise.reject({ gone: true }))))))
			.then(answers => {
				if (controller.signal.aborted) return
				list.forEach((r, i) => { if (answers[i].reason?.gone) forgetRecent(r.kind, r.id) })
				setRows(rowsOf(list, answers.map(a => (a.status === 'fulfilled' ? a.value : null)), touch))
			}, () => { if (!controller.signal.aborted) setRows([]) })
		return () => controller.abort()
	}, [user, touch])
	return rows
}

/* ---- the search: debounced, the request before it cancelled, the last answer kept on screen ---- */

function shape(needle, list, hits, vendors, touch) {
	const stats = new Map(vendors.map(v => [v.id, v]))
	const lower = needle.toLowerCase()
	// one row per title in an order: two lines with the same name open the same record
	const seen = new Set()
	const items = hits.orders.flatMap(o => o.items
		.filter(i => i.title.toLowerCase().includes(lower))
		.filter(i => {
			const key = o.id + '\n' + i.title.toLowerCase()
			if (seen.has(key)) return false
			seen.add(key)
			return true
		})
		.map(i => ({
			key: 'item-' + i.id, thumb: true, plain: true, name: i.title, to: `/orders/${o.id}`,
			meta: 'in ' + [o.vendor?.name, dayShortMonth(o.date)].filter(Boolean).join(dot)
		})))
	return {
		needle,
		touch,
		orders: list.orders.map(o => ({
			key: 'order-' + o.id, icon: 'receipt', name: vendorName(o),
			meta: dayShortMonth(o.date), value: amount(o.total), to: `/orders/${o.id}`
		})),
		ordersCount: list.matched,
		vendors: hits.vendors.slice(0, SHOWN).map(v => {
			const s = stats.get(v.id)
			const facts = s ? [plural(s.orders, 'order'), touch ? null : currency(s.spend, 0)].filter(Boolean) : []
			// the alias leads: it is why a name without the typed text is here at all (9d)
			const matched = v.alias ? 'matched ' + v.alias : null
			return {
				key: 'vendor-' + v.id, icon: 'building-store', name: v.name, to: `/vendors/${v.id}/edit`,
				// a vendor that looks like another one says so in place of its figures (9b)
				meta: s?.duplicateOf
					? <>{matched ? matched + dot : null}<span className="sp-field__help" data-color="warning">possible duplicate</span></>
					: [matched, ...facts].filter(Boolean).join(dot)
			}
		}),
		vendorsCount: hits.counts.vendors,
		// under the limit every matching order is here, so its items are counted in the page
		itemsCount: hits.counts.items ?? items.length,
		items: items.slice(0, SHOWN),
		// what can be done for the one vendor the text names (9b, 4b)
		vendorActions: (hits.vendors.length === 1 ? hits.vendors : []).flatMap(v => [
			{
				key: 'vendor-new-' + v.id, icon: 'plus', plain: true, name: <>New order for <b>{v.name}</b></>,
				to: '/orders/new?vendor=' + encodeURIComponent(v.name)
			},
			{
				key: 'vendor-stats-' + v.id, icon: 'chart-bar', plain: true, name: <>See <b>{v.name}</b> in Statistics</>,
				to: '/statistics?crumbs=vendor:' + encodeURIComponent(v.id)
			}
		])
	}
}

function useSearch(needle, touch) {
	const [found, setFound] = useState(null)
	useEffect(() => {
		if (!needle) return
		const controller = new AbortController()
		const timer = setTimeout(() => {
			Promise.all([
				getOrders({ query: needle, pageSize: SHOWN }, controller.signal),
				searchRecords(needle, controller.signal)
			]).then(([list, hits]) => {
				// the figures of the vendors shown, and whether each looks like another
				const ids = hits.vendors.slice(0, SHOWN).map(v => v.id)
				return (ids.length ? getVendorPage({ ids: ids.join(','), archived: 'all', with: 'duplicates', pageSize: ids.length }, controller.signal)
					: Promise.resolve({ vendors: [] })).then(page => [list, hits, page.vendors])
			}).then(
				([list, hits, vendors]) => setFound(shape(needle, list, hits, vendors, touch)),
				error => { if (error.name !== 'AbortError') setFound({ needle, failed: true }) }
			)
		}, WAIT_MS)
		return () => { clearTimeout(timer); controller.abort() }
	}, [needle, touch])
	return found
}

/* ---- actions: only what the app does today, nothing destructive, nothing about the page behind ---- */

const GO = [
	['Home', 'home', '/'],
	['Orders', 'receipt', '/orders'],
	['Budget', 'wallet', '/budget'],
	['Vendors', 'building-store', '/vendors'],
	['Categories', 'category', '/categories'],
	['Bookmarks', 'heart', '/bookmarks'],
	['Statistics', 'chart-bar', '/statistics'],
	['Settings', 'settings', '/settings']
]

// `first` is what the empty palette offers, the rest are found by name; `action` fills the mark (9d)
const actionsFor = (theme, onShortcuts, overLimit, drafts, scan) => [
	scan
		? { key: 'scan', icon: 'camera', name: 'Scan a receipt', kbd: 'S', run: scan, first: true, action: true }
		: { key: 'scan', icon: 'camera', name: 'Scan a receipt', meta: 'Available once your email is confirmed', off: true, first: true, action: true },
	{ key: 'new', icon: 'plus', name: 'New order', kbd: 'N', to: '/orders/new', first: true, action: true },
	{ key: 'import', icon: 'upload', name: 'Import a file', to: '/settings/import' },
	...GO.map(([name, icon, to]) => ({ key: 'go-' + name, icon, name: 'Go to ' + name, to })),
	{ key: 'add-vendor', icon: 'building-store', name: 'Add a vendor', to: '/vendors/new' },
	{ key: 'add-category', icon: 'category', name: 'Add a category', to: '/categories/new' },
	theme === 'dark'
		? { key: 'theme', icon: 'sun', name: 'Switch to light mode', run: () => setTheme('light'), first: true }
		: { key: 'theme', icon: 'moon', name: 'Switch to dark mode', run: () => setTheme('dark'), first: true },
	// filters rather than pages, offered only while a category is over its limit or a draft exists (9d)
	...(overLimit ? [{ key: 'over-limit', icon: 'alert-triangle', name: 'Orders over limit this month', to: overLimit }] : []),
	...(drafts ? [{ key: 'drafts', icon: 'file-text', name: 'Drafts', to: '/orders?status=Draft' }] : []),
	...(onShortcuts ? [{ key: 'keys', icon: 'keyboard', name: 'Keyboard shortcuts', kbd: '?', run: onShortcuts }] : [])
].map(a => ({ ...a, plain: true }))

/* The month's orders in every category over its limit, as Home's notice opens them. */
function useOverLimit() {
	const month = useApi(getStatsSlice, [thisMonthSlice()]).data?.window
	const over = useApi(getOverLimitCategories).data
	if (!month || !over) return null
	return over.length ? `/orders?category=${over.map(c => c.id).join(',')}&from=${month.from}&to=${month.to}` : null
}

function useHasDrafts() {
	const key = useStatusTypes().keyOf('draft')
	return useApi(getOrders, [{ status: key, pageSize: 0 }], { enabled: !!key }).data?.matched > 0
}

const countLabel = (name, count) => (count == null ? name : name + dot + count)

function groupsFor(text, found, recent, actions) {
	const needle = text.trim()
	const lower = needle.toLowerCase()
	const defaults = actions.filter(a => a.first)
	if (!needle) {
		if (recent === null) return []
		return [
			...(recent.length ? [{ key: 'recent', label: 'Jump back in', entries: recent }] : []),
			{ key: 'actions', label: 'Actions', entries: defaults }
		]
	}

	const named = actions.filter(a => (' ' + a.name.toLowerCase()).includes(' ' + lower)).slice(0, SHOWN)
		.map(a => ({ ...a, match: needle }))
	const offered = [...(found?.vendorActions ?? []), ...named]
	const actionGroup = offered.length ? [{ key: 'actions', label: 'Actions', entries: offered }] : []
	// until the first answer arrives the list keeps what it held, so it never blanks (9d)
	if (!found) return named.length ? actionGroup : groupsFor('', null, recent, actions)

	const all = to => ({ key: 'all-' + to, all: true, to })
	// every group ends in something to act on, never a heading alone (c24)
	if (found.failed) return [
		{ key: 'failed', label: 'Could not search right now. Try again.', entries: [{ ...all(ordersTo(needle)), name: 'Search all orders' }] },
		...(named.length ? actionGroup : [{ key: 'actions', label: 'Actions', entries: defaults }])
	]

	const records = [
		found.orders.length && {
			key: 'orders', label: countLabel('Orders', found.ordersCount),
			entries: [...found.orders, ...(found.ordersCount > SHOWN
				? [{ ...all(ordersTo(found.needle)), name: `See all ${found.ordersCount} in Orders` }] : [])]
		},
		found.vendors.length && {
			key: 'vendors', label: countLabel('Vendors', found.vendorsCount),
			// the vendor list searches on a desktop only; a phone's has no search field
			entries: [...found.vendors, ...(found.vendorsCount > SHOWN && !found.touch
				? [{ ...all('/vendors?q=' + encodeURIComponent(found.needle)), name: `See all ${found.vendorsCount} in Vendors` }] : [])]
		},
		found.items.length && {
			key: 'items', label: countLabel('Items', found.itemsCount),
			// no page lists items on their own: the orders list finds the orders that hold them
			entries: [...found.items, ...(found.itemsCount > SHOWN
				? [{ ...all(ordersTo(found.needle)), key: 'all-items', name: `See the orders with these ${found.itemsCount} items` }] : [])]
		}
	].filter(Boolean).map(g => ({ ...g, entries: g.entries.map(e => ({ ...e, match: found.needle })) }))

	if (!records.length && !offered.length) return [
		{ key: 'none', label: `No matches for ${found.needle}`, entries: [{ ...all(ordersTo(found.needle)), name: 'Search all orders' }] }
	]
	// actions come first only when the text is the start of a command's name
	return named.some(a => a.name.toLowerCase().startsWith(lower)) ? [...actionGroup, ...records] : [...records, ...actionGroup]
}

const ordersTo = needle => '/orders?q=' + encodeURIComponent(needle)

function resultCount(found) {
	if (!found || found.failed) return null
	const sum = found.ordersCount + found.vendorsCount + found.itemsCount
	return sum ? plural(sum, 'result') : null
}

/** The command palette (9d, c24): over the page on a desktop, the whole screen on a phone (7b),
    where a result replaces the search's step in the history. `onClose` closes it without acting. */
export function Palette({ query = '', touch = false, onShortcuts, onClose }) {
	const navigate = useNavigate()
	const theme = useTheme()
	const [text, setText] = useState(query)
	const input = useRef(null)
	// what had focus, given back when the palette is cancelled
	const back = useRef(document.activeElement)
	// a recent record opens on an answer from after this, never on one the cache kept from before
	const [opened] = useState(() => Date.now())
	const ids = useId()

	const needle = text.trim()
	const found = useSearch(needle, touch)
	const recent = useRecentRows(touch)
	const overLimit = useOverLimit()
	const drafts = useHasDrafts()
	const scan = useScanPicker()
	const held = useApi(getCurrentUser).data?.emailConfirmed === false
	const groups = groupsFor(text, found, recent, actionsFor(theme, touch ? null : onShortcuts, overLimit, drafts, held ? null : scan.open))
	const flat = groups.flatMap(g => g.entries)

	// the current row goes back to the first whenever the rows change
	const listKey = flat.map(e => e.key).join('|')
	const [cursor, setCursor] = useState({ key: listKey, index: 0 })
	const index = cursor.key === listKey ? Math.min(cursor.index, flat.length - 1) : 0
	const move = i => setCursor({ key: listKey, index: i })
	const idOf = i => `${ids}-${i}`

	useEffect(() => {
		const el = input.current
		el?.focus()
		el?.setSelectionRange(el.value.length, el.value.length)
	}, [])
	useEffect(() => {
		if (index >= 0) document.getElementById(idOf(index))?.scrollIntoView({ block: 'nearest' })
	}, [index, listKey])

	// the reader stays on this page: focus goes back to where it was
	const cancel = () => {
		onClose()
		if (!touch) back.current?.focus?.()
	}
	const run = (entry, newTab) => {
		if (entry.off) return
		if (entry.run) { entry.run(); cancel(); return }
		if (entry.read) forgetOlder(...entry.read, opened)
		if (newTab) {
			window.open(window.location.origin + window.location.pathname + '#' + entry.to, '_blank', 'noopener')
			return
		}
		if (touch) { navigate(entry.to, { replace: true }); return }
		onClose()
		navigate(entry.to)
	}

	const keys = ev => {
		if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
			ev.preventDefault()
			if (flat.length) move((index + (ev.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length)
		} else if (ev.key === 'Enter' && ev.target === input.current) {
			// Enter on the field opens the current row; on Cancel or Clear it presses that button
			ev.preventDefault()
			if (flat[index]) run(flat[index], ev.metaKey || ev.ctrlKey)
		} else if (ev.key === 'Escape' || (ev.key.toLowerCase() === 'k' && (ev.metaKey || ev.ctrlKey))) {
			ev.preventDefault()
			ev.stopPropagation()
			cancel()
		} else if (ev.key === 'Tab') {
			// focus stays in the palette: the field, and on a phone its clear control
			const stops = [...ev.currentTarget.querySelectorAll('input, button:not([tabindex="-1"])')]
			const at = stops.indexOf(document.activeElement)
			ev.preventDefault()
			stops[(at + (ev.shiftKey ? -1 : 1) + stops.length) % stops.length]?.focus()
		}
	}

	let i = -1
	const body = groups.map((g, gi) => (
		<Fragment key={g.key}>
			{gi > 0 ? <PaletteRule /> : null}
			<PaletteGroup>{g.label}</PaletteGroup>
			{g.entries.map(e => {
				const at = ++i
				const events = {
					id: idOf(at),
					selected: at === index,
					onMouseMove: () => { if (at !== index) move(at) },
					onClick: ev => run(e, ev.metaKey || ev.ctrlKey)
				}
				if (e.all) return <PaletteAll key={e.key} {...events}>{e.name}</PaletteAll>
				return (
					<PaletteRow key={e.key} icon={e.icon} thumb={e.thumb} plain={e.plain} action={e.action} match={e.match} meta={e.meta}
						value={e.value} note={e.open && at === index ? 'Open' : undefined} kbd={e.kbd} disabled={e.off} aria-disabled={e.off ? 'true' : undefined} {...events}>
						{e.name}
					</PaletteRow>
				)
			})}
		</Fragment>
	))

	// the clear control goes away with the text it cleared, so the field takes focus back
	const type = next => {
		setText(next)
		if (!next) requestAnimationFrame(() => input.current?.focus())
	}

	const surface = (
		<Surface
			screen={touch}
			value={text}
			onChange={type}
			onCancel={touch ? cancel : undefined}
			count={needle ? resultCount(found) : null}
			activeId={flat.length ? idOf(index) : undefined}
			inputRef={input}
			placeholder={touch ? 'Search' : 'Search orders, vendors, items - or type a command'}
			label="Search or run a command"
			foot={['↑↓ move', '↵ open', `${MAC ? '⌘↵' : 'Ctrl ↵'} new tab`, 'esc close']}
			aria-label="Search everything"
			onKeyDown={keys}
		>
			{body}
		</Surface>
	)
	if (touch) return surface
	return createPortal(
		<Scrim dialog onMouseDown={ev => { if (ev.target === ev.currentTarget) cancel() }}>{surface}</Scrim>,
		document.body
	)
}
