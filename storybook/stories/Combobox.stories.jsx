import { useState } from 'react'
import { MotionGlobalConfig } from 'motion/react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { Combobox, ComboboxOption, ComboboxGroup, ComboboxSeparator, ComboboxEmpty } from '../../react/src/components/Combobox.jsx'
import { Field } from '../../react/src/components/Field.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { Button } from '../../react/src/components/Button.jsx'
import { ListItem } from '../../react/src/components/ListItem.jsx'
import { useHeld } from './controls.js'

const VENDORS = [
	{ name: 'Indbo Møbler', orders: '7 orders' },
	{ name: 'HAY', orders: '3 orders' },
	{ name: 'Muuto', orders: '1 order' },
	{ name: 'Bilka', orders: '12 orders' },
	{ name: 'Normann Copenhagen', orders: '2 orders' }
]
// on a phone a list is a sheet from the bottom edge: these stories are about the desktop panel
const DESKTOP = { viewport: { value: 'desktop', isRotated: false } }
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
	globals: DESKTOP,
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
		// the arrow at the field's end opens the list and closes it again, as a native select's does
		const arrow = canvasElement.querySelector('.sp-field__chevron')
		await userEvent.click(arrow)
		await expect(args.onOpenChange).toHaveBeenLastCalledWith(true)
		await userEvent.click(arrow)
		await expect(args.onOpenChange).toHaveBeenLastCalledWith(false)
		await expect(field).toHaveFocus()
	}
}

export const Several = {
	args: { multiple: true, label: 'Vendors this rule covers', value: ['Indbo Møbler', 'HAY'], placeholder: 'Add a vendor', noun: 'vendors', danger: false, marked: undefined, onChange: fn(), onSearch: fn() },
	argTypes: {
		label: { control: 'text', description: 'The Field\'s label' },
		marked: { control: 'select', options: [undefined, ...VENDORS.map(v => v.name)] }
	},
	render: ({ label, onChange, onSearch, onOpenChange, ...args }) => {
		const [values, setValues] = useHeld(args, 'value')
		const [query, setQuery] = useState('')
		const change = next => { setValues(next); onChange(next) }
		const matches = VENDORS.filter(v => !values.includes(v.name) && v.name.toLowerCase().includes(query.toLowerCase()))
		return (
			<Field label={label}>
				<Combobox {...args} value={values} onChange={change} onSearch={q => { setQuery(q); onSearch(q) }}>
					{matches.map(v => (
						<ComboboxOption key={v.name} meta={v.orders} onSelect={() => change([...values, v.name])}>{v.name}</ComboboxOption>
					))}
				</Combobox>
			</Field>
		)
	},
	play: async ({ args, canvas, canvasElement }) => {
		const field = canvas.getByRole('combobox')
		await userEvent.type(field, 'Muuto{Enter}')
		await expect(args.onChange).toHaveBeenLastCalledWith(['Indbo Møbler', 'HAY', 'Muuto'])
		// a chip the reader adds grows in
		await expect([...canvasElement.querySelectorAll('.sp-chip')].map(c => c.textContent)).toContain('Muuto')
		await userEvent.click(canvas.getByRole('button', { name: 'Remove HAY' }))
		await expect(args.onChange).toHaveBeenLastCalledWith(['Indbo Møbler', 'Muuto'])
		// one removed shrinks out, and is gone once it has
		await waitFor(() => expect([...canvasElement.querySelectorAll('.sp-chip')].map(c => c.textContent)).toEqual(['Indbo Møbler', 'Muuto']))
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

const KINDS = ['Expense', 'Income', 'Refund']
const CATEGORIES = ['Decor', 'Office', 'Garden furniture, outdoor storage and greenhouse supplies']
const MANY = ['Bathroom', 'Bedroom', 'Books', 'Children', 'Cleaning', 'Clothes', 'Decor', 'Electronics', 'Garden', 'Gifts', 'Groceries', 'Health', 'Hobby', 'Kitchen', 'Lighting', 'Living room', 'Office', 'Pets', 'Sports', 'Storage', 'Tools', 'Travel']

// one select whose choice the story holds, opened or shut by its args
const Held = ({ args, name, options, onPick, onOpenChange }) => {
	const [value, setValue] = useHeld(args, 'value')
	const [open, setOpen] = useHeld(args, 'open')
	const openChange = next => { setOpen(next); onOpenChange(next) }
	return (
		<Combobox {...args} value={value} open={open} onOpenChange={openChange}>
			{options.map(option => (
				<ComboboxOption key={option} selected={value === option} onSelect={() => { setValue(option); onPick(option); openChange(false) }}>{option}</ComboboxOption>
			))}
		</Combobox>
	)
}

/** A list is its field's width, and grows past it only for an option that would not fit, up to 288. */
export const ListWidth = {
	globals: DESKTOP,
	args: { label: 'Kind', value: KINDS[0], open: true, onPick: fn() },
	argTypes: {
		value: { control: 'select', options: KINDS },
		label: { control: 'text', description: 'The Field\'s label' }
	},
	render: ({ label, onPick, onOpenChange, ...args }) => (
		<div className="sp-row-flex sp-gap-16">
			<div style={{ width: 157 }}><Field label={label}><Held args={args} options={KINDS} onPick={onPick} onOpenChange={onOpenChange} /></Field></div>
			<div style={{ width: 157 }}><Field label="Category"><Held args={{ ...args, value: CATEGORIES[0] }} options={CATEGORIES} onPick={onPick} onOpenChange={onOpenChange} /></Field></div>
		</div>
	),
	play: async ({ canvasElement }) => {
		const [kind, category] = [...canvasElement.querySelectorAll('.sp-combobox')]
		const width = el => el.getBoundingClientRect().width
		await waitFor(() => expect(Math.abs(width(kind.querySelector('.sp-combobox__panel')) - width(kind))).toBeLessThan(0.5))
		await expect(width(category.querySelector('.sp-combobox__panel'))).toBeCloseTo(288, 0)
		// the long option stays on its line and is cut
		const long = page(canvasElement).getByRole('option', { name: CATEGORIES[2] }).querySelector('span')
		await expect(long.scrollWidth).toBeGreaterThan(long.clientWidth)
	}
}

/** A list moved to fit, here hung from its field's right edge at the window's edge, fades out where it stood. */
export const ClosingAtTheEdge = {
	globals: DESKTOP,
	args: { label: 'Category', value: CATEGORIES[0], open: false, onPick: fn() },
	argTypes: {
		value: { control: 'select', options: CATEGORIES },
		label: { control: 'text', description: 'The Field\'s label' }
	},
	render: ({ label, onPick, onOpenChange, ...args }) => (
		<div style={{ position: 'fixed', top: 16, right: 16, width: 157 }}>
			<Field label={label}><Held args={args} options={CATEGORIES} onPick={onPick} onOpenChange={onOpenChange} /></Field>
		</div>
	),
	play: async ({ args, canvas, canvasElement }) => {
		await userEvent.click(canvas.getByRole('combobox'))
		const panel = canvasElement.querySelector('.sp-combobox__panel')
		const root = canvasElement.querySelector('.sp-combobox')
		await waitFor(() => expect(panel).toHaveAttribute('data-hang', 'end'))
		const open = panel.getBoundingClientRect()
		await expect(open.right).toBeLessThanOrEqual(document.documentElement.clientWidth)
		// npm test skips every move; this check needs the fade itself
		const skipped = MotionGlobalConfig.skipAnimations
		MotionGlobalConfig.skipAnimations = false
		try {
			await userEvent.click(page(canvasElement).getByRole('option', { name: 'Office' }))
			await expect(args.onPick).toHaveBeenCalledWith('Office')
			// while it fades it keeps its place; once the fade has ended it is back in its own spot
			await expect(root).toHaveAttribute('data-closing', 'true')
			await expect(panel.getBoundingClientRect().left).toBeCloseTo(open.left, 0)
			await waitFor(() => expect(root).not.toHaveAttribute('data-closing'))
			// the fade leaves its own opacity behind; what must go is the placement
			await waitFor(() => expect([panel.style.position, panel.style.left, panel.style.right, panel.style.width]).toEqual(['', '', '', '']))
			await expect(panel).not.toHaveAttribute('data-hang')
		} finally {
			MotionGlobalConfig.skipAnimations = skipped
		}
	}
}

/** A list longer than its cap scrolls inside, with the thin shared scrollbar. */
export const LongList = {
	globals: DESKTOP,
	args: { label: 'Category', value: MANY[0], open: true, onPick: fn() },
	argTypes: {
		value: { control: 'select', options: MANY },
		label: { control: 'text', description: 'The Field\'s label' }
	},
	render: ({ label, onPick, onOpenChange, ...args }) => (
		<Field label={label}><Held args={args} options={MANY} onPick={onPick} onOpenChange={onOpenChange} /></Field>
	),
	play: async ({ canvasElement }) => {
		const panel = canvasElement.querySelector('.sp-combobox__panel')
		await expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight)
		await expect(getComputedStyle(panel).scrollbarWidth).toBe('thin')
		// the last option is reached by scrolling the list, not the page
		panel.scrollTop = panel.scrollHeight
		const last = page(canvasElement).getByRole('option', { name: 'Travel' }).getBoundingClientRect()
		await expect(last.bottom).toBeLessThanOrEqual(panel.getBoundingClientRect().bottom + 0.5)
	}
}

const YEARS = ['2024', '2025', '2026']

/** In a bar beside buttons, `fullWidth` takes the room the buttons leave (Mobile screens 21a). */
export const FullWidth = {
	args: { 'aria-label': 'Year', value: '2026', fullWidth: true, onPick: fn(), onEdit: fn() },
	argTypes: { value: { control: 'select', options: YEARS } },
	render: ({ onPick, onEdit, ...args }) => {
		const [year, setYear] = useHeld(args, 'value')
		return (
			<ListItem variant="card">
				<Combobox {...args} value={year}>
					{YEARS.map(option => (
						<ComboboxOption key={option} selected={year === option} onSelect={() => { setYear(option); onPick(option) }}>{option}</ComboboxOption>
					))}
				</Combobox>
				<Button variant="outline" onClick={onEdit}>Edit</Button>
			</ListItem>
		)
	},
	play: async ({ args, canvas, canvasElement }) => {
		const bar = canvasElement.querySelector('.sp-list-item--card')
		const field = canvasElement.querySelector('.sp-combobox')
		const edit = canvas.getByRole('button', { name: 'Edit' })
		// the field ends where the gap before Edit begins
		const gap = parseFloat(getComputedStyle(bar).columnGap) || 0
		await expect(Math.round(field.getBoundingClientRect().right + gap)).toBe(Math.round(edit.getBoundingClientRect().left))
		await userEvent.click(canvas.getByRole('combobox', { name: /Year/ }))
		await userEvent.click(page(canvasElement).getByRole('option', { name: '2025' }))
		await expect(args.onPick).toHaveBeenCalledWith('2025')
		await userEvent.click(edit)
		await expect(args.onEdit).toHaveBeenCalled()
	}
}
