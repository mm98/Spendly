/* The colours a vendor or a category gets when nobody picked one.

   This lived twice -- the same six-entry PALETTE and the same colourFor were copied into
   routes/vendors.js and lib/findOrCreate.js, so a vendor created by saving the form and a
   vendor created by importing an order agreed only for as long as nobody edited one copy.
   One list, read by both.

   Vendor colours carry white initials on an avatar, so every one of them is dark enough to read
   under APCA: measured 76.7 Lc (#877364, the lightest) to 93.4 (#235553), against a floor of 45.
   Category colours are swatches, legend dots and donut segments -- read against the card
   rather than written on, so they are free to be brighter, and they are chosen to differ
   from each other, which is the whole job of a data-viz palette. README: Color. */

export const VENDOR_PALETTE = [
	'#235553', '#877364', '#177DA7', '#AD620D', '#8453F5', '#4F5BD5',
	'#1F7A4D', '#A8324A', '#3E5C8A', '#6B4E9E', '#B4552B', '#2C6E6B'
]

export const CATEGORY_PALETTE = [
	'#C43F2A', '#E9C517', '#8B5CF6', '#1FA8E0', '#F09A38',
	'#2FA36B', '#D34F2E', '#7A8B2E', '#E0568A', '#45524C'
]

/** A stable colour for a name, so the same vendor is the same colour on every page without
    storing a choice nobody made. Two names can still land on one colour -- that is a hash,
    not an allocation; use `nthColour` where the caller knows the whole set up front and can
    hand out distinct ones instead. */
export const colourFor = (name, palette = VENDOR_PALETTE) =>
	palette[[...String(name)].reduce((n, c) => n + c.charCodeAt(0), 0) % palette.length]

/** The i-th colour, wrapping. For a caller creating a known set in one go: distinct for as
    many entries as the palette is long, which is what "every vendor a different colour"
    actually requires and what a hash cannot promise. */
export const nthColour = (i, palette = VENDOR_PALETTE) => palette[i % palette.length]

/** The design's eight swatches, in the order the colour picker shows them (react/src/app/categoryMark.jsx). */
export const SWATCHES = ['#1d4d33', '#2f7a51', '#4f7f63', '#8caf97', '#7a5c23', '#d3b98a', '#8a4a41', '#b3b1a9']

/** The first swatch no colour in `worn` uses; past eight, the one worn least, first in order on a tie. */
export function nextUnused(worn) {
	const count = new Map(SWATCHES.map(h => [h, 0]))
	for (const colour of worn) {
		const hex = String(colour ?? '').toLowerCase()
		if (count.has(hex)) count.set(hex, count.get(hex) + 1)
	}
	return [...count].reduce((a, b) => (b[1] < a[1] ? b : a))[0]
}

// APCA's screen luminance, as react/src/components/colour.js works out a mark's ink
const luminance = hex => {
	const [r, g, b] = [1, 3, 5].map(i => (parseInt(hex.slice(i, i + 2), 16) / 255) ** 2.4)
	const y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
	return y < 0.022 ? y + (0.022 - y) ** 1.414 : y
}
const contrast = (ink, fill) => {
	const [t, b] = [luminance(ink), luminance(fill)]
	return Math.abs((b > t ? b ** 0.56 - t ** 0.57 : b ** 0.65 - t ** 0.62) * 1.14)
}

/** The light theme's ink that reads better on `fill` (#rrggbb), white or near black, as an email draws a mark. */
export const inkOn = fill => (!/^#[0-9a-f]{6}$/i.test(fill) || contrast('#ffffff', fill) >= contrast('#1b1a17', fill) ? '#ffffff' : '#1b1a17')

