import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Card, Panel } from '../components/Card.jsx'
import { Sum } from '../components/Data.jsx'
import { Field } from '../components/Field.jsx'
import { Slot } from '../components/FileDrop.jsx'
import { NumberField, TextField } from '../components/Inputs.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { useToast } from '../components/Overlays.jsx'
import { Skeleton } from '../components/Utilities.jsx'
import { Well } from '../components/Well.jsx'
import { useShellShape } from '../app/useMedia.js'
import { useApi } from '../api/useApi.js'
import { BOOKMARK_FIELDS, httpUrl, siteOf } from '../api/rules.js'
import {
	addBookmarkPhoto, addBookmarkPhotoFromUrl, bookmarkPhotoThumbnailUrl, createBookmark, deleteBookmark, failureMessage,
	getBookmark, getBookmarkPreview, removeBookmarkPhoto, setBookmarkArchived, updateBookmark
} from '../api/client.js'
import { amount, currency, currencySymbol, shortDate } from '../api/format.js'
import { CategoryTokens, ConfirmDelete, Failed, bookmarkDeleteNote, useLeaveGuard } from './vendorsCategories.jsx'

const rule = name => BOOKMARK_FIELDS.find(f => f.name === name).check
const checks = { url: rule('bookmark-url'), name: rule('bookmark-name') }
const lower = list => list.map(n => n.toLowerCase()).sort().join('\n')

export default function BookmarkForm() {
	const { id } = useParams()
	// once deleted, the record is not read again: the page is on its way out
	const [gone, setGone] = useState(false)
	const existing = useApi(getBookmark, [id], { enabled: Boolean(id) && !gone })
	const touch = useShellShape() === 'touch'
	// the last record stays in hand while the next one loads, so it has to be the one the address names
	if (id && existing.data?.id !== id) {
		if (existing.error) return (
			<div className="sp-stack sp-gap-12">
				<Failed title="This bookmark did not load" error={existing.error} onRetry={existing.refresh}
					list={{ to: '/bookmarks', label: 'Open Bookmarks' }} />
			</div>
		)
		return (
			<>
				<div className="sp-stack sp-gap-12">
					<Card aria-busy="true" aria-label="Loading the bookmark">
						<div className="sp-stack sp-gap-12">
							<Skeleton shape="mark-large" />
							<Skeleton shape="title" />
							<Skeleton shape="line" />
							<Skeleton shape="short" />
						</div>
					</Card>
				</div>
				{touch ? null : <Panel />}
			</>
		)
	}
	return <BookmarkFields key={id ?? 'new'} bookmark={existing.data ?? null} onGone={setGone} />
}

function BookmarkFields({ bookmark, onGone }) {
	const navigate = useNavigate()
	const toast = useToast()
	const editing = Boolean(bookmark)
	const touch = useShellShape() === 'touch'

	const [url, setUrl] = useState(bookmark?.url ?? '')
	const [name, setName] = useState(bookmark?.name ?? '')
	const [price, setPrice] = useState(bookmark?.price ?? null)
	const [chosen, setChosen] = useState(bookmark?.categories ?? [])
	const [errors, setErrors] = useState({})
	const [saving, setSaving] = useState(false)
	const [archived, setArchived] = useState(Boolean(bookmark?.archived))
	const [confirming, setConfirming] = useState(false)
	const [busy, setBusy] = useState(false)
	// a file chosen here, a picture taken off, or the shop's own picture on offer: none is saved before Save
	const [picked, setPicked] = useState(null)
	const [cleared, setCleared] = useState(false)
	const [offered, setOffered] = useState(null)

	useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.src) }, [picked])

	const choose = file => {
		setPicked({ file, src: URL.createObjectURL(file) })
		setOffered(null)
		setCleared(false)
	}
	const picture = picked ? picked.src
		: cleared ? null
		: bookmark?.photoId ? bookmarkPhotoThumbnailUrl(bookmark.id, bookmark.photoId)
		: offered?.thumbnail ?? null

	const dirty = url.trim() !== (bookmark?.url ?? '')
		|| name.trim() !== (bookmark?.name ?? '')
		|| (price ?? null) !== (bookmark?.price ?? null)
		|| lower(chosen) !== lower(bookmark?.categories ?? [])
		|| Boolean(picked || offered || (cleared && bookmark?.photoId))

	const guard = useLeaveGuard(dirty)
	const leave = (to = '/bookmarks') => { guard.release(); navigate(to) }

	// marked on leaving the field or on Save, and cleared by the next value that passes
	const mark = (field, value) => setErrors(e => ({ ...e, [field]: checks[field](value.trim()) }))

	/* Create only, into an empty name only, and silently: `asked` stops a slow answer landing in a
	   field that has since been typed into. */
	const asked = useRef(0)
	const readPage = async value => {
		const address = httpUrl(value)
		if (editing || !address) return
		const ticket = ++asked.current
		const { title, image, thumbnail } = await getBookmarkPreview(address)
		if (ticket !== asked.current) return
		if (title) setName(current => {
			if (current.trim()) return current
			setErrors(e => ({ ...e, name: '' }))
			return title
		})
		if (image && thumbnail && !picked && !cleared) setOffered({ address: image, thumbnail })
	}

	const save = async () => {
		const found = { url: checks.url(url.trim()), name: checks.name(name.trim()) }
		setErrors(found)
		const first = ['url', 'name'].find(f => found[f])
		if (first) { document.getElementById(`bookmark-${first}`)?.focus(); return }
		setSaving(true)
		const draft = {
			name: name.trim(), url: url.trim(), price: price == null ? '' : amount(price, 2),
			categories: chosen, archived
		}
		try {
			const saved = editing ? await updateBookmark(bookmark.id, draft) : await createBookmark(draft)
			if (picked) await addBookmarkPhoto(saved.id, picked.file)
			else if (cleared && bookmark?.photoId) await removeBookmarkPhoto(saved.id)
			else if (offered) await addBookmarkPhotoFromUrl(saved.id, offered.address)
			if (!editing) toast({ message: `${saved.name} added.` })
			leave()
		} catch (e) {
			setSaving(false)
			toast({ message: failureMessage(e, 'That did not save. Try again.'), color: 'danger' })
		}
	}

	const archive = async () => {
		try {
			await setBookmarkArchived(bookmark.id, !archived)
			setArchived(!archived)
			toast({
				message: `${bookmark.name} ${archived ? 'is back on your list' : 'archived'}.`,
				undo: { label: 'Undo', onClick: () => setBookmarkArchived(bookmark.id, archived) }
			})
			navigate('/bookmarks')
		} catch (e) {
			toast({ message: failureMessage(e, 'That did not change. Try again.'), color: 'danger' })
		}
	}

	const remove = async () => {
		setBusy(true)
		onGone(true)
		try {
			await deleteBookmark(bookmark.id)
			toast({ message: `${bookmark.name} deleted.` })
			leave()
		} catch (e) {
			onGone(false)
			setBusy(false)
			setConfirming(false)
			toast({ message: failureMessage(e, 'That did not delete. Try again.'), color: 'danger' })
		}
	}

	const href = httpUrl(url)
	const site = url.trim() ? siteOf(url) : ''

	const form = (
		<Card
			onDragOver={ev => { if ([...ev.dataTransfer.types].includes('Files')) ev.preventDefault() }}
			onDrop={ev => {
				const file = [...ev.dataTransfer.files].find(f => f.type.startsWith('image/'))
				if (!file) return
				ev.preventDefault()
				choose(file)
			}}
		>
			<span className="sp-section-label">The bookmark</span>
			<Field label="Picture" id="bookmark-picture">
				<Slot start src={picture} kind="Photo" name="the picture" onFile={choose}
					onRemove={() => { setPicked(null); setOffered(null); setCleared(true) }} />
			</Field>
			<Field label="Link" id="bookmark-url"
				message={errors.url || (editing ? 'The page you would buy it on.' : 'Paste the address first. The name and picture are taken from the page.')}
				messageType={errors.url ? 'danger' : 'hint'}>
				<TextField value={url} inputMode="url" autoFocus={!editing}
					onChange={setUrl}
					onBlur={ev => { mark('url', ev.target.value); readPage(ev.target.value) }}
					onPaste={ev => {
						// a pasted link replaces the field, without the tracking that brought it here
						const clean = httpUrl(ev.clipboardData.getData('text'))
						if (!clean) return
						ev.preventDefault()
						setUrl(clean)
					}} />
			</Field>
			<Field label="Name" id="bookmark-name" message={errors.name || undefined} messageType={errors.name ? 'danger' : 'hint'}>
				<TextField value={name} onChange={setName} onBlur={ev => mark('name', ev.target.value)} />
			</Field>
			<div className="sp-fields">
				<Field label="Price" id="bookmark-price" unit={currencySymbol()} message="Leave it empty if you have not looked it up.">
					<NumberField value={price} onChange={setPrice} decimals={0} min={0} locale="da-DK" />
				</Field>
				<Field label="Categories" id="bookmark-categories" message="Type a name that is not on the list to add a new category.">
					<CategoryTokens value={chosen} onChange={setChosen} />
				</Field>
			</div>
		</Card>
	)
	const summaryCard = (
		<Card>
			<span className="sp-section-label">Bookmark summary</span>
			<div className="sp-stack">
				<Sum value={site || '-'}>Shop</Sum>
				<Sum value={chosen.length ? chosen.join(', ') : '-'}>Categories</Sum>
				{editing ? <Sum value={shortDate(bookmark.createdAt)}>Added</Sum> : null}
				<Sum value={price != null ? currency(price, 0) : '-'}>Price</Sum>
			</div>
			{href
				? <Button variant="outline" size="small" href={href} target="_blank" rel="noopener noreferrer"><span className="sp-truncate">Open {site}</span></Button>
				: null}
		</Card>
	)
	const endOfLife = editing
		? (
			<Card footerLayout="split" footerCommits footer={[
				<Button key="archive" variant="outline" onClick={archive}>{archived ? 'Unarchive' : 'Archive'}</Button>,
				<Button key="delete" color="danger" onClick={() => setConfirming(true)}>Delete</Button>
			]}>
				<span className="sp-section-label">End of its life</span>
				<Well>
					<span className="sp-title">Nothing else points at a bookmark</span>
					<span className="sp-subtitle">Archiving keeps it off your list; deleting removes it outright.</span>
				</Well>
			</Card>
		)
		: null
	const bar = !editing || dirty
		? (
			<ListItem variant="sticky">
				{editing ? <span className="sp-data">Unsaved changes</span> : <span className="sp-data sp-ink-5">Nothing saved yet</span>}
				<span className="sp-grow" />
				<Button variant="outline" onClick={() => leave()}>Cancel</Button>
				<Button onClick={save} disabled={saving}>{touch ? (editing ? 'Save' : 'Create') : editing ? 'Save bookmark' : 'Add bookmark'}</Button>
			</ListItem>
		)
		: null
	const prompt = (
		<>
			{guard.prompt}
			{confirming
				? (
					<ConfirmDelete title={`Delete ${bookmark.name}?`} action="Delete bookmark" busy={busy}
						onConfirm={remove} onCancel={() => setConfirming(false)}>
						{bookmarkDeleteNote}
					</ConfirmDelete>
				)
				: null}
		</>
	)

	// a phone has no rail: the form, then the end-of-life card, then the bar it commits from (Mobile 5b)
	if (touch) return <div className="sp-stack sp-gap-12">{form}{endOfLife}{bar}{prompt}</div>
	return (
		<>
			<div className="sp-stack sp-gap-12">{form}{bar}{prompt}</div>
			<Panel>{summaryCard}{endOfLife}</Panel>
		</>
	)
}
