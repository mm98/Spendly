import { useId, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Card, CardHeader } from '../components/Card.jsx'
import { Field } from '../components/Field.jsx'
import { TextField } from '../components/Inputs.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { useStatusTypes } from '../app/statuses.js'
import { Check, Choice, Picker, Switch } from '../components/Choice.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { VendorMark } from '../app/categoryMark.jsx'
import { Sum } from '../components/Data.jsx'
import { Well } from '../components/Well.jsx'
import { Stacked } from '../components/Utilities.jsx'
import { Alert, useToast, Leaving } from '../components/Overlays.jsx'
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
import { phrase, usePhrase } from '../language/phrases.js'

/** A vendor, created (5b) or edited (5c): one page, one form, one rail. */
export default function VendorForm() {
	const phrase = usePhrase()
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
				<Failed what={phrase('vendor.this')} error={record.error} onRetry={record.refresh}
					back={{ to: list, label: phrase('vendor.openList') }} />
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
	const phrase = usePhrase()
	const navigate = useNavigate()
	const toast = useToast()
	const list = useListReturn('vendors')
	// opened from a scanned receipt (5b): the name it read starts the form, and saving goes back to it
	const fromScan = useLocation().state?.fromScan ?? null
	const h = loading ? hold : control => control
	const touch = useShellShape() === 'touch'
	const statsSwitch = useId()
	const editing = Boolean(vendor)
	const start = useMemo(() => ({
		name: vendor?.name ?? '',
		aliases: vendor?.aliases ?? (fromScan?.name ? [fromScan.name] : []),
		colour: vendor ? pickedColour(vendor.colour) : 'primary-2',
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
		if (!name.trim()) return phrase('vendor.nameMissing')
		const taken = await owner(name)
		if (!taken) return null
		return vendorKey(taken.name) === vendorKey(name)
			? phrase(lower(taken.name) === lower(name) ? 'vendor.nameTaken' : 'vendor.nameSame', { name: taken.name })
			: phrase('vendor.nameMatched', { name: taken.name, typed: name.trim() })
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
		if (taken && vendorKey(taken.name) === vendorKey(alias)) return { message: phrase('vendor.alias.isName', { name: taken.name }) }
		if (taken) return { message: phrase('vendor.alias.held', { name: taken.name, alias }), offer: { alias, holder: taken } }
		if (vendorKey(alias) === vendorKey(values.name)) return { message: phrase('vendor.alias.same', { alias, name: values.name.trim() }) }
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
				? phrase('vendor.image.refused', { name: saved.name, help: refusalOf(e.body?.reason).help })
				: phrase('vendor.image.notSent', { name: saved.name })))
			: image.drop
				? removeVendorImage(saved.id).then(() => null, () => phrase('vendor.image.notRemoved', { name: saved.name }))
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
				const message = failureMessage(e, phrase('vendor.notSaved'))
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
				sayFailure(toast, e, phrase('library.notChanged'))
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
				toast({ message: phrase('library.merged', { source: vendor.name, target: target.name }) })
				leave()
			})
			.catch(e => {
				setBusy(false)
				onGone(false)
				sayFailure(toast, e, phrase('vendors.notMerged'))
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
				sayFailure(toast, e, phrase('vendors.notDeleted'))
			})
	}

	const marked = vendor?.lastMatched && values.aliases.includes(vendor.lastMatched) ? vendor.lastMatched : null

	const cards = (
		<>
			<Card>
				<CardHeader name={phrase('vendor.card.vendor')} />
				<Field id="vendor-name" label={phrase('field.name')}
					message={errors.name ?? (editing ? undefined : phrase('vendor.nameHelp'))}
					messageType={errors.name ? 'danger' : 'hint'}>
					{h(<TextField value={values.name} autoFocus={!touch} onChange={v => { set('name', v); setClose(null) }}
						onBlur={checkName}
						placeholder={editing ? undefined : phrase('vendor.namePlaceholder')} />)}
				</Field>
				{close
					? (
						<Alert color="warning" mark="!" action={<Button variant="outline" size="small" to={`/vendors/${close.id}/edit`}>{phrase('vendor.openNamed', { name: close.name })}</Button>}>
							{phrase('vendor.close', { name: close.name })}
						</Alert>
					)
					: null}
				<Field id="vendor-image" label={phrase('vendor.image')}
					message={image.problem?.help ?? phrase(image.src ? 'vendor.imageHelp' : 'vendor.imageHelpEmpty')}
					messageType={image.problem ? 'danger' : 'hint'}>
					{h(<Slot start size="large" kind={null} name={phrase('vendor.theImage')} accept={VENDOR_IMAGE_TYPES}
						src={image.src} problem={image.problem?.banner} inspect={() => null} onFile={takeImage} onRemove={removeImage} />)}
				</Field>
			</Card>

			<Card>
				<CardHeader name={phrase('library.aliases')} />
				<Field id="vendor-aliases" label={phrase('vendor.alsoMatches')}
					message={errors.aliases ?? (fromScan && !editing && values.aliases.includes(fromScan.name)
						? phrase('vendor.aliasesHelpScan')
						: phrase('vendor.aliasesHelp'))}
					messageType={errors.aliases ? 'danger' : 'hint'}
					after={offer
						? (
							<div className="sp-row-flex sp-gap-8">
								<Button variant="outline" size="small" onClick={moveHere}>{phrase('vendor.moveHere')}</Button>
								<Button variant="outline" size="small" onClick={keepThere}>{phrase('vendor.keepOn', { name: offer.holder.name })}</Button>
							</div>
						)
						: null}>
					{h(<Combobox multiple value={values.aliases} onChange={changeAliases} placeholder={phrase('library.tokens.placeholder')} aria-label={phrase('vendor.addName')} marked={marked} />)}
				</Field>
				<Field label={phrase('vendor.colour')} message={phrase('vendor.colourHelp')}>
					{h(<Picker swatches={Object.keys(SWATCHES)} custom customIcon={<Icon name="plus" />}
						value={values.colour} onChange={v => set('colour', v)} />)}
				</Field>
				<Choice variant="described" description={phrase('vendor.favouriteHelp')}
					control={h(<Check checked={values.favourite} onChange={ev => set('favourite', ev.target.checked)} />)}>
					{phrase('vendor.favourite')}
				</Choice>
			</Card>

			<Card>
				<CardHeader name={phrase('vendor.defaults')} />
				<Field id="vendor-defaults" label={phrase('vendor.defaultCategories')}
					message={phrase('vendor.defaultCategoriesHelp')}>
					{h(<CategoryTokens value={values.defaultCategories} onChange={v => set('defaultCategories', v)} placeholder={phrase('vendors.none')} />)}
				</Field>
				<div className="sp-field">
					<label className="sp-row-flex sp-gap-12">
						{h(<Switch id={statsSwitch} aria-describedby={`${statsSwitch}-help`} checked={values.defaultExcludeFromStats}
							onChange={ev => set('defaultExcludeFromStats', ev.target.checked)} />)}
						<span className="sp-data">{phrase('form.leaveOut')}</span>
					</label>
					<span className="sp-field__help" id={`${statsSwitch}-help`}>{phrase('vendor.leaveOutHelp')}</span>
				</div>
			</Card>
		</>
	)

	// a phone always shows its save bar, since it stands in the tab bar's place (Mobile 5b)
	const bar = touch || !editing || changed
		? (
			<CommitBar status={!editing ? phrase('form.state.nothingYet') : changed ? phrase('form.state.unsaved') : null} quiet={!editing}
				onCancel={() => navigate(fromScan && !editing ? fromScan.to : list)} onSave={lost ? null : save} commit={phrase(touch ? (editing ? 'action.save' : 'action.create') : editing ? 'vendor.save' : 'action.create')}
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
				<SummaryLoading label={phrase('vendor.summary')} sums={[[phrase('vendor.spendYear'), '76'], [phrase('vendor.median'), '76'], [phrase('vendor.saved'), '76'], [phrase('vendor.returned'), '64']]}
					action={phrase('library.seeMoreStatistics')} />
				{!known || known.orders ? <RecentLoading /> : null}
				<EndLoading label={phrase('vendor.end')} title={end.title} body={end.body}
					action={<Button variant="outline">{known?.archived ? 'Unarchive' : phrase('vendor.archive')}</Button>}
					after={<Button variant="outline" size="small" fullWidth>{phrase('library.mergeInto')}</Button>} />
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
					<CardHeader name={phrase('vendor.summary')} />
					<div className="sp-row-flex sp-gap-12">
						<VendorMark name={name || phrase('vendors.new')} colour={storedColour(values.colour)} />
						<Stacked>
							<span className="sp-title sp-truncate">{name || phrase('vendors.new')}</span>
							<span className="sp-meta">{phrase('form.state.nothingYet')}</span>
						</Stacked>
					</div>
					<div className="sp-stack">
						<Sum value={name || '-'}>{phrase('field.name')}</Sum>
						<Sum value={values.aliases.length}>{phrase('library.aliases')}</Sum>
						<Sum value={values.defaultCategories.length}>{phrase('vendor.defaultCategories')}</Sum>
					</div>
				</Card>
			)

	return (
		<>
			<RecordPage notice={lost ? <GoneNotice message={lost} list={{ to: list, label: phrase('vendor.openList') }} /> : null}
				cards={cards} rail={rail} alone={editing ? rail : null} bar={bar} />
			<Leaving>{guard.prompt}</Leaving>
			<Leaving>{deleting
				? (
					<ConfirmDelete title={phrase('library.deleteTitle', { name: vendor.name })} action={phrase('vendors.delete')} busy={busy}
						onConfirm={remove} onCancel={() => setDeleting(false)}>
						{deleteNote(vendor)}
					</ConfirmDelete>
				)
				: null}</Leaving>
			<Leaving>{merging
				? <MergeDialog kind="vendor" source={vendor} initial={merging} busy={busy} onConfirm={merge} onCancel={() => setMerging(null)} />
				: null}</Leaving>
		</>
	)
}

/** What the end-of-life card says (5c): archiving always works and can be undone; only a vendor
    with no orders can be deleted. */
const endWords = ({ orders, archived = false }) => {
	const counted = { orders: plural(orders, 'order'), count: orders }
	if (archived) return { title: phrase('vendor.end.archived'), body: phrase('vendor.end.archivedBody', counted) }
	return orders
		? { title: phrase('vendor.end.hasOrders'), body: phrase('vendor.end.hasOrdersBody', counted) }
		: { title: phrase('vendor.end.free'), body: phrase('vendor.end.freeBody') }
}

/** The end-of-life card (5c): Archive, or Unarchive once archived, and Delete at zero orders; under
    them Merge into… (5d), whose picker `merge` holds. */
function EndOfLife({ vendor, busy, onArchive, onUnarchive, onDelete, merge }) {
	const phrase = usePhrase()
	const { title, body } = endWords(vendor)
	const footer = [
		vendor.archived
			? <Button key="archive" variant="outline" disabled={busy} onClick={onUnarchive}>{phrase('library.unarchive')}</Button>
			: <Button key="archive" variant="outline" disabled={busy} onClick={onArchive}>{phrase('vendor.archive')}</Button>,
		vendor.orders ? null : <Button key="delete" color="danger" onClick={onDelete}>{phrase('action.delete')}</Button>
	].filter(Boolean)
	return (
		<Card footer={footer} footerLayout={footer.length > 1 ? 'split' : 'fill'} footerCommits
			after={<MergeButton merge={merge} size="small" disabled={busy}>{phrase('library.mergeInto')}</MergeButton>}>
			<CardHeader name={phrase('vendor.end')} />
			<Well>
				<span className="sp-title">{title}</span>
				<span className="sp-subtitle">{body}</span>
			</Well>
		</Card>
	)
}

/** What the vendor has cost, beside the fields that describe it (5c). */
function VendorSummary({ vendor, name, colour }) {
	const phrase = usePhrase()
	const year = useApi(getVendorYear, [vendor.id])
	const { keyOf } = useStatusTypes()
	const returnedKey = keyOf('returned')
	const returned = useApi(getOrders, [{ vendorId: vendor.id, status: returnedKey, pageSize: 0 }], { enabled: !!returnedKey })
	const thisYear = year.data ?? null
	return (
		<Card>
			<CardHeader name={phrase('vendor.summary')} />
			<div className="sp-row-flex sp-gap-12">
				<VendorMark name={name} colour={colour} />
				<Stacked>
					<span className="sp-title sp-truncate">{name}</span>
					<span className="sp-meta sp-truncate">{plural(vendor.orders, 'order')}{vendor.createdByScan ? <>{dot}{phrase('vendors.byScan')}</> : null}</span>
				</Stacked>
			</div>
			<div className="sp-stack">
				<Sum value={thisYear === null ? '' : currency(thisYear.amount, 0)}>{phrase('vendor.spendYear')}</Sum>
				<Sum value={thisYear === null ? '' : currency(thisYear.median, 0)}>{phrase('vendor.median')}</Sum>
				<Sum value={<span className={isSaving(vendor.saved, 0) ? 'sp-ink-accent' : undefined}>{currency(vendor.saved, 0)}</span>}>{phrase('vendor.saved')}</Sum>
				<Sum value={returned.data ? plural(returned.data.matched, 'order') : ''}>{phrase('vendor.returned')}</Sum>
			</div>
			<Button variant="outline" size="small" to={`/statistics?crumbs=vendor:${vendor.id}`}>{phrase('library.seeMoreStatistics')}</Button>
		</Card>
	)
}
