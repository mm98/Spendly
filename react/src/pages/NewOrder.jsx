import { Fragment, useCallback, useMemo, useRef, useState } from 'react'
import { Outlet, useNavigate, useOutletContext, useParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { FormPage, useRowDelete } from '../components/FormPage.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { AiCard, AiCardMark } from '../components/AiCard.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import { InsetPanel, ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { useReorder } from '../components/Reorder.jsx'
import {
	DateInput, Field, FieldPair, FieldShell, FieldUnit, FilterSection, FilterSectionBody,
	FormActions, Segmented, Switch, TextArea, TextInput,
	focusField, needFixing, useFieldErrors
} from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { useApi } from '../api/useApi.js'
import {
	createOrder, createVendor, getCategories, getHomeContent, getOrderAsDraft, getOrderDraft,
	getOrders, getOrdersOverview, getVendors, getVendorsOverview, spendKinds, updateOrder
} from '../api/client.js'
import { invalidate } from '../api/useApi.js'
import { ITEM_FIELDS, ORDER_FIELDS } from '../api/rules.js'
import { amount, kr, parseAmount, percent, shortDate, today } from '../api/format.js'

/* New order, in two steps that share one draft.

   The draft lives on the layout route, so step 2 is looking at what step 1 filled in rather
   than at a second copy of it. That is also what makes the summary rail honest: it reads the
   same object the form writes, so it cannot show a vendor the form has not got.

   Both steps reject values, and both reject them the same way -- the marking is in Form.jsx
   and each step owns nothing but its own rules. Step 2 checked its four fields while NEXT
   STEP walked straight past the three the order needs, so an order could reach the item form
   with no vendor, no date and a Kind that is not one of the kinds. README: Fields and Forms.

   Neither step arranges its own page. Both hand their fields to FormPage, which is the one
   card, headline, verdict line, rail and split footer every form in the app is drawn in. */

const STEPS = (at) => [
	{ label: 'Order details', icon: 'receipt', done: at > 0, on: at === 0 },
	{ label: 'Add the items', icon: 'document', on: at === 1 }
]

export function NewOrderLayout({ mode = 'create' }) {
	const { id } = useParams()
	/* One layout for both flows: a new order starts from the seeded draft and the defaults the
	   user set, and an edit starts from the order itself. Two forms would drift; this way the
	   second step, the summary rail and every validation rule are literally the same code. */
	const seed = useApi(mode === 'edit' ? getOrderAsDraft : getOrderDraft, mode === 'edit' ? [id] : [])
	const [draft, setDraft] = useState(null)
	const value = draft ?? seed.data

	const update = useCallback(patch =>
		setDraft(prev => ({ ...(prev ?? seed.data), ...patch })), [seed.data])

	if (seed.error) return <Page><Card><CardBody><p className="field-help">
		That order could not be loaded. {seed.error.message}</p></CardBody></Card></Page>
	if (!value) return <Page><p className="field-help">Loading the form…</p></Page>
	return <Outlet context={{ draft: value, update, mode, id }} />
}

/* ---- step 1 ---- */

export function NewOrderDetails() {
	const { draft, update, mode, id } = useOutletContext()
	const navigate = useNavigate()
	const vendors = useApi(getVendors)
	const categories = useApi(getCategories)
	const toast = useToast()
	const [more, setMore] = useState(true)
	const [status, setStatus] = useState({ message: '', good: true })
	const base = mode === 'edit' ? `/orders/${id}/edit` : '/orders/new'

	const values = useMemo(() => ({
		'order-vendor': draft.vendor,
		'order-date': draft.date,
		'order-kind': draft.kind,
		'order-shipping': draft.shipping
	}), [draft])

	const { check, recheck, propsFor } = useFieldErrors(ORDER_FIELDS, values)

	const set = (name, key) => v => { update({ [key]: v }); recheck(name, v) }

	/* CREATE VENDOR "…" is the foot of the vendor list, and it creates the vendor rather than
	   only typing its name into the field: a row labelled with a verb that does not do the
	   verb is the decorative-control rule inside a dropdown. README: Honest Affordances. */
	const addVendor = name => {
		const clean = String(name).trim()
		if (!clean) return
		createVendor(clean)
			.then(vendor => {
				invalidate(getVendors); invalidate(getVendorsOverview)
				vendors.refresh()
				update({ vendor: vendor.name })
				recheck('order-vendor', vendor.name)
				toast(`${vendor.name} added to your vendors.`)
			})
			.catch(e => toast(e.message, 'negative'))
	}

	const next = () => {
		const failed = check()
		if (!failed.length) { setStatus({ message: '', good: true }); navigate(base + '/items'); return }
		/* Shipping fee lives inside the More-details disclosure, so a rejection there can sit
		   behind a closed panel -- a message nobody can open is the same as no message. */
		if (failed.some(f => f.name === 'order-shipping')) setMore(true)
		setStatus({ message: 'Cannot continue — ' + needFixing(failed), good: false })
		focusField(failed[0].name)
	}

	const [categoryQuery, setCategoryQuery] = useState('')
	const addCategory = name => {
		const clean = String(name).trim()
		if (clean && !draft.categories.includes(clean)) update({ categories: [...draft.categories, clean] })
	}

	const vendorField = propsFor('order-vendor')
	const dateField = propsFor('order-date')
	const kindField = propsFor('order-kind')
	const shippingField = propsFor('order-shipping')

	return (
		<FormPage
			title="Order details" lead="Where you bought, when, and how it arrived."
			steps={STEPS(0)} status={status}
			cancel={{ to: mode === 'edit' ? `/orders/${id}` : '/orders' }}
			submit={{ label: 'NEXT STEP', onClick: next }}
			rail={
				<>
					<OrderSummary draft={draft} estimate />
					<AiCard headline="Have the receipt? Skip the form."
						body="A photo or PDF fills every field for you; you only review it.">
						<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
						<AiCardMark size={34} />
					</AiCard>
				</>
			}>

			<Field label="Vendor" error={vendorField.error} errorId={vendorField.errorId}
				help="Every dropdown is this combobox: type to search, grouped results, create from the foot.">
				<Combobox id="order-vendor" label="Vendor" required
					placeholder="Search vendors…" value={draft.vendor}
					invalid={vendorField.invalid} describedBy={vendorField.describedBy}
					onChange={set('order-vendor', 'vendor')}
					onSelect={o => { update({ vendor: o.label }); recheck('order-vendor', o.label) }}
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
					{/* Read left to right before shipping one: an order is placed, then delivered,
					    and only then can it be returned. This control once read Delivered /
					    Ordered / Returned in all three places it appears -- pixel-perfect in
					    every engine, and saying an order was delivered before it was placed.
					    Geometry has no opinion about the order of labels. README: Honest Affordances. */}
					<Segmented options={['Ordered', 'Delivered', 'Returned']} value={draft.status}
						onChange={v => update({ status: v })} label="Status" />
				</Field>
			</FieldPair>

			{/* Categories and Kind each hold a row. They shared one, breaking to a line each
			    at 900px, and a field that grows is a bad neighbour: every chip added to
			    Categories made it taller while Kind stayed a single 48px row beside it, so the
			    two labels lined up and nothing under them did. Vendor already holds a row for a
			    related reason -- what a field pairs with is a question about the field, not
			    about the width. README: Fields and Forms. */}
			{/* htmlFor, because the chips below are labelable and come first -- without it this
			    label pointed at the first chip's remove button and a tap on the chevron
			    deleted a category instead of opening the list. See components/Form.jsx. */}
			<Field label="Categories" htmlFor="order-categories"
				help="Pick from your categories, or type one and press Enter.">
				<Combobox id="order-categories" label="Add category" placeholder="Add category…"
					chips={draft.categories.map(name => (
						<Chip key={name} label={`Remove category ${name}`}
							onRemove={() => update({ categories: draft.categories.filter(c => c !== name) })}>
							{name}</Chip>
					))}
					value={categoryQuery} onChange={setCategoryQuery}
					onSelect={o => { addCategory(o.label); setCategoryQuery('') }}
					groups={[{ heading: 'Your categories', options: (categories.data ?? [])
						.filter(c => !draft.categories.includes(c.name))
						.map(c => ({ id: c.id, label: c.name, meta: `${c.share}% of expenses` })) }]}
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
					/* Kind is typed, and an option is one click from the same value, so the
					   canonical spelling is restored on selection rather than a lowercase
					   "expense" being rejected or stored. */
					onSelect={o => { update({ kind: o.label }); recheck('order-kind', o.label) }}
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
		</FormPage>
	)
}

/* The rail on both steps. It reads the draft, so it is a view of the order rather than a
   second statement of it -- the two cannot drift. */
function OrderSummary({ draft, estimate, showItems }) {
	const total = draft.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
		+ (draft.shipping ? parseAmount(draft.shipping) : 0)
	const retail = draft.items.reduce((sum, i) => sum + (i.retail ?? i.price) * i.quantity, 0)
	const saved = retail - draft.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

	return (
		<Card aria-label="Order summary">
			<CardBody>
				<div className="card-subheading">Order summary</div>
				<span className="section-label">Order details</span>
				<div className="summary-row">Vendor<span className="summary-row-value">{draft.vendor}</span></div>
				<div className="summary-row">Date<span className="summary-row-value">{shortDate(draft.date)}</span></div>
				<div className="summary-row">Status<span className="summary-row-value">{draft.status}</span></div>
				{showItems ? null : (
					<>
						<div className="summary-row">Categories
							<span className="summary-row-value">{draft.categories.join(', ') || '—'}</span></div>
						<div className="summary-row">Kind<span className="summary-row-value">{draft.kind}</span></div>
						<SummaryRow label="Shipping" value={kr(draft.shipping ? parseAmount(draft.shipping) : 0)} />
					</>
				)}
				{showItems ? (
					<>
						<span className="section-label" style={{ display: 'block', marginTop: 10 }}>Items</span>
						{draft.items.map(item => (
							<SummaryRow key={item.id} className="summary-row-item"
								label={`${item.title} × ${item.quantity}`}
								value={kr(item.price * item.quantity)} />
						))}
					</>
				) : null}
				<div className="card-divider card-divider-tight" />
				<SummaryTotal label="Total est." value={kr(total)} estimate={estimate} />
				{showItems && saved > 0 ? (
					<span className="field-help" style={{ color: 'var(--text-positive)', fontWeight: 600 }}>
						saved {kr(saved)} vs retail ({percent(saved / retail * 100)})
					</span>
				) : (
					<span className="field-help">Items are added in step 2; the total builds as you add them.</span>
				)}
			</CardBody>
		</Card>
	)
}

/* ---- step 2 ---- */

const BLANK_ITEM = { 'item-description': '', 'item-quantity': '', 'item-price': '', 'item-retail': '' }

export function NewOrderItems() {
	const { draft, update, mode, id } = useOutletContext()
	const navigate = useNavigate()
	const [form, setForm] = useState(BLANK_ITEM)
	const [status, setStatus] = useState({ message: '', good: true })
	const [saving, setSaving] = useState(false)
	/* Which line the form is editing, or null when it is adding. One form does both, because
	   a separate edit form is a second copy of four validation rules. */
	const [editingId, setEditingId] = useState(null)
	const [photo, setPhoto] = useState(null)
	const toast = useToast()
	const nextId = useRef(0)
	const base = mode === 'edit' ? `/orders/${id}/edit` : '/orders/new'

	const { check, recheck, clear, propsFor } = useFieldErrors(ITEM_FIELDS, form)
	const itemDescription = propsFor('item-description')
	const itemQuantity = propsFor('item-quantity')
	const itemPrice = propsFor('item-price')
	const itemRetail = propsFor('item-retail')

	const set = name => v => { setForm(f => ({ ...f, [name]: v })); recheck(name, v) }

	const clearForm = useCallback(() => {
		setForm(BLANK_ITEM)
		setEditingId(null)
		setPhoto(null)
		clear()
		focusField('item-description')
	}, [clear])

	/* Editing loads the line into the same four fields. The button below then says SAVE
	   CHANGES rather than ADD ITEM, because a button that adds and a button that replaces are
	   two different promises and only one of them is true at a time. */
	const editItem = item => {
		setEditingId(item.id)
		setPhoto(item.photo ?? null)
		setForm({
			'item-description': item.title,
			'item-quantity': String(item.quantity),
			'item-price': amount(item.price),
			'item-retail': item.retail != null ? amount(item.retail) : ''
		})
		clear()
		toast(`Editing ${item.title}. The form above holds it.`)
		focusField('item-description')
	}

	/* Reordering is one control: the grip. It drags with a pointer and moves with the arrow
	   keys, and it announces where the line landed. The chevron pair that used to do this sat
	   beside a grip that did nothing -- three controls on every row for one job, two of them
	   pointing sideways in a list that runs down the page. See Reorder.jsx. */
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
		if (editingId === item.id) clearForm()
		toast(`${item.title} removed.`)
	}

	/* The trash on a row reads the same ask-before-deleting setting as the record deletes --
	   README: Deletion, one setting read by every delete. `removeItem` stays the plain
	   action; the hook owns the asking. */
	const itemDel = useRowDelete({
		what: 'item',
		label: item => `Delete ${item.title}`,
		detail: item => `${item.title}, ${item.quantity} × ${kr(item.price)}.`,
		onDelete: removeItem
	})

	const submit = () => {
		const failed = check()
		if (failed.length) {
			setStatus({ message: 'Not added — ' + needFixing(failed), good: false })
			focusField(failed[0].name)
			return
		}
		const item = {
			id: editingId ?? 'new-' + (nextId.current++),
			title: form['item-description'].trim(),
			quantity: Number(form['item-quantity']),
			price: parseAmount(form['item-price']),
			retail: form['item-retail'] ? parseAmount(form['item-retail']) : undefined,
			photo: photo ?? undefined
		}
		const items = editingId
			? draft.items.map(i => (i.id === editingId ? item : i))
			: [...draft.items, item]
		const was = editingId
		update({ items })
		clearForm()
		const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
		toast(`${item.title} ${was ? 'updated' : 'added'}. Items · ${items.length}, ${kr(total)}`)
	}

	const save = () => {
		if (!draft.items.length) {
			setStatus({ message: 'An order needs at least one item.', good: false })
			focusField('item-description')
			return
		}
		setSaving(true)
		const written = mode === 'edit' ? updateOrder(id, draft) : createOrder(draft)
		written
			.then(order => {
				/* The list, the dashboard and the overview all count orders, so all three are
				   dropped from the cache rather than left showing the count from before. */
				invalidate(getOrders); invalidate(getHomeContent); invalidate(getOrdersOverview)
				invalidate(getOrderAsDraft)
				navigate('/orders/' + order.id)
			})
			.catch(() => { setSaving(false); toast('That did not save. Try again.', 'negative') })
	}

	return (
		<FormPage
			title="Add the items"
			lead="Line by line, with the price you paid and what it would have cost at retail."
			steps={STEPS(1)} status={status}
			cancel={{ to: base, label: 'BACK', icon: 'chevronLeft' }}
			submit={{
				label: saving ? 'SAVING…' : mode === 'edit' ? 'SAVE CHANGES' : 'SAVE ORDER',
				onClick: save, disabled: saving
			}}
			rail={
				<>
					<OrderSummary draft={draft} estimate showItems />
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
				</>
			}>

			{/* The help text beside the button promises both keys, so the section owns them:
			    Enter adds and keeps the form, Escape empties it. Escape also clears the verdict
			    -- a red "Not added" over four blank fields describes nothing. */}
			<FilterSection
				onKeyDown={e => {
					if (!(e.target instanceof HTMLInputElement)) return
					if (e.key === 'Enter') { e.preventDefault(); submit() }
					else if (e.key === 'Escape') {
						e.preventDefault(); e.stopPropagation()
						clearForm(); setStatus({ message: '', good: true })
					}
				}}>
				<Field label="Description" error={itemDescription.error} errorId={itemDescription.errorId}>
					<FieldShell>
						<TextInput id="item-description" aria-label="Description" aria-required="true"
							value={form['item-description']} onChange={set('item-description')}
							invalid={itemDescription.invalid}
							describedBy={itemDescription.describedBy} />
					</FieldShell>
				</Field>

				<FieldPair>
					<Field label="Quantity" error={itemQuantity.error} errorId={itemQuantity.errorId}>
						<FieldShell>
							<TextInput id="item-quantity" inputMode="numeric" aria-label="Quantity"
								aria-required="true" value={form['item-quantity']}
								onChange={set('item-quantity')}
								invalid={itemQuantity.invalid} describedBy={itemQuantity.describedBy} />
							<FieldUnit>pcs</FieldUnit>
						</FieldShell>
					</Field>
					<Field label="Price paid" error={itemPrice.error} errorId={itemPrice.errorId}>
						<FieldShell>
							<TextInput id="item-price" inputMode="decimal" aria-label="Price paid"
								aria-required="true" value={form['item-price']}
								onChange={set('item-price')}
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
								aria-label="Retail price" value={form['item-retail']}
								onChange={set('item-retail')}
								invalid={itemRetail.invalid} describedBy={itemRetail.describedBy} />
							<FieldUnit>kr.</FieldUnit>
						</FieldShell>
					</Field>
					{/* The whole shell is the label and the input is its direct child, which is the
					    prototype's own markup and not an accident: the rule that hides the input is
					    `.field-shell > .field-file-input`, a child combinator. Wrapping the input
					    one level deeper -- in an inner label, say -- leaves the rule unmatched and
					    the browser draws "Browse… No file selected" in the middle of the form. It
					    did.

					    The name is the file's own rather than a fixed one: a picker that reports
					    the same filename whatever you choose is telling you it read something else.
					    The field keeps its height either way. */}
					<Field label="Photo"
						help="Optional. The photo shows on the item row below, not in the form.">
						<FieldShell as="label">
							<span className="field-thumb" aria-hidden="true"><Icon name="photo" /></span>
							<input type="file" accept="image/*" aria-label="Product photo"
								className="field-file-input"
								onChange={e => setPhoto(e.target.files?.[0]?.name ?? null)} />
							<span className="field-file-name">{photo ?? 'Choose a photo…'}</span>
							{photo ? (
								<IconButton variant="clear" icon="close" label="Remove photo"
									onClick={e => { e.preventDefault(); setPhoto(null) }} />
							) : null}
						</FieldShell>
					</Field>
				</FieldPair>

				<FormActions>
					<Button variant="caps compact" icon={editingId ? 'check' : 'plus'} onClick={submit}>
						{editingId ? 'SAVE CHANGES' : 'ADD ITEM'}</Button>
					{editingId
						? <Button variant="ghost compact" onClick={() => {
							clearForm(); setStatus({ message: '', good: true })
						}}>CANCEL EDIT</Button>
						: null}
					<span className="field-help" style={{ alignSelf: 'center' }}>
						Enter {editingId ? 'saves' : 'adds'} and keeps the form; Escape clears it.</span>
				</FormActions>
			</FilterSection>

			<div>
				<div className="space-between space-between-tight">
					<span className="section-label">Items · {draft.items.length}</span>
					<span className="field-help">drag the grip to reorder</span>
				</div>
				<InsetPanel {...reorder.listProps}>
					{draft.items.map((item, i) => (
						/* The dashed box goes where the row came from; the row itself is lifted out
						   of the flow and follows the pointer. Both are rendered here so the box
						   sits at the row's own index and the list keeps its height. */
						<Fragment key={item.id}>
						{reorder.placeholder(item)}
						<ItemRow icon="cube" title={item.title}
							handle={draft.items.length > 1 ? reorder.handle(item, i) : null}
							meta={`${item.quantity} × ${kr(item.price)}`
								+ (item.retail ? ` · retail ${kr(item.retail)}` : '')
								+ (item.photo ? ` · ${item.photo}` : '')}
							amount={kr(item.price * item.quantity)}
							{...reorder.rowProps(item)}>
							<span className="row-inline" style={{ gap: 2 }}>
								<IconButton icon="pencil" label={`Edit ${item.title}`}
									onClick={() => editItem(item)} />
								{itemDel.iconButton(item)}
							</span>
						</ItemRow>
						</Fragment>
					))}
					{draft.items.length === 0
						? <p className="field-help" style={{ padding: '10px 12px' }}>
							No items yet. Add the first one above.</p>
						: null}
				</InsetPanel>
				{itemDel.dialog}
			</div>
		</FormPage>
	)
}
