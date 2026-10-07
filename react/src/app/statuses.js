import { getStatuses } from '../api/client.js'
import { useApi } from '../api/useApi.js'

/* What a status looks like, by its tone: the four looks the pill has (11a). */
export const TONES = {
	success: { color: 'success' },
	progress: { state: 'progress' },
	danger: { color: 'danger' },
	neutral: {}
}

// the five every account starts with, drawn until the account's own list arrives
const FIRST = [
	{ key: 'Draft', name: 'Draft', type: 'draft', tone: 'neutral' },
	{ key: 'Ordered', name: 'Ordered', type: 'ordered', tone: 'progress' },
	{ key: 'Delivered', name: 'Delivered', type: 'delivered', tone: 'success', ownDate: true },
	{ key: 'Returned', name: 'Returned', type: 'custom', tone: 'danger', ownDate: true },
	{ key: 'Cancelled', name: 'Cancelled', type: 'custom', tone: 'neutral' }
]

/** The account's statuses, in its order: `{ key, name, type, tone, ownDate, builtIn, orders }`. */
export function useStatuses() {
	return useApi(getStatuses).data ?? FIRST
}
