import { useState } from 'react'
import { Combobox, ComboboxOption, ComboboxGroup, ComboboxSeparator, ComboboxEmpty } from '../../react/src/components/Combobox.jsx'
import { Field } from '../../react/src/components/Field.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'

const VENDORS = [
	{ name: 'Indbo Møbler', orders: '7 orders' },
	{ name: 'HAY', orders: '3 orders' },
	{ name: 'Muuto', orders: '1 order' },
	{ name: 'Bilka', orders: '12 orders' },
	{ name: 'Normann Copenhagen', orders: '2 orders' }
]
const STATUSES = { Draft: 'draft', 'In progress': 'progress', Delivered: 'done', Returned: 'returned', Cancelled: 'cancelled' }

export default {
	title: 'Fields/Combobox',
	component: Combobox,
	decorators: [Story => <div style={{ maxWidth: 360, minHeight: 360 }}><Story /></div>]
}

export const Vendor = {
	render: () => {
		const [vendor, setVendor] = useState('Indbo Møbler')
		const [open, setOpen] = useState(true)
		return (
			<Field label="Vendor">
				<Combobox value={vendor} open={open} onOpenChange={setOpen}>
					<ComboboxGroup>Recent</ComboboxGroup>
					{VENDORS.map(v => (
						<ComboboxOption key={v.name} mark={<Mark size="small" fill="solid">{v.name}</Mark>} meta={v.orders}
							selected={vendor === v.name} onSelect={() => { setVendor(v.name); setOpen(false) }}>{v.name}</ComboboxOption>
					))}
				</Combobox>
			</Field>
		)
	}
}

export const Searchable = {
	render: () => {
		const [vendor, setVendor] = useState(null)
		const [query, setQuery] = useState('')
		const [open, setOpen] = useState(false)
		const matches = VENDORS.filter(v => v.name.toLowerCase().includes(query.toLowerCase()))
		return (
			<Field label="Vendor">
				<Combobox searchable placeholder="Start typing a vendor" value={vendor}
					search={query} onSearch={setQuery} open={open} onOpenChange={setOpen} noun="vendors">
					{matches.length
						? matches.map(v => (
							<ComboboxOption key={v.name} mark={<Mark size="small" fill="solid">{v.name}</Mark>} selected={vendor === v.name}
								onSelect={() => { setVendor(v.name); setQuery(''); setOpen(false) }}>{v.name}</ComboboxOption>
						))
						: <ComboboxEmpty>No vendor by that name.</ComboboxEmpty>}
					<ComboboxSeparator />
					<ComboboxOption create onSelect={() => setOpen(false)}>Add “{query || 'a new vendor'}”</ComboboxOption>
				</Combobox>
			</Field>
		)
	}
}

export const Sort = {
	render: () => {
		const [sort, setSort] = useState('Newest first')
		const [open, setOpen] = useState(false)
		return (
			<Combobox variant="sort" aria-label="Sort" prefix="Sort" value={sort} open={open} onOpenChange={setOpen}>
				{['Newest first', 'Oldest first', 'Amount, high to low'].map(option => (
					<ComboboxOption key={option} selected={sort === option} onSelect={() => { setSort(option); setOpen(false) }}>{option}</ComboboxOption>
				))}
			</Combobox>
		)
	}
}

export const Status = {
	render: () => {
		const [status, setStatus] = useState('Delivered')
		const [open, setOpen] = useState(true)
		return (
			<Combobox aria-label="Status" value={status} lead={<span className="sp-combobox__dot" data-dot={STATUSES[status]} />} open={open} onOpenChange={setOpen}>
				<ComboboxGroup>Status</ComboboxGroup>
				{Object.entries(STATUSES).map(([label, dot]) => (
					<ComboboxOption key={label} dot={dot} selected={status === label} onSelect={() => { setStatus(label); setOpen(false) }}>{label}</ComboboxOption>
				))}
			</Combobox>
		)
	}
}

export const Disabled = { render: () => <Field label="Vendor"><Combobox value="Indbo Møbler" disabled><ComboboxOption>Indbo Møbler</ComboboxOption></Combobox></Field> }
