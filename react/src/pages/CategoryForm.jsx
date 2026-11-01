import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Card, CardFooter, CardHeader } from '../components/Card.jsx'
import { Field } from '../components/Field.jsx'
import { NumberField, TextField } from '../components/Inputs.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { Check, Choice, Picker } from '../components/Choice.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { Gauge, Stat, Sum } from '../components/Data.jsx'
import { Well } from '../components/Well.jsx'
import { Skeleton, Stacked } from '../components/Utilities.jsx'
import { Alert, useToast, Leaving } from '../components/Overlays.jsx'
import { useApi } from '../api/useApi.js'
import {
	changeOrders, createCategory, deleteCategory, failureMessage, getCategory, getCategoryPage, getNextCategoryColour,
	invalidateCategoryData, invalidateOrderData, invalidateVendorData, mergeCategory, overBudget, periodSpend, updateCategory,
	categoryBudgetPeriods
} from '../api/client.js'
import { NUMBER_LOCALE, amount, currency, currencySymbol, dot, plural } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import { useListReturn } from '../app/listMemory.js'
import { CategoryIconPicker } from '../app/categoryMark.jsx'
import {
	CategoryMark, CommitBar, DeleteCategory, EndLoading, GoneNotice, Held, RecentLoading, RecentOrders, RecordPage, SWATCHES,
	MergeButton, MergeDialog, MergePicker, SummaryLoading, focusFirst, hold, isGone, periodPace, sayFailure, pickedColour, storedColour, swatchOf, useLeaveGuard
} from './vendorsCategories.jsx'
import { phrase, usePhrase } from '../language/phrases.js'

/** A category, created (5e) or edited (5f): one page, one form, one rail. */
export default function CategoryForm() {
	const phrase = usePhrase()
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
				<Failed what={phrase('category.this')} error={record.error} onRetry={record.refresh}
					back={{ to: list, label: phrase('category.openList') }} />
			</div>
		)
		return <CategoryFields key="loading" category={LOADING} loading loadingId={id} onGone={going} />
	}
	return <CategoryFields key={id ?? 'new'} category={id ? record.data ?? null : null} onGone={going} />
}

// the form while the category is on its way: an existing record's form, every value held by a skeleton
const LOADING = { id: null, name: '', icon: 'tag', colour: null, budget: 0, favourite: false, orders: 0, bookmarks: 0 }

function CategoryFields({ category, loading = false, loadingId, onGone }) {
	const phrase = usePhrase()
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
		budgetPeriod: category?.budgetPeriod ?? categoryBudgetPeriods[0],
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
	const colour = values.colour ?? (next ? swatchOf(next) : 'primary')
	// the other category a name already means, case and accents set aside
	const sameAs = name => getCategoryPage({ name, except: category?.id, pageSize: 1 }).then(r => r.categories[0] ?? null, () => null)
	const typed = values.name.trim()
	const holder = useApi(getCategoryPage, [{ name: typed, except: category?.id, pageSize: 1, shape: 'brief' }], { enabled: !editing && Boolean(typed) })

	const changed = values.name.trim() !== start.name.trim() || values.icon !== start.icon
		|| values.colour !== start.colour || values.budget !== start.budget || values.budgetPeriod !== start.budgetPeriod
		|| values.favourite !== start.favourite
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
				message: phrase(made ? 'category.createdAdded' : 'category.added', { name: saved.name }),
				undo: {
					onClick: () => changeOrders({ ids: [forOrder], removeCategories: [saved.id] })
						.then(invalidateOrderData, e => sayFailure(toast, e, phrase('category.notTakenOff')))
				}
			})
		}, e => sayFailure(toast, e, made
			? phrase('category.createdNotAdded', { name: saved.name })
			: phrase('category.notAdded', { name: saved.name })))
		.finally(back)

	// a new category's name that is already taken (6c): the existing one can be used in its place
	const taken = editing || !typed ? null : holder.data?.categories[0] ?? null
	const takeExisting = () => {
		if (forOrder) return chooseOnOrder(taken, false)
		guard.release()
		navigate(`/categories/${taken.id}/edit`, { replace: true })
	}

	const nameProblem = async name => {
		if (!name.trim()) return phrase('category.nameMissing')
		const same = await sameAs(name.trim())
		return same ? phrase('category.nameTaken', { name: same.name, orders: plural(same.orders ?? 0, 'order') }) : null
	}
	const budgetProblem = budget => (budget === 0 ? phrase('category.limitZero') : null)
	// a limit most of the last twelve months went past (6c): said in amber on leaving the field, and saving is not stopped
	const [checkedBudget, setCheckedBudget] = useState(start.budget)
	// the months a yearly limit is not measured on, so it is not checked against them
	const passedMonths = checkedBudget > 0 && values.budgetPeriod === 'month' ? (category?.monthSpends ?? []).filter(spend => spend > checkedBudget).length : 0
	const limitWarning = passedMonths > 6
		? phrase('category.limitLow', { name: values.name.trim() || category.name, amount: currency(category.monthAverage, 0) })
		: null

	/* A saved limit keeps its size when its period changes (5i): a month to a year is twelve times the
	   amount, a year to a month a twelfth, in whole kroner. A new limit changes only its period. */
	const switchPeriod = period => setValues(v => {
		if (!(start.budget > 0) || !(v.budget > 0) || period === v.budgetPeriod) return { ...v, budgetPeriod: period }
		return { ...v, budgetPeriod: period, budget: period === 'year' ? Math.round(v.budget * 12) : Math.round(v.budget / 12) }
	})
	const periodChanged = start.budget > 0 && values.budget > 0 && values.budgetPeriod !== start.budgetPeriod

	const save = async () => {
		if (writing.current) return
		writing.current = true
		const found = { name: await nameProblem(values.name), budget: budgetProblem(values.budget) }
		setErrors(found)
		if (found.name || found.budget) { writing.current = false; return focusFirst([found.name && 'category-name', found.budget && 'category-limit']) }
		setSaving(true)
		const name = values.name.trim()
		const look = {
			name, icon: values.icon, colour: storedColour(colour), budget: values.budget ?? 0, budgetPeriod: values.budgetPeriod, favourite: values.favourite,
			...(values.icon !== start.icon ? { iconPath: null } : {})
		}
		const written = editing ? updateCategory(category.id, look) : createCategory(name, look)
		written
			.then(saved => {
				invalidateCategoryData()
				if (forOrder) return chooseOnOrder(saved)
				leave()
			})
			.catch(e => {
				writing.current = false
				setSaving(false)
				if (editing && isGone(e)) { guard.release(); return setLost(failureMessage(e, '')) }
				const message = failureMessage(e, phrase('category.notSaved'))
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
				sayFailure(toast, e, phrase('categories.notDeleted'))
			})
	}

	const merge = target => {
		setBusy(true)
		onGone(true)
		mergeCategory(category.id, target.id)
			.then(() => {
				invalidateCategoryData()
				invalidateVendorData()
				toast({ message: phrase('library.merged', { source: category.name, target: target.name }) })
				leave()
			})
			.catch(e => {
				setBusy(false)
				onGone(false)
				sayFailure(toast, e, phrase('categories.notMerged'))
			})
	}

	const preview = { name: values.name.trim() || phrase('categories.new'), icon: values.icon, colour: storedColour(colour) }

	const cards = (
		<>
			<Card>
				<CardHeader name={phrase('category.card.category')} />
				<Field id="category-name" label={phrase('field.name')}
					message={errors.name ?? (editing ? undefined : phrase('category.nameHelp'))}
					messageType={errors.name ? 'danger' : 'hint'}>
					{h(<TextField value={values.name} autoFocus={!touch} onChange={v => set('name', v)}
						onBlur={() => { const asked = values.name; nameProblem(asked).then(problem => setErrors(e => ({ ...e, name: problem }))) }}
						placeholder={editing ? undefined : phrase('category.namePlaceholder')} />)}
				</Field>
				{errors.name && taken
					? (
						<div className="sp-row-flex sp-gap-8">
							<Button size="small" onClick={takeExisting}>{phrase('category.use', { name: taken.name })}</Button>
						</div>
					)
					: null}
			</Card>

			<Card>
				<CardHeader name={phrase('category.mark')} />
				<div className="sp-stack sp-gap-12">
					<Field label={phrase('field.icon')}>
						{h(<CategoryIconPicker value={values.icon} onChange={v => set('icon', v)} />)}
					</Field>
					<Field label={phrase('vendor.colour')} message={phrase('vendor.colourHelp')}>
						{h(<Picker swatches={Object.keys(SWATCHES)} custom customIcon={<Icon name="plus" />}
							value={colour} onChange={v => set('colour', v)} />)}
					</Field>
					<Choice variant="described" description={phrase('category.favouriteHelp')}
						control={h(<Check checked={values.favourite} onChange={ev => set('favourite', ev.target.checked)} />)}>
						{phrase('vendor.favourite')}
					</Choice>
				</div>
			</Card>

			<Card>
				<CardHeader name={phrase('categories.limit')} />
				{/* the field's own blur formats the amount, so the check listens from around it; the period
				    sits beside the amount (5e), which Field cannot hold, so the field is put together here */}
				<div className="sp-field" onBlur={() => { setErrors(e => ({ ...e, budget: budgetProblem(values.budget) })); setCheckedBudget(values.budget) }}>
					<label className="sp-field__label" htmlFor="category-limit">{phrase('category.limit')}</label>
					<div className="sp-row-flex sp-gap-8">
						<span className="sp-field__wrap sp-grow">
							{/* money is written the Danish way everywhere it is shown (api/format.js), so it is typed that way too */}
							{h(<NumberField id="category-limit" unit aria-describedby="category-limit-help" value={values.budget} onChange={n => set('budget', n)}
								min={0} locale={NUMBER_LOCALE} placeholder={phrase('categories.noLimit')}
								{...(errors.budget ? { 'aria-invalid': 'true' } : limitWarning ? { 'data-color': 'warning' } : {})} />)}
							<span className="sp-field__unit">{currencySymbol()}</span>
						</span>
						{h(<Segmented name="category-limit-period" role="radiogroup" aria-label={phrase('category.limitPeriod')}
							options={categoryBudgetPeriods.map(period => ({ value: period, label: phrase(`category.limitPeriod.${period}`) }))}
							value={values.budgetPeriod} onChange={switchPeriod} />)}
					</div>
					<span className="sp-field__help" id="category-limit-help" {...(errors.budget ? { 'data-color': 'danger' } : limitWarning ? { 'data-color': 'warning' } : {})}>
						{errors.budget ?? limitWarning ?? phrase(editing ? 'category.limitHelp' : 'category.limitHelpNew', { period: values.budgetPeriod })}
					</span>
				</div>
				{periodChanged
					? (
						<Alert mark="!" title={phrase('category.limitChanges', { amount: currency(values.budget, 0), period: values.budgetPeriod })}>
							{phrase('category.limitChangesNote', { amount: currency(start.budget, 0), period: start.budgetPeriod })}
						</Alert>
					)
					: null}
			</Card>
		</>
	)

	// a phone always shows its save bar, since it stands in the tab bar's place (Mobile 5b)
	const bar = touch || !editing || changed
		? (
			<CommitBar status={!editing ? phrase('form.state.nothingYet') : changed ? phrase('form.state.unsaved') : null} quiet={!editing}
				onCancel={() => (forOrder ? returnToOrder() : navigate(list))} onSave={lost ? null : save}
				commit={phrase(touch ? (editing ? 'action.save' : 'action.create') : editing ? 'category.save' : 'action.create')} saving={saving} disabled={loading} />
		)
		: null

	const rail = loading
		? <RailLoading id={loadingId} />
		: editing
			? (
				<>
					<CategorySummary category={category} preview={preview} budget={values.budget} period={values.budgetPeriod} />
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
					<CardHeader name={phrase('category.summary')} />
					<div className="sp-row-flex sp-gap-12">
						<CategoryMark category={preview} />
						<Stacked>
							<span className="sp-title sp-truncate">{preview.name}</span>
						</Stacked>
					</div>
					<div className="sp-stack">
						<Sum value={values.name.trim() || '-'}>{phrase('field.name')}</Sum>
						<Sum value={values.budget ? phrase('category.limitFor', { amount: currency(values.budget, 0), period: values.budgetPeriod }) : phrase('vendors.none')}>{phrase('categories.limit')}</Sum>
					</div>
				</Card>
			)

	return (
		<>
			<RecordPage notice={lost ? <GoneNotice message={lost} list={{ to: list, label: phrase('category.openList') }} /> : null}
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

/** This month or this year against the limit, and what the category has carried (5f). The limit
    and its period are the form's own values, so the bar answers what is being typed. */
function CategorySummary({ category, preview, budget, period }) {
	const phrase = usePhrase()
	const month = useApi(getCategoryPage, [{ ids: category.id, with: 'month', pageSize: 1 }])
	const spent = month.data?.categories[0]
	const spend = spent ? periodSpend(spent, period) : undefined
	const pace = periodPace(period)
	const limit = budget > 0 ? budget : null
	const over = limit !== null && spend > limit
	return (
		<Card>
			<CardHeader name={phrase('category.summary')} />
			<div className="sp-row-flex sp-gap-12">
				<CategoryMark category={preview} />
				<Stacked>
					<span className="sp-title sp-truncate">{preview.name}</span>
					<span className="sp-meta">
						{plural(category.orders, 'order')}{spend === undefined ? null : <>{dot}{phrase('category.thisPeriod', { amount: currency(spend, 0), period })}</>}
					</span>
				</Stacked>
			</div>
			{spend === undefined
				? null
				: (
					<>
						<div className="sp-row-flex sp-gap-12 sp-baseline">
							<Stat bare large figure={over ? <span className="sp-ink-warning">{currency(spend, 0)}</span> : currency(spend, 0)} />
							{limit !== null ? <span className="sp-data sp-ink-5">{phrase('category.of', { amount: currency(limit, 0) })}</span> : null}
						</div>
						{limit !== null
							? <Gauge value={Math.min(100, (spend / limit) * 100)} passed={over} marker={pace.at} aria-label={phrase('categories.shareUsed')} />
							: <Gauge untargeted value={0} aria-label={phrase('categories.noLimitSet')} />}
						{over
							? <span className="sp-meta sp-ink-warning">{phrase('category.overOnDay', { amount: currency(spend - limit, 0), day: pace.day, days: pace.days })}</span>
							: null}
					</>
				)}
			<div className="sp-stack">
				<Sum value={currency(category.monthAverage ?? 0, 0)}>{phrase('category.average')}</Sum>
				<Sum value={amount(category.orders, 0)}>{phrase('page.orders')}</Sum>
			</div>
			<CardFooter><Button variant="outline" size="small" to={`/statistics?crumbs=category:${category.id}`}>{phrase('library.seeMoreStatistics')}</Button></CardFooter>
		</Card>
	)
}

/** The rail while the category loads. The list answer, when in hand, gives each card the shape
    the loaded one takes: the over-the-limit line, the recent orders, the words of the way out. */
function RailLoading({ id }) {
	const phrase = usePhrase()
	const month = useApi(getCategoryPage, [{ ids: id, with: 'month', pageSize: 1 }], { enabled: Boolean(id) })
	const known = month.data?.categories[0]
	const over = known ? overBudget(known) : false
	const end = removingWords(known ?? { orders: 10 })
	return (
		<>
			<SummaryLoading label={phrase('category.summary')} sums={[[phrase('category.average'), '76'], [phrase('page.orders'), '44']]} action={phrase('library.seeMoreStatistics')}>
				<Held shape={<Stat large figure="0 kr." />}><Skeleton shape="line" data-w="130" data-h="22" /></Held>
				<Held shape={<Gauge value={0} aria-label={phrase('categories.shareUsed')} />} />
				{over ? <Held shape={<span className="sp-meta">{phrase('category.overOnDay', { amount: currency(0, 0), day: 1, days: 30 })}</span>} /> : null}
			</SummaryLoading>
			{!known || known.orders ? <RecentLoading /> : null}
			<EndLoading label={phrase('category.removing')} title={end.title} body={end.body} action={<Button color="danger">{phrase('action.delete')}</Button>} />
		</>
	)
}

/** What the way-out card says (5f): a category can always be merged or deleted, since it is
    optional on an order. */
const removingWords = category => (category.orders || category.bookmarks
	? {
		title: phrase('category.removing.carried'),
		body: phrase('category.removing.carriedBody', { orders: plural(category.orders, 'order') })
	}
	: { title: phrase('category.removing.free'), body: phrase('category.removing.freeBody') })

function Removing({ category, merge, onDelete }) {
	const phrase = usePhrase()
	const { title, body } = removingWords(category)
	return (
		<Card footer={[
			<MergeButton key="merge" merge={merge}>{phrase('category.merge')}</MergeButton>,
			<Button key="delete" color="danger" onClick={onDelete}>{phrase('action.delete')}</Button>
		]} footerLayout="split" footerCommits>
			<CardHeader name={phrase('category.removing')} />
			<Well>
				<span className="sp-title">{title}</span>
				<span className="sp-subtitle">{body}</span>
			</Well>
		</Card>
	)
}
