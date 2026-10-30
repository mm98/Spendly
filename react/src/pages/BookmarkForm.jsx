import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Button } from '../components/Button.jsx'
import { Card, CardHeader } from '../components/Card.jsx'
import { Sum } from '../components/Data.jsx'
import { Field } from '../components/Field.jsx'
import { Slot } from '../components/FileDrop.jsx'
import { NumberField, TextField } from '../components/Inputs.jsx'
import { useToast, Leaving } from '../components/Overlays.jsx'
import { Skeleton } from '../components/Utilities.jsx'
import { Well } from '../components/Well.jsx'
import { useShellShape } from '../app/useMedia.js'
import { useApi } from '../api/useApi.js'
import { BOOKMARK_FIELDS, httpUrl, siteOf } from '../api/rules.js'
import {
	addBookmarkPhoto, addBookmarkPhotoFromUrl, bookmarkPhotoThumbnailUrl, createBookmark, deleteBookmark, failureMessage,
	getBookmark, getBookmarkPreview, removeBookmarkPhoto, setBookmarkArchived, updateBookmark
} from '../api/client.js'
import { NUMBER_LOCALE, amount, currency, currencySymbol, shortDate } from '../api/format.js'
import { useListReturn } from '../app/listMemory.js'
import {
	CategoryTokens, CommitBar, ConfirmDelete, GoneNotice, RecordPage, bookmarkDeleteNote, hold, isGone, sayFailure, useLeaveGuard
} from './vendorsCategories.jsx'
import { phrase, usePhrase } from '../language/phrases.js'

const rule = name => BOOKMARK_FIELDS.find(f => f.name === name).check
const checks = { url: rule('bookmark-url'), name: rule('bookmark-name') }
const lower = list => list.map(n => n.toLowerCase()).sort().join('\n')

export default function BookmarkForm() {
	const phrase = usePhrase()
	const { id } = useParams()
	// once deleted, the record is not read again: the page is on its way out
	const [gone, setGone] = useState(false)
	const existing = useApi(getBookmark, [id], { enabled: Boolean(id) && !gone })
	const list = useListReturn('bookmarks')
	// the last record stays in hand while the next one loads, so it has to be the one the address names
	if (id && existing.data?.id !== id) {
		if (existing.error) return (
			<div className="sp-stack sp-gap-12">
				<Failed what={phrase('bookmark.this')} error={existing.error} onRetry={existing.refresh}
					back={{ to: list, label: phrase('bookmark.openList') }} />
			</div>
		)
		return <BookmarkFields key="loading" bookmark={LOADING} loading onGone={setGone} />
	}
	return <BookmarkFields key={id ?? 'new'} bookmark={id ? existing.data ?? null : null} onGone={setGone} />
}

// the form while the bookmark is on its way: an existing record's form, every value held by a skeleton
const LOADING = { id: null, url: '', name: '', price: null, categories: [], archived: false, photoId: null, createdAt: null }

function BookmarkFields({ bookmark, loading = false, onGone }) {
	const phrase = usePhrase()
	const navigate = useNavigate()
	const toast = useToast()
	const editing = Boolean(bookmark)
	const touch = useShellShape() === 'touch'
	const list = useListReturn('bookmarks')
	const h = loading ? hold : control => control
	// a value in the summary while the bookmark loads: a bar the width it will take
	const v = (value, w) => (loading ? <Skeleton shape="end" data-w={w} data-h="13" /> : value)

	const [url, setUrl] = useState(bookmark?.url ?? '')
	const [name, setName] = useState(bookmark?.name ?? '')
	const [price, setPrice] = useState(bookmark?.price ?? null)
	const [chosen, setChosen] = useState(bookmark?.categories ?? [])
	const [errors, setErrors] = useState({})
	const [saving, setSaving] = useState(false)
	// the bookmark was deleted after this page opened it: what the save said, and nothing left to save
	const [lost, setLost] = useState(null)
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
	const leave = () => { guard.release(); navigate(list) }

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
			if (!editing) toast({ message: phrase('bookmark.addedToast', { name: saved.name }) })
			leave()
		} catch (e) {
			setSaving(false)
			if (editing && isGone(e)) { guard.release(); return setLost(failureMessage(e, '')) }
			sayFailure(toast, e, phrase('bookmark.notSaved'))
		}
	}

	const archive = async () => {
		try {
			await setBookmarkArchived(bookmark.id, !archived)
			setArchived(!archived)
			toast({
				message: phrase(archived ? 'bookmarks.back' : 'bookmarks.archived', { name: bookmark.name }),
				undo: { label: phrase('action.undo'), onClick: () => setBookmarkArchived(bookmark.id, archived) }
			})
			leave()
		} catch (e) {
			if (isGone(e)) { guard.release(); return setLost(failureMessage(e, '')) }
			sayFailure(toast, e, phrase('library.notChanged'))
		}
	}

	const remove = async () => {
		setBusy(true)
		onGone(true)
		try {
			await deleteBookmark(bookmark.id).catch(e => { if (!isGone(e)) throw e })
			toast({ message: phrase('bookmarks.deleted', { name: bookmark.name }) })
			leave()
		} catch (e) {
			onGone(false)
			setBusy(false)
			setConfirming(false)
			sayFailure(toast, e, phrase('bookmarks.notDeleted'))
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
			<CardHeader name={phrase('bookmark.card')} />
			<Field label={phrase('bookmark.picture')} id="bookmark-picture">
				{h(<Slot start src={picture} kind={phrase('slot.photo')} name={phrase('bookmark.thePicture')} onFile={choose}
					onRemove={() => { setPicked(null); setOffered(null); setCleared(true) }} />)}
			</Field>
			<Field label={phrase('bookmark.link')} id="bookmark-url"
				message={errors.url || phrase(editing ? 'bookmark.linkHelp' : 'bookmark.linkHelpNew')}
				messageType={errors.url ? 'danger' : 'hint'}>
				{h(<TextField value={url} inputMode="url" autoFocus={!touch}
					onChange={setUrl}
					onBlur={ev => { mark('url', ev.target.value); readPage(ev.target.value) }}
					onPaste={ev => {
						// a pasted link replaces the field, without the tracking that brought it here
						const clean = httpUrl(ev.clipboardData.getData('text'))
						if (!clean) return
						ev.preventDefault()
						setUrl(clean)
					}} />)}
			</Field>
			<Field label={phrase('field.name')} id="bookmark-name" message={errors.name || undefined} messageType={errors.name ? 'danger' : 'hint'}>
				{h(<TextField value={name} onChange={setName} onBlur={ev => mark('name', ev.target.value)} />)}
			</Field>
			<div className="sp-fields">
				<Field label={phrase('bookmark.price')} id="bookmark-price" unit={currencySymbol()} message={phrase('bookmark.priceHelp')}>
					{h(<NumberField value={price} onChange={setPrice} decimals={0} min={0} locale={NUMBER_LOCALE} />)}
				</Field>
				<Field label={phrase('field.categories')} id="bookmark-categories" message={phrase('bookmark.categoriesHelp')}>
					{h(<CategoryTokens value={chosen} onChange={setChosen} />)}
				</Field>
			</div>
		</Card>
	)
	const summaryCard = (
		<Card>
			<CardHeader name={phrase('bookmark.summary')} />
			<div className="sp-stack">
				<Sum value={v(site || '-', '88')}>{phrase('bookmark.shop')}</Sum>
				<Sum value={v(chosen.length ? chosen.join(', ') : '-', '104')}>{phrase('field.categories')}</Sum>
				{editing ? <Sum value={loading ? v(null, '76') : shortDate(bookmark.createdAt)}>{phrase('bookmark.added')}</Sum> : null}
				<Sum value={v(price != null ? currency(price, 0) : '-', '64')}>{phrase('bookmark.price')}</Sum>
			</div>
			{loading
				? hold(<Button variant="outline" size="small">{phrase('bookmark.openShop')}</Button>)
				: href
					? <Button variant="outline" size="small" href={href} target="_blank" rel="noopener noreferrer"><span className="sp-truncate">{phrase('vendor.openNamed', { name: site })}</span></Button>
					: null}
		</Card>
	)
	const endOfLife = editing
		? (
			<Card footerLayout="split" footerCommits footer={[
				h(<Button key="archive" variant="outline" onClick={() => guard.ask(archive)}>{phrase(archived ? 'library.unarchive' : 'library.archive')}</Button>),
				h(<Button key="delete" color="danger" onClick={() => setConfirming(true)}>{phrase('action.delete')}</Button>)
			]}>
				<CardHeader name={phrase('vendor.end')} />
				<Well>
					<span className="sp-title">{phrase('bookmark.end')}</span>
					<span className="sp-subtitle">{phrase('bookmark.endBody')}</span>
				</Well>
			</Card>
		)
		: null
	// a phone always shows its save bar, since it stands in the tab bar's place (Mobile 5b)
	const bar = touch || !editing || dirty
		? (
			<CommitBar status={!editing ? phrase('form.state.nothingYet') : dirty ? phrase('form.state.unsaved') : null} quiet={!editing}
				onCancel={() => navigate(list)} onSave={lost ? null : save}
				commit={phrase(touch ? (editing ? 'action.save' : 'action.create') : editing ? 'bookmark.save' : 'bookmark.add')} saving={saving} disabled={loading} />
		)
		: null
	const prompt = (
		<>
			<Leaving>{guard.prompt}</Leaving>
			<Leaving>{confirming
				? (
					<ConfirmDelete title={phrase('library.deleteTitle', { name: bookmark.name })} action={phrase('bookmarks.delete')} busy={busy}
						onConfirm={remove} onCancel={() => setConfirming(false)}>
						{bookmarkDeleteNote(bookmark)}
					</ConfirmDelete>
				)
				: null}</Leaving>
		</>
	)

	// a phone has no rail: the form, then the end-of-life card, then the bar it commits from (Mobile 5b)
	return (
		<>
			<RecordPage notice={lost ? <GoneNotice message={lost} list={{ to: list, label: phrase('bookmark.openList') }} /> : null}
				cards={form} rail={<>{summaryCard}{endOfLife}</>} alone={endOfLife} bar={bar} />
			<Leaving>{prompt}</Leaving>
		</>
	)
}
