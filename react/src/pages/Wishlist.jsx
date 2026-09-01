import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { SkeletonCard, SkeletonRows } from '../components/Skeleton.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { InsetPanel, ItemRow } from '../components/Rows.jsx'
import { Button, ButtonLink, IconButton } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { ConfirmDialog } from '../components/ConfirmDialog.jsx'
import { Icon } from '../components/Icon.jsx'
import { LinePhoto, useDroppedPhoto } from '../components/LinePhoto.jsx'
import { FilterChips, ListToolbar } from '../components/ListToolbar.jsx'
import { Pager } from '../components/Pager.jsx'
import { useRowDelete } from '../components/FormPage.jsx'
import { Sep } from '../components/Sep.jsx'
import { useToast } from '../components/Toast.jsx'
import {
	DateInput, Field, FieldPair, FieldShell, FieldUnit, FilterSection, FormActions, Segmented,
	TextInput, focusField, useFieldErrors
} from '../components/Form.jsx'
import { useApi } from '../api/useApi.js'
import { WISH_FIELDS, httpUrl, siteOf } from '../api/rules.js'
import {
	addWishPhoto, createWish, deleteWish, failureMessage, getCategories, getSettings, getWishes,
	removeWishPhoto, setWishArchived, updateWish, wishPhotoFileUrl, wishPhotoThumbnailUrl,
	wishSorts
} from '../api/client.js'
import {
	amount, currency, currencySymbol, dayMonth, longDate, percent, plural, sanitizeAmount, sep
} from '../api/format.js'

/* The wishlist: things the account wants and has not bought.

   It is not an order in a "wanted" status, and that is the whole reason it is its own section.
   Every total, chart and budget in this app reads the orders table on one assumption -- that a
   row there is money that has already left -- so a wish counted anywhere among them would
   quietly overstate a month. Nothing on this page reaches any of those figures.

   Two patterns already in the app meet here, and neither is rewritten:

   - It is a working list, so it opens the way All orders does -- one search field, one sort,
     one FILTERS panel, chips naming what is on, and a real pager cut to the account's own
     rows-per-page setting. The toolbar and the chips are the shared ones
     (components/ListToolbar.jsx); the filters and the sorts are this list's.
   - A wish is edited the way a line on an order is: the row opens into a card, in place, with
     the picture on the left and the fields on the right (components/ItemLines.jsx made that
     shape, components/LinePhoto.jsx is the half the two share).

   What differs from the item card is when it saves. An order's lines are a draft until the
   order is saved, so that card commits into an array; a wish is a record of its own, so this
   one commits to the server -- which is why there is a saving state here and none there. */

const BLANK = { 'wish-name': '', 'wish-url': '', 'wish-price': '' }

const formOf = wish => ({
	'wish-name': wish.name,
	'wish-url': wish.url,
	'wish-price': wish.price != null ? amount(wish.price) : ''
})

const same = (a, b) => WISH_FIELDS.every(f => (a[f.name] ?? '') === (b[f.name] ?? ''))
const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])

/** What a wish's picture is right now: the one picked in this card, or the one on the server. */
const photoOf = (wish, picked, cleared) => {
	if (picked) return { present: true, src: picked.url }
	if (cleared || !wish?.photoId) return {}
	return { present: true, src: wishPhotoThumbnailUrl(wish.id, wish.photoId) }
}

/* Archived is a filter with three answers rather than a tab, and "no" is the one it takes when
   nobody asks: a wishlist is what you still want, so a list that opened with the things you
   had already put away would have to be narrowed before it could be read. The labels are what
   a reader sees; the values are what the URL and the API carry. */
const SHOWN = [
	{ value: 'no', label: 'On the list' },
	{ value: 'yes', label: 'Archived' },
	{ value: 'all', label: 'All' }
]
const shownLabel = value => SHOWN.find(s => s.value === value)?.label ?? SHOWN[0].label

const EMPTY = { categoryId: '', categoryName: '', from: '', to: '', archived: 'no' }

/* The filters live in the query string, not in component state -- the same rule All orders
   follows, and for the same reasons: a filtered list is then a URL that can be sent, the Back
   button walks the filters, and a link arriving from elsewhere cannot disagree with the chips
   above the list. */
const filtersFromParams = params => ({
	...EMPTY,
	categoryId: params.get('category') ?? '',
	from: params.get('from') ?? '',
	to: params.get('to') ?? '',
	archived: SHOWN.some(s => s.value === params.get('archived')) ? params.get('archived') : 'no'
})

const paramsFromFilters = (filters, query, sort, page) => {
	const out = {}
	if (query) out.q = query
	if (filters.categoryId) out.category = filters.categoryId
	if (filters.from) out.from = filters.from
	if (filters.to) out.to = filters.to
	if (filters.archived !== 'no') out.archived = filters.archived
	if (sort) out.sort = sort
	if (page > 1) out.page = String(page)
	return out
}

const nameOf = (list, id) => list?.find(x => x.id === id)?.name ?? id
const categoryNameOf = (list, id) => id === 'none' ? 'Without category' : nameOf(list, id)

export default function Wishlist() {
	const [params, setParams] = useSearchParams()
	const filters = useMemo(() => filtersFromParams(params), [params])
	const query = params.get('q') ?? ''
	const page = Number(params.get('page') ?? 1)
	const activeSort = wishSorts.find(s => s.id === params.get('sort'))?.id ?? 'added-desc'

	const [draft, setDraft] = useState(filters)
	const [panelOpen, setPanelOpen] = useState(false)
	const toast = useToast()
	const searchField = useRef(null)

	const categories = useApi(getCategories)
	const settings = useApi(getSettings)
	const pageSize = settings.data?.pageSize ?? 10

	/* The panel's own copy follows the URL, so a link arriving with a filter on it opens the
	   panel showing that filter rather than the last thing typed into it. The category needs
	   translating on the way in -- the URL carries an id and the combobox shows a name -- and
	   the names land after the first render, so this re-runs when they do. */
	useEffect(() => setDraft({
		...filters,
		categoryName: categoryNameOf(categories.data, filters.categoryId)
	}), [filters, categories.data])

	/* Writing a filter is writing the URL. Anything but the page resets to page one: staying on
	   page 4 of a result set that now has two is how a filter reports "no wishes" it matched. */
	const write = (next, nextQuery = query, nextSort = params.get('sort'), nextPage = 1) =>
		setParams(paramsFromFilters(next, nextQuery, nextSort, nextPage), { replace: true })
	const setQuery = q => write(filters, q, params.get('sort'), 1)
	const setPage = p => write(filters, query, params.get('sort'), p)
	const refilter = next => write(next, query, params.get('sort'), 1)
	const clearAll = () => write(EMPTY, '', params.get('sort'), 1)

	const request = useMemo(() => ({
		query,
		categoryId: filters.categoryId,
		from: filters.from,
		to: filters.to,
		archived: filters.archived,
		sort: activeSort,
		page,
		pageSize
	}), [query, filters, activeSort, page, pageSize])

	const state = useApi(getWishes, [request])

	const [openId, setOpenId] = useState(null)      // a wish id, 'new', or null
	const [form, setForm] = useState(BLANK)
	const [chosen, setChosen] = useState([])        // category names on the open card
	const [baseline, setBaseline] = useState({ form: BLANK, categories: [] })
	const [picked, setPicked] = useState(null)      // { file, url } chosen in this card
	const [cleared, setCleared] = useState(false)   // the card's photo was removed
	const [leaving, setLeaving] = useState(null)    // where a discard question is headed
	const [saving, setSaving] = useState(false)
	const [savedId, setSavedId] = useState(null)
	const cardRef = useRef(null)

	const errors = useFieldErrors(WISH_FIELDS, form)
	const set = name => v => { setForm(f => ({ ...f, [name]: v })); errors.recheck(name, v) }

	const wishes = state.data?.wishes ?? []
	const openWish = openId === 'new' ? null : wishes.find(w => w.id === openId)
	const dirty = !same(form, baseline.form) || !sameList(chosen, baseline.categories)
		|| Boolean(picked) || cleared

	/* Only if part of the card is off screen, and by the least that fixes it -- the same
	   `nearest` the item card uses, for the same reason: opening a row in the middle of a list
	   should not move the list. */
	useEffect(() => {
		if (openId === null) return
		cardRef.current?.scrollIntoView({ block: 'nearest' })
	}, [openId])

	/* The preview belongs to the card and is revoked with it -- once saved, the row draws the
	   thumbnail the server made, never this object URL. */
	useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.url) }, [picked])

	useEffect(() => {
		if (savedId === null) return
		const t = setTimeout(() => setSavedId(null), 2000)
		return () => clearTimeout(t)
	}, [savedId])

	const seed = target => {
		setPicked(null)
		setCleared(false)
		errors.clear()
		if (target === null) {
			setOpenId(null); setForm(BLANK); setChosen([]); setBaseline({ form: BLANK, categories: [] })
			return
		}
		const wish = target === 'new' ? null : wishes.find(w => w.id === target)
		const next = wish ? formOf(wish) : BLANK
		const cats = wish ? wish.categories : []
		setForm(next)
		setChosen(cats)
		setBaseline({ form: next, categories: cats })
		setOpenId(target)
		focusField('wish-name')
	}

	/** Save the open card. One write for the wish, then at most one for the picture -- the
	    photo travels against a real id, so a brand-new wish has to exist before its own picture
	    can be attached to it (the order NewOrder.jsx uploads an item's photo in). */
	const commit = async () => {
		const failed = errors.check()
		if (failed.length) { focusField(failed[0].name); return false }
		const wish = {
			name: form['wish-name'].trim(),
			url: form['wish-url'].trim(),
			price: form['wish-price'].trim(),
			categories: chosen
		}
		setSaving(true)
		try {
			const saved = openId === 'new' ? await createWish(wish) : await updateWish(openId, wish)
			if (picked) await addWishPhoto(saved.id, picked.file)
			else if (cleared) await removeWishPhoto(saved.id)
			toast(`${saved.name} ${openId === 'new' ? 'added' : 'saved'}.`)
			setSavedId(saved.id)
			seed(null)
			state.refresh()
			return true
		} catch (e) {
			toast(failureMessage(e, 'That did not save.'), 'negative')
			return false
		} finally {
			setSaving(false)
		}
	}

	/** Ask for the card the reader is heading to -- the item card's rule, in the same words: a
	    card with nothing typed into it just closes, one that is dirty and invalid is worth a
	    question, and one that is dirty and valid is not lost to a click on the row below. */
	const go = target => {
		if (openId === target || saving) return
		if (openId === null || !dirty) { seed(target); return }
		if (errors.check().length) { setLeaving({ target }); return }
		commit().then(saved => { if (saved && target !== null) seed(target) })
	}

	const remove = async wish => {
		try {
			await deleteWish(wish.id)
			if (openId === wish.id) seed(null)
			toast(`${wish.name} removed.`)
			state.refresh()
		} catch (e) {
			toast(failureMessage(e, 'That did not delete.'), 'negative')
		}
	}

	const archive = async (wish, next) => {
		try {
			await setWishArchived(wish.id, next)
			if (openId === wish.id) seed(null)
			/* What the reader sees happen: with the default filter on, archiving takes the row
			   off the list -- so the message says where it went rather than only that it saved. */
			toast(next ? `${wish.name} archived.` : `${wish.name} is back on your wishlist.`)
			state.refresh()
		} catch (e) {
			toast(failureMessage(e, 'That did not save.'), 'negative')
		}
	}

	const wishDel = useRowDelete({
		what: 'wish',
		label: wish => `Delete ${wish.name}`,
		detail: wish => `${wish.name}, from ${siteOf(wish.url)}.`,
		onDelete: remove
	})

	/* One chip per filter that is actually on, derived rather than listed -- what keeps the row
	   and the query from disagreeing. */
	const chips = useMemo(() => {
		const out = []
		if (filters.from || filters.to) out.push({ key: 'dates',
			label: [filters.from && dayMonth(filters.from), filters.to && dayMonth(filters.to)].filter(Boolean).join(' - '),
			clear: { from: '', to: '' } })
		if (filters.categoryId) out.push({ key: 'category',
			label: 'Category: ' + categoryNameOf(categories.data, filters.categoryId),
			clear: { categoryId: '', categoryName: '' } })
		if (filters.archived !== 'no') out.push({ key: 'archived',
			label: 'Showing: ' + shownLabel(filters.archived), clear: { archived: 'no' } })
		return out
	}, [filters, categories.data])

	/* Sorted by price with nothing filtered: the list can be empty because no wish has a price
	   yet, and then the action that fixes it is the sort, not a CLEAR ALL with nothing to
	   clear. The narrowing lives on the server so the count and the page agree about it. */
	const narrowingSort = activeSort.startsWith('price-')

	const card = (
		<WishCard ref={cardRef}
			isNew={openId === 'new'} form={form} set={set} errors={errors} dirty={dirty} saving={saving}
			photo={photoOf(openWish, picked, cleared)}
			name={form['wish-name'].trim() || 'Untitled wish'}
			categories={chosen} onCategoriesChange={setChosen}
			allCategories={categories.data ?? []}
			onPick={file => { setPicked({ file, url: URL.createObjectURL(file) }); setCleared(false) }}
			onClearPhoto={() => { setPicked(null); setCleared(true) }}
			onSave={() => commit()}
			onCancel={() => (dirty ? setLeaving({ target: null }) : seed(null))}
			deleteButton={openWish
				? wishDel.button(openWish,
					<span className="line-delete-label">DELETE WISH</span>,
					`Delete wish, ${openWish.name}`)
				: null} />
	)

	return (
		<Page variant="page-grid">
			<Card aria-label="Search and filters">
				<CardBody variant="card-body-filters">
					<ListToolbar query={query} onQuery={setQuery} searchRef={searchField}
						placeholder="Search wish, shop or category..." label="Search wishes"
						sortLabel="Sort wishes" sorts={wishSorts}
						sortValue={wishSorts.find(s => s.id === activeSort)?.label ?? ''}
						onSort={id => write(filters, query, id, 1)}
						filters={{ open: panelOpen, panelId: 'filter-panel',
							onToggle: () => setPanelOpen(open => !open) }} />

					<FilterChips chips={chips} focusRef={searchField}
						onRemove={chip => refilter({ ...filters, ...chip.clear })}
						onClearAll={clearAll} />

					<FilterSection id="filter-panel" hidden={!panelOpen}>
						<Field label="Category" htmlFor="filter-category">
							<Combobox id="filter-category" label="Category" placeholder="Any category"
								value={draft.categoryName ?? ''}
								onChange={v => setDraft({ ...draft, categoryName: v, categoryId: '' })}
								onSelect={o => setDraft({ ...draft, categoryName: o.label, categoryId: o.id })}
								groups={[{ heading: 'All categories', options: (categories.data ?? []).map(c =>
									({ id: c.id, label: c.name, meta: `${percent(c.share)} of expenses` })) },
									{ heading: 'Other', options: [{ id: 'none', label: 'Without category' }] }]} />
						</Field>
						{/* When it was added, which is the only date a wish has -- it is not dated by
						    the reader the way an order is, so From/To are about the day it was written
						    down. */}
						<FieldPair variant="field-pair-keep">
							<Field label="Added from" htmlFor="filter-from">
								<DateInput id="filter-from" label="Added from date" value={draft.from}
									onChange={v => setDraft({ ...draft, from: v })} />
							</Field>
							<Field label="Added to" htmlFor="filter-to">
								<DateInput id="filter-to" label="Added to date" value={draft.to}
									onChange={v => setDraft({ ...draft, to: v })} />
							</Field>
						</FieldPair>
						<Field label="Show" group>
							<Segmented options={SHOWN.map(s => s.label)} value={shownLabel(draft.archived)}
								onChange={label => setDraft({
									...draft, archived: SHOWN.find(s => s.label === label).value })}
								label="Show" />
						</Field>
						<div className="form-actions">
							<Button variant="caps compact" onClick={() => refilter(draft)}>APPLY FILTERS</Button>
							<Button variant="ghost compact" onClick={clearAll}>CLEAR</Button>
						</div>
					</FilterSection>
				</CardBody>
			</Card>

			<Async state={state} label="Loading your wishlist"
				skeleton={<SkeletonCard bodyVariant="card-body-tight"><SkeletonRows count={6} /></SkeletonCard>}>
				{data => (
					<Card aria-label="Wishes">
						<CardHeader title={`Wishes${sep}${plural(data.matched, 'match', 'matches')}`}>
							<span className="field-help">filtered from {data.total}</span>
							<Button variant="pill" icon="plus" onClick={() => go('new')}>ADD</Button>
						</CardHeader>
						<CardDivider />
						<CardBody>
							{/* The new card opens at the head of the list rather than at its foot: the
							    list is paged and sorted, so "the end" is the end of this page, which is
							    not where a wish being added belongs. */}
							{openId === 'new' ? <InsetPanel>{card}</InsetPanel> : null}

							{data.wishes.length ? (
								<InsetPanel>
									{data.wishes.map(wish => {
										if (openId === wish.id) return <Fragment key={wish.id}>{card}</Fragment>
										const photo = photoOf(wish)
										const href = httpUrl(wish.url)
										return (
											<ItemRow key={wish.id} className="item-row-group"
												icon={photo.present ? undefined : 'cube'}
												thumb={photo.present ? 'photo' : undefined} thumbSrc={photo.src}
												thumbHref={photo.present ? wishPhotoFileUrl(wish.id, wish.photoId) : undefined}
												thumbLabel={`Open the picture of ${wish.name} in a new tab`}
												title={wish.name}
												/* Where it is sold, when it was written down, whether it is put
												   away, and what it would land under -- the row's own meta line
												   rather than chips: a chip is something you can take away
												   (components/Chip.jsx), and nothing on a row here removes a
												   category. */
												meta={[siteOf(wish.url), `Added ${longDate(wish.createdAt)}`,
													wish.archived ? 'Archived' : '',
													wish.categories.join(', ')].filter(Boolean).join(sep)}
												amount={wish.price != null ? currency(wish.price) : undefined}>
												{savedId === wish.id ? (
													<span className="line-saved"><Icon name="check" />Saved</span>
												) : null}
												<span className="row-inline row-actions">
													{/* A real address outside this app, so a real link: middle-click
													    and "open in new tab" have to work, and the status bar has to
													    say where it goes. README: Honest Affordances. */}
													{href ? (
														<IconButton icon="externalLink" href={href}
															target="_blank" rel="noopener noreferrer"
															label={`Open ${wish.name} at ${siteOf(wish.url)} in a new tab`} />
													) : null}
													<IconButton icon="pencil" label={`Edit ${wish.name}`}
														onClick={() => go(wish.id)} />
													<IconButton icon={wish.archived ? 'undo' : 'archive'}
														label={wish.archived
															? `Put ${wish.name} back on your wishlist`
															: `Archive ${wish.name}`}
														onClick={() => archive(wish, !wish.archived)} />
													{wishDel.iconButton(wish)}
												</span>
											</ItemRow>
										)
									})}
								</InsetPanel>
							) : openId === 'new' ? null : data.total === 0 ? (
								/* Nothing to filter is not "nothing matches": on an account with no
								   wishes at all the filter sentence would blame filters nobody set, and
								   CLEAR ALL would offer to clear them. README: Empty states. */
								<EmptyState icon="cart">
									<p>Nothing on your wishlist yet. Add the first thing you are thinking about buying.</p>
									<ButtonLink onClick={() => go('new')}>ADD A WISH</ButtonLink>
								</EmptyState>
							) : narrowingSort && !chips.length && !query ? (
								<EmptyState icon="cart">
									<p>No wishes have a price yet.</p>
									<ButtonLink onClick={() => write(filters, query, 'added-desc', 1)}>SORT BY ADDED</ButtonLink>
								</EmptyState>
							) : (
								<EmptyState icon="cart">
									<p>{narrowingSort
										? 'No wishes with a price match these filters.'
										: 'No wishes match these filters.'}</p>
									<ButtonLink onClick={clearAll}>CLEAR ALL</ButtonLink>
								</EmptyState>
							)}

							{/* What is on this page adds up to, which is not what the whole list does --
							    so it says which. A wish with no price written down is not a wish that
							    costs nothing, so it is left out of the sum and the sentence names how
							    many were counted. */}
							{data.wishes.length ? <PageTotal wishes={data.wishes} /> : null}

							<Pager from={data.from} to={data.to} matched={data.matched}
								page={data.page} pages={data.pages} onPage={setPage} />
						</CardBody>
					</Card>
				)}
			</Async>

			{wishDel.dialog}

			{leaving ? (
				<ConfirmDialog title="Discard changes to this wish?"
					detail="This wish still has something wrong with it, so it cannot be saved yet. Closing this leaves it as it was."
					confirmLabel="DISCARD" cancelLabel="KEEP EDITING"
					onConfirm={() => { const { target } = leaving; setLeaving(null); seed(target) }}
					onCancel={() => setLeaving(null)} />
			) : null}
		</Page>
	)
}

/** What the rows on screen come to. Named for what it counts -- this page, not the wishlist --
    because a pager underneath it means those are two different figures. */
function PageTotal({ wishes }) {
	const priced = wishes.filter(w => w.price != null)
	const total = priced.reduce((sum, w) => sum + w.price, 0)
	return (
		<div className="line-total-row">
			<span>
				{plural(wishes.length, 'wish', 'wishes')} on this page
				{priced.length ? <><Sep />{currency(total)}</> : null}
			</span>
			{priced.length && priced.length !== wishes.length ? (
				<span className="field-help">the total is for the {priced.length} with a price</span>
			) : null}
		</div>
	)
}

/* ---- the card a wish opens into ----

   The item card's shape and the item card's reading order: the picture first in the markup as
   well as on screen, so the focus ring runs down the card rather than jumping back up it on
   the fifth press. */
function WishCard({
	ref, isNew, form, set, errors, dirty, saving, photo, name,
	categories, onCategoriesChange, allCategories,
	onPick, onClearPhoto, onSave, onCancel, deleteButton
}) {
	const drop = useDroppedPhoto(onPick)
	const [query, setQuery] = useState('')

	const nameField = errors.propsFor('wish-name')
	const urlField = errors.propsFor('wish-url')
	const priceField = errors.propsFor('wish-price')

	const addCategory = value => {
		const clean = value.trim()
		if (clean && !categories.includes(clean)) onCategoriesChange([...categories, clean])
	}

	/* Escape from anywhere in the card, Enter only from a field -- a button already treats
	   Enter as its own activation, so catching it here as well would swallow the press CANCEL
	   was about to receive. */
	const keys = e => {
		if (e.key === 'Escape') {
			e.preventDefault(); e.stopPropagation()
			onCancel()
			return
		}
		/* Not from the categories field: Enter there is how a category that does not exist yet
		   is added (the combobox's own action row), and saving the card instead would swallow
		   the word just typed. */
		if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return
		if (e.target.id === 'wish-categories') return
		e.preventDefault()
		onSave()
	}

	const heading = isNew ? 'New wish' : 'Editing this wish'

	return (
		<div ref={ref} className={['filter-section', 'line-card', drop.over && 'is-dragover'].filter(Boolean).join(' ')}
			onKeyDown={keys} {...drop.dropProps}>

			<div className="line-card-head">
				<span className="section-label line-card-title">{heading}</span>
				<span className="field-help push-end line-card-keys">Enter saves<Sep />Escape cancels</span>
			</div>

			<div className="line-card-body">
				<LinePhoto photo={photo} heading={heading} name={name} label="Picture of this wish"
					onPick={onPick} onClear={onClearPhoto} />

				<div className="line-card-fields wish-card-fields">
					<Field className="line-field-wide" label="Name" htmlFor="wish-name"
						error={nameField.error} errorId={nameField.errorId}>
						<FieldShell>
							<TextInput id="wish-name" aria-label="Name" aria-required="true"
								value={form['wish-name']} onChange={set('wish-name')}
								invalid={nameField.invalid} describedBy={nameField.describedBy} />
						</FieldShell>
					</Field>

					<Field className="line-field-wide" label="Link" htmlFor="wish-url"
						error={urlField.error} errorId={urlField.errorId}
						help="The page you would buy it on. You can leave out the https://">
						<FieldShell>
							<TextInput id="wish-url" inputMode="url" aria-label="Link" aria-required="true"
								placeholder="shop.dk/product"
								value={form['wish-url']} onChange={set('wish-url')}
								invalid={urlField.invalid} describedBy={urlField.describedBy} />
						</FieldShell>
					</Field>

					<Field label="Price" optional htmlFor="wish-price"
						error={priceField.error} errorId={priceField.errorId}
						help="What the shop asks for it today.">
						<FieldShell>
							<TextInput id="wish-price" inputMode="decimal" aria-label="Price"
								value={form['wish-price']}
								onChange={v => set('wish-price')(sanitizeAmount(v))}
								invalid={priceField.invalid} describedBy={priceField.describedBy} />
							<FieldUnit>{currencySymbol()}</FieldUnit>
						</FieldShell>
					</Field>

					{/* The order form's categories field, with the order form's reasoning: htmlFor,
					    because the chips are labelable and come first, and without it the label
					    points at the first chip's remove button -- so a tap on the chevron deletes a
					    category instead of opening the list. See components/Form.jsx. */}
					<Field label="Categories" optional htmlFor="wish-categories"
						help="Pick from your categories, or type one and press Enter.">
						<Combobox id="wish-categories" label="Add category" placeholder="Add category..."
							chips={categories.map(cat => (
								<Chip key={cat} label={`Remove category ${cat}`}
									onRemove={() => onCategoriesChange(categories.filter(c => c !== cat))}>
									{cat}</Chip>
							))}
							value={query} onChange={setQuery}
							onSelect={o => { addCategory(o.label); setQuery('') }}
							groups={[
								{ heading: 'Favourites', options: allCategories
									.filter(c => c.favourite && !categories.includes(c.name))
									.map(c => ({ id: c.id, label: c.name, meta: `${percent(c.share)} of expenses`, star: true })) },
								{ heading: 'All categories', options: allCategories
									.filter(c => !c.favourite && !categories.includes(c.name))
									.map(c => ({ id: c.id, label: c.name, meta: `${percent(c.share)} of expenses` })) }
							]}
							action={query.trim()
								? { icon: 'plus', label: `ADD "${query.trim().toUpperCase()}"`,
									onSelect: value => { addCategory(value); setQuery('') } }
								: undefined} />
					</Field>
				</div>
			</div>

			<FormActions>
				<Button variant="caps compact" icon="check" disabled={saving} onClick={onSave}>
					{saving ? 'SAVING...' : isNew ? 'ADD WISH' : 'SAVE WISH'}</Button>
				<Button variant="ghost compact" disabled={saving} onClick={onCancel}>CANCEL</Button>
				<span className="field-help form-actions-note">
					{dirty ? 'Unsaved changes' : 'A name and a link are all it needs.'}</span>
				{deleteButton ? <span className="push-end">{deleteButton}</span> : null}
			</FormActions>
		</div>
	)
}
