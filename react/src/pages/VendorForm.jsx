import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Card, Panel } from '../components/Card.jsx'
import { Field } from '../components/Field.jsx'
import { TextField, TokensField } from '../components/Inputs.jsx'
import { Check, Choice, Picker } from '../components/Choice.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Sum } from '../components/Data.jsx'
import { Well } from '../components/Well.jsx'
import { Stacked } from '../components/Utilities.jsx'
import { useToast } from '../components/Overlays.jsx'
import { useApi } from '../api/useApi.js'
import {
	createVendor, deleteVendor, failureMessage, getOrders, getStats, getVendor, getVendors,
	invalidateCategoryData, invalidateVendorData, updateVendor
} from '../api/client.js'
import { currency, plural } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import {
	CategoryTokens, ConfirmDelete, Failed, FormLoading, RecentOrders, SWATCHES, deleteNote, focusFirst, pickedColour, storedColour,
	useLeaveGuard
} from './vendorsCategories.jsx'

/** A vendor, created (5b) or edited (5c): one page, one form, one rail. */
export default function VendorForm() {
	const { id } = useParams()
	// once deleted, the record is not read again: the page is on its way out
	const [gone, setGone] = useState(false)
	const record = useApi(getVendor, [id], { enabled: Boolean(id) && !gone })
	// the last record stays in hand while the next one loads, so it has to be the one the address names
	if (id && record.data?.id !== id) {
		if (record.error) return (
			<div className="sp-stack sp-gap-12">
				<Failed title="This vendor could not be opened" error={record.error} onRetry={record.refresh}
					list={{ to: '/vendors', label: 'Open Vendors' }} />
			</div>
		)
		return <FormLoading />
	}
	return <VendorFields key={id ?? 'new'} vendor={record.data ?? null} onGone={setGone} />
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const lower = s => String(s).trim().toLowerCase()

function VendorFields({ vendor, onGone }) {
	const navigate = useNavigate()
	const toast = useToast()
	const touch = useShellShape() === 'touch'
	const all = useApi(getVendors)
	const editing = Boolean(vendor)
	const start = useMemo(() => ({
		name: vendor?.name ?? '',
		aliases: vendor?.aliases ?? [],
		colour: vendor ? pickedColour(vendor.colour) : 'green-2',
		favourite: Boolean(vendor?.favourite),
		defaultCategories: vendor?.defaultCategories ?? []
	}), [vendor])
	const [values, setValues] = useState(start)
	const [errors, setErrors] = useState({})
	const [deleting, setDeleting] = useState(false)
	const [busy, setBusy] = useState(false)
	const saving = useRef(false)
	const set = (key, value) => setValues(v => ({ ...v, [key]: value }))

	const changed = values.name.trim() !== start.name.trim() || !same(values.aliases, start.aliases)
		|| values.colour !== start.colour || values.favourite !== start.favourite
		|| !same(values.defaultCategories, start.defaultCategories)
	const guard = useLeaveGuard(changed)

	const others = (all.data ?? []).filter(v => v.id !== vendor?.id)
	const owner = text => others.find(v => lower(v.name) === lower(text) || (v.aliases ?? []).some(a => lower(a) === lower(text)))
	const nameProblem = name => {
		if (!name.trim()) return 'Give the vendor a name.'
		const taken = owner(name)
		if (!taken) return null
		return lower(taken.name) === lower(name)
			? `You already have a vendor called ${taken.name}.`
			: `${taken.name} already matches "${name.trim()}". Pick a different name.`
	}

	/* A name another vendor already matches would file receipts in two places, so it is
	   refused where it is typed rather than when the save is. */
	const changeAliases = next => {
		const added = next.find(a => !values.aliases.includes(a))
		if (added) {
			const taken = owner(added)
			if (taken) return setErrors(e => ({
				...e,
				aliases: lower(taken.name) === lower(added)
					? `${taken.name} is the name of another vendor. Pick a different one.`
					: `${taken.name} already matches "${added}". Pick a different one.`
			}))
			if (lower(added) === lower(values.name))
				return setErrors(e => ({ ...e, aliases: 'That is already the vendor\'s name. Add the other names it uses.' }))
		}
		setErrors(e => ({ ...e, aliases: null }))
		set('aliases', next)
	}

	const save = () => {
		if (saving.current) return
		const nameError = nameProblem(values.name)
		setErrors(e => ({ ...e, name: nameError }))
		if (nameError) return focusFirst(['vendor-name'])
		saving.current = true
		const name = values.name.trim()
		const look = {
			name, aliases: values.aliases, colour: storedColour(values.colour),
			favourite: values.favourite, defaultCategories: values.defaultCategories,
			...(name !== start.name ? { initials: name.slice(0, 2).toUpperCase() } : {})
		}
		const written = editing ? updateVendor(vendor.id, look) : createVendor(name, look)
		written
			.then(() => {
				invalidateVendorData()
				invalidateCategoryData()
				guard.release()
				navigate('/vendors')
			})
			.catch(e => {
				saving.current = false
				const message = failureMessage(e, 'The vendor was not saved. Check the connection and try again.')
				const about = !e?.status || e.status >= 500 ? null
					: message.startsWith(`You already have a vendor called ${name}.`) || message.startsWith(`${name} is already`)
						|| /needs a name/.test(message) ? 'name'
						: /alias|vendor called/.test(message) ? 'aliases' : null
				if (!about) return toast({ message, color: 'danger' })
				setErrors(err => ({ ...err, [about]: message }))
				focusFirst([about === 'name' ? 'vendor-name' : 'vendor-aliases'])
			})
	}

	const remove = () => {
		setBusy(true)
		onGone(true)
		deleteVendor(vendor.id)
			.then(() => {
				invalidateVendorData()
				invalidateCategoryData()
				guard.release()
				navigate('/vendors')
			})
			.catch(e => {
				setBusy(false)
				onGone(false)
				toast({ message: failureMessage(e, 'The vendor was not deleted. Try again.'), color: 'danger' })
			})
	}

	const cards = (
		<>
			<Card>
				<span className="sp-section-label">The vendor</span>
				<Field id="vendor-name" label="Name"
					message={errors.name ?? (editing ? undefined : 'The name you will recognise in a list. Receipts can spell it differently.')}
					messageType={errors.name ? 'danger' : 'hint'}>
					<TextField value={values.name} onChange={v => set('name', v)}
						onBlur={() => setErrors(e => ({ ...e, name: nameProblem(values.name) }))}
						placeholder={editing ? undefined : 'Where you bought it'} />
				</Field>
			</Card>

			<Card>
				<span className="sp-section-label">Aliases</span>
				<Field id="vendor-aliases" label="Also matches"
					message={errors.aliases ?? 'Other names this vendor uses on receipts. A receipt with one of these is filed here.'}
					messageType={errors.aliases ? 'danger' : 'hint'}>
					<TokensField value={values.aliases} onChange={changeAliases} placeholder="Add…" aria-label="Add a name" />
				</Field>
				<Field label="Colour" message="Pick one of the eight, or choose your own in the last box.">
					<Picker swatches={Object.keys(SWATCHES)} custom customIcon={<Icon name="plus" />}
						value={values.colour} onChange={v => set('colour', v)} />
				</Field>
				<Choice variant="described" description="Kept at the top of Vendors."
					control={<Check checked={values.favourite} onChange={ev => set('favourite', ev.target.checked)} />}>
					Favourite
				</Choice>
			</Card>

			<Card>
				<span className="sp-section-label">Defaults for its orders</span>
				<Field id="vendor-defaults" label="Default categories"
					message="Suggested on a new order from this vendor. Not applied automatically.">
					<CategoryTokens value={values.defaultCategories} onChange={v => set('defaultCategories', v)} placeholder="none" />
				</Field>
			</Card>
		</>
	)

	const saveBar = !editing || changed
		? (
			<ListItem variant="sticky">
				{editing ? <span className="sp-data sp-grow">Unsaved changes</span> : <span className="sp-data sp-ink-5 sp-grow">Nothing saved yet</span>}
				<Button variant="outline" onClick={() => navigate('/vendors')}>Cancel</Button>
				<Button onClick={save}>{editing ? 'Save vendor' : 'Create'}</Button>
			</ListItem>
		)
		: null

	const name = values.name.trim()
	const rail = editing
		? (
			<>
				<VendorSummary vendor={vendor} name={name || vendor.name} />
				<RecentOrders filter={{ vendorId: vendor.id }} to={`/orders?vendor=${vendor.id}`} total={vendor.orders} />
				<Card {...(vendor.orders ? {} : { footer: [<Button key="delete" color="danger" onClick={() => setDeleting(true)}>Delete</Button>], footerCommits: true })}>
					<span className="sp-section-label">End of its life</span>
					{vendor.orders
						? (
							<Well>
								<span className="sp-title">A vendor with orders cannot be deleted</span>
								<span className="sp-subtitle">Every order must name a vendor, so its {plural(vendor.orders, 'order')} keep this one.</span>
							</Well>
						)
						: (
							<Well>
								<span className="sp-title">Nothing points at this vendor any more</span>
								<span className="sp-subtitle">Deleting removes it outright.</span>
							</Well>
						)}
				</Card>
			</>
		)
		: (
			<Card>
				<span className="sp-section-label">Vendor summary</span>
				<div className="sp-row-flex sp-gap-12">
					<Mark size="medium">{name || 'New vendor'}</Mark>
					<Stacked>
						<span className="sp-title sp-truncate">{name || 'New vendor'}</span>
						<span className="sp-meta">Nothing saved yet</span>
					</Stacked>
				</div>
				<div className="sp-stack">
					<Sum value={name || '-'}><span className="sp-ink-2">Name</span></Sum>
					<Sum value={values.aliases.length}><span className="sp-ink-2">Aliases</span></Sum>
					<Sum value={values.defaultCategories.length}><span className="sp-ink-2">Default categories</span></Sum>
				</div>
			</Card>
		)

	return (
		<>
			{/* below 640 the rail follows the form in one column, and the save bar closes the page */}
			{touch
				? <div className="sp-stack sp-gap-12">{cards}{editing ? rail : null}{saveBar}</div>
				: <><div className="sp-stack sp-gap-12">{cards}{saveBar}</div><Panel>{rail}</Panel></>}
			{guard.prompt}
			{deleting
				? (
					<ConfirmDelete title={`Delete ${vendor.name}?`} action="Delete vendor" busy={busy}
						onConfirm={remove} onCancel={() => setDeleting(false)}>
						{deleteNote(vendor)}
					</ConfirmDelete>
				)
				: null}
		</>
	)
}

/** What the vendor has cost, beside the fields that describe it (5c). */
function VendorSummary({ vendor, name }) {
	const year = useApi(getStats, ['year', undefined, undefined])
	const returned = useApi(getOrders, [{ vendorId: vendor.id, status: 'Returned', pageSize: 1 }])
	const thisYear = year.data ? year.data.window.vendorSplit.find(v => v.id === vendor.id)?.amount ?? 0 : null
	return (
		<Card>
			<span className="sp-section-label">Vendor summary</span>
			<div className="sp-row-flex sp-gap-12">
				<Mark size="medium">{name}</Mark>
				<Stacked>
					<span className="sp-title sp-truncate">{name}</span>
					<span className="sp-meta">{plural(vendor.orders, 'order')}</span>
				</Stacked>
			</div>
			<div className="sp-stack">
				<Sum value={thisYear === null ? '' : currency(thisYear, 0)}><span className="sp-ink-2">Spend this year</span></Sum>
				<Sum value={currency(vendor.orders ? vendor.spend / vendor.orders : 0, 0)}><span className="sp-ink-2">Average order</span></Sum>
				<Sum value={<span className={vendor.saved > 0 ? 'sp-ink-accent' : undefined}>{currency(vendor.saved, 0)}</span>}>
					<span className="sp-ink-2">Saved</span>
				</Sum>
				<Sum value={returned.data ? plural(returned.data.matched, 'order') : ''}><span className="sp-ink-2">Returned</span></Sum>
			</div>
			<Button variant="outline" size="small" to="/statistics">See more in statistics</Button>
		</Card>
	)
}
