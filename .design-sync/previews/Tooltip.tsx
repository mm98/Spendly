import { useCallback, useState } from 'react'
import { Tooltip } from 'spendly-react'

// The label places itself against the viewport, so the rectangle has to come from the real
// control: a hard-coded one puts the words where the control isn't.
const frame: React.CSSProperties = {
	position: 'relative', width: 320, height: 170, display: 'grid', placeItems: 'center'
}
const tile: React.CSSProperties = {
	width: 34, height: 34, borderRadius: 8, border: '1px solid #e4e2da', background: '#fff',
	display: 'grid', placeItems: 'center', fontSize: 11, color: '#6b6a63'
}

const Pointed = ({ title, body, children }: {
	title?: string, body: React.ReactNode, children: React.ReactNode
}) => {
	const [anchor, setAnchor] = useState<DOMRect | null>(null)
	const measure = useCallback((node: HTMLDivElement | null) => {
		if (node) setAnchor(node.getBoundingClientRect())
	}, [])
	return (
		<div style={frame}>
			<div ref={measure} style={tile}>{children}</div>
			<Tooltip anchor={anchor} title={title}>{body}</Tooltip>
		</div>
	)
}

export const NamingAControl = () => <Pointed body="gas station">icon</Pointed>

export const ALongerName = () => <Pointed body="brand mastercard">card</Pointed>

// Heading, swatches, names and figures are the same parts the chart hovers are built from.
export const WithHeadingAndFigures = () => (
	<Pointed title="4. september" body={<>
		<div className="tooltip-row">
			<span className="tooltip-swatch" style={{ background: '#14AC72' }} />
			<span className="tooltip-name">Spent</span>
			<span className="tooltip-value tabular-figures">402,17 kr.</span>
		</div>
		<div className="tooltip-row">
			<span className="tooltip-swatch" style={{ background: '#8fd0ae' }} />
			<span className="tooltip-name">Saved</span>
			<span className="tooltip-value tabular-figures">0,00 kr.</span>
		</div>
	</>}>day</Pointed>
)
