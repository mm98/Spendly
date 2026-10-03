import { Icon } from '../components/Icon.jsx'
import { NavItem } from '../components/Shell.jsx'
import { getCategoryPage, getViews } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { countBadge } from '../api/format.js'
import { CategoryMark } from './categoryMark.jsx'

/* What a saved view holds (2g): the order list's address, without the view it was opened from. */
export const VIEW_KEYS = ['q', 'vendor', 'category', 'status', 'receipt', 'files', 'discounted', 'period', 'from', 'to', 'kind', 'min', 'max', 'sort', 'view']

/** An address as a view compares it: only what a view holds, in one order. */
export function canonical(params) {
	const given = new URLSearchParams(params)
	const out = new URLSearchParams()
	for (const key of VIEW_KEYS) { const value = given.get(key); if (value) out.set(key, value) }
	out.sort()
	return out.toString()
}

/** Where a view opens: the order list with its address, naming the view it came from. */
export const viewLink = view => `/orders?${view.query ? `${view.query}&` : ''}saved=${encodeURIComponent(view.id)}`

/** All orders, as the rail and the sidebar link to it: the list with nothing filtered. */
export const ALL_ORDERS = '/orders?saved=all'

export const useViews = () => useApi(getViews)

const GROUPS = { status: 'status', vendor: 'vendor', category: 'category', min: 'amount', max: 'amount', receipt: 'other', files: 'other', discounted: 'other', kind: 'other' }
const ICON = { status: 'clock', vendor: 'building-store', amount: 'wallet' }

/** A view's mark, derived from what it filters (2g): one facet group gives that group's glyph, a
    single category borrows the category's own mark, the date alone is the calendar, else the bookmark. */
export function ViewMark({ query }) {
	const p = new URLSearchParams(query)
	const groups = [...new Set([...p.keys()].map(k => GROUPS[k]).filter(Boolean))]
	const dated = p.has('period') || p.has('from') || p.has('to')
	const ids = groups.length === 1 && groups[0] === 'category' ? p.get('category').split(',') : []
	const one = ids.length === 1 && ids[0] !== 'none' ? ids[0] : null
	const category = useApi(getCategoryPage, [{ ids: one, pageSize: 1 }], { enabled: Boolean(one) }).data?.categories[0]
	if (one && category) return <CategoryMark category={category} size="small" />
	const icon = groups.length === 1 ? ICON[groups[0]] ?? 'bookmark' : groups.length ? 'bookmark' : dated ? 'calendar' : 'bookmark'
	return <span className="sp-nav-item__icon"><Icon name={icon} /></span>
}

/** The saved views under All orders in the sidebar (9e), each with its live count, then how many
    more the order list holds. Gone on the rail, where icons alone cannot tell views apart. */
export function SidebarViews({ rail, savedId }) {
	const answer = useViews().data
	if (rail || !answer) return null
	// the view open now is listed even past the chosen number (Settings 11a)
	const shown = answer.views.filter((v, i) => i < answer.shown || v.id === savedId)
	const more = answer.views.length - shown.length
	return (
		<>
			{shown.map(view => (
				<NavItem key={view.id} to={viewLink(view)} mark={<ViewMark query={view.query} />} current={savedId === view.id}
					count={countBadge(view.count)} countColor={view.attention ? 'warning' : undefined}
					aria-label={`${view.name}, ${countBadge(view.count)}`}>{view.name}</NavItem>
			))}
			{more > 0 ? <NavItem mark={<span className="sp-nav-item__icon" />} sub={`${more} more in Orders`} /> : null}
		</>
	)
}
