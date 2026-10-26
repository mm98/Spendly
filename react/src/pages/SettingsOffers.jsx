import { useState } from 'react'
import { Button, IconButton } from '../components/Button.jsx'
import { Card, CardHeader } from '../components/Card.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { Icon } from '../components/Icon.jsx'
import { ListItem, ListItemRemove } from '../components/ListItem.jsx'
import { Skeleton } from '../components/Utilities.jsx'
import { getOfferPicks, saveOfferPicks } from '../api/client.js'
import { CategoryMark, VendorMark } from '../app/categoryMark.jsx'
import { MoreMatches, usePickList } from '../app/pickList.jsx'
import { landing } from './SettingsParts.jsx'

// the picked rows a field shows before "Show all"
const ROWS_SHOWN = 5

const PICKS = {
	vendor: {
		label: 'Vendors', list: 'vendors', add: 'Add a vendor…', noun: 'vendors',
		mark: v => <VendorMark name={v.name} colour={v.colour} />,
		kept: v => ({ id: v.id, name: v.name, colour: v.colour })
	},
	category: {
		label: 'Categories', list: 'categories', add: 'Add a category…', noun: 'categories',
		mark: c => <CategoryMark category={c} />,
		kept: c => ({ id: c.id, name: c.name, icon: c.icon, colour: c.colour })
	}
}

// a source's picks as the page edits them, compared without the names and marks
const idsOf = source => [source.vendors.map(v => v.id).join(), source.categories.map(c => c.id).join()].join('|')
const sameAs = (a, b) => a.length === b.length && a.every((s, i) => idsOf(s) === idsOf(b[i]))

/** Writes the edited picks of every source; answers what the server now keeps. */
export function saveOffers(sources) {
	return saveOfferPicks(Object.fromEntries(sources.map(s => [s.key, {
		vendorIds: s.vendors.map(v => v.id),
		categoryIds: s.categories.map(c => c.id)
	}])))
}

export { getOfferPicks }

/** Offers (Settings and import 11a): one card per offer source, its vendors and categories picked. Every change
    waits for the page's save bar. `value('offers')` is the list as edited, `saved` as stored. */
export function OffersCards({ value, change, saved }) {
	const sources = value('offers') ?? null
	if (!sources) return (
		<Card>
			<CardHeader name="Offers" {...landing('offers')} />
			<div className="sp-stack sp-gap-6" aria-busy="true" aria-label="Loading the offers">
				<Skeleton shape="line" /><Skeleton shape="line" />
			</div>
		</Card>
	)
	const edit = (key, next) => {
		const all = sources.map(s => (s.key === key ? { ...s, ...next } : s))
		change('offers', saved && sameAs(all, saved) ? saved : all)
	}
	return sources.map((source, i) => (
		<SourceCard key={source.key} source={source} first={i === 0} onChange={next => edit(source.key, next)} />
	))
}

function SourceCard({ source, first, onChange }) {
	const picked = source.vendors.length + source.categories.length
	return (
		<Card>
			<CardHeader name={source.name} {...(first ? landing('offers') : {})} aside={`${capital(source.goods)} in ${source.country}`} />
			{source.usable
				? (
					<>
						<span className="sp-data">Orders from the last {source.months} months get Check offers when their vendor or one of their categories is picked here. Every shop {source.name} covers is searched.</span>
						<Picks kind="vendor" rows={source.vendors} onChange={vendors => onChange({ vendors })} />
						<Picks kind="category" rows={source.categories} onChange={categories => onChange({ categories })} />
						{picked ? null : <span className="sp-meta">No orders are checked against {source.name}.</span>}
					</>
				)
				: <span className="sp-data">{source.name} works only for accounts kept in {source.currencyName}.</span>}
		</Card>
	)
}

const capital = text => text.charAt(0).toUpperCase() + text.slice(1)

// one field: the search that adds, then the picked ones, newest first, five until Show all
function Picks({ kind, rows, onChange }) {
	const how = PICKS[kind]
	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)
	const [all, setAll] = useState(false)
	const page = usePickList(kind, query, {})
	const chosen = new Set(rows.map(r => r.id))
	const offered = (page.rows ?? []).filter(r => !chosen.has(r.id))
	const id = `offers-${kind}`
	const shown = all ? rows : rows.slice(0, ROWS_SHOWN)
	return (
		<div className="sp-field">
			<div className="sp-row-flex sp-gap-8">
				<label className="sp-field__label" htmlFor={id}>{how.label}</label>
				{rows.length ? <span className="sp-meta">{rows.length}</span> : null}
			</div>
			<Combobox searchable id={id} value="" placeholder={how.add} aria-label={how.add} open={open}
				onOpenChange={next => { setOpen(next); if (!next) setQuery('') }} onSearch={setQuery} noun={how.noun} fullWidth>
				{offered.map(r => (
					<ComboboxOption key={r.id} mark={how.mark(r)} onSelect={() => { onChange([how.kept(r), ...rows]); setQuery('') }}>{r.name}</ComboboxOption>
				))}
				<MoreMatches rows={page.rows} matched={page.matched} noun={how.noun} />
			</Combobox>
			{rows.length
				? (
					<div className="sp-stack sp-gap-6">
						{shown.map(r => (
							<ListItem key={r.id}>
								{how.mark(r)}
								<span className="sp-title sp-truncate">{r.name}</span>
								<span className="sp-grow" />
								<ListItemRemove>
									<IconButton icon={<Icon name="x" />} aria-label={`Remove ${r.name}`} onClick={() => onChange(rows.filter(x => x.id !== r.id))} />
								</ListItemRemove>
							</ListItem>
						))}
					</div>
				)
				: null}
			{!all && rows.length > ROWS_SHOWN
				? <div className="sp-row-flex"><Button variant="outline" size="small" onClick={() => setAll(true)}>Show all {rows.length}</Button></div>
				: null}
		</div>
	)
}
