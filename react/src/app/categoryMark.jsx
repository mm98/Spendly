import { Mark, initialsOf } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { ICONS } from '../components/icons.js'

/* The design's eight colours as the hex the app stores, at their light values, so a picked
   colour reads back as the same one in either theme. */
export const SWATCHES = {
	green: '#1d4d33',
	'green-2': '#2f7a51',
	'green-3': '#4f7f63',
	'green-4': '#8caf97',
	'amber-ink': '#7a5c23',
	'amber-2': '#d3b98a',
	'red-ink': '#8a4a41',
	'ink-6': '#b3b1a9'
}

/** A stored colour as a mark and the picker take it: one of the eight by name, or the colour itself. */
export function swatchOf(hex) {
	const value = String(hex ?? '').toLowerCase()
	const named = Object.keys(SWATCHES).find(name => SWATCHES[name] === value)
	return named ?? (/^#[0-9a-f]{6}$/.test(value) ? value : 'green')
}
export const storedColour = name => SWATCHES[name] ?? name

/** A glyph the register holds; any other stored icon is drawn as the tag every category starts with. */
export const glyphOf = icon => (ICONS[icon] ? icon : 'tag')

const GLYPH = { small: 13, medium: 19, large: 32 }

/** A category as the design draws it: its icon on its colour, the same on every page. */
export function CategoryMark({ category, size = 'medium' }) {
	return (
		<Mark size={size} fill="solid" swatch={swatchOf(category.colour)} aria-hidden="true" aria-label={category.name}>
			<Icon name={glyphOf(category.icon)} size={GLYPH[size]} />
		</Mark>
	)
}

/** A vendor as its lists draw it: its initials on the colour the vendor stored. */
export function VendorMark({ name, colour, size = 'medium' }) {
	return (
		<Mark size={size} fill="solid" swatch={swatchOf(colour)} aria-hidden="true" aria-label={name}>
			<span>{initialsOf(name)}</span>
		</Mark>
	)
}
