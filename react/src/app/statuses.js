import { orderStatuses } from '../api/client.js'

/* What a status looks like, by its tone: the four looks the pill has (11a). */
export const TONES = {
	success: { color: 'success' },
	progress: { state: 'progress' },
	danger: { color: 'danger' },
	neutral: {}
}

const TONE_OF = { Ordered: 'progress', Delivered: 'success', Returned: 'danger' }
const FIXED = orderStatuses.map(key => ({ key, name: key, tone: TONE_OF[key] ?? 'neutral' }))

/** The account's statuses, in their order: `{ key, name, tone }`. */
export function useStatuses() {
	return FIXED
}
