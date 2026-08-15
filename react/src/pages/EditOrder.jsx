import { Fragment, useCallback, useMemo, useRef, useState } from 'react'
import { Sep } from '../components/Sep.jsx'
import { useNavigate, useParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import { InsetPanel, ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { useReorder } from '../components/Reorder.jsx'
import { useRowDelete } from '../components/FormPage.jsx'
import {
	DateInput, Field, FieldPair, FieldShell, FieldUnit, FilterSection, FilterSectionBody,
	Form, FormActions, FormStatus, Segmented, Switch, TextArea, TextInput,
	focusField, needFixing, useFieldErrors
} from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { useApi, invalidate } from '../api/useApi.js'
import {
	addItemAttachments, createVendor, getCategories, getHomeContent, getHomeHero,
	getOrderAsDraft, getOrders, getOrdersOverview, getStats, getVendors, getVendorsOverview,
	itemAttachmentThumbnailUrl, spendKinds, updateOrder
} from '../api/client.js'
import { ITEM_FIELDS, ORDER_FIELDS } from '../api/rules.js'
import { amount, kr, parseAmount, percent, today, sep } from '../api/format.js'

/* Editing an order, whole.

   New order is a wizard on purpose: a brand-new draft has no items, so step 1 collects the
   facts an item form needs (there is nothing to attach a photo to yet) and step 2 is the only
   place those items can be added. An edit starts from an order that already has both halves --
   there is no reason left to force the same two-page walk, and "Add the items" printed over
   lines that are being edited, not added, said something false every time it was read. This
   page is not the wizard with a flag on it: it is its own layout, and it saves everything --
   details and items -- in the one call updateOrder already accepts as one draft.

   The total in the rail is not "Total est." here either. An estimate is a number about to
   change before anything is saved; every kroner on this page already belongs to a real order,
   so the figure is a fact about what was entered, and is printed as one. */

const BLANK_ITEM = { 'item-description': '', 'item-quantity': '', 'item-price': '', 'item-retail': '' }

export default function EditOrder() {
	const { id } = useParams()
	const state = useApi(getOrderAsDraft, [id])
	return (
		<Page>
			<Async state={state} label="Loading the order">
				{seed => <EditOrderForm id={id} seed={seed} />}
			</Async>
		</Page>
	)
}

function EditOrderForm({ id, seed }) {
	const navigate = useNavigate()
	const toast = useToast()
	const vendors = useApi(getVendors)
	const categories = useApi(getCategories)

	const [draft, setDraft] = useState(seed)
	const update = useCallback(patch => setDraft(prev => ({ ...prev, ...patch })), [])

	const [more, setMore] = useState(Boolean(seed.shipping || seed.reference || seed.note))
	const [status, setStatus] = useState({ message: '', good: true })
	const [saving, setSaving] = useState(false)

	const orderValues = useMemo(() => ({
		'order-vendor': draft.vendor, 'order-date': draft.date,
		'order-kind': draft.kind, 'order-shipping': draft.shipping
	}), [draft])
	const orderErrors = useFieldErrors(ORDER_FIELDS, orderValues)
	const set = (name, key) => v => { update({ [key]: v }); orderErrors.recheck(name, v) }

	const addVendor = name => {
		const clean = String(name).trim()
		if (!clean) return
		createVendor(clean)
			.then(vendor => {
				invalidate(getVendors); invalidate(getVendorsOverview)
				vendors.refresh()
				update({ vendor: vendor.name })
				orderErrors.recheck('order-vendor', vendor.name)
				toast(`${vendor.name} added to your vendors.`)
			})
			.catch(e => toast(e.message, 'negative'))
	}

	const [categoryQuery, setCategoryQuery] = useState('')
	const addCategory = name => {
		const clean = String(name).trim()
		if (clean && !draft.categories.includes(clean)) update({ categories: [...draft.categories, clean] })
	}

	/* ---- items ---- */

	const [itemForm, setItemForm] = useState(BLANK_ITEM)
	const [itemStatus, setItemStatus] = useState({ message: '', good: true })
	const [editingId, setEditingId] = useState(null)
	const [photo, setPhoto] = useState(null)
	/* Keyed by item id, same as New order's own item step: a photo picked here is only bytes
	   until save() below has an order to attach it to. See NewOrder.jsx's own note on this. */
	const [pendingPhotos, setPendingPhotos] = useState({})
	const nextId = useRef(0)

	const itemErrors = useFieldErrors(ITEM_FIELDS, itemForm)
	const setItem = name => v => { setItemForm(f => ({ ...f, [name]: v })); itemErrors.recheck(name, v) }

	const clearItemForm = useCallback(() => {
		setItemForm(BLANK_ITEM)
		setEditingId(null)
		setPhoto(null)
		itemErrors.clear()
		focusField('item-description')
	}, [itemErrors])

	const editItem = item => {
		setEditingId(item.id)
		setPhoto(pendingPhotos[item.id]?.file ?? null)
		setItemForm({
			'item-description': item.title,
			'item-quantity': String(item.quantity),
			'item-price': amount(item.price),
			'item-retail': item.retail != null ? amount(item.retail) : ''
		})
		itemErrors.clear()
		toast(`Editing ${item.title}. The form above holds it.`)
		focusField('item-description')
	}

	const reorder = useReorder({
		items: draft.items,
		describe: item => item.title,
		onAnnounce: toast,
		onReorder: (from, to) => {
			const items = [...draft.items]
			const [moved] = items.splice(from, 1)
			items.splice(to, 0, moved)
			update({ items })
		}
	})

	const removeItem = item => {
		update({ items: draft.items.filter(i => i.id !== item.id) })
		setPendingPhotos(prev => {
			if (!prev[item.id]) return prev
			URL.revokeObjectURL(prev[item.id].url)
			const { [item.id]: removed, ...rest } = prev
			return rest
		})
		if (editingId === item.id) clearItemForm()
		toast(`${item.title} removed.`)
	}

	const itemDel = useRowDelete({
		what: 'item',
		label: item => `Delete ${item.title}`,
		detail: item => `${item.title}, ${item.quantity} × ${kr(item.price)}.`,
		onDelete: removeItem
	})

	const submitItem = () => {
		const failed = itemErrors.check()
		if (failed.length) {
			setItemStatus({ message: 'Not added — ' + needFixing(failed), good: false })
			focusField(failed[0].name)
			return
		}
		const item = {
			id: editingId ?? 'new-' + (nextId.current++),
			title: itemForm['item-description'].trim(),
			quantity: Number(itemForm['item-quantity']),
			price: parseAmount(itemForm['item-price']),
			retail: itemForm['item-retail'] ? parseAmount(itemForm['item-retail']) : undefined
		}
		if (photo) {
			setPendingPhotos(prev => {
				if (prev[item.id]) URL.revokeObjectURL(prev[item.id].url)
				return { ...prev, [item.id]: { file: photo, url: URL.createObjectURL(photo) } }
			})
		}
		const items = editingId
			? draft.items.map(i => (i.id === editingId ? item : i))
			: [...draft.items, item]
		const was = editingId
		update({ items })
		clearItemForm()
		const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
		toast(`${item.title} ${was ? 'updated' : 'added'}. Items${sep}${items.length}, ${kr(total)}`)
	}

	/* ---- save, once, for the whole order ---- */

	const save = () => {
		const failedOrder = orderErrors.check()
		if (failedOrder.length) {
			if (failedOrder.some(f => f.name === 'order-shipping')) setMore(true)
			setStatus({ message: 'Cannot save — ' + needFixing(failedOrder), good: false })
			focusField(failedOrder[0].name)
			return
		}
		if (!draft.items.length) {
			setStatus({ message: 'An order needs at least one item.', good: false })
			focusField('item-description')
			return
		}
		setStatus({ message: '', good: true })
		setSaving(true)
		updateOrder(id, draft)
			.then(async order => {
				invalidate(getOrders); invalidate(getHomeContent); invalidate(getOrdersOverview)
				invalidate(getOrderAsDraft); invalidate(getStats); invalidate(getHomeHero)

				const uploads = draft.items
					.map((item, i) => [pendingPhotos[item.id], order.items[i]])
					.filter(([pending, savedItem]) => pending && savedItem)
					.map(([pending, savedItem]) => addItemAttachments(order.id, savedItem.id, [pending.file]))
				if (uploads.length) {
					await Promise.allSettled(uploads).then(results => {
						if (results.some(r => r.status === 'rejected'))
							toast('Order saved, but a photo did not attach.', 'negative')
					})
				}

				navigate(`/orders/${id}`)
			})
			.catch(() => { setSaving(false); toast('That did not save. Try again.', 'negative') })
	}

	const total = draft.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
		+ (draft.shipping ? parseAmount(draft.shipping) : 0)
	const retail = draft.items.reduce((sum, i) => sum + (i.retail ?? i.price) * i.quantity, 0)
	const saved = retail - draft.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

	const vendorField = orderErrors.propsFor('order-vendor')
	const dateField = orderErrors.propsFor('order-date')
	const kindField = orderErrors.propsFor('order-kind')
	const shippingField = orderErrors.propsFor('order-shipping')
	const itemDescription = itemErrors.propsFor('item-description')
	const itemQuantity = itemErrors.propsFor('item-quantity')
	const itemPrice = itemErrors.propsFor('item-price')
	const itemRetail = itemErrors.propsFor('item-retail')

	return (
		<div className="order-list-grid">
			<div className="order-list-column">
				<Card aria-label="Order details">
					<CardBody variant="card-body-page">
						{/* The page-level SAVE at the very foot is still the one that answers "is
						    everything on this page saved" -- this one is the same handler and the
						    same validation, offered again up here so changing just the vendor or a
						    category doesn't cost a scroll past the whole item list to act on it.
						    Paired with the headline alone, not the lead sentence under it too --
						    .space-between wraps under 700px (README: Fields and Forms), and a
						    button sharing a row with a two-line paragraph wraps onto its own line
						    with a gap under it; sharing a row with four words never needs to. */}
						<div className="space-between space-between-top">
							<div className="card-headline">Edit order</div>
							<Button variant="caps compact" onClick={save} disabled={saving}>
								{saving ? 'SAVING...' : 'SAVE'}</Button>
						</div>
						<p className="card-lead">Update the details, the items, or both — everything saves together.</p>
						<FormStatus message={status.message} good={status.good} />
						<Form>
							<Field label="Vendor" error={vendorField.error} errorId={vendorField.errorId}>
								<Combobox id="order-vendor" label="Vendor" required
									placeholder="Search vendors..." value={draft.vendor}
									invalid={vendorField.invalid} describedBy={vendorField.describedBy}
									onChange={set('order-vendor', 'vendor')}
									onSelect={o => { update({ vendor: o.label }); orderErrors.recheck('order-vendor', o.label) }}
									leadingIcon="search"
									groups={[
										{ heading: 'Favourites', options: (vendors.data ?? []).filter(v => v.favourite)
											.map(v => ({ id: v.id, label: v.name, meta: `${v.orders} orders`, star: true })) },
										{ heading: 'All vendors', options: (vendors.data ?? []).filter(v => !v.favourite)
											.map(v => ({ id: v.id, label: v.name, meta: `${v.orders} orders` })) }
									]}
									action={{ icon: 'plus', label: `CREATE VENDOR "${draft.vendor.toUpperCase()}"`,
										onSelect: addVendor }} />
							</Field>

							<FieldPair>
								<Field label="Date" error={dateField.error} errorId={dateField.errorId}>
									<DateInput id="order-date" label="Order date" value={draft.date}
										aria-required="true" trail={draft.date === today() ? 'today' : undefined}
										invalid={dateField.invalid} describedBy={dateField.describedBy}
										onChange={set('order-date', 'date')} />
								</Field>
								<Field label="Status" group>
									<Segmented options={['Ordered', 'Delivered', 'Returned']} value={draft.status}
										onChange={v => update({ status: v })} label="Status" />
								</Field>
							</FieldPair>

							<Field label="Categories" htmlFor="order-categories"
								help="Pick from your categories, or type one and press Enter.">
								<Combobox id="order-categories" label="Add category" placeholder="Add category..."
									chips={draft.categories.map(name => (
										<Chip key={name} label={`Remove category ${name}`}
											onRemove={() => update({ categories: draft.categories.filter(c => c !== name) })}>
											{name}</Chip>
									))}
									value={categoryQuery} onChange={setCategoryQuery}
									onSelect={o => { addCategory(o.label); setCategoryQuery('') }}
									groups={[{ heading: 'Your categories', options: (categories.data ?? [])
										.filter(c => !draft.categories.includes(c.name))
										.map(c => ({ id: c.id, label: c.name, meta: `${percent(c.share)} of expenses` })) }]}
									action={categoryQuery.trim()
										? { icon: 'plus', label: `ADD "${categoryQuery.trim().toUpperCase()}"`,
											onSelect: name => { addCategory(name); setCategoryQuery('') } }
										: undefined} />
							</Field>
							<Field label="Kind" error={kindField.error} errorId={kindField.errorId}
								help="Only expenses count towards your totals.">
								<Combobox id="order-kind" label="Kind" required placeholder="Expense"
									value={draft.kind}
									invalid={kindField.invalid} describedBy={kindField.describedBy}
									onChange={set('order-kind', 'kind')}
									onSelect={o => { update({ kind: o.label }); orderErrors.recheck('order-kind', o.label) }}
									groups={[{ heading: 'Kinds', options: spendKinds.map(k => ({ id: k, label: k })) }]} />
							</Field>

							<FilterSection>
								<div className="space-between">
									<span className="panel-heading">More details?</span>
									<Switch checked={more} onChange={setMore} label="More details"
										controls="more-details-panel" />
								</div>
								<FilterSectionBody id="more-details-panel" hidden={!more}>
									<FieldPair>
										<Field label="Shipping fee" error={shippingField.error} errorId={shippingField.errorId}>
											<FieldShell>
												<TextInput id="order-shipping" inputMode="decimal" placeholder="0,00"
													aria-label="Shipping fee" value={draft.shipping}
													invalid={shippingField.invalid} describedBy={shippingField.describedBy}
													onChange={set('order-shipping', 'shipping')} />
												<FieldUnit>kr.</FieldUnit>
											</FieldShell>
										</Field>
										<Field label="Order reference">
											<FieldShell>
												<TextInput placeholder="Optional" aria-label="Order reference"
													value={draft.reference} onChange={v => update({ reference: v })} />
											</FieldShell>
										</Field>
									</FieldPair>
									<Field label="Note">
										<TextArea aria-label="Note" value={draft.note}
											placeholder="Anything worth remembering about this purchase."
											onChange={v => update({ note: v })} />
									</Field>
								</FilterSectionBody>
							</FilterSection>
						</Form>
					</CardBody>
				</Card>

				<Card aria-label="Items">
					<CardHeader title={`Items${sep}${draft.items.length}`} />
					<CardDivider />
					<CardBody variant="card-body-tight">
						<Form>
						<FilterSection
							onKeyDown={e => {
								if (!(e.target instanceof HTMLInputElement)) return
								if (e.key === 'Enter') { e.preventDefault(); submitItem() }
								else if (e.key === 'Escape') {
									e.preventDefault(); e.stopPropagation()
									clearItemForm(); setItemStatus({ message: '', good: true })
								}
							}}>
							<FormStatus message={itemStatus.message} good={itemStatus.good} />
							<Field label="Description" error={itemDescription.error} errorId={itemDescription.errorId}>
								<FieldShell>
									<TextInput id="item-description" aria-label="Description" aria-required="true"
										value={itemForm['item-description']} onChange={setItem('item-description')}
										invalid={itemDescription.invalid}
										describedBy={itemDescription.describedBy} />
								</FieldShell>
							</Field>

							<FieldPair>
								<Field label="Quantity" error={itemQuantity.error} errorId={itemQuantity.errorId}>
									<FieldShell>
										<TextInput id="item-quantity" inputMode="numeric" aria-label="Quantity"
											aria-required="true" value={itemForm['item-quantity']}
											onChange={setItem('item-quantity')}
											invalid={itemQuantity.invalid} describedBy={itemQuantity.describedBy} />
										<FieldUnit>pcs</FieldUnit>
									</FieldShell>
								</Field>
								<Field label="Price paid" error={itemPrice.error} errorId={itemPrice.errorId}>
									<FieldShell>
										<TextInput id="item-price" inputMode="decimal" aria-label="Price paid"
											aria-required="true" value={itemForm['item-price']}
											onChange={setItem('item-price')}
											invalid={itemPrice.invalid} describedBy={itemPrice.describedBy} />
										<FieldUnit>kr.</FieldUnit>
									</FieldShell>
								</Field>
							</FieldPair>

							<FieldPair>
								<Field label="Retail price" error={itemRetail.error} errorId={itemRetail.errorId}
									help="Optional. Powers the saved-vs-retail figures.">
									<FieldShell>
										<TextInput id="item-retail" inputMode="decimal" placeholder="104,95"
											aria-label="Retail price" value={itemForm['item-retail']}
											onChange={setItem('item-retail')}
											invalid={itemRetail.invalid} describedBy={itemRetail.describedBy} />
										<FieldUnit>kr.</FieldUnit>
									</FieldShell>
								</Field>
								<Field label="Photo"
									help="Optional. The photo shows on the item row below, not in the form.">
									<FieldShell as="label">
										<span className="field-thumb" aria-hidden="true"><Icon name="photo" /></span>
										<input type="file" accept="image/*" aria-label="Product photo"
											className="field-file-input"
											onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
										<span className="field-file-name">{photo?.name ?? 'Choose a photo...'}</span>
										{photo ? (
											<IconButton variant="clear" icon="close" label="Remove photo"
												onClick={e => { e.preventDefault(); setPhoto(null) }} />
										) : null}
									</FieldShell>
								</Field>
							</FieldPair>

							<FormActions>
								<Button variant="caps compact" icon={editingId ? 'check' : 'plus'} onClick={submitItem}>
									{editingId ? 'SAVE CHANGES' : 'ADD ITEM'}</Button>
								{editingId
									? <Button variant="ghost compact" onClick={() => {
										clearItemForm(); setItemStatus({ message: '', good: true })
									}}>CANCEL EDIT</Button>
									: null}
								<span className="field-help form-actions-note">
									Enter {editingId ? 'saves' : 'adds'} and keeps the form; Escape clears it.</span>
							</FormActions>
						</FilterSection>

						<div>
							<div className="space-between space-between-tight">
								<span className="section-label">Lines<Sep />{draft.items.length}</span>
								<span className="field-help">drag the grip to reorder</span>
							</div>
							<InsetPanel {...reorder.listProps}>
								{draft.items.map((item, i) => {
									const pending = pendingPhotos[item.id]
									const existing = item.attachments?.[0]
									const hasPhoto = Boolean(pending || existing)
									const thumbSrc = pending ? pending.url
										: existing?.hasThumbnail ? itemAttachmentThumbnailUrl(id, item.id, existing.id)
										: undefined
									return (
										<Fragment key={item.id}>
										{reorder.placeholder(item)}
										<ItemRow icon={hasPhoto ? undefined : 'cube'} thumb={hasPhoto ? 'photo' : undefined} thumbSrc={thumbSrc}
											title={item.title}
											handle={draft.items.length > 1 ? reorder.handle(item, i) : null}
											meta={`${item.quantity} × ${kr(item.price)}`
												+ (item.retail ? `${sep}retail ${kr(item.retail)}` : '')}
											amount={kr(item.price * item.quantity)}
											{...reorder.rowProps(item)}>
											<span className="row-inline row-actions">
												<IconButton icon="pencil" label={`Edit ${item.title}`}
													onClick={() => editItem(item)} />
												{itemDel.iconButton(item)}
											</span>
										</ItemRow>
										</Fragment>
									)
								})}
								{draft.items.length === 0
									? <p className="field-help inset-panel-note">
										No items yet. Add the first one above.</p>
									: null}
							</InsetPanel>
							{itemDel.dialog}
						</div>
						</Form>
					</CardBody>
				</Card>

				<FormActions split>
					<Button variant="ghost" onClick={() => navigate(`/orders/${id}`)}>CANCEL</Button>
					<Button variant="caps" onClick={save} disabled={saving}>
						{saving ? 'SAVING...' : 'SAVE'}</Button>
				</FormActions>
			</div>

			<div className="order-list-column">
				<Card aria-label="Order summary">
					<CardBody>
						<div className="card-subheading">Order summary</div>
						<span className="section-label">Order details</span>
						<div className="summary-row">Vendor<span className="summary-row-value">{draft.vendor}</span></div>
						<div className="summary-row">Status<span className="summary-row-value">{draft.status}</span></div>
						<div className="summary-row">Categories
							<span className="summary-row-value">{draft.categories.join(', ') || '—'}</span></div>
						<div className="summary-row">Kind<span className="summary-row-value">{draft.kind}</span></div>
						<SummaryRow label="Shipping" value={kr(draft.shipping ? parseAmount(draft.shipping) : 0)} />
						<span className="section-label section-label-break">Items</span>
						{draft.items.map(item => (
							<SummaryRow key={item.id} className="summary-row-item"
								label={`${item.title} × ${item.quantity}`}
								value={kr(item.price * item.quantity)} />
						))}
						<div className="card-divider card-divider-tight" />
						{/* No `estimate` here, and no "est." in the label -- every line above is a
						    real entry against a real order, not a preview of one still being built. */}
						<SummaryTotal value={kr(total)} />
						{saved > 0 ? (
							<span className="field-help summary-saved">
								saved {kr(saved)} vs retail ({percent(saved / retail * 100)})
							</span>
						) : null}
					</CardBody>
				</Card>

				<Card aria-label="Tips">
					<CardHeader title="Good to know" />
					<CardDivider />
					<CardBody>
						<InsetPanel>
							<ItemRow icon="reorder" title="Drag to reorder"
								meta="Or focus the grip and use the arrow keys." />
							<ItemRow icon="pencil" title="Edit in place"
								meta="A line loads back into the form above." />
							<ItemRow icon="undo" title="Escape cancels"
								meta="It empties the form and drops the edit." />
						</InsetPanel>
					</CardBody>
				</Card>
			</div>
		</div>
	)
}
