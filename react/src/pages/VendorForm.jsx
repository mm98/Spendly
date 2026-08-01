import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Card, CardBody } from '../components/Card.jsx'
import { EntryRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { DeleteCard, FormPage, RecordWait, useDelete } from '../components/FormPage.jsx'
import { ColourPicker, VENDOR_COLOURS } from '../components/Pickers.jsx'
import {
	Field, FieldShell, FilterSection, Switch, TextInput, focusField, needFixing, useFieldErrors
} from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import {
	createVendor, deleteVendor, getHomeContent, getVendor, getVendors, getVendorsOverview,
	updateVendor
} from '../api/client.js'
import { krRound } from '../api/format.js'
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
	const [status, setStatus] = useState({ message: '', good: true })
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		if (!vendor) return
		setName(vendor.name)
		setColour(vendor.colour)
		setFavourite(Boolean(vendor.favourite))
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

	const refresh = () => {
		invalidate(getVendors); invalidate(getVendorsOverview); invalidate(getVendor)
		invalidate(getHomeContent)
	}

	const save = () => {
		const failed = check()
		if (failed.length) {
			setStatus({ message: 'Cannot save — ' + needFixing(failed), good: false })
			focusField(failed[0].name)
			return
		}
		setStatus({ message: '', good: true })
		setSaving(true)
		const patch = { name: name.trim(), colour, initials, favourite }
		const written = mode === 'edit' ? updateVendor(vendor.id, patch) : createVendor(patch.name, patch)
		written
			.then(saved => {
				refresh()
				toast(`${saved.name} ${mode === 'edit' ? 'saved' : 'added'}.`)
				navigate('/vendors')
			})
			.catch(e => { setSaving(false); toast(e.message, 'negative') })
	}

	const del = useDelete({
		what: 'vendor',
		detail: vendor ? `${vendor.name}, ${vendor.orders} order${vendor.orders === 1 ? '' : 's'}.` : '',
		onDelete: () => deleteVendor(vendor.id)
			.then(() => { refresh(); toast(`${vendor.name} removed.`); navigate('/vendors') })
			/* A vendor with orders on it cannot go: the orders would point at nothing. The API
			   refuses with a 409 that names the reason rather than failing silently. */
			.catch(e => toast(e.message, 'negative'))
	})

	return (
		<FormPage
			title={mode === 'edit' ? 'Edit vendor' : 'New vendor'}
			lead={mode === 'edit'
				? 'Its name, the tile its initials sit on, and whether it stays on top.'
				: 'It joins your list straight away, with no orders on it yet.'}
			status={status}
			cancel={{ to: '/vendors' }}
			submit={{
				label: saving ? 'SAVING…' : mode === 'edit' ? 'SAVE CHANGES' : 'ADD VENDOR',
				onClick: save, disabled: saving
			}}
			rail={
				<>
					<VendorSummary name={name} colour={colour} initials={initials}
						favourite={favourite} vendor={vendor} />
					{mode === 'edit' ? (
						<DeleteCard what="vendor" del={del}>
							A vendor that still has orders on it cannot be removed — the orders would
							point at nothing.
						</DeleteCard>
					) : null}
				</>
			}>

			<Field label="Name" error={nameField.error} errorId={nameField.errorId}>
				<FieldShell>
					<TextInput id="vendor-name" value={name} autoFocus
						onChange={v => { setName(v); recheck('vendor-name', v) }}
						aria-label="Vendor name" aria-required="true" placeholder="Silvan"
						invalid={nameField.invalid} describedBy={nameField.describedBy}
						onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }} />
				</FieldShell>
			</Field>

			<Field label="Colour" group
				help="Eight from the palette, or any colour at all from the last swatch.">
				<ColourPicker value={colour} onChange={setColour} colours={VENDOR_COLOURS}
					label="Vendor colour" />
			</Field>

			{/* A boolean is the green switch in a bordered section, right-aligned, which is what
			    the system draws for one everywhere else it has one -- the order form's More
			    details and every row on Settings. A button carrying aria-pressed would be a
			    second control for a job this one already has. README: Fields and Forms. */}
			<FilterSection>
				<div className="space-between">
					<span className="field-help" style={{ maxWidth: '32ch' }}>
						Favourites are spotlighted at the top of the Vendors page, and lead the vendor
						list on a new order.
					</span>
					<Switch checked={favourite} onChange={setFavourite} label="Favourite" />
				</div>
			</FilterSection>
		</FormPage>
	)
}

/** The rail card that mirrors the form: the row as it will be drawn, then its values, then
    what the vendor has cost all told. */
function VendorSummary({ name, colour, initials, favourite, vendor }) {
	return (
		<Card aria-label="Vendor summary">
			<CardBody>
				<div className="card-subheading">Vendor summary</div>
				<span className="section-label">How it will look</span>
				<div className="entry-list" style={{ marginBottom: 4 }}>
					<EntryRow avatar={{ colour, initials }} name={name || 'Your vendor'}
						meta={vendor
							? `${vendor.orders} order${vendor.orders === 1 ? '' : 's'} · saved ${krRound(vendor.saved)}`
							: 'no orders yet'} />
				</div>
				<div className="summary-row">Name<span className="summary-row-value">{name || '—'}</span></div>
				<div className="summary-row">Initials<span className="summary-row-value">{initials}</span></div>
				<div className="summary-row">Colour
					<span className="summary-row-value">{resolveColour(colour).toUpperCase()}</span></div>
				<div className="summary-row">Favourite
					<span className="summary-row-value">{favourite ? 'Yes' : 'No'}</span></div>
				{vendor ? <SummaryRow label="Saved vs retail" value={krRound(vendor.saved)} /> : null}
				<div className="card-divider card-divider-tight" />
				<SummaryTotal label="Spent all time" value={krRound(vendor?.spend ?? 0)}
					estimate={!vendor} />
				<span className="field-help">
					The initials are inked light or dark from the tile colour, so they stay readable
					whatever you pick.
				</span>
			</CardBody>
		</Card>
	)
}
