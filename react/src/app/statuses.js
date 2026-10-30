import { getStatuses } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { phrase } from '../language/phrases.js'

/* What a status looks like, by its tone: the four looks the pill has (11a). */
export const TONES = {
	success: { color: 'success' },
	progress: { state: 'progress' },
	danger: { color: 'danger' },
	neutral: {}
}

// the five every account starts with, drawn until the account's own list arrives
const first = () => [
	{ key: 'Draft', name: phrase('builtin.status.draft'), type: 'draft', tone: 'neutral', ownDate: true },
	{ key: 'Ordered', name: phrase('builtin.status.ordered'), type: 'ordered', tone: 'progress' },
	{ key: 'Delivered', name: phrase('builtin.status.delivered'), type: 'delivered', tone: 'success', ownDate: true },
	{ key: 'Returned', name: phrase('builtin.status.returned'), type: 'returned', tone: 'danger', ownDate: true },
	{ key: 'Cancelled', name: phrase('builtin.status.cancelled'), type: 'cancelled', tone: 'neutral', ownDate: true }
]

/** The account's statuses, in its order: `{ key, name, type, tone, ownDate, builtIn, orders }`. */
export function useStatuses() {
	return useApi(getStatuses).data ?? first()
}

/** An account's statuses by what they are to the app, not what they are called: `typeOf(key)` and `keyOf(type)`. */
export function useStatusTypes() {
	const list = useStatuses()
	return {
		typeOf: key => list.find(s => s.key === key)?.type ?? 'custom',
		keyOf: type => list.find(s => s.type === type)?.key
	}
}
