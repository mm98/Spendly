import { CheckRow } from 'spendly-react'

const noop = () => {}
const box: React.CSSProperties = { maxWidth: 460 }

export const Checked = () => (
	<div style={box}>
		<CheckRow id="check-favourite" checked onChange={noop} label="Favourite"
			help="Shown first in the category list on an order's form, and appears in the Favourite categories card on Home." />
	</div>
)

export const Unchecked = () => (
	<div style={box}>
		<CheckRow id="check-scan" checked={false} onChange={noop}
			label="Show the scan card on Home"
			help="Pressing LATER on that card also turns this off." />
	</div>
)

export const AStack = () => (
	<div style={box}>
		<CheckRow id="check-attachments" checked onChange={noop} label="Import attachments"
			help="The receipt file attached to an order. With this off, orders import without their attachments." />
		<CheckRow id="check-images" checked={false} onChange={noop} label="Import images"
			help="The photo attached to a line item. With this off, items import without their images." />
	</div>
)

export const WithoutHelp = () => (
	<div style={box}>
		<CheckRow id="check-confirm" checked onChange={noop}
			label="Ask before deleting anything" />
	</div>
)
