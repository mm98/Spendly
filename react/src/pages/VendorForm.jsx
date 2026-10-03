import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Card } from '../components/Card.jsx'
import { Field } from '../components/Field.jsx'
import { TextField, TokensField } from '../components/Inputs.jsx'
import { Check, Choice, Picker } from '../components/Choice.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
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
import { currency, isSaving, plural } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import { useListReturn } from '../app/listMemory.js'
import {
	CategoryTokens, CommitBar, ConfirmDelete, EndLoading, GoneNotice, RecentLoading, RecentOrders, RecordPage, SWATCHES,
	SummaryLoading, deleteNote, focusFirst, hold, isGone, pickedColour, sayFailure, storedColour, useLeaveGuard
} from './vendorsCategories.jsx'

/** A vendor, created (5b) or edited (5c): one page, one form, one rail. */
export default function VendorForm() {
	const { id } = useParams()
	// once deleted, the record is not read again: the page is on its way out
	const [gone, setGone] = useState(false)
	const record = useApi(getVendor, [id], { enabled: Boolean(id) && !gone })
	const list = useListReturn('vendors')
	// the last record stays in hand while the next one loads, so it has to be the one the address names
	if (id && record.data?.id !== id) {
		if (record.error) return (
			<div className="sp-stack sp-gap-12">
				<Failed what="This vendor" error={record.error} onRetry={record.refresh}
					back={{ to: list, label: 'Open Vendors' }} />
			</div>
		)
		return <VendorFields key="loading" vendor={LOADING} loading loadingId={id} onGone={setGone} />
	}
	return <VendorFields key={id ?? 'new'} vendor={id ? record.data ?? null : null} onGone={setGone} />
}

// the form while the vendor is on its way: an existing record's form, every value held by a skeleton
const LOADING = { id: null, name: '', aliases: [], colour: null, favourite: false, defaultCategories: [], orders: 0 }

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const lower = s => String(s).trim().toLowerCase()

function VendorFields({ vendor, loading = false, loadingId, onGone }) {
	const navigate = useNavigate()
	const toast = useToast()
	const list = useListReturn('vendors')
	const all = useApi(getVendors)
	const h = loading ? hold : control => control
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
	const [saving, setSaving] = useState(false)
	// the vendor was deleted after this page opened it: what the save said, and nothing left to save
	const [lost, setLost] = useState(null)
	const writing = useRef(false)
	const set = (key, value) => setValues(v => ({ ...v, [key]: value }))

	const changed = values.name.trim() !== start.name.trim() || !same(values.aliases, start.aliases)
		|| values.colour !== start.colour || values.favourite !== start.favourite
		|| !same(values.defaultCategories, start.defaultCategories)
	const guard = useLeaveGuard(changed)
	const leave = () => { guard.release(); navigate(list) }

	const others = (all.data ?? []).filter(v => v.id !== vendor?.id)
	const owner = text => others.find(v => lower(v.name) === lower(text) || (v.aliases ?? []).some(a => lower(a) === lower(text)))
	const nameProblem = name => {
		if (!name.trim()) return 'Give the vendor a name.'
		const taken = owner(name)
		if (!taken) return null
		return lower(taken.name) === lower(name)
			? `You already have a vendor called ${taken.name}.`
			: `Another vendor, ${taken.name}, already matches "${name.trim()}". Pick a different name.`
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
					? `Another vendor is called ${taken.name}. Pick a different one.`
					: `Another vendor, ${taken.name}, already matches "${added}". Pick a different one.`
			}))
			if (lower(added) === lower(values.name))
				return setErrors(e => ({ ...e, aliases: 'That is already the vendor\'s name. Add the other names it uses.' }))
		}
		setErrors(e => ({ ...e, aliases: null }))
		set('aliases', next)
	}

	const save = () => {
		if (writing.current) return
		const nameError = nameProblem(values.name)
		setErrors(e => ({ ...e, name: nameError }))
		if (nameError) return focusFirst(['vendor-name'])
		writing.current = true
		setSaving(true)
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
				leave()
			})
			.catch(e => {
				writing.current = false
				setSaving(false)
				if (editing && isGone(e)) { guard.release(); return setLost(failureMessage(e, '')) }
				const message = failureMessage(e, 'The vendor was not saved. Check the connection and try again.')
				if (!message) return
				const about = !e?.status || e.status >= 500 ? null
					: message.startsWith(`You already have a vendor called ${name}.`) || message.endsWith('Pick a different name.')
						|| /needs a name/.test(message) ? 'name'
						: /alias|vendor called|already matches/.test(message) ? 'aliases' : null
				if (!about) return toast({ message, color: 'danger' })
				setErrors(err => ({ ...err, [about]: message }))
				focusFirst([about === 'name' ? 'vendor-name' : 'vendor-aliases'])
			})
	}

	const remove = () => {
		setBusy(true)
		onGone(true)
		deleteVendor(vendor.id)
			.catch(e => { if (!isGone(e)) throw e })
			.then(() => {
				invalidateVendorData()
				invalidateCategoryData()
				leave()
			})
			.catch(e => {
				setBusy(false)
				onGone(false)
				sayFailure(toast, e, 'The vendor was not deleted. Try again.')
			})
	}

	const cards = (
		<>
			<Card>
				<span className="sp-section-label">The vendor</span>
				<Field id="vendor-name" label="Name"
					message={errors.name ?? (editing ? undefined : 'The name you will recognise in a list. Receipts can spell it differently.')}
					messageType={errors.name ? 'danger' : 'hint'}>
					{h(<TextField value={values.name} onChange={v => set('name', v)}
						onBlur={() => setErrors(e => ({ ...e, name: nameProblem(values.name) }))}
						placeholder={editing ? undefined : 'Where you bought it'} />)}
				</Field>
			</Card>

			<Card>
				<span className="sp-section-label">Aliases</span>
				<Field id="vendor-aliases" label="Also matches"
					message={errors.aliases ?? 'Other names this vendor uses on receipts. A receipt with one of these is filed here.'}
					messageType={errors.aliases ? 'danger' : 'hint'}>
					{h(<TokensField value={values.aliases} onChange={changeAliases} placeholder="Add…" aria-label="Add a name" />)}
				</Field>
				<Field label="Colour" message="Pick one of the eight, or choose your own in the last box.">
					{h(<Picker swatches={Object.keys(SWATCHES)} custom customIcon={<Icon name="plus" />}
						value={values.colour} onChange={v => set('colour', v)} />)}
				</Field>
				<Choice variant="described" description="Kept at the top of Vendors."
					control={h(<Check checked={values.favourite} onChange={ev => set('favourite', ev.target.checked)} />)}>
					Favourite
				</Choice>
			</Card>

			<Card>
				<span className="sp-section-label">Defaults for its orders</span>
				<Field id="vendor-defaults" label="Default categories"
					message="Suggested on a new order from this vendor. Not applied automatically.">
					{h(<CategoryTokens value={values.defaultCategories} onChange={v => set('defaultCategories', v)} placeholder="none" />)}
				</Field>
			</Card>
		</>
	)

	const touch = useShellShape() === 'touch'
	// a phone always shows its save bar, since it stands in the tab bar's place (Mobile 5b)
	const bar = touch || !editing || changed
		? (
			<CommitBar status={!editing ? 'Nothing saved yet' : changed ? 'Unsaved changes' : null} quiet={!editing}
				onCancel={() => navigate(list)} onSave={lost ? null : save} commit={touch ? (editing ? 'Save' : 'Create') : editing ? 'Save vendor' : 'Create'}
				saving={saving} disabled={loading} />
		)
		: null

	const name = values.name.trim()
	// the list answer, when in hand, says whether the loaded rail has recent orders and a Delete
	const known = loading ? all.data?.find(v => v.id === loadingId) : null
	const end = endWords(known?.orders ?? 10)
	const rail = loading
		? (
			<>
				<SummaryLoading label="Vendor summary" sums={[['Spend this year', '76'], ['Average order', '76'], ['Saved', '76'], ['Returned', '64']]}
					action="See more in statistics" />
				{!known || known.orders ? <RecentLoading /> : null}
				<EndLoading label="End of its life" title={end.title} body={end.body}
					action={known && !known.orders ? <Button color="danger">Delete</Button> : null} />
			</>
		)
		: editing
			? (
				<>
					<VendorSummary vendor={vendor} name={name || vendor.name} />
					<RecentOrders filter={{ vendorId: vendor.id }} to={`/orders?vendor=${vendor.id}`} total={vendor.orders} />
					<Card {...(vendor.orders ? {} : { footer: [<Button key="delete" color="danger" onClick={() => setDeleting(true)}>Delete</Button>], footerCommits: true })}>
						<span className="sp-section-label">End of its life</span>
						<Well>
							<span className="sp-title">{endWords(vendor.orders).title}</span>
							<span className="sp-subtitle">{endWords(vendor.orders).body}</span>
						</Well>
					</Card>
				</>
			)
			: (
				<Card>
					<span className="sp-section-label">Vendor summary</span>
					<div className="sp-row-flex sp-gap-12">
						<Mark size="medium" aria-hidden="true">{name || 'New vendor'}</Mark>
						<Stacked>
							<span className="sp-title sp-truncate">{name || 'New vendor'}</span>
							<span className="sp-meta">Nothing saved yet</span>
						</Stacked>
					</div>
					<div className="sp-stack">
						<Sum value={name || '-'}>Name</Sum>
						<Sum value={values.aliases.length}>Aliases</Sum>
						<Sum value={values.defaultCategories.length}>Default categories</Sum>
					</div>
				</Card>
			)

	return (
		<>
			<RecordPage notice={lost ? <GoneNotice message={lost} list={{ to: list, label: 'Open Vendors' }} /> : null}
				cards={cards} rail={rail} alone={editing ? rail : null} bar={bar} />
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

/** What the end-of-life card says of a vendor with `orders` orders: only one with none can be deleted. */
const endWords = orders => (orders
	? { title: 'A vendor with orders cannot be deleted', body: `Every order must name a vendor, so its ${plural(orders, 'order')} ${orders === 1 ? 'keeps' : 'keep'} this one.` }
	: { title: 'Nothing points at this vendor any more', body: 'Deleting removes it outright.' })

/** What the vendor has cost, beside the fields that describe it (5c). */
function VendorSummary({ vendor, name }) {
	const year = useApi(getStats, ['year', undefined, undefined])
	const returned = useApi(getOrders, [{ vendorId: vendor.id, status: 'Returned', pageSize: 1 }])
	const thisYear = year.data ? year.data.window.vendorSplit.find(v => v.id === vendor.id)?.amount ?? 0 : null
	return (
		<Card>
			<span className="sp-section-label">Vendor summary</span>
			<div className="sp-row-flex sp-gap-12">
				<Mark size="medium" aria-hidden="true">{name}</Mark>
				<Stacked>
					<span className="sp-title sp-truncate">{name}</span>
					<span className="sp-meta">{plural(vendor.orders, 'order')}</span>
				</Stacked>
			</div>
			<div className="sp-stack">
				<Sum value={thisYear === null ? '' : currency(thisYear, 0)}>Spend this year</Sum>
				<Sum value={currency(vendor.orders ? vendor.spend / vendor.orders : 0, 0)}>Average order</Sum>
				<Sum value={<span className={isSaving(vendor.saved, 0) ? 'sp-ink-accent' : undefined}>{currency(vendor.saved, 0)}</span>}>Saved</Sum>
				<Sum value={returned.data ? plural(returned.data.matched, 'order') : ''}>Returned</Sum>
			</div>
			<Button variant="outline" size="small" to="/statistics">See more in statistics</Button>
		</Card>
	)
}
