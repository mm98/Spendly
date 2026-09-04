import { Button, Card, CardBody, CardDivider, CardHeader, DropZone } from 'spendly-react'

/* The dashed block that takes a drop and offers a link for anyone not dragging. It is the
   system's own empty state, so an attachments card that has nothing on it yet is one control
   rather than a box plus a button. */

const noop = () => {}

/* Order details' attachments card, with nothing attached yet. The card body itself takes the
   drop too, so a receipt landing anywhere on the card is caught. */
export const AnEmptyAttachmentsCard = () => (
	<Card aria-label="Attachments">
		<CardHeader title="Attachments">
			<Button variant="pill" icon="plus" onClick={noop}>ADD</Button>
		</CardHeader>
		<CardDivider />
		<CardBody variant="card-body-tight">
			<DropZone icon="photo" label="Add attachments"
				hint="Drop receipts here — as many as you like — or choose them."
				action="CHOOSE FILES" onFiles={noop} />
		</CardBody>
	</Card>
)

/* One file at a time, and a different glyph and verb. `multiple={false}` is what stops the
   picker offering a multi-selection the caller cannot take. */
export const OneFileOnly = () => (
	<Card aria-label="Import">
		<CardHeader title="Import orders" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<DropZone icon="upload" multiple={false} label="Choose a JSON file of orders"
				hint="Drop a Spendly export here, or choose the file."
				action="CHOOSE A FILE" onFiles={noop} />
		</CardBody>
	</Card>
)
