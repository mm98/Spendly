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
	{ key: 'Draft', name: 'Draft', tone: 'neutral' },
	{ key: 'Ordered', name: 'Ordered', tone: 'progress' },
	{ key: 'Delivered', name: 'Delivered', tone: 'success' },
	{ key: 'Returned', name: 'Returned', tone: 'danger' },
	{ key: 'Cancelled', name: 'Cancelled', tone: 'neutral' }
]

/** The account's statuses, in its order: `{ key, name, tone, builtIn, orders }`. */
export function useStatuses() {
	return useApi(getStatuses).data ?? FIRST
}
