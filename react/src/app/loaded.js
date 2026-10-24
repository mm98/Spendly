import { arrive } from '../components/motion.js'

/* Fades in what replaces a loading placeholder, for every page: an element added where, in the
   same render, one holding a placeholder left. */

const PLACEHOLDER = '.sp-skeleton'

const heldPlaceholder = node => node.nodeType === 1 && (node.matches(PLACEHOLDER) || node.querySelector(PLACEHOLDER))

/** Watches `root` and fades in what replaces a placeholder; returns the stop. */
export function markLoaded(root) {
	const watcher = new MutationObserver(records => {
		const lost = new Set(records.filter(r => [...r.removedNodes].some(heldPlaceholder)).map(r => r.target))
		if (!lost.size) return
		for (const r of records)
			if (lost.has(r.target))
				for (const node of r.addedNodes)
					if (node.nodeType === 1 && node.isConnected && !heldPlaceholder(node)) {
						arrive(node)
					}
	})
	watcher.observe(root, { childList: true, subtree: true })
	return () => watcher.disconnect()
}
