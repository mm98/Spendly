import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useMatches, useNavigate } from 'react-router'
import { Shell, Sidebar, SidebarBrand, SidebarGroup, SidebarDivider, SidebarAccount, SidebarGrip, NavItem, TopBar, ShellContent } from '../components/Shell.jsx'
import { TabBar, TabBarItem, Fab } from '../components/Touch.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Switch } from '../components/Choice.jsx'
import { Mark } from '../components/Mark.jsx'
import { Button } from '../components/Button.jsx'
import { Kbd } from '../components/Utilities.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, Menu, MenuItem, Toaster } from '../components/Overlays.jsx'
import { getBookmarks, getCategories, getCurrentUser, getOrders, getVendors, onSessionEnded } from '../api/client.js'
import { peek, useApi } from '../api/useApi.js'
import { amount } from '../api/format.js'
import { MAC, useMedia, useShellShape } from './useMedia.js'
import { setTheme, useTheme } from './theme.js'
import { Palette, useRecentRecords } from './Palette.jsx'
import { ALL_ORDERS, SidebarViews } from './views.jsx'
import { rememberList, rememberedList, useScrollMemory } from './listMemory.js'
import { ShortcutSheet, useShortcutKeys } from './Shortcuts.jsx'


/* The route's handle names the page for the browser tab, the sidebar row it belongs to, the
   body layout its columns sit in, and whether the one floating action shows on a phone. */
const handleOf = matches => Object.assign({}, ...matches.map(m => m.handle ?? {}))

const TABS = [
	{ to: '/', key: 'home', icon: 'home', label: 'Home' },
	{ to: '/orders', key: 'orders', icon: 'file-text', label: 'Orders' },
	{ to: '/statistics', key: 'statistics', icon: 'chart-bar', label: 'Statistics' },
	{ to: '/more', key: 'more', icon: 'user', label: 'More' }
]
// below 640 the rest of the sidebar lives under More (9h)
const UNDER_MORE = ['budget', 'vendors', 'categories', 'bookmarks', 'settings', 'more']

export function AppShell() {
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

	// a section's destination returns to its list as it was left; from that very list, it starts
	// it over (c11)
	if (remember && navKey) rememberList(navKey, pathname + params)
	const go = (key, to) => {
		const back = rememberedList(key)
		return !back || back === pathname + params ? to : back
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
	useEffect(() => onSessionEnded(() => setEnded(true)), [])

	// below 1280 the facet rail leaves and the list takes the column (18b)
	const body = layout === 'rail' && shape !== 'wide' ? 'default' : layout
	const content = (
		<ShellContent layout={body}>
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
			aria-label="Search orders, vendors, items"
			kbd={touch ? undefined : <Kbd>{MAC ? '⌘K' : 'Ctrl K'}</Kbd>}
		/>
	)
	const [keysShown, setKeysShown] = useState(false)
	const showKeys = useCallback(() => setKeysShown(true), [])
	const overlay = palette
		? <Palette query={palette.query} touch={touch} onShortcuts={showKeys} onClose={closePalette} />
		: null
	useShortcutKeys({ enabled: !touch && !palette && !keysShown, onSheet: showKeys, onGo: (key, to) => navigate(go(key, to)) })
	const keySheet = keysShown ? <ShortcutSheet onClose={() => setKeysShown(false)} /> : null

	const signedOut = ended
		? (
			<Dialog onCancel={() => setEnded(false)}>
				<DialogTitle>You've been signed out</DialogTitle>
				<DialogBody>Sign in again to carry on. Text you typed on this page and did not save is not kept. Choose Later to stay here and copy it first.</DialogBody>
				<DialogActions>
					<Button variant="outline" size="small" onClick={() => setEnded(false)}>Later</Button>
					<Button size="small" onClick={() => { setEnded(false); navigate(`/signin?next=${encodeURIComponent(pathname + params)}`) }}>
						Sign in
					</Button>
				</DialogActions>
			</Dialog>
		)
		: null

	const tab = UNDER_MORE.includes(navKey) ? 'more' : navKey
	/* One tree for every shape, so crossing a breakpoint keeps the page mounted with whatever
	   the reader had not saved. */
	return (
		<Toaster>
			<Shell touch={touch} viewport={!touch} collapsed={fold.collapsed} cover={touch ? overlay : undefined}>
				{touch ? null : sidebar({ navKey, fold, short, go, showKeys })}
				<TopBar touch={touch}>{search}</TopBar>
				{content}
				{touch && fab ? <Fab to="/orders/new" aria-label="New order" /> : null}
				{touch
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
		</Toaster>
	)
}

/* An element rather than a component: the shell places its children by type. On the rail the
   groups and the wordmark go, and a rule sets the two creating actions apart (9b, 9h). The brand
   and the bottom zone stay put; only the destinations between them scroll (9g). */
// the saved view the order list was opened from (9e), and All orders never returning to one
const onView = () => { const id = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('saved'); return id && id !== 'all' ? id : null }
const allOrders = to => (/[?&]saved=(?!all)/.test(to) ? ALL_ORDERS : to)

function sidebar({ navKey, fold, short, go, showKeys }) {
	const { rail } = fold
	const brand = <Mark size="small" fill="solid" aria-hidden="true" aria-label="Spendly"><span>S</span></Mark>
	return (
		<Sidebar aria-label="Sections" ref={fold.box} variant={fold.over ? 'peek' : 'default'} motion={fold.motion}>
			{rail
				? <>{brand}<SidebarDivider /></>
				: <SidebarBrand>{brand}<span>Spendly</span></SidebarBrand>}
			<NavScroll navKey={navKey}>
				<Row to="/" icon="home" rail={rail} current={navKey === 'home'}>Home</Row>
				<Row to="/orders/new?source=scan" icon="camera" variant="action" rail={rail}>Scan receipt</Row>
				<Row to="/orders/new" icon="plus" rail={rail}>New order</Row>
				{rail ? <SidebarDivider /> : <SidebarGroup>Orders</SidebarGroup>}
				<Counted to={allOrders(go('orders', ALL_ORDERS))} icon="receipt" rail={rail} current={navKey === 'orders' && !onView()} useCount={useOrdersCount}>All orders</Counted>
				<SidebarViews rail={rail} savedId={navKey === 'orders' ? onView() : null} />
				{rail ? null : <SidebarGroup>Budget</SidebarGroup>}
				<Row to={go('budget', '/budget')} icon="wallet" rail={rail} current={navKey === 'budget'}>This year</Row>
				{rail ? null : <SidebarGroup>Library</SidebarGroup>}
				<Counted to={go('vendors', '/vendors')} icon="building-store" rail={rail} current={navKey === 'vendors'} useCount={useVendorsCount}>Vendors</Counted>
				<Counted to={go('categories', '/categories')} icon="category" rail={rail} current={navKey === 'categories'} useCount={useCategoriesCount}>Categories</Counted>
				<Counted to={go('bookmarks', '/bookmarks')} icon="heart" rail={rail} current={navKey === 'bookmarks'} useCount={useBookmarksCount}>Bookmarks</Counted>
				<Row to={go('statistics', '/statistics')} icon="chart-bar" rail={rail} current={navKey === 'statistics'}>Statistics</Row>
			</NavScroll>
			{short ? null : <Row to="/settings" icon="settings" rail={rail} current={navKey === 'settings'}>Settings</Row>}
			{rail ? null : <SidebarDivider />}
			{short ? null : <DarkMode rail={rail} />}
			<Account rail={rail} short={short} onShortcuts={showKeys} />
			<SidebarGrip expanded={!rail} onClick={fold.toggle} />
		</Sidebar>
	)
}

const SLIDE_IN_MS = 180
const SLIDE_OUT_MS = 140
const foldKey = () => `spendly:sidebar:${peek(getCurrentUser)?.id ?? ''}`
const readFold = () => { try { return localStorage.getItem(foldKey()) === 'rail' } catch { return false } }

/* The grip (9i): on a wide window it folds the sidebar, kept per account in this browser. Below
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
		try { localStorage.setItem(foldKey(), value ? 'rail' : 'open') } catch { /* storage denied: this tab only */ }
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

/* A count is read with its destination; on the rail the label is the tile's only name. */
function Row({ rail, count, children, ...rest }) {
	const shown = count == null ? count : amount(count, 0)
	return <NavItem tip={rail ? children : undefined} aria-label={shown != null ? `${children}, ${shown}` : children} count={shown} {...rest}>{children}</NavItem>
}

/* A count the sidebar has not received yet renders as nothing, never as a zero (9e). */
function Counted({ useCount, ...rest }) {
	return <Row count={useCount()} {...rest} />
}
const useOrdersCount = () => useApi(getOrders, [{ pageSize: 1 }]).data?.total
const useVendorsCount = () => useApi(getVendors).data?.filter(v => !v.archived).length
const useCategoriesCount = () => useApi(getCategories).data?.length
const useBookmarksCount = () => useApi(getBookmarks, [{ pageSize: 1 }]).data?.matched

/* A switch beside its label on the wide sidebar; on the rail a tile of its own, which keeps it
   in the keyboard's reach once the label and the switch are gone (9b). */
function DarkMode({ rail }) {
	const theme = useTheme()
	const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')
	if (rail) return <NavItem icon="moon" tip="Dark mode" aria-label="Dark mode" aria-pressed={theme === 'dark'} onClick={toggle}>Dark mode</NavItem>
	return (
		<NavItem icon="moon"
			control={<Switch checked={theme === 'dark'} onChange={ev => setTheme(ev.target.checked ? 'dark' : 'light')} aria-label="Dark mode" />}>
			Dark mode
		</NavItem>
	)
}

/** The account menu (9c). Sign out leaves first, so the page's own leave check asks; the session
    ends on the sign-in page, once the reader has been let go. */
export function AccountMenu({ name, email, position, short = false, onShortcuts, onClose }) {
	const navigate = useNavigate()
	const theme = useTheme()
	return (
		<Menu position={position} aria-label="Account">
			<li className="ns-menu-head" role="presentation">
				{name ? <span className="sp-data sp-truncate">{name}</span> : null}
				<span className="sp-meta sp-truncate">{email}</span>
			</li>
			<MenuItem icon="user" onClick={() => { onClose(); navigate('/settings/account') }}>Account and profile</MenuItem>
			{/* on a short window the sidebar has no room for these two, so they live here (9g) */}
			{short ? <MenuItem icon="settings" onClick={() => { onClose(); navigate('/settings') }}>Settings</MenuItem> : null}
			{short
				? <MenuItem icon={theme === 'dark' ? 'sun' : 'moon'} onClick={() => { onClose(); setTheme(theme === 'dark' ? 'light' : 'dark') }}>
					{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				</MenuItem>
				: null}
			{onShortcuts
				? <MenuItem icon="keyboard" onClick={() => { onClose(); onShortcuts() }}>
					<span className="sp-nowrap">Keyboard shortcuts</span><span className="sp-grow" /><Kbd>?</Kbd>
				</MenuItem>
				: null}
			<MenuItem icon="power" onClick={() => { onClose(); navigate('/signin', { state: { signOut: true } }) }}>Sign out</MenuItem>
		</Menu>
	)
}

function Account({ rail, short, onShortcuts }) {
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
			onClick={() => setOpen(!open)} onDismiss={close} menu={<AccountMenu name={name} email={email} short={short} onShortcuts={onShortcuts} onClose={close} />} />
	)
}
