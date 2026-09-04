import {
	Button, ButtonLink, Card, CardBody, CardDivider, CardHeader, EmptyState, EntryRow
} from 'spendly-react'

const side: React.CSSProperties = { width: 360 }

const bilka = { colour: '#1F6FEB', initials: 'BI' }
const netto = { colour: '#F4C025', initials: 'NE' }
const foetex = { colour: '#0E7A5F', initials: 'FØ' }

export const OrdersCard = () => (
	<div style={side}>
		<Card aria-label="Latest orders">
			<CardHeader title="Latest orders" to="/orders/all" label="Latest orders, open all orders" />
			<CardDivider />
			<CardBody variant="entry-list card-body-tight">
				<EntryRow avatar={bilka} name="Bilka" meta="12 August" amount="1.284 kr."
					sub="saved 96 kr." to="/orders/1" />
				<EntryRow avatar={netto} name="Netto" meta="9 August" amount="268 kr."
					sub="saved 14 kr." to="/orders/2" />
				<EntryRow avatar={foetex} name="Føtex" meta="4 August" amount="612 kr."
					sub="saved 41 kr." to="/orders/3" />
				<Button variant="block" to="/orders/all">SEE ALL</Button>
			</CardBody>
		</Card>
	</div>
)

export const WithHeaderAction = () => (
	<div style={side}>
		<Card aria-label="Vendors">
			<CardHeader title="Vendors • 3">
				<Button variant="pill" icon="plus" to="/vendors/new">ADD</Button>
			</CardHeader>
			<CardDivider />
			<CardBody variant="entry-list card-body-tight">
				<EntryRow avatar={bilka} name="Bilka" meta="18 orders" amount="14.902 kr." to="/vendors/1" />
				<EntryRow avatar={netto} name="Netto" meta="11 orders" amount="3.480 kr." to="/vendors/2" />
				<EntryRow avatar={foetex} name="Føtex" meta="6 orders" amount="2.117 kr." to="/vendors/3" />
			</CardBody>
		</Card>
	</div>
)

export const Empty = () => (
	<div style={side}>
		<Card aria-label="Orders">
			<CardHeader title="Orders" to="/orders" label="Orders, open Orders" />
			<CardDivider />
			<CardBody>
				<EmptyState>
					<p>No orders yet. Add one and your spending appears here.</p>
					<ButtonLink to="/orders/new">ADD AN ORDER</ButtonLink>
				</EmptyState>
			</CardBody>
		</Card>
	</div>
)
