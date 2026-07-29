import { useMemo, useState } from 'react'
import { Page, useView } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, Note, QuestionCard } from '../components/Card.jsx'
import { CategoryRow } from '../components/Rows.jsx'
import { Donut, Meter } from '../components/Viz.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import {
	Field, FieldShell, FieldUnit, FormActions, FormStatus, Segmented, TextInput
} from '../components/Form.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import {
	createCategory, deleteCategory, getCategories, getCategoriesOverview, getAnswer, updateCategory
} from '../api/client.js'
import { AMOUNT_PATTERN, krRound, parseAmount, percent } from '../api/format.js'

/* Categories.

   The Manage sub-tab hides what is marked [data-view-only="overview"] -- the ring and the
   question -- and what is left is the thing you manage. In the prototype that was the only
   difference: the same read-only list, with two cards taken away. Here Manage is where a
   category is renamed, given a budget or removed, so the tab does something in both
   positions, which is the bar every tab in this app has to clear. README 13.

   Deleting a category that is on an order is refused by the API rather than allowed to
   orphan the order, and the message names how many orders are in the way. */

const SORTS = { Spend: (a, b) => b.spend - a.spend, Name: (a, b) => a.name.localeCompare(b.name),
	Orders: (a, b) => b.share - a.share }

export default function Categories() {
	const state = useApi(getCategoriesOverview)
	const answer = useApi(getAnswer)
	const [query, setQuery] = useState('')
	const [sort, setSort] = useState('Spend')
	const [status, setStatus] = useState({ message: '', good: true })
	const [adding, setAdding] = useState(false)
	const [name, setName] = useState('')
	const [editing, setEditing] = useState(null)
	const [answering, setAnswering] = useState(false)
	const { view } = useView()

	const refresh = () => { invalidate(getCategories); invalidate(getCategoriesOverview); state.refresh() }

	const add = () => {
		if (!name.trim()) { setStatus({ message: 'A category needs a name.', good: false }); return }
		createCategory(name)
			.then(category => {
				refresh(); setName(''); setAdding(false)
				setStatus({ message: `${category.name} added.`, good: true })
			})
			.catch(e => setStatus({ message: e.message, good: false }))
	}

	const save = patch => {
		updateCategory(editing.id, patch)
			.then(category => {
				refresh(); setEditing(null)
				setStatus({ message: `${category.name} saved.`, good: true })
			})
			.catch(e => setStatus({ message: e.message, good: false }))
	}

	const remove = category => {
		deleteCategory(category.id)
			.then(() => { refresh(); setStatus({ message: `${category.name} removed.`, good: true }) })
			.catch(e => setStatus({ message: e.message, good: false }))
	}

	return (
		<Page>
			<div className="row-inline toolbar">
				<FieldShell>
					<Icon name="search" />
					<input type="search" value={query} placeholder="Search category name…"
						aria-label="Search categories" onChange={e => setQuery(e.target.value)} />
				</FieldShell>
				<Segmented options={Object.keys(SORTS)} value={sort} onChange={setSort}
					label="Sort categories" tablist={false} />
			</div>

			<FormStatus message={status.message} good={status.good} />

			<Async state={state} label="Loading your categories">{data => (
				<CategoriesBody data={data} query={query} sort={sort} manage={view === 'manage'}
					adding={adding} setAdding={setAdding} name={name} setName={setName} add={add}
					editing={editing} setEditing={setEditing} save={save} remove={remove}
					answer={answer.data} answering={answering} setAnswering={setAnswering} />
			)}</Async>
		</Page>
	)
}

/** The Manage row: rename, set a budget, delete. It replaces the read-only row in place, so
    the list does not jump when a row goes into edit. */
function EditRow({ category, onSave, onCancel }) {
	const [name, setName] = useState(category.name)
	const [budget, setBudget] = useState(category.budget ? String(category.budget) : '')
	const [error, setError] = useState('')

	const submit = () => {
		if (!name.trim()) { setError('A category needs a name.'); return }
		if (budget && !AMOUNT_PATTERN.test(budget)) {
			setError('Amounts take a comma, such as 6.000 or 6.000,00.')
			return
		}
		setError('')
		onSave({ name: name.trim(), budget: budget ? parseAmount(budget) : 0 })
	}

	return (
		<div className="filter-section" style={{ marginBottom: 8 }}>
			<Field label="Name" error={error} errorId={`category-${category.id}-error`}>
				<FieldShell>
					<TextInput id={`category-${category.id}`} value={name} onChange={setName}
						aria-label="Category name" invalid={Boolean(error)}
						describedBy={`category-${category.id}-error`} autoFocus
						onKeyDown={e => {
							if (e.key === 'Enter') { e.preventDefault(); submit() }
							else if (e.key === 'Escape') onCancel()
						}} />
				</FieldShell>
			</Field>
			<Field label="Monthly budget" help="Leave it empty for no budget.">
				<FieldShell>
					<TextInput inputMode="decimal" value={budget} onChange={setBudget}
						placeholder="6.000" aria-label="Monthly budget"
						onKeyDown={e => {
							if (e.key === 'Enter') { e.preventDefault(); submit() }
							else if (e.key === 'Escape') onCancel()
						}} />
					<FieldUnit>kr.</FieldUnit>
				</FieldShell>
			</Field>
			<FormActions>
				<Button variant="caps compact" icon="check" onClick={submit}>SAVE</Button>
				<Button variant="ghost compact" onClick={onCancel}>CANCEL</Button>
			</FormActions>
		</div>
	)
}

function CategoriesBody({ data, query, sort, manage, adding, setAdding, name, setName, add,
	editing, setEditing, save, remove, answer, answering, setAnswering }) {
	const listed = useMemo(() => {
		const needle = query.trim().toLowerCase()
		return data.categories
			.filter(c => !needle || c.name.toLowerCase().includes(needle))
			.sort(SORTS[sort])
	}, [data.categories, query, sort])

	const spent = data.categories.reduce((sum, c) => sum + c.spend, 0)

	/* Manage drops the rail rather than hiding it. `[data-view-only]` is the stylesheet's own
	   mechanism and it is the right one for content inside a column -- but this rail *is* a
	   column, and `.two-column` is a grid: hiding the child leaves the track it sat in, so the
	   list stayed at half width with nothing beside it. A column that is not there is not
	   rendered. */
	return (
		<div className={manage ? 'page-grid' : 'two-column'}>
			<Card aria-label="Categories">
				<CardHeader title={manage ? 'Manage categories' : 'Categories'}>
					<Button variant="pill" icon="plus" onClick={() => setAdding(true)}>ADD</Button>
				</CardHeader>
				<CardDivider />
				<CardBody>
					{adding ? (
						<div className="filter-section" style={{ marginBottom: 12 }}>
							<Field label="New category">
								<FieldShell>
									<TextInput id="new-category" value={name} onChange={setName}
										placeholder="Transport" aria-label="New category name" autoFocus
										onKeyDown={e => {
											if (e.key === 'Enter') { e.preventDefault(); add() }
											else if (e.key === 'Escape') { setAdding(false); setName('') }
										}} />
								</FieldShell>
							</Field>
							<FormActions>
								<Button variant="caps compact" onClick={add}>ADD CATEGORY</Button>
								<Button variant="ghost compact"
									onClick={() => { setAdding(false); setName('') }}>CANCEL</Button>
							</FormActions>
						</div>
					) : null}

					<div className="category-rows">
						{listed.map(category => (
							editing?.id === category.id ? (
								<EditRow key={category.id} category={category}
									onSave={save} onCancel={() => setEditing(null)} />
							) : (
								<div key={category.id}>
									<div className="row-inline" style={{ gap: 4 }}>
										<div style={{ flex: 1, minWidth: 0 }}>
											<CategoryRow category={category}
												to={manage ? undefined : `/orders/all?category=${category.id}`}
												meta={manage && category.budget
													? `${krRound(category.spend)} of ${krRound(category.budget)}`
													: undefined} />
										</div>
										{manage ? (
											<>
												<IconButton icon="pencil" label={`Edit ${category.name}`}
													onClick={() => setEditing(category)} />
												<IconButton icon="trash" label={`Delete ${category.name}`}
													onClick={() => remove(category)} />
											</>
										) : null}
									</div>
									{manage && category.budget ? (
										<Meter fill={Math.min(100, (category.spend / category.budget) * 100)}
											style={{ margin: '0 12px 8px' }}
											ariaLabel={`${category.name}: ${krRound(category.spend)} of ${krRound(category.budget)}`} />
									) : null}
								</div>
							)
						))}
					</div>
					{listed.length === 0
						? <p className="field-help">{query ? `No category matches "${query}".` : 'No categories yet.'}</p>
						: null}
					{manage ? null : <Button variant="block" to="/orders/all">VIEW ALL</Button>}
				</CardBody>
			</Card>

			{manage ? null : (
			<div className="page-grid">
				<QuestionCard label="Question of the day" title={answer?.short ?? data.question.short}>
					{answering && answer ? (
						<>
							<Note tone="positive" title={answer.answer}>{answer.detail}</Note>
							<Button variant="ghost" iconAfter="chevronRight"
								to={`/orders/all?category=${answer.categoryId}&from=2026-06-01&to=2026-06-30`}>
								SEE THOSE ORDERS</Button>
						</>
					) : (
						<Button variant="ghost" aria-expanded={answering} disabled={!answer}
							onClick={() => setAnswering(true)}>SEE THE ANSWER</Button>
					)}
				</QuestionCard>

				<Card aria-label="Breakdown">
					<CardHeader title={`Breakdown · ${data.question.periodLabel ?? 'July'}`} />
					<CardDivider />
					<CardBody className="donut-box">
						<Donut segments={data.categories.map(c => ({ share: c.share, colour: c.colour }))}
							value={krRound(spent)} label="Spent this month"
							ariaLabel={`Category split of ${krRound(spent)}`} />
					</CardBody>
				</Card>

				<Card aria-label="Budget">
					<CardHeader title="Against budget" />
					<CardDivider />
					<CardBody>
						{data.categories.some(c => c.budget > 0) ? (
							<>
								<div className="figure-card tabular-figures">
									{percent(budgetUsed(data.categories), 0)}</div>
								<span className="card-caption">of this month's budget used</span>
								<Meter style={{ marginTop: 14 }}
									fill={Math.min(100, budgetUsed(data.categories))}
									ariaLabel={`${percent(budgetUsed(data.categories), 0)} of budget used`} />
								<span className="field-help" style={{ marginTop: 8, display: 'block' }}>
									Budgets are set per category, on the Manage tab.
								</span>
							</>
						) : (
							<p className="field-help">
								No budgets set yet. The Manage tab gives a category a monthly allowance.</p>
						)}
					</CardBody>
				</Card>
			</div>
			)}
		</div>
	)
}

const budgetUsed = categories => {
	const budgeted = categories.filter(c => c.budget > 0)
	const allowed = budgeted.reduce((sum, c) => sum + c.budget, 0)
	return allowed ? (budgeted.reduce((sum, c) => sum + c.spend, 0) / allowed) * 100 : 0
}
