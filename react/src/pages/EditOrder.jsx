import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import { Card, CardBody, CardDivider, CardHeader, Note } from '../components/Card.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { Button } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { InsetPanel, ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { ItemLines } from '../components/ItemLines.jsx'
import {
	DateInput, Field, FieldPair, FieldShell, Form, FormActions, NumberInput, Segmented, TextArea,
	TextInput, focusField, useFieldErrors
} from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { useApi } from '../api/useApi.js'
import { useVendorPicker } from '../api/useVendorPicker.js'
import {
	addItemAttachments, categoriesForVendor, createOrder, failureMessage, getCategories,
	getOrderAsCopy, getOrderAsDraft, getVendors, invalidateOrderData, itemAttachmentThumbnailUrl,
	orderStatuses, removeItemAttachment, spendKinds, updateOrder
} from '../api/client.js'
import { DELIVERED_DATE_FIELD, ORDER_FIELDS, RETURNED_DATE_FIELD } from '../api/rules.js'
import { currency, currencySymbol, longDate, parseAmount, percent, sep, today } from '../api/format.js'
import { categoryGroups } from '../api/pickerGroups.js'

/* Editing an order, whole.

   New order is a wizard on purpose: a brand-new draft has no items, so step 1 collects the
   facts an item form needs (there is nothing to attach a photo to yet) and step 2 is the only
   place those items can be added. An edit starts from an order that already has both halves --
   there is no reason left to force the same two-page walk, and "Add the items" printed over
   lines that are being edited, not added, said something false every time it was read. This
   page is not the wizard with a flag on it: it is its own layout, and it saves everything --
   details and items -- in the one call updateOrder already accepts as one draft.

   The total in the rail is not "Estimated total" when an order is being edited. An estimate is
   a number about to change before anything is saved; every kroner of a saved order already
   belongs to a real one, so the figure is a fact about what was entered. A copy has not been
   saved yet, and there the estimate is the honest reading.

   Copying an order is this page again, seeded differently and saving through the other door:
   the reader gets the same one form for details and items, and the wizard is no use for it --
   a copy arrives with its lines already on it, which is the whole reason the wizard exists.
   What the seed leaves behind (the date, the status, the attachments) is client.js'
   getOrderAsCopy; what this page owes is to say so on screen and to POST rather than PUT.
   README: Copying an Order. */

export default function EditOrder() { return <OrderPage mode="edit" /> }

/** Its own export, so React sees a second component type and unmounts between the two: swapped
    in place, one seeds a frame from the other's shape and the render throws. */
export function CopyOrder() { return <OrderPage mode="copy" /> }

function OrderPage({ mode }) {
	const { id } = useParams()
	const copying = mode === 'copy'
	const state = useApi(copying ? getOrderAsCopy : getOrderAsDraft, [id])
	/* The form seeds once, so it must never be handed an order it is not for. useApi keeps the
	   last answer on screen while an uncached id loads, and the key remounts on a cached one. */
	const loaded = state.loading ? { ...state, data: undefined } : state
	return (
		<Page>
			<Async state={loaded} label={copying ? 'Loading the order to copy' : 'Loading the order'}
				skeleton={<div className="order-list-grid" aria-hidden="true">
					<div className="order-list-column">
						<SkeletonCard lines={4} />
						<SkeletonCard bodyVariant="card-body-tight" lines={5} />
					</div>
					<div className="order-list-column">
						<SkeletonCard lines={3} />
					</div>
				</div>}>
				{seed => copying
					? <OrderForm key={`copy-${id}`} id={id} seed={seed.draft} source={seed.source} />
					: <OrderForm key={`edit-${id}`} id={id} seed={seed} />}
			</Async>
		</Page>
	)
}

function OrderForm({ id, seed, source }) {
	// The order this was copied from, and so the one fact that says this is a copy.
	const copying = Boolean(source)
	const navigate = useNavigate()
	const toast = useToast()
	const vendors = useApi(getVendors)
	const categories = useApi(getCategories)

	const [draft, setDraft] = useState(seed)
	const update = useCallback(patch => setDraft(prev => ({ ...prev, ...patch })), [])

	/* Set only once a save has actually been tried with an empty item list -- validation
	   errors show on submit, not while the list is still being built. It clears itself the
	   moment an item exists, since that is the only fix there is. */
	const [itemsTried, setItemsTried] = useState(false)
	const [saving, setSaving] = useState(false)

	const orderFields = useMemo(() => [
		...ORDER_FIELDS,
		...(draft.status !== 'Ordered' ? [DELIVERED_DATE_FIELD] : []),
		...(draft.status === 'Returned' ? [RETURNED_DATE_FIELD] : [])
	], [draft.status])
	const orderValues = useMemo(() => ({
		'order-vendor': draft.vendor, 'order-date': draft.date,
		'order-kind': draft.kind, 'order-shipping': draft.shipping,
		'order-discount': draft.discount,
		'order-delivered-date': draft.deliveredDate, 'order-returned-date': draft.returnedDate
	}), [draft])
	const orderErrors = useFieldErrors(orderFields, orderValues)
	const set = (name, key) => v => { update({ [key]: v }); orderErrors.recheck(name, v) }

	// Defaults a newly-shown date to today, like the order date field itself, but only when
	// unset -- so toggling status back and forth never overwrites a date already entered.
	const setStatus = v => {
		const patch = { status: v }
		if (v !== 'Ordered' && !draft.deliveredDate) patch.deliveredDate = today()
		if (v === 'Returned' && !draft.returnedDate) patch.returnedDate = today()
		update(patch)
	}

	const pickVendor = name => {
		update({ vendor: name, categories: categoriesForVendor(vendors.data ?? [], name, draft.categories) })
		orderErrors.recheck('order-vendor', name)
	}
	const vendorPicker = useVendorPicker(vendors, draft.vendor, pickVendor, toast)

	const [categoryQuery, setCategoryQuery] = useState('')
	const addCategory = name => {
		const clean = String(name).trim()
		if (clean && !draft.categories.includes(clean)) update({ categories: [...draft.categories, clean] })
	}

	/* ---- items ----
	   The list and the card a line opens into are ItemLines'. What stays here is the one thing
	   this page knows and that component does not: a line on a saved order can already carry a
	   photo on the server, so `photoOf` has two sources to answer from and the component has
	   none of its own. */

	/* Keyed by item id, same as New order's own item step: a photo picked here is only bytes
	   until save() below has an order to attach it to. See NewOrder.jsx's own note on this. */
	const [pendingPhotos, setPendingPhotos] = useState({})
	/* Keyed by item id, holding the attachment id of a photo that was already on the server
	   when the card was opened. Picking a replacement or clearing the photo both mean the same
	   thing for that attachment -- it must not survive the save -- so both stage it here rather
	   than only the pending upload, which is the only thing the old code deleted. */
	const [removedAttachments, setRemovedAttachments] = useState({})

	const photoOf = useCallback(item => {
		const pending = pendingPhotos[item.id]
		if (pending) return { present: true, src: pending.url }
		if (removedAttachments[item.id]) return { present: false }
		const existing = item.attachments?.[0]
		if (!existing) return { present: false }
		return {
			present: true,
			src: existing.hasThumbnail ? itemAttachmentThumbnailUrl(id, item.id, existing.id) : undefined
		}
	}, [pendingPhotos, removedAttachments, id])

	const stageRemoval = itemId => setRemovedAttachments(prev => {
		if (prev[itemId]) return prev
		const existing = draft.items.find(i => i.id === itemId)?.attachments?.[0]
		return existing ? { ...prev, [itemId]: existing.id } : prev
	})

	const pickPhoto = useCallback((itemId, file) => {
		setPendingPhotos(prev => {
			if (prev[itemId]) URL.revokeObjectURL(prev[itemId].url)
			return { ...prev, [itemId]: { file, url: URL.createObjectURL(file) } }
		})
		stageRemoval(itemId)
	}, [draft.items])

	const clearPhoto = useCallback(itemId => {
		setPendingPhotos(prev => {
			if (!prev[itemId]) return prev
			URL.revokeObjectURL(prev[itemId].url)
			const { [itemId]: gone, ...rest } = prev
			return rest
		})
		stageRemoval(itemId)
	}, [draft.items])

	/* ---- save, once, for the whole order ---- */

	const save = () => {
		const failedOrder = orderErrors.check()
		if (failedOrder.length) {
			focusField(failedOrder[0].name)
			return
		}
		if (!draft.items.length) {
			setItemsTried(true)
			/* There is no item form to send anyone to any more, and the empty list's own row is
			   what opens the card that would fix this -- so the verdict points at the control
			   that acts rather than at a field that is not on the page. */
			document.querySelector('.line-add-row')?.focus()
			return
		}
		setSaving(true)
		/* A copy has no record yet, so it is POSTed and lands on an id of its own -- which is why
		   everything below reads the id off the answer and not off the route. */
		const written = copying ? createOrder(draft) : updateOrder(id, draft)
		written
			.then(async order => {
				invalidateOrderData()

				// A copy's lines arrive carrying no attachment, so the removal half finds none.
				const photoOps = draft.items.flatMap((item, i) => {
					const savedItem = order.items[i]
					if (!savedItem) return []
					const removedId = removedAttachments[item.id]
					const pending = pendingPhotos[item.id]
					return [
						...(removedId ? [removeItemAttachment(order.id, savedItem.id, removedId)] : []),
						...(pending ? [addItemAttachments(order.id, savedItem.id, [pending.file])] : [])
					]
				})
				if (photoOps.length) {
					await Promise.allSettled(photoOps).then(results => {
						if (results.some(r => r.status === 'rejected'))
							toast('Order saved, but a photo change did not apply.', 'negative')
					})
				}

				navigate(`/orders/${order.id}`)
			})
			.catch(e => { setSaving(false)
				toast(failureMessage(e, 'That did not save. Try again.'), 'negative') })
	}

	/* Same three formulas the orders table generates (migrations/009) and the new order rail
	   uses: total takes the discount off, and the discount counts as saved against retail. */
	const paid = draft.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
	const discount = draft.discount ? parseAmount(draft.discount) : 0
	const total = paid + (draft.shipping ? parseAmount(draft.shipping) : 0) - discount
	const retail = draft.items.reduce((sum, i) => sum + (i.retail ?? i.price) * i.quantity, 0)
	const saved = retail - paid + discount

	const vendorField = orderErrors.propsFor('order-vendor')
	const dateField = orderErrors.propsFor('order-date')
	const kindField = orderErrors.propsFor('order-kind')
	const shippingField = orderErrors.propsFor('order-shipping')
	const discountField = orderErrors.propsFor('order-discount')
	const deliveredDateField = orderErrors.propsFor('order-delivered-date')
	const returnedDateField = orderErrors.propsFor('order-returned-date')

	/* Where leaving goes, for both of the controls that offer it. A copy has no record of its
	   own to return to, so both send the reader back to the order it was copied from. */
	const leave = () => navigate(`/orders/${id}`)

	return (
		<div className="order-list-grid">
			<div className="order-list-column">
				{/* What carries and what does not, said once -- a missing receipt is the thing a
				    reader would otherwise go looking for. README: Copying an Order. */}
				{copying ? (
					<Note tone="positive" className="space-between" aria-label="Copied order">
						<span>
							<strong>This is a copy.</strong> It came from {source.vendor}
							{', '}{longDate(source.date)}. The vendor, the categories, the note and
							the items are filled in. The date is set to today. Attachments are not
							copied, and nothing is saved until you select SAVE.
						</span>
						<Button variant="ghost compact" onClick={leave}>DISCARD</Button>
					</Note>
				) : null}
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
							<div className="card-headline">{copying ? 'New order' : 'Edit order'}</div>
							<Button variant="caps compact" onClick={save} disabled={saving}>
								{saving ? 'SAVING...' : 'SAVE'}</Button>
						</div>
						<p className="card-lead">{copying
							? 'Change anything that is different this time, then save it.'
							: 'Update the details, the items, or both; everything saves together.'}</p>
						<Form>
							<Field label="Vendor" error={vendorField.error} errorId={vendorField.errorId} htmlFor="order-vendor">
								<Combobox id="order-vendor" label="Vendor" required
									placeholder="Search vendors..." value={draft.vendor}
									invalid={vendorField.invalid} describedBy={vendorField.describedBy}
									onChange={set('order-vendor', 'vendor')}
									onSelect={o => pickVendor(o.label)}
									leadingIcon="search"
									groups={vendorPicker.groups}
									action={vendorPicker.action} />
							</Field>

							<FieldPair>
								<Field label="Date" error={dateField.error} errorId={dateField.errorId} htmlFor="order-date">
									<DateInput id="order-date" label="Order date" value={draft.date}
										aria-required="true" trail={draft.date === today() ? 'today' : undefined}
										invalid={dateField.invalid} describedBy={dateField.describedBy}
										onChange={set('order-date', 'date')} />
								</Field>
								<Field label="Status" group>
									<Segmented options={orderStatuses} value={draft.status}
										onChange={setStatus} label="Status" />
								</Field>
							</FieldPair>

							{draft.status === 'Returned' ? (
								<FieldPair>
									<Field label="Delivered date" error={deliveredDateField.error} errorId={deliveredDateField.errorId} htmlFor="order-delivered-date">
										<DateInput id="order-delivered-date" label="Delivered date" value={draft.deliveredDate}
											aria-required="true" invalid={deliveredDateField.invalid} describedBy={deliveredDateField.describedBy}
											onChange={set('order-delivered-date', 'deliveredDate')} />
									</Field>
									<Field label="Returned date" error={returnedDateField.error} errorId={returnedDateField.errorId} htmlFor="order-returned-date">
										<DateInput id="order-returned-date" label="Returned date" value={draft.returnedDate}
											aria-required="true" invalid={returnedDateField.invalid} describedBy={returnedDateField.describedBy}
											onChange={set('order-returned-date', 'returnedDate')} />
									</Field>
								</FieldPair>
							) : draft.status === 'Delivered' ? (
								<Field label="Delivered date" error={deliveredDateField.error} errorId={deliveredDateField.errorId} htmlFor="order-delivered-date">
									<DateInput id="order-delivered-date" label="Delivered date" value={draft.deliveredDate}
										aria-required="true" invalid={deliveredDateField.invalid} describedBy={deliveredDateField.describedBy}
										onChange={set('order-delivered-date', 'deliveredDate')} />
								</Field>
							) : null}

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
									groups={categoryGroups(categories.data, { exclude: draft.categories })}
									action={categoryQuery.trim()
										? { icon: 'plus', label: `ADD "${categoryQuery.trim().toUpperCase()}"`,
											onSelect: name => { addCategory(name); setCategoryQuery('') } }
										: undefined} />
							</Field>
							<Field label="Kind" error={kindField.error} errorId={kindField.errorId} htmlFor="order-kind"
								help="Only expenses are added to your totals.">
								<Combobox id="order-kind" label="Kind" required placeholder="Choose kind..."
									value={draft.kind}
									invalid={kindField.invalid} describedBy={kindField.describedBy}
									onChange={set('order-kind', 'kind')}
									onSelect={o => { update({ kind: o.label }); orderErrors.recheck('order-kind', o.label) }}
									groups={[{ heading: 'Kinds', options: spendKinds.map(k => ({ id: k, label: k })) }]} />
							</Field>

							{/* The optional fields, plain rows of the form -- the same flat rows
							    as the new order form's. */}
							<FieldPair>
								<Field label="Discount" optional error={discountField.error} errorId={discountField.errorId}
									help="The amount subtracted from the order.">
									<NumberInput id="order-discount" unit={currencySymbol()}
										aria-label="Discount" value={draft.discount}
										invalid={discountField.invalid} describedBy={discountField.describedBy}
										onChange={set('order-discount', 'discount')} />
								</Field>
								<Field label="Shipping fee" optional error={shippingField.error} errorId={shippingField.errorId}>
									<NumberInput id="order-shipping" unit={currencySymbol()}
										aria-label="Shipping fee" value={draft.shipping}
										invalid={shippingField.invalid} describedBy={shippingField.describedBy}
										onChange={set('order-shipping', 'shipping')} />
								</Field>
							</FieldPair>
							<FieldPair>
								<Field label="Order reference" optional>
									<FieldShell>
										<TextInput aria-label="Order reference"
											value={draft.reference} onChange={v => update({ reference: v })} />
									</FieldShell>
								</Field>
							</FieldPair>
							<Field label="Note" optional>
								<TextArea aria-label="Note" value={draft.note}
									placeholder="Add a note about this purchase..."
									onChange={v => update({ note: v })} />
							</Field>
						</Form>
					</CardBody>
				</Card>

				<Card aria-label="Items">
					{/* The card band names the list and counts it, the way Order details' own
					    items card does -- one header, in the shape every other card here uses.
					    The list is told not to draw a second one: "ITEMS • 4" over "LINES • 4"
					    was one list named twice, with the number printed twice under it. */}
					<CardHeader title={`Items${sep}${draft.items.length}`}>
						{/* The band's right-hand slot, the way Order details' items card puts the
						    subtotal there. Drawn only when there is more than one line, because
						    that is when the rows draw a grip at all -- and withdrawn by the
						    stylesheet while a line is open, for the same reason the grips are. */}
						{draft.items.length > 1
							? <span className="field-help">drag a line to reorder it</span>
							: null}
					</CardHeader>
					<CardDivider />
					{/* The plain body padding, not `card-body-tight`. That variant lifts the first
					    line to 6px under the hairline, which is the padding-top override Card.jsx
					    warns about -- it was there for lists whose rows carry their own leading
					    space, and this body opens on the recessed panel, which has an edge of its
					    own to sit against. README: Cards. */}
					<CardBody>
						<ItemLines items={draft.items} onItemsChange={items => update({ items })}
							heading={false} onAnnounce={toast} photoOf={photoOf}
							error={itemsTried && !draft.items.length ? 'An order needs at least one item.' : ''}
							onPhotoPick={pickPhoto} onPhotoClear={clearPhoto} />
					</CardBody>
				</Card>

				<FormActions split>
					<Button variant="ghost" onClick={leave}>{copying ? 'DISCARD' : 'CANCEL'}</Button>
					<Button variant="caps" onClick={save} disabled={saving}>
						{saving ? 'SAVING...' : 'SAVE'}</Button>
				</FormActions>
			</div>

			<div className="order-list-column">
				<Card aria-label="Order summary">
					<CardBody>
						<div className="card-subheading">Order summary</div>
						<span className="section-label">Order details</span>
						<SummaryRow label="Vendor" value={draft.vendor} />
						<SummaryRow label="Status" value={draft.status} />
						<SummaryRow label="Categories" value={draft.categories.join(', ') || '—'} />
						<SummaryRow label="Kind" value={draft.kind} />
						{/* One line for the items, not a copy of the list -- every line is already
						    named, priced and editable in the items card beside this rail, and a
						    second reading of it here is one more thing to keep in step. What the
						    rail owes is the arithmetic: items, then discount and shipping, adding
						    down to the same total the record stores. */}
						<SummaryRow label="Items" value={currency(paid)} />
						{discount ? <SummaryRow label="Discount" value={'-' + currency(discount)} /> : null}
						<SummaryRow label="Shipping" value={currency(draft.shipping ? parseAmount(draft.shipping) : 0)} />
						<div className="card-divider card-divider-tight" />
						{/* An edit's lines are real entries against a real record; a copy is not
						    written yet, so the same total is a preview and says so. */}
						<SummaryTotal value={currency(total)} estimate={copying} />
						{saved > 0 ? (
							<span className="field-help summary-saved">
								saved {currency(saved)} vs retail ({percent(saved / retail * 100)})
							</span>
						) : null}
					</CardBody>
				</Card>

				<Card aria-label="Tips">
					<CardHeader title="Good to know" />
					<CardDivider />
					<CardBody>
						<InsetPanel>
							<ItemRow icon="pencil" title="Edit in place"
								meta="Select the pencil to edit the line, without moving it in the list." />
							<ItemRow icon="reorder" title="Drag to reorder"
								meta="Or select a line and move it with the arrow keys." />
							<ItemRow icon="undo" title="Enter saves, Escape cancels"
								meta="Cmd/Ctrl+Enter saves and opens the line below." />
						</InsetPanel>
					</CardBody>
				</Card>
			</div>
		</div>
	)
}
