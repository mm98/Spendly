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

   The measure is APCA, and only APCA. It is arithmetic; only resolving a `var(--token)` needs a
   DOM, so that part reads the custom property off the document and remembers it. */

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

const INK_DARK = '#0B0F0D'    // --text-strong
const INK_LIGHT = '#FFFFFF'

/* APCA, because the older ratio overrates dark ink on saturated mid-tones. Sign says which way
   round the pair is; only the size counts here. README: Colour. */
const Y = hex => {
	const [r, g, b] = [1, 3, 5].map(i => (parseInt(hex.slice(i, i + 2), 16) / 255) ** 2.4)
	const y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
	return y < 0.022 ? y + (0.022 - y) ** 1.414 : y
}

/** APCA lightness contrast, |Lc| 0-106. Roughly: 45 carries a bold glyph, 60 body text. */
export function lightnessContrast(ink, fill) {
	const [t, b] = [Y(expand(ink)), Y(resolveColour(fill))]
	const s = (b > t ? b ** 0.56 - t ** 0.57 : b ** 0.65 - t ** 0.62) * 1.14
	return Math.abs(s) < 0.1 ? 0 : Math.abs((s > 0 ? s - 0.027 : s + 0.027) * 100)
}

/** Whichever of the two inks reads better on this fill. Ties go to white, which is what the
    stylesheet assumes. */
export function inkOn(fill) {
	return lightnessContrast(INK_LIGHT, fill) >= lightnessContrast(INK_DARK, fill) ? INK_LIGHT : INK_DARK
}

/* No `inkContrast` export: swept all three channels in steps of 4 and no colour's better ink
   falls under 45, so a picker has nothing to warn about. docs/defects.md carries the numbers. */
