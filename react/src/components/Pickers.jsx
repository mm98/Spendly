import { useEffect, useMemo, useRef, useState } from 'react'
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
   api/tabler/ from the package at build time. The 39 in Icon.jsx are the ones the interface
   itself draws; they are not the limit on what a category may be.

   Three things keep that affordable. The catalogue is imported on demand, when the picker
   first renders, so it costs nothing on first paint. Its names and its paths are separate
   chunks, and only the shards holding what is about to be drawn are fetched -- this grid never
   shows more than 240 tiles, so pulling all 800 kB of path data to fill it was paying for
   5,128 glyphs to render one. And what a chosen icon needs in order to be *drawn* -- the path
   string -- is stored on the record with it, so the lists, the rings and the rows never load
   a shard at all. See api/tabler.js. */

/** The most tiles the grid will draw for one search. A scroller holding five thousand of them
    is a wall, not a choice -- and it is also the number that decides how many shards a
    keystroke can pull. */
const LIMIT = 240

/** The app's own glyphs, in the order the unsearched grid lists them. Icon.jsx draws these by
    name, so they cost no shard at all. */
const BUILT_IN = Object.keys(ICONS).sort()

/** The palette a category or a vendor can be. Tokens where the system has one, so a category
    coloured "red" is the same red as the one in the donut. */
export const CATEGORY_COLOURS = [
	{ id: 'var(--icon-red)', label: 'Red' },
	{ id: 'var(--icon-yellow)', label: 'Yellow' },
	{ id: 'var(--icon-purple)', label: 'Purple' },
	{ id: 'var(--donut-blue)', label: 'Blue' },
	{ id: 'var(--donut-orange)', label: 'Orange' },
	{ id: 'var(--green)', label: 'Green' },
	{ id: 'var(--teal)', label: 'Teal' },
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
	const native = useRef(null)
	const chosen = colours.some(c => c.id === value)
	const hex = resolveColour(value)

	const swatch = (on, background) => ({
		width: 30, height: 30, background, borderColor: background,
		/* The selected one is ringed rather than ticked: a check mark inside a swatch has to
		   survive every background it can be given, and on the yellow it does not. */
		boxShadow: on ? '0 0 0 2px var(--bg-card), 0 0 0 4px var(--text-strong)' : undefined
	})

	return (
		<div className="row-inline" role="group" aria-label={label} style={{ gap: 6, flexWrap: 'wrap' }}>
			{colours.map(colour => (
				<button key={colour.id} type="button" className="icon-button"
					aria-label={colour.label} aria-pressed={colour.id === value}
					onClick={() => onChange(colour.id)}
					style={swatch(colour.id === value, colour.id)} />
			))}

			{/* Anything else. The button is the swatch the system draws; the input behind it is
			    the one the platform draws, opened by a click on the button. */}
			<button type="button" className="icon-button"
				aria-label={chosen ? 'Pick another colour' : `Custom colour ${hex}`}
				aria-pressed={!chosen}
				onClick={() => native.current?.click()}
				style={{
					...swatch(!chosen, chosen ? 'var(--bg-card)' : value),
					color: chosen ? 'var(--text-body)' : inkOn(value)
				}}>
				<Icon name={chosen ? 'plus' : 'pencil'} />
			</button>
			<input ref={native} type="color" value={hex} aria-label={`${label}, custom`}
				onChange={e => onChange(e.target.value)}
				tabIndex={-1} aria-hidden="true"
				style={{
					position: 'absolute', width: 1, height: 1, border: 0, padding: 0,
					opacity: 0, pointerEvents: 'none', overflow: 'hidden', clip: 'rect(0 0 0 0)'
				}} />

			{/* What the choice is worth, since a colour can be picked that its own contents cannot
			    survive. The ink flips automatically; this says which way and by how much. */}
			<span className="field-help" style={{ alignSelf: 'center', marginLeft: 4 }}>
				{chosen ? null : `${hex.toUpperCase()} · ${inkContrast(value).toFixed(1)}:1`}
			</span>
		</div>
	)
}

/** A searchable grid of every Tabler outline icon.

    `onChange` hands back the name and the path together, because the record stores both: the
    name is what the summary line reads back and what a future search matches, the path is what
    every row that draws the category needs. Handing back a name alone would mean every page
    loading the catalogue to look it up. */
export function IconPicker({ value, onChange, label = 'Icon' }) {
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

	/* The names the grid will draw, and the shards their paths are in. NAMES is sorted and
	   lower-case by construction -- they are the package's own file names -- so this walks in
	   display order and stops at the cap, rather than filtering the set and sorting after. */
	const hits = useMemo(() => {
		const needle = query.trim().toLowerCase()
		if (!needle) return { names: BUILT_IN, shards: [], capped: false }
		if (!catalogue) return { names: [], shards: [], capped: false }

		const names = []
		const shards = new Set()
		for (let i = 0; i < catalogue.NAMES.length && names.length < LIMIT; i++) {
			if (!catalogue.NAMES[i].includes(needle)) continue
			names.push(catalogue.NAMES[i])
			shards.add(catalogue.shardOf(i))
		}
		return { names, shards: [...shards], capped: names.length === LIMIT }
	}, [query, catalogue])

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
	const total = catalogue ? catalogue.NAMES.length : BUILT_IN.length
	const waiting = names.some(name => !paths[name] && !ICONS[name])

	return (
		<div style={{ display: 'grid', gap: 8 }}>
			<FieldShell style={{ height: 38 }}>
				<Icon name="search" />
				<input type="search" value={query} placeholder={`Search ${total.toLocaleString('da-DK')} icons…`}
					aria-label="Search icons" onChange={e => setQuery(e.target.value)} />
			</FieldShell>
			<div role="radiogroup" aria-label={label} aria-busy={waiting || undefined}
				style={{
					display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))',
					gap: 6, maxHeight: 168, overflowY: 'auto', padding: 2
				}}>
				{names.map(name => {
					const on = name === value
					/* The app's own 39 are drawn from Icon.jsx and handed back without a path,
					   since Icon.jsx knows them by name; everything else is drawn from, and
					   stored as, the string its shard carried. A tile whose shard is still in
					   flight holds its size and refuses the click -- an icon that cannot be
					   seen is not a choice that can be made. */
					const d = paths[name] ?? ICONS[name]
					return (
						<button key={name} type="button" className="icon-button"
							role="radio" aria-checked={on} aria-label={name} disabled={!d}
							onClick={() => onChange(name, paths[name])}
							style={{
								width: '100%', height: 34,
								background: on ? 'var(--bg-dark)' : 'var(--bg-card)',
								color: on ? '#fff' : 'var(--text-body)',
								borderColor: on ? 'var(--bg-dark)' : 'var(--border-control)'
							}}>
							{d
								? <Icon name={name} path={d} />
								: <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" />}
						</button>
					)
				})}
				{names.length === 0
					? <p className="field-help" style={{ gridColumn: '1 / -1' }}>No icon matches "{query}".</p>
					: null}
			</div>
			{/* What the grid is showing, since it is a window on to five thousand and not the
			    whole set: a count that says "39 of 5.129" is the difference between a short list
			    and a broken one. */}
			<span className="field-help">
				{query.trim()
					? `${names.length}${hits.capped ? '+' : ''} of ${total.toLocaleString('da-DK')} icons match.`
					: catalogue
						? `The ${names.length} the app itself uses. Search all ${total.toLocaleString('da-DK')}.`
						: `The ${names.length} the app itself uses. Loading the rest…`}
			</span>
		</div>
	)
}

/** What the choice will look like, at the size it is used at. */
export const CategoryPreview = ({ icon, iconPath, colour, name }) => (
	<div className="data-row category-row" style={{ pointerEvents: 'none' }}>
		<span className="category-icon" style={{ background: colour, color: inkOn(colour) }}>
			<Icon name={icon} path={iconPath} /></span>
		<div>
			<div className="category-row-title">{name || 'Your category'}</div>
			<div className="category-row-meta">how it will look in the list</div>
		</div>
	</div>
)
