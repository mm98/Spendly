import { Button, Card, CardBody, CardDivider, CardHeader, InsetPanel, ItemRow } from 'spendly-react'

// A tinted well inside a card body, holding a short group of rows. It draws the background
// and the rounding; the rows inside it are ItemRows.
const side: React.CSSProperties = { width: 420 }

export const RecentScans = () => (
	<div style={side}>
		<Card aria-label="Recent scans">
			<CardHeader title="Recent scans" />
			<CardDivider />
			<CardBody variant="card-body-tight">
				<InsetPanel>
					<ItemRow className="item-row-group" icon="check" title="Bilka-kvittering.pdf"
						meta="12 August • 14 items" amount="1.284 kr." to="/orders/1" />
					<ItemRow className="item-row-group" icon="check" title="Netto-bon.jpg"
						meta="9 August • 12 items" amount="268 kr." to="/orders/2" />
					<ItemRow className="item-row-group" icon="check" title="Foetex-kvittering.pdf"
						meta="4 August • 9 items" amount="612 kr." to="/orders/3" />
				</InsetPanel>
				<Button variant="block" to="/orders/all">SEE ALL ORDERS</Button>
			</CardBody>
		</Card>
	</div>
)

export const Tips = () => (
	<div style={side}>
		<Card aria-label="Tips">
			<CardHeader title="Good to know" />
			<CardDivider />
			<CardBody>
				<InsetPanel>
					<ItemRow icon="pencil" title="Edit in place"
						meta="Select the pencil to edit the line where it stands." />
					<ItemRow icon="reorder" title="Drag to reorder"
						meta="Or select a line and move it with the arrow keys." />
					<ItemRow icon="undo" title="Enter saves, Escape cancels"
						meta="Cmd/Ctrl+Enter saves and opens the line below." />
				</InsetPanel>
			</CardBody>
		</Card>
	</div>
)
