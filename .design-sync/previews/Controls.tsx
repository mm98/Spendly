import { Controls, SearchInput, Combobox, ComboboxOption, Segmented, Button } from 'spendly-react';

const sort = [
	<ComboboxOption key="n" selected>Newest first</ComboboxOption>,
	<ComboboxOption key="o">Oldest first</ComboboxOption>,
	<ComboboxOption key="a">Largest total</ComboboxOption>
];

export const OrderBar = () => (
	<Controls>
		<SearchInput value="" onChange={() => {}} placeholder="Search orders…" aria-label="Search orders" />
		<Button variant="outline">Filters · 2</Button>
		<Combobox variant="sort-end" prefix="Sort" value="Newest first">{sort}</Combobox>
		<Segmented name="order-view" aria-label="Show orders as" defaultValue="rows"
			options={[{ value: 'rows', label: 'Rows' }, { value: 'cards', label: 'Cards' }]} />
	</Controls>
);

export const Searching = () => (
	<Controls>
		<SearchInput value="sofa" onChange={() => {}} placeholder="Search bookmarks…" aria-label="Search bookmarks" />
		<Combobox variant="sort-end" prefix="Sort" value="Name">{sort}</Combobox>
	</Controls>
);
