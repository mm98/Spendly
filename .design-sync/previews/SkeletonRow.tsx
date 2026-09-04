import { Card, CardBody, CardDivider, CardHeader, SkeletonRow } from 'spendly-react'

/* One waiting row: a round mark, two lines of text and a figure on the right -- the
   shape every list of records in the app shares. It takes no props at all; the card
   around it is what decides where it sits. */

const column: React.CSSProperties = { width: 380 }

export const InAListCard = () => (
	<div style={column}>
		<Card aria-label="Recent scans">
			<CardHeader title="Recent scans" />
			<CardDivider />
			<CardBody variant="card-body-tight"><SkeletonRow /></CardBody>
		</Card>
	</div>
)

export const OnItsOwn = () => (
	<div style={column}><SkeletonRow /></div>
)
