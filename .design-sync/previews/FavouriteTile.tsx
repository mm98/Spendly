import { Card, CardBody, CardDivider, CardHeader, FavouriteTile, FavouriteTileGrid, Icon } from 'spendly-react'

/* The favourites spotlight both overview pages share. One tile per pinned record: its own
   mark, its name with a count under it, and its total with what it saved under that.

   A tile is always inside a FavouriteTileGrid -- the grid is what puts three across a wide
   panel and one per row on a phone. The whole tile is the way into that record's own
   filtered orders, so `to` and `linkLabel` are not optional in practice. */

const avatar = (initials: string, colour: string) => (
	<span className="entry-avatar" style={{ background: colour, color: '#fff' }}>{initials}</span>
)

const categoryIcon = (icon: string, colour: string, ink: string) => (
	<span className="category-icon" style={{ background: colour, color: ink }}><Icon name={icon} /></span>
)

export const FavouriteVendors = () => (
	<Card aria-label="Favourites">
		<CardHeader title="Favourites" to="/vendors/all" label="Favourites, open all vendors" />
		<CardDivider />
		<CardBody>
			<FavouriteTileGrid>
				<FavouriteTile mark={avatar('BI', '#877364')} name="Bilka"
					to="/orders/all?vendor=v-bilka" linkLabel="Bilka, open their orders"
					meta="34 orders" amount="18.420 kr." saved="saved 1.965 kr." />
				<FavouriteTile mark={avatar('EL', '#AD620D')} name="Elgiganten"
					to="/orders/all?vendor=v-elgiganten" linkLabel="Elgiganten, open their orders"
					meta="6 orders" amount="12.480 kr." saved="saved 1.240 kr." />
				<FavouriteTile mark={avatar('FØ', '#177DA7')} name="Føtex"
					to="/orders/all?vendor=v-foetex" linkLabel="Føtex, open their orders"
					meta="21 orders" amount="7.310 kr." saved="saved 402 kr." />
			</FavouriteTileGrid>
		</CardBody>
	</Card>
)

export const FavouriteCategories = () => (
	<Card aria-label="Favourites">
		<CardHeader title="Favourites" to="/categories/all" label="Favourites, open all categories" />
		<CardDivider />
		<CardBody>
			<FavouriteTileGrid>
				<FavouriteTile mark={categoryIcon('cart', '#C43F2A', '#fff')} name="Groceries"
					to="/orders/all?category=c-groceries" linkLabel="Groceries, open its orders"
					meta="38,4% of expenses" amount="41.208 kr." saved="saved 3.104 kr." />
				<FavouriteTile mark={categoryIcon('home', '#8B5CF6', '#0B0F0D')} name="Household"
					to="/orders/all?category=c-household" linkLabel="Household, open its orders"
					meta="21,2% of expenses" amount="12.640 kr." saved="saved 842 kr." />
				<FavouriteTile mark={categoryIcon('plug', '#E9C517', '#0B0F0D')} name="Electronics"
					to="/orders/all?category=c-electronics" linkLabel="Electronics, open its orders"
					meta="17,9% of expenses" amount="9.845 kr." saved="saved 1.510 kr." />
			</FavouriteTileGrid>
		</CardBody>
	</Card>
)

/* Long names ellipsis inside the tile rather than widening it, so a row of three keeps three
   equal columns. */
export const LongNames = () => (
	<Card aria-label="Favourites">
		<CardHeader title="Favourites" to="/categories/all" label="Favourites, open all categories" />
		<CardDivider />
		<CardBody>
			<FavouriteTileGrid>
				<FavouriteTile mark={categoryIcon('display', '#1FA8E0', '#0B0F0D')} name="Home office"
					to="/orders/all?category=c-home-office" linkLabel="Home office, open its orders"
					meta="10,4% of expenses" amount="4.190 kr." saved="saved 96 kr." />
				<FavouriteTile mark={categoryIcon('tag', '#F09A38', '#0B0F0D')} name="Everything else"
					to="/orders/all?category=c-everything-else" linkLabel="Everything else, open its orders"
					meta="4,1% of expenses" amount="1.702 kr." saved="saved 0 kr." />
				<FavouriteTile mark={avatar('CO', '#6B4E9E')} name="Coop 365"
					to="/orders/all?vendor=v-coop-365" linkLabel="Coop 365, open their orders"
					meta="9 orders" amount="2.184 kr." saved="saved 74 kr." />
			</FavouriteTileGrid>
		</CardBody>
	</Card>
)
