import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router'
import { Palette as Surface, PaletteAll, PaletteGroup, PaletteRow, PaletteRule, Scrim } from '../components/Shell.jsx'
import { getCurrentUser, getOrder, getOrders, getVendors, searchRecords, SEARCH_CAP } from '../api/client.js'
import { cachedFetch, useApi } from '../api/useApi.js'
import { amount, currency, dayShortMonth, dot, plural } from '../api/format.js'
import { MAC } from './useMedia.js'
import { setTheme, useTheme } from './theme.js'
import { forgetRecent, noteRecent, readRecent } from './recent.js'

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

const orderRow = o => ({
	key: 'recent-order-' + o.id, icon: 'file', name: o.vendor?.name ?? 'No vendor', open: true,
	meta: [o.reference, dayShortMonth(o.date), currency(o.total)].filter(Boolean).join(dot), to: `/orders/${o.id}`
})
const vendorRow = v => ({
	key: 'recent-vendor-' + v.id, icon: 'shopping-bag', name: v.name, open: true,
	meta: 'vendor' + dot + plural(v.orders, 'order'), to: `/vendors/${v.id}/edit`
})

/* A deleted record drops out without a trace (9d); a vendor is looked up in the list, so a gone
   one costs no request. Null until read, so the actions do not jump down when it arrives. */
function useRecentRows() {
	const user = useApi(getCurrentUser).data?.id
	const [rows, setRows] = useState(() => (user && readRecent(user).length ? null : []))
	useEffect(() => {
		if (!user) return
		const list = readRecent(user)
		if (!list.length) return
		let live = true
		const vendors = list.some(r => r.kind === 'vendor') ? cachedFetch(getVendors) : Promise.resolve([])
		vendors.then(all => Promise.allSettled(list.map(r => r.kind === 'order'
			? cachedFetch(getOrder, [r.id])
			: Promise.resolve(all.find(v => v.id === r.id) ?? Promise.reject({ status: 404 })))))
			.then(answers => {
				if (!live) return
				list.forEach((r, i) => { if (answers[i].reason?.status === 404) forgetRecent(r.kind, r.id) })
				setRows(list.flatMap((r, i) => answers[i].status !== 'fulfilled' ? []
					: [r.kind === 'order' ? orderRow(answers[i].value) : vendorRow(answers[i].value)]))
			}, () => { if (live) setRows([]) })
		return () => { live = false }
	}, [user])
	return rows
}

/* ---- the search: debounced, the request before it cancelled, the last answer kept on screen ---- */

function shape(needle, list, hits, vendors) {
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
			meta: 'in ' + (o.reference || [o.vendor?.name, dayShortMonth(o.date)].filter(Boolean).join(dot))
		})))
	return {
		needle,
		orders: list.orders.map(o => ({
			key: 'order-' + o.id, icon: 'file', name: o.vendor?.name ?? 'No vendor',
			meta: [o.reference, dayShortMonth(o.date)].filter(Boolean).join(dot), value: amount(o.total), to: `/orders/${o.id}`
		})),
		ordersCount: list.matched,
		vendors: hits.vendors.slice(0, SHOWN).map(v => {
			const s = stats.get(v.id)
			const facts = s ? [plural(s.orders, 'order'), currency(s.spend, 0)] : []
			return {
				key: 'vendor-' + v.id, icon: 'shopping-bag', name: v.name, to: `/vendors/${v.id}/edit`,
				// the alias leads: it is why a name without the typed text is here at all (9d)
				meta: [v.alias ? 'matched ' + v.alias : null, ...facts].filter(Boolean).join(dot)
			}
		}),
		vendorsFound: hits.vendors.length,
		vendorsCount: hits.vendors.length < SEARCH_CAP ? hits.vendors.length : null,
		items: items.slice(0, SHOWN),
		itemsFound: items.length,
		itemsCount: hits.orders.length < SEARCH_CAP ? items.length : null
	}
}

function useSearch(needle) {
	const [found, setFound] = useState(null)
	useEffect(() => {
		if (!needle) return
		const controller = new AbortController()
		const timer = setTimeout(() => {
			Promise.all([
				getOrders({ query: needle, pageSize: SHOWN }, controller.signal),
				searchRecords(needle, controller.signal),
				cachedFetch(getVendors)
			]).then(
				([list, hits, vendors]) => setFound(shape(needle, list, hits, vendors)),
				error => { if (error.name !== 'AbortError') setFound({ needle, failed: true }) }
			)
		}, WAIT_MS)
		return () => { clearTimeout(timer); controller.abort() }
	}, [needle])
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

// `first` is what the empty palette offers; the rest are found by name
const actionsFor = theme => [
	{ key: 'scan', icon: 'camera', name: 'Scan a receipt', to: '/orders/new?source=scan', first: true },
	{ key: 'new', icon: 'plus', name: 'New order', to: '/orders/new', first: true },
	{ key: 'import', icon: 'upload', name: 'Import a file', to: '/settings/import' },
	...GO.map(([name, icon, to]) => ({ key: 'go-' + name, icon, name: 'Go to ' + name, to })),
	{ key: 'add-vendor', icon: 'building-store', name: 'Add a vendor', to: '/vendors/new' },
	{ key: 'add-category', icon: 'category', name: 'Add a category', to: '/categories/new' },
	theme === 'dark'
		? { key: 'theme', icon: 'sun', name: 'Switch to light mode', run: () => setTheme('light'), first: true }
		: { key: 'theme', icon: 'moon', name: 'Switch to dark mode', run: () => setTheme('dark'), first: true }
].map(a => ({ ...a, plain: true, action: true }))

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
	const actionGroup = named.length ? [{ key: 'actions', label: 'Actions', entries: named }] : []
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
		found.vendors.length && { key: 'vendors', label: countLabel('Vendors', found.vendorsCount), entries: found.vendors },
		found.items.length && { key: 'items', label: countLabel('Items', found.itemsCount), entries: found.items }
	].filter(Boolean).map(g => ({ ...g, entries: g.entries.map(e => ({ ...e, match: found.needle })) }))

	if (!records.length && !named.length) return [
		{ key: 'none', label: `No matches for ${found.needle}`, entries: [{ ...all(ordersTo(found.needle)), name: 'Search all orders' }] },
		{ key: 'actions', label: 'Actions', entries: defaults }
	]
	// actions come first only when the text is the start of a command's name
	return named.some(a => a.name.toLowerCase().startsWith(lower)) ? [...actionGroup, ...records] : [...records, ...actionGroup]
}

const ordersTo = needle => '/orders?q=' + encodeURIComponent(needle)

function resultCount(found) {
	if (!found || found.failed) return null
	const sum = found.ordersCount + found.vendorsFound + found.itemsFound
	if (!sum) return null
	const exact = found.vendorsCount != null && found.itemsCount != null
	return exact ? plural(sum, 'result') : `${sum} or more results`
}

/** The command palette (9d, c24): over the page on a desktop, the whole screen on a phone (7b),
    where a result replaces the search's step in the history. `onClose` closes it without acting. */
export function Palette({ query = '', touch = false, onClose }) {
	const navigate = useNavigate()
	const theme = useTheme()
	const [text, setText] = useState(query)
	const input = useRef(null)
	// what had focus, given back when the palette is cancelled
	const back = useRef(document.activeElement)
	const ids = useId()

	const needle = text.trim()
	const found = useSearch(needle)
	const recent = useRecentRows()
	const groups = groupsFor(text, found, recent, actionsFor(theme))
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
		if (entry.run) { entry.run(); cancel(); return }
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
		} else if (ev.key === 'Enter') {
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
						value={e.open && at === index ? 'Open' : e.value} {...events}>
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
