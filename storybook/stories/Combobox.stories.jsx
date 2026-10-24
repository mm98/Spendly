import { useState } from 'react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { Combobox, ComboboxOption, ComboboxGroup, ComboboxSeparator, ComboboxEmpty } from '../../react/src/components/Combobox.jsx'
import { Field } from '../../react/src/components/Field.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { useHeld } from './controls.js'

const VENDORS = [
	{ name: 'Indbo Møbler', orders: '7 orders' },
	{ name: 'HAY', orders: '3 orders' },
	{ name: 'Muuto', orders: '1 order' },
	{ name: 'Bilka', orders: '12 orders' },
	{ name: 'Normann Copenhagen', orders: '2 orders' }
]
const STATUSES = { Draft: 'draft', 'In progress': 'progress', Delivered: 'done', Returned: 'returned', Cancelled: 'cancelled' }
const SORTS = ['Newest first', 'Oldest first', 'Amount, high to low']

// The panel is drawn outside the story's own box, over the page.
const page = canvasElement => within(canvasElement.ownerDocument.body)

export default {
	title: 'Fields/Combobox',
	component: Combobox,
	subcomponents: { ComboboxOption, ComboboxGroup, ComboboxSeparator, ComboboxEmpty },
	decorators: [Story => <div style={{ maxWidth: 360, minHeight: 360 }}><Story /></div>],
	args: { onOpenChange: fn() },
	argTypes: { children: { control: false }, lead: { control: false }, trail: { control: false }, unit: { control: false } }
}

export const Vendor = {
	args: { value: 'Indbo Møbler', open: true, label: 'Vendor', onPick: fn() },
	argTypes: {
		value: { control: 'select', options: VENDORS.map(v => v.name) },
		label: { control: 'text', description: 'The Field\'s label' }
	},
	render: ({ label, onPick, onOpenChange, ...args }) => {
		const [vendor, setVendor] = useHeld(args, 'value')
		const [open, setOpen] = useHeld(args, 'open')
		const openChange = next => { setOpen(next); onOpenChange(next) }
		return (
			<Field label={label}>
				<Combobox {...args} value={vendor} open={open} onOpenChange={openChange}>
					<ComboboxGroup>Recent</ComboboxGroup>
					{VENDORS.map(v => (
						<ComboboxOption key={v.name} mark={<Mark size="small" fill="solid">{v.name}</Mark>} meta={v.orders}
							selected={vendor === v.name} onSelect={() => { setVendor(v.name); onPick(v.name); openChange(false) }}>{v.name}</ComboboxOption>
					))}
				</Combobox>
			</Field>
		)
	},
	play: async ({ args, canvasElement }) => {
		await userEvent.click(page(canvasElement).getByRole('option', { name: /Muuto/ }))
		await expect(args.onPick).toHaveBeenCalledWith('Muuto')
		await expect(args.onOpenChange).toHaveBeenLastCalledWith(false)
		await waitFor(() => expect(page(canvasElement).queryByRole('listbox')).not.toBeInTheDocument())
	}
}

export const Searchable = {
	args: { searchable: true, placeholder: 'Start typing a vendor', noun: 'vendors', label: 'Vendor', onPick: fn(), onSearch: fn() },
	argTypes: { label: { control: 'text', description: 'The Field\'s label' } },
	render: ({ label, onPick, onSearch, onOpenChange, ...args }) => {
		const [vendor, setVendor] = useState(null)
		const [query, setQuery] = useState('')
		const [open, setOpen] = useState(false)
		const openChange = next => { setOpen(next); onOpenChange(next) }
		const matches = VENDORS.filter(v => v.name.toLowerCase().includes(query.toLowerCase()))
		return (
			<Field label={label}>
				<Combobox {...args} value={vendor} search={query} onSearch={q => { setQuery(q); onSearch(q) }} open={open} onOpenChange={openChange}>
					{matches.length
						? matches.map(v => (
							<ComboboxOption key={v.name} mark={<Mark size="small" fill="solid">{v.name}</Mark>} selected={vendor === v.name}
								onSelect={() => { setVendor(v.name); onPick(v.name); setQuery(''); openChange(false) }}>{v.name}</ComboboxOption>
						))
						: <ComboboxEmpty>No vendor by that name.</ComboboxEmpty>}
					<ComboboxSeparator />
					<ComboboxOption create onSelect={() => openChange(false)}>Add “{query || 'a new vendor'}”</ComboboxOption>
				</Combobox>
			</Field>
		)
	},
	play: async ({ args, canvas, canvasElement }) => {
		const field = canvas.getByRole('combobox')
		await userEvent.click(field)
		await userEvent.type(field, 'mu')
		await expect(args.onSearch).toHaveBeenLastCalledWith('mu')
		const options = page(canvasElement).getAllByRole('option')
		await expect(options.map(o => o.textContent)).toEqual(['MUMuuto', 'Add “mu”'])
		await userEvent.click(options[0])
		await expect(args.onPick).toHaveBeenCalledWith('Muuto')
	}
}

export const Sort = {
	args: { variant: 'sort', 'aria-label': 'Sort', prefix: 'Sort', value: SORTS[0], onPick: fn() },
	argTypes: { value: { control: 'select', options: SORTS } },
	render: ({ onPick, onOpenChange, ...args }) => {
		const [sort, setSort] = useHeld(args, 'value')
		const [open, setOpen] = useState(false)
		const openChange = next => { setOpen(next); onOpenChange(next) }
		return (
			<Combobox {...args} value={sort} open={open} onOpenChange={openChange}>
				{SORTS.map(option => (
					<ComboboxOption key={option} selected={sort === option} onSelect={() => { setSort(option); onPick(option); openChange(false) }}>{option}</ComboboxOption>
				))}
			</Combobox>
		)
	},
	play: async ({ args, canvas, canvasElement }) => {
		await userEvent.click(canvas.getByRole('combobox', { name: /Sort/ }))
		await userEvent.click(page(canvasElement).getByRole('option', { name: 'Oldest first' }))
		await expect(args.onPick).toHaveBeenCalledWith('Oldest first')
		await expect(canvas.getByRole('combobox', { name: /Sort/ })).toHaveTextContent('Oldest first')
	}
}

export const Status = {
	args: { 'aria-label': 'Status', value: 'Delivered', open: true, onPick: fn() },
	argTypes: { value: { control: 'select', options: Object.keys(STATUSES) } },
	render: ({ onPick, onOpenChange, ...args }) => {
		const [status, setStatus] = useHeld(args, 'value')
		const [open, setOpen] = useHeld(args, 'open')
		const openChange = next => { setOpen(next); onOpenChange(next) }
		return (
			<Combobox {...args} value={status} lead={<span className="sp-combobox__dot" data-dot={STATUSES[status]} />} open={open} onOpenChange={openChange}>
				<ComboboxGroup>Status</ComboboxGroup>
				{Object.entries(STATUSES).map(([label, dot]) => (
					<ComboboxOption key={label} dot={dot} selected={status === label} onSelect={() => { setStatus(label); onPick(label); openChange(false) }}>{label}</ComboboxOption>
				))}
			</Combobox>
		)
	}
}

export const Disabled = {
	args: { value: 'Indbo Møbler', disabled: true, label: 'Vendor' },
	argTypes: { label: { control: 'text', description: 'The Field\'s label' } },
	render: ({ label, ...args }) => <Field label={label}><Combobox {...args}><ComboboxOption>Indbo Møbler</ComboboxOption></Combobox></Field>,
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('combobox'))
		await expect(args.onOpenChange).not.toHaveBeenCalled()
	}
}
