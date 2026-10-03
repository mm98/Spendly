// APCA's screen luminance, with its soft clamp near black
const Y = hex => {
	const [r, g, b] = [1, 3, 5].map(i => (parseInt(hex.slice(i, i + 2), 16) / 255) ** 2.4)
	const y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
	return y < 0.022 ? y + (0.022 - y) ** 1.414 : y
}
const expand = hex => (/^#[0-9a-f]{3}$/i.test(hex) ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex)

/** APCA lightness contrast of an ink on a fill, |Lc| 0-106: about 45 carries a bold glyph, 60 body text. */
export function lightnessContrast(ink, fill) {
	const [t, b] = [Y(expand(ink)), Y(expand(fill))]
	const s = (b > t ? b ** 0.56 - t ** 0.57 : b ** 0.65 - t ** 0.62) * 1.14
	return Math.abs(s) < 0.1 ? 0 : Math.abs((s > 0 ? s - 0.027 : s + 0.027) * 100)
}

const root = () => document.documentElement
const read = name => getComputedStyle(root()).getPropertyValue(name).trim()
const worked = new Map()

/** Which of the theme's two inks, --surface or --ink, reads better on a fill: one of the design's
    swatch names, or a colour the reader picked (#rrggbb). A tie keeps --surface. */
export function inkFor(fill) {
	const key = `${root().dataset.theme}|${fill}`
	if (!worked.has(key)) {
		const ground = fill.startsWith('#') ? fill : read(`--${fill}`)
		worked.set(key, lightnessContrast(read('--surface'), ground) >= lightnessContrast(read('--ink'), ground) ? 'surface' : 'ink')
	}
	return worked.get(key)
}

// the theme each ink was worked out in, so a mark works it out again when the theme changes
export const themeNow = () => root().dataset.theme ?? ''
let watcher = null
const told = new Set()
export function onThemeChange(fn) {
	told.add(fn)
	watcher ??= new MutationObserver(() => told.forEach(f => f()))
	watcher.observe(root(), { attributes: true, attributeFilter: ['data-theme'] })
	return () => { told.delete(fn); if (!told.size) { watcher.disconnect(); watcher = null } }
}
