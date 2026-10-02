import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Card, Panel } from '../components/Card.jsx'
import { ComboboxOption } from '../components/Combobox.jsx'
import { Sum } from '../components/Data.jsx'
import { Field } from '../components/Field.jsx'
import { Slot } from '../components/FileDrop.jsx'
import { Icon } from '../components/Icon.jsx'
import { NumberField, TextField, TokensField } from '../components/Inputs.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Alert, Anchor, Dialog, DialogActions, DialogBody, DialogTitle, Popover, useToast } from '../components/Overlays.jsx'
import { Skeleton } from '../components/Utilities.jsx'
import { Well } from '../components/Well.jsx'
import { useShellShape } from '../app/useMedia.js'
import { useApi } from '../api/useApi.js'
import { BOOKMARK_FIELDS, httpUrl, siteOf } from '../api/rules.js'
import {
	addBookmarkPhoto, addBookmarkPhotoFromUrl, bookmarkPhotoThumbnailUrl, createBookmark, deleteBookmark, failureMessage,
	getBookmark, getBookmarkPreview, getCategories, removeBookmarkPhoto, setBookmarkArchived, updateBookmark
} from '../api/client.js'
import { amount, currency, currencySymbol, shortDate } from '../api/format.js'

const rule = name => BOOKMARK_FIELDS.find(f => f.name === name).check
const checks = { url: rule('bookmark-url'), name: rule('bookmark-name') }
const lower = list => list.map(n => n.toLowerCase()).sort().join('\n')

export default function BookmarkForm() {
	const { id } = useParams()
	const existing = useApi(getBookmark, [id], { enabled: Boolean(id) })
	const touch = useShellShape() === 'touch'
	if (id && !existing.data) {
		return (
			<>
				<div className="sp-stack sp-gap-12">
					{existing.error
						? <Alert color="danger" mark="!" title="This bookmark did not load">{failureMessage(existing.error, 'Check your connection, then reload the page.')}</Alert>
						: (
							<Card aria-busy="true" aria-label="Loading the bookmark">
								<div className="sp-stack sp-gap-12">
									<Skeleton shape="mark-large" />
									<Skeleton shape="title" />
									<Skeleton shape="line" />
									<Skeleton shape="short" />
								</div>
							</Card>
						)}
				</div>
				{touch ? null : <Panel />}
			</>
		)
	}
	return <BookmarkFields key={id ?? 'new'} bookmark={existing.data ?? null} />
}

function BookmarkFields({ bookmark }) {
	const navigate = useNavigate()
	const toast = useToast()
	const categories = useApi(getCategories)
	const editing = Boolean(bookmark)
	const touch = useShellShape() === 'touch'

	const [url, setUrl] = useState(bookmark?.url ?? '')
	const [name, setName] = useState(bookmark?.name ?? '')
	const [price, setPrice] = useState(bookmark?.price ?? null)
	const [chosen, setChosen] = useState(bookmark?.categories ?? [])
	const [typing, setTyping] = useState('')
	const [errors, setErrors] = useState({})
	const [saving, setSaving] = useState(false)
	const [archived, setArchived] = useState(Boolean(bookmark?.archived))
	const [confirming, setConfirming] = useState(false)
	// a file chosen here, a picture taken off, or the shop's own picture on offer: none is saved before Save
	const [picked, setPicked] = useState(null)
	const [cleared, setCleared] = useState(false)
	const [offered, setOffered] = useState(null)
	const leaving = useRef(false)

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

	const blocker = useBlocker(({ currentLocation, nextLocation }) =>
		dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname)
	useEffect(() => {
		if (!dirty) return
		const hold = ev => { ev.preventDefault(); ev.returnValue = '' }
		window.addEventListener('beforeunload', hold)
		return () => window.removeEventListener('beforeunload', hold)
	}, [dirty])
	const leave = (to = '/bookmarks') => { leaving.current = true; navigate(to) }

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

	const known = categories.data ?? []
	const setCategories = next => {
		const out = []
		for (const typed of next) {
			const named = known.find(c => c.name.toLowerCase() === typed.toLowerCase())?.name ?? typed
			if (!out.some(n => n.toLowerCase() === named.toLowerCase())) out.push(named)
		}
		setChosen(out)
	}
	const query = typing.trim()
	const taken = new Set(chosen.map(n => n.toLowerCase()))
	const matches = known.filter(c => !taken.has(c.name.toLowerCase()) && c.name.toLowerCase().includes(query.toLowerCase()))
	const exists = taken.has(query.toLowerCase()) || known.some(c => c.name.toLowerCase() === query.toLowerCase())

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
		try {
			await deleteBookmark(bookmark.id)
			toast({ message: `${bookmark.name} deleted.` })
			leave()
		} catch (e) {
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
					<TokensField value={chosen} onChange={setCategories} onSearch={setTyping}
						placeholder="Add…" aria-label="Add a category">
						{[
							...matches.map(c => (
								<ComboboxOption key={c.id} onSelect={() => setCategories([...chosen, c.name])}>{c.name}</ComboboxOption>
							)),
							query && !exists
								? <ComboboxOption key="create" mark={<Icon name="plus" />} onSelect={() => setCategories([...chosen, query])}>Create "{query}"</ComboboxOption>
								: null
						]}
					</TokensField>
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
				? <Button variant="outline" size="small" href={href} target="_blank" rel="noopener noreferrer">Open {site}</Button>
				: null}
		</Card>
	)
	const endOfLife = editing
		? (
			<Card footerLayout="split" footerCommits footer={[
				<Button key="archive" variant="outline" onClick={archive}>{archived ? 'Unarchive' : 'Archive'}</Button>,
				<Anchor key="delete" open={confirming}>
					<Button color="danger" fullWidth onClick={() => setConfirming(!confirming)}>Delete</Button>
					{confirming
						? (
							<Popover position="end" role="dialog" aria-label={`Delete ${bookmark.name}?`}
								head={<>
									<span className="sp-title">Delete {bookmark.name}?</span>
									<span className="sp-subtitle">The bookmark and its picture are removed. To keep it off the list without losing it, archive it instead.</span>
								</>}
								actions={<>
									<Button variant="outline" fullWidth onClick={() => setConfirming(false)}>Cancel</Button>
									<Button color="danger" fullWidth onClick={remove}>Delete bookmark</Button>
								</>} />
						)
						: null}
				</Anchor>
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
	const prompt = blocker.state === 'blocked'
		? (
			<Dialog onCancel={() => blocker.reset()}>
				<DialogTitle>Leave without saving?</DialogTitle>
				<DialogBody>Your changes to this bookmark are not saved. If you leave, they are lost.</DialogBody>
				<DialogActions>
					<Button variant="outline" onClick={() => blocker.reset()}>Keep editing</Button>
					<span className="sp-grow" />
					<Button color="danger" onClick={() => blocker.proceed()}>Leave</Button>
				</DialogActions>
			</Dialog>
		)
		: null

	// a phone has no rail: the form, then the end-of-life card, then the bar it commits from (Mobile 5b)
	if (touch) return (
		<>
			<div className="sp-stack sp-gap-12">{form}{endOfLife}{bar}{prompt}</div>
			{null}
		</>
	)
	return (
		<>
			<div className="sp-stack sp-gap-12">{form}{bar}{prompt}</div>
			<Panel>{summaryCard}{endOfLife}</Panel>
		</>
	)
}
