import { Card, CardBody, CardDivider, CardHeader, EntityMark, EntityRow, Icon } from 'spendly-react'

/* The small star that says a record is a favourite, on the All vendors and All categories
   lists. It wraps the record's own tile at the tile's own size and overlaps its corner
   rather than growing it, so a favourite row and a plain row keep one left column.

   It is never used on its own: it goes into an EntityRow's `mark`, which is where both
   lists put it. Turning a favourite on and off happens on the record's own edit page --
   nothing here is a control. */

const avatar = (initials: string, colour: string) => (
	<span className="entry-avatar" style={{ background: colour, color: '#fff' }}>{initials}</span>
)

const categoryIcon = (icon: string, colour: string, ink: string) => (
	<span className="category-icon" style={{ background: colour, color: ink }}><Icon name={icon} /></span>
)

/* Favourites and the rest in one list: the star is the only difference between the rows. */
export const OnVendorAvatars = () => (
	<Card aria-label="All vendors">
		<CardHeader title="Vendors • 12" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<EntityRow mark={<EntityMark favourite>{avatar('BI', '#877364')}</EntityMark>}
				name="Bilka" meta="34 orders" amount="18.420 kr." sub="saved 1.965 kr."
				editTo="/vendors/v-bilka/edit" />
			<EntityRow mark={<EntityMark favourite>{avatar('EL', '#AD620D')}</EntityMark>}
				name="Elgiganten" meta="6 orders" amount="12.480 kr." sub="saved 1.240 kr."
				editTo="/vendors/v-elgiganten/edit" />
			<EntityRow mark={<EntityMark>{avatar('FØ', '#177DA7')}</EntityMark>}
				name="Føtex" meta="21 orders" amount="7.310 kr." sub="saved 402 kr."
				editTo="/vendors/v-foetex/edit" />
			<EntityRow mark={<EntityMark>{avatar('NE', '#3E5C8A')}</EntityMark>}
				name="Netto" meta="18 orders" amount="5.940 kr." sub="saved 128 kr."
				editTo="/vendors/v-netto/edit" />
		</CardBody>
	</Card>
)

/* The same mark on a category's coloured glyph tile, which is a different tile of the same
   size -- the mark takes whatever the record's own tile is. */
export const OnCategoryTiles = () => (
	<Card aria-label="All categories">
		<CardHeader title="Categories • 10" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<EntityRow mark={<EntityMark favourite>{categoryIcon('cart', '#C43F2A', '#fff')}</EntityMark>}
				name="Groceries" meta="38,4% of expenses • no budget set" amount="41.208 kr."
				sub="saved 3.104 kr." editTo="/categories/c-groceries/edit" />
			<EntityRow mark={<EntityMark favourite>{categoryIcon('plug', '#E9C517', '#0B0F0D')}</EntityMark>}
				name="Electronics" meta="17,9% of expenses • no budget set" amount="9.845 kr."
				sub="saved 1.510 kr." editTo="/categories/c-electronics/edit" />
			<EntityRow mark={<EntityMark>{categoryIcon('home', '#8B5CF6', '#0B0F0D')}</EntityMark>}
				name="Household" meta="21,2% of expenses • 505 kr. of 900 kr. budget this month"
				amount="12.640 kr." sub="saved 842 kr." editTo="/categories/c-household/edit" />
			<EntityRow mark={<EntityMark>{categoryIcon('display', '#1FA8E0', '#0B0F0D')}</EntityMark>}
				name="Home office" meta="10,4% of expenses • 210 kr. of 700 kr. budget this month"
				amount="4.190 kr." sub="saved 96 kr." editTo="/categories/c-home-office/edit" />
		</CardBody>
	</Card>
)
