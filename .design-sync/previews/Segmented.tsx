import { Field, Segmented } from 'spendly-react'

const noop = () => {}
const box: React.CSSProperties = { maxWidth: 420 }

export const Status = () => (
	<div style={box}>
		<Field label="Status" group>
			<Segmented options={['Ordered', 'Delivered', 'Returned']} value="Delivered"
				onChange={noop} label="Status" />
		</Field>
	</div>
)

export const WithAnAnyOption = () => (
	<div style={box}>
		<Field label="Status" group>
			<Segmented options={['Any', 'Ordered', 'Delivered', 'Returned']} value="Any"
				onChange={noop} label="Status" />
		</Field>
	</div>
)

export const RowsPerPage = () => (
	<div style={box}>
		<Field label="Rows per page" group
			help="How many rows the order, vendor and category lists show before the pager.">
			<Segmented options={['5', '10', '15', '20', '25', '50', '100']} value="15"
				onChange={noop} label="Rows per page" />
		</Field>
	</div>
)

export const OnItsOwn = () => (
	<div style={{ display: 'flex' }}>
		<Segmented options={['Last year', 'Prev. period']} value="Prev. period"
			onChange={noop} label="Compare statistics to" />
	</div>
)

export const Roomy = () => (
	<div style={{ display: 'flex' }}>
		<Segmented options={['Ordered', 'Delivered', 'Returned']} value="Ordered"
			compact={false} onChange={noop} label="Status" />
	</div>
)
