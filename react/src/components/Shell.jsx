import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Sep } from './Sep.jsx'
import { Link, Outlet, useLocation, useMatches, useNavigate } from 'react-router'
import { Icon } from './Icon.jsx'
import { Button, IconButton } from './Button.jsx'
import { Waiting } from './Async.jsx'
import { ToastProvider } from './Toast.jsx'
import { PullToRefresh } from './PullToRefresh.jsx'
import { UpdateNoticeProvider } from './UpdateNotice.jsx'
import { getVersion, search, SEARCH_FROM } from '../api/client.js'
import { useApi } from '../api/useApi.js'

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
	/* The entry the five-column phone bar leaves out, because it is the only one with another
	   door there: the top bar's chevron goes here from every page that is not already it. */
	{ to: '/', key: 'home', icon: 'home', label: 'Home', wide: true },
	{ to: '/orders', key: 'orders', icon: 'receipt', label: 'Orders' },
	{ to: '/wishlist', key: 'wishlist', icon: 'cart', label: 'Wishlist', short: 'Wish' },
	{ to: '/vendors', key: 'vendors', icon: 'store', label: 'Vendors' },
	{ to: '/categories', key: 'categories', icon: 'tag', label: 'Categories' },
	{ to: '/stats', key: 'stats', icon: 'chart', label: 'Statistics', short: 'Stats' }
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
						<Link key={item.key} to={item.to}
							className={[on && 'is-on', item.wide && 'wide-only'].filter(Boolean).join(' ') || undefined}
							aria-current={on ? 'page' : undefined}>
							{/* One word per column in the five-column bar. Both forms are in the markup and
							    the hidden one is out of the tree, so the spoken name is the printed one. */}
							<Icon name={item.icon} />
							{item.short ? (<>
								<span className="wide-only">{item.label}</span>
								<span className="narrow-only">{item.short}</span>
							</>) : item.label}
						</Link>
					)
				})}
			</nav>
			<div className="sidebar-footer"><BuildQuality /></div>
		</aside>
	)
}

/* The band at the foot of the rail, and what it is hiding: the Lighthouse scores this image
   was measured at, on hover or focus. Same shape as the chart callout -- not drawn at rest,
   revealed by asking, `visibility` rather than `display` so the phone rule that hides this
   whole band stays in charge.

   The scores come from /api/version, which the Settings page already reads, and useApi keys
   its cache by endpoint -- so the band costs a request only on a load where Settings has not
   made one, and never a second. Outside the Docker image there is nothing to show and the
   band is the plain line it always was: a tooltip that opens onto "unknown" is worse than no
   tooltip, and a dev server has no build to have been measured. */
/* No SEO row: the check stopped measuring it (react/scripts/lighthouse.mjs -- a sign-in-gated
   ledger has no crawler to rank it), so new stamps do not carry the key, and a row reading a
   key only old stamps hold would render its label over a blank. */
const SCORES = [
	['Performance', 'performance'], ['Accessibility', 'accessibility'],
	['Best practices', 'bestPractices']
]

function BuildQuality() {
	const version = useApi(getVersion)
	const scores = version.data?.lighthouse
	if (!scores) return <span>Spendly<Sep />your spending</span>

	return (
		<span className="build-quality">
			{/* Focusable, or the callout is hover-only and a keyboard never reaches it. */}
			<span className="build-quality-band" tabIndex={0}>Spendly<Sep />your spending</span>
			<span className="tooltip build-quality-callout" role="tooltip">
				<span className="build-quality-title">This build scored</span>
				{SCORES.map(([label, key]) => (
					<span className="build-quality-row" key={key}>
						{label}<b>{scores[key]}</b>
					</span>
				))}
				<span className="build-quality-meta">
					Lighthouse {scores.lighthouse ?? '?'}<Sep />FCP {Math.round(scores.firstContentfulPaintMs)} ms
				</span>
			</span>
		</span>
	)
}

/* ---- the command palette ----

   The top bar prints CTRL K, and a key cap is a promise: Ctrl+K (Cmd+K on a Mac) opens this
   from anywhere and puts the caret in it, Escape closes it and hands focus back to whatever
   had it, Up and Down walk the results, and Enter opens the one that is highlighted -- or,
   with none highlighted, searches all orders for the typed text, which is what the line at the
   foot of the panel says.

   It searches orders, vendors, categories, wishes, item lines and notes, and it lists the commands
   the app can run -- so it is the one control that reaches every page and every create flow.
   The results come from the API on each keystroke, aborted when the next one lands, which is
   why a slow answer cannot overwrite a fast one typed after it.

   aria-activedescendant is how a combobox says which option is current without moving focus
   out of the input. The listbox owns the ids; the input points at one of them. */
function GlobalFinder() {
	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)
	const [groups, setGroups] = useState([])
	/* -1 is nothing chosen, and every new set of results starts there: a row is chosen by the
	   arrow keys or the mouse, never by arriving. Nothing chosen is what hands Enter to the line
	   at the foot of the panel, so choosing a row here silently changes what that line does. */
	const [at, setAt] = useState(-1)
	const wrapper = useRef(null)
	const input = useRef(null)
	const returnFocusTo = useRef(null)
	const navigate = useNavigate()
	const panelId = 'global-finder-panel'

	/* One flat list behind the grouped rendering, because the arrow keys walk results and not
	   headings. Index into this is what aria-activedescendant names. */
	const flat = useMemo(() => groups.flatMap(g => g.options), [groups])
	const current = at < 0 ? undefined : flat[Math.min(at, flat.length - 1)]

	useEffect(() => {
		if (!open) return
		const controller = new AbortController()
		search(query, controller.signal)
			.then(r => { setGroups(r.groups); setAt(-1) })
			.catch(e => { if (e.name !== 'AbortError') setGroups([]) })
		return () => controller.abort()
	}, [query, open])

	const close = useCallback(() => {
		setOpen(false)
		/* Focus goes back where it came from. A palette that closes onto the body drops the
		   keyboard user at the top of the document. */
		const back = returnFocusTo.current
		returnFocusTo.current = null
		queueMicrotask(() => (back ?? input.current)?.focus?.())
	}, [])

	const go = useCallback(to => {
		setOpen(false)
		returnFocusTo.current = null
		navigate(to)
	}, [navigate])

	/* The shortcut. Bound on the document because a palette you have to click into first is
	   not a shortcut, and preventDefault because Ctrl+K is the browser's own in some builds. */
	useEffect(() => {
		const onKey = e => {
			if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) return
			e.preventDefault()
			/* The stylesheet hides this whole control below 1100px, so on a phone the shortcut
			   cannot open it -- focusing a display:none input puts focus on the body. There the
			   honest answer is the page that does the same job with room to do it. */
			if (!input.current?.offsetParent) { navigate('/orders/all'); return }
			returnFocusTo.current = document.activeElement
			setOpen(true)
			queueMicrotask(() => { input.current?.focus(); input.current?.select() })
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [navigate])

	useEffect(() => {
		if (!open) return
		const onDocumentClick = e => { if (!wrapper.current?.contains(e.target)) setOpen(false) }
		document.addEventListener('click', onDocumentClick)
		return () => document.removeEventListener('click', onDocumentClick)
	}, [open])

	const optionId = i => `${panelId}-option-${i}`

	/* The panel scrolls at a fixed height (app.css's .combobox-panel), and a result list long
	   enough to need that -- Vendors and Categories rows doubled once each row also opened an
	   edit page, plus the "Show all ..." row under each -- can arrow the highlight straight past
	   the bottom of it: the class moved, the panel did not, and the highlighted row read as
	   deselected because it could no longer be seen.

	   Not scrollIntoView: it reads the scroll container's own edge as the visible bound, and
	   the sticky "SEARCH ALL ORDERS FOR ..." row (app.css's .combobox-action, position:sticky)
	   sits opaque over that same edge regardless of scroll position -- a row scrolled flush to
	   the panel's bottom is still hidden under it. Down never carried the highlight past the
	   fifth-or-so row for exactly this reason: every row past it was scrolled to a position
	   scrollIntoView called visible and the sticky bar was covering. The footer's own current
	   top, not the panel's, is the real reachable bottom, and getBoundingClientRect reads both
	   in the same viewport pixels a manual scrollTop adjustment can use directly. */
	useEffect(() => {
		if (at < 0) return
		const panel = document.getElementById(panelId)
		const option = document.getElementById(optionId(at))
		if (!panel || !option) return
		const footer = panel.querySelector('.combobox-action')
		const panelRect = panel.getBoundingClientRect()
		const optionRect = option.getBoundingClientRect()
		const visibleBottom = footer ? footer.getBoundingClientRect().top : panelRect.bottom
		if (optionRect.bottom > visibleBottom) panel.scrollTop += optionRect.bottom - visibleBottom
		else if (optionRect.top < panelRect.top) panel.scrollTop -= panelRect.top - optionRect.top
	}, [at])

	/* Too short to search (SEARCH_FROM). Without this the panel shows the starter commands, which
	   reads as a search that found none of what was typed. */
	const typed = query.trim()
	const tooShort = typed.length > 0 && typed.length < SEARCH_FROM

	return (
		<div className={['global-finder', open && 'is-open'].filter(Boolean).join(' ')} ref={wrapper}>
			<div className="field-shell">
				<Icon name="search" />
				{/* aria-expanded is only allowed on a handful of roles and `search` is not one of
				    them -- axe calls that critical, and the attribute is simply ignored. This is a
				    combobox, so it says so, the same as every other one in the app. */}
				<input ref={input} type="search" id="global-finder-search" value={query}
					placeholder="Search orders, vendors, notes..."
					role="combobox" aria-autocomplete="list" aria-controls={panelId}
					aria-label="Search everything" aria-expanded={open}
					aria-activedescendant={open && current ? optionId(flat.indexOf(current)) : undefined}
					onChange={e => { setQuery(e.target.value); setOpen(true) }}
					onClick={() => setOpen(true)}
					onKeyDown={e => {
						if (e.key === 'Escape') {
							/* preventDefault, because this is input[type=search] and Chromium's own
							   Escape clears the field -- which fires change, which is what reopens the
							   panel a beat after this closed it. The palette stayed open on Escape for
							   exactly that reason, and the keydown handler looked correct throughout. */
							e.preventDefault()
							close()
							return
						}
						if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
							e.preventDefault()
							if (!open) { setOpen(true); return }
							if (!flat.length) return
							/* From "nothing chosen", Down takes the first row and Up the last. The plain
							   modulo step lands on the second-to-last one going up from -1. */
							setAt(i => i < 0
								? (e.key === 'ArrowDown' ? 0 : flat.length - 1)
								: (i + (e.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length)
							return
						}
						if (e.key !== 'Enter') return
						e.preventDefault()
						/* Enter opens what is highlighted; with nothing highlighted it does what the
						   foot of the panel says it does, which is search all orders for the text. */
						if (current) go(current.to)
						else if (query.trim()) go('/orders/all?q=' + encodeURIComponent(query))
					}} />
				<span className="key-cap key-cap-push">CTRL K</span>
			</div>
			<div className="combobox-panel" id={panelId} role="listbox" aria-label="Search everything">
				{tooShort ? (
					<div className="combobox-group">
						<div className="combobox-group-heading">Keep typing</div>
						<div className="combobox-option">Type at least {SEARCH_FROM} letters to search.</div>
					</div>
				) : null}
				{groups.map(group => (
					<div className="combobox-group" key={group.heading}>
						<div className="combobox-group-heading">{group.heading}</div>
						{group.options.map(option => {
							const i = flat.indexOf(option)
							const on = option === current
							return (
								<div key={option.id} id={optionId(i)} role="option" aria-selected={on}
									className={['combobox-option', on && 'combobox-option-highlighted']
										.filter(Boolean).join(' ')}
									onMouseEnter={() => setAt(i)}
									onClick={e => { e.preventDefault(); e.stopPropagation(); go(option.to) }}>
									{option.before}
									{option.mark ? (
										<mark className={[/\s$/.test(option.before) && 'mark-lead',
											/^\s/.test(option.rest) && 'mark-trail'].filter(Boolean).join(' ')}>
											{option.mark}
										</mark>
									) : null}
									{option.rest}
									<span className="combobox-option-meta">{option.meta}</span>
								</div>
							)
						})}
					</div>
				))}
				{query.trim() && !flat.length ? (
					<div className="combobox-group">
						<div className="combobox-group-heading">Nothing found</div>
						<div className="combobox-option">No order, vendor, category, wish or note matches "{query}".</div>
					</div>
				) : null}
				{query.trim() ? (
					<div className="combobox-action"
						onClick={e => { e.preventDefault(); e.stopPropagation(); go('/orders/all?q=' + encodeURIComponent(query)) }}>
						SEARCH ALL ORDERS FOR "{query.toUpperCase()}"
						<span className="combobox-option-meta">Enter</span>
					</div>
				) : null}
			</div>
		</div>
	)
}

/* ---- sub-tabs ----
   A real tablist: buttons, roving tabindex, arrow keys, and a selection that changes what is
   on screen. Every tab does something -- it either goes to another page or switches the view
   within this one. Anything that could do neither was removed rather than left as chrome
   that looks live and is not. README: Honest Affordances. */
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

/* The way out, the page's name, the finder, and the two things the app does from anywhere.
   `titleRef` is the shell's: it hands that heading out as the focus target through its context. */
function TopBar({ handle, titleRef }) {
	const location = useLocation()
	const navigate = useNavigate()

	return (
		<header className="topbar">
			{handle.back ? (
				/* A row passes where it opened this page from as navigation state (Rows.jsx), so
				   leaving closes that; `handle.back.to` is the fallback. README: Accessibility. */
				<IconButton icon="chevronLeft"
					label={location.state?.from ? 'Back' : 'Back to ' + handle.back.label}
					onClick={() => navigate(location.state?.from ?? handle.back.to)} />
			) : handle.navKey === 'home' ? null : (
				/* Home's door on a phone, where the five columns go elsewhere. Drawn only on a
				   phone: a wide screen has the rail, which carries Home. README: Chrome. */
				<IconButton icon="chevronLeft" to="/" label="Home" className="topbar-up" />
			)}
			<h1 id="page-title" tabIndex={-1} ref={titleRef}>{handle.title ?? 'Spendly'}</h1>
			<GlobalFinder />
			<div className="topbar-actions">
				<Button variant="primary" to="/scan" icon="scan" aria-label="Scan receipt">
					<span>SCAN <span className="wide-only">RECEIPT</span></span>
				</Button>
				<Button variant="outline" to="/orders/new" icon="plus" aria-label="New order">
					<span>NEW <span className="wide-only">ORDER</span></span>
				</Button>
				{/* Settings reaches every page from every page, because that is what it is
				    about: the order form's defaults, both lists' opening order, how many
				    entries a card holds, whether a trash asks first. It used to be a
				    full-width ORDER SETTINGS button at the foot of the Orders rail --
				    findable only from one tab of one page, and named for the one part of
				    itself that page happened to own. A glyph, beside the two actions the
				    bar already carries, since it is a destination rather than a thing to
				    do here. README: Chrome, Settings. */}
				<IconButton icon="settings" to="/settings" label="Settings" />
			</div>
		</header>
	)
}

export function AppShell() {
	const matches = useMatches()
	const location = useLocation()
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

	/* The toast layer wraps the shell rather than sitting inside a page, because what it reports
	   outlives the page that caused it -- saving an order navigates away from the form that
	   saved it, and the confirmation has to survive the move. */
	return (
		<ViewContext.Provider value={value}>
		<ToastProvider>
		<UpdateNoticeProvider>
			{/* Pulling down at the top moves the whole page as one -- sidebar/tab-bar, top bar and
			    content together -- so PullToRefresh wraps the shell itself rather than just the
			    part below the top bar. README: Chrome. */}
			<PullToRefresh>
			<div className="app-shell">
				<Sidebar navKey={handle.navKey} />
				<div className="main-panel">
					<TopBar handle={handle} titleRef={title} />

					{/* The one <main> per document. Everything below the top bar is the page: the
					    sub-tab band selects within it, so it is inside rather than beside. Without
					    it the sheet was a bare <div> and every card, heading and row on twelve
					    pages sat in no landmark at all -- 108 of them by axe's count. README: Accessibility. */}
					<main>
						<SubTabs tabs={handle.tabs} view={view} setView={setView} />
						{/* One boundary for every route, because every page is its own chunk --
						    see routes.jsx. It sits inside <main> and below the sub-tab band so
						    the title, the rail highlight and the tabs are already right while
						    the page is still arriving: those come off the route's `handle`,
						    which is static, and a page that announced itself only once its
						    JavaScript landed would be the unnamed-page defect again. */}
						<div className="content-sheet"><div className="content-sheet-inner"><div id="pages">
							<Suspense fallback={<Waiting label="Loading this page" />}>
								<Outlet />
							</Suspense>
						</div></div></div>
					</main>
				</div>
			</div>
			</PullToRefresh>
			{/* The bar and its dialog render inside UpdateNoticeProvider itself, outside the
			    shell a pull moves: it announces a build the whole app is running, not a state
			    of the page under it, so it holds its place on the screen while the page slides
			    down and back. */}
		</UpdateNoticeProvider>
		</ToastProvider>
		</ViewContext.Provider>
	)
}
