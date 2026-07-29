import { useMemo, useState } from 'react'
import { Icon, ICONS } from './Icon.jsx'
import { FieldShell } from './Form.jsx'

/* Choosing a category's glyph and a vendor's colour.

   Both were assigned by the app and neither could be changed: a new category took whatever
   colour was next in the palette and the tag glyph regardless of what it was for, and a
   vendor's colour came out of a hash of its name. That is a value the user can see, cannot
   explain, and cannot correct.

   Neither picker invents a control. The icon grid is `.icon-button` in the size the system
   already uses, the search above it is the same `.field-shell` as every other search, and the
   swatches are `.icon-button` too, filled. Nothing new is drawn.

   The icons on offer are the app's own set -- the 39 glyphs in Icon.jsx, which are Tabler
   outline paths carried over from the prototype. Offering the whole Tabler library means
   taking the dependency and shipping several thousand paths for a picker; this offers what
   the app can actually draw, and every one of them is a glyph already verified against the
   design system's stroke and size. */

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

/** A row of filled swatches. `aria-pressed` is the state, because each one is a toggle in a
    set of toggles rather than a tab: nothing changes view when you press it. */
export function ColourPicker({ value, onChange, colours = CATEGORY_COLOURS, label }) {
	return (
		<div className="row-inline" role="group" aria-label={label} style={{ gap: 6, flexWrap: 'wrap' }}>
			{colours.map(colour => {
				const on = colour.id === value
				return (
					<button key={colour.id} type="button" className="icon-button"
						aria-label={colour.label} aria-pressed={on}
						onClick={() => onChange(colour.id)}
						style={{
							width: 30, height: 30, background: colour.id, borderColor: colour.id,
							/* The selected one is ringed rather than ticked: a check mark inside a
							   swatch has to survive eight backgrounds, and on the yellow it does not. */
							boxShadow: on ? '0 0 0 2px var(--bg-card), 0 0 0 4px var(--text-strong)' : undefined
						}} />
				)
			})}
		</div>
	)
}

/** A searchable grid of every glyph the app can draw. */
export function IconPicker({ value, onChange, label = 'Icon' }) {
	const [query, setQuery] = useState('')
	const names = useMemo(() => {
		const needle = query.trim().toLowerCase()
		const all = Object.keys(ICONS).sort()
		return needle ? all.filter(n => n.toLowerCase().includes(needle)) : all
	}, [query])

	return (
		<div style={{ display: 'grid', gap: 8 }}>
			<FieldShell style={{ height: 38 }}>
				<Icon name="search" />
				<input type="search" value={query} placeholder="Search icons…"
					aria-label="Search icons" onChange={e => setQuery(e.target.value)} />
			</FieldShell>
			<div role="radiogroup" aria-label={label}
				style={{
					display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))',
					gap: 6, maxHeight: 168, overflowY: 'auto', padding: 2
				}}>
				{names.map(name => {
					const on = name === value
					return (
						<button key={name} type="button" className="icon-button"
							role="radio" aria-checked={on} aria-label={name}
							onClick={() => onChange(name)}
							style={{
								width: '100%', height: 34,
								background: on ? 'var(--bg-dark)' : 'var(--bg-card)',
								color: on ? '#fff' : 'var(--text-body)',
								borderColor: on ? 'var(--bg-dark)' : 'var(--border-control)'
							}}>
							<Icon name={name} />
						</button>
					)
				})}
				{names.length === 0
					? <p className="field-help" style={{ gridColumn: '1 / -1' }}>No icon matches "{query}".</p>
					: null}
			</div>
		</div>
	)
}

/** What the choice will look like, at the size it is used at. */
export const CategoryPreview = ({ icon, colour, name }) => (
	<div className="data-row category-row" style={{ pointerEvents: 'none' }}>
		<span className="category-icon" style={{ background: colour }}><Icon name={icon} /></span>
		<div>
			<div className="category-row-title">{name || 'Your category'}</div>
			<div className="category-row-meta">how it will look in the list</div>
		</div>
	</div>
)
