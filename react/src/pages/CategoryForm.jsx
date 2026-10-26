import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Card, CardHeader } from '../components/Card.jsx'
import { Field } from '../components/Field.jsx'
import { NumberField, TextField } from '../components/Inputs.jsx'
import { Check, Choice, Picker } from '../components/Choice.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { Gauge, Stat, Sum } from '../components/Data.jsx'
import { Well } from '../components/Well.jsx'
import { Skeleton, Stacked } from '../components/Utilities.jsx'
import { useToast, Leaving } from '../components/Overlays.jsx'
import { useApi } from '../api/useApi.js'
import {
	changeOrders, createCategory, deleteCategory, failureMessage, getCategory, getCategoryPage, getNextCategoryColour,
	invalidateCategoryData, invalidateOrderData, invalidateVendorData, mergeCategory, overBudget, updateCategory
} from '../api/client.js'
import { NUMBER_LOCALE, amount, currency, dot, plural } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import { useListReturn } from '../app/listMemory.js'
import { CategoryIconPicker } from '../app/categoryMark.jsx'
import { OfferSwitchesCard, useOfferSwitches } from './offerSwitches.jsx'
import {
	CategoryMark, CommitBar, DeleteCategory, EndLoading, GoneNotice, Held, RecentLoading, RecentOrders, RecordPage, SWATCHES,
	MergeButton, MergeDialog, MergePicker, SummaryLoading, focusFirst, hold, isGone, monthPace, sayFailure, pickedColour, storedColour, swatchOf, useLeaveGuard
} from './vendorsCategories.jsx'

/** A category, created (5e) or edited (5f): one page, one form, one rail. */
export default function CategoryForm() {
	const { id } = useParams()
	// once deleted or merged, that record is not read again (the page is on its way out); another one is
	const [gone, setGone] = useState(null)
	const record = useApi(getCategory, [id], { enabled: Boolean(id) && gone !== id })
	const going = on => setGone(on ? id : null)
	const list = useListReturn('categories')
	// the last record stays in hand while the next one loads, so it has to be the one the address names
	if (id && record.data?.id !== id) {
		if (record.error) return (
			<div className="sp-stack sp-gap-12">
				<Failed what="This category" error={record.error} onRetry={record.refresh}
					back={{ to: list, label: 'Open Categories' }} />
			</div>
		)
		return <CategoryFields key="loading" category={LOADING} loading loadingId={id} onGone={going} />
	}
	return <CategoryFields key={id ?? 'new'} category={id ? record.data ?? null : null} onGone={going} />
}

// the form while the category is on its way: an existing record's form, every value held by a skeleton
const LOADING = { id: null, name: '', icon: 'tag', colour: null, budget: 0, favourite: false, orders: 0, bookmarks: 0 }

function CategoryFields({ category, loading = false, loadingId, onGone }) {
	const navigate = useNavigate()
	const toast = useToast()
	const touch = useShellShape() === 'touch'
	const list = useListReturn('categories')
	const h = loading ? hold : control => control
	const editing = Boolean(category)
	// a name typed where the category was asked for (Order list 2e) starts the new one
	const [params] = useSearchParams()
	const named = params.get('name') ?? ''
	// opened from an order's category picker (5e): the order the new category is chosen on, back there
	const forOrder = editing ? null : params.get('for')
	const location = useLocation()
	// Statistics' Edit on a category's limit (4a) opens here with the limit field ready to type in
	const focusLimit = editing && !loading && params.get('focus') === 'limit'
	useEffect(() => { if (focusLimit) focusFirst(['category-limit']) }, [focusLimit])
	const start = useMemo(() => ({
		name: category?.name ?? named,
		// a saved name missing from Tabler is kept until the user picks again (c7)
		icon: category?.icon || 'tag',
		colour: category ? pickedColour(category.colour) : null,
		budget: category?.budget > 0 ? category.budget : null,
		favourite: Boolean(category?.favourite)
	}), [category, named])
	const [values, setValues] = useState(start)
	const [errors, setErrors] = useState({})
	const [deleting, setDeleting] = useState(false)
	// Merge…: the picker from its button, then the category 5j's dialog compares against
	const [picking, setPicking] = useState(false)
	const [merging, setMerging] = useState(null)
	const [busy, setBusy] = useState(false)
	const [saving, setSaving] = useState(false)
	// the category was deleted after this page opened it: what the save said, and nothing left to save
	const [lost, setLost] = useState(null)
	const writing = useRef(false)
	const set = (key, value) => setValues(v => ({ ...v, [key]: value }))

	// a new category starts on the first of the eight no other category has
	const next = useApi(getNextCategoryColour, [], { enabled: !editing && !loading }).data
	const colour = values.colour ?? (next ? swatchOf(next) : 'green')
	// the other category a name already means, case and accents set aside
	const sameAs = name => getCategoryPage({ name, except: category?.id, pageSize: 1 }).then(r => r.categories[0] ?? null, () => null)
	const typed = values.name.trim()
	const holder = useApi(getCategoryPage, [{ name: typed, except: category?.id, pageSize: 1, shape: 'brief' }], { enabled: !editing && Boolean(typed) })

	const offerSwitches = useOfferSwitches('category', category?.id ?? loadingId)
	const changed = offerSwitches.changed || values.name.trim() !== start.name.trim() || values.icon !== start.icon
		|| values.colour !== start.colour || values.budget !== start.budget || values.favourite !== start.favourite
	const guard = useLeaveGuard(changed)
	const leave = () => { guard.release(); navigate(list) }
	// back to the page the picker was on, or to the order when this page was opened on its own
	const returnToOrder = () => (location.key !== 'default' ? navigate(-1) : navigate(`/orders/${forOrder}`))
	const back = () => { guard.release(); returnToOrder() }
	/* The new category goes on the order whose picker asked for it, with Undo. Created but not
	   added, it says so, and the way back is the same. */
	const chooseOnOrder = (saved, made = true) => changeOrders({ ids: [forOrder], addCategories: [saved.name] })
		.then(() => {
			invalidateOrderData()
			toast({
				message: made ? `${saved.name} is created and added to the order.` : `${saved.name} is added to the order.`,
				undo: {
					onClick: () => changeOrders({ ids: [forOrder], removeCategories: [saved.id] })
						.then(invalidateOrderData, e => sayFailure(toast, e, 'The category was not taken off. Try again.'))
				}
			})
		}, e => sayFailure(toast, e, made
			? `${saved.name} is created, but it was not added to the order. Add it from the order's menu.`
			: `${saved.name} was not added to the order. Add it from the order's menu.`))
		.finally(back)

	// a new category's name that is already taken (6c): the existing one can be used in its place
	const taken = editing || !typed ? null : holder.data?.categories[0] ?? null
	const takeExisting = () => {
		if (forOrder) return chooseOnOrder(taken, false)
		guard.release()
		navigate(`/categories/${taken.id}/edit`, { replace: true })
	}

	const nameProblem = async name => {
		if (!name.trim()) return 'Give the category a name.'
		const same = await sameAs(name.trim())
		return same ? `"${same.name}" already exists, with ${plural(same.orders ?? 0, 'order')}. Use it, or choose another name.` : null
	}
	const budgetProblem = budget => (budget === 0 ? 'Use an amount above zero, or leave it empty for no limit.' : null)
	// a limit most of the last twelve months went past (6c): said in amber on leaving the field, and saving is not stopped
	const [checkedBudget, setCheckedBudget] = useState(start.budget)
	const passedMonths = checkedBudget > 0 ? (category?.monthSpends ?? []).filter(spend => spend > checkedBudget).length : 0
	const limitWarning = passedMonths > 6
		? `${values.name.trim() || category.name} averaged ${currency(category.monthAverage, 0)} a month over the last 12 months. This limit will be passed most months.`
		: null

	const save = async () => {
		if (writing.current) return
		writing.current = true
		const found = { name: await nameProblem(values.name), budget: budgetProblem(values.budget) }
		setErrors(found)
		if (found.name || found.budget) { writing.current = false; return focusFirst([found.name && 'category-name', found.budget && 'category-limit']) }
		setSaving(true)
		const name = values.name.trim()
		const look = {
			name, icon: values.icon, colour: storedColour(colour), budget: values.budget ?? 0, favourite: values.favourite,
			...(values.icon !== start.icon ? { iconPath: null } : {})
		}
		const written = editing ? updateCategory(category.id, look) : createCategory(name, look)
		written
			.then(async saved => {
				const offersSaid = await offerSwitches.save(saved.id).then(() => null, () => `${saved.name} was saved, but its offers switch was not. Try again.`)
				if (offersSaid) toast({ message: offersSaid, color: 'danger' })
				invalidateCategoryData()
				if (forOrder) return chooseOnOrder(saved)
				leave()
			})
			.catch(e => {
				writing.current = false
				setSaving(false)
				if (editing && isGone(e)) { guard.release(); return setLost(failureMessage(e, '')) }
				const message = failureMessage(e, 'The category was not saved. Check the connection and try again.')
				if (!message) return
				if (e?.status === 409 || e?.status === 400) {
					setErrors(err => ({ ...err, name: message }))
					return focusFirst(['category-name'])
				}
				toast({ message, color: 'danger' })
			})
	}

	const remove = () => {
		setBusy(true)
		onGone(true)
		deleteCategory(category.id)
			.catch(e => { if (!isGone(e)) throw e })
			.then(() => {
				invalidateCategoryData()
				invalidateVendorData()
				leave()
			})
			.catch(e => {
				setBusy(false)
				onGone(false)
				sayFailure(toast, e, 'The category was not deleted. Try again.')
			})
	}

	const merge = target => {
		setBusy(true)
		onGone(true)
		mergeCategory(category.id, target.id)
			.then(() => {
				invalidateCategoryData()
				invalidateVendorData()
				toast({ message: `${category.name} is merged into ${target.name}.` })
				leave()
			})
			.catch(e => {
				setBusy(false)
				onGone(false)
				sayFailure(toast, e, 'The categories were not merged. Try again.')
			})
	}

	const preview = { name: values.name.trim() || 'New category', icon: values.icon, colour: storedColour(colour) }

	const cards = (
		<>
			<Card>
				<CardHeader name="The category" />
				<Field id="category-name" label="Name"
					message={errors.name ?? (editing ? undefined : 'Appears on chips, filters and charts, so short wins - "Decor", not "Home decoration items".')}
					messageType={errors.name ? 'danger' : 'hint'}>
					{h(<TextField value={values.name} autoFocus onChange={v => set('name', v)}
						onBlur={() => { const asked = values.name; nameProblem(asked).then(problem => setErrors(e => ({ ...e, name: problem }))) }}
						placeholder={editing ? undefined : 'What you spent it on'} />)}
				</Field>
				{errors.name && taken
					? (
						<div className="sp-row-flex sp-gap-8">
							<Button size="small" onClick={takeExisting}>Use {taken.name}</Button>
						</div>
					)
					: null}
			</Card>

			<Card>
				<CardHeader name="Mark" />
				<div className="sp-stack sp-gap-12">
					<Field label="Icon">
						{h(<CategoryIconPicker value={values.icon} onChange={v => set('icon', v)} />)}
					</Field>
					<Field label="Colour" message="Pick one of the eight, or choose your own in the last box.">
						{h(<Picker swatches={Object.keys(SWATCHES)} custom customIcon={<Icon name="plus" />}
							value={colour} onChange={v => set('colour', v)} />)}
					</Field>
					<Choice variant="described" description="Leads the list in every category picker."
						control={h(<Check checked={values.favourite} onChange={ev => set('favourite', ev.target.checked)} />)}>
						Favourite
					</Choice>
				</div>
			</Card>

			<Card>
				<CardHeader name="Monthly limit" />
				{/* the field's own blur formats the amount, so the check listens from around it */}
				<div onBlur={() => { setErrors(e => ({ ...e, budget: budgetProblem(values.budget) })); setCheckedBudget(values.budget) }}>
					<Field id="category-limit" label="Limit"
						message={errors.budget ?? limitWarning ?? (editing ? 'One amount for every month. Statistics reads this.' : 'One amount that applies to every month. Leave empty for no limit.')}
						messageType={errors.budget ? 'danger' : limitWarning ? 'warning' : 'hint'}>
						{/* money is written the Danish way everywhere it is shown (api/format.js), so it is typed that way too */}
						{h(<NumberField value={values.budget} onChange={n => set('budget', n)} min={0} locale={NUMBER_LOCALE} placeholder="no limit" />)}
					</Field>
				</div>
			</Card>
			<OfferSwitchesCard kind="category" switches={offerSwitches} hold={h} />
		</>
	)

	// a phone always shows its save bar, since it stands in the tab bar's place (Mobile 5b)
	const bar = touch || !editing || changed
		? (
			<CommitBar status={!editing ? 'Nothing saved yet' : changed ? 'Unsaved changes' : null} quiet={!editing}
				onCancel={() => (forOrder ? returnToOrder() : navigate(list))} onSave={lost ? null : save}
				commit={touch ? (editing ? 'Save' : 'Create') : editing ? 'Save category' : 'Create'} saving={saving} disabled={loading} />
		)
		: null

	const rail = loading
		? <RailLoading id={loadingId} />
		: editing
			? (
				<>
					<CategorySummary category={category} preview={preview} budget={values.budget} />
					<RecentOrders filter={{ categoryId: category.id }} to={`/orders?category=${category.id}`} total={category.orders} />
					<Removing category={category} onDelete={() => setDeleting(true)}
						merge={{
							open: picking, onToggle: () => setPicking(!picking), onClose: () => setPicking(false),
							picker: box => <MergePicker kind="category" source={category} anchor={box} position="start"
								onClose={() => setPicking(false)} onPick={target => { setPicking(false); setMerging(target) }} />
						}} />
				</>
			)
			: (
				<Card>
					<CardHeader name="Category summary" />
					<div className="sp-row-flex sp-gap-12">
						<CategoryMark category={preview} />
						<Stacked>
							<span className="sp-title sp-truncate">{preview.name}</span>
						</Stacked>
					</div>
					<div className="sp-stack">
						<Sum value={values.name.trim() || '-'}>Name</Sum>
						<Sum value={values.budget ? currency(values.budget, 0) : 'none'}>Monthly limit</Sum>
					</div>
				</Card>
			)

	return (
		<>
			<RecordPage notice={lost ? <GoneNotice message={lost} list={{ to: list, label: 'Open Categories' }} /> : null}
				cards={cards} rail={rail} alone={editing ? rail : null} bar={bar} />
			<Leaving>{guard.prompt}</Leaving>
			<Leaving>{deleting
				? <DeleteCategory category={category} busy={busy} onConfirm={remove} onCancel={() => setDeleting(false)} />
				: null}</Leaving>
			<Leaving>{merging
				? <MergeDialog kind="category" source={category} initial={merging} busy={busy} onConfirm={merge} onCancel={() => setMerging(null)} />
				: null}</Leaving>
		</>
	)
}

/** This month against the limit, and what the category has carried (5f). The limit is the
    form's own value, so the bar answers the number being typed. */
function CategorySummary({ category, preview, budget }) {
	const month = useApi(getCategoryPage, [{ ids: category.id, with: 'month', pageSize: 1 }])
	const spend = month.data?.categories[0]?.monthSpend
	const pace = monthPace()
	const limit = budget > 0 ? budget : null
	const over = limit !== null && spend > limit
	return (
		<Card>
			<CardHeader name="Category summary" />
			<div className="sp-row-flex sp-gap-12">
				<CategoryMark category={preview} />
				<Stacked>
					<span className="sp-title sp-truncate">{preview.name}</span>
					<span className="sp-meta">
						{plural(category.orders, 'order')}{spend === undefined ? null : <>{dot}{currency(spend, 0)} this month</>}
					</span>
				</Stacked>
			</div>
			{spend === undefined
				? null
				: (
					<>
						<div className="sp-row-flex sp-gap-12 sp-baseline">
							<Stat bare large figure={over ? <span className="sp-ink-warning">{currency(spend, 0)}</span> : currency(spend, 0)} />
							{limit !== null ? <span className="sp-data sp-ink-5">of {currency(limit, 0)}</span> : null}
						</div>
						{limit !== null
							? <Gauge value={Math.min(100, (spend / limit) * 100)} passed={over} marker={pace.at} aria-label="Share of the limit used" />
							: <Gauge untargeted value={0} aria-label="No limit set" />}
						{over
							? <span className="sp-meta sp-ink-warning">{currency(spend - limit, 0)} over the limit, on day {pace.day} of {pace.days}.</span>
							: null}
					</>
				)}
			<div className="sp-stack">
				<Sum value={currency(category.monthAverage ?? 0, 0)}>12-month average</Sum>
				<Sum value={amount(category.orders, 0)}>Orders</Sum>
			</div>
			<Button variant="outline" size="small" to={`/statistics?crumbs=category:${category.id}`}>See more in statistics</Button>
		</Card>
	)
}

/** The rail while the category loads. The list answer, when in hand, gives each card the shape
    the loaded one takes: the over-the-limit line, the recent orders, the words of the way out. */
function RailLoading({ id }) {
	const month = useApi(getCategoryPage, [{ ids: id, with: 'month', pageSize: 1 }], { enabled: Boolean(id) })
	const known = month.data?.categories[0]
	const over = known ? overBudget(known) : false
	const end = removingWords(known ?? { orders: 10 })
	return (
		<>
			<SummaryLoading label="Category summary" sums={[['12-month average', '76'], ['Orders', '44']]} action="See more in statistics">
				<Held shape={<Stat large figure="0 kr." />}><Skeleton shape="line" data-w="130" data-h="22" /></Held>
				<Held shape={<Gauge value={0} aria-label="Share of the limit used" />} />
				{over ? <Held shape={<span className="sp-meta">0 kr. over the limit, on day 1 of 30.</span>} /> : null}
			</SummaryLoading>
			{!known || known.orders ? <RecentLoading /> : null}
			<EndLoading label="Removing it" title={end.title} body={end.body} action={<Button color="danger">Delete</Button>} />
		</>
	)
}

/** What the way-out card says (5f): a category can always be merged or deleted, since it is
    optional on an order. */
const removingWords = category => (category.orders || category.bookmarks
	? {
		title: 'Merge it into another category, or delete it',
		body: `Merging hands its ${plural(category.orders, 'order')} to the category you pick. Deleting takes the label off them; any other categories they carry stay. To keep the grouping under a different name, rename it instead.`
	}
	: { title: 'Nothing carries this category', body: 'Merging or deleting it changes no order. To keep it under a different name, rename it instead.' })

function Removing({ category, merge, onDelete }) {
	const { title, body } = removingWords(category)
	return (
		<Card footer={[
			<MergeButton key="merge" merge={merge}>Merge…</MergeButton>,
			<Button key="delete" color="danger" onClick={onDelete}>Delete</Button>
		]} footerLayout="split" footerCommits>
			<CardHeader name="Removing it" />
			<Well>
				<span className="sp-title">{title}</span>
				<span className="sp-subtitle">{body}</span>
			</Well>
		</Card>
	)
}
