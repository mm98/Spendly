import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useMatches, useNavigate } from 'react-router-dom'
import { Icon } from './Icon.jsx'
import { Button } from './Button.jsx'
import { search } from '../api/client.js'

/* The shell every page sits in: the rail, the top bar, the sub-tab band, and the sheet.

   The prototype's router toggles a class, and the note in CLAUDE.md about it is the reason
   this file exists in the shape it does -- showing a page there also builds the sub-tab bar,
   sets the page title, moves the sidebar highlight and retargets the back button, and a
   harness that only toggled the class rendered eleven of twelve pages carrying home's title
   and home's tabs. Here all four read from one place: the `handle` on each route. A page
   cannot be reachable and unnamed, because the router is what names it. */

/* ---- the view a page is in ----
   Vendors and Categories have sub-tabs that switch what is on the page rather than
   navigating, and the stylesheet reads that as [data-view] on the page element. The tab bar
   is in the shell and the attribute is on the page, so the state is shared here and reset
   whenever the route changes -- a view left over from the last page is a filter nobody
   applied. */
const ViewContext = createContext({ view: 'overview', setView: () => {} })
export const useView = () => useContext(ViewContext)

/** The wrapper every page uses as its root. `.page.is-on` is the grid that lays a page out;
    `page-grid` and `content-grid` are the two variants that differ in their columns. */
export function Page({ variant, children, ...rest }) {
	const { view } = useView()
	return (
		<div className={['page', 'is-on', variant].filter(Boolean).join(' ')} data-view={view} {...rest}>
			{children}
		</div>
	)
}

const NAV = [
	{ to: '/', key: 'home', icon: 'home', label: 'Home' },
	{ to: '/orders', key: 'orders', icon: 'receipt', label: 'Orders' },
	{ to: '/vendors', key: 'vendors', icon: 'store', label: 'Vendors' },
	{ to: '/categories', key: 'categories', icon: 'tag', label: 'Categories' },
	{ to: '/stats', key: 'stats', icon: 'chart', label: 'Statistics' }
]

function Sidebar({ navKey }) {
	return (
		<aside className="sidebar">
			<Link className="brand" to="/" data-go="/" aria-label="Spendly, go to home">
				<span className="brand-mark" aria-hidden="true"><Icon name="receipt" className="" /></span>
				<span className="brand-name">Spendly</span>
			</Link>
			<nav className="sidebar-nav" aria-label="Primary">
				{NAV.map(item => {
					const on = item.key === navKey
					return (
						<Link key={item.key} to={item.to} className={on ? 'is-on' : undefined}
							aria-current={on ? 'page' : undefined}>
							<Icon name={item.icon} />{item.label}
						</Link>
					)
				})}
			</nav>
			<div className="sidebar-footer"><span>Spendly · personal ledger</span></div>
		</aside>
	)
}

/* ---- the global finder ----
   A search field that opens a panel of results. It answers from the API rather than from
   markup, so an empty query shows nothing and a query with no answer says so -- a panel of
   invented results would be the app claiming an index it has not got. */
function GlobalFinder() {
	const [query, setQuery] = useState('bil')
	const [open, setOpen] = useState(false)
	const [groups, setGroups] = useState([])
	const wrapper = useRef(null)
	const navigate = useNavigate()
	const panelId = 'global-finder-panel'

	useEffect(() => {
		if (!open) return
		const controller = new AbortController()
		search(query, controller.signal)
			.then(r => setGroups(r.groups))
			.catch(e => { if (e.name !== 'AbortError') setGroups([]) })
		return () => controller.abort()
	}, [query, open])

	useEffect(() => {
		if (!open) return
		const close = e => { if (!wrapper.current?.contains(e.target)) setOpen(false) }
		document.addEventListener('click', close)
		return () => document.removeEventListener('click', close)
	}, [open])

	const go = to => { setOpen(false); navigate(to) }

	return (
		<div className={['global-finder', open && 'is-open'].filter(Boolean).join(' ')} ref={wrapper}>
			<div className="field-shell">
				<Icon name="search" />
				{/* aria-expanded is only allowed on a handful of roles, and `search` is not one of
				    them -- axe calls that critical, and the attribute is simply ignored. The
				    control is a combobox, so it says so, the same as every other one here. */}
				<input type="search" value={query} placeholder="Search orders, vendors, notes…"
					role="combobox" aria-autocomplete="list" aria-controls={panelId}
					aria-label="Search everything" aria-expanded={open}
					onChange={e => { setQuery(e.target.value); setOpen(true) }}
					onClick={() => setOpen(true)}
					onKeyDown={e => {
						if (e.key === 'Escape') setOpen(false)
						else if (e.key === 'Enter') go('/orders/all?q=' + encodeURIComponent(query))
					}} />
				<span className="key-cap key-cap-push">CTRL K</span>
			</div>
			<div className="combobox-panel" id={panelId} role="listbox" aria-label="Search everything">
				{groups.map(group => (
					<div className="combobox-group" key={group.heading}>
						<div className="combobox-group-heading">{group.heading}</div>
						{group.options.map((option, i) => (
							<div key={option.id} role="option"
								aria-selected={i === 0 && group === groups[0] ? true : undefined}
								className={['combobox-option', i === 0 && group === groups[0] && 'combobox-option-highlighted']
									.filter(Boolean).join(' ')}
								onClick={() => go(option.to)}>
								{option.before}<mark>{option.mark}</mark>{option.rest}
								<span className="combobox-option-meta">{option.meta}</span>
							</div>
						))}
					</div>
				))}
				{groups.length ? (
					<div className="combobox-action" onClick={() => go('/orders/all?q=' + encodeURIComponent(query))}>
						SEARCH ALL ORDERS FOR "{query.toUpperCase()}"
						<span className="combobox-option-meta" style={{ fontWeight: 500 }}>Enter</span>
					</div>
				) : (
					<div className="combobox-group">
						<div className="combobox-group-heading">Nothing found</div>
						<div className="combobox-option">No orders, vendors or notes match "{query}".</div>
					</div>
				)}
			</div>
		</div>
	)
}

/* ---- sub-tabs ----
   A real tablist: buttons, roving tabindex, arrow keys, and a selection that changes what is
   on screen. Every tab does something -- it either goes to another page or switches the view
   within this one. Anything that could do neither was removed rather than left as chrome
   that looks live and is not. README 13. */
function SubTabs({ tabs, view, setView }) {
	const navigate = useNavigate()
	const refs = useRef([])
	if (!tabs?.length) return <div className="page-bar"><div className="segmented" id="subtabs" role="tablist" /></div>

	const activeIndex = Math.max(0, tabs.findIndex(t => (t.view ? t.view === view : t.on)))

	const select = i => {
		const tab = tabs[i]
		if (tab.to) { navigate(tab.to); return }
		setView(tab.view)
		refs.current[i]?.focus()
	}

	return (
		<div className="page-bar">
			<div className="segmented" id="subtabs" role="tablist">
				{tabs.map((tab, i) => (
					<button key={tab.label} type="button" role="tab" ref={el => { refs.current[i] = el }}
						aria-selected={i === activeIndex}
						tabIndex={i === activeIndex ? 0 : -1}
						className={i === activeIndex ? 'is-on' : undefined}
						onClick={() => select(i)}
						onKeyDown={e => {
							const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
							if (!step) return
							e.preventDefault()
							select((i + step + tabs.length) % tabs.length)
						}}>{tab.label}</button>
				))}
			</div>
		</div>
	)
}

export function AppShell() {
	const matches = useMatches()
	const location = useLocation()
	const navigate = useNavigate()
	const handle = useMemo(() => matches.filter(m => m.handle).at(-1)?.handle ?? {}, [matches])
	const [view, setView] = useState('overview')
	const title = useRef(null)

	/* Navigation resets the sheet to the top and the view to the tab that is drawn selected.
	   The title is not focused on arrival: moving focus on every route change talks over a
	   screen-reader user mid-sentence, and it is only taken deliberately -- when a control
	   that had focus has just been removed. */
	useEffect(() => {
		window.scrollTo(0, 0)
		setView('overview')
	}, [location.pathname])

	const focusTitle = useCallback(() => title.current?.focus(), [])

	const value = useMemo(() => ({ view, setView, focusTitle }), [view, focusTitle])

	return (
		<ViewContext.Provider value={value}>
			<div className="app-shell">
				<Sidebar navKey={handle.navKey} />
				<div className="main-panel">
					<header className="topbar">
						{handle.back ? (
							<button type="button" className="icon-button icon-button-arrow"
								aria-label={'Back to ' + handle.back.label}
								onClick={() => navigate(handle.back.to)}>
								<Icon name="chevronLeft" />
							</button>
						) : null}
						<h1 id="page-title" tabIndex={-1} ref={title}>{handle.title ?? 'Spendly'}</h1>
						<GlobalFinder />
						<div className="topbar-actions">
							<Button variant="primary" to="/scan" icon="scan" aria-label="Scan receipt">
								<span>SCAN <span className="wide-only">RECEIPT</span></span>
							</Button>
							<Button variant="outline" to="/orders/new" icon="plus" aria-label="New order">
								<span>NEW <span className="wide-only">ORDER</span></span>
							</Button>
						</div>
					</header>

					{/* The one <main> per document. Everything below the top bar is the page: the
					    sub-tab band selects within it, so it is inside rather than beside. Without
					    it the sheet was a bare <div> and every card, heading and row on twelve
					    pages sat in no landmark at all -- 108 of them by axe's count. S1, S18. */}
					<main>
						<SubTabs tabs={handle.tabs} view={view} setView={setView} />
						<div className="content-sheet"><div className="content-sheet-inner"><div id="pages">
							<Outlet />
						</div></div></div>
					</main>
				</div>
			</div>
		</ViewContext.Provider>
	)
}
