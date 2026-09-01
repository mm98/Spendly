import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Card, CardBody } from '../components/Card.jsx'
import { Chip } from '../components/Chip.jsx'
import { EntryRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { DeleteCard, FormPage, RecordWait, useDelete } from '../components/FormPage.jsx'
import { ColourPicker, VENDOR_COLOURS } from '../components/Pickers.jsx'
import {
	CheckRow, Field, FieldShell, TextInput, focusField, useFieldErrors
} from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { useApi } from '../api/useApi.js'
import {
	createVendor, deleteVendor, failureMessage, getVendor, getVendors, invalidateVendorData, updateVendor
} from '../api/client.js'
import { currency, sep } from '../api/format.js'
import { resolveColour } from '../api/colour.js'

/* A vendor, on its own page -- the same page component as a category and as an order, because
   there is one way to edit a record in this app rather than one per screen. The inline version
   put a bordered section inside a card inside a horizontal scroller, which on a phone is a form
   about as wide as its own labels. See components/FormPage.jsx. */

export default function VendorForm({ mode = 'create' }) {
	const { id } = useParams()
	const existing = useApi(getVendor, [id], { enabled: mode === 'edit' })

	if (mode === 'edit' && !existing.data) {
		return <RecordWait state={existing} label="Loading the vendor" />
	}
	return <VendorFields mode={mode} vendor={existing.data ?? null} />
}

function VendorFields({ mode, vendor }) {
	const navigate = useNavigate()
	const toast = useToast()
	const all = useApi(getVendors)
	const [name, setName] = useState('')
	const [colour, setColour] = useState(VENDOR_COLOURS[0].id)
	const [favourite, setFavourite] = useState(false)
	const [aliases, setAliases] = useState([])
	const [aliasQuery, setAliasQuery] = useState('')
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		if (!vendor) return
		setName(vendor.name)
		setColour(vendor.colour)
		setFavourite(Boolean(vendor.favourite))
		setAliases(vendor.aliases ?? [])
	}, [vendor])

	const fields = useMemo(() => {
		const taken = (all.data ?? [])
			.filter(v => v.id !== vendor?.id)
			.map(v => v.name.toLowerCase())
		return [
			{ name: 'vendor-name', label: 'Name', check: v =>
				!v ? 'Who do you buy from?'
				: v.length > 80 ? '80 characters at most.'
				: taken.includes(v.toLowerCase()) ? `You already have a vendor called ${v}.` : '' }
		]
	}, [all.data, vendor?.id])

	const formValues = useMemo(() => ({ 'vendor-name': name }), [name])
	const { check, recheck, propsFor } = useFieldErrors(fields, formValues)
	const nameField = propsFor('vendor-name')

	const initials = (name.trim() || 'NY').slice(0, 2).toUpperCase()

	/* An alias is another string that resolves to this vendor, so one equal to the name says
	   nothing, and one already in the list is already there -- neither is addable, and Enter
	   with nothing addable does nothing rather than pretending. Clashes with *other* vendors'
	   names are the server's to refuse; its sentence reaches the toast on save. */
	const aliasClean = aliasQuery.trim()
	const aliasAddable = Boolean(aliasClean)
		&& aliasClean.length <= 80
		&& aliasClean.toLowerCase() !== name.trim().toLowerCase()
		&& !aliases.some(a => a.toLowerCase() === aliasClean.toLowerCase())
	const addAlias = () => {
		if (!aliasAddable) return
		setAliases([...aliases, aliasClean])
		setAliasQuery('')
	}

	const refresh = () => invalidateVendorData()

	const save = () => {
		const failed = check()
		if (failed.length) {
			focusField(failed[0].name)
			return
		}
		setSaving(true)
		const patch = { name: name.trim(), colour, initials, favourite, aliases }
		const written = mode === 'edit' ? updateVendor(vendor.id, patch) : createVendor(patch.name, patch)
		written
			.then(saved => {
				refresh()
				toast(`${saved.name} ${mode === 'edit' ? 'saved' : 'added'}.`)
				navigate('/vendors/all')
			})
			.catch(e => { setSaving(false); toast(failureMessage(e, 'That did not save. Try again.'), 'negative') })
	}

	const del = useDelete({
		what: 'vendor',
		detail: vendor ? `${vendor.name}, ${vendor.orders} order${vendor.orders === 1 ? '' : 's'}.` : '',
		onDelete: () => deleteVendor(vendor.id)
			.then(() => { refresh(); toast(`${vendor.name} removed.`); navigate('/vendors/all') })
			/* A vendor with orders on it cannot go: the orders would point at nothing. The API
			   refuses with a 409 that names the reason rather than failing silently. */
			.catch(e => toast(failureMessage(e, 'That did not delete.'), 'negative'))
	})

	return (
		<FormPage
			title={mode === 'edit' ? 'Edit vendor' : 'New vendor'}
			lead={mode === 'edit'
				? 'Its name, the tile its initials sit on, and whether it stays on top.'
				: 'It is added to your list immediately, with no orders yet.'}
			cancel={{ to: '/vendors/all' }}
			submit={{
				label: saving ? 'SAVING...' : mode === 'edit' ? 'SAVE CHANGES' : 'ADD VENDOR',
				onClick: save, disabled: saving
			}}
			rail={
				<>
					<VendorSummary name={name} colour={colour} initials={initials}
						favourite={favourite} aliases={aliases} vendor={vendor} />
					{mode === 'edit' ? (
						<DeleteCard what="vendor" del={del}>
							A vendor that still has orders on it cannot be removed: the orders would
							point at nothing.
						</DeleteCard>
					) : null}
				</>
			}>

			<Field label="Name" error={nameField.error} errorId={nameField.errorId} htmlFor="vendor-name">
				<FieldShell>
					<TextInput id="vendor-name" value={name} autoFocus
						onChange={v => { setName(v); recheck('vendor-name', v) }}
						aria-label="Vendor name" aria-required="true"
						invalid={nameField.invalid} describedBy={nameField.describedBy}
						onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }} />
				</FieldShell>
			</Field>

			{/* htmlFor, because the chips are labelable and come first -- same reason as the
			    categories field on the order form (components/Form.jsx): without it the label
			    points at the first chip's remove button and a tap anywhere in the field that is
			    not itself a control deletes an alias. */}
			<Field label="Aliases" optional htmlFor="vendor-aliases"
				help={'Other names for this vendor: the name it had before a rename, or the short '
					+ 'form an invoice prints. An order or scanned receipt with one of these names is '
					+ 'filed under this vendor. Type a name and press Enter; it must be different from the vendor\'s name.'}>
				<FieldShell className="field-shell-chips field-shell-no-chevron">
					{aliases.map(a => (
						<Chip key={a} label={`Remove alias ${a}`}
							onRemove={() => setAliases(aliases.filter(x => x !== a))}>{a}</Chip>
					))}
					<TextInput id="vendor-aliases" value={aliasQuery} onChange={setAliasQuery}
						aria-label="Add alias" placeholder="Add alias..."
						onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlias() } }} />
				</FieldShell>
			</Field>

			<Field label="Colour" group
				help="Pick one of the eight colours shown, or choose any colour in the last box.">
				<ColourPicker value={colour} onChange={setColour} colours={VENDOR_COLOURS}
					label="Vendor colour" />
			</Field>

			{/* Favourite is a form choice: it lands when SAVE CHANGES runs, and a switch that
			    needs a save is a checkbox wearing the wrong costume -- the README's own words,
			    which this row obeyed only after the Import tab did. Every binary option in the
			    app is this row now, Settings' immediate ones included: one shape to learn,
			    and what follows the click is what differs. README: Checkbox Row. */}
			<CheckRow id="vendor-favourite" checked={favourite} onChange={setFavourite}
				label="Favourite"
				help="Spotlighted at the top of the Vendors page, leads the vendor list on a new order, and appears in Home's Favourite vendors card." />
		</FormPage>
	)
}

/** The rail card that mirrors the form: the row as it will be drawn, then its values, then
    what the vendor has cost all told. */
function VendorSummary({ name, colour, initials, favourite, aliases, vendor }) {
	return (
		<Card aria-label="Vendor summary">
			<CardBody>
				<div className="card-subheading">Vendor summary</div>
				<span className="section-label">How it will look</span>
				<div className="entry-list summary-preview">
					<EntryRow avatar={{ colour, initials }} name={name || 'Your vendor'}
						meta={vendor
							? `${vendor.orders} order${vendor.orders === 1 ? '' : 's'}${sep}saved ${currency(vendor.saved, 0)}`
							: 'no orders yet'} />
				</div>
				<div className="summary-row">Name<span className="summary-row-value">{name || '-'}</span></div>
				<div className="summary-row">Initials<span className="summary-row-value">{initials}</span></div>
				<div className="summary-row">Colour
					<span className="summary-row-value">{resolveColour(colour).toUpperCase()}</span></div>
				<div className="summary-row">Favourite
					<span className="summary-row-value">{favourite ? 'Yes' : 'No'}</span></div>
				<div className="summary-row">Aliases
					<span className="summary-row-value">{aliases.length ? aliases.join(', ') : '-'}</span></div>
				{vendor ? <SummaryRow label="Saved vs retail" value={currency(vendor.saved, 0)} /> : null}
				<div className="card-divider card-divider-tight" />
				<SummaryTotal label="Spent all time" value={currency(vendor?.spend ?? 0, 0)}
					estimate={!vendor} />
				<span className="field-help">
					The initials are inked light or dark from the tile colour, so they stay readable
					whatever you pick.
				</span>
				{/* The way into the orders the figure above is the sum of, on the page that holds
				    every other action on this record. At the foot, because a card ending
				    in a link into a longer list ends in the block button, like the six that
				    already do. README: Cards, Create and Edit. Only when there is a record: a
				    vendor being created has no orders to list. */}
				{vendor ? (
					<Button variant="block" icon="receipt" to={`/orders/all?vendor=${vendor.id}`}>
						VIEW ORDERS
					</Button>
				) : null}
			</CardBody>
		</Card>
	)
}
