/* Marks what replaces a loading placeholder data-loaded, for every page: an element added where, in the
   same render, one holding a placeholder left. Set before the first paint, which the fade needs. */

const PLACEHOLDER = '.sp-skeleton'

const heldPlaceholder = node => node.nodeType === 1 && (node.matches(PLACEHOLDER) || node.querySelector(PLACEHOLDER))

/** Watches `root` and marks what replaces a placeholder `data-loaded="true"`; returns the stop. */
export function markLoaded(root) {
	const watcher = new MutationObserver(records => {
		const lost = new Set(records.filter(r => [...r.removedNodes].some(heldPlaceholder)).map(r => r.target))
		if (!lost.size) return
		for (const r of records)
			if (lost.has(r.target))
				for (const node of r.addedNodes)
					if (node.nodeType === 1 && node.isConnected && !heldPlaceholder(node)) {
						node.setAttribute('data-loaded', 'true')
						// a layout read in the page may have styled it already, spending the fade's start; placed again, it
						// starts from it. Never one holding focus, which a move would drop.
						if (!node.contains(document.activeElement)) node.parentNode.insertBefore(node, node.nextSibling)
					}
	})
	watcher.observe(root, { childList: true, subtree: true })
	return () => watcher.disconnect()
}
