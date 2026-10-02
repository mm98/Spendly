import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { Chip } from '../components/Chip.jsx'
import { FieldGroup } from '../components/Choice.jsx'
import { Combobox, ComboboxOption, ComboboxSeparator } from '../components/Combobox.jsx'
import { Icon } from '../components/Icon.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Controls, Crumb, Filters, Record, Records } from '../components/List.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Menu, MenuItem, MenuSeparator, useToast } from '../components/Overlays.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { Scrim } from '../components/Shell.jsx'
import { Sheet } from '../components/Touch.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton } from '../components/Utilities.jsx'
import { useShellShape } from '../app/useMedia.js'
import { useApi } from '../api/useApi.js'
import { httpUrl, siteOf } from '../api/rules.js'
import {
	bookmarkPhotoThumbnailUrl, bookmarkSorts, deleteBookmark, failureMessage, getBookmarks, getCategories,
	getSettings, getUncategorised, setBookmarkArchived
} from '../api/client.js'
import { currency, plural, shortDate } from '../api/format.js'
import { CategoryMark, ConfirmDelete, Failed, bookmarkDeleteNote } from './vendorsCategories.jsx'

const SORT_LABEL = {
	'added-desc': 'Newest first',
	'added-asc': 'Oldest first',
	'price-desc': 'Price high to low',
	'price-asc': 'Price low to high',
	'name-asc': 'Name A - Z'
}
const SORTS = bookmarkSorts.map(s => ({ id: s.id, label: SORT_LABEL[s.id] ?? s.label }))
const SHOWN = [{ value: 'open', label: 'Open' }, { value: 'archived', label: 'Archived' }]
const NONE = 'none'

export default function Bookmarks() {
	const navigate = useNavigate()
	const toast = useToast()
	const touch = useShellShape() === 'touch'
	const [params, setParams] = useSearchParams()
	const query = params.get('q') ?? ''
	const category = params.get('category') ?? ''
	const sort = SORTS.some(s => s.id === params.get('sort')) ? params.get('sort') : SORTS[0].id
	const archived = params.get('archived') === 'yes'

	const settings = useApi(getSettings)
	const step = settings.data?.pageSize ?? 10
	const [shown, setShown] = useState(step)
	useEffect(() => setShown(step), [step, query, category, sort, archived])

	const categories = useApi(getCategories)
	const uncategorised = useApi(getUncategorised)
	const list = useApi(getBookmarks, [{
		query, categoryId: category, sort, archived: archived ? 'yes' : 'no', page: 1, pageSize: shown
	}])

	const [menuFor, setMenuFor] = useState(null)
	const [deleting, setDeleting] = useState(null)
	const [busy, setBusy] = useState(false)
	// the phone's filter sheet: what it holds until Apply, or null while it is closed
	const [draft, setDraft] = useState(null)
	const filtersButton = useRef(null)
	const closeMenus = () => setMenuFor(null)
	useEffect(() => {
		if (!menuFor) return
		const away = ev => { if (!ev.target.closest?.('[data-menu-open="true"]')) closeMenus() }
		const key = ev => {
			if (ev.key !== 'Escape') return
			const act = document.querySelector('[data-menu-open="true"] [aria-haspopup="menu"]')
			closeMenus()
			act?.focus()
		}
		document.addEventListener('pointerdown', away)
		document.addEventListener('keydown', key)
		return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key) }
	}, [menuFor])

	// every filter is the URL, so a filtered list can be linked to and survives a reload
	const write = next => {
		const merged = { q: query, category, sort, archived: archived ? 'yes' : '', ...next }
		const out = {}
		if (merged.q) out.q = merged.q
		if (merged.category) out.category = merged.category
		if (merged.sort && merged.sort !== SORTS[0].id) out.sort = merged.sort
		if (merged.archived) out.archived = 'yes'
		setParams(out, { replace: true })
	}
	const clearAll = () => write({ q: '', category: '', archived: '' })

	const used = (categories.data ?? []).filter(c => c.bookmarks > 0)
	const withoutCount = uncategorised.data?.bookmarks ?? 0
	const idOf = name => categories.data?.find(c => c.name === name)?.id
	const nameOf = id => id === NONE ? 'Without category' : categories.data?.find(c => c.id === id)?.name ?? ''
	const categoryName = nameOf(category)
	const sortLabel = SORTS.find(s => s.id === sort).label

	const refresh = () => { list.refresh(); categories.refresh(); uncategorised.refresh() }

	// a link to a category that is gone (or never was) falls back to every category
	const known = categories.data
	useEffect(() => {
		if (known && category && category !== NONE && !known.some(c => c.id === category)) write({ category: '' })
	}, [known, category])

	const archive = async (bookmark, to) => {
		closeMenus()
		try {
			await setBookmarkArchived(bookmark.id, to)
			refresh()
			toast({
				message: `${bookmark.name} ${to ? 'archived' : 'is back on your list'}.`,
				undo: { label: 'Undo', onClick: () => setBookmarkArchived(bookmark.id, !to).then(refresh) }
			})
		} catch (e) {
			toast({ message: failureMessage(e, 'That did not change. Try again.'), color: 'danger' })
		}
	}

	const remove = async bookmark => {
		setBusy(true)
		try {
			await deleteBookmark(bookmark.id)
			setDeleting(null)
			refresh()
			toast({ message: `${bookmark.name} deleted.` })
		} catch (e) {
			toast({ message: failureMessage(e, 'That did not delete. Try again.'), color: 'danger' })
		} finally {
			setBusy(false)
		}
	}

	const categoryOptions = close => {
		const choose = next => () => { write(next); close() }
		return [
			<ComboboxOption key="any" selected={!category} onSelect={choose({ category: '' })}>Any category</ComboboxOption>,
			used.length ? <ComboboxSeparator key="used" /> : null,
			...used.map(c => (
				<ComboboxOption key={c.id} selected={category === c.id} mark={<CategoryMark category={c} size="small" />} meta={c.bookmarks}
					onSelect={choose({ category: c.id })}>{c.name}</ComboboxOption>
			)),
			withoutCount > 0 ? <ComboboxSeparator key="without" /> : null,
			withoutCount > 0
				? <ComboboxOption key={NONE} selected={category === NONE} meta={withoutCount} onSelect={choose({ category: NONE })}>Without category</ComboboxOption>
				: null,
			<ComboboxSeparator key="edit" />,
			<ComboboxOption key="edit-categories" mark={<Icon name="pencil" size={13} />} onSelect={() => { close(); navigate('/categories') }}>Edit categories</ComboboxOption>
		]
	}

	const sortControl = (
		<Picked variant={touch ? 'end' : 'sort'} label="Sort" value={sortLabel} lead={touch ? null : 'Sort'}>
			{close => SORTS.map(s => (
				<ComboboxOption key={s.id} selected={s.id === sort} onSelect={() => { write({ sort: s.id }); close() }}>{s.label}</ComboboxOption>
			))}
		</Picked>
	)

	const head = touch
		? (
			<ListItem variant="card">
				<span className="sp-grow">
					<Button variant="outline" ref={filtersButton} aria-haspopup="dialog" aria-expanded={draft ? 'true' : 'false'}
						onClick={() => setDraft({ category, archived })}>Filters</Button>
				</span>
				{sortControl}
				<span className="sp-flex-none">
					<Button to="/bookmarks/new" iconStart="plus" aria-label="New bookmark" />
				</span>
			</ListItem>
		)
		: (
			<Controls>
				<SearchInput value={query} onChange={q => write({ q })}
					placeholder="Search bookmarks, shops or categories" aria-label="Search bookmarks" />
				<Picked variant="sort" label="Category" value={category ? categoryName : 'Any'} lead="Category">
					{categoryOptions}
				</Picked>
				{sortControl}
				<Segmented name="bookmarks-shown" options={SHOWN} value={archived ? 'archived' : 'open'}
					onChange={v => write({ archived: v === 'archived' ? 'yes' : '' })}
					role="radiogroup" aria-label="Which bookmarks" />
				<Button to="/bookmarks/new">New bookmark</Button>
			</Controls>
		)

	// on a phone there is no search field or view switch on screen, so what they hold is a crumb too
	const crumbs = [
		touch && query ? <Crumb key="q" name={`the search for "${query}"`} onRemove={() => write({ q: '' })}>"{query}"</Crumb> : null,
		category ? <Crumb key="category" name={categoryName} onRemove={() => write({ category: '' })}>{categoryName}</Crumb> : null,
		touch && archived ? <Crumb key="archived" name="Archived" onRemove={() => write({ archived: '' })}>Archived</Crumb> : null
	].filter(Boolean)

	const closeSheet = () => { setDraft(null); filtersButton.current?.focus() }
	const sheet = draft
		? createPortal(
			<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) closeSheet() }}>
				<FilterSheet draft={draft} setDraft={setDraft} used={used} withoutCount={withoutCount} onClose={closeSheet}
					onApply={() => { write({ category: draft.category, archived: draft.archived ? 'yes' : '' }); closeSheet() }} />
			</Scrim>,
			document.body
		)
		: null

	const data = list.data
	let body
	if (list.error) {
		body = <Failed title="Your bookmarks did not load" error={list.error} onRetry={refresh} />
	} else if (!data) {
		body = (
			<Card aria-busy="true" aria-label="Loading your bookmarks">
				<div className="sp-stack sp-gap-12">
					{[0, 1, 2].map(i => (
						<div className="sp-row-flex sp-gap-12" key={i}>
							<Skeleton shape="mark" />
							<span className="sp-stack sp-gap-8 sp-grow">
								<Skeleton shape="title" />
								<Skeleton shape="line" />
								<Skeleton shape="short" />
							</span>
						</div>
					))}
				</div>
			</Card>
		)
	} else if (data.total === 0) {
		body = (
			<Card>
				<Empty>
					<EmptyTitle>No bookmarks yet</EmptyTitle>
					<EmptyBody>Save the things you are thinking about buying, with a link to the shop and the price it asked.</EmptyBody>
					<Button size="small" to="/bookmarks/new">New bookmark</Button>
				</Empty>
			</Card>
		)
	} else if (!data.bookmarks.length) {
		// each sentence states only what an empty answer to this exact request proves
		const state = archived ? 'archived' : 'open'
		const holds = used.find(c => c.id === category)?.bookmarks ?? 0
		const priced = sort.startsWith('price-')
		const filtered = Boolean(query || category || archived)
		const why = priced ? `No ${state} bookmark here has a price yet. Sorting by price leaves those out.`
			: query && category && category !== NONE
				? `Nothing in ${categoryName} matches "${query}". ${categoryName} holds ${plural(holds, 'bookmark')}.`
			: query && category ? `Nothing without a category matches "${query}".`
			: query ? `Nothing matches "${query}".`
			: category === NONE ? `Every bookmark without a category is ${archived ? 'open' : 'archived'}.`
			: category ? (holds ? `Every bookmark in ${categoryName} is ${archived ? 'open' : 'archived'}.` : `${categoryName} holds no bookmarks.`)
			: archived ? 'You have not archived any bookmarks.'
			: 'Every bookmark you have is archived.'
		body = (
			<Card>
				<Empty>
					<EmptyTitle>No bookmarks match these filters</EmptyTitle>
					<EmptyBody>{why}</EmptyBody>
					{priced ? <Button variant="outline" size="small" onClick={() => write({ sort: SORTS[0].id })}>Sort by newest</Button> : null}
					{filtered ? <Button variant="outline" size="small" onClick={clearAll}>Clear filters</Button> : null}
				</Empty>
			</Card>
		)
	} else {
		const footer = data.matched > step
			? (
				<>
					<span className="sp-subtitle">Showing {data.bookmarks.length} of {data.matched}</span>
					<span className="sp-grow" />
					{/* gone once everything is loaded: a disabled Load more promises more that will not come */}
					{data.bookmarks.length < data.matched
						? <Button variant="outline" size="small" onClick={() => setShown(n => n + step)}>Load more</Button>
						: null}
				</>
			)
			: null
		body = (
			<Records footer={footer}>
				{data.bookmarks.map(bookmark => {
					const href = httpUrl(bookmark.url)
					const site = siteOf(bookmark.url)
					const open = menuFor === bookmark.id
					return (
						<Record
							key={bookmark.id}
							href={href ?? undefined}
							photos={bookmark.photoId
								? [<img key="p" src={bookmarkPhotoThumbnailUrl(bookmark.id, bookmark.photoId)} alt={bookmark.name} />]
								: []}
							empty="No picture"
							title={bookmark.name}
							subtitle={site}
							chips={bookmark.categories.map(name => (
								<Chip key={name} onClick={() => { const id = idOf(name); if (id && id !== category) write({ category: id }) }}>{name}</Chip>
							))}
							meta={<span className="sp-subtitle">Added {shortDate(bookmark.createdAt)}</span>}
							amount={bookmark.price != null ? currency(bookmark.price, 0) : null}
							menu={{
								open,
								label: `Bookmark menu, ${bookmark.name}`,
								onToggle: () => setMenuFor(open ? null : bookmark.id),
								children: open
									? (
										<Menu position="floating" aria-label={`${bookmark.name} actions`}>
											{href
												? <MenuItem icon="external-link" onClick={() => { closeMenus(); window.open(href, '_blank', 'noopener') }}>Open at {site}</MenuItem>
												: null}
											<MenuItem icon="pencil" onClick={() => navigate(`/bookmarks/${bookmark.id}/edit`)}>Edit bookmark</MenuItem>
											<MenuItem icon="archive" onClick={() => archive(bookmark, !bookmark.archived)}>{bookmark.archived ? 'Unarchive' : 'Archive'}</MenuItem>
											<MenuSeparator />
											<MenuItem icon="trash" danger onClick={() => {
												// the dialog hands focus back to what had it, and the menu item is about to go
												document.querySelector('[data-menu-open="true"] [aria-haspopup="menu"]')?.focus()
												closeMenus()
												setDeleting(bookmark)
											}}>Delete bookmark</MenuItem>
										</Menu>
									)
									: null
							}}
						/>
					)
				})}
			</Records>
		)
	}

	return (
		<>
			{head}
			{crumbs.length ? <Filters onClear={touch ? clearAll : () => write({ category: '' })}>{crumbs}</Filters> : null}
			{body}
			{sheet}
			{deleting
				? (
					<ConfirmDelete title={`Delete ${deleting.name}?`} action="Delete bookmark" busy={busy}
						onConfirm={() => remove(deleting)} onCancel={() => setDeleting(null)}>
						{bookmarkDeleteNote}
					</ConfirmDelete>
				)
				: null}
		</>
	)
}

/** The phone's filters (Mobile screens 22a, c12): a sheet over the list, applied together. */
function FilterSheet({ draft, setDraft, used, withoutCount, onClose, onApply }) {
	const box = useRef(null)
	useEffect(() => { box.current?.querySelector('input, button')?.focus() }, [])
	const pick = next => setDraft(d => ({ ...d, ...next }))
	return (
		<Sheet role="dialog" aria-modal="true" aria-label="Filters" ref={box}
			onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); onClose() } }}>
			<span className="sp-heading">Filters</span>
			<FieldGroup facet legend="Show">
				<Segmented name="bookmarks-shown-sheet" options={SHOWN} value={draft.archived ? 'archived' : 'open'}
					onChange={v => pick({ archived: v === 'archived' })} role="radiogroup" aria-label="Which bookmarks" />
			</FieldGroup>
			{used.length || withoutCount
				? (
					<FieldGroup facet legend="Category">
						<Filters>
							{used.map(c => (
								<Chip key={c.id} variant="facet" value={c.id} selected={draft.category === c.id}
									onSelect={on => pick({ category: on ? c.id : '' })}>{c.name}</Chip>
							))}
							{withoutCount
								? <Chip variant="facet" value={NONE} selected={draft.category === NONE} onSelect={on => pick({ category: on ? NONE : '' })}>Without category</Chip>
								: null}
						</Filters>
					</FieldGroup>
				)
				: null}
			<div className="sp-row-flex sp-gap-8">
				<Button variant="outline" size="small" onClick={() => pick({ category: '', archived: false })}>Clear all</Button>
				<Button size="small" onClick={onApply}>Apply</Button>
			</div>
		</Sheet>
	)
}

/** A pick-only combobox that closes once a choice is made; `lead` names it inside the trigger. */
function Picked({ variant = 'default', label, value, lead, children }) {
	const [open, setOpen] = useState(false)
	const close = () => setOpen(false)
	return (
		<Combobox variant={variant} aria-label={label} value={value} open={open} onOpenChange={setOpen}
			lead={lead ? <span className="sp-combobox__chevron">{lead}</span> : null}>
			{children(close)}
		</Combobox>
	)
}
