import { SkeletonCard, SkeletonRows } from 'spendly-react'

/* Every cell is a real waiting state from the app: the card that stands in for the
   overview chart, the one for an edit form, the one for a list, and the two shapes
   Home's dashboard cards wait behind. */

const column: React.CSSProperties = { width: 380 }

export const WhileAChartLoads = () => (
	<div style={column}><SkeletonCard bodyHeight={250} /></div>
)

export const WhileAFormLoads = () => (
	<div style={column}><SkeletonCard lines={6} /></div>
)

export const WhileAListLoads = () => (
	<div style={column}>
		<SkeletonCard bodyVariant="card-body-tight"><SkeletonRows count={4} /></SkeletonCard>
	</div>
)

export const LinesThenAPanel = () => (
	<div style={column}><SkeletonCard lines={2} bodyHeight={200} /></div>
)

export const WithoutAHeader = () => (
	<div style={column}><SkeletonCard title={false} lines={2} /></div>
)
