import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Card, CardBody } from '../components/Card.jsx'
import { Chip } from '../components/Chip.jsx'
import { ImageOrIcon } from '../components/Icon.jsx'
import { EntityRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { DeleteCard, FormPage, RecordWait, useDelete } from '../components/FormPage.jsx'
import { LinePhoto, useDroppedPhoto } from '../components/LinePhoto.jsx'
import {
	CheckRow, Field, FieldShell, FieldUnit, TextInput, focusField, useFieldErrors
} from '../components/Form.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { useToast } from '../components/Toast.jsx'
import { useApi } from '../api/useApi.js'
import { WISH_FIELDS, httpUrl, siteOf } from '../api/rules.js'
import {
	addWishPhoto, createWish, deleteWish, failureMessage, getCategories, getWish,
	invalidateWishData, removeWishPhoto, updateWish, wishPhotoThumbnailUrl
} from '../api/client.js'
import { amount, currency, currencySymbol, longDate, parseAmount, percent } from '../api/format.js'

/* A wish, on its own page -- the same page component as a vendor, a category and an order,
   because there is one way to edit a record in this app rather than one per screen.

   A wish is a record, not part of one. That is the whole distinction the shape follows: an
   order's lines are edited in place because a line is a piece of the order being edited and
   has no life without it, while a wish stands on its own -- it is created, corrected, archived
   and deleted by itself, exactly as a vendor is. So it is created and edited here, and the
   wishlist is only ever a list. See components/FormPage.jsx.

   And it is not an order. Nothing saved here reaches a total, a chart or a budget: those all
   read the orders table as money that has already left the account. */

export default function WishForm({ mode = 'create' }) {
	const { id } = useParams()
	const existing = useApi(getWish, [id], { enabled: mode === 'edit' })

	if (mode === 'edit' && !existing.data) {
		return <RecordWait state={existing} label="Loading the wish" />
	}
	return <WishFields mode={mode} wish={existing.data ?? null} />
}

function WishFields({ mode, wish }) {
	const navigate = useNavigate()
	const toast = useToast()
	const categories = useApi(getCategories)

	const [name, setName] = useState('')
	const [url, setUrl] = useState('')
	const [price, setPrice] = useState('')
	const [chosen, setChosen] = useState([])
	const [categoryQuery, setCategoryQuery] = useState('')
	const [archived, setArchived] = useState(false)
	const [saving, setSaving] = useState(false)
	/* The picture chosen in this session, and whether the stored one was taken away. Both are
	   this form's, not the record's: a wish being created has no id to hang a file on yet, so
	   the bytes travel after the record exists (see save below). */
	const [picked, setPicked] = useState(null)
	const [cleared, setCleared] = useState(false)

	useEffect(() => {
		if (!wish) return
		setName(wish.name)
		setUrl(wish.url)
		setPrice(wish.price != null ? amount(wish.price) : '')
		setChosen(wish.categories ?? [])
		setArchived(Boolean(wish.archived))
	}, [wish])

	// The preview belongs to this page and is revoked with it.
	useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.url) }, [picked])

	const values = useMemo(() => ({ 'wish-name': name, 'wish-url': url, 'wish-price': price }),
		[name, url, price])
	const { check, recheck, propsFor } = useFieldErrors(WISH_FIELDS, values)
	const nameField = propsFor('wish-name')
	const urlField = propsFor('wish-url')
	const priceField = propsFor('wish-price')

	const drop = useDroppedPhoto(file => { setPicked({ file, url: URL.createObjectURL(file) }); setCleared(false) })
	const photo = picked ? { present: true, src: picked.url }
		: cleared || !wish?.photoId ? {}
		: { present: true, src: wishPhotoThumbnailUrl(wish.id, wish.photoId) }

	const addCategory = value => {
		const clean = String(value).trim()
		if (clean && !chosen.includes(clean)) setChosen([...chosen, clean])
		setCategoryQuery('')
	}

	/** The record first, then its picture -- the bytes go against a real id, so a wish being
	    created has to exist before its own photo can be attached to it. The same order the
	    order form uploads a line's photo in. */
	const save = async () => {
		const failed = check()
		if (failed.length) { focusField(failed[0].name); return }
		setSaving(true)
		const draft = { name: name.trim(), url: url.trim(), price: price.trim(), categories: chosen, archived }
		try {
			const saved = mode === 'edit' ? await updateWish(wish.id, draft) : await createWish(draft)
			if (picked) await addWishPhoto(saved.id, picked.file)
			else if (cleared) await removeWishPhoto(saved.id)
			invalidateWishData()
			toast(`${saved.name} ${mode === 'edit' ? 'saved' : 'added'}.`)
			navigate('/wishlist')
		} catch (e) {
			setSaving(false)
			toast(failureMessage(e, 'That did not save. Try again.'), 'negative')
		}
	}

	const del = useDelete({
		what: 'wish',
		detail: wish ? `${wish.name}, from ${siteOf(wish.url)}.` : '',
		onDelete: () => deleteWish(wish.id)
			.then(() => { invalidateWishData(); toast(`${wish.name} removed.`); navigate('/wishlist') })
			.catch(e => toast(failureMessage(e, 'That did not delete.'), 'negative'))
	})

	return (
		<FormPage
			title={mode === 'edit' ? 'Edit wish' : 'New wish'}
			lead={mode === 'edit'
				? 'What it is, where to buy it, and what it costs today.'
				: 'Something you are thinking about buying. It goes on your wishlist, and counts towards nothing you have spent.'}
			cancel={{ to: '/wishlist' }}
			submit={{
				label: saving ? 'SAVING...' : mode === 'edit' ? 'SAVE CHANGES' : 'ADD WISH',
				onClick: save, disabled: saving
			}}
			rail={
				<>
					<WishSummary name={name} url={url} price={price} categories={chosen}
						archived={archived} photo={photo} wish={wish} />
					{mode === 'edit' ? (
						<DeleteCard what="wish" del={del}>
							Nothing else points at a wish, so removing one takes only the wish itself.
							To keep it without it being on your list, archive it instead.
						</DeleteCard>
					) : null}
				</>
			}>

			<Field label="Name" error={nameField.error} errorId={nameField.errorId} htmlFor="wish-name">
				<FieldShell>
					<TextInput id="wish-name" value={name} autoFocus
						onChange={v => { setName(v); recheck('wish-name', v) }}
						aria-label="Wish name" aria-required="true"
						invalid={nameField.invalid} describedBy={nameField.describedBy}
						onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }} />
				</FieldShell>
			</Field>

			<Field label="Link" error={urlField.error} errorId={urlField.errorId} htmlFor="wish-url"
				help="The page you would buy it on. You can leave out the https://">
				<FieldShell>
					<TextInput id="wish-url" value={url} inputMode="url" placeholder="shop.dk/product"
						onChange={v => { setUrl(v); recheck('wish-url', v) }}
						aria-label="Link" aria-required="true"
						invalid={urlField.invalid} describedBy={urlField.describedBy}
						onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }} />
				</FieldShell>
			</Field>

			<Field label="Price" optional error={priceField.error} errorId={priceField.errorId}
				htmlFor="wish-price"
				help="What the shop asks for it today. Left empty means you have not looked it up yet — which is not the same as free, so an empty price is left out of every total.">
				<FieldShell>
					<TextInput id="wish-price" value={price} inputMode="decimal"
						onChange={v => { setPrice(v); recheck('wish-price', v) }}
						aria-label="Price"
						invalid={priceField.invalid} describedBy={priceField.describedBy}
						onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }} />
					<FieldUnit>{currencySymbol()}</FieldUnit>
				</FieldShell>
			</Field>

			{/* htmlFor for the reason every chips field in the app has one: the chips are
			    labelable and come first, so without it the label points at the first chip's
			    remove button and a tap on the chevron deletes a category. See components/Form.jsx. */}
			<Field label="Categories" optional htmlFor="wish-categories"
				help="Where this would land if you bought it. Pick from your categories, or type one and press Enter. A wish counts towards no category's spending — only orders do.">
				<Combobox id="wish-categories" label="Add category" placeholder="Add category..."
					chips={chosen.map(c => (
						<Chip key={c} label={`Remove category ${c}`}
							onRemove={() => setChosen(chosen.filter(x => x !== c))}>{c}</Chip>
					))}
					value={categoryQuery} onChange={setCategoryQuery}
					onSelect={o => addCategory(o.label)}
					groups={[
						{ heading: 'Favourites', options: (categories.data ?? [])
							.filter(c => c.favourite && !chosen.includes(c.name))
							.map(c => ({ id: c.id, label: c.name, meta: `${percent(c.share)} of expenses`, star: true })) },
						{ heading: 'All categories', options: (categories.data ?? [])
							.filter(c => !c.favourite && !chosen.includes(c.name))
							.map(c => ({ id: c.id, label: c.name, meta: `${percent(c.share)} of expenses` })) }
					]}
					action={categoryQuery.trim()
						? { icon: 'plus', label: `ADD "${categoryQuery.trim().toUpperCase()}"`,
							onSelect: addCategory }
						: undefined} />
			</Field>

			{/* The picture is a field like the colour picker on a vendor: `group`, because what
			    labels it is the group's own label and not an input. The frame is the one the
			    order line card draws (components/LinePhoto.jsx) -- one picture control in the
			    app, not one per screen -- and the drop target is this whole block rather than
			    the 128px frame alone. */}
			<Field label="Picture" optional group
				help="Click the frame to choose a picture, or drop one here — a photo of the thing, or the picture from the shop's own page.">
				<div className={drop.over ? 'wish-photo-field is-dragover' : 'wish-photo-field'}
					{...drop.dropProps}>
					<LinePhoto photo={photo} label="Picture of this wish"
						onPick={file => { setPicked({ file, url: URL.createObjectURL(file) }); setCleared(false) }}
						onClear={() => { setPicked(null); setCleared(true) }} />
				</div>
			</Field>

			{/* Only where there is a record to put away: a wish being created is one you want
			    now, so "archived" on a new-wish form is a state nobody would choose. Archived is
			    a field on the record rather than a button on the list row, the same way a
			    vendor's Favourite is: the list filters on it, the form sets it. */}
			{mode === 'edit' ? (
				<CheckRow id="wish-archived" checked={archived} onChange={setArchived}
					label="Archived"
					help="Keeps the wish without it being on your wishlist — for something you bought elsewhere, or decided against. Archived wishes are left out of the list until you ask for them in the filters." />
			) : null}
		</FormPage>
	)
}

/** The rail card that mirrors the form: the row as the wishlist will draw it, then its values.
    No spend total, because a wish has never cost anything -- the figure it does have is what
    the shop asks today. */
function WishSummary({ name, url, price, categories, archived, photo, wish }) {
	const site = url.trim() ? siteOf(url) : ''
	// Only an address a browser can follow becomes a link -- httpUrl is the same rule the field
	// validates with, so the rail cannot offer a link the form would have refused.
	const href = httpUrl(url)
	const asNumber = price.trim() ? parseAmount(price) : null
	return (
		<Card aria-label="Wish summary">
			<CardBody>
				<div className="card-subheading">Wish summary</div>
				<span className="section-label">How it will look</span>
				{/* The row the wishlist will draw, drawn by the same component -- a preview that is
				    a second arrangement of the same parts is one that can disagree with the list. */}
				<div className="summary-preview">
					<EntityRow
						mark={<span className="document-thumb">
							<ImageOrIcon src={photo.src ?? ''} icon="photo" imgClassName="document-thumb-img" /></span>}
						name={name.trim() || 'Your wish'}
						meta={site || 'no link yet'}
						amount={asNumber != null && Number.isFinite(asNumber) ? currency(asNumber) : '-'} />
				</div>
				<div className="summary-row">Shop<span className="summary-row-value">{site || '-'}</span></div>
				<div className="summary-row">Categories
					<span className="summary-row-value">{categories.length ? categories.join(', ') : '-'}</span></div>
				<div className="summary-row">Picture
					<span className="summary-row-value">{photo.present ? 'Yes' : 'No'}</span></div>
				{wish ? <SummaryRow label="Added" value={longDate(wish.createdAt)} /> : null}
				<div className="summary-row">On your wishlist
					<span className="summary-row-value">{archived ? 'No, archived' : 'Yes'}</span></div>
				<div className="card-divider card-divider-tight" />
				{/* An asking price, not a spend: the estimate mark says the figure is what the
				    shop wants, not something this account has paid. */}
				<SummaryTotal label="Price today"
					value={asNumber != null && Number.isFinite(asNumber) ? currency(asNumber) : '-'} estimate />
				<span className="field-help">
					A wish is not an order. Nothing here is counted in your spending, your charts or
					your budgets.
				</span>
				{/* The way to the shop, on the page that holds every other action on this record --
				    a real link at the foot, the way the vendor page ends in VIEW ORDERS. Only
				    once the address is one a browser can follow. */}
				{href ? (
					<Button variant="block" icon="externalLink" href={href}
						target="_blank" rel="noopener noreferrer">OPEN {site.toUpperCase()}</Button>
				) : null}
			</CardBody>
		</Card>
	)
}