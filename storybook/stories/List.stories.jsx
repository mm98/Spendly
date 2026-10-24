import { useState } from 'react'
import { List, Caption, Selected, ListHead, ListRow, ListCell, Controls, Filters, Crumb, Crumbs, Record, Records, ListMore, BulkBar, ListToolbar } from '../../react/src/components/List.jsx'
import { Card, CardHeader } from '../../react/src/components/Card.jsx'
import { Button } from '../../react/src/components/Button.jsx'
import { Chip } from '../../react/src/components/Chip.jsx'
import { Pill } from '../../react/src/components/Pill.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { SearchInput } from '../../react/src/components/Inputs.jsx'
import { Stacked } from '../../react/src/components/Utilities.jsx'

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
	component: List
}

// a narrow column draws orders as cards, so the table is a wide screen's only
export const Orders = {
	globals: { viewport: { value: 'desktop', isRotated: false } },
	render: () => (
		<List data={ORDERS} recordKey={o => o.ref} noun="orders" pageSize={10} onRowClick={() => {}} locale="da-DK">
			<Caption>
				<strong className="sp-data">{ORDERS.length} orders</strong>
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
	)
}

export const SearchAndFilters = {
	render: () => {
		const [query, setQuery] = useState('')
		const [crumbs, setCrumbs] = useState(['August', 'HAY', 'Over 1.000 kr.'])
		return (
			<div className="sp-stack sp-gap-12">
				<Controls>
					<SearchInput value={query} onChange={setQuery} placeholder="Search orders" aria-label="Search orders" />
					<Button iconStart="plus">New order</Button>
				</Controls>
				{crumbs.length
					? (
						<Filters onClear={() => setCrumbs([])}>
							{crumbs.map(c => <Crumb key={c} name={c} onRemove={() => setCrumbs(crumbs.filter(x => x !== c))}>{c}</Crumb>)}
						</Filters>
					)
					: null}
			</div>
		)
	}
}

export const DrillPath = {
	render: () => (
		<Card variant="path">
			<CardHeader name="Showing" actions={[{ label: 'Reset', onClick: () => {} }, { label: 'Open in orders', to: '/orders' }]} />
			<Crumbs root="2026" aria-label="Showing">
				<Crumb onOpen={() => {}} onRemove={() => {}}>Furniture</Crumb>
				<Crumb name="Indbo Møbler" onRemove={() => {}}>Indbo Møbler</Crumb>
			</Crumbs>
		</Card>
	)
}

const BOOKMARKS = Array.from({ length: 9 }, (_, i) => ({ id: i, name: ['Lounge chair', 'Pendant lamp', 'Rug, 200 × 300', 'Side table'][i % 4], site: ['hay.dk', 'muuto.com', 'bolia.com'][i % 3], category: ['Furniture', 'Lighting', 'Decor'][i % 3] }))

export const Cards_ = {
	name: 'Cards',
	render: () => {
		const [shown, setShown] = useState(6)
		return (
			<Records
				head={<ListToolbar loose><strong className="sp-data">{BOOKMARKS.length} bookmarks</strong></ListToolbar>}
				footer={<ListMore loose shown={Math.min(shown, BOOKMARKS.length)} total={BOOKMARKS.length} pageSize={6} onMore={() => setShown(shown + 6)} />}>
				{BOOKMARKS.slice(0, shown).map(b => (
					<Record key={b.id} onClick={() => {}} photos={[]} empty="No picture" title={b.name} subtitle={b.site}
						headChips chips={[<Chip key="c">{b.category}</Chip>]} />
				))}
			</Records>
		)
	}
}

export const BulkActions = {
	render: () => (
		<BulkBar loose count={4} onClear={() => {}}>
			<span className="sp-grow" />
			<Button variant="outline" size="small" border="inherit">Set status</Button>
			<Button color="danger" size="small" iconStart="trash">Delete</Button>
		</BulkBar>
	)
}
