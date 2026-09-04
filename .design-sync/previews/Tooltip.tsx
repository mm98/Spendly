import { Tooltip } from 'spendly-react'

// It places itself against the viewport, so a still card shows it beside a stand-in for the
// control it would be labelling rather than in a live hover.
const frame: React.CSSProperties = {
	position: 'relative', width: 300, height: 120, display: 'grid', placeItems: 'center'
}
const tile: React.CSSProperties = {
	width: 34, height: 34, borderRadius: 8, border: '1px solid #e4e2da', display: 'grid',
	placeItems: 'center', fontSize: 11, color: '#6b6a63'
}

const rect = (left: number, top: number) =>
	({ left, top, right: left + 34, bottom: top + 34, width: 34, height: 34, x: left, y: top,
		toJSON: () => ({}) } as DOMRect)

export const AboveTheControl = () => (
	<div style={frame}>
		<div style={tile}>icon</div>
		<Tooltip anchor={rect(140, 90)}>gas station</Tooltip>
	</div>
)

export const NearTheTopEdge = () => (
	<div style={frame}>
		<div style={tile}>icon</div>
		<Tooltip anchor={rect(140, 4)}>flips below when there is no room above</Tooltip>
	</div>
)
