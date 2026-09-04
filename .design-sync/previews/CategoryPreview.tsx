import { Card, CardBody, CategoryPreview } from 'spendly-react'

/* The live row beside the category form: the tile, the name and one muted line, drawn exactly
   as the category list will draw it. It is inert -- nothing in it can be clicked. */

/* The rail card the form puts it in, so the preview stands under a heading rather than loose
   in a card body. `.category-rows` is the list container the real row sits in. */
const InTheRail = ({ children }: { children: React.ReactNode }) => (
	<Card aria-label="Category summary">
		<CardBody>
			<div className="card-subheading">Category summary</div>
			<span className="section-label">How it will look</span>
			<div className="category-rows summary-preview">{children}</div>
		</CardBody>
	</Card>
)

/* A named category with one of the palette colours and a glyph from the app's own set. */
export const Filled = () => (
	<InTheRail>
		<CategoryPreview icon="cart" colour="#14AC72" name="Groceries" />
	</InTheRail>
)

/* Before the name is typed. The row keeps its shape and says what it is standing in for
   rather than collapsing to an empty line. */
export const Unnamed = () => (
	<InTheRail>
		<CategoryPreview icon="home" colour="#1FA8E0" name="" />
	</InTheRail>
)

/* A glyph chosen from the Tabler catalogue. The record stores the path with the name, and
   `iconPath` is that path -- so the row draws without loading a catalogue. The ink on the
   tile is picked from the colour, which is why a pale fill still shows its glyph. */
export const AChosenGlyph = () => (
	<InTheRail>
		<CategoryPreview icon="device-tv" name="Electronics" colour="#E9C517"
			iconPath="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2l0-9 M16 3l-4 4l-4-4" />
	</InTheRail>
)
