import { useState } from 'react'
import { peek } from '../api/useApi.js'
import { getCurrentUser } from '../api/client.js'

/* Which cards a reader folded, remembered per page in this browser for each account (c10). */

const keyOf = (page, card) => `spendly:folded:${peek(getCurrentUser)?.id ?? ''}:${page}:${card}`

const read = (page, card, fallback) => {
	try {
		const kept = localStorage.getItem(keyOf(page, card))
		return kept === null ? fallback : kept === 'folded'
	} catch { return fallback }
}

/** `[folded, setFolded]` for one card on one page; `setFolded(value, { keep: false })` folds or
    opens it for now only, as a save does when it opens a card on a field to fix. */
export function useFolded(page, card, fallback = false) {
	const [folded, setFolded] = useState(() => read(page, card, fallback))
	const set = (value, { keep = true } = {}) => {
		setFolded(was => {
			const next = typeof value === 'function' ? value(was) : value
			if (keep) try { localStorage.setItem(keyOf(page, card), next ? 'folded' : 'open') } catch { /* storage denied: this visit only */ }
			return next
		})
	}
	return [folded, set]
}
