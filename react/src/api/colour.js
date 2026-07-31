

const resolved = new Map()

const expand = hex => (hex.length === 4
	? '#' + [...hex.slice(1)].map(c => c + c).join('')
	: hex)

export function resolveColour(value) {
	if (!value) return '#000000'
	const text = String(value).trim()
	if (!text.startsWith('var(')) return expand(text)
	const name = text.slice(4, -1).split(',')[0].trim()
	if (resolved.has(name)) return resolved.get(name)
	const hex = typeof document === 'undefined'
		? '#000000'
		: expand(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000000')
	resolved.set(name, hex)
	return hex
}

const channel = n => (n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4)

export function luminance(hex) {
	const value = expand(String(hex).trim())
	if (!/^#[0-9a-f]{6}$/i.test(value)) return 0
	const [r, g, b] = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255)
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(a, b) {
	const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
	return (x + 0.05) / (y + 0.05)
}

const INK_DARK = '#0B0F0D'
const INK_LIGHT = '#FFFFFF'

export function inkOn(fill) {
	const hex = resolveColour(fill)
	return contrast(INK_LIGHT, hex) >= contrast(INK_DARK, hex) ? INK_LIGHT : INK_DARK
}

export const inkContrast = fill => contrast(inkOn(fill), resolveColour(fill))
