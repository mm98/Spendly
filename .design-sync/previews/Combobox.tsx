import { Combobox, ComboboxEmpty, ComboboxGroup, ComboboxOption, ComboboxSeparator, Field, Mark } from 'spendly-react';

const noop = () => {};
// the open panel hangs below the trigger outside its own box: this keeps the cell tall enough to show it
const room = (height: number) => ({ maxWidth: 340, minHeight: height }) as const;

export const Open = () => (
	<div style={room(300)}>
		<Field label="Vendor">
			<Combobox value="Indbo Møbler" open onOpenChange={noop}>
				<ComboboxGroup>Recent</ComboboxGroup>
				<ComboboxOption selected mark={<Mark size="small" fill="solid">Indbo Møbler</Mark>} meta="7 orders" onSelect={noop}>Indbo Møbler</ComboboxOption>
				<ComboboxOption mark={<Mark size="small" fill="solid">HAY</Mark>} meta="3 orders" onSelect={noop}>HAY</ComboboxOption>
				<ComboboxOption mark={<Mark size="small" fill="solid">Muuto</Mark>} meta="1 order" onSelect={noop}>Muuto</ComboboxOption>
				<ComboboxSeparator />
				<ComboboxOption create onSelect={noop}>Add “Muuto ApS” as a vendor</ComboboxOption>
			</Combobox>
		</Field>
	</div>
);

export const Statuses = () => (
	<div style={room(280)}>
		<Combobox aria-label="Status" value="In progress" lead={<span className="sp-combobox__dot" data-dot="progress" />} open onOpenChange={noop}>
			<ComboboxGroup>Status</ComboboxGroup>
			<ComboboxOption dot="draft" onSelect={noop}>Draft</ComboboxOption>
			<ComboboxOption dot="progress" selected onSelect={noop}>In progress</ComboboxOption>
			<ComboboxOption dot="done" onSelect={noop}>Delivered</ComboboxOption>
			<ComboboxOption dot="returned" onSelect={noop}>Returned</ComboboxOption>
			<ComboboxOption dot="cancelled" disabled onSelect={noop}>Cancelled</ComboboxOption>
		</Combobox>
	</div>
);

export const Searchable = () => (
	<div style={room(180)}>
		<Field label="Vendor">
			<Combobox searchable value="" search="Vitra" onSearch={noop} placeholder="Start typing a vendor" noun="vendors" open onOpenChange={noop}>
				<ComboboxEmpty>No vendor by that name.</ComboboxEmpty>
			</Combobox>
		</Field>
	</div>
);

export const Closed = () => (
	<div style={{ display: 'grid', gap: 16, maxWidth: 340 }}>
		<Field label="Category">
			<Combobox value="Decor">
				<ComboboxOption selected onSelect={noop}>Decor</ComboboxOption>
			</Combobox>
		</Field>
		<div className="sp-row-flex sp-gap-12">
			<Combobox variant="sort" aria-label="Sort" prefix="Sort" value="Newest first">
				<ComboboxOption selected onSelect={noop}>Newest first</ComboboxOption>
			</Combobox>
		</div>
		<Field label="Currency" message="Set by your account.">
			<Combobox variant="narrow" value="DKK" disabled>
				<ComboboxOption selected onSelect={noop}>DKK</ComboboxOption>
			</Combobox>
		</Field>
	</div>
);
