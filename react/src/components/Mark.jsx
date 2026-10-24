import { useSyncExternalStore } from 'react'
import { inkFor, onThemeChange, themeNow } from './colour.js'
import { join, pick, reject } from './variants.js'

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

/** @typedef {keyof typeof SIZE} MarkSize */

export const initialsOf = name => {
	const words = String(name).trim().split(/\s+/).filter(Boolean)
	if (!words.length) return ''
	if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase()
	return (words[0][0] + words[1][0]).toLocaleUpperCase()
}

const DERIVED = SWATCHES.filter(s => s !== 'ink-6')
const swatchOf = name => {
	let hash = 0
	for (const ch of String(name)) hash = (hash * 31 + ch.codePointAt(0)) % 100000
	return DERIVED[hash % DERIVED.length]
}

/** @param {object} props
    @param {MarkSize} [props.size] `small` and `medium` for a list row, `large` for a head, `xlarge` for an attached picture.
    @param {keyof typeof FILL} [props.fill] `default` is a light tint, `solid` a full colour, `plain` no fill, `photo` a picture, `empty` an empty frame to drop a picture in, `none` a grey box, `add` a frame that adds a picture.
    @param {string} [props.swatch] a colour of the set, or a colour value; only a solid mark is painted
    @param {boolean} [props.round] A circle rather than a rounded square.
    @param {boolean} [props.goods] The picture shows goods (an item, an order) rather than paper. The light theme tones it.
    @param {boolean} [props.faded] The picture stands in for a missing one, such as the vendor's picture in place of an item's photo. It is drawn faded.
    @param {number} [props.count] A count drawn over the mark, such as 3 more pictures.
    @param {string} [props.text] What the image is - a banner across the foot of the box, like a figtext.
    @param {string} [props.danger] why it failed, in place of text
    @param {import('react').ReactElement} [props.remove] The control that takes an attachment away.
    @param {() => void} [props.onClick] Renders a button.
    @param {'span' | 'label'} [props.as] a label wraps a file input, as a picker's hit target
    @param {import('react').ReactNode} [props.children] A name, which gives the initials and the colour, or a part to draw inside the mark. */
export function Mark({
	size,
	fill = 'default',
	swatch,
	round = false,
	// a photo of goods (an item, an order, a bookmark) rather than paper, which the light theme tones (17b)
	goods = false,
	// a vendor's image standing in for a missing item photo (17e): the photo, faded
	faded = false,
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
	useSyncExternalStore(onThemeChange, themeNow)
	// a string is a name to derive from; an element is the thing to draw
	const derives = typeof children === 'string'
	const paints = fill === 'solid'
	const chosen = paints ? (derives ? swatchOf(children) : swatch) : null
	const shown = derives ? initialsOf(children) : children
	if (derives && swatch) console.error('<Mark> a name derives its own colour: passing a swatch as well is how two lists show one record in two colours')
	// the passed one, not the derived one: only a caller can get this wrong
	if (swatch && !paints) console.error('<Mark> a swatch paints only a solid mark, so this one does nothing')
	const isColour = s => /^(#[0-9a-f]{3,8}|rgb|hsl)/i.test(s)
	if (swatch && !SWATCHES.includes(swatch) && !isColour(swatch)) console.error(`<Mark> swatch="${swatch}" is not one of: ${SWATCHES.join(' | ')}, or a colour value`)
	if (text && danger) console.error('<Mark> a box states what it is or why it failed, not both')
	const classes = join(
		'sp-mark',
		pick(SIZE, size, 'size', 'Mark'),
		pick(FILL, fill, 'fill', 'Mark'),
		round && 'sp-mark--round',
		goods && 'sp-mark--goods',
		faded && 'sp-mark--faded'
	)
	// a colour the user picked outside the set is painted on the mark itself
	const paint = !chosen ? {} : SWATCHES.includes(chosen) ? { 'data-swatch': chosen } : { style: { background: chosen } }
	// its glyph or initials take whichever ink reads better on the fill
	if (chosen) paint['data-ink'] = inkFor(chosen)
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
	// a box with a remove control holds the opening control inside it, and the open control is what is named
	if (onClick && remove) {
		const { 'aria-label': label, ...box } = rest
		return (
			<span className={classes} {...paint} {...box}>
				<button type="button" className="sp-mark__open" onClick={onClick} aria-label={label}>{shown}</button>
				{count != null ? <span className="sp-mark__count">{count}</span> : null}
				{text || danger ? <span className="sp-mark__text" {...(danger ? { 'data-color': 'danger' } : {})}>{danger ?? text}</span> : null}
				{remove}
			</span>
		)
	}
	if (onClick)
		return <button type="button" className={classes} onClick={onClick} {...paint} {...named} {...rest}>{body}</button>
	// a mark that wraps a file input is the picker's own hit target
	if (as === 'label') return <label className={classes} {...paint} {...named} {...rest}>{body}</label>
	return <span className={classes} {...paint} {...named} {...rest}>{body}</span>
}

/** The control that takes an attachment away, in the mark's own corner.
    @param {object} props
    @param {import('react').ReactElement | import('react').ReactElement[]} [props.children] The control's icon.
    @param {() => void} [props.onClick] */
export function MarkRemove({ children, onClick, ...rest }) {
	reject(rest, 'MarkRemove')
	return (
		<button type="button" className="sp-mark__remove" onClick={onClick} {...rest}>
			{children}
		</button>
	)
}
