import { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { OrderRow } from '../components/Rows.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import { DateInput, Field, FieldPair, FieldShell, FieldUnit, FilterSection, Segmented } from '../components/Form.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { useApi } from '../api/useApi.js'
import { getCategories, getOrders, getVendors, spendKinds } from '../api/client.js'
import { dayMonth, parseAmount } from '../api/format.js'

/* All orders: the search, the filters, and what they leave.

   The chips are the filters, not a picture of them. The prototype drew three and removing
   one changed the list not at all, because the list was markup -- here a chip is the only
   place a filter is stored, so a chip that is gone is a filter that is off and the count
   above the list moves. Each removal leaves focus somewhere deliberate, since it removes the
   element focus was on, and announces once. README 13 and 18.

   FILTERS owns the panel below it: aria-expanded is the state, and there is no live-region
   message for it, because a disclosure announces itself. */

const EMPTY = { vendorId: '', vendorName: '', categoryId: '', categoryName: '', kind: '',
	status: 'Any', from: '', to: '', minAmount: '', maxAmount: '' }

export default function AllOrders() {
	const [params] = useSearchParams()
	const [query, setQuery] = useState(params.get('q') ?? '')
	const [filters, setFilters] = useState(() => ({
		...EMPTY,
		categoryId: params.get('category') ?? '',
		status: params.get('status') ?? 'Any'
	}))
	const [draft, setDraft] = useState(filters)
	const [panelOpen, setPanelOpen] = useState(true)
	const [message, setMessage] = useState('')
	const searchField = useRef(null)
	const chipRow = useRef(null)

	const vendors = useApi(getVendors)
	const categories = useApi(getCategories)

	const request = useMemo(() => ({
		query,
		vendorId: filters.vendorId,
		categoryId: filters.categoryId,
		status: filters.status,
		kind: filters.kind,
		from: filters.from,
		to: filters.to,
		minAmount: filters.minAmount ? parseAmount(filters.minAmount) : null,
		maxAmount: filters.maxAmount ? parseAmount(filters.maxAmount) : null
	}), [query, filters])

	const results = useApi(getOrders, [request])

	const nameOf = (list, id) => list?.find(x => x.id === id)?.name ?? id

	/* One chip per filter that is actually on. Deriving them rather than listing them is what
	   keeps the row and the query from disagreeing. */
	const chips = useMemo(() => {
		const out = []
		if (filters.from || filters.to) out.push({ key: 'dates',
			label: [filters.from && dayMonth(filters.from), filters.to && dayMonth(filters.to)].filter(Boolean).join(' – '),
			clear: { from: '', to: '' } })
		if (filters.status !== 'Any') out.push({ key: 'status', label: filters.status, clear: { status: 'Any' } })
		if (filters.vendorId) out.push({ key: 'vendor', label: 'Vendor: ' + nameOf(vendors.data, filters.vendorId), clear: { vendorId: '', vendorName: '' } })
		if (filters.categoryId) out.push({ key: 'category', label: 'Category: ' + nameOf(categories.data, filters.categoryId), clear: { categoryId: '', categoryName: '' } })
		if (filters.kind) out.push({ key: 'kind', label: filters.kind, clear: { kind: '' } })
		if (filters.minAmount) out.push({ key: 'min', label: 'From ' + filters.minAmount + ' kr.', clear: { minAmount: '' } })
		if (filters.maxAmount) out.push({ key: 'max', label: 'To ' + filters.maxAmount + ' kr.', clear: { maxAmount: '' } })
		return out
	}, [filters, vendors.data, categories.data])

	const countSentence = n => n ? n + (n === 1 ? ' filter still active.' : ' filters still active.') : 'No filters left.'

	const removeChip = useCallback((chip, index) => {
		const rest = chips.length - 1
		setFilters(prev => ({ ...prev, ...chip.clear }))
		setDraft(prev => ({ ...prev, ...chip.clear }))
		setMessage(chip.label + ' removed. ' + countSentence(rest))
		queueMicrotask(() => {
			const buttons = [...(chipRow.current?.querySelectorAll('[data-chip]') ?? [])]
			const next = buttons[index] || buttons[index - 1]
			;(next || searchField.current || document.getElementById('page-title'))?.focus()
		})
	}, [chips.length])

	const clearAll = () => {
		setFilters(EMPTY)
		setDraft(EMPTY)
		setMessage('All filters cleared.')
		queueMicrotask(() => (searchField.current || document.getElementById('page-title'))?.focus())
	}

	return (
		<Page variant="page-grid">
			<Card aria-label="Search and filters">
				<CardBody variant="card-body-filters">
					<div className="row-inline toolbar">
						<FieldShell>
							<Icon name="search" />
							<input ref={searchField} type="search" value={query}
								placeholder="Search vendor, note or item text…" aria-label="Search orders"
								onChange={e => setQuery(e.target.value)} />
						</FieldShell>
						<button type="button" className="button button-ghost" style={{ flex: 'none' }}
							data-filters-toggle aria-expanded={panelOpen} aria-controls="filter-panel"
							onClick={() => setPanelOpen(open => !open)}>
							<Icon name="filters" />FILTERS
							<Icon name="chevronDown" className="icon chevron-icon" style={{ color: 'var(--text-muted)' }} />
						</button>
						<div className="chip" style={{ height: 38, flex: 'none' }}>
							Sort: Date, newest<Icon name="chevronDown" />
						</div>
					</div>

					{chips.length ? (
						<div className="row-inline" style={{ gap: 6 }} ref={chipRow}>
							{chips.map((chip, i) => (
								<Chip key={chip.key} data-chip={chip.key}
									label={'Remove filter ' + chip.label}
									onRemove={() => removeChip(chip, i)}>{chip.label}</Chip>
							))}
							<ButtonLink className="button-link" style={{ marginLeft: 6 }} onClick={clearAll}>CLEAR ALL</ButtonLink>
						</div>
					) : null}
					<p className="screenreader-only" role="status">{message}</p>

					<FilterSection id="filter-panel" hidden={!panelOpen}>
						{/* Every dropdown in the app is the one combobox: type to search, grouped
						    results, create from the foot. A native <select> here would be a second
						    dropdown pattern and a hole in the design system. README 9. */}
						<Field label="Vendor">
							<Combobox label="Vendor" placeholder="Any vendor"
								value={draft.vendorName ?? ''}
								onChange={v => setDraft({ ...draft, vendorName: v, vendorId: '' })}
								onSelect={o => setDraft({ ...draft, vendorName: o.label, vendorId: o.id })}
								groups={[{ heading: 'All vendors', options: (vendors.data ?? []).map(v =>
									({ id: v.id, label: v.name, meta: `${v.orders} orders` })) }]} />
						</Field>
						<FieldPair variant="field-pair-stack-early">
							<Field label="Category">
								<Combobox label="Category" placeholder="Any category"
									value={draft.categoryName ?? ''}
									onChange={v => setDraft({ ...draft, categoryName: v, categoryId: '' })}
									onSelect={o => setDraft({ ...draft, categoryName: o.label, categoryId: o.id })}
									groups={[{ heading: 'All categories', options: (categories.data ?? []).map(c =>
										({ id: c.id, label: c.name, meta: `${c.share}% of expenses` })) }]} />
							</Field>
							<Field label="Kind">
								<Combobox label="Kind" placeholder="Any kind" value={draft.kind ?? ''}
									onChange={v => setDraft({ ...draft, kind: v })}
									groups={[{ heading: 'Kinds', options: spendKinds.map(k => ({ id: k, label: k })) }]} />
							</Field>
						</FieldPair>
						<FieldPair variant="field-pair-keep">
							<Field label="From">
								<DateInput label="From date" value={draft.from} onChange={v => setDraft({ ...draft, from: v })} />
							</Field>
							<Field label="To">
								<DateInput label="To date" value={draft.to} onChange={v => setDraft({ ...draft, to: v })} />
							</Field>
						</FieldPair>
						<FieldPair variant="field-pair-keep">
							<Field label="Min amount">
								<FieldShell>
									<input type="text" inputMode="decimal" placeholder="0,00" aria-label="Minimum amount"
										value={draft.minAmount} onChange={e => setDraft({ ...draft, minAmount: e.target.value })} />
									<FieldUnit>kr.</FieldUnit>
								</FieldShell>
							</Field>
							<Field label="Max amount">
								<FieldShell>
									<input type="text" inputMode="decimal" placeholder="Any" aria-label="Maximum amount"
										value={draft.maxAmount} onChange={e => setDraft({ ...draft, maxAmount: e.target.value })} />
									<FieldUnit>kr.</FieldUnit>
								</FieldShell>
							</Field>
						</FieldPair>
						<Field label="Status" group>
							<Segmented options={['Any', 'Ordered', 'Delivered', 'Returned']} value={draft.status}
								onChange={status => setDraft({ ...draft, status })} label="Status" />
						</Field>
						<div className="form-actions">
							<Button variant="caps compact" onClick={() => setFilters(draft)}>APPLY FILTERS</Button>
							<Button variant="ghost compact" onClick={clearAll}>CLEAR</Button>
						</div>
					</FilterSection>
				</CardBody>
			</Card>

			<Async state={results} label="Loading orders">{data => (
				<Card aria-label="Orders">
					<CardHeader title={`Orders · ${data.matched} match`}>
						<span className="field-help">filtered from {data.total}</span>
					</CardHeader>
					<CardDivider />
					<CardBody variant="card-body-tight">
						{data.orders.length ? data.orders.map(order => (
							<OrderRow key={order.id} to={`/orders/${order.id}`}
								order={{ ...order, dateLabel: dayMonth(order.date) }} />
						)) : (
							<EmptyState>
								<p>No orders match these filters.</p>
								<ButtonLink onClick={clearAll}>CLEAR ALL</ButtonLink>
							</EmptyState>
						)}
						<div className="space-between" style={{ marginTop: 12 }}>
							<span className="field-help">Showing 1 to {data.orders.length} of {data.matched}</span>
							<span className="row-inline" style={{ gap: 8 }}>
								<Button variant="ghost" icon="chevronLeft" disabled style={{ opacity: 0.45 }}>PREVIOUS</Button>
								<Button variant="ghost" iconAfter="chevronRight" disabled style={{ opacity: 0.45 }}>NEXT</Button>
							</span>
						</div>
					</CardBody>
				</Card>
			)}</Async>
		</Page>
	)
}
