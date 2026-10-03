import { Icon } from '../components/Icon.jsx'
import { NavItem } from '../components/Shell.jsx'
import { getCategories, getViews } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { amount } from '../api/format.js'
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

const GROUPS = { status: 'status', vendor: 'vendor', category: 'category', min: 'amount', max: 'amount', receipt: 'other', files: 'other', discounted: 'other', kind: 'other', q: 'other' }
const ICON = { status: 'clock', vendor: 'building-store', amount: 'wallet' }

/** A view's mark, derived from what it filters (2g): one facet group gives that group's glyph, a
    single category borrows the category's own mark, the date alone is the calendar, else the bookmark. */
export function ViewMark({ query }) {
	const categories = useApi(getCategories).data
	const p = new URLSearchParams(query)
	const groups = [...new Set([...p.keys()].map(k => GROUPS[k]).filter(Boolean))]
	const dated = p.has('period') || p.has('from') || p.has('to')
	if (groups.length === 1 && groups[0] === 'category') {
		const ids = p.get('category').split(',')
		const category = ids.length === 1 ? categories?.find(c => c.id === ids[0]) : null
		if (category) return <CategoryMark category={category} size="small" />
	}
	const icon = groups.length === 1 ? ICON[groups[0]] ?? 'bookmark' : groups.length ? 'bookmark' : dated ? 'calendar' : 'bookmark'
	return <span className="sp-nav-item__icon"><Icon name={icon} /></span>
}

/** The saved views under All orders in the sidebar (9e): the first few the account chose, each with
    its live count, then how many more the order list holds. Gone on the rail, where icons alone
    cannot tell views apart. */
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
					count={amount(view.count, 0)} countColor={view.attention ? 'warning' : undefined}
					aria-label={`${view.name}, ${amount(view.count, 0)}`}>{view.name}</NavItem>
			))}
			{more > 0 ? <NavItem mark={<span className="sp-nav-item__icon" />} sub={`${more} more in Orders`} /> : null}
		</>
	)
}
