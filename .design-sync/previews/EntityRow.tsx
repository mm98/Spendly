import { Button, Card, CardBody, CardDivider, CardHeader, EntityMark, EntityRow, Icon, IconButton, ImageOrIcon } from 'spendly-react'

/* The row All vendors, All categories and the wishlist are lists of: the record's own mark,
   its name and one meta line, its figure with a second figure under it, and one destination.

   `mark` is the record's own tile, passed in whole -- a vendor's initials avatar or a
   category's coloured glyph -- so this row never decides what a record looks like. */

const avatar = (initials: string, colour: string) => (
	<span className="entry-avatar" style={{ background: colour, color: '#fff' }}>{initials}</span>
)

const categoryIcon = (icon: string, colour: string, ink: string) => (
	<span className="category-icon" style={{ background: colour, color: ink }}><Icon name={icon} /></span>
)

export const VendorList = () => (
	<Card aria-label="All vendors">
		<CardHeader title="Vendors • 12">
			<Button variant="pill" icon="plus" to="/vendors/new">ADD</Button>
		</CardHeader>
		<CardDivider />
		<CardBody variant="card-body-tight">
			<EntityRow mark={<EntityMark favourite>{avatar('BI', '#877364')}</EntityMark>}
				name="Bilka" meta="34 orders • also Bilka.dk" amount="18.420 kr." sub="saved 1.965 kr."
				editTo="/vendors/v-bilka/edit" />
			<EntityRow mark={<EntityMark>{avatar('EL', '#AD620D')}</EntityMark>}
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

export const CategoryList = () => (
	<Card aria-label="All categories">
		<CardHeader title="Categories • 10">
			<Button variant="pill" icon="plus" to="/categories/new">ADD</Button>
		</CardHeader>
		<CardDivider />
		<CardBody variant="card-body-tight">
			<EntityRow mark={<EntityMark favourite>{categoryIcon('cart', '#C43F2A', '#fff')}</EntityMark>}
				name="Groceries" meta="38,4% of expenses • 3.980 kr. of 4.500 kr. budget this month"
				amount="41.208 kr." sub="saved 3.104 kr." editTo="/categories/c-groceries/edit" />
			<EntityRow mark={<EntityMark>{categoryIcon('home', '#8B5CF6', '#0B0F0D')}</EntityMark>}
				name="Household" meta="21,2% of expenses • 505 kr. of 900 kr. budget this month"
				amount="12.640 kr." sub="saved 842 kr." editTo="/categories/c-household/edit" />
			<EntityRow mark={<EntityMark>{categoryIcon('plug', '#E9C517', '#0B0F0D')}</EntityMark>}
				name="Electronics" meta="17,9% of expenses • no budget set"
				amount="9.845 kr." sub="saved 1.510 kr." editTo="/categories/c-electronics/edit" />
			<EntityRow mark={<EntityMark>{categoryIcon('display', '#1FA8E0', '#0B0F0D')}</EntityMark>}
				name="Home office" meta="10,4% of expenses • 210 kr. of 700 kr. budget this month"
				amount="4.190 kr." sub="saved 96 kr." editTo="/categories/c-home-office/edit" />
		</CardBody>
	</Card>
)

/* Two destinations on one row: `open` sends the row itself out to the shop's address and
   `action` rides on top with the edit button, because one link cannot hold another. A row
   with `open` draws no chevron -- it leaves the app. */
export const WithSecondAction = () => (
	<Card aria-label="Wishes">
		<CardHeader title="Wishes • 3 matches">
			<Button variant="pill" icon="plus" to="/wishlist/new">ADD</Button>
		</CardHeader>
		<CardDivider />
		<CardBody variant="card-body-tight">
			<EntityRow editTo="/wishlist/w-1/edit"
				mark={<span className="document-thumb"><ImageOrIcon src="" icon="photo" imgClassName="document-thumb-img" /></span>}
				name="Sonos Era 100" meta="elgiganten.dk • Added 28 August 2026 • Electronics"
				amount="1.799,00 kr."
				open={{ href: 'https://www.elgiganten.dk', label: 'Open Sonos Era 100 at elgiganten.dk in a new tab' }}
				action={<IconButton icon="pencil" to="/wishlist/w-1/edit" label="Edit Sonos Era 100" />} />
			<EntityRow editTo="/wishlist/w-2/edit"
				mark={<span className="document-thumb"><ImageOrIcon src="" icon="photo" imgClassName="document-thumb-img" /></span>}
				name="Skrivebordslampe" meta="jysk.dk • Added 24 August 2026 • Home office"
				amount="349,00 kr."
				open={{ href: 'https://www.jysk.dk', label: 'Open Skrivebordslampe at jysk.dk in a new tab' }}
				action={<IconButton icon="pencil" to="/wishlist/w-2/edit" label="Edit Skrivebordslampe" />} />
			<EntityRow editTo="/wishlist/w-3/edit"
				mark={<span className="document-thumb"><ImageOrIcon src="" icon="photo" imgClassName="document-thumb-img" /></span>}
				name="Kaffekværn" meta="Added 19 August 2026 • Household" amount="899,00 kr." />
		</CardBody>
	</Card>
)

/* No `editTo`, no `open`, no `action`: an inert row, which is what a form's rail draws to
   preview a record that has not been saved yet. */
export const InertPreview = () => (
	<Card aria-label="Wish summary">
		<CardBody>
			<div className="card-subheading">Wish summary</div>
			<span className="section-label">How it will look</span>
			<div className="summary-preview">
				<EntityRow mark={<span className="document-thumb"><ImageOrIcon src="" icon="photo" imgClassName="document-thumb-img" /></span>}
					name="Sonos Era 100" meta="elgiganten.dk" amount="1.799,00 kr." />
			</div>
		</CardBody>
	</Card>
)
