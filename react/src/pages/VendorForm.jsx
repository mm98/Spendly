import { useId, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Card, CardHeader } from '../components/Card.jsx'
import { Field } from '../components/Field.jsx'
import { TextField, TokensField } from '../components/Inputs.jsx'
import { useStatusTypes } from '../app/statuses.js'
import { Check, Choice, Picker, Switch } from '../components/Choice.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { VendorMark } from '../app/categoryMark.jsx'
import { Sum } from '../components/Data.jsx'
import { Well } from '../components/Well.jsx'
import { Stacked } from '../components/Utilities.jsx'
import { Alert, useToast } from '../components/Overlays.jsx'
import { Slot } from '../components/FileDrop.jsx'
import { useApi } from '../api/useApi.js'
import {
	createVendor, deleteVendor, failureMessage, getOrders, getVendor, getVendorPage, getVendorYear,
	invalidateCategoryData, invalidateOrderData, invalidateVendorData, mergeVendor, putVendorImage, removeVendorImage, updateVendor, vendorImageUrl
} from '../api/client.js'
import { VENDOR_IMAGE_TYPES, inspectVendorImage, refusalOf } from './vendorImage.js'
import { currency, dot, isSaving, plural } from '../api/format.js'
import { vendorKey } from '../api/names.js'
import { useShellShape } from '../app/useMedia.js'
import { useListReturn } from '../app/listMemory.js'
import {
	CategoryTokens, CommitBar, ConfirmDelete, EndLoading, GoneNotice, MergeButton, MergeDialog, MergePicker, RecentLoading, RecentOrders, RecordPage, SWATCHES,
	SummaryLoading, archiveVendor, deleteNote, focusFirst, hold, isGone, pickedColour, sayFailure, storedColour, useLeaveGuard
} from './vendorsCategories.jsx'

/** A vendor, created (5b) or edited (5c): one page, one form, one rail. */
export default function VendorForm() {
	const { id } = useParams()
	// once deleted or merged, that record is not read again (the page is on its way out); another one is
	const [gone, setGone] = useState(null)
	const record = useApi(getVendor, [id], { enabled: Boolean(id) && gone !== id })
	const going = on => setGone(on ? id : null)
	const list = useListReturn('vendors')
	// the last record stays in hand while the next one loads, so it has to be the one the address names
	if (id && record.data?.id !== id) {
		if (record.error) return (
			<div className="sp-stack sp-gap-12">
				<Failed what="This vendor" error={record.error} onRetry={record.refresh}
					back={{ to: list, label: 'Open Vendors' }} />
			</div>
		)
		return <VendorFields key="loading" vendor={LOADING} loading loadingId={id} onGone={going} />
	}
	return <VendorFields key={id ?? 'new'} vendor={id ? record.data ?? null : null} onGone={going} />
}

// the form while the vendor is on its way: an existing record's form, every value held by a skeleton
const LOADING = { id: null, name: '', aliases: [], colour: null, favourite: false, archived: false, defaultCategories: [], defaultExcludeFromStats: false, orders: 0 }

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const lower = s => String(s).trim().toLowerCase()

function VendorFields({ vendor, loading = false, loadingId, onGone }) {
	const navigate = useNavigate()
	const toast = useToast()
	const list = useListReturn('vendors')
	// opened from a scanned receipt (5b): the name it read starts the form, and saving goes back to it
	const fromScan = useLocation().state?.fromScan ?? null
	const h = loading ? hold : control => control
	const statsSwitch = useId()
	const editing = Boolean(vendor)
	const start = useMemo(() => ({
		name: vendor?.name ?? '',
		aliases: vendor?.aliases ?? (fromScan?.name ? [fromScan.name] : []),
		colour: vendor ? pickedColour(vendor.colour) : 'green-2',
		favourite: Boolean(vendor?.favourite),
		defaultCategories: vendor?.defaultCategories ?? [],
		defaultExcludeFromStats: Boolean(vendor?.defaultExcludeFromStats)
	}), [vendor])
	const [values, setValues] = useState(start)
	const [errors, setErrors] = useState({})
	// the vendor's image (17e): staged here, sent once the vendor is saved; `problem` is why a file was refused
	const [image, setImage] = useState(() => ({ src: vendor?.image ? vendorImageUrl(vendor.id, vendor.image, 'square-256') : null, file: null, drop: false, problem: null }))
	const takeImage = async file => {
		const problem = await inspectVendorImage(file)
		if (problem) return setImage(i => ({ ...i, problem }))
		setImage(i => {
			if (i.file) URL.revokeObjectURL(i.src)
			return { src: URL.createObjectURL(file), file, drop: false, problem: null }
		})
	}
	const removeImage = () => setImage(i => {
		if (i.problem) return { ...i, problem: null }
		if (i.file) URL.revokeObjectURL(i.src)
		return { src: null, file: null, drop: Boolean(vendor?.image), problem: null }
	})
	const [deleting, setDeleting] = useState(false)
	// Merge into… (5d: nothing lives only in a row's menu): the picker, then the two 5j's dialog compares
	const [picking, setPicking] = useState(false)
	const [merging, setMerging] = useState(null)
	// aliases another vendor holds, which this save moves here; and the one on offer to move
	const [moves, setMoves] = useState([])
	const [offer, setOffer] = useState(null)
	// a vendor whose name is close to the one typed, offered instead (5b)
	const [close, setClose] = useState(null)
	const [busy, setBusy] = useState(false)
	const [saving, setSaving] = useState(false)
	// the vendor was deleted after this page opened it: what the save said, and nothing left to save
	const [lost, setLost] = useState(null)
	const writing = useRef(false)
	const set = (key, value) => setValues(v => ({ ...v, [key]: value }))

	const changed = values.name.trim() !== start.name.trim() || !same(values.aliases, start.aliases)
		|| values.colour !== start.colour || values.favourite !== start.favourite
		|| !same(values.defaultCategories, start.defaultCategories) || values.defaultExcludeFromStats !== start.defaultExcludeFromStats
		|| Boolean(image.file) || image.drop
	const guard = useLeaveGuard(changed)
	const leave = () => { guard.release(); navigate(list) }
	// back to the receipt, with the vendor just made chosen on it
	const back = name => { guard.release(); navigate(fromScan.to, { state: { pickedVendor: name } }) }

	// the other vendor a name already files under, compared as receipts are matched (5h); none when it cannot be asked
	const owner = text => getVendorPage({ name: text, except: vendor?.id, pageSize: 1 }).then(r => r.vendors[0] ?? null, () => null)
	const nameProblem = async name => {
		if (!name.trim()) return 'Give the vendor a name.'
		const taken = await owner(name)
		if (!taken) return null
		return vendorKey(taken.name) === vendorKey(name)
			? lower(taken.name) === lower(name) ? `You already have a vendor called ${taken.name}.` : `${taken.name} already has that name. Pick a different name.`
			: `Another vendor, ${taken.name}, already matches "${name.trim()}". Pick a different name.`
	}
	// on leaving the field: the vendor most like this one, when the two look like one shop (5j)
	const lookAlike = async name => {
		if (!name.trim() || name.trim() === start.name.trim()) return null
		const like = await getVendorPage({ like: name, aka: values.aliases.join('\n'), except: vendor?.id, pageSize: 1, shape: 'brief' }).catch(() => null)
		return like?.vendors[0] ?? null
	}
	// what leaving the name field found, kept only while the name is still the one it was asked about
	const named = useRef(values.name)
	named.current = values.name
	const checkName = async () => {
		const asked = values.name
		const problem = await nameProblem(asked)
		const like = problem ? null : await lookAlike(asked)
		if (named.current !== asked) return
		setErrors(e => ({ ...e, name: problem }))
		setClose(like)
	}

	/* A name another vendor already matches would file receipts in two places, so it is
	   stopped where it is typed: another vendor's alias can be moved here, its name cannot. */
	const refusal = async alias => {
		const taken = await owner(alias)
		if (taken && vendorKey(taken.name) === vendorKey(alias)) return { message: `Another vendor is called ${taken.name}. Pick a different one.` }
		if (taken) return { message: `${taken.name} already matches "${alias}". Move it here, or pick a different one.`, offer: { alias, holder: taken } }
		if (vendorKey(alias) === vendorKey(values.name)) return { message: `"${alias}" already matches ${values.name.trim()}. Capitals, punctuation and endings like Inc or ApS do not count.` }
		return null
	}
	// several names arrive at once from a pasted list: each is checked, and the first refused one is shown
	const changeAliases = async next => {
		setOffer(null)
		const kept = []
		let refused = null
		for (const alias of next) {
			const why = values.aliases.includes(alias) ? null : await refusal(alias)
			if (why) refused ??= why
			else kept.push(alias)
		}
		setErrors(e => ({ ...e, aliases: refused?.message ?? null }))
		if (refused?.offer) setOffer(refused.offer)
		setMoves(m => m.filter(a => kept.includes(a)))
		set('aliases', kept)
	}
	const moveHere = () => {
		setMoves(m => [...m, offer.alias])
		set('aliases', [...values.aliases, offer.alias])
		setErrors(e => ({ ...e, aliases: null }))
		setOffer(null)
	}
	const keepThere = () => { setErrors(e => ({ ...e, aliases: null })); setOffer(null) }

	const save = async () => {
		if (writing.current) return
		writing.current = true
		const nameError = await nameProblem(values.name)
		setErrors(e => ({ ...e, name: nameError }))
		if (nameError) { writing.current = false; return focusFirst(['vendor-name']) }
		setSaving(true)
		const name = values.name.trim()
		const look = {
			// an alias the name already matches says nothing more, and the API refuses it
			name, aliases: values.aliases.filter(a => vendorKey(a) !== vendorKey(name)), ...(moves.length ? { move: moves } : {}), colour: storedColour(values.colour),
			favourite: values.favourite, defaultCategories: values.defaultCategories, defaultExcludeFromStats: values.defaultExcludeFromStats,
			...(name !== start.name ? { initials: name.slice(0, 2).toUpperCase() } : {}),
			...(fromScan && !editing ? { origin: 'scan' } : {})
		}
		const written = editing ? updateVendor(vendor.id, look) : createVendor(name, look)
		// the image follows the vendor it belongs to; a refusal there keeps the vendor and says why
		const sendImage = saved => (image.file
			? putVendorImage(saved.id, image.file).then(() => null, e => (e.status === 400
				? `${saved.name} was saved without its image. ${refusalOf(e.body?.reason).help}`
				: `${saved.name} was saved, but its image did not upload. Open the vendor and add it again.`))
			: image.drop
				? removeVendorImage(saved.id).then(() => null, () => `${saved.name} was saved, but its image was not removed. Try again.`)
				: Promise.resolve(null))
		written
			.then(async saved => {
				const imageSaid = await sendImage(saved)
				if (image.file || image.drop) invalidateOrderData()
				if (imageSaid) toast({ message: imageSaid, color: 'danger' })
				invalidateVendorData()
				invalidateCategoryData()
				if (fromScan && !editing) return back(saved.name)
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
						: /alias|vendor called|already matches|already find/.test(message) ? 'aliases' : null
				if (!about) return toast({ message, color: 'danger' })
				setErrors(err => ({ ...err, [about]: message }))
				focusFirst([about === 'name' ? 'vendor-name' : 'vendor-aliases'])
			})
	}

	/* Archiving asks nothing and offers Undo in its toast (6f). It returns to the list, which the
	   vendor has left; unarchiving stays on the page. */
	const setArchived = to => {
		setBusy(true)
		archiveVendor({ vendor, to, update: updateVendor, toast, done: invalidateVendorData })
			.then(() => {
				setBusy(false)
				if (to) leave()
			})
			.catch(e => {
				setBusy(false)
				if (isGone(e)) { guard.release(); return setLost(failureMessage(e, '')) }
				sayFailure(toast, e, 'That did not change. Try again.')
			})
	}

	// the vendor is gone once merged, so the page goes back to the list
	const merge = target => {
		setBusy(true)
		onGone(true)
		mergeVendor(vendor.id, target.id)
			.then(() => {
				invalidateVendorData()
				invalidateCategoryData()
				toast({ message: `${vendor.name} is merged into ${target.name}.` })
				leave()
			})
			.catch(e => {
				setBusy(false)
				onGone(false)
				sayFailure(toast, e, 'The vendors were not merged. Try again.')
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

	const marked = vendor?.lastMatched && values.aliases.includes(vendor.lastMatched) ? vendor.lastMatched : null

	const cards = (
		<>
			<Card>
				<CardHeader name="The vendor" />
				<Field id="vendor-name" label="Name"
					message={errors.name ?? (editing ? undefined : 'The name you will recognise in a list. Receipts can spell it differently.')}
					messageType={errors.name ? 'danger' : 'hint'}>
					{h(<TextField value={values.name} autoFocus onChange={v => { set('name', v); setClose(null) }}
						onBlur={checkName}
						placeholder={editing ? undefined : 'Where you bought it'} />)}
				</Field>
				{close
					? (
						<Alert color="warning" mark="!" action={<Button variant="outline" size="small" to={`/vendors/${close.id}/edit`}>Open {close.name}</Button>}>
							You already have {close.name}, a name very like this one. If it is the same shop, use that vendor instead.
						</Alert>
					)
					: null}
				<Field id="vendor-image" label="Image"
					message={image.problem?.help ?? (image.src ? 'Shown on this vendor\'s orders that have no item photo.'
						: 'Shown on this vendor\'s orders that have no item photo. A logo, the shop, anything you know it by.')}
					messageType={image.problem ? 'danger' : 'hint'}>
					{h(<Slot start size="large" kind={null} name="the image" accept={VENDOR_IMAGE_TYPES}
						src={image.src} problem={image.problem?.banner} inspect={() => null} onFile={takeImage} onRemove={removeImage} />)}
				</Field>
			</Card>

			<Card>
				<CardHeader name="Aliases" />
				<Field id="vendor-aliases" label="Also matches"
					message={errors.aliases ?? (fromScan && !editing && values.aliases.includes(fromScan.name)
						? 'Other names this vendor uses on receipts. The name the scan read is already here - keep it so the next receipt files itself.'
						: 'Other names this vendor uses on receipts. Capitals, punctuation and endings like Inc or ApS do not count.')}
					messageType={errors.aliases ? 'danger' : 'hint'}
					after={offer
						? (
							<div className="sp-row-flex sp-gap-8">
								<Button variant="outline" size="small" onClick={moveHere}>Move it here</Button>
								<Button variant="outline" size="small" onClick={keepThere}>Keep it on {offer.holder.name}</Button>
							</div>
						)
						: null}>
					{h(<TokensField value={values.aliases} onChange={changeAliases} placeholder="Add…" aria-label="Add a name" marked={marked} />)}
				</Field>
				<Field label="Colour" message="Pick one of the eight, or choose your own in the last box.">
					{h(<Picker swatches={Object.keys(SWATCHES)} custom customIcon={<Icon name="plus" />}
						value={values.colour} onChange={v => set('colour', v)} />)}
				</Field>
				<Choice variant="described" description="Leads the list wherever you pick a vendor."
					control={h(<Check checked={values.favourite} onChange={ev => set('favourite', ev.target.checked)} />)}>
					Favourite
				</Choice>
			</Card>

			<Card>
				<CardHeader name="Defaults for its orders" />
				<Field id="vendor-defaults" label="Default categories"
					message="Suggested on a new order from this vendor. Not applied automatically.">
					{h(<CategoryTokens value={values.defaultCategories} onChange={v => set('defaultCategories', v)} placeholder="none" />)}
				</Field>
				<div className="sp-field">
					<div className="sp-row-flex sp-gap-12">
						{h(<Switch id={statsSwitch} aria-describedby={`${statsSwitch}-help`} checked={values.defaultExcludeFromStats}
							onChange={ev => set('defaultExcludeFromStats', ev.target.checked)} />)}
						<label className="sp-data" htmlFor={statsSwitch}>Leave out of statistics</label>
					</div>
					<span className="sp-field__help" id={`${statsSwitch}-help`}>For a vendor of one-off purchases, like a car dealer. A new order from this vendor starts with Leave out of statistics on, and you can still change it on the order.</span>
				</div>
			</Card>
		</>
	)

	const touch = useShellShape() === 'touch'
	// a phone always shows its save bar, since it stands in the tab bar's place (Mobile 5b)
	const bar = touch || !editing || changed
		? (
			<CommitBar status={!editing ? 'Nothing saved yet' : changed ? 'Unsaved changes' : null} quiet={!editing}
				onCancel={() => navigate(fromScan && !editing ? fromScan.to : list)} onSave={lost ? null : save} commit={touch ? (editing ? 'Save' : 'Create') : editing ? 'Save vendor' : 'Create'}
				saving={saving} disabled={loading} />
		)
		: null

	const name = values.name.trim()
	// the list answer, when in hand, says whether the loaded rail has recent orders and a Delete
	const known = useApi(getVendorPage, [{ ids: loadingId, archived: 'all', pageSize: 1 }], { enabled: loading && Boolean(loadingId) }).data?.vendors[0]
	const end = endWords(known ?? { orders: 10 })
	const rail = loading
		? (
			<>
				<SummaryLoading label="Vendor summary" sums={[['Spend this year', '76'], ['Median order', '76'], ['Saved', '76'], ['Returned', '64']]}
					action="See more in statistics" />
				{!known || known.orders ? <RecentLoading /> : null}
				<EndLoading label="End of its life" title={end.title} body={end.body}
					action={<Button variant="outline">{known?.archived ? 'Unarchive' : 'Archive vendor'}</Button>}
					after={<Button variant="outline" size="small" fullWidth>Merge into…</Button>} />
			</>
		)
		: editing
			? (
				<>
					<VendorSummary vendor={vendor} name={name || vendor.name} colour={storedColour(values.colour)} />
					<RecentOrders filter={{ vendorId: vendor.id }} to={`/orders?vendor=${vendor.id}`} total={vendor.orders} />
					<EndOfLife vendor={vendor} busy={busy} onArchive={() => guard.ask(() => setArchived(true))} onUnarchive={() => setArchived(false)}
						onDelete={() => setDeleting(true)}
						merge={{
							open: picking, onToggle: () => setPicking(!picking), onClose: () => setPicking(false),
							picker: box => <MergePicker kind="vendor" source={vendor} anchor={box} position="start"
								onClose={() => setPicking(false)} onPick={target => { setPicking(false); setMerging(target) }} />
						}} />
				</>
			)
			: (
				<Card>
					<CardHeader name="Vendor summary" />
					<div className="sp-row-flex sp-gap-12">
						<VendorMark name={name || 'New vendor'} colour={storedColour(values.colour)} />
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
			{merging
				? <MergeDialog kind="vendor" source={vendor} initial={merging} busy={busy} onConfirm={merge} onCancel={() => setMerging(null)} />
				: null}
		</>
	)
}

/** What the end-of-life card says (5c): archiving always works and can be undone; only a vendor
    with no orders can be deleted. */
const endWords = ({ orders, archived = false }) => {
	if (archived) return {
		title: 'This vendor is archived',
		body: orders
			? `It is out of the vendor list and the order list's filters. Its ${plural(orders, 'order')} ${orders === 1 ? 'keeps' : 'keep'} it as their vendor.`
			: 'It is out of the vendor list and the order list\'s filters. Deleting removes it outright.'
	}
	return orders
		? { title: 'A vendor with orders cannot be deleted', body: `Every order must name a vendor, so its ${plural(orders, 'order')} ${orders === 1 ? 'keeps' : 'keep'} this one. Archiving takes it out of the list and the order list's filters, and leaves the orders as they are. If it is the same shop as another vendor, merge it into that one.` }
		: { title: 'Nothing points at this vendor any more', body: 'Archiving keeps it out of the way; deleting removes it outright.' }
}

/** The end-of-life card (5c): Archive, or Unarchive once archived, and Delete at zero orders; under
    them Merge into… (5d), whose picker `merge` holds. */
function EndOfLife({ vendor, busy, onArchive, onUnarchive, onDelete, merge }) {
	const { title, body } = endWords(vendor)
	const footer = [
		vendor.archived
			? <Button key="archive" variant="outline" disabled={busy} onClick={onUnarchive}>Unarchive</Button>
			: <Button key="archive" variant="outline" disabled={busy} onClick={onArchive}>Archive vendor</Button>,
		vendor.orders ? null : <Button key="delete" color="danger" onClick={onDelete}>Delete</Button>
	].filter(Boolean)
	return (
		<Card footer={footer} footerLayout={footer.length > 1 ? 'split' : 'fill'} footerCommits
			after={<MergeButton merge={merge} size="small" disabled={busy}>Merge into…</MergeButton>}>
			<CardHeader name="End of its life" />
			<Well>
				<span className="sp-title">{title}</span>
				<span className="sp-subtitle">{body}</span>
			</Well>
		</Card>
	)
}

/** What the vendor has cost, beside the fields that describe it (5c). */
function VendorSummary({ vendor, name, colour }) {
	const year = useApi(getVendorYear, [vendor.id])
	const { keyOf } = useStatusTypes()
	const returnedKey = keyOf('returned')
	const returned = useApi(getOrders, [{ vendorId: vendor.id, status: returnedKey, pageSize: 0 }], { enabled: !!returnedKey })
	const thisYear = year.data ?? null
	return (
		<Card>
			<CardHeader name="Vendor summary" />
			<div className="sp-row-flex sp-gap-12">
				<VendorMark name={name} colour={colour} />
				<Stacked>
					<span className="sp-title sp-truncate">{name}</span>
					<span className="sp-meta sp-truncate">{plural(vendor.orders, 'order')}{vendor.createdByScan ? `${dot}created by receipt scan` : null}</span>
				</Stacked>
			</div>
			<div className="sp-stack">
				<Sum value={thisYear === null ? '' : currency(thisYear.amount, 0)}>Spend this year</Sum>
				<Sum value={thisYear === null ? '' : currency(thisYear.median, 0)}>Median order</Sum>
				<Sum value={<span className={isSaving(vendor.saved, 0) ? 'sp-ink-accent' : undefined}>{currency(vendor.saved, 0)}</span>}>Saved</Sum>
				<Sum value={returned.data ? plural(returned.data.matched, 'order') : ''}>Returned</Sum>
			</div>
			<Button variant="outline" size="small" to={`/statistics?crumbs=vendor:${vendor.id}`}>See more in statistics</Button>
		</Card>
	)
}
