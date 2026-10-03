import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useMatches, useNavigate } from 'react-router'
import { Shell, Sidebar, SidebarBrand, SidebarGroup, SidebarDivider, SidebarAccount, NavItem, TopBar, ShellContent } from '../components/Shell.jsx'
import { TabBar, TabBarItem, Fab } from '../components/Touch.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Switch } from '../components/Choice.jsx'
import { Mark } from '../components/Mark.jsx'
import { Button } from '../components/Button.jsx'
import { Kbd } from '../components/Utilities.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, Menu, MenuItem, Toaster } from '../components/Overlays.jsx'
import { getBookmarks, getCategories, getCurrentUser, getOrders, getVendors, onSessionEnded } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { ConfirmBanner } from './ConfirmBanner.jsx'
import { amount } from '../api/format.js'
import { MAC, useShellShape } from './useMedia.js'
import { setTheme, useTheme } from './theme.js'
import { Palette, useRecentRecords } from './Palette.jsx'
import { rememberList, rememberedList, useScrollMemory } from './listMemory.js'


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
	const handle = handleOf(useMatches())
	const { navKey, layout = 'default', fab = false, title, remember = false } = handle
	const navigate = useNavigate()
	const { pathname, search: params, key: visit, state } = useLocation()

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
			<ConfirmBanner />
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
	const overlay = palette
		? <Palette query={palette.query} touch={touch} onClose={closePalette} />
		: null
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
			<Shell touch={touch} viewport={!touch} collapsed={shape === 'rail'} cover={touch ? overlay : undefined}>
				{touch ? null : sidebar({ navKey, rail: shape === 'rail', go })}
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
			{signedOut}
		</Toaster>
	)
}

/* An element rather than a component: the shell places its children by type. On the rail the
   groups and the wordmark go, and a rule sets the two creating actions apart (9b, 9h). */
function sidebar({ navKey, rail, go }) {
	const brand = <Mark size="small" fill="solid" aria-hidden="true" aria-label="Spendly"><span>S</span></Mark>
	return (
		<Sidebar aria-label="Sections">
			{rail
				? <>{brand}<SidebarDivider /></>
				: <SidebarBrand>{brand}<span>Spendly</span></SidebarBrand>}
			<Row to="/" icon="home" rail={rail} current={navKey === 'home'}>Home</Row>
			<Row to="/orders/new?source=scan" icon="camera" variant="action" rail={rail}>Scan receipt</Row>
			<Row to="/orders/new" icon="plus" rail={rail}>New order</Row>
			{rail ? <SidebarDivider /> : <SidebarGroup>Orders</SidebarGroup>}
			<Counted to={go('orders', '/orders')} icon="receipt" rail={rail} current={navKey === 'orders'} useCount={useOrdersCount}>All orders</Counted>
			{rail ? null : <SidebarGroup>Budget</SidebarGroup>}
			<Row to={go('budget', '/budget')} icon="wallet" rail={rail} current={navKey === 'budget'}>This year</Row>
			{rail ? null : <SidebarGroup>Library</SidebarGroup>}
			<Counted to={go('vendors', '/vendors')} icon="building-store" rail={rail} current={navKey === 'vendors'} useCount={useVendorsCount}>Vendors</Counted>
			<Counted to={go('categories', '/categories')} icon="category" rail={rail} current={navKey === 'categories'} useCount={useCategoriesCount}>Categories</Counted>
			<Counted to={go('bookmarks', '/bookmarks')} icon="heart" rail={rail} current={navKey === 'bookmarks'} useCount={useBookmarksCount}>Bookmarks</Counted>
			<Row to={go('statistics', '/statistics')} icon="chart-bar" rail={rail} current={navKey === 'statistics'}>Statistics</Row>
			<span className="sp-grow" />
			<Row to="/settings" icon="settings" rail={rail} current={navKey === 'settings'}>Settings</Row>
			{rail ? null : <SidebarDivider />}
			<DarkMode rail={rail} />
			<Account rail={rail} />
		</Sidebar>
	)
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
const useVendorsCount = () => useApi(getVendors).data?.length
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
export function AccountMenu({ email, position, onClose }) {
	const navigate = useNavigate()
	return (
		<Menu position={position} aria-label="Account">
			<li className="ns-menu-head" role="presentation"><span className="sp-meta sp-truncate">{email}</span></li>
			<MenuItem icon="user" onClick={() => { onClose(); navigate('/settings/account') }}>Account and profile</MenuItem>
			<MenuItem icon="power" onClick={() => { onClose(); navigate('/signin', { state: { signOut: true } }) }}>Sign out</MenuItem>
		</Menu>
	)
}

function Account({ rail }) {
	const user = useApi(getCurrentUser)
	const [open, setOpen] = useState(false)
	const close = useCallback(() => setOpen(false), [])
	const email = user.data?.email
	if (!email) return null
	return (
		<SidebarAccount email={email} expanded={open} tip={rail ? email : undefined} aria-label={email}
			onClick={() => setOpen(!open)} onDismiss={close} menu={<AccountMenu email={email} onClose={close} />} />
	)
}
