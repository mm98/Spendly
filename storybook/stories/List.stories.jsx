import { useState } from 'react'
import { knownAccessibilityFaults, useHeld } from './controls.js'
import { List, Caption, Selected, ListHead, ListRow, ListCell, Controls, Filters, Crumb, Crumbs, Record, Records, ListMore, BulkBar, ListToolbar } from '../../react/src/components/List.jsx'
import { Card, CardHeader } from '../../react/src/components/Card.jsx'
import { Button } from '../../react/src/components/Button.jsx'
import { Chip } from '../../react/src/components/Chip.jsx'
import { Pill } from '../../react/src/components/Pill.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { SearchInput } from '../../react/src/components/Inputs.jsx'
import { Stacked } from '../../react/src/components/Utilities.jsx'
import { expect, fn, userEvent, waitFor } from 'storybook/test'

// more rows than one page, so paging is part of every list story
const VENDORS = ['Indbo Møbler', 'HAY', 'Muuto', 'Nordal', 'Ferm Living', 'Menu', 'Gubi', 'Normann', 'Woud', 'Bolia', 'Eva Solo', 'Stelton']
const STATUS = [['Approved', 'success'], [null, null], ['Failed', 'danger'], ['Approved', 'success'], ['Returned', 'danger']]
const ORDERS = Array.from({ length: 48 }, (_, i) => {
	const [pill, color] = STATUS[i % STATUS.length]
	return {
		ref: `SPENDLY-${500 - i}`,
		name: VENDORS[i % VENDORS.length],
		date: `${String(28 - (i % 28)).padStart(2, '0')}.08.2026`,
		pill,
		color,
		amount: (420 + ((i * 937) % 4800)).toLocaleString('da-DK', { minimumFractionDigits: 2 }),
		saved: i % 3 ? '0,00' : ((i * 53) % 900).toLocaleString('da-DK', { minimumFractionDigits: 2 })
	}
})

export default {
	title: 'Lists/List',
	component: List,
	subcomponents: { Caption, Selected, ListHead, ListRow, ListCell, Controls, Filters, Crumb, Crumbs, Record, Records, ListMore, BulkBar, ListToolbar },
	argTypes: { data: { control: false } }
}

// a narrow column draws orders as cards, so the table is a wide screen's only
export const Orders = {
	parameters: { a11y: knownAccessibilityFaults },
	globals: { viewport: { value: 'desktop', isRotated: false } },
	args: { rows: ORDERS.length, noun: 'orders', pageSize: 10, compact: false, headless: false, locale: 'da-DK', onRowClick: fn() },
	argTypes: { rows: { control: { type: 'range', min: 0, max: ORDERS.length }, description: 'How many of the story\'s orders the list is given' } },
	render: ({ rows, ...args }) => (
		<List {...args} data={ORDERS.slice(0, rows)} recordKey={o => o.ref}>
			<Caption>
				<strong className="sp-data">{rows} orders</strong>
				<span className="sp-subtitle"> · 112.480,00 kr.</span>
			</Caption>
			<Selected>
				{chosen => [
					<span key="n" className="sp-bulkbar__count">{chosen.length} of {ORDERS.length} selected</span>,
					<span key="g" className="sp-grow" />,
					<Button key="s" variant="outline" size="small" border="inherit">Set status</Button>,
					<Button key="x" variant="outline" size="small" border="inherit">Export</Button>,
					<Button key="d" color="danger" size="small" iconStart="trash">Delete</Button>
				]}
			</Selected>
			<ListHead>
				<ListCell cell="checkbox" />
				<ListCell width="title">Order</ListCell>
				<ListCell width="date">Date</ListCell>
				<ListCell width="status">Status</ListCell>
				<ListCell width="amount">Amount</ListCell>
			</ListHead>
			<ListRow>
				{o => [
					<ListCell key="c" cell="checkbox" />,
					<ListCell key="t" cell="flex">
						<Mark size="medium" fill="solid">{o.name}</Mark>
						<Stacked>
							<span className="sp-title sp-truncate">{o.name}</span>
							<span className="sp-subtitle">{o.ref}</span>
						</Stacked>
					</ListCell>,
					<ListCell key="d"><span className="sp-data sp-number">{o.date}</span></ListCell>,
					<ListCell key="s">{o.pill ? <Pill color={o.color}>{o.pill}</Pill> : <Pill state="progress">Scanning</Pill>}</ListCell>,
					<ListCell key="a" cell="amount">
						<span className="sp-amount">{o.amount}</span>
						<span className="sp-amount-secondary" {...(o.saved === '0,00' ? {} : { 'data-color': 'success' })}>Saved {o.saved}</span>
					</ListCell>
				]}
			</ListRow>
		</List>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByText('SPENDLY-500'))
		await expect(args.onRowClick).toHaveBeenCalledOnce()
		const pick = canvas.getAllByRole('checkbox')[1]
		await userEvent.click(pick)
		await waitFor(() => expect(canvas.getByText(`1 of ${args.rows} selected`)).toBeInTheDocument())
		await userEvent.click(pick)
	}
}

export const SearchAndFilters = {
	args: { crumbs: ['August', 'HAY', 'Over 1.000 kr.'], onClear: fn(), onSearch: fn() },
	argTypes: { crumbs: { description: 'The filters the story starts with' } },
	render: ({ crumbs: start, onClear, onSearch }) => {
		const [query, setQuery] = useState('')
		const [crumbs, setCrumbs] = useHeld({ crumbs: start }, 'crumbs')
		return (
			<div className="sp-stack sp-gap-12">
				<Controls>
					<SearchInput value={query} onChange={q => { setQuery(q); onSearch(q) }} placeholder="Search orders" aria-label="Search orders" />
					<Button iconStart="plus">New order</Button>
				</Controls>
				{crumbs.length
					? (
						<Filters onClear={() => { setCrumbs([]); onClear() }}>
							{crumbs.map(c => <Crumb key={c} name={c} onRemove={() => setCrumbs(crumbs.filter(x => x !== c))}>{c}</Crumb>)}
						</Filters>
					)
					: null}
			</div>
		)
	},
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Remove HAY' }))
		await expect(canvas.queryByText('HAY')).not.toBeInTheDocument()
		await expect(args.onClear).not.toHaveBeenCalled()
	}
}

export const DrillPath = {
	args: { root: '2026', onOpen: fn(), onRemove: fn(), onReset: fn() },
	render: ({ root, onOpen, onRemove, onReset }) => (
		<Card variant="path">
			<CardHeader name="Showing" actions={[{ label: 'Reset', onClick: onReset }, { label: 'Open in orders', to: '/orders' }]} />
			<Crumbs root={root} aria-label="Showing">
				<Crumb onOpen={onOpen} onRemove={onRemove}>Furniture</Crumb>
				<Crumb name="Indbo Møbler" onRemove={onRemove}>Indbo Møbler</Crumb>
			</Crumbs>
		</Card>
	)
}

const BOOKMARKS = Array.from({ length: 9 }, (_, i) => ({ id: i, name: ['Lounge chair', 'Pendant lamp', 'Rug, 200 × 300', 'Side table'][i % 4], site: ['hay.dk', 'muuto.com', 'bolia.com'][i % 3], category: ['Furniture', 'Lighting', 'Decor'][i % 3] }))

export const Cards_ = {
	parameters: { a11y: knownAccessibilityFaults },
	name: 'Cards',
	args: { pageSize: 6, onOpen: fn() },
	argTypes: { pageSize: { control: { type: 'range', min: 1, max: 9 }, description: 'ListMore\'s pageSize' } },
	render: ({ pageSize, onOpen }) => {
		const [shown, setShown] = useHeld({ shown: pageSize }, 'shown')
		return (
			<Records
				head={<ListToolbar loose><strong className="sp-data">{BOOKMARKS.length} bookmarks</strong></ListToolbar>}
				footer={<ListMore loose shown={Math.min(shown, BOOKMARKS.length)} total={BOOKMARKS.length} pageSize={pageSize} onMore={() => setShown(shown + pageSize)} />}>
				{BOOKMARKS.slice(0, shown).map(b => (
					<Record key={b.id} onClick={() => onOpen(b.name)} photos={[]} empty="No picture" title={b.name} subtitle={b.site}
						headChips chips={[<Chip key="c">{b.category}</Chip>]} />
				))}
			</Records>
		)
	}
}

export const BulkActions = {
	args: { count: 4, loose: true, onClear: fn() },
	parameters: { variantsOf: BulkBar },
	render: args => (
		<BulkBar {...args}>
			<span className="sp-grow" />
			<Button variant="outline" size="small" border="inherit">Set status</Button>
			<Button color="danger" size="small" iconStart="trash">Delete</Button>
		</BulkBar>
	)
}
