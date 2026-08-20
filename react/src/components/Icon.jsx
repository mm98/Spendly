import { memo, useState } from 'react'

/* Every glyph in the app, in one registry.

   The prototype repeats each path wherever the icon appears -- the chevron 30 times, the
   receipt 13 -- which is the drift the uniformity rule is about: 40 distinct paths spread
   over 200-odd copies, where fixing one means finding them all. Naming them here makes the
   count a fact you can read off this object, and <Icon name> the only way to draw one.

   Stroke, join and cap live in the .icon rule in the stylesheet, so this element carries
   the geometry and nothing else. See README: Icons. */

export const ICONS = {
	receipt: "M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2m4 -14h6m-6 4h6m-2 4h2",
	home: "M5 12l-2 0l9 -9l9 9l-2 0 M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7 M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6",
	store: "M3 21l18 0 M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4 M5 21l0 -10.15 M19 21l0 -10.15 M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4",
	tag: "M6.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M3 6v5.172a2 2 0 0 0 .586 1.414l7.71 7.71a2.41 2.41 0 0 0 3.408 0l5.592 -5.592a2.41 2.41 0 0 0 0 -3.408l-7.71 -7.71a2 2 0 0 0 -1.414 -.586h-5.172a3 3 0 0 0 -3 3",
	chart: "M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6 M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10 M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14 M4 20h14",
	chevronLeft: "M15 6l-6 6l6 6",
	search: "M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-6 -6",
	scan: "M8 12h8 M8 9h6 M8 15h4 M3 7v-2a2 2 0 0 1 2 -2h2 M3 17v2a2 2 0 0 0 2 2h2 M17 3h2a2 2 0 0 1 2 2v2 M17 21h2a2 2 0 0 0 2 -2v-2",
	plus: "M12 5l0 14 M5 12l14 0",
	chevronRight: "M9 6l6 6l-6 6",
	pencil: "M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4 M13.5 6.5l4 4",
	check: "M5 12l5 5l10 -10",
	cart: "M10 14a2 2 0 1 0 4 0a2 2 0 0 0 -4 0 M5.001 8h13.999a2 2 0 0 1 1.977 2.304l-1.255 7.152a3 3 0 0 1 -2.966 2.544h-9.512a3 3 0 0 1 -2.965 -2.544l-1.255 -7.152a2 2 0 0 1 1.977 -2.304 M17 10l-2 -6 M7 10l2 -6",
	plug: "M9.785 6l8.215 8.215l-2.054 2.054a5.81 5.81 0 1 1 -8.215 -8.215l2.054 -2.054 M4 20l3.5 -3.5 M15 4l-3.5 3.5 M20 9l-3.5 3.5",
	display: "M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10 M7 20h10 M9 16v4 M15 16v4",
	trendUp: "M3 17l6 -6l4 4l8 -8 M14 7l7 0l0 7",
	bolt: "M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11",
	sparkles: "M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6",
	settings: "M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065 M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0",
	document: "M14 3v4a1 1 0 0 0 1 1h4 M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2 M9 9l1 0 M9 13l6 0 M9 17l6 0",
	chevronDown: "M6 9l6 6l6 -6",
	starFilled: "M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z",
	calendar: "M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z M16 3v4 M8 3v4 M4 11h16",
	close: "M18 6l-12 12 M6 6l12 12",
	photo: "M15 8h.01 M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12 M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5 M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3",
	grip: "M8 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M8 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M8 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M14 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M14 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M14 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
	cube: "M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5 M12 12l8 -4.5 M12 12l0 9 M12 12l-8 -4.5 M16 5.25l-8 4.5",
	trash: "M4 7l16 0 M10 11l0 6 M14 11l0 6 M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12 M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3",
	reorder: "M3 9l4 -4l4 4m-4 -4v14 M21 15l-4 4l-4 -4m4 4v-14",
	undo: "M9 14l-4 -4l4 -4 M5 10h11a4 4 0 1 1 0 8h-1",
	alert: "M12 9v4 M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0 M12 16h.01",
	dots: "M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
	filters: "M4 6h16 M6 12h12 M9 18h6",
	star: "M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873l-6.158 -3.245",
	discount: "M16 17a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M6 7a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M6 18l12 -12",
	upload: "M12 5l0 14 M18 11l-6 -6 M6 11l6 -6",
	camera: "M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2 M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0",
	eye: "M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0 M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6",
	trendDown: "M3 7l6 6l4 -4l8 8 M21 10l0 7l-7 0",
	download: "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2 M7 11l5 5l5 -5 M12 4l0 12"
}

/** The 24x24 line icon used everywhere. `title` makes it a labelled image; without one it
    is decorative and hidden from the accessibility tree, which is right for a glyph sitting
    beside its own text. */
export const Icon = memo(function Icon({ name, path, className = 'icon', title, ...rest }) {
	/* `path` is the glyph itself rather than a name for one. A category may be given any of
	   Tabler's 5,129 outline icons, and the record stores the path it chose -- so drawing it
	   costs nothing but the string already on the record, and no page has to load the
	   catalogue in order to render a list. See api/tabler.js. */
	const d = path ?? ICONS[name]
	if (!d) throw new Error('No icon named ' + name)   // a typo fails here rather than drawing nothing
	return (
		<svg className={className || undefined} viewBox="0 0 24 24" role={title ? 'img' : undefined}
			aria-hidden={title ? undefined : true} {...rest}>
			{title ? <title>{title}</title> : null}
			<path d={d}></path>
		</svg>
	)
})

export default Icon

/** A real preview image where one exists, the same named icon everywhere else draws otherwise.
    Falls back to the icon with no request at all when `src` is empty, and falls back again if
    the image fails to load (a thumbnail that hasn't finished generating, a network hiccup) —
    every place that shows a receipt preview alongside an icon fallback uses this one component
    rather than each inventing its own <img>-with-onError. */
export function ImageOrIcon({ src, icon, alt = '', className, imgClassName }) {
	const [failed, setFailed] = useState(false)
	if (src && !failed) return <img src={src} alt={alt} className={imgClassName} onError={() => setFailed(true)} />
	return <Icon name={icon} className={className} />
}
