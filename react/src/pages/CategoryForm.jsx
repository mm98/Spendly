import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Card, Panel } from '../components/Card.jsx'
import { Field } from '../components/Field.jsx'
import { NumberField, TextField } from '../components/Inputs.jsx'
import { Picker } from '../components/Choice.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { ICONS } from '../components/icons.js'
import { ListItem } from '../components/ListItem.jsx'
import { Gauge, Stat, Sum } from '../components/Data.jsx'
import { Well } from '../components/Well.jsx'
import { Stacked } from '../components/Utilities.jsx'
import { useToast } from '../components/Overlays.jsx'
import { useApi } from '../api/useApi.js'
import {
	createCategory, deleteCategory, failureMessage, getCategories, getCategoriesThisMonth, getCategory,
	invalidateCategoryData, invalidateVendorData, updateCategory
} from '../api/client.js'
import { currency, plural } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import {
	CategoryMark, ConfirmDelete, DOT, Failed, FormLoading, RecentOrders, SWATCHES, categoryDeleteNote, focusFirst,
	monthPace, pickedColour, storedColour, swatchOf, useLeaveGuard
} from './vendorsCategories.jsx'

/* The icons the picker leads with (5e), then the rest of the register. */
const FIRST = ['flower', 'armchair', 'lamp', 'photo', 'star', 'home', 'shopping-bag', 'heart', 'diamond', 'clock', 'archive', 'tag', 'building-store']
const ICON_NAMES = [...FIRST, ...Object.keys(ICONS).filter(n => !FIRST.includes(n)).sort()]

// case and accents do not make two names different: "Decor" and "décor" chart as one
const fold = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()

/** A category, created (5e) or edited (5f): one page, one form, one rail. */
export default function CategoryForm() {
	const { id } = useParams()
	// once deleted, the record is not read again: the page is on its way out
	const [gone, setGone] = useState(false)
	const record = useApi(getCategory, [id], { enabled: Boolean(id) && !gone })
	// the last record stays in hand while the next one loads, so it has to be the one the address names
	if (id && record.data?.id !== id) {
		if (record.error) return (
			<div className="sp-stack sp-gap-12">
				<Failed title="This category could not be opened" error={record.error} onRetry={record.refresh}
					list={{ to: '/categories', label: 'Open Categories' }} />
			</div>
		)
		return <FormLoading />
	}
	return <CategoryFields key={id ?? 'new'} category={record.data ?? null} onGone={setGone} />
}

function CategoryFields({ category, onGone }) {
	const navigate = useNavigate()
	const toast = useToast()
	const touch = useShellShape() === 'touch'
	const all = useApi(getCategories)
	const editing = Boolean(category)
	const start = useMemo(() => ({
		name: category?.name ?? '',
		icon: category?.icon ?? 'tag',
		colour: category ? pickedColour(category.colour) : null,
		budget: category?.budget > 0 ? category.budget : null
	}), [category])
	const [values, setValues] = useState(start)
	const [errors, setErrors] = useState({})
	const [iconSearch, setIconSearch] = useState('')
	const [allIcons, setAllIcons] = useState(() => Boolean(ICONS[start.icon]) && !FIRST.includes(start.icon))
	const [deleting, setDeleting] = useState(false)
	const [busy, setBusy] = useState(false)
	const saving = useRef(false)
	const set = (key, value) => setValues(v => ({ ...v, [key]: value }))

	const others = (all.data ?? []).filter(c => c.id !== category?.id)
	// a new category starts on the first of the eight no other category has
	const used = new Set(others.map(c => swatchOf(c.colour)))
	const colour = values.colour ?? Object.keys(SWATCHES).find(s => !used.has(s)) ?? 'green'

	const changed = values.name.trim() !== start.name.trim() || values.icon !== start.icon
		|| values.colour !== start.colour || values.budget !== start.budget
	const guard = useLeaveGuard(changed)

	const nameProblem = name => {
		if (!name.trim()) return 'Give the category a name.'
		const taken = others.find(c => fold(c.name) === fold(name))
		return taken ? `You already have a category called ${taken.name}.` : null
	}
	const budgetProblem = budget => (budget === 0 ? 'Use an amount above zero, or leave it empty for no limit.' : null)

	const save = () => {
		if (saving.current) return
		const found = { name: nameProblem(values.name), budget: budgetProblem(values.budget) }
		setErrors(found)
		if (found.name || found.budget) return focusFirst([found.name && 'category-name', found.budget && 'category-limit'])
		saving.current = true
		const name = values.name.trim()
		const look = {
			name, icon: values.icon, colour: storedColour(colour), budget: values.budget ?? 0,
			...(values.icon !== start.icon ? { iconPath: null } : {})
		}
		const written = editing ? updateCategory(category.id, look) : createCategory(name, look)
		written
			.then(() => {
				invalidateCategoryData()
				guard.release()
				navigate('/categories')
			})
			.catch(e => {
				saving.current = false
				const message = failureMessage(e, 'The category was not saved. Check the connection and try again.')
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
			.then(() => {
				invalidateCategoryData()
				invalidateVendorData()
				guard.release()
				navigate('/categories')
			})
			.catch(e => {
				setBusy(false)
				onGone(false)
				toast({ message: failureMessage(e, 'The category was not deleted. Try again.'), color: 'danger' })
			})
	}

	const needle = iconSearch.trim().toLowerCase()
	const matches = needle ? ICON_NAMES.filter(n => n.replace(/-/g, ' ').includes(needle)) : ICON_NAMES
	const shown = needle || allIcons ? matches : matches.slice(0, FIRST.length)
	const hidden = matches.length - shown.length
	const preview = { name: values.name.trim() || 'New category', icon: values.icon, colour: storedColour(colour) }

	const cards = (
		<>
			<Card>
				<span className="sp-section-label">The category</span>
				<Field id="category-name" label="Name"
					message={errors.name ?? (editing ? undefined : 'Appears on chips, facets and charts, so short wins - "Decor", not "Home decoration items".')}
					messageType={errors.name ? 'danger' : 'hint'}>
					<TextField value={values.name} onChange={v => set('name', v)}
						onBlur={() => setErrors(e => ({ ...e, name: nameProblem(values.name) }))}
						placeholder={editing ? undefined : 'What you spent it on'} />
				</Field>
			</Card>

			<Card>
				<span className="sp-section-label">Mark</span>
				<div className="sp-stack sp-gap-12">
					<Field label="Icon">
						<Picker icons={shown.map(name => ({ name, icon: <Icon name={name} /> }))}
							value={values.icon} onChange={v => set('icon', v)}
							search={iconSearch} onSearch={setIconSearch} searchLabel="Search icons…"
							more={hidden ? `+${hidden}` : undefined} onMore={() => setAllIcons(true)} />
					</Field>
					<Field label="Colour" message="Pick one of the eight, or choose your own in the last box.">
						<Picker swatches={Object.keys(SWATCHES)} custom customIcon={<Icon name="plus" />}
							value={colour} onChange={v => set('colour', v)} />
					</Field>
				</div>
			</Card>

			<Card>
				<span className="sp-section-label">Monthly limit</span>
				{/* the field's own blur formats the amount, so the check listens from around it */}
				<div onBlur={() => setErrors(e => ({ ...e, budget: budgetProblem(values.budget) }))}>
					<Field id="category-limit" label="Limit"
						message={errors.budget ?? (editing ? 'One amount for every month. Statistics reads this.' : 'One amount that applies to every month. Leave empty for no limit.')}
						messageType={errors.budget ? 'danger' : 'hint'}>
						{/* money is written the Danish way everywhere it is shown (api/format.js), so it is typed that way too */}
						<NumberField value={values.budget} onChange={n => set('budget', n)} min={0} locale="da-DK" placeholder="no limit" />
					</Field>
				</div>
			</Card>
		</>
	)

	const saveBar = !editing || changed
		? (
			<ListItem variant="sticky">
				{editing ? <span className="sp-data sp-grow">Unsaved changes</span> : <span className="sp-data sp-ink-5 sp-grow">Nothing saved yet</span>}
				<Button variant="outline" onClick={() => navigate('/categories')}>Cancel</Button>
				<Button onClick={save}>{editing ? 'Save category' : 'Create'}</Button>
			</ListItem>
		)
		: null

	const rail = editing
		? (
			<>
				<CategorySummary category={category} preview={preview} budget={values.budget} />
				<RecentOrders filter={{ categoryId: category.id }} to={`/orders?category=${category.id}`} total={category.orders} />
				<Removing category={category} onDelete={() => setDeleting(true)} />
			</>
		)
		: (
			<Card>
				<span className="sp-section-label">Category summary</span>
				<div className="sp-row-flex sp-gap-12">
					<CategoryMark category={preview} />
					<Stacked>
						<span className="sp-title sp-truncate">{preview.name}</span>
					</Stacked>
				</div>
				<div className="sp-stack">
					<Sum value={values.name.trim() || '-'}><span className="sp-ink-2">Name</span></Sum>
					<Sum value={values.budget ? currency(values.budget, 0) : 'none'}><span className="sp-ink-2">Monthly limit</span></Sum>
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
					<ConfirmDelete title={`Delete ${category.name}?`} action="Delete category" busy={busy}
						onConfirm={remove} onCancel={() => setDeleting(false)}>
						{categoryDeleteNote(category.budget)}
					</ConfirmDelete>
				)
				: null}
		</>
	)
}

/** This month against the limit, and what the category has carried (5f). The limit is the
    form's own value, so the bar answers the number being typed. */
function CategorySummary({ category, preview, budget }) {
	const month = useApi(getCategoriesThisMonth)
	const spend = month.data?.categories.find(c => c.id === category.id)?.monthSpend
	const pace = monthPace()
	const limit = budget > 0 ? budget : null
	const over = limit !== null && spend > limit
	return (
		<Card>
			<span className="sp-section-label">Category summary</span>
			<div className="sp-row-flex sp-gap-12">
				<CategoryMark category={preview} />
				<Stacked>
					<span className="sp-title sp-truncate">{preview.name}</span>
					<span className="sp-meta">
						{plural(category.orders, 'order')}{spend === undefined ? null : <>{DOT}{currency(spend, 0)} this month</>}
					</span>
				</Stacked>
			</div>
			{spend === undefined
				? null
				: (
					<>
						<div className="sp-row-flex sp-gap-12 sp-baseline">
							<Stat large figure={over ? <span className="sp-ink-warning">{currency(spend, 0)}</span> : currency(spend, 0)} />
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
				<Sum value={category.orders}><span className="sp-ink-2">Orders</span></Sum>
			</div>
			<Button variant="outline" size="small" to="/statistics">See more in statistics</Button>
		</Card>
	)
}

/** The way out (5f): delete, offered only when nothing carries the category. */
function Removing({ category, onDelete }) {
	const free = category.orders === 0 && category.bookmarks === 0
	const carried = [
		category.orders ? plural(category.orders, 'order') : null,
		category.bookmarks ? plural(category.bookmarks, 'bookmark') : null
	].filter(Boolean).join(' and ')
	return (
		<Card {...(free ? { footer: [<Button key="delete" color="danger" onClick={onDelete}>Delete</Button>], footerCommits: true } : {})}>
			<span className="sp-section-label">Removing it</span>
			{free
				? (
					<Well>
						<span className="sp-title">Nothing carries this category</span>
						<span className="sp-subtitle">Deleting removes it outright.</span>
					</Well>
				)
				: (
					<Well>
						<span className="sp-title">A category in use cannot be deleted</span>
						<span className="sp-subtitle">It is on {carried}. To keep the grouping under a different name, rename it instead.</span>
					</Well>
				)}
		</Card>
	)
}
