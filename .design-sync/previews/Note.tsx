import { Button, Card, CardBody, CardDivider, CardHeader, ItemRow, Note } from 'spendly-react'

const side: React.CSSProperties = { width: 360 }

export const Positive = () => (
	<div style={side}>
		<Card aria-label="Review">
			<CardHeader title="Review" />
			<CardDivider />
			<CardBody>
				<Note tone="positive" title="Total matches.">
					The 14 lines add up to the 1.284 kr. printed on the Bilka receipt.
				</Note>
				<Button variant="block">SAVE THIS ORDER</Button>
			</CardBody>
		</Card>
	</div>
)

export const Warning = () => (
	<div style={side}>
		<Card aria-label="Review">
			<CardHeader title="Review" />
			<CardDivider />
			<CardBody>
				<Note tone="warning" title="Total no longer matches.">
					The lines now total 1.310 kr., against the document total of 1.284 kr.
					Saving keeps what is on screen.
				</Note>
				<Button variant="block">SAVE THIS ORDER</Button>
			</CardBody>
		</Card>
	</div>
)

export const AboveTheRowItIsAbout = () => (
	<div style={side}>
		<Card aria-label="Review">
			<CardHeader title="Review" />
			<CardDivider />
			<CardBody>
				<Note tone="warning" title="Check before saving." className="note-above-row">
					You already have a Netto order within 14 days of this date.
				</Note>
				<ItemRow className="item-row-group" thumb="receipt" to="/orders/2"
					title="Netto • 9 August 2026" meta="12 items" amount="268 kr." />
			</CardBody>
		</Card>
	</div>
)
