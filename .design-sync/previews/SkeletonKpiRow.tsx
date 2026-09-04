import { SkeletonBlock, SkeletonCard, SkeletonKpiRow } from 'spendly-react'

/* The summary tiles Statistics, Vendors and Categories open with, before their figures
   arrive. It draws the same `.kpi-row` grid the loaded KpiCards use, so the row it
   stands in for lands in exactly the same place. */

const page: React.CSSProperties = { width: 640 }

export const FourTiles = () => (
	<div style={page}><SkeletonKpiRow /></div>
)

export const AboveTheStatisticsChart = () => (
	<div style={page}>
		<SkeletonBlock width={180} height={34} style={{ margin: '4px 0 18px' }} />
		<SkeletonKpiRow />
		<div style={{ height: 18 }} />
		<SkeletonCard bodyHeight={210} />
	</div>
)
