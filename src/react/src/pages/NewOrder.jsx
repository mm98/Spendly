import { useCallback, useMemo, useState } from 'react'
import { Sep } from '../components/Sep.jsx'
import { Outlet, useNavigate, useOutletContext, useSearchParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { FormPage } from '../components/FormPage.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { AiCard, AiCardMark } from '../components/AiCard.jsx'
import { Button } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import { InsetPanel, ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { ItemLines } from '../components/ItemLines.jsx'
import {
	DateInput, Field, FieldPair, FieldShell, FieldUnit, Segmented, TextArea, TextInput,
	focusField, useFieldErrors
} from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { useApi } from '../api/useApi.js'
import { useVendorPicker } from '../api/useVendorPicker.js'
import {
	addItemAttachments, createOrder, failureMessage, getCategories, getCurrentUser, getOrderDraft,
	getVendors, invalidateOrderData, spendKinds
} from '../api/client.js'
import { ORDER_FIELDS } from '../api/rules.js'
import { currency, currencySymbol, parseAmount, percent, shortDate, sanitizeAmount, today } from '../api/format.js'

/* New order, in two steps that share one draft.

   The draft lives on the layout route, so step 2 is looking at what step 1 filled in rather
   than at a second copy of it. That is also what makes the summary rail honest: it reads the
   same object the form writes, so it cannot show a vendor the form has not got.

   Both steps reject values, and both reject them the same way -- the marking is in Form.jsx
   and each step owns nothing but its own rules. Step 2 checked its four fields while NEXT
   STEP walked straight past the three the order needs, so an order could reach the item form
   with no vendor, no date and a Kind that is not one of the kinds. README: Fields and Forms.

   Neither step arranges its own page. Both hand their fields to FormPage, which is the one
   card, headline, verdict line, rail and split footer every form in the app is drawn in.

   This is create-only. A brand-new draft has no items, so step 1 exists to gather what an item
   form needs before there is one to add anything to, and step 2 is the only place a first item
   can go -- two real steps, in a real order. Editing an existing order has both halves already
   and does not walk through this: it is its own page, saving details and items in one call. See
   EditOrder.jsx, and the note on the edit route in routes.jsx. Sharing this wizard's code with
   an edit was tried and it was the wrong call -- an edit could not save a category without
   detouring through an item form that had nothing to add, and "Add the items" printed over
   lines already on the order every time it was read. */

const STEPS = (at) => [
	{ label: 'Order details', icon: 'receipt', done: at > 0, on: at === 0 },
	{ label: 'Add the items', icon: 'document', on: at === 1 }
]

export function NewOrderLayout() {
	const [searchParams] = useSearchParams()
	const seed = useApi(getOrderDraft)
	/* The command palette's "Create order with {vendor}" arrives as ?vendor=, and the promise
	   it made was the vendor already filled in -- not another field to type. Folded into the
	   seed itself, so it survives exactly as long as the rest of the draft does. */
	const vendorParam = searchParams.get('vendor')
	const seedData = useMemo(() => (seed.data && vendorParam ? { ...seed.data, vendor: vendorParam } : seed.data),
		[seed.data, vendorParam])
	const [draft, setDraft] = useState(null)
	const value = draft ?? seedData

	const update = useCallback(patch =>
		setDraft(prev => ({ ...(prev ?? seedData), ...patch })), [seedData])

	if (seed.error) return <Page><Card><CardBody><p className="field-help">
		That order could not be loaded. {seed.error.message}</p></CardBody></Card></Page>
	if (!value) return <Page><p className="field-help">Loading the form...</p></Page>
	return <Outlet context={{ draft: value, update }} />
}

/* ---- step 1 ---- */

export function NewOrderDetails() {
	const { draft, update } = useOutletContext()
	const navigate = useNavigate()
	const vendors = useApi(getVendors)
	const categories = useApi(getCategories)
	// Cached by the route loader already (src/react/src/routes.jsx), so this costs nothing extra --
	// see Scan.jsx's own use of it. README: Honest Affordances.
	const aiEnabled = useApi(getCurrentUser).data?.scanAiEnabled ?? false
	const toast = useToast()

	const values = useMemo(() => ({
		'order-vendor': draft.vendor,
		'order-date': draft.date,
		'order-kind': draft.kind,
		'order-shipping': draft.shipping,
		'order-discount': draft.discount
	}), [draft])

	const { check, recheck, propsFor } = useFieldErrors(ORDER_FIELDS, values)

	const set = (name, key) => v => { update({ [key]: v }); recheck(name, v) }

	const pickVendor = name => { update({ vendor: name }); recheck('order-vendor', name) }
	const vendorPicker = useVendorPicker(vendors, draft.vendor, pickVendor, toast)

	const next = () => {
		const failed = check()
		if (!failed.length) { navigate('/orders/new/items'); return }
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
	const discountField = propsFor('order-discount')

	return (
		<FormPage
			title="Order details" lead="Where you bought, when, and how it arrived."
			steps={STEPS(0)}
			cancel={{ to: '/orders' }}
			submit={{ label: 'NEXT STEP', onClick: next }}
			rail={
				<>
					<OrderSummary draft={draft} estimate />
					<AiCard headline={aiEnabled ? 'Have the receipt? Skip the form.' : 'Have the receipt? Attach it instead.'}
						body={aiEnabled
							? 'A photo or PDF fills every field for you; you only review it.'
							: 'A photo or PDF attaches to the order. You still fill in the fields yourself.'}>
						<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
						<AiCardMark size={34} />
					</AiCard>
				</>
			}>

			<Field label="Vendor" error={vendorField.error} errorId={vendorField.errorId} htmlFor="order-vendor"
				help="Type to search. If the vendor isn't in the list, you can add it without leaving this field.">
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
					/* Kind is typed, and an option is one click from the same value, so the
					   canonical spelling is restored on selection rather than a lowercase
					   "expense" being rejected or stored. */
					onSelect={o => { update({ kind: o.label }); recheck('order-kind', o.label) }}
					groups={[{ heading: 'Kinds', options: spendKinds.map(k => ({ id: k, label: k })) }]} />
			</Field>

			{/* The optional fields, plain rows of the form like everything above them. They
			    used to sit behind a More details? switch and then under its heading in a
			    bordered section; three optional fields cost less on screen than either.

			    Discount and Shipping pair because they are the two order-level amounts, and the
			    two halves of the same sentence -- in the order the total applies them: the rabat
			    comes off what the goods cost, then the carrier's fee goes on. */}
			<FieldPair>
				<Field label="Discount" error={discountField.error} errorId={discountField.errorId}
					help="What was taken off the order.">
					<FieldShell>
						<TextInput id="order-discount" inputMode="decimal" placeholder="0,00"
							aria-label="Discount" value={draft.discount}
							invalid={discountField.invalid} describedBy={discountField.describedBy}
							onChange={v => set('order-discount', 'discount')(sanitizeAmount(v))} />
						<FieldUnit>{currencySymbol()}</FieldUnit>
					</FieldShell>
				</Field>
				<Field label="Shipping fee" error={shippingField.error} errorId={shippingField.errorId}>
					<FieldShell>
						<TextInput id="order-shipping" inputMode="decimal" placeholder="0,00"
							aria-label="Shipping fee" value={draft.shipping}
							invalid={shippingField.invalid} describedBy={shippingField.describedBy}
							onChange={v => set('order-shipping', 'shipping')(sanitizeAmount(v))} />
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
					placeholder="Add a note about this purchase, if you want one."
					onChange={v => update({ note: v })} />
			</Field>
		</FormPage>
	)
}

/* The rail on both steps. It reads the draft, so it is a view of the order rather than a
   second statement of it -- the two cannot drift. `estimate` is right on both of this
   wizard's steps: nothing has been saved yet, so the total is a preview of what saving would
   produce, not a fact about a real order yet. EditOrder.jsx's own rail drops it, because there
   the order and its items already exist. */
function OrderSummary({ draft, estimate, showItems }) {
	/* The same three formulas the orders table generates (migrations/009), so the rail and the
	   saved record cannot disagree: total adds shipping and takes the discount off, and the
	   discount counts as money saved against retail. */
	const paid = draft.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
	const discount = draft.discount ? parseAmount(draft.discount) : 0
	const total = paid + (draft.shipping ? parseAmount(draft.shipping) : 0) - discount
	const retail = draft.items.reduce((sum, i) => sum + (i.retail ?? i.price) * i.quantity, 0)
	const saved = retail - paid + discount

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
							<span className="summary-row-value">{draft.categories.join(', ') || '-'}</span></div>
						<div className="summary-row">Kind<span className="summary-row-value">{draft.kind}</span></div>
						{discount ? <SummaryRow label="Discount" value={'-' + currency(discount)} /> : null}
						<SummaryRow label="Shipping" value={currency(draft.shipping ? parseAmount(draft.shipping) : 0)} />
					</>
				)}
				{showItems ? (
					<>
						<span className="section-label section-label-break">Items</span>
						{draft.items.map(item => (
							<SummaryRow key={item.id} className="summary-row-item"
								label={`${item.title} × ${item.quantity}`}
								value={currency(item.price * item.quantity)} />
						))}
					</>
				) : null}
				<div className="card-divider card-divider-tight" />
				<SummaryTotal label="Estimated total" value={currency(total)} estimate={estimate} />
				{showItems && saved > 0 ? (
					<span className="field-help summary-saved">
						saved {currency(saved)} vs retail ({percent(saved / retail * 100)})
					</span>
				) : (
					<span className="field-help">Items are added in step 2; the total builds as you add them.</span>
				)}
			</CardBody>
		</Card>
	)
}

/* ---- step 2 ---- */

export function NewOrderItems() {
	const { draft, update } = useOutletContext()
	const navigate = useNavigate()
	/* Set only once a save has actually been tried with nothing on the list -- validation
	   errors show on submit, not while the list is still being built. It clears itself the
	   moment an item exists, since that is the only fix there is. */
	const [itemsTried, setItemsTried] = useState(false)
	const [saving, setSaving] = useState(false)
	/* A photo is picked against an item that, mid-wizard, has no real id yet -- see save()
	   below, which is what actually uploads these once the order (and so the item) has been
	   written. Keyed by the item's own id (temporary or real), never sent as part of the
	   draft's own JSON -- draft.items travels to createOrder as-is, and a File object
	   serializes to "{}" the moment it touches JSON.stringify. */
	const [pendingPhotos, setPendingPhotos] = useState({})
	const toast = useToast()

	/* Step 2 of a brand-new order can only ever hold a photo picked this session: there is no
	   server copy yet for anything on this list to already have. Edit order answers the same
	   question from two sources -- see its own photoOf. */
	const photoOf = useCallback(item => {
		const pending = pendingPhotos[item.id]
		return pending ? { present: true, src: pending.url } : { present: false }
	}, [pendingPhotos])

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

	const save = () => {
		if (!draft.items.length) {
			setItemsTried(true)
			/* The row that opens an empty card is the control that fixes this, and since the
			   form above the list is gone there is no field left to send anyone to. */
			document.querySelector('.line-add-row')?.focus()
			return
		}
		setSaving(true)
		createOrder(draft)
			.then(async order => {
				/* The save can also have created its vendor or a category by name (the server
				   finds-or-creates both), so the group covers those lists too -- not just the
				   reads that count orders. */
				invalidateOrderData()

				/* A photo was picked against a draft item that did not have a real id yet -- this
				   is the first point one exists to attach it to. createOrder writes items in the
				   submitted order and reads them back the same way, so draft.items[i]'s pending
				   photo belongs to order.items[i], position for position. */
				const uploads = draft.items
					.map((item, i) => [pendingPhotos[item.id], order.items[i]])
					.filter(([pending, saved]) => pending && saved)
					.map(([pending, saved]) => addItemAttachments(order.id, saved.id, [pending.file]))
				if (uploads.length) {
					await Promise.allSettled(uploads).then(results => {
						if (results.some(r => r.status === 'rejected'))
							toast('Order saved, but a photo did not attach.', 'negative')
					})
				}

				navigate('/orders/' + order.id)
			})
			.catch(e => { setSaving(false)
				toast(failureMessage(e, 'That did not save. Try again.'), 'negative') })
	}

	return (
		<FormPage
			title="Add the items"
			lead="Line by line, with the price you paid and what it would have cost at retail."
			steps={STEPS(1)}
			cancel={{ to: '/orders/new', label: 'BACK', icon: 'chevronLeft' }}
			submit={{ label: saving ? 'SAVING...' : 'SAVE ORDER', onClick: save, disabled: saving }}
			rail={
				<>
					<OrderSummary draft={draft} estimate showItems />
					<Card aria-label="Tips">
						<CardHeader title="Good to know" />
						<CardDivider />
						<CardBody>
							<InsetPanel>
								<ItemRow icon="plus" title="Add a line"
									meta="The dashed row at the end of the list. Press Enter to add it, and the row stays open so you can add another." />
								<ItemRow icon="pencil" title="Edit in place"
									meta="Select the pencil to edit the line, without moving it in the list." />
								<ItemRow icon="reorder" title="Drag to reorder"
									meta="Or select a line and move it with the arrow keys." />
							</InsetPanel>
						</CardBody>
					</Card>
				</>
			}>

			<ItemLines items={draft.items} onItemsChange={items => update({ items })}
				label="Items" onAnnounce={toast} photoOf={photoOf}
				error={itemsTried && !draft.items.length ? 'An order needs at least one item.' : ''}
				onPhotoPick={pickPhoto} onPhotoClear={clearPhoto} />
		</FormPage>
	)
}
