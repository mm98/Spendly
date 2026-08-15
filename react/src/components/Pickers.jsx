import { useEffect, useMemo, useState } from 'react'
import { Icon, ICONS } from './Icon.jsx'
import { FieldShell } from './Form.jsx'
import { inkContrast, inkOn, resolveColour } from '../api/colour.js'

/* Choosing a category's glyph and a vendor's colour.

   Both were assigned by the app and neither could be changed: a new category took whatever
   colour was next in the palette and the tag glyph regardless of what it was for, and a
   vendor's colour came out of a hash of its name. That is a value the user can see, cannot
   explain, and cannot correct.

   Neither picker invents a control. The icon grid is `.icon-button` in the size the system
   already uses, the search above it is the same `.field-shell` as every other search, and the
   swatches are `.icon-button` too, filled. Nothing new is drawn.

   The eight swatches are the system's own palette, one click each -- a category coloured red is
   the same red as the donut's. They are not the limit: the last swatch opens the platform's
   colour picker, so any colour at all is a choice. It is a real `input[type=color]`, kept
   visually hidden with a swatch button in front of it rather than styled directly: stripping
   the native chrome means `-webkit-appearance` and two vendor-prefixed pseudo-elements, and a
   prefix names the engine that invented the feature rather than one that obeys you. Letting
   the platform draw its own dialog needs no such bet.

   Whatever is chosen, the glyph or the initials on top of it are inked from it -- see
   ../api/colour.js. An open picker without that is a tile whose contents can vanish.

   The icons on offer are the whole Tabler outline set -- 5,129 of them, generated into
   api/tabler/ from the package at build time. The 39 in Icon.jsx are chrome -- a chevron, a
   trash can, the glyphs the interface itself draws -- and no help in naming a category, so the
   grid does not suggest them. What it suggests instead, before a search, is whatever icon a
   category already carries: real choices another category made, not the app's own furniture.

   Three things keep that affordable. The catalogue is imported on demand, when the picker
   first renders, so it costs nothing on first paint. Its names and its paths are separate
   chunks, and only the shards holding what is about to be drawn are fetched -- this grid never
   shows more than 240 tiles, so pulling all 800 kB of path data to fill it was paying for
   5,128 glyphs to render one. And what a chosen icon needs in order to be *drawn* -- the path
   string -- is stored on the record with it, so the lists, the rings and the rows never load
   a shard at all, and neither does the picker's own default view. See api/tabler.js. */

/** The most tiles the grid will draw for one search. A scroller holding five thousand of them
    is a wall, not a choice -- and it is also the number that decides how many shards a
    keystroke can pull. */
const LIMIT = 240

/** The palette a category or a vendor can be -- the same hex the system's own tokens resolve
    to (a category coloured "red" is the same red as the one in the donut), copied here rather
    than passed as `var(--icon-red)` and the like. A stored `var(...)` reference needs a browser
    with this app's own stylesheet loaded to mean anything -- resolveColour()
    (../api/colour.js) exists only to paper over that at read time -- where a plain hex, the
    form VENDOR_COLOURS below already used, is a value on its own. */
export const CATEGORY_COLOURS = [
	{ id: '#C43F2A', label: 'Red' },
	{ id: '#E9C517', label: 'Yellow' },
	{ id: '#8B5CF6', label: 'Purple' },
	{ id: '#1FA8E0', label: 'Blue' },
	{ id: '#F09A38', label: 'Orange' },
	{ id: '#14AC72', label: 'Green' },
	{ id: '#07625E', label: 'Teal' },
	{ id: '#45524C', label: 'Slate' }
]

/** Vendor avatars are a solid tile behind two white letters, so these are the darker end --
    the same values the seeded vendors use. */
export const VENDOR_COLOURS = [
	{ id: '#235553', label: 'Pine' },
	{ id: '#877364', label: 'Clay' },
	{ id: '#177DA7', label: 'Ocean' },
	{ id: '#AD620D', label: 'Amber' },
	{ id: '#8453F5', label: 'Violet' },
	{ id: '#4F5BD5', label: 'Indigo' },
	{ id: '#0E7A52', label: 'Forest' },
	{ id: '#B3261E', label: 'Rust' }
]

/** A row of filled swatches, and the platform's picker at the end of it. `aria-pressed` is the
    state, because each one is a toggle in a set of toggles rather than a tab: nothing changes
    view when you press it. */
export function ColourPicker({ value, onChange, colours = CATEGORY_COLOURS, label }) {
	const chosen = colours.some(c => c.id === value)
	const hex = resolveColour(value)

	/* The colour is the data, so it stays on the element; the size and the selection ring are
	   the stylesheet's (.colour-swatch -- the ring survives every background a swatch can be
	   given, where a check mark inside it does not). */
	const swatch = background => ({ background, borderColor: background })

	return (
		<div className="row-inline colour-picker" role="group" aria-label={label}>
			{colours.map(colour => (
				<button key={colour.id} type="button" className="icon-button colour-swatch"
					aria-label={colour.label} aria-pressed={colour.id === value}
					onClick={() => onChange(colour.id)}
					style={swatch(colour.id)} />
			))}

			{/* Anything else. The swatch below is drawn to look like the row's other buttons; the
			    real control is the platform's own input, stacked on top of it at the same size
			    so a tap lands on the input directly rather than on a stand-in that proxies the
			    open with a JS .click() -- a synthetic click reaching a fully hidden input never
			    carried a trusted touch activation on to it, and iOS Safari's colour sheet does
			    not open for that. Kept invisible rather than styled, same as before: stripping
			    the native chrome needs a -webkit-appearance hack and two vendor-prefixed
			    pseudo-elements per engine, and letting the platform draw its own dialog needs no
			    such bet. */}
			<span className="colour-picker-custom">
				<span aria-hidden="true"
					className={['icon-button colour-swatch colour-picker-face', !chosen && 'is-on'].filter(Boolean).join(' ')}
					style={{
						...swatch(chosen ? 'var(--bg-card)' : value),
						color: chosen ? 'var(--text-body)' : inkOn(value)
					}}>
					<Icon name={chosen ? 'plus' : 'pencil'} />
				</span>
				<input type="color" value={hex} className="colour-picker-input"
					aria-label={chosen ? 'Pick another colour' : `Custom colour ${hex}`}
					onChange={e => onChange(e.target.value)} />
			</span>

			{/* What the choice is worth, since a colour can be picked that its own contents cannot
			    survive. The ink flips automatically; this says which way and by how much. */}
			<span className="field-help colour-picker-contrast">
				{chosen ? null : `${hex.toUpperCase()} · ${inkContrast(value).toFixed(1)}:1`}
			</span>
		</div>
	)
}

/** A searchable grid of every Tabler outline icon.

    `onChange` hands back the name and the path together, because the record stores both: the
    name is what the summary line reads back and what a future search matches, the path is what
    every row that draws the category needs. Handing back a name alone would mean every page
    loading the catalogue to look it up.

    `usedIcons` is the caller's own records -- one `{name, path}` per icon a category already
    carries, deduplicated -- and is what the grid shows before a search. `path` travels with
    each one already, so the default view draws without fetching a single shard. */
export function IconPicker({ value, onChange, label = 'Icon', usedIcons = [] }) {
	const [query, setQuery] = useState('')
	const [catalogue, setCatalogue] = useState(null)
	const [paths, setPaths] = useState({})

	/* Imported here rather than at the top of the module: 5,129 names belong in the chunk that
	   opens with the picker instead of the one that paints the app. */
	useEffect(() => {
		let live = true
		import('../api/tabler.js').then(m => { if (live) setCatalogue(m) })
		return () => { live = false }
	}, [])

	const usedByName = useMemo(() => new Map(usedIcons.map(u => [u.name, u.path ?? null])), [usedIcons])

	/* The names the grid will draw, and the shards their paths are in. NAMES is sorted and
	   lower-case by construction -- they are the package's own file names -- so this walks in
	   display order and stops at the cap, rather than filtering the set and sorting after. */
	const hits = useMemo(() => {
		const needle = query.trim().toLowerCase()
		if (!needle) return { names: [...usedByName.keys()], shards: [], capped: false }
		if (!catalogue) return { names: [], shards: [], capped: false }

		const names = []
		const shards = new Set()
		for (let i = 0; i < catalogue.NAMES.length && names.length < LIMIT; i++) {
			if (!catalogue.NAMES[i].includes(needle)) continue
			names.push(catalogue.NAMES[i])
			shards.add(catalogue.shardOf(i))
		}
		return { names, shards: [...shards], capped: names.length === LIMIT }
	}, [query, catalogue, usedByName])

	/* Fetch the path data for what is about to be drawn, and nothing else. A shard already on
	   hand resolves from cache and merges to the same object, so a held-down key does not
	   re-render the grid once per keystroke. */
	useEffect(() => {
		if (!catalogue) return undefined
		let live = true
		for (const shard of hits.shards) {
			catalogue.loadShard(shard).then(loaded => {
				if (!live) return
				setPaths(known => {
					const [first] = Object.keys(loaded)
					return first in known ? known : { ...known, ...loaded }
				})
			})
		}
		return () => { live = false }
	}, [catalogue, hits])

	const names = hits.names
	const total = catalogue ? catalogue.NAMES.length : null
	const waiting = names.some(name => !paths[name] && !usedByName.has(name) && !ICONS[name])

	return (
		<div className="icon-picker">
			<FieldShell>
				<Icon name="search" />
				<input type="search" value={query}
					placeholder={total ? `Search ${total.toLocaleString('da-DK')} icons…` : 'Search icons…'}
					aria-label="Search icons" onChange={e => setQuery(e.target.value)} />
			</FieldShell>
			<div role="radiogroup" className="icon-picker-grid" aria-label={label} aria-busy={waiting || undefined}>
				{names.map(name => {
					const on = name === value
					/* A used icon's path travels with the record that already carries it, so the
					   default grid resolves without a shard; a searched one is drawn from, and
					   stored as, the string its shard carried. A tile whose shard is still in
					   flight holds its size and refuses the click -- an icon that cannot be
					   seen is not a choice that can be made. */
					const d = paths[name] ?? usedByName.get(name) ?? ICONS[name]
					return (
						<button key={name} type="button" className="icon-button icon-picker-tile"
							role="radio" aria-checked={on} aria-label={name} disabled={!d}
							onClick={() => onChange(name, d)}>
							{d
								? <Icon name={name} path={d} />
								: <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" />}
						</button>
					)
				})}
				{names.length === 0
					? <p className="field-help icon-picker-empty">
						{query.trim() ? `No icon matches "${query}".` : 'No category has an icon yet -- search to pick one.'}
					</p>
					: null}
			</div>
			{/* What the grid is showing, since it is a window on to five thousand and not the
			    whole set: a count that says "6 of 5,129" is the difference between a short list
			    and a broken one. */}
			<span className="field-help">
				{query.trim()
					? `${names.length}${hits.capped ? '+' : ''} of ${(total ?? 0).toLocaleString('da-DK')} icons match.`
					: names.length === 0
						? null
						: total
							? `${names.length} already used by a category. Search all ${total.toLocaleString('da-DK')}.`
							: `${names.length} already used by a category. Loading the rest…`}
			</span>
		</div>
	)
}

/** What the choice will look like, at the size it is used at. */
export const CategoryPreview = ({ icon, iconPath, colour, name }) => (
	<div className="data-row category-row category-preview">
		<span className="category-icon" style={{ background: colour, color: inkOn(colour) }}>
			<Icon name={icon} path={iconPath} /></span>
		<div>
			<div className="category-row-title">{name || 'Your category'}</div>
			<div className="category-row-meta">how it will look in the list</div>
		</div>
	</div>
)
