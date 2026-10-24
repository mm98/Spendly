import { ICONS } from './icons.js'

/* One glyph from the register, by name. Its colour is the control's own ink and its size the
   design's default, so a caller states neither unless the drawing asks for another size. */

/** @typedef {keyof typeof ICONS} IconName */

/** @param {object} props
    @param {IconName} props.name
    @param {number} [props.size] */
export function Icon({ name, size = 16 }) {
	const paths = ICONS[name]
	if (!paths) {
		console.error(`<Icon> "${name}" is not in the register`)
		return null
	}
	return <Glyph paths={paths} size={size} />
}

// the marks scripts/sync-icons.mjs puts on a path Tabler draws other than as a plain line
const MARKS = { '*': { fill: 'currentColor' }, '#': { fill: 'currentColor', stroke: 'none' }, '~': { style: { opacity: 'var(--fade-icon-tone)' } } }

/** A Tabler icon from its paths, each drawn on its own as Tabler draws it.
    @param {object} props
    @param {string[]} props.paths
    @param {number} props.size */
export function Glyph({ paths, size }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
			strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
			{paths.map((d, i) => (MARKS[d[0]] ? <path d={d.slice(1)} {...MARKS[d[0]]} key={i} /> : <path d={d} key={i} />))}
		</svg>
	)
}
