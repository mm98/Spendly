import { Fragment, useEffect, useRef } from 'react'
import { Button } from '../components/Button.jsx'
import { Kbd } from '../components/Utilities.jsx'
import { Dialog, DialogActions, DialogTitle } from '../components/Overlays.jsx'
import { MAC } from './useMedia.js'

const MOD = MAC ? '⌘' : 'Ctrl'

// "G then a letter" opens a section, in the sidebar's order (9d); Ask only while it is set up
const GO_KEYS = [
	['o', 'orders', '/orders', 'Orders'],
	['t', 'statistics', '/statistics', 'Statistics'],
	['v', 'vendors', '/vendors', 'Vendors'],
	['c', 'categories', '/categories', 'Categories'],
	['a', 'ask', '/ask', 'Ask'],
	['s', 'settings', '/settings', 'Settings']
]
const goKeys = asks => GO_KEYS.filter(([, key]) => asks || key !== 'ask')
const CHORD_MS = 1500

/* Only keys the app really answers to. Each row is one sentence and the keys that do it. */
const groupsFor = asks => [
	['Anywhere', [
		['Open or close search', [[MOD, 'K']]],
		['Scan a receipt', [['S']]],
		['New order', [['N']]],
		...goKeys(asks).map(([key, , , name]) => [`Go to ${name}`, [['G'], [key.toUpperCase()]], 'then']),
		['Show this list', [['?']]],
		['Close a window or a menu', [['Esc']]],
		['Undo, when a message offers it', [[MOD, 'Z']]]
	]],
	['In search', [
		['Move through the results', [['↑'], ['↓']]],
		['Open the marked result', [['↵']]],
		['Open it in a new tab', [[MOD, '↵']]]
	]],
	['On a page', [
		['Open the calendar in a date field', [['Alt', '↓']]],
		['Save an item line', [['↵']]],
		['Save an item line and start the next', [[MOD, '↵']]],
		['Next or previous picture', [['←'], ['→']]]
	]]
]

/** The list of keyboard shortcuts, opened with ? or from the account menu (9c). */
export function ShortcutSheet({ asks = false, onClose }) {
	return (
		<Dialog onCancel={onClose}>
			<DialogTitle>Keyboard shortcuts</DialogTitle>
			<div className="ns-keys-list sp-scrolls">
				{groupsFor(asks).map(([label, rows]) => (
					<div key={label} className="ns-keys">
						<span className="sp-section-label">{label}</span>
						{rows.map(([what, keys, joiner]) => (
							<div key={what} className="ns-keys__row">
								<span className="sp-meta">{what}</span>
								<span className="ns-keys__caps">
									{keys.map((cap, i) => (
										<Fragment key={i}>
											{i ? <span className="sp-meta">{joiner ?? 'or'}</span> : null}
											{cap.map(k => <Kbd key={k}>{k}</Kbd>)}
										</Fragment>
									))}
								</span>
							</div>
						))}
					</div>
				))}
			</div>
			<DialogActions>
				<Button size="small" onClick={onClose}>Done</Button>
			</DialogActions>
		</Dialog>
	)
}

const typing = el => !!el?.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"]')

/** ? opens the list, S scans, N starts an order and G then a letter opens a section - never while
    the reader types. Without `onScan`, S does nothing. */
export function useShortcutKeys({ enabled, asks = false, onSheet, onGo, onScan, onNew }) {
	const chord = useRef(0)
	const calls = useRef(null)
	calls.current = { asks, onSheet, onGo, onScan, onNew }
	useEffect(() => {
		if (!enabled) return
		const key = ev => {
			if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey || typing(ev.target)) return
			const k = ev.key.toLowerCase()
			if (chord.current > Date.now()) {
				chord.current = 0
				const go = goKeys(calls.current.asks).find(([letter]) => letter === k)
				if (go) { ev.preventDefault(); calls.current.onGo(go[1], go[2]) }
				return
			}
			if (ev.key === '?') { ev.preventDefault(); calls.current.onSheet() }
			else if (ev.shiftKey) return
			else if (k === 'g') chord.current = Date.now() + CHORD_MS
			else if (k === 's' && calls.current.onScan) { ev.preventDefault(); calls.current.onScan() }
			else if (k === 'n') { ev.preventDefault(); calls.current.onNew() }
		}
		document.addEventListener('keydown', key)
		return () => document.removeEventListener('keydown', key)
	}, [enabled])
}
