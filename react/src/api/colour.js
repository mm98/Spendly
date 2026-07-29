/* Colour arithmetic, for the two places a colour the user picked has to carry something on
   top of it: the glyph on a category tile and the initials on a vendor avatar.

   Both are `color:#fff` in the stylesheet, which is right for the eight values the palette
   shipped with and wrong the moment any colour is allowed. Picking the ink from the fill is
   what makes an open colour picker safe to offer -- otherwise the first pale yellow anyone
   chooses produces a tile with an invisible glyph, and nothing in the app would say so: an
   icon is not text, so a contrast checker walks straight past it.

   It also fixes one the palette already had. --icon-yellow is #E9C517, and white on it is
   1.66:1 -- the Electronics tile has always been a white glyph you cannot really see. The
   same rule that protects a chosen colour repairs that one.

   The formula is sRGB relative luminance, which is arithmetic and needs no DOM. Resolving a
   `var(--token)` does need one, so that part reads the custom property off the document and
   remembers it. */

const resolved = new Map()

const expand = hex => (hex.length === 4
	? '#' + [...hex.slice(1)].map(c => c + c).join('')
	: hex)

/** `var(--icon-red)` -> `#C43F2A`; a hex passes through. Read from the stylesheet rather than
    copied here, so a token that changes there changes here too. */
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

/** WCAG relative luminance. Takes a hex; anything else it cannot read comes back as black. */
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

const INK_DARK = '#0B0F0D'    // --text-strong
const INK_LIGHT = '#FFFFFF'

/** Whichever of the two inks reads better on this fill. Ties go to white, which is what the
    stylesheet assumes and what the eight palette colours all resolve to anyway. */
export function inkOn(fill) {
	const hex = resolveColour(fill)
	return contrast(INK_LIGHT, hex) >= contrast(INK_DARK, hex) ? INK_LIGHT : INK_DARK
}

/** What a chosen colour is worth, for a picker that would rather say so than not. */
export const inkContrast = fill => contrast(inkOn(fill), resolveColour(fill))
