import { Card, CardBody, CardDivider, CardHeader, SkeletonCard, SkeletonRows } from 'spendly-react'

/* `count` waiting rows and nothing else -- no card, no divider. It is dropped straight
   into the body the loaded rows will fill, so the count matches how many rows that body
   normally opens with. */

const column: React.CSSProperties = { width: 380 }

export const WhileRecentScansLoad = () => (
	<div style={column}>
		<Card aria-label="Recent scans">
			<CardHeader title="Recent scans" />
			<CardDivider />
			<CardBody variant="card-body-tight"><SkeletonRows count={3} /></CardBody>
		</Card>
	</div>
)

export const WhileTheOrderListLoads = () => (
	<div style={column}>
		<SkeletonCard bodyVariant="card-body-tight"><SkeletonRows count={6} /></SkeletonCard>
	</div>
)

export const InsideAnEntryList = () => (
	<div style={column}>
		<SkeletonCard bodyVariant="entry-list card-body-tight"><SkeletonRows count={3} /></SkeletonCard>
	</div>
)
