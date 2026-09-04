import { MoveOrdersCard } from 'spendly-react'

// The card lives in the rail beside DeleteCard, which is where its width comes from.
const rail: React.CSSProperties = { width: 340 }
const noop = () => {}

const vendors = [{
	heading: 'Favourites',
	options: [{ id: 'v1', label: 'Netto' }, { id: 'v2', label: 'Føtex' }],
}, {
	heading: 'All vendors',
	options: [{ id: 'v3', label: 'Coop 365' }, { id: 'v4', label: 'Rema 1000' }],
}]

const categories = [{
	heading: 'Favourites',
	options: [{ id: 'c1', label: 'Household' }, { id: 'c2', label: 'Transport' }],
}]

export const MoveAVendorsOrders = () => (
	<div style={rail}>
		<MoveOrdersCard what="vendor" from="Bilka" count={14} groups={vendors} onMove={noop}>
			Bilka has 14 orders. Move them to another vendor before you remove it.
		</MoveOrdersCard>
	</div>
)

export const MoveACategorysOrders = () => (
	<div style={rail}>
		<MoveOrdersCard what="category" from="Groceries" count={1} groups={categories} onMove={noop}>
			Groceries has 1 order. Move it to another category before you remove it.
		</MoveOrdersCard>
	</div>
)

// Nothing to move: the sentence stays, the control goes.
export const NothingToMove = () => (
	<div style={rail}>
		<MoveOrdersCard what="vendor" from="Fakta" count={0} groups={vendors} onMove={noop}>
			Fakta has no orders, so there is nothing to move. You can remove it.
		</MoveOrdersCard>
	</div>
)
