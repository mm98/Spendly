import { Card, CardBody, CardDivider, CardHeader, FavouriteTile, FavouriteTileGrid, Icon } from 'spendly-react'

/* The grid the favourite tiles sit in: three across a wide panel, two at tablet width and
   one per row on a phone. It takes nothing but its tiles -- the column count is the
   stylesheet's, not the caller's, so both overview pages lay their spotlight out the same
   way whatever they pin. */

const avatar = (initials: string, colour: string) => (
	<span className="entry-avatar" style={{ background: colour, color: '#fff' }}>{initials}</span>
)

const categoryIcon = (icon: string, colour: string, ink: string) => (
	<span className="category-icon" style={{ background: colour, color: ink }}><Icon name={icon} /></span>
)

/* Three pinned records -- a full row on a wide panel, two plus one at this width. */
export const ThreeFavourites = () => (
	<Card aria-label="Favourites">
		<CardHeader title="Favourites" to="/vendors/all" label="Favourites, open all vendors" />
		<CardDivider />
		<CardBody>
			<FavouriteTileGrid>
				<FavouriteTile mark={avatar('BI', '#877364')} name="Bilka"
					to="/orders/all?vendor=v-bilka" linkLabel="Bilka, open their orders"
					meta="34 orders" amount="18.420 kr." saved="saved 1.965 kr." />
				<FavouriteTile mark={avatar('NE', '#3E5C8A')} name="Netto"
					to="/orders/all?vendor=v-netto" linkLabel="Netto, open their orders"
					meta="18 orders" amount="5.940 kr." saved="saved 128 kr." />
				<FavouriteTile mark={avatar('MA', '#8453F5')} name="Matas"
					to="/orders/all?vendor=v-matas" linkLabel="Matas, open their orders"
					meta="7 orders" amount="1.783 kr." saved="saved 214 kr." />
			</FavouriteTileGrid>
		</CardBody>
	</Card>
)

/* Fewer tiles than columns keep their column width instead of stretching across the panel. */
export const TwoFavourites = () => (
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
			</FavouriteTileGrid>
		</CardBody>
	</Card>
)

/* More tiles than one row holds wrap onto the next row of the same columns. */
export const SixFavourites = () => (
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
				<FavouriteTile mark={avatar('NE', '#3E5C8A')} name="Netto"
					to="/orders/all?vendor=v-netto" linkLabel="Netto, open their orders"
					meta="18 orders" amount="5.940 kr." saved="saved 128 kr." />
				<FavouriteTile mark={avatar('MA', '#8453F5')} name="Matas"
					to="/orders/all?vendor=v-matas" linkLabel="Matas, open their orders"
					meta="7 orders" amount="1.783 kr." saved="saved 214 kr." />
				<FavouriteTile mark={avatar('RE', '#A8324A')} name="Rema 1000"
					to="/orders/all?vendor=v-rema-1000" linkLabel="Rema 1000, open their orders"
					meta="12 orders" amount="3.240 kr." saved="saved 88 kr." />
			</FavouriteTileGrid>
		</CardBody>
	</Card>
)
