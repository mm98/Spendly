import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { Button } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { InsetPanel, ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { ItemLines } from '../components/ItemLines.jsx'
import {
	DateInput, Field, FieldPair, FieldShell, FieldUnit,
	Form, FormActions, FormStatus, Segmented, TextArea, TextInput,
	focusField, needFixing, useFieldErrors
} from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { useApi } from '../api/useApi.js'
import {
	addItemAttachments, createVendor, failureMessage, getCategories, getOrderAsDraft, getVendors,
	invalidateOrderData, invalidateVendorData, itemAttachmentThumbnailUrl, spendKinds, updateOrder,
	vendorByAnyName
} from '../api/client.js'
import { ORDER_FIELDS } from '../api/rules.js'
import { currency, currencySymbol, parseAmount, percent, plural, sep, today } from '../api/format.js'

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

	const [status, setStatus] = useState({ message: '', good: true })
	const [saving, setSaving] = useState(false)

	const orderValues = useMemo(() => ({
		'order-vendor': draft.vendor, 'order-date': draft.date,
		'order-kind': draft.kind, 'order-shipping': draft.shipping,
		'order-discount': draft.discount
	}), [draft])
	const orderErrors = useFieldErrors(ORDER_FIELDS, orderValues)
	const set = (name, key) => v => { update({ [key]: v }); orderErrors.recheck(name, v) }

	/* Same rule as New order: typed text that is an existing vendor's alias picks that vendor,
	   never creates a twin -- the action row says USE before it is pressed, and this guard
	   resolves identically if pressed anyway. */
	const aliasHit = vendorByAnyName(vendors.data ?? [], draft.vendor)

	const addVendor = name => {
		const clean = String(name).trim()
		if (!clean) return
		const existing = vendorByAnyName(vendors.data ?? [], clean)
		if (existing) {
			update({ vendor: existing.name })
			orderErrors.recheck('order-vendor', existing.name)
			toast(`"${clean}" is an alias of ${existing.name}, so ${existing.name} is used.`)
			return
		}
		createVendor(clean)
			.then(vendor => {
				invalidateVendorData()
				vendors.refresh()
				update({ vendor: vendor.name })
				orderErrors.recheck('order-vendor', vendor.name)
				toast(`${vendor.name} added to your vendors.`)
			})
			.catch(e => toast(failureMessage(e, 'The vendor was not created. Try again.'), 'negative'))
	}

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

	const photoOf = useCallback(item => {
		const pending = pendingPhotos[item.id]
		if (pending) return { present: true, src: pending.url }
		const existing = item.attachments?.[0]
		if (!existing) return { present: false }
		return {
			present: true,
			src: existing.hasThumbnail ? itemAttachmentThumbnailUrl(id, item.id, existing.id) : undefined
		}
	}, [pendingPhotos, id])

	const pickPhoto = useCallback((itemId, file) => {
		setPendingPhotos(prev => {
			if (prev[itemId]) URL.revokeObjectURL(prev[itemId].url)
			return { ...prev, [itemId]: { file, url: URL.createObjectURL(file) } }
		})
	}, [])

	const clearPhoto = useCallback(itemId => {
		setPendingPhotos(prev => {
			if (!prev[itemId]) return prev
			URL.revokeObjectURL(prev[itemId].url)
			const { [itemId]: gone, ...rest } = prev
			return rest
		})
	}, [])

	/* ---- save, once, for the whole order ---- */

	const save = () => {
		const failedOrder = orderErrors.check()
		if (failedOrder.length) {
			setStatus({ message: 'Cannot save: ' + needFixing(failedOrder), good: false })
			focusField(failedOrder[0].name)
			return
		}
		if (!draft.items.length) {
			setStatus({ message: 'An order needs at least one item.', good: false })
			/* There is no item form to send anyone to any more, and the empty list's own row is
			   what opens the card that would fix this -- so the verdict points at the control
			   that acts rather than at a field that is not on the page. */
			document.querySelector('.line-add-row')?.focus()
			return
		}
		setStatus({ message: '', good: true })
		setSaving(true)
		updateOrder(id, draft)
			.then(async order => {
				invalidateOrderData()

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
						<p className="card-lead">Update the details, the items, or both; everything saves together.</p>
						<FormStatus message={status.message} good={status.good} />
						<Form>
							<Field label="Vendor" error={vendorField.error} errorId={vendorField.errorId} htmlFor="order-vendor">
								<Combobox id="order-vendor" label="Vendor" required
									placeholder="Search vendors..." value={draft.vendor}
									invalid={vendorField.invalid} describedBy={vendorField.describedBy}
									onChange={set('order-vendor', 'vendor')}
									onSelect={o => { update({ vendor: o.label }); orderErrors.recheck('order-vendor', o.label) }}
									leadingIcon="search"
									groups={[
										{ heading: 'Favourites', options: (vendors.data ?? []).filter(v => v.favourite)
											.map(v => ({ id: v.id, label: v.name, meta: plural(v.orders, 'order'), star: true })) },
										{ heading: 'All vendors', options: (vendors.data ?? []).filter(v => !v.favourite)
											.map(v => ({ id: v.id, label: v.name, meta: plural(v.orders, 'order') })) }
									]}
									action={aliasHit
										? { icon: 'check',
											label: `USE ${aliasHit.name.toUpperCase()}: "${draft.vendor.trim().toUpperCase()}" IS ITS ALIAS`,
											onSelect: addVendor }
										: { icon: 'plus', label: `CREATE VENDOR "${draft.vendor.toUpperCase()}"`,
											onSelect: addVendor }} />
							</Field>

							<FieldPair>
								<Field label="Date" error={dateField.error} errorId={dateField.errorId} htmlFor="order-date">
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
									groups={[
										{ heading: 'Favourites', options: (categories.data ?? [])
											.filter(c => c.favourite && !draft.categories.includes(c.name))
											.map(c => ({ id: c.id, label: c.name, meta: `${percent(c.share)} of expenses`, star: true })) },
										{ heading: 'All categories', options: (categories.data ?? [])
											.filter(c => !c.favourite && !draft.categories.includes(c.name))
											.map(c => ({ id: c.id, label: c.name, meta: `${percent(c.share)} of expenses` })) }
									]}
									action={categoryQuery.trim()
										? { icon: 'plus', label: `ADD "${categoryQuery.trim().toUpperCase()}"`,
											onSelect: name => { addCategory(name); setCategoryQuery('') } }
										: undefined} />
							</Field>
							<Field label="Kind" error={kindField.error} errorId={kindField.errorId} htmlFor="order-kind"
								help="Only expenses count towards your totals.">
								<Combobox id="order-kind" label="Kind" required placeholder="Expense"
									value={draft.kind}
									invalid={kindField.invalid} describedBy={kindField.describedBy}
									onChange={set('order-kind', 'kind')}
									onSelect={o => { update({ kind: o.label }); orderErrors.recheck('order-kind', o.label) }}
									groups={[{ heading: 'Kinds', options: spendKinds.map(k => ({ id: k, label: k })) }]} />
							</Field>

							{/* The optional fields, plain rows of the form -- the same flat rows
							    as the new order form's. */}
							<FieldPair>
								<Field label="Discount" error={discountField.error} errorId={discountField.errorId}
									help="What was taken off the order.">
									<FieldShell>
										<TextInput id="order-discount" inputMode="decimal" placeholder="0,00"
											aria-label="Discount" value={draft.discount}
											invalid={discountField.invalid} describedBy={discountField.describedBy}
											onChange={set('order-discount', 'discount')} />
										<FieldUnit>{currencySymbol()}</FieldUnit>
									</FieldShell>
								</Field>
								<Field label="Shipping fee" error={shippingField.error} errorId={shippingField.errorId}>
									<FieldShell>
										<TextInput id="order-shipping" inputMode="decimal" placeholder="0,00"
											aria-label="Shipping fee" value={draft.shipping}
											invalid={shippingField.invalid} describedBy={shippingField.describedBy}
											onChange={set('order-shipping', 'shipping')} />
										<FieldUnit>{currencySymbol()}</FieldUnit>
									</FieldShell>
								</Field>
							</FieldPair>
							<FieldPair>
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
							? <span className="field-help">drag the grip to reorder</span>
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
							onPhotoPick={pickPhoto} onPhotoClear={clearPhoto} />
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
						{discount ? <SummaryRow label="Discount" value={'-' + currency(discount)} /> : null}
						<SummaryRow label="Shipping" value={currency(draft.shipping ? parseAmount(draft.shipping) : 0)} />
						<span className="section-label section-label-break">Items</span>
						{draft.items.map(item => (
							<SummaryRow key={item.id} className="summary-row-item"
								label={`${item.title} × ${item.quantity}`}
								value={currency(item.price * item.quantity)} />
						))}
						<div className="card-divider card-divider-tight" />
						{/* No `estimate` here, and no "est." in the label -- every line above is a
						    real entry against a real order, not a preview of one still being built. */}
						<SummaryTotal value={currency(total)} />
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
							<ItemRow icon="pencil" title="Edit where it sits"
								meta="The pencil opens the line into a card, in its own place in the list." />
							<ItemRow icon="reorder" title="Drag to reorder"
								meta="Or focus the grip and use the arrow keys." />
							<ItemRow icon="undo" title="Enter saves, Escape cancels"
								meta="Cmd/Ctrl+Enter saves and opens the line below." />
						</InsetPanel>
					</CardBody>
				</Card>
			</div>
		</div>
	)
}
