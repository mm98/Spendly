import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { COUNTRIES, countryName } from '../api/countries.js'

/** The Country field's choice (Vendors and categories 5b, Invoice 24d): every country, Denmark first. */
export function CountryCombobox({ value, onChange, ...rest }) {
	return (
		<Combobox value={countryName(value)} {...rest}>
			{COUNTRIES.map(c => (
				<ComboboxOption key={c.code} selected={c.code === value} onSelect={() => onChange(c.code)}>{c.name}</ComboboxOption>
			))}
		</Combobox>
	)
}
