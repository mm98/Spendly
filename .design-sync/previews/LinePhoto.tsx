import { Field, LinePhoto } from 'spendly-react'

/* One 128px frame, used by the order line card and the wish form. The frame is a button that
   opens the picker; the words under it are the two plain actions a filled frame gets.

   The frame's own width comes from `--line-photo`, which the block around it sets --
   `.wish-photo-field` here, `.line-card` on an order line. A frame with neither around it has
   no width to take. */

const noop = () => {}

/* A stand-in thumbnail, so the filled frame has something to draw. A real one is an object URL
   for the file just picked, or the stored thumbnail's URL. */
const thumbnail = 'data:image/svg+xml;utf8,' + encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
		<rect width="120" height="120" fill="#D9E0D6"/>
		<rect x="34" y="26" width="52" height="72" rx="6" fill="#3C5B48"/>
		<rect x="34" y="60" width="52" height="16" fill="#E9C517"/>
		<circle cx="60" cy="44" r="9" fill="#F4F5F0"/>
	</svg>`)

/* Empty, with the sentence that names the two gestures nothing else on screen says. */
export const Empty = () => (
	<div className="wish-photo-field">
		<LinePhoto photo={{}} label="Product photo" onPick={noop} onClear={noop} />
	</div>
)

/* Filled. The mark is replaced by the picture, and the two actions appear under it: Replace
   opens the picker again, Remove takes the picture off the record. */
export const WithAPicture = () => (
	<div className="wish-photo-field">
		<LinePhoto photo={{ present: true, src: thumbnail }} label="Product photo"
			onPick={noop} onClear={noop} />
	</div>
)

/* The wish form's own composition: a `group` field around the frame, and `hint={false}`,
   because at 128px the sentence broke over three lines and the box already says what it takes. */
export const InAField = () => (
	<Field label="Picture" optional group>
		<div className="wish-photo-field">
			<LinePhoto photo={{}} label="Picture of this wish" hint={false}
				onPick={noop} onClear={noop} />
		</div>
	</Field>
)
