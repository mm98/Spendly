import { useSyncExternalStore } from 'react'

// The reader's own choice wins over the system's; with none, the system decides.
const KEY = 'spendly:theme'
const system = matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set()

const chosen = () => { try { return localStorage.getItem(KEY) } catch { return null } }
export const currentTheme = () => chosen() ?? (system.matches ? 'dark' : 'light')

// the browser's own bar takes the top bar's ground
const paintBar = () => {
	const meta = document.querySelector('meta[name="theme-color"]')
	const surface = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()
	if (meta && surface) meta.content = surface
}

export function applyTheme() {
	document.documentElement.dataset.theme = currentTheme()
	paintBar()
	for (const fn of listeners) fn()
}

export function followSystem() {
	try { localStorage.removeItem(KEY) } catch { /* storage denied */ }
	applyTheme()
}

/** The reader's choice: 'light', 'dark', or null when the system decides. */
export const chosenTheme = () => chosen()

export function setTheme(theme) {
	try { localStorage.setItem(KEY, theme) } catch { /* storage denied: this tab only */ }
	applyTheme()
}

system.addEventListener('change', applyTheme)

export function useTheme() {
	return useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn) }, currentTheme)
}

/** The lists' row density, a stored setting: compact draws each table row closer to the next. */
export const setDensity = density => {
	document.documentElement.dataset.density = density === 'compact' ? 'compact' : 'comfortable'
}
