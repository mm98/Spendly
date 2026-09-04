import { KpiCard } from 'spendly-react'

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(150px, 1fr))', gap: 16 }

export const StatisticsRow = () => (
	<div style={grid}>
		<KpiCard label="Spent" amount={12480} delta="8% more than August" trend="up" tone="bad" />
		<KpiCard label="Saved" amount={1965} delta="3% more than August" trend="up" tone="good" />
		<KpiCard label="Orders" value="34" delta="6 fewer than August" trend="down" tone="neutral" />
		<KpiCard label="Average order" amount={367} note="Across 34 orders" />
	</div>
)

export const Tones = () => (
	<div style={grid}>
		<KpiCard label="Saved" amount={1965} delta="Best month so far" trend="up" tone="good" />
		<KpiCard label="Spent" amount={12480} delta="Over your usual" trend="up" tone="bad" />
		<KpiCard label="Orders" value="34" delta="Same as August" trend="level" tone="neutral" />
	</div>
)

export const WithoutComparison = () => (
	<div style={{ ...grid, gridTemplateColumns: 'repeat(2, minmax(150px, 1fr))' }}>
		<KpiCard label="Spent" amount={12480} note="Earliest month on record" />
		<KpiCard label="Vendors" value="12" />
	</div>
)
