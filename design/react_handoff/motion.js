import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, LazyMotion, MotionConfig, animate, domMax, m, useIsPresent, useMotionValue, useReducedMotionConfig } from 'motion/react'

/* Motion's settings, read from tokens.css. The stylesheet stays the only place the pace is written:
   this file reads --motion-in, --motion-out, --ease-enter, --ease-exit, --motion-rise and --motion-slide
   off :root the first time a part moves, after the stylesheet has applied, and turns them into Motion's
   units (seconds, a cubic-bezier array, pixels). A token that is missing is reported and moves nothing,
   rather than falling back to a number written here. */

let read = null

const seconds = raw => {
	const n = parseFloat(raw)
	return !Number.isFinite(n) ? null : raw.endsWith('ms') ? n / 1000 : raw.endsWith('s') ? n : n / 1000
}
const curve = raw => {
	const at = raw.match(/cubic-bezier\(([^)]+)\)/)
	const four = at ? at[1].split(',').map(Number) : []
	return four.length === 4 && four.every(Number.isFinite) ? four : null
}

/** The motion tokens in Motion's units: `{ in, out, enter, exit, rise, slide }`. Read once. */
export function pace() {
	if (read) return read
	const css = getComputedStyle(document.documentElement)
	const token = name => css.getPropertyValue(name).trim()
	const got = {
		in: seconds(token('--motion-in')),
		out: seconds(token('--motion-out')),
		enter: curve(token('--ease-enter')),
		exit: curve(token('--ease-exit')),
		rise: parseFloat(token('--motion-rise')),
		slide: parseFloat(token('--motion-slide'))
	}
	const missing = Object.entries(got).filter(([, v]) => v == null || Number.isNaN(v)).map(([k]) => k)
	if (missing.length) {
		console.error(`motion.js: tokens.css has no usable ${missing.join(', ')}; those parts do not move`)
		for (const k of missing) got[k] = k === 'enter' || k === 'exit' ? 'linear' : 0
	}
	read = got
	return read
}

/** The way in and the way out, as Motion transitions. */
export const into = (times = 1) => ({ duration: pace().in * times, ease: pace().enter })
export const away = () => ({ duration: pace().out, ease: pace().exit })

/* What each kind of part does as it arrives and leaves. A function, since the tokens are read late.
   Spread on an m element: <m.div {...PRESENCE.dialog()} />. */
export const PRESENCE = {
	// a floating panel drops the last --motion-rise from its trigger, rising when placed above it
	panel: up => ({
		initial: { opacity: 0, y: up ? pace().rise : -pace().rise },
		animate: { opacity: 1, y: 0, transition: into() },
		exit: { opacity: 0, y: up ? pace().rise : -pace().rise, transition: away() }
	}),
	scrim: () => ({
		initial: { opacity: 0 },
		animate: { opacity: 1, transition: into() },
		exit: { opacity: 0, transition: away() }
	}),
	// a dialog grows the last 2% into place over the scrim
	dialog: () => ({
		initial: { opacity: 0, scale: 0.98 },
		animate: { opacity: 1, scale: 1, transition: into() },
		exit: { opacity: 0, scale: 0.98, transition: away() }
	}),
	// a sheet rises from the bottom edge and goes back down it
	sheet: () => ({
		initial: { y: '100%' },
		animate: { y: 0, transition: into() },
		exit: { y: '100%', transition: away() }
	}),
	// a row the reader adds drops in; one removed fades where it stood, then the rows below glide up
	row: () => ({
		initial: { opacity: 0, y: -pace().rise },
		animate: { opacity: 1, y: 0, transition: into() },
		exit: { opacity: 0, transition: away() }
	}),
	chip: () => ({
		initial: { opacity: 0, scale: 0.8 },
		animate: { opacity: 1, scale: 1, transition: into() },
		exit: { opacity: 0, scale: 0.8, transition: away() }
	})
}

/** A marker moving to a new place (the segmented selection, a radio row's tint, the sidebar's current
    row) and a row gliding to a new place both take the way in. */
export const glide = () => into()

/** Lists glide their rows only up to this many: past it the moves are too many to follow, and the
    layout work too costly. */
export const GLIDE_MAX = 60

/** Whether this tree is set to move less: the shell's one setting, for the few parts that animate
    a number or a list of elements rather than an element's own style. */
export function useStill() {
	return !!useReducedMotionConfig()
}

/** Motion for the whole app, once, around the shell (and the Storybook decorator): the full feature
    set (domMax, what layoutId, layout and drag need) loads with the app, so the first page switch
    slides its markers and a part closed at once still runs its way out; and a reader who asks the system for less motion gets it everywhere,
    with no component checking for itself. Under it, transforms and layout moves are off and fades stay.
    @param {object} props
    @param {import('react').ReactNode} [props.children] The app. */
export function MotionShell({ children }) {
	return (
		<LazyMotion features={domMax} strict>
			<MotionConfig reducedMotion="user" transition={into()}>{children}</MotionConfig>
		</LazyMotion>
	)
}

/** Keeps a panel that is always mounted, and shown by its host's data-open, drawn while it closes:
    returns `closing`, which the host spreads as data-closing="true", and runs the panel in and out.
    `panel` is a ref, or an object whose `current` finds the panel. Run after the panel is placed,
    so a panel placed above its trigger rises. Internal. */
export function usePanelMotion(panel, open) {
	const still = useStill()
	const [was, setWas] = useState(open)
	const [closing, setClosing] = useState(false)
	if (was !== open) { setWas(open); setClosing(!open) }
	useLayoutEffect(() => {
		const el = panel.current
		if (!el || (!open && !closing)) return
		const up = el.getAttribute('data-place') === 'up'
		const from = still ? 0 : up ? pace().rise : -pace().rise
		const run = open
			? animate(el, { opacity: [0, 1], y: [from, 0] }, into())
			: animate(el, { opacity: 0, y: from }, away())
		if (!open) run.then(() => setClosing(false))
		return () => run.stop()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open])
	return closing
}

/* inside a Leaving, a part that is on its way out: it takes no more presses */
const Going = createContext(false)

/** True inside a part that is leaving. Internal. */
export const useGoing = () => useContext(Going)

function Present({ children }) {
	const here = useIsPresent()
	return <Going.Provider value={!here}>{children}</Going.Provider>
}

/** Presence for one part shown on a condition: what it held stays drawn while its way out runs.
    Internal: `Leaving` (Overlays.jsx) is this, for pages.
    @param {object} props
    @param {() => void} [props.onGone] Called once the part has gone.
    @param {import('react').ReactNode} [props.children] The part, or nothing. */
export function Presence({ onGone, children }) {
	return (
		<AnimatePresence initial={false} onExitComplete={onGone}>
			{children ? <Present key="shown">{children}</Present> : null}
		</AnimatePresence>
	)
}

/** A body that folds by height: a card's body under its toggle, a facet group's values. It grows to
    its height as it opens and back to nothing as it closes, clipped only while it moves, so a menu
    inside it is never cut off once it is open.
    @param {object} props
    @param {boolean} props.open Whether it is unfolded.
    @param {import('react').ReactNode} [props.children] What folds. */
export function Fold({ open, children }) {
	return (
		<AnimatePresence initial={false}>
			{open
				? (
					<m.div className="sp-fold" key="fold"
						initial={{ height: 0, opacity: 0, overflow: 'clip' }}
						animate={{ height: 'auto', opacity: 1, transition: into(), transitionEnd: { overflow: 'visible' } }}
						exit={{ height: 0, opacity: 0, overflow: 'clip', transition: away() }}>
						{children}
					</m.div>
				)
				: null}
		</AnimatePresence>
	)
}

// a list of rows that move: whether they glide, set by the list
const RowsOf = createContext(null)

/** A list whose rows arrive, leave and glide to new places: wrap the rows, keyed, in it. Rows loaded
    with the list do not animate; one added later drops in, one removed fades and the rest glide up,
    and after a sort or a filter each row glides to its new place. Past `GLIDE_MAX` rows nothing glides.
    A field's values are the same thing in a line: `kind="chip"` grows a chip in and shrinks it out.
    @param {object} props
    @param {number} props.count How many rows the list shows.
    @param {'row' | 'chip'} [props.kind] `row` for ListItem, ListRow and Record; `chip` for a field's Chip values.
    @param {import('react').ReactNode} [props.children] The rows, each with its key. */
export function Rows({ count, kind = 'row', children }) {
	const [value] = useState(() => ({}))
	value.glide = count <= GLIDE_MAX
	value.kind = kind
	return <RowsOf.Provider value={value}><AnimatePresence initial={false}>{children}</AnimatePresence></RowsOf.Provider>
}

/** What a row spreads on its m element inside `Rows`: presence, the glide, and, while it leaves,
    no presses and nothing read out. Outside `Rows`, nothing. A row in a ReorderList passes it to
    `itemOf` instead, which keeps the drag's own layout. Internal. */
export function useRow() {
	const rows = useContext(RowsOf)
	const here = useIsPresent()
	if (!rows) return {}
	return {
		...PRESENCE[rows.kind](),
		layout: rows.glide ? 'position' : false,
		transition: glide(),
		...(here ? {} : { inert: true, 'aria-hidden': 'true' })
	}
}

/** Fades in what replaced a loading placeholder. Called by the app's markLoaded on each element that
    took a placeholder's place; reduced motion still fades, as the shell's setting does. */
export function arrive(node) {
	animate(node, { opacity: [0, 1] }, into())
}

/** Counts a figure from its last value to its new one over twice --motion-in, calling `onFrame` with
    each value and the last value at the end. Returns the stop. Under reduced motion, the last at once. */
export function count(from, to, still, onFrame) {
	if (still) { onFrame(to); return () => {} }
	const run = animate(from, to, { ...into(2), onUpdate: onFrame })
	return () => run.stop()
}

/** Runs the sidebar's labels in or out: they arrive with the column from --motion-slide to the left,
    and leave the same way before it closes. `done` is called when the run ends. */
export function slideLabels(nav, way, still, done) {
	const labels = nav.querySelectorAll(':scope .sp-nav-item > :not(.sp-nav-item__icon):not(.sp-mark), :scope .sp-sidebar__brand > :not(.sp-mark), :scope .sp-sidebar__group')
	if (!labels.length || still) { done?.(); return () => {} }
	const run = way === 'in'
		? animate(labels, { opacity: [0, 1], x: [-pace().slide, 0] }, into())
		: animate(labels, { opacity: [1, 0], x: [0, -pace().slide] }, away())
	run.then(() => done?.())
	return () => run.stop()
}

export { AnimatePresence, animate, m, useMotionValue }
