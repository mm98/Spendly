import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useMatches, useNavigate } from 'react-router'
import { Shell, Sidebar, SidebarBrand, SidebarGroup, SidebarDivider, SidebarAccount, NavItem, TopBar, ShellContent } from '../components/Shell.jsx'
import { TabBar, TabBarItem, Fab } from '../components/Touch.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Switch } from '../components/Choice.jsx'
import { Mark } from '../components/Mark.jsx'
import { Kbd, useDismiss } from '../components/Utilities.jsx'
import { Anchor, Menu, MenuItem, Toaster } from '../components/Overlays.jsx'
import { getBookmarks, getCategories, getCurrentUser, getOrders, getVendors, logout } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { useShellShape } from './useMedia.js'
import { setTheme, useTheme } from './theme.js'
import { Palette } from './Palette.jsx'

const MAC = /Mac|iPhone|iPad/.test(navigator.platform)

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
	const handle = handleOf(useMatches())
	const { navKey, layout = 'default', fab = false, title } = handle
	const navigate = useNavigate()
	const [palette, setPalette] = useState(null)

	useEffect(() => { document.title = title ? `${title} - Spendly` : 'Spendly' }, [title])

	const openPalette = useCallback(query => setPalette({ query: query ?? '' }), [])
	useEffect(() => {
		const key = ev => {
			if (ev.key.toLowerCase() === 'k' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); openPalette() }
		}
		document.addEventListener('keydown', key)
		return () => document.removeEventListener('keydown', key)
	}, [openPalette])

	const content = (
		<ShellContent layout={layout}>
			<Suspense fallback={null}><Outlet /></Suspense>
		</ShellContent>
	)
	const search = (
		<SearchInput
			value=""
			onChange={text => openPalette(text)}
			onFocus={() => openPalette()}
			placeholder={shape === 'touch' ? 'Search' : 'Search orders, vendors, items…'}
			aria-label="Search orders, vendors, items"
			kbd={shape === 'touch' ? undefined : <Kbd>{MAC ? '⌘K' : 'Ctrl K'}</Kbd>}
		/>
	)
	const overlay = palette ? <Palette query={palette.query} onClose={() => setPalette(null)} /> : null

	if (shape === 'touch') {
		const tab = UNDER_MORE.includes(navKey) ? 'more' : navKey
		return (
			<Toaster>
				<Shell touch>
					<TopBar touch>{search}</TopBar>
					{content}
					{fab ? <Fab to="/orders/new" aria-label="New order" /> : null}
					<TabBar aria-label="Sections">
						{TABS.map(t => (
							<TabBarItem key={t.key} icon={t.icon} current={t.key === tab} onClick={() => navigate(t.to)}>{t.label}</TabBarItem>
						))}
					</TabBar>
				</Shell>
				{overlay}
			</Toaster>
		)
	}
	return (
		<Toaster>
			<Shell viewport collapsed={shape === 'rail'}>
				{sidebar({ navKey, rail: shape === 'rail' })}
				<TopBar>{search}</TopBar>
				{content}
			</Shell>
			{overlay}
		</Toaster>
	)
}

/* The sidebar is built as an element rather than a component, because the shell places its
   children by type and a wrapper would hide the Sidebar inside it. */
function sidebar({ navKey, rail }) {
	return (
		<Sidebar aria-label="Sections">
			<SidebarBrand>
				<Mark size="small" fill="solid" aria-hidden="true" aria-label="Spendly"><span>S</span></Mark>
				<span>Spendly</span>
			</SidebarBrand>
			<Row to="/" icon="home" rail={rail} current={navKey === 'home'}>Home</Row>
			<Row to="/orders/new?source=scan" icon="camera" variant="action" rail={rail}>Scan receipt</Row>
			<Row to="/orders/new" icon="plus" rail={rail}>New order</Row>
			<SidebarGroup>Orders</SidebarGroup>
			<Counted to="/orders" icon="receipt" rail={rail} current={navKey === 'orders'} useCount={useOrdersCount}>All orders</Counted>
			<SidebarGroup>Budget</SidebarGroup>
			<Row to="/budget" icon="wallet" rail={rail} current={navKey === 'budget'}>This year</Row>
			<SidebarGroup>Library</SidebarGroup>
			<Counted to="/vendors" icon="building-store" rail={rail} current={navKey === 'vendors'} useCount={useVendorsCount}>Vendors</Counted>
			<Counted to="/categories" icon="category" rail={rail} current={navKey === 'categories'} useCount={useCategoriesCount}>Categories</Counted>
			<Counted to="/bookmarks" icon="heart" rail={rail} current={navKey === 'bookmarks'} useCount={useBookmarksCount}>Bookmarks</Counted>
			<Row to="/statistics" icon="chart-bar" rail={rail} current={navKey === 'statistics'}>Statistics</Row>
			<span className="sp-grow" />
			<Row to="/settings" icon="settings" rail={rail} current={navKey === 'settings'}>Settings</Row>
			<SidebarDivider />
			<DarkMode rail={rail} />
			<Account rail={rail} />
		</Sidebar>
	)
}

function Row({ rail, children, ...rest }) {
	return <NavItem tip={rail ? children : undefined} aria-label={children} {...rest}>{children}</NavItem>
}

/* A count the sidebar has not received yet renders as nothing, never as a zero (9e). */
function Counted({ useCount, ...rest }) {
	return <Row count={useCount()} {...rest} />
}
const useOrdersCount = () => useApi(getOrders, [{ pageSize: 1 }]).data?.total
const useVendorsCount = () => useApi(getVendors).data?.length
const useCategoriesCount = () => useApi(getCategories).data?.length
const useBookmarksCount = () => useApi(getBookmarks, [{ pageSize: 1 }]).data?.matched

function DarkMode({ rail }) {
	const theme = useTheme()
	return (
		<NavItem icon="moon" tip={rail ? 'Dark mode' : undefined}
			control={<Switch checked={theme === 'dark'} onChange={ev => setTheme(ev.target.checked ? 'dark' : 'light')} aria-label="Dark mode" />}>
			Dark mode
		</NavItem>
	)
}

/* The account block opens its menu upward, the block's own width (9c). */
function Account({ rail }) {
	const user = useApi(getCurrentUser)
	const [open, setOpen] = useState(false)
	const anchor = useRef(null)
	const navigate = useNavigate()
	const close = useCallback(() => setOpen(false), [])
	useDismiss(anchor, open, close)
	const email = user.data?.email
	if (!email) return null
	return (
		<span ref={anchor}>
			<Anchor open={open}>
				<SidebarAccount email={email} expanded={open} tip={rail ? email : undefined} aria-label={email}
					onClick={() => setOpen(!open)} />
				<Menu position="up" aria-label="Account">
					<MenuItem icon="user" onClick={() => { close(); navigate('/settings') }}>Account and profile</MenuItem>
					<MenuItem icon="power" onClick={() => logout().finally(() => { close(); navigate('/signin') })}>Sign out</MenuItem>
				</Menu>
			</Anchor>
		</span>
	)
}
