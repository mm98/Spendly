/* The colours a vendor or a category gets when nobody picked one.

   A vendor takes one of the design's eight swatches (c2), stored as the swatch's hex in SWATCHES,
   the same as a picked one, so the app draws it as the swatch in the reader's scheme and theme.
   Category colours are swatches, legend dots and donut segments -- read against the card
   rather than written on, so they are free to be brighter, and they are chosen to differ
   from each other, which is the whole job of a data-viz palette. README: Color. */

export const CATEGORY_PALETTE = [
	'#C43F2A', '#E9C517', '#8B5CF6', '#1FA8E0', '#F09A38',
	'#2FA36B', '#D34F2E', '#7A8B2E', '#E0568A', '#45524C'
]

/** The design's eight swatches by name, as the hex the app stores, in the order the colour picker
    shows them. The same list as react/src/app/categoryMark.jsx. */
export const SWATCH_COLOURS = {
	primary: '#1d4d33',
	'primary-2': '#2f7a51',
	'primary-3': '#4f7f63',
	'primary-4': '#8caf97',
	'amber-ink': '#7a5c23',
	'amber-2': '#d3b98a',
	'red-ink': '#8a4a41',
	'ink-6': '#b3b1a9'
}
export const SWATCHES = Object.values(SWATCH_COLOURS)

/** A stable swatch for a name, so the same vendor is the same colour on every page without
    storing a choice nobody made. Two names can land on one swatch -- that is a hash, not an
    allocation. Migration 286 works out the same sum in SQL: keep the two the same. */
export const colourFor = name =>
	SWATCHES[[...String(name)].reduce((n, c) => n + c.charCodeAt(0), 0) % SWATCHES.length]

/** The i-th colour, wrapping. For a caller creating a known set in one go: distinct for as
    many entries as the palette is long. */
export const nthColour = (i, palette) => palette[i % palette.length]

/** The first swatch no colour in `worn` uses; past eight, the one worn least, first in order on a tie. */
export function nextUnused(worn) {
	const count = new Map(SWATCHES.map(h => [h, 0]))
	for (const colour of worn) {
		const hex = String(colour ?? '').toLowerCase()
		if (count.has(hex)) count.set(hex, count.get(hex) + 1)
	}
	return [...count].reduce((a, b) => (b[1] < a[1] ? b : a))[0]
}

/** A stored colour as an email paints it: a swatch takes its light value in the reader's scheme
    `tokens`, any other colour, and a swatch no scheme turns (ink-6), is painted as stored. */
export function emailColour(stored, tokens) {
	const name = Object.keys(SWATCH_COLOURS).find(n => SWATCH_COLOURS[n] === String(stored ?? '').toLowerCase())
	return (name && tokens[`--${name}`]) || stored
}

// WCAG's relative luminance and contrast ratio, as react/src/components/colour.js works out a mark's ink
const luminance = hex => {
	const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
		.map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (ink, fill) => {
	const [a, b] = [luminance(ink), luminance(fill)].sort((x, y) => y - x)
	return (a + 0.05) / (b + 0.05)
}

/** The light theme's ink on `fill` (#rrggbb), white or near black, as an email draws a mark: the one
    that reaches 4.5:1, and the stronger one when both or neither do, white on a tie. */
export function inkOn(fill) {
	if (!/^#[0-9a-f]{6}$/i.test(fill)) return '#ffffff'
	const [white, dark] = [contrast('#ffffff', fill), contrast('#1b1a17', fill)]
	if (white >= 4.5 && dark < 4.5) return '#ffffff'
	if (dark >= 4.5 && white < 4.5) return '#1b1a17'
	return white >= dark ? '#ffffff' : '#1b1a17'
}
