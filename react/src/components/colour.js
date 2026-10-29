// WCAG 2 relative luminance
const Y = hex => {
	const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const expand = hex => (/^#[0-9a-f]{3}$/i.test(hex) ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex)

/** WCAG contrast ratio of an ink on a fill, 1-21. A mark's 13px bold letters need 4.5. */
export function contrastRatio(ink, fill) {
	const [a, b] = [Y(expand(ink)), Y(expand(fill))]
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const root = () => document.documentElement
const read = name => getComputedStyle(root()).getPropertyValue(name).trim()
const worked = new Map()

/** Which of the theme's two inks, --surface or --ink, goes on a fill: one of the design's swatch
    names, or a colour the reader picked (#rrggbb). The one that reaches 4.5:1; if both or neither
    do, the one with the higher contrast. A tie keeps --surface. */
export function inkFor(fill) {
	const key = `${root().dataset.theme}|${root().dataset.scheme}|${fill}`
	if (!worked.has(key)) {
		const ground = fill.startsWith('#') ? fill : read(`--${fill}`)
		const [s, i] = [contrastRatio(read('--surface'), ground), contrastRatio(read('--ink'), ground)]
		worked.set(key, s >= 4.5 && i < 4.5 ? 'surface' : i >= 4.5 && s < 4.5 ? 'ink' : s >= i ? 'surface' : 'ink')
	}
	return worked.get(key)
}

// the theme and scheme each ink was worked out in, so a mark works it out again when either changes
export const themeNow = () => `${root().dataset.theme ?? ''}|${root().dataset.scheme ?? ''}`
let watcher = null
const told = new Set()
export function onThemeChange(fn) {
	told.add(fn)
	watcher ??= new MutationObserver(() => told.forEach(f => f()))
	watcher.observe(root(), { attributes: true, attributeFilter: ['data-theme', 'data-scheme'] })
	return () => { told.delete(fn); if (!told.size) { watcher.disconnect(); watcher = null } }
}
