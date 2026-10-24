import { useLayoutEffect, useRef, useState } from 'react'
import { join, pick, reject } from './variants.js'

/* The mark: the square that stands in for a thing - initials, an icon, a photo, or
   the absence of one. Three axes, none of which implies another: `size` is the box,
   `fill` is what is inside it, `swatch` is which colour a filled one takes.

   A mark that can be clicked renders a button and needs a label; a mark that opens
   a file picker renders a label wrapping the input. */

const SIZE = {
	small: 'sp-mark--small',
	medium: 'sp-mark--medium',
	large: 'sp-mark--large',
	xlarge: 'sp-mark--xlarge'
}

const FILL = {
	default: null,
	solid: 'sp-mark--solid',
	plain: 'sp-mark--plain',
	photo: 'sp-mark--photo',
	empty: 'sp-mark--empty',
	none: 'sp-mark--none',
	add: 'sp-mark--add'
}

const SWATCHES = ['green', 'green-2', 'green-3', 'green-4', 'green-5', 'amber-ink', 'amber-2', 'red-ink', 'ink-6']

/* Initials and colour are derived here, from the canonical name, and never passed
   in - that is what keeps one vendor looking the same in every list. A page that
   sliced the name itself got a different mark the first time it sliced differently,
   and two lists showing one vendor two ways is the defect this rule exists to stop.

   The rules are the library's: the first letter of the first two words, uppercased,
   accents kept - Ø stays Ø. One word takes its first two letters. */
const initialsOf = name => {
	const words = String(name).trim().split(/\s+/).filter(Boolean)
	if (!words.length) return ''
	if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase()
	return (words[0][0] + words[1][0]).toLocaleUpperCase()
}

/* A stable hash of the name over the eight colour swatches, so a vendor keeps its
   colour between sessions and between machines without anything being stored. The
   ninth swatch, the grey, is not in the rotation: it means "no colour" elsewhere. */
const DERIVED = SWATCHES.filter(s => s !== 'ink-6')
const swatchOf = name => {
	let hash = 0
	for (const ch of String(name)) hash = (hash * 31 + ch.codePointAt(0)) % 100000
	return DERIVED[hash % DERIVED.length]
}

/* The ink on a solid mark is worked out from its fill: whichever of the theme's two
   inks, --surface or --ink, has the higher APCA lightness contrast on it, a tie
   keeping --surface. The fill is read from the rendered mark, so the rule holds for
   every swatch at its value in the current theme and for any colour the reader picks. */
const channels = css => {
	const m = String(css).match(/[\d.]+/g)
	return m && m.length >= 3 ? m.slice(0, 3).map(Number) : null
}
const luminance = rgb => {
	const [r, g, b] = rgb.map(c => Math.pow(c / 255, 2.4))
	const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
	return y > 0.022 ? y : y + Math.pow(0.022 - y, 1.414)
}
// APCA 0.0.98G lightness contrast of text on a ground, as a magnitude
const contrast = (text, ground) => {
	const yt = luminance(text), yg = luminance(ground)
	if (yg > yt) {
		const c = (Math.pow(yg, 0.56) - Math.pow(yt, 0.57)) * 1.14
		return c < 0.1 ? 0 : (c - 0.027) * 100
	}
	const c = (Math.pow(yg, 0.65) - Math.pow(yt, 0.62)) * 1.14
	return c > -0.1 ? 0 : -(c + 0.027) * 100
}
export const inkOn = (fill, surface, ink) =>
	contrast(ink, fill) > contrast(surface, fill) ? 'ink' : 'surface'

const useInk = (paints, deps) => {
	const box = useRef(null)
	const [ink, setInk] = useState(null)
	useLayoutEffect(() => {
		const el = box.current
		if (!paints || !el) return setInk(null)
		const style = getComputedStyle(el)
		const fill = channels(style.backgroundColor)
		const resolve = name => {
			const probe = document.createElement('span')
			probe.style.color = `var(${name})`
			el.appendChild(probe)
			const value = channels(getComputedStyle(probe).color)
			probe.remove()
			return value
		}
		const surface = resolve('--surface'), dark = resolve('--ink')
		setInk(fill && surface && dark ? inkOn(fill, surface, dark) : null)
	}, [paints, ...deps])
	return [box, ink]
}


/**
 * @param {object} props
 * @param {MarkSize} props.size `xlarge` is the attachment size - the box an uploaded image is shown in, which was its own component until four of its nine rules turned out to be the mark's already.
 * @param {keyof typeof FILL} [props.fill]
 * @param {string} [props.swatch] Which colour a solid mark takes - a swatch name from the library's set. A colour the user picked outside the set is not a swatch: pass it as style={{ background }} and the ink is worked out from it the same way. For a mark whose colour the user picked; a mark with a `name` derives its own, so passing both is how two lists end up showing the same record in two colours.
 * @param {boolean} [props.round] A circle rather than a rounded square. The shape says what kind of thing it is - a person is a circle everywhere, a record is not - so it is the mark's own axis and not a consequence of what it holds.
 * @param {number} [props.count] Sits over the mark.
 * @param {string} [props.text] What the image is - a banner across the foot of the box, like a figtext. "Receipt", "PDF".
 * @param {string} [props.danger] Why it could not be kept, in the same banner. The colour is not a parameter: it follows from which of the two you passed, so a text cannot be red and a failure cannot be quiet.
 * @param {import('react').ReactNode} [props.remove] The control that takes an attachment away. Quiet until the box is hovered or holds focus. A mark with one cannot itself be a button, so passing `onClick` alongside it renders the opening control inside the box instead - a button inside a button is not a thing the browser draws.
 * @param {() => void} [props.onClick] Renders a button.
 * @param {'span' | 'label'} [props.as] a label wraps a file input, as a picker's hit target
 * @param {import('react').ReactNode} [props.children] What the mark stands for. A string - a record's own name - and the mark derives its initials and its colour from it, so one vendor looks the same in every list. An element instead, an icon, for a thing whose look the user picked. There is no prop for the name: the mark's accessible name is `aria-label`, and this is the thing itself.
 */
export function Mark({
	size,
	fill = 'default',
	swatch,
	round = false,
	count,
	text,
	danger,
	remove,
	onClick,
	as,
	children,
	...rest
}) {
	reject(rest, 'Mark')
	// a string is a name to derive from; an element is the thing to draw
	const derives = typeof children === 'string'
	/* A swatch only paints on a solid mark - every rule is scoped
	   `.sp-mark--solid[data-swatch]` - so nothing is derived or written for the fills
	   that draw their own ground. Otherwise a plain mark carried a dead attribute and
	   was told it had made a mistake for a call that is correct. */
	const paints = fill === 'solid'
	const chosen = paints ? (derives ? swatchOf(children) : swatch) : null
	const shown = derives ? initialsOf(children) : children
	if (derives && swatch) console.error('<Mark> a name derives its own colour: passing a swatch as well is how two lists show one record in two colours')
	// the passed one, not the derived one: only a caller can get this wrong
	if (swatch && !paints) console.error('<Mark> a swatch paints only a solid mark, so this one does nothing')
	if (swatch && !SWATCHES.includes(swatch)) console.error(`<Mark> swatch="${swatch}" is not one of: ${SWATCHES.join(' | ')}`)
	if (text && danger) console.error('<Mark> a box states what it is or why it failed, not both')
	const classes = join(
		'sp-mark',
		pick(SIZE, size, 'size', 'Mark'),
		pick(FILL, fill, 'fill', 'Mark'),
		round && 'sp-mark--round'
	)
	/* the theme can change under a mounted mark; a host that switches theme without a
	   reload remounts or rerenders, which recomputes this */
	const [box, ink] = useInk(paints, [chosen, rest.style?.background, rest.style?.backgroundColor])
	const paint = { ...(chosen ? { 'data-swatch': chosen } : {}), ...(ink ? { 'data-ink': ink } : {}), ref: box }
	/* A derived mark draws two letters and means a whole name, so the name is what it
	   announces - with role="img", since aria-label on a bare span is ignored by most
	   screen readers. A caller can still name it something else. */
	/* Every mark names something, and there are exactly two ways to do it: a string
	   child, which the mark derives from and announces in full, or an aria-label. A
	   mark holding an icon, a photo, a hatch or nothing has no text for a screen
	   reader at all - and a banner is not a name, since "Receipt" says what the file
	   is rather than which attachment this is. */
	if (!derives && !rest['aria-label'])
		console.error('<Mark> needs a name: a string child it derives from, or an aria-label')
	const named = derives && !rest['aria-label']
		? { role: 'img', 'aria-label': children }
		: {}
	const body = (
		<>
			{shown}
			{count != null ? <span className="sp-mark__count">{count}</span> : null}
			{text || danger ? <span className="sp-mark__text" {...(danger ? { 'data-color': 'danger' } : {})}>{danger ?? text}</span> : null}
			{remove}
		</>
	)
	// a box with a remove control holds the opening control inside it
	if (onClick && remove)
		return (
			<span className={classes} {...paint} {...rest}>
				<button type="button" className="sp-mark__open" onClick={onClick} aria-label={rest['aria-label']}>{shown}</button>
				{count != null ? <span className="sp-mark__count">{count}</span> : null}
				{text || danger ? <span className="sp-mark__text" {...(danger ? { 'data-color': 'danger' } : {})}>{danger ?? text}</span> : null}
				{remove}
			</span>
		)
	if (onClick)
		return <button type="button" className={classes} onClick={onClick} {...paint} {...named} {...rest}>{body}</button>
	// a mark that wraps a file input is the picker's own hit target
	if (as === 'label') return <label className={classes} {...paint} {...named} {...rest}>{body}</label>
	return <span className={classes} {...paint} {...named} {...rest}>{body}</span>
}

/**
 * The control that takes an attachment away, in the mark's own corner.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 * @param {() => void} [props.onClick]
 */
export function MarkRemove({ children, onClick, ...rest }) {
	reject(rest, 'MarkRemove')
	return (
		<button type="button" className="sp-mark__remove" onClick={onClick} {...rest}>
			{children}
		</button>
	)
}
