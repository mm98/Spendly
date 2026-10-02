import { ICONS } from './icons.js'

/* One glyph from the register, by name. Its colour is the control's own ink and its size the
   design's default, so a caller states neither unless the drawing asks for another size. */

export function Icon({ name, size = 16 }) {
	const paths = ICONS[name]
	if (!paths) {
		console.error(`<Icon> "${name}" is not in the register`)
		return null
	}
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
			strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
			{paths.map(d => <path d={d} key={d} />)}
		</svg>
	)
}
