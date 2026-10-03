import { useEffect, useState } from 'react'
import { Mark, initialsOf } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Picker } from '../components/Choice.jsx'
import { ICONS } from '../components/icons.js'
import { COMMON, loadIndex, pathOf, searchIcons, useTablerPath, useTablerPaths } from '../components/tabler.js'

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

/** A category's icon: any Tabler outline icon by name, drawn as tag when Tabler has no such icon (c7). */
export function CategoryIcon({ name, size = 16 }) {
	return ICONS[name] ? <Icon name={name} size={size} /> : <LibraryIcon name={name} size={size} />
}

function LibraryIcon({ name, size }) {
	const d = useTablerPath(name)
	// nothing while its part loads, so the mark keeps its size and colour
	if (d === undefined) return null
	if (d === null) return <Icon name="tag" size={size} />
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
			strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
			<path d={d} />
		</svg>
	)
}

/** The name the picker shows as chosen: a saved name missing from Tabler opens on tag (c7). */
export const pickedIcon = name => (ICONS[name] || pathOf(name) ? name : pathOf(name) === null || !name ? 'tag' : name)

const PAGE = 48

/** The category icon picker (c7): 24 common icons, then search over the whole library, 48 at a time. */
export function CategoryIconPicker({ value, onChange }) {
	const [search, setSearch] = useState('')
	const [entries, setEntries] = useState(null)
	const [limit, setLimit] = useState(PAGE)
	useEffect(() => {
		let live = true
		loadIndex().then(all => { if (live) setEntries(all) })
		return () => { live = false }
	}, [])
	useTablerPath(value)
	const chosen = pickedIcon(value)
	const needle = search.trim()
	let names
	let more = false
	let waiting = 0
	if (!needle) names = COMMON.includes(chosen) ? COMMON : [chosen, ...COMMON]
	else if (entries) {
		const found = searchIcons(entries, needle)
		names = found.slice(0, limit)
		more = found.length > limit
	}
	else {
		// until the library's index arrives the search filters the icons already here
		names = searchIcons(COMMON.map(name => ({ name, category: '', words: [] })), needle)
		waiting = 8
	}
	useTablerPaths(names.filter(name => !ICONS[name]))
	const icons = [
		...names.map(name => (!ICONS[name] && pathOf(name) === undefined
			? { name, loading: true }
			: { name, icon: <CategoryIcon name={name} /> })),
		...Array.from({ length: waiting }, (_, i) => ({ name: `waiting-${i}`, loading: true }))
	]
	return (
		<Picker icons={icons} value={chosen} onChange={onChange}
			search={search} onSearch={v => { setSearch(v); setLimit(PAGE) }} searchLabel="Search icons…" noun="icons"
			more={more ? 'More' : undefined} onMore={() => setLimit(n => n + PAGE)}
			empty={entries && needle ? `No icon matches "${needle}". Try another word, in English.` : undefined} />
	)
}
CategoryIconPicker.fieldRole = 'group'

const GLYPH = { small: 13, medium: 19, large: 32 }

/** A category as the design draws it: its icon on its colour, the same on every page. */
export function CategoryMark({ category, size = 'medium' }) {
	return (
		<Mark size={size} fill="solid" swatch={swatchOf(category.colour)} aria-hidden="true" aria-label={category.name}>
			<CategoryIcon name={category.icon} size={GLYPH[size]} />
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
