import { Button } from 'spendly-react'

const row: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }

export const Variants = () => (
	<div style={row}>
		<Button variant="primary">SAVE ORDER</Button>
		<Button variant="outline">CANCEL</Button>
		<Button variant="ghost">Skip for now</Button>
		<Button variant="pill">This month</Button>
	</div>
)

export const WithIcons = () => (
	<div style={row}>
		<Button variant="primary" icon="plus">NEW ORDER</Button>
		<Button variant="outline" icon="upload">IMPORT</Button>
		<Button variant="ghost" iconAfter="chevronRight">See all orders</Button>
	</div>
)

export const Sizes = () => (
	<div style={row}>
		<Button variant="caps compact">EDIT</Button>
		<Button variant="ghost compact">Remove</Button>
		<Button variant="caps">DELETE ORDER</Button>
	</div>
)

export const FullWidth = () => (
	<div style={{ maxWidth: 320 }}>
		<Button variant="block" icon="receipt" to="/orders/all">SEE ALL ORDERS</Button>
		<Button variant="block" icon="pencil" to="/orders/1/edit">EDIT ORDER</Button>
	</div>
)

export const AsLink = () => (
	<div style={row}>
		<Button variant="primary" to="/orders/new" icon="plus">NEW ORDER</Button>
		<Button variant="ghost" href="https://example.com" iconAfter="externalLink">Open receipt</Button>
	</div>
)
