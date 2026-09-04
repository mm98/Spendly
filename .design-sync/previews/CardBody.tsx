import {
	Button, Card, CardBody, CardDivider, CardHeader, EntryRow, Note
} from 'spendly-react'

const side: React.CSSProperties = { width: 360 }

const bilka = { colour: '#1F6FEB', initials: 'BI' }
const netto = { colour: '#F4C025', initials: 'NE' }
const foetex = { colour: '#0E7A5F', initials: 'FØ' }

export const Default = () => (
	<div style={side}>
		<Card aria-label="Review">
			<CardHeader title="Review" />
			<CardDivider />
			<CardBody>
				<Note tone="positive" title="Total matches.">
					The lines add up to the 1.284 kr. printed on the receipt.
				</Note>
				<Button variant="block" to="/orders/new">SAVE THIS ORDER</Button>
			</CardBody>
		</Card>
	</div>
)

export const ListRows = () => (
	<div style={side}>
		<Card aria-label="Latest orders">
			<CardHeader title="Latest orders" />
			<CardDivider />
			<CardBody variant="entry-list card-body-tight">
				<EntryRow avatar={bilka} name="Bilka" meta="12 August" amount="1.284 kr." to="/orders/1" />
				<EntryRow avatar={netto} name="Netto" meta="9 August" amount="268 kr." to="/orders/2" />
				<EntryRow avatar={foetex} name="Føtex" meta="4 August" amount="612 kr." to="/orders/3" />
			</CardBody>
		</Card>
	</div>
)

export const Centered = () => (
	<div style={side}>
		<Card aria-label="Reading the document">
			<CardBody variant="card-body-centered">
				<p>Reading Bilka-kvittering.pdf. This usually takes a few seconds.</p>
				<Button variant="outline">CANCEL</Button>
			</CardBody>
		</Card>
	</div>
)
