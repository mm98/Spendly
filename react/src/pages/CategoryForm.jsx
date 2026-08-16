import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Card, CardBody } from '../components/Card.jsx'
import { SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { DeleteCard, FormPage, RecordWait, useDelete } from '../components/FormPage.jsx'
import { CategoryPreview, ColourPicker, IconPicker } from '../components/Pickers.jsx'
import { ICONS } from '../components/Icon.jsx'
import {
	Field, FieldShell, FieldUnit, FilterSection, Switch, TextInput, focusField, needFixing, useFieldErrors
} from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { useApi } from '../api/useApi.js'
import {
	createCategory, deleteCategory, failureMessage, getCategories, getCategory, invalidateCategoryData, updateCategory
} from '../api/client.js'
import { AMOUNT_PATTERN, amountRound, krRound, parseAmount } from '../api/format.js'
import { resolveColour } from '../api/colour.js'

/* A category, on its own page.

   Editing an order takes a page, so editing a category takes a page, and it is the same page
   component -- see components/FormPage.jsx. The inline version put a bordered section inside a
   card body inside a card, which at 390px leaves the fields about as wide as their own labels,
   and it rejected a name with a bespoke string comparison instead of the apparatus every other
   form in the app rejects with.

   Create and edit are one component, because they differ by which record they start from and
   by nothing else. A second one for the other is the near-miss the uniformity rule is about. */

const BLANK = { name: '', icon: 'tag', iconPath: undefined, colour: '#C43F2A', budget: '', favourite: false }

export default function CategoryForm({ mode = 'create' }) {
	const { id } = useParams()
	const existing = useApi(getCategory, [id], { enabled: mode === 'edit' })

	/* An edit cannot start until the record is here -- the fields below are hooks and may not
	   mount without it -- so the wait is stated on a page of its own. */
	if (mode === 'edit' && !existing.data) {
		return <RecordWait state={existing} label="Loading the category" />
	}
	return <CategoryFields mode={mode} category={existing.data ?? null} />
}

function CategoryFields({ mode, category }) {
	const navigate = useNavigate()
	const toast = useToast()
	const all = useApi(getCategories)
	const [values, setValues] = useState(BLANK)
	const [status, setStatus] = useState({ message: '', good: true })
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		if (!category) return
		setValues({
			name: category.name,
			icon: category.icon,
			iconPath: category.iconPath,
			colour: category.colour,
			budget: category.budget ? amountRound(category.budget) : '',
			favourite: Boolean(category.favourite)
		})
	}, [category])

	/* A name already in use is a fact about the field, so it is a field rule rather than a
	   toast carrying the API's 409 after the fact. The category being edited is excluded, or
	   saving a budget without touching the name would reject its own name. */
	const fields = useMemo(() => {
		const taken = (all.data ?? [])
			.filter(c => c.id !== category?.id)
			.map(c => c.name.toLowerCase())
		return [
			{ name: 'category-name', label: 'Name', check: v =>
				!v ? 'What is the category called?'
				: v.length > 40 ? '40 characters at most.'
				: taken.includes(v.toLowerCase()) ? `You already have a category called ${v}.` : '' },
			{ name: 'category-budget', label: 'Monthly budget', check: v =>
				!v || AMOUNT_PATTERN.test(v) ? '' : 'Amounts take a comma, such as 6.000 or 6.000,00.' }
		]
	}, [all.data, category?.id])

	/* One entry per icon a category already carries, first occurrence wins -- what the picker
	   suggests before a search is real choices another category made, not the app's own 39. */
	const usedIcons = useMemo(() => {
		const seen = new Map()
		for (const c of all.data ?? []) if (!seen.has(c.icon)) seen.set(c.icon, c.iconPath ?? null)
		return [...seen].map(([name, path]) => ({ name, path }))
	}, [all.data])

	const formValues = useMemo(() => ({
		'category-name': values.name, 'category-budget': values.budget
	}), [values])

	const { check, recheck, propsFor } = useFieldErrors(fields, formValues)
	const nameField = propsFor('category-name')
	const budgetField = propsFor('category-budget')

	const set = (key, name) => v => { setValues(prev => ({ ...prev, [key]: v })); recheck(name, v) }

	const budget = values.budget && AMOUNT_PATTERN.test(values.budget) ? parseAmount(values.budget) : 0

	const refresh = () => invalidateCategoryData()

	const save = () => {
		const failed = check()
		if (failed.length) {
			setStatus({ message: 'Cannot save: ' + needFixing(failed), good: false })
			focusField(failed[0].name)
			return
		}
		setStatus({ message: '', good: true })
		setSaving(true)
		/* The path travels with the name. A category may be any of Tabler's 5,129 outline icons,
		   and a record that stored only the name would make every list load the catalogue to
		   find out what to draw. `iconPath` is null for the app's own 39, which Icon.jsx knows
		   by name -- null rather than undefined, so saving an app glyph over a Tabler one really
		   clears it. */
		const patch = {
			name: values.name.trim(), icon: values.icon, iconPath: values.iconPath ?? null,
			colour: values.colour, budget, favourite: values.favourite
		}
		const written = mode === 'edit'
			? updateCategory(category.id, patch)
			: createCategory(patch.name, patch)
		written
			.then(saved => {
				refresh()
				toast(`${saved.name} ${mode === 'edit' ? 'saved' : 'added'}.`)
				navigate('/categories')
			})
			.catch(e => { setSaving(false); toast(failureMessage(e, 'That did not save. Try again.'), 'negative') })
	}

	const del = useDelete({
		what: 'category',
		detail: category ? `${category.name}, ${krRound(category.spend)} this month.` : '',
		onDelete: () => deleteCategory(category.id)
			.then(() => { refresh(); toast(`${category.name} removed.`); navigate('/categories') })
			/* A category on an order cannot go, or the order points at nothing. The API says so
			   with a 409 naming how many orders are in the way. */
			.catch(e => toast(failureMessage(e, 'That did not delete.'), 'negative'))
	})

	return (
		<FormPage
			title={mode === 'edit' ? 'Edit category' : 'New category'}
			lead="What it is called, what it looks like, and what it is allowed each month."
			status={status}
			cancel={{ to: '/categories' }}
			submit={{
				label: saving ? 'SAVING...' : mode === 'edit' ? 'SAVE CHANGES' : 'ADD CATEGORY',
				onClick: save, disabled: saving
			}}
			rail={
				<>
					<CategorySummary values={values} budget={budget} category={category} />
					{mode === 'edit' ? (
						<DeleteCard what="category" del={del}>
							Removing a category leaves its orders alone; a category still on an order
							cannot be removed at all.
						</DeleteCard>
					) : null}
				</>
			}>

			{/* A name holds a row by itself, like the vendor field on an order: it carries the
			    longest string on the form and a pair would give it half the room at exactly the
			    width where it has least. README: Fields and Forms. */}
			<Field label="Name" error={nameField.error} errorId={nameField.errorId}>
				<FieldShell>
					<TextInput id="category-name" value={values.name} autoFocus
						onChange={set('name', 'category-name')} aria-label="Category name"
						aria-required="true" placeholder="Transport"
						invalid={nameField.invalid} describedBy={nameField.describedBy}
						onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }} />
				</FieldShell>
			</Field>

			<Field label="Monthly budget" help="Leave it empty for no budget."
				error={budgetField.error} errorId={budgetField.errorId}>
				<FieldShell>
					<TextInput id="category-budget" inputMode="decimal" value={values.budget}
						onChange={set('budget', 'category-budget')} placeholder="6.000"
						aria-label="Monthly budget"
						invalid={budgetField.invalid} describedBy={budgetField.describedBy}
						onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }} />
					<FieldUnit>kr.</FieldUnit>
				</FieldShell>
			</Field>

			<Field label="Colour" group
				help="Eight from the palette, or any colour at all from the last swatch.">
				<ColourPicker value={values.colour} onChange={colour => setValues(v => ({ ...v, colour }))}
					label="Category colour" />
			</Field>

			<Field label="Icon" group help="Icons already used by a category, or search all 5,129.">
				<IconPicker value={values.icon} usedIcons={usedIcons}
					onChange={(icon, iconPath) => setValues(v => ({
						...v, icon, iconPath: ICONS[icon] ? undefined : iconPath
					}))}
					label="Category icon" />
			</Field>

			{/* Same control, same placement, as the vendor form's own favourite switch. README:
			    Fields and Forms. */}
			<FilterSection>
				<div className="space-between">
					<span className="field-help toggle-help">
						Favourites appear in Home's Favourite categories card.
					</span>
					<Switch checked={values.favourite}
						onChange={favourite => setValues(v => ({ ...v, favourite }))} label="Favourite" />
				</div>
			</FilterSection>
		</FormPage>
	)
}

/** The rail card that mirrors the form, in the shape the order summary already uses: the row
    as it will be drawn, then the values as key/value lines, then the figure at the foot. */
function CategorySummary({ values, budget, category }) {
	return (
		<Card aria-label="Category summary">
			<CardBody>
				<div className="card-subheading">Category summary</div>
				<span className="section-label">How it will look</span>
				<div className="category-rows summary-preview">
					<CategoryPreview icon={values.icon} iconPath={values.iconPath}
						colour={values.colour} name={values.name} />
				</div>
				<div className="summary-row">Name
					<span className="summary-row-value">{values.name || '-'}</span></div>
				<div className="summary-row">Colour
					<span className="summary-row-value">{resolveColour(values.colour).toUpperCase()}</span></div>
				<div className="summary-row">Icon
					<span className="summary-row-value">{values.icon}</span></div>
				<div className="summary-row">Favourite
					<span className="summary-row-value">{values.favourite ? 'Yes' : 'No'}</span></div>
				{category ? <SummaryRow label="Spent this month" value={krRound(category.spend)} /> : null}
				<div className="card-divider card-divider-tight" />
				{/* Rounded, because the row in the Manage list rounds it: two figures for one
				    budget, differing only in their decimals, read as two budgets. */}
				<SummaryTotal label="Monthly budget" value={budget ? krRound(budget) : 'None'}
					estimate={!category} />
				<span className="field-help">
					The tile is the colour you picked; the glyph on it is inked light or dark from that
					colour, so it stays readable whatever you choose.
				</span>
			</CardBody>
		</Card>
	)
}
