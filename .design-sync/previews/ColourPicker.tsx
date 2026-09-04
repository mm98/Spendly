import { CATEGORY_COLOURS, ColourPicker, Field, VENDOR_COLOURS } from 'spendly-react'

/* Eight swatches from the app's own palette, and the platform's own picker at the end for
   anything else. The field takes `group`, because a label around a row of buttons would name
   only the first swatch. */

const noop = () => {}
const box: React.CSSProperties = { maxWidth: 460 }

/* A category's colour. The chosen swatch carries the ring; the last box is the plus that opens
   the platform picker. */
export const CategoryColour = () => (
	<div style={box}>
		<Field label="Colour" group
			help="Pick one of the eight colours shown, or choose any colour in the last box.">
			<ColourPicker value={CATEGORY_COLOURS[5].id} onChange={noop} label="Category colour" />
		</Field>
	</div>
)

/* A vendor's colour. Same control, a darker palette -- a vendor's tile carries two white
   letters rather than a line glyph, so it is passed `VENDOR_COLOURS`. */
export const VendorColour = () => (
	<div style={box}>
		<Field label="Colour" group
			help="Pick one of the eight colours shown, or choose any colour in the last box.">
			<ColourPicker value={VENDOR_COLOURS[2].id} colours={VENDOR_COLOURS}
				onChange={noop} label="Vendor colour" />
		</Field>
	</div>
)

/* A colour that is not in the palette: no swatch is ringed, the last box is filled with the
   chosen colour and turns into a pencil, and the line beside it reads the hex back with what
   the glyph on top of it will measure. */
export const AColourOfItsOwn = () => (
	<div style={box}>
		<Field label="Colour" group
			help="Pick one of the eight colours shown, or choose any colour in the last box.">
			<ColourPicker value="#6C3A8E" onChange={noop} label="Category colour" />
		</Field>
	</div>
)
