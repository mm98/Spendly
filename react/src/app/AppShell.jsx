import { Suspense, useCallback, useMemo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EmailLine } from '../components/EmailLine.jsx'
import { Outlet, useLocation, useMatches, useNavigate } from 'react-router'
import { Shell, Sidebar, SidebarBrand, SidebarGroup, SidebarDivider, SidebarAccount, SidebarGrip, NavItem, TopBar, ShellContent } from '../components/Shell.jsx'
import { TabBar, TabBarItem, Fab } from '../components/Touch.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Mark } from '../components/Mark.jsx'
import { Kbd } from '../components/Utilities.jsx'
import { useScanPicker } from './scanPicker.jsx'
import { ScreenBarSlot } from './screenBar.jsx'
import { Menu, MenuItem, Toaster } from '../components/Overlays.jsx'
import { getAsk, getBudgetDue, getCounts, getCurrentUser, getSettings, onSessionEnded, saveSettings } from '../api/client.js'
import { invalidate, peek, useApi } from '../api/useApi.js'
import { ConfirmBanner } from './ConfirmBanner.jsx'
import { SessionDialog, SignedOutBanner } from './SessionDialog.jsx'
import { SavedLater } from './SavedLater.jsx'
import { countBadge } from '../api/format.js'
import { MAC, useMedia, useShellShape } from './useMedia.js'
import { Palette, useRecentRecords } from './Palette.jsx'
import { ALL_ORDERS, SidebarViews } from './views.jsx'
import { rememberList, rememberedList, useScrollMemory } from './listMemory.js'
import { ShortcutSheet, useShortcutKeys } from './Shortcuts.jsx'
import { pasteAnywhere } from '../components/FileDrop.jsx'
import { useUpdateNotice } from './UpdateNotice.jsx'


/* The route's handle names the page for the browser tab, the sidebar row it belongs to, the
   body layout its columns sit in, and whether the one floating action shows on a phone. */
const handleOf = matches => Object.assign({}, ...matches.map(m => m.handle ?? {}))

const TABS = [
	{ to: '/', key: 'home', icon: 'home', label: 'Home' },
	{ to: '/orders', key: 'orders', icon: 'receipt', label: 'Orders' },
	{ to: '/statistics', key: 'statistics', icon: 'chart-bar', label: 'Statistics' },
	{ to: '/more', key: 'more', icon: 'user', label: 'More' }
]
// below 640 the rest of the sidebar lives under More (9h)
const UNDER_MORE = ['budget', 'vendors', 'categories', 'bookmarks', 'ask', 'settings', 'more']

export function AppShell() {
	const [screenSlot, setScreenSlot] = useState(null)
	// null, or the screen in the top bar: a 'task' hides the tab bar, a 'place' keeps it
	const [screenOn, setScreenOn] = useState(null)
	const screenBar = useMemo(() => ({ slot: screenSlot, setOn: setScreenOn }), [screenSlot])
	const shape = useShellShape()
	const touch = shape === 'touch'
	// below 560 the bottom zone gives Settings and the theme to the account menu (9g)
	const short = useMedia('(max-height: 559.98px)')
	const handle = handleOf(useMatches())
	const { navKey, layout = 'default', fab = false, title, remember = false } = handle
	const navigate = useNavigate()
	const { pathname, search: params, key: visit, state } = useLocation()

	const fold = useFold(shape, visit)

	useEffect(() => { document.title = title ? `${title} - Spendly` : 'Spendly' }, [title])

	useRecentRecords()

	useScrollMemory()

	const update = useUpdateNotice()

	// a section's destination returns to its list as it was left; from that very list, it starts
	// it over (c11)
	if (remember && navKey) rememberList(navKey, pathname + params)
	const go = (key, to) => {
		const back = rememberedList(key)
		return !back || back === pathname + params ? to : back
	}
	// G then a letter lands in the section's own search, once that page is drawn (9d)
	const searchOn = key => {
		const until = Date.now() + 2000
		const look = () => {
			const field = document.querySelector(`[data-page-search="${key}"]`)
			if (field?.getClientRects().length) return field.focus()
			if (Date.now() < until) setTimeout(look, 50)
		}
		setTimeout(look, 0)
	}

	/* On a desktop the palette floats over the page. On a phone it takes the screen and is a
	   step in the history, so Back closes it and the page comes back where it stood (7b). */
	const listQuery = pathname === '/orders' ? new URLSearchParams(params).get('q') ?? '' : ''
	const [floating, setFloating] = useState(null)
	const screen = state?.palette ?? null
	const palette = touch ? screen : floating
	const stood = useRef(null)
	const openPalette = useCallback(query => {
		const start = { query: query ?? listQuery }
		if (!touch) { setFloating(start); return }
		if (screen) return
		stood.current = { visit, scroll: window.scrollY, focus: document.activeElement }
		navigate({ pathname, search: params }, { state: { palette: start } })
	}, [touch, screen, listQuery, visit, pathname, params, navigate])
	const closePalette = useCallback(() => (touch ? navigate(-1) : setFloating(null)), [touch, navigate])
	// any navigation ends the floating one, the browser's Back included
	useEffect(() => setFloating(null), [visit])
	useLayoutEffect(() => {
		if (screen || !stood.current) return
		const back = stood.current
		stood.current = null
		if (back.visit !== visit) return
		back.focus?.focus?.({ preventScroll: true })
		window.scrollTo(0, back.scroll)
	}, [screen, visit])
	useEffect(() => {
		const key = ev => {
			if (ev.key.toLowerCase() !== 'k' || !(ev.metaKey || ev.ctrlKey)) return
			ev.preventDefault()
			if (palette) closePalette()
			else openPalette()
		}
		document.addEventListener('keydown', key)
		return () => document.removeEventListener('keydown', key)
	}, [palette, openPalette, closePalette])

	// a session that ends mid-use asks over the page rather than throwing the reader out (20e)
	const [ended, setEnded] = useState(false)
	const [later, setLater] = useState(false)
	useEffect(() => onSessionEnded(() => setEnded(true)), [])

	// below 1280 the facet rail leaves and the list takes the column (18b); the pages that keep Ask's chat
	// bar fill the column like Ask, and on a phone are plain pages (24e, 24f, 7a)
	let body = layout
	if (layout === 'rail' && shape !== 'wide') body = 'default'
	else if (layout === 'dock') body = touch ? 'default' : 'fill'
	const content = (
		<ShellContent layout={body}>
			{later && !ended ? <SignedOutBanner onSignIn={() => setEnded(true)} /> : <ConfirmBanner />}
			<Suspense fallback={null}><Outlet /></Suspense>
		</ShellContent>
	)
	// a click or the first letter opens the palette; focus alone does not, since the palette
	// hands focus back to this field when it closes
	const search = (
		<SearchInput
			value=""
			onChange={text => openPalette(text)}
			onClick={() => openPalette()}
			placeholder={touch ? 'Search' : 'Search orders, vendors, items…'}
			aria-label="Search orders"
			kbd={touch ? undefined : MAC ? '⌘K' : 'Ctrl K'}
		/>
	)
	const [keysShown, setKeysShown] = useState(false)
	const showKeys = useCallback(() => setKeysShown(true), [])
	const overlay = palette
		? <Palette query={palette.query} touch={touch} onShortcuts={showKeys} onClose={closePalette} />
		: null
	const scan = useScanPicker()
	const held = useApi(getCurrentUser).data?.emailConfirmed === false
	const asks = !!useApi(getAsk).data?.ready
	useShortcutKeys({
		enabled: !touch && !palette && !keysShown, asks, onSheet: showKeys, onGo: (key, to) => { navigate(go(key, to)); searchOn(key) },
		onScan: held ? null : scan.open, onNew: () => navigate('/orders/new')
	})
	const keySheet = keysShown ? <ShortcutSheet asks={asks} onClose={() => setKeysShown(false)} /> : null
	// a picture pasted anywhere goes to the place on screen that takes one (17a)
	useEffect(() => {
		window.addEventListener('paste', pasteAnywhere)
		return () => window.removeEventListener('paste', pasteAnywhere)
	}, [])

	const account = useApi(getCurrentUser).data
	const signedOut = ended
		? (
			<SessionDialog email={account?.email ?? null}
				onSignedIn={() => { setEnded(false); setLater(false) }}
				onLater={() => { setEnded(false); setLater(true) }}
				onSignInPage={() => { setEnded(false); navigate(`/signin?next=${encodeURIComponent(pathname + params)}`) }} />
		)
		: null

	const tab = UNDER_MORE.includes(navKey) ? 'more' : navKey
	/* One tree for every shape, so crossing a breakpoint keeps the page mounted with whatever
	   the reader had not saved. */
	return (
		<ScreenBarSlot.Provider value={screenBar}>
		<Toaster notice={update}>
			<Shell touch={touch} viewport={!touch} collapsed={fold.collapsed} cover={touch ? overlay : undefined}>
				{touch ? null : sidebar({ navKey, fold, short, go, asks, showKeys, making: pathname === '/orders/new' })}
				<TopBar touch={touch}>
					{touch && screenOn ? null : search}
					{touch ? <div className="sp-topbar__screen" ref={setScreenSlot} /> : null}
				</TopBar>
				{content}
				{touch && fab ? <Fab to="/orders/new" aria-label="New order" /> : null}
				{touch && screenOn !== 'task'
					? (
						<TabBar aria-label="Sections">
							{TABS.map(t => (
								<TabBarItem key={t.key} icon={t.icon} current={t.key === tab} to={go(t.key, t.to)}>{t.label}</TabBarItem>
							))}
						</TabBar>
					)
					: null}
			</Shell>
			{touch ? null : overlay}
			{keySheet}
			{signedOut}
			<SavedLater />
		</Toaster>
		</ScreenBarSlot.Provider>
	)
}

// the saved view the list was opened from (9e); All orders never returns to one
const onView = () => { const id = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('saved'); return id && id !== 'all' ? id : null }

/* An element rather than a component: the shell places its children by type (9b, 9h). The brand
   and the bottom zone stay put; only the destinations between them scroll (9g). */
function sidebar({ navKey, fold, short, go, asks, showKeys, making }) {
	const { rail } = fold
	const brand = <Mark size="small" fill="solid" aria-hidden="true" aria-label="Spendly"><span>S</span></Mark>
	return (
		<Sidebar aria-label="Sections" ref={fold.box} variant={fold.over ? 'peek' : 'default'} motion={fold.motion}>
			{rail
				? <>{brand}<SidebarDivider /></>
				: <SidebarBrand>{brand}<span>Spendly</span></SidebarBrand>}
			<NavScroll navKey={navKey}>
				<Row to="/" icon="home" rail={rail} current={navKey === 'home'}>Home</Row>
				<ScanReceipt rail={rail} />
				<NewOrder rail={rail} current={making} />
				{rail ? <SidebarDivider /> : <SidebarGroup>Orders</SidebarGroup>}
				<Counted to={ALL_ORDERS} icon="receipt" rail={rail} current={navKey === 'orders' && !making && !onView()} useCount={useOrdersCount}>All orders</Counted>
				<SidebarViews rail={rail} savedId={navKey === 'orders' ? onView() : null} />
				{rail ? null : <SidebarGroup>Library</SidebarGroup>}
				<Counted to={go('vendors', '/vendors')} icon="building-store" rail={rail} current={navKey === 'vendors'} useCount={useVendorsCount}>Vendors</Counted>
				<Counted to={go('categories', '/categories')} icon="category" rail={rail} current={navKey === 'categories'} useCount={useCategoriesCount}>Categories</Counted>
				<Counted to={go('bookmarks', '/bookmarks')} icon="heart" rail={rail} current={navKey === 'bookmarks'} useCount={useBookmarksCount}>Bookmarks</Counted>
				<Counted to={go('budget', '/budget')} icon="wallet" rail={rail} current={navKey === 'budget'} useCount={useBudgetDueCount}>Budget</Counted>
				<Row to={go('statistics', '/statistics')} icon="chart-bar" rail={rail} current={navKey === 'statistics'}>Statistics</Row>
			</NavScroll>
			{/* only while the server has Ask set up (24a); on a short window it moves to the account menu with Settings (9g) */}
			<SidebarDivider />
			{short || !asks ? null : <Row to="/ask" icon="message-circle" rail={rail} current={navKey === 'ask'}>Ask</Row>}
			{short ? null : <Row to="/settings" icon="settings" rail={rail} current={navKey === 'settings'}>Settings</Row>}
			<Account rail={rail} short={short} asks={asks} onShortcuts={showKeys} />
			<SidebarGrip expanded={!rail} onClick={fold.toggle} />
		</Sidebar>
	)
}

const SLIDE_IN_MS = 180
const SLIDE_OUT_MS = 140
const readFold = () => peek(getSettings)?.sidebar === 'rail'

/* The grip (9i): on a wide window it folds the sidebar, kept with the account's settings. Below
   1280 it opens the full sidebar over the page until it is closed or a page is opened. */
function useFold(shape, visit) {
	const [folded, setFolded] = useState(readFold)
	const [over, setOver] = useState(false)
	const [motion, setMotion] = useState(null)
	const box = useRef(null)
	const timer = useRef(0)
	const still = useMedia('(prefers-reduced-motion: reduce)')
	const wide = shape === 'wide'
	const later = (fn, ms) => { clearTimeout(timer.current); timer.current = setTimeout(fn, still ? 0 : ms) }
	useEffect(() => () => clearTimeout(timer.current), [])

	const keep = value => {
		setFolded(value)
		// a save that fails keeps the choice in this window only
		saveSettings({ sidebar: value ? 'rail' : 'open' }).then(() => invalidate(getSettings), () => {})
	}
	const open = () => {
		if (wide) keep(false)
		else setOver(true)
		setMotion('in')
		later(() => setMotion(null), SLIDE_IN_MS)
	}
	const close = () => {
		setMotion('out')
		later(() => {
			if (wide) keep(true)
			else setOver(false)
			setMotion(null)
		}, SLIDE_OUT_MS)
	}
	const closeNow = useRef(close)
	closeNow.current = close

	// opening a page, or the window reaching the wide shape, ends the sidebar laid over the page
	useEffect(() => { setOver(false); setMotion(null) }, [visit, wide])
	useEffect(() => {
		if (!over) return
		const away = ev => { if (!box.current?.contains(ev.target) && !ev.target.closest?.('.sp-sidebar__menu')) closeNow.current() }
		const key = ev => { if (ev.key === 'Escape' && !ev.defaultPrevented) closeNow.current() }
		document.addEventListener('pointerdown', away)
		document.addEventListener('keydown', key)
		return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key) }
	}, [over])

	const collapsed = wide ? folded : true
	// while it closes, the labels leave from the full width before the rail takes it back
	const rail = collapsed && !over
	return { box, collapsed, rail, over, motion, toggle: () => (rail ? open() : close()) }
}

/* The one scrolling part of the sidebar. The fade at its foot shows only while there is more
   below, and the current row is brought into view on arrival, at the nearest edge (9g). */
function NavScroll({ navKey, children }) {
	const box = useRef(null)
	const [more, setMore] = useState(false)
	const current = useRef(null)
	current.current = () => {
		const el = box.current
		const row = el.querySelector('[aria-current="page"]')
		if (!row) return
		const r = row.getBoundingClientRect()
		const top = r.top - el.getBoundingClientRect().top + el.scrollTop
		if (top < el.scrollTop) el.scrollTop = top
		else if (top + r.height > el.scrollTop + el.clientHeight) el.scrollTop = top + r.height - el.clientHeight
	}
	useLayoutEffect(() => {
		const el = box.current
		const check = () => setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 1)
		// the region settles as the account block arrives and the window changes height
		const resized = () => { current.current(); check() }
		el.addEventListener('scroll', check, { passive: true })
		const watch = new ResizeObserver(resized)
		watch.observe(el)
		return () => { el.removeEventListener('scroll', check); watch.disconnect() }
	}, [])
	useLayoutEffect(() => current.current(), [navKey])
	return <div ref={box} className={more ? 'ns-scroll ns-scroll--faded sp-scrolls' : 'ns-scroll sp-scrolls'}>{children}</div>
}

/* Scan receipt opens the file picker at once (16a). Before the email is confirmed the row only reports,
   and says why on hover and on focus. */
function ScanReceipt({ rail }) {
	const scan = useScanPicker()
	const held = useApi(getCurrentUser).data?.emailConfirmed === false
	if (held)
		return (
			<NavItem icon="camera" tip="Available once your email is confirmed" tabIndex={0} aria-disabled="true"
				aria-label="Scan receipt, available once your email is confirmed">Scan receipt</NavItem>
		)
	return <Row icon="camera" variant="action" rail={rail} onClick={scan.open}>Scan receipt</Row>
}

/* New order is a plain row to step 1 of 3a, where scan, empty and copy are chosen, as the phone's button. It is
   current while a new order is made, until it is saved (9a). */
function NewOrder({ rail, current }) {
	return <NavItem icon="plus" current={current} to="/orders/new" tip={rail ? 'New order' : undefined} aria-label="New order">New order</NavItem>
}

/* A count is read with its destination; on the rail the label is the tile's only name. */
function Row({ rail, count, children, ...rest }) {
	const shown = count == null ? count : countBadge(count)
	return <NavItem tip={rail ? children : undefined} aria-label={shown != null ? `${children}, ${shown}` : children} count={shown} {...rest}>{children}</NavItem>
}

/* A count the sidebar has not received yet renders as nothing, never as a zero (9e). */
function Counted({ useCount, ...rest }) {
	return <Row count={useCount()} {...rest} />
}
// the four counts are one request, shared by every row that shows one
const useOrdersCount = () => useApi(getCounts).data?.orders
const useVendorsCount = () => useApi(getCounts).data?.vendors
const useCategoriesCount = () => useApi(getCounts).data?.categories
const useBookmarksCount = () => useApi(getCounts).data?.bookmarks
// payments due this month, paid or not; none due shows no count, not a zero (9a)
const useBudgetDueCount = () => {
	const now = new Date()
	return useApi(getBudgetDue, [now.getFullYear(), now.getMonth() + 1]).data || null
}

/** The account menu (9c). Sign out leaves first, so the page's own leave check asks; the session
    ends on the sign-in page, once the reader has been let go. */
export function AccountMenu({ name, email, position, short = false, asks = false, onShortcuts, onClose }) {
	const navigate = useNavigate()
	return (
		<Menu position={position} aria-label="Account">
			<li className="ns-menu-head" role="presentation">
				{name ? <span className="sp-data sp-truncate">{name}</span> : null}
				<EmailLine email={email} tone="meta" />
			</li>
			<MenuItem icon="user" onClick={() => { onClose(); navigate('/settings/account') }}>Account and profile</MenuItem>
			{onShortcuts
				? <MenuItem icon="keyboard" onClick={() => { onClose(); onShortcuts() }}>
					<span className="sp-truncate">Shortcuts</span><span className="sp-grow" /><Kbd>?</Kbd>
				</MenuItem>
				: null}
			{/* on a short window the sidebar's bottom zone lives here, in its sidebar order (9c, 9g) */}
			{short && asks ? <MenuItem icon="message-circle" onClick={() => { onClose(); navigate('/ask') }}>Ask</MenuItem> : null}
			{short ? <MenuItem icon="settings" onClick={() => { onClose(); navigate('/settings') }}>Settings</MenuItem> : null}
			<MenuItem icon="power" onClick={() => { onClose(); navigate('/signin', { state: { signOut: true } }) }}>Sign out</MenuItem>
		</Menu>
	)
}

function Account({ rail, short, asks, onShortcuts }) {
	const user = useApi(getCurrentUser)
	const [open, setOpen] = useState(false)
	const close = useCallback(() => setOpen(false), [])
	const email = user.data?.email
	// an account without a name or picture shows its email and initials, as before either existed
	const name = user.data?.name || null
	const picture = user.data?.picture || null
	if (!email) return null
	return (
		<SidebarAccount name={name} picture={picture} email={email} expanded={open} tip={rail ? name || email : undefined} aria-label={name ? `${name}, ${email}` : email}
			onClick={() => setOpen(!open)} onDismiss={close} menu={<AccountMenu name={name} email={email} short={short} asks={asks} onShortcuts={onShortcuts} onClose={close} />} />
	)
}
