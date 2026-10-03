import { useRef, useState } from 'react'
import { Card, CardFooter } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { Well } from '../components/Well.jsx'
import { Icon } from '../components/Icon.jsx'
import { Pill } from '../components/Pill.jsx'
import { dot, plural } from '../api/format.js'
import { useApi } from '../api/useApi.js'
import { getKnownCategoryNames } from '../api/client.js'
import { MoreMatches, usePickList } from '../app/pickList.jsx'
import {
	DATE_LABELS, DATE_SHAPES, FIELDS, NONE, REQUIRED, dateFormatsOf, decimalOf, fieldsFor, unknownCategories
} from '../api/orderImport.js'
import { Heading } from './SettingsParts.jsx'

const SHAPES = [
	{ value: 'line', label: 'one item line' },
	{ value: 'order', label: 'a whole order' }
]
// a line's own fields, which a whole order has no place for (11b)
const ITEM_ONLY = ['quantity', 'price']
const label = id => FIELDS.find(f => f.id === id)?.label ?? "Don't import"
const sampleOf = (body, i) => {
	const values = [...new Set(body.map(r => String(r[i] ?? '').trim()).filter(Boolean))].slice(0, 3)
	return values.length ? values.join(', ') + '…' : 'Empty'
}

/** A footer whose buttons share a line where they fit and take one each on a touch screen. */
export function ImportFooter({ children }) {
	return <CardFooter><div className="st-wrap st-foot">{children}</div></CardFooter>
}

/** The facts the mapping decides, worked out from the file: what each check found and what is still missing.
    `categories` are the file's category names the account has, or null until that is known. */
export function readMapping(rows, mapping, categories) {
	const body = rows.slice(1)
	const columns = mapping[mapping.shape]
	const at = id => columns.indexOf(id)
	const dateValues = at('date') >= 0 ? body.map(r => r[at('date')]) : []
	const dateFormats = at('date') >= 0 ? dateFormatsOf(dateValues) : []
	const dateFormat = mapping.dateFormat && (dateFormats.includes(mapping.dateFormat) || mapping.dateChosen) ? mapping.dateFormat : dateFormats[0] ?? null
	const amountColumns = ['price', 'total', 'shipping', 'quantity'].map(at).filter(i => i >= 0)
	const unknown = categories === null ? [] : unknownCategories(body, at('category'), categories)
	const unresolved = unknown.filter(u => !(u.value in (mapping.categories ?? {})))
	const missing = REQUIRED[mapping.shape].filter(id => at(id) < 0)
	return {
		body, columns, dateFormats, dateFormat, unknown, unresolved, missing,
		decimal: decimalOf(body, amountColumns),
		mapped: columns.filter(c => c !== NONE).length,
		ready: !missing.length && Boolean(dateFormat) && !unresolved.length && categories !== null
	}
}

/** Step 2 of 11b: which column is which, checked against the file's own rows. */
export function MapStep({ box, file, rows, mapping, onChange, onReplace, onPreview }) {
	const matchRef = useRef(null)
	// the category names the file holds, and which of them the account has already
	const categoryAt = mapping[mapping.shape].indexOf('category')
	const named = categoryAt < 0 ? [] : [...new Set(rows.slice(1).map(r => String(r[categoryAt] ?? '').trim()).filter(Boolean))]
	const known = useApi(getKnownCategoryNames, [named], { enabled: named.length > 0 })
	const facts = readMapping(rows, mapping, !named.length ? [] : known.data ? known.data.map(name => ({ name })) : null)
	const { body, columns } = facts
	const header = rows[0]
	const shape = mapping.shape
	const fields = fieldsFor(shape)
	const setColumn = (i, id) => {
		// a field belongs to one column: picking it here takes it from any other
		const next = columns.map((c, j) => (j === i ? id : c === id && id !== NONE ? NONE : c))
		onChange({ [shape]: next })
	}
	const required = REQUIRED[shape].map(label).map((l, i, all) => (i === 0 ? l : i === all.length - 1 ? ` and ${l.toLowerCase()}` : `, ${l.toLowerCase()}`)).join('')
	const categoryColumn = header[columns.indexOf('category')]
	const dateColumnAt = columns.indexOf('date')
	const knownFormats = facts.dateFormats.length ? facts.dateFormats : Object.keys(DATE_SHAPES).filter(f => f !== 'excel')

	const dateNote = dateColumnAt < 0 ? null : facts.dateFormat
		? (
			<ListItem color="warning">
				<span className="sp-row-flex sp-flex-none"><Icon name="alert-circle" /></span>
				<span className="sp-subtitle sp-ink-warning sp-grow">
					{facts.dateFormat === 'excel' ? 'Dates are read as Excel dates.' : <>Dates are read as <b className="sp-nowrap">{DATE_SHAPES[facts.dateFormat]}</b>.</>}
					{facts.dateFormats.length === 1 ? ' Every date in the file matched that shape.' : facts.dateFormats.length > 1 ? ' The dates could be read another way too. Check that this is right.' : ''}
				</span>
				<Combobox variant="sort-end" value="Change" aria-label="How the dates are written">
					{knownFormats.map(f => (
						<ComboboxOption key={f} selected={f === facts.dateFormat} onSelect={() => onChange({ dateFormat: f, dateChosen: true })}>{DATE_LABELS[f]}</ComboboxOption>
					))}
				</Combobox>
			</ListItem>
		)
		: (
			<ListItem color="danger">
				<span className="sp-row-flex sp-flex-none"><Icon name="alert-circle" /></span>
				<span className="sp-subtitle sp-ink-danger">These are not dates Spendly can read. Map another column as the order date.</span>
			</ListItem>
		)

	const categoryNote = facts.unknown.length && facts.unresolved.length
		? (
			<ListItem color="warning">
				<span className="sp-row-flex sp-flex-none"><Icon name="alert-circle" /></span>
				<span className="sp-subtitle sp-ink-warning sp-grow">
					<b>{plural(facts.unresolved.length, 'value')}</b> in {categoryColumn} {facts.unresolved.length === 1 ? "doesn't" : "don't"} match a category yet. They are listed below and each needs a choice before the import can run.
				</span>
				<Button variant="outline" size="small" color="warning" onClick={() => matchRef.current?.scrollIntoView({ block: 'center' })}>Match them</Button>
			</ListItem>
		)
		: null

	const row = (name, i) => {
		const id = columns[i]
		const idle = id === NONE
		const title = String(name || `Column ${i + 1}`)
		if (shape === 'order' && idle && ITEM_ONLY.includes(mapping.line?.[i])) return (
			<div key={i} className="st-map sp-muted">
				<Well variant="quiet">
					<span className="sp-data sp-void sp-strong sp-truncate">{title}</span>
					<span className="sp-meta sp-truncate">{sampleOf(body, i)}</span>
				</Well>
				<Icon name="chevron-right" size={16} />
				<span className="sp-input sp-input--empty sp-input--stretch">No field for this now</span>
			</div>
		)
		return (
			<div key={i} className={idle ? 'st-map sp-muted' : 'st-map'}>
				<Well variant="quiet">
					<span className="sp-data sp-strong sp-truncate">{title}</span>
					<span className="sp-meta sp-truncate">{sampleOf(body, i)}</span>
				</Well>
				<Icon name="chevron-right" size={16} />
				<Combobox aria-label={`Field for ${name || `column ${i + 1}`}`}
					value={idle ? <span className="sp-ink-5">Don't import</span>
						: <span className="sp-row-flex sp-gap-8">{label(id)}{fields.find(f => f.id === id)?.optional ? <span className="sp-meta">optional</span> : null}{shape === 'order' && id === 'total' ? <Pill color="success">New</Pill> : null}</span>}>
					{fields.map(f => (
						<ComboboxOption key={f.id} selected={f.id === id} onSelect={() => setColumn(i, f.id)}
							meta={REQUIRED[shape].includes(f.id) ? 'required' : f.optional ? 'optional' : undefined}>{f.label}</ComboboxOption>
					))}
					<ComboboxOption selected={idle} onSelect={() => setColumn(i, NONE)}>Don't import</ComboboxOption>
				</Combobox>
			</div>
		)
	}

	const groupedBy = shape === 'line'
		? (
			<Combobox variant="sort-end" aria-label="How item lines become orders"
				value={mapping.group === 'reference' && columns.includes('reference') ? 'grouped by Order ref' : 'grouped by vendor and date'}>
				{columns.includes('reference')
					? <ComboboxOption selected={mapping.group === 'reference'} onSelect={() => onChange({ group: 'reference' })}>grouped by Order ref</ComboboxOption>
					: null}
				<ComboboxOption selected={mapping.group !== 'reference' || !columns.includes('reference')} onSelect={() => onChange({ group: 'vendor-date' })}>grouped by vendor and date</ComboboxOption>
			</Combobox>
		)
		: null

	return (
		<Card ref={box}>
			<Heading section="import">Import</Heading>
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-row-flex sp-flex-none"><Icon name="file" /></span>
				<span className="sp-title sp-truncate">{file}</span>
				<span className="sp-meta sp-nowrap">{plural(body.length, 'row')}{dot}{plural(header.length, 'column')}</span>
				<span className="sp-grow" />
				<Button variant="outline" size="small" onClick={onReplace}>Replace file</Button>
			</div>
			<ListItem>
				<div className="st-wrap">
					<span className="sp-field__label" id="import-shape-label">Each row is</span>
					<Segmented name="import-shape" options={SHAPES} value={shape} aria-labelledby="import-shape-label"
						onChange={v => onChange({ shape: v })} />
					<span className="st-push" />
					{groupedBy}
				</div>
			</ListItem>
			<div className="sp-stack sp-gap-12">
				<div className="st-map st-map--head">
					<span className="sp-section-label">Column in file</span>
					<span />
					<span className="sp-section-label">Spendly field</span>
				</div>
				{header.map((name, i) => (
					<div key={i} className="sp-stack sp-gap-12">
						{row(name, i)}
						{i === dateColumnAt ? dateNote : null}
						{columns[i] === 'category' ? categoryNote : null}
					</div>
				))}
			</div>
			{shape === 'order'
				? (
					<ListItem color="warning">
						<span className="sp-row-flex sp-flex-none"><Icon name="alert-circle" /></span>
						<span className="sp-subtitle sp-ink-warning">
							Each order arrives with <b>one item line</b> carrying the description and the total, quantity 1. That keeps the totals correct and the order editable, but the detail is gone - an order imported this way can't be broken back into its items later. Switching back to "one item line" restores the mapping you had; it isn't lost.
						</span>
					</ListItem>
				)
				: null}
			{facts.unknown.length
				? (
					<div className="sp-stack sp-gap-8" ref={matchRef}>
						<span className="sp-section-label">Matching unknown values</span>
						<span className="sp-meta">Every unmatched value gets a row. Nothing is guessed silently - an unresolved row blocks the import, because a category invented by an import is worse than one you chose.</span>
						{facts.unknown.map(u => {
							const chosen = mapping.categories?.[u.value]
							const open = chosen === undefined
							return (
								<ListItem key={u.value} color={open ? 'warning' : 'default'}>
									<div className="st-wrap">
									<span className={'sp-title sp-truncate st-match-name' + (open ? ' sp-ink-warning' : '')}>{u.value}</span>
									<span className={'sp-meta sp-nowrap' + (open ? ' sp-ink-warning' : '')}>{plural(u.rows, 'row')}</span>
									<span className="st-push" />
									<CategoryChoice value={u.value} chosen={chosen} open={open}
										onPick={name => onChange({ categories: { ...mapping.categories, [u.value]: name } })} />
									</div>
								</ListItem>
							)
						})}
					</div>
				)
				: null}
			<ImportFooter>
				<span className="sp-subtitle st-foot-note">
					{facts.mapped} of {header.length} columns mapped. {required} are required.
					{facts.missing.length ? <> Still missing: {facts.missing.map(label).join(', ').toLowerCase()}.</> : null}
				</span>
				<Button disabled={!facts.ready} onClick={() => onPreview(facts)}>Preview</Button>
			</ImportFooter>
		</Card>
	)
}

/** What one unknown category of the file becomes: a new category, one the account has, or none. The
    account's categories come a page at a time; past a page the choice is searched. */
function CategoryChoice({ value, chosen, open, onPick }) {
	const [find, setFind] = useState('')
	const page = usePickList('category', find, {})
	const searched = Boolean(find.trim()) || (page.total ?? 0) > (page.rows?.length ?? 0)
	return (
		<Combobox variant="sort-end" aria-label={`Category for ${value}`}
			value={open ? 'Pick, or create it' : chosen === '' ? 'No category' : chosen === value ? `Create ${value}` : chosen}
			{...(searched ? { searchable: true, search: find, onSearch: setFind, noun: 'categories' } : {})}>
			<ComboboxOption create selected={chosen === value} onSelect={() => onPick(value)}>{`Create ${value}`}</ComboboxOption>
			{(page.rows ?? []).map(c => (
				<ComboboxOption key={c.id} selected={chosen === c.name} onSelect={() => onPick(c.name)}>{c.name}</ComboboxOption>
			))}
			<MoreMatches rows={page.rows} matched={page.matched} noun="categories" />
			<ComboboxOption selected={chosen === ''} onSelect={() => onPick('')}>No category</ComboboxOption>
		</Combobox>
	)
}
