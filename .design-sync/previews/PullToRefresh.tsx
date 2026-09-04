import { Card, CardBody, CardDivider, CardHeader, EntryRow, Page, PullToRefresh } from 'spendly-react'

// PullToRefresh has exactly one still state: at rest it draws its children and nothing else.
// The spinner it owns sits at opacity 0 until a finger drags the top of the page down, and
// that gesture cannot be driven from a screenshot, so it is not previewed here.

const bilka = { initials: 'BI', colour: '#877364' }
const netto = { initials: 'NE', colour: '#3E5C8A' }
const elgiganten = { initials: 'EL', colour: '#AD620D' }

export const AtRest = () => (
	<div style={{ width: 420 }}>
		<PullToRefresh>
			<Page>
				<Card aria-label="Latest orders">
					<CardHeader title="Latest orders" to="/orders" label="Latest orders, open Orders" />
					<CardDivider />
					<CardBody variant="entry-list card-body-tight">
						<EntryRow avatar={bilka} name="Bilka" meta="18 April" amount="1.284,00 kr."
							sub="saved 10,00 kr." to="/orders/o-1" />
						<EntryRow avatar={netto} name="Netto" meta="2 May" amount="268,45 kr."
							sub="saved 0,00 kr." to="/orders/o-2" />
						<EntryRow avatar={elgiganten} name="Elgiganten" meta="6 May" amount="1.948,00 kr."
							sub="saved 251,00 kr." to="/orders/o-3" />
					</CardBody>
				</Card>
			</Page>
		</PullToRefresh>
	</div>
)
