import { Combobox, Field, FieldPair } from 'spendly-react'

const vendors = [{
	heading: 'Favourites',
	options: [{ id: 'v1', label: 'Bilka' }, { id: 'v2', label: 'Netto' }],
}, {
	heading: 'All vendors',
	options: [{ id: 'v3', label: 'Coop 365' }, { id: 'v4', label: 'Rema 1000' }, { id: 'v5', label: 'Føtex' }],
}]

const categories = [{
	heading: 'Favourites',
	options: [{ id: 'c1', label: 'Groceries' }, { id: 'c2', label: 'Household' }],
}]

const noop = () => {}

export const InAForm = () => (
	<div style={{ maxWidth: 460 }}>
		<Field label="Vendor" htmlFor="preview-vendor">
			<Combobox id="preview-vendor" label="Vendor" placeholder="Search vendors..."
				value="Bilka" groups={vendors} onChange={noop} onSelect={noop}
				action="CREATE VENDOR" leadingIcon="store" required />
		</Field>
	</div>
)

export const Empty = () => (
	<div style={{ maxWidth: 460 }}>
		<Field label="Category" htmlFor="preview-category" optional>
			<Combobox id="preview-category" label="Category" placeholder="Any category"
				value="" groups={categories} onChange={noop} onSelect={noop} />
		</Field>
	</div>
)

export const PickOnly = () => (
	<div style={{ maxWidth: 280 }}>
		<Field label="Sort by" htmlFor="preview-sort">
			<Combobox id="preview-sort" label="Sort by" value="Newest first" pickOnly
				groups={[{ heading: 'Sort by', options: [
					{ id: 'new', label: 'Newest first' },
					{ id: 'old', label: 'Oldest first' },
					{ id: 'high', label: 'Highest amount' },
				] }]} onChange={noop} onSelect={noop} />
		</Field>
	</div>
)

export const Invalid = () => (
	<div style={{ maxWidth: 460 }}>
		<Field label="Vendor" htmlFor="preview-vendor-bad" error="Pick a vendor before saving." errorId="preview-vendor-err">
			<Combobox id="preview-vendor-bad" label="Vendor" placeholder="Search vendors..."
				value="" groups={vendors} onChange={noop} onSelect={noop}
				invalid describedBy="preview-vendor-err" required />
		</Field>
	</div>
)

export const APair = () => (
	<div style={{ maxWidth: 560 }}>
		<FieldPair>
			<Field label="Vendor" htmlFor="pair-vendor">
				<Combobox id="pair-vendor" label="Vendor" value="Netto" groups={vendors} onChange={noop} onSelect={noop} />
			</Field>
			<Field label="Category" htmlFor="pair-category">
				<Combobox id="pair-category" label="Category" value="Groceries" groups={categories} onChange={noop} onSelect={noop} />
			</Field>
		</FieldPair>
	</div>
)
