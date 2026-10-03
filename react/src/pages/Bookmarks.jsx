import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { Chip } from '../components/Chip.jsx'
import { FieldGroup } from '../components/Choice.jsx'
import { Combobox, ComboboxOption, ComboboxSeparator } from '../components/Combobox.jsx'
import { Icon } from '../components/Icon.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Controls, Crumb, Filters, ListMore, Record, Records } from '../components/List.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Menu, MenuItem, MenuSeparator, useToast } from '../components/Overlays.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { Scrim } from '../components/Shell.jsx'
import { Sheet } from '../components/Touch.jsx'
import { Empty, EmptyBody, EmptyTitle, Kbd, useFocusTrap } from '../components/Utilities.jsx'
import { MAC, useShellShape, useWidth } from '../app/useMedia.js'
import { useListMemory } from '../app/listMemory.js'
import { MoreMatches, moreText, usePickList } from '../app/pickList.jsx'
import { useApi } from '../api/useApi.js'
import { httpUrl, siteOf } from '../api/rules.js'
import {
	bookmarkPhotoThumbnailUrl, bookmarkSorts, deleteBookmark, getBookmarkPages, getBookmarksWithoutCategory,
	getCategoryPage, getSettings, setBookmarkArchived
} from '../api/client.js'
import { NUMBER_LOCALE, currency, dot, plural, shortDate } from '../api/format.js'
import { Bar, CategoryMark, ConfirmDelete, Held, bookmarkDeleteNote, isGone, sayFailure, useFold, useRefocus } from './vendorsCategories.jsx'

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
	// below the 900 fold the bar takes the phone's shape: the filters move into the sheet (18b)
	const [column, folded] = useFold()
	const sheeted = touch || folded
	// the search drops its shortcut badge at 720 of the list or under (15e)
	const badged = useWidth(column) > 720
	const [params, setParams] = useSearchParams()
	const query = params.get('q') ?? ''
	const category = params.get('category') ?? ''
	const sort = SORTS.some(s => s.id === params.get('sort')) ? params.get('sort') : SORTS[0].id
	const archived = params.get('archived') === 'yes'

	const settings = useApi(getSettings)
	const step = settings.data?.pageSize ?? 10
	// a page of cards per Load more, held in the address
	const { pages, setPages, restored } = useListMemory()

	const [findCategory, setFindCategory] = useState('')
	const counts = useCategoryCounts(archived, findCategory)
	// the category the address names: its name, and how many bookmarks it holds in all and in this view
	const one = category && category !== NONE ? category : null
	const chosen = useApi(getCategoryPage, [{ ids: one, with: 'bookmarks', pageSize: 1 }], { enabled: Boolean(one) })
	const chosenHere = useApi(getCategoryPage, [{ ids: one, bookmarks: archived ? 'archived' : 'open', with: 'bookmarks', pageSize: 1 }], { enabled: Boolean(one) })
	const list = useApi(getBookmarkPages, [{ query, categoryId: category, sort, archived: archived ? 'yes' : 'no' }, step, pages])
	useEffect(() => { if (list.data) restored() }, [list.data])
	const refocus = useRefocus(list.data?.bookmarks, '.sp-record__act', '.sp-empty a, .sp-empty button')

	const [menuFor, setMenuFor] = useState(null)
	const [deleting, setDeleting] = useState(null)
	const [busy, setBusy] = useState(false)
	// the phone's filter sheet: what it holds until Apply, or null while it is closed
	const [draft, setDraft] = useState(null)
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

	const { used, withoutCount } = counts
	const idOf = name => getCategoryPage({ name, pageSize: 1 }).then(r => r.categories[0]?.id, () => null)
	const categoryName = category === NONE ? 'Without category' : chosen.data?.categories[0]?.name ?? ''
	const sortLabel = SORTS.find(s => s.id === sort).label

	const refresh = () => { list.refresh(); counts.refresh() }

	// a link to a category that is gone (or never was) falls back to every category
	const gone = Boolean(one) && chosen.data?.categories.length === 0 && !chosen.loading
	useEffect(() => { if (gone) write({ category: '' }) }, [gone])

	const archive = async (bookmark, to) => {
		closeMenus()
		try {
			await setBookmarkArchived(bookmark.id, to)
			refocus(bookmark, list.data.bookmarks.findIndex(b => b.id === bookmark.id))
			refresh()
			toast({
				message: `${bookmark.name} ${to ? 'archived' : 'is back on your list'}.`,
				undo: { label: 'Undo', onClick: () => setBookmarkArchived(bookmark.id, !to).then(refresh) }
			})
		} catch (e) {
			if (isGone(e)) {
				refocus(bookmark, list.data.bookmarks.findIndex(b => b.id === bookmark.id))
				refresh()
				return toast({ message: `${bookmark.name} no longer exists.` })
			}
			sayFailure(toast, e, 'That did not change. Try again.')
		}
	}

	const remove = async bookmark => {
		setBusy(true)
		try {
			await deleteBookmark(bookmark.id).catch(e => { if (!isGone(e)) throw e })
			refocus(bookmark, list.data.bookmarks.findIndex(b => b.id === bookmark.id))
			setDeleting(null)
			refresh()
			toast({ message: `${bookmark.name} deleted.` })
		} catch (e) {
			sayFailure(toast, e, 'That did not delete. Try again.')
		} finally {
			setBusy(false)
		}
	}

	const choose = next => () => write(next)
	const categoryOptions = [
		<ComboboxOption key="any" selected={!category} onSelect={choose({ category: '' })}>Any category</ComboboxOption>,
		used.length ? <ComboboxSeparator key="used" /> : null,
		...used.map(c => (
			<ComboboxOption key={c.id} selected={category === c.id} mark={<CategoryMark category={c} size="small" />} meta={c.bookmarks}
				onSelect={choose({ category: c.id })}>{c.name}</ComboboxOption>
		)),
		<MoreMatches key="more" rows={counts.page.rows} matched={counts.page.matched} noun="categories" />,
		withoutCount > 0 ? <ComboboxSeparator key="without" /> : null,
		withoutCount > 0
			? <ComboboxOption key={NONE} selected={category === NONE} meta={withoutCount} onSelect={choose({ category: NONE })}>Without category</ComboboxOption>
			: null,
		<ComboboxSeparator key="edit" />,
		<ComboboxOption key="edit-categories" mark={<Icon name="pencil" size={13} />} onSelect={() => navigate('/categories')}>Edit categories</ComboboxOption>
	]

	const sortControl = (
		<Combobox variant={touch ? 'end' : 'sort'} aria-label="Sort" value={sortLabel} prefix={touch ? null : 'Sort'}>
			{SORTS.map(s => (
				<ComboboxOption key={s.id} selected={s.id === sort} onSelect={() => write({ sort: s.id })}>{s.label}</ComboboxOption>
			))}
		</Combobox>
	)

	const filtersButtonProps = {
		variant: 'outline', 'aria-haspopup': 'dialog', 'aria-expanded': draft ? 'true' : 'false',
		onClick: () => setDraft({ category, archived })
	}
	// the button says how many of the filters it holds are set (Mobile screens 7b)
	const held = (category ? 1 : 0) + (archived ? 1 : 0)
	const filtersLabel = held ? `Filters${dot}${held}` : 'Filters'
	const head = touch
		? (
			<ListItem variant="card" ref={column}>
				<span className="sp-grow">
					<Button {...filtersButtonProps}>{filtersLabel}</Button>
				</span>
				{sortControl}
				<span className="sp-flex-none">
					<Button to="/bookmarks/new" iconStart="plus" aria-label="New bookmark" />
				</span>
			</ListItem>
		)
		: (
			<Controls ref={column}>
				<SearchInput value={query} onChange={q => write({ q })}
					placeholder="Search bookmarks, shops or categories" aria-label="Search bookmarks"
					kbd={badged ? <Kbd>{MAC ? '⌘K' : 'Ctrl K'}</Kbd> : undefined} />
				{folded
					? <Button {...filtersButtonProps}>{filtersLabel}</Button>
					: (
						<Combobox variant="sort" aria-label="Category" value={category ? categoryName : 'Any'} prefix="Category"
							{...(counts.searched ? { searchable: true, search: findCategory, onSearch: setFindCategory, noun: 'categories' } : {})}>
							{categoryOptions}
						</Combobox>
					)}
				{sortControl}
				{folded
					? null
					: (
						<Segmented name="bookmarks-shown" options={SHOWN} value={archived ? 'archived' : 'open'}
							onChange={v => write({ archived: v === 'archived' ? 'yes' : '' })}
							role="radiogroup" aria-label="Which bookmarks" />
					)}
				<Button to="/bookmarks/new">New bookmark</Button>
			</Controls>
		)

	// what a control not on screen holds is a crumb too: on a phone the search, and with the sheet
	// the view switch; Clear all clears what the crumbs show
	const crumbs = [
		touch && query ? <Crumb key="q" name={`the search for "${query}"`} onRemove={() => write({ q: '' })}>"{query}"</Crumb> : null,
		category ? <Crumb key="category" name={categoryName} onRemove={() => write({ category: '' })}>{categoryName}</Crumb> : null,
		sheeted && archived ? <Crumb key="archived" name="Archived" onRemove={() => write({ archived: '' })}>Archived</Crumb> : null
	].filter(Boolean)
	const clearCrumbs = touch ? clearAll : folded ? () => write({ category: '', archived: '' }) : () => write({ category: '' })

	const closeSheet = () => setDraft(null)
	const sheet = draft
		? createPortal(
			<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) closeSheet() }}>
				<FilterSheet draft={draft} setDraft={setDraft} onClose={closeSheet}
					onApply={() => { write({ category: draft.category, archived: draft.archived ? 'yes' : '' }); closeSheet() }} />
			</Scrim>,
			document.body
		)
		: null

	const data = list.data
	let body
	if (list.error) {
		body = <Failed what="Your bookmarks" error={list.error} onRetry={refresh} />
	} else if (!data) {
		body = <BookmarksLoading size={step} />
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
		const holds = chosenHere.data?.categories[0]?.bookmarks ?? 0
		const ever = chosen.data?.categories[0]?.bookmarks ?? 0
		const filtered = Boolean(query || category || archived)
		const why = query && category && category !== NONE
			? `Nothing in ${categoryName} matches "${query}". ${categoryName} holds ${plural(holds, 'bookmark')}.`
			: query && category ? `Nothing without a category matches "${query}".`
			: query ? `Nothing matches "${query}".`
			: category === NONE ? `Every bookmark without a category is ${archived ? 'open' : 'archived'}.`
			: category ? (ever ? `Every bookmark in ${categoryName} is ${archived ? 'open' : 'archived'}.` : `${categoryName} holds no bookmarks.`)
			: archived ? 'You have not archived any bookmarks.'
			: 'Every bookmark you have is archived.'
		body = (
			<Card>
				<Empty>
					<EmptyTitle>No bookmarks match these filters</EmptyTitle>
					<EmptyBody>{why}</EmptyBody>
					{filtered ? <Button variant="outline" size="small" onClick={clearAll}>Clear filters</Button> : null}
				</Empty>
			</Card>
		)
	} else {
		const footer = <ListMore loose shown={data.bookmarks.length} total={data.matched} pageSize={step} onMore={() => setPages(pages + 1)} locale={NUMBER_LOCALE} />
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
							hrefLabel={href ? `Open ${bookmark.name} at ${site}` : undefined}
							photos={bookmark.photoId
								? [<img key="p" src={bookmarkPhotoThumbnailUrl(bookmark.id, bookmark.photoId)} alt="" />]
								: []}
							empty="No picture"
							title={bookmark.name}
							subtitle={site}
							chips={bookmark.categories.map(name => (
								<Chip key={name} onClick={() => idOf(name).then(id => { if (id && id !== category) write({ category: id }) })}>{name}</Chip>
							))}
							meta={<span className="sp-subtitle">Added {shortDate(bookmark.createdAt)}</span>}
							amount={bookmark.price != null ? currency(bookmark.price, 0) : null}
							menu={{
								open,
								label: `Bookmark menu, ${bookmark.name}`,
								onToggle: () => setMenuFor(open ? null : bookmark.id),
								onClose: closeMenus,
								children: open
									? (
										<Menu position="floating" aria-label={`${bookmark.name} actions`}>
											{href
												? <MenuItem icon="external-link" onClick={() => { closeMenus(); window.open(href, '_blank', 'noopener') }}>Open at {site}</MenuItem>
												: null}
											<MenuItem icon="pencil" onClick={() => navigate(`/bookmarks/${bookmark.id}/edit`)}>Edit bookmark</MenuItem>
											<MenuItem icon="archive" onClick={() => archive(bookmark, !bookmark.archived)}>{bookmark.archived ? 'Unarchive' : 'Archive'}</MenuItem>
											<MenuSeparator />
											<MenuItem icon="trash" danger onClick={() => { closeMenus(); setDeleting(bookmark) }}>Delete bookmark</MenuItem>
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
			{crumbs.length ? <Filters onClear={clearCrumbs}>{crumbs}</Filters> : null}
			{body}
			{sheet}
			{deleting
				? (
					<ConfirmDelete title={`Delete ${deleting.name}?`} action="Delete bookmark" busy={busy}
						onConfirm={() => remove(deleting)} onCancel={() => setDeleting(null)}>
						{bookmarkDeleteNote(deleting)}
					</ConfirmDelete>
				)
				: null}
		</>
	)
}

/** The phone's filters (Mobile screens 22a, c12): a sheet over the list, applied together. */
function FilterSheet({ draft, setDraft, onClose, onApply }) {
	// the categories of the view the sheet is set to, which can differ from the list behind it
	const [find, setFind] = useState('')
	const { used, withoutCount, page, searched } = useCategoryCounts(draft.archived, find)
	const box = useRef(null)
	// modal while open; closing gives focus back to the Filters button that opened it
	useFocusTrap(box)
	const pick = next => setDraft(d => ({ ...d, ...next }))
	return (
		<Sheet role="dialog" aria-modal="true" aria-label="Filters" ref={box}
			onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); onClose() } }}>
			<span className="sp-heading">Filters</span>
			<FieldGroup facet legend="Show">
				<Segmented name="bookmarks-shown-sheet" options={SHOWN} value={draft.archived ? 'archived' : 'open'}
					onChange={v => pick({ archived: v === 'archived' })} role="radiogroup" aria-label="Which bookmarks" />
			</FieldGroup>
			{used.length || withoutCount || find
				? (
					<FieldGroup facet legend="Category">
						{searched ? <SearchInput value={find} onChange={setFind} placeholder="Find a category…" aria-label="Find a category" /> : null}
						<Filters>
							{used.map(c => (
								<Chip key={c.id} variant="facet" value={c.id} selected={draft.category === c.id}
									onSelect={on => pick({ category: on ? c.id : '' })}>{c.name}</Chip>
							))}
							{withoutCount
								? <Chip variant="facet" value={NONE} selected={draft.category === NONE} onSelect={on => pick({ category: on ? NONE : '' })}>Without category</Chip>
								: null}
						</Filters>
						{moreText(page.rows, page.matched, 'categories') ? <span className="sp-subtitle">{moreText(page.rows, page.matched, 'categories')}</span> : null}
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

/** The categories bookmarks of one view carry, a page of those matching `find`, each with its count
    there; how many carry none; and whether there are more than a page, so the filter is searched. */
function useCategoryCounts(archived, find = '') {
	const page = usePickList('category', find, { bookmarks: archived ? 'archived' : 'open', with: 'bookmarks' })
	const without = useApi(getBookmarksWithoutCategory, [archived])
	const searched = Boolean(find.trim()) || (page.total ?? 0) > (page.rows?.length ?? 0)
	return { used: page.rows ?? [], page, searched, withoutCount: without.data ?? 0, refresh: without.refresh }
}

const noop = () => {}
const LOADING_WIDTHS = [['62pc', '44pc'], ['48pc', '36pc'], ['55pc', '30pc']]

/* A page of cards held at the loaded cards' size (6b), so nothing moves when the bookmarks land. */
function BookmarksLoading({ size }) {
	return (
		<Records aria-busy="true" aria-label="Loading your bookmarks">
			{Array.from({ length: size }, (_, i) => {
				const [title, shop] = LOADING_WIDTHS[i % LOADING_WIDTHS.length]
				return (
					<Record key={i} photos={['']}
						title={<Bar role="sp-title" w={title} h="13" />}
						subtitle={<Bar role="sp-subtitle" w={shop} h="11" />}
						chips={<Held shape={<Chip onClick={noop}>Decor</Chip>} />}
						meta={<Bar role="sp-subtitle" w="96" h="11" />}
						amount={<Bar role="sp-amount" w="64" h="20" end />} />
				)
			})}
		</Records>
	)
}
