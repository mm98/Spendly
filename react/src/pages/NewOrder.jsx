import { useCallback, useMemo, useRef, useState } from 'react'
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom'
import { Page } from '../components/Shell.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { Stepper } from '../components/Stepper.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { AiCard, AiCardMark } from '../components/AiCard.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import { InsetPanel, ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import {
	DateInput, Field, FieldPair, FieldShell, FieldUnit, FilterSection, FilterSectionBody,
	Form, FormActions, FormStatus, Segmented, Switch, TextArea, TextInput,
	focusField, needFixing, useFieldErrors
} from '../components/Form.jsx'
import { useApi } from '../api/useApi.js'
import {
	createOrder, getHomeContent, getOrderDraft, getOrders, getOrdersOverview, getVendors, spendKinds
} from '../api/client.js'
import { invalidate } from '../api/useApi.js'
import { AMOUNT_PATTERN, WHOLE_NUMBER_PATTERN, kr, parseAmount, percent, shortDate, today } from '../api/format.js'

/* New order, in two steps that share one draft.

   The draft lives on the layout route, so step 2 is looking at what step 1 filled in rather
   than at a second copy of it. That is also what makes the summary rail honest: it reads the
   same object the form writes, so it cannot show a vendor the form has not got.

   Both steps reject values, and both reject them the same way -- the marking is in Form.jsx
   and each step owns nothing but its own rules. Step 2 checked its four fields while NEXT
   STEP walked straight past the three the order needs, so an order could reach the item form
   with no vendor, no date and a Kind that is not one of the kinds. README 9. */

const STEPS = (at) => [
	{ label: 'Order details', icon: 'receipt', done: at > 0, on: at === 0 },
	{ label: 'Add the items', icon: 'document', on: at === 1 }
]

export function NewOrderLayout() {
	const seed = useApi(getOrderDraft)
	const [draft, setDraft] = useState(null)
	const value = draft ?? seed.data

	const update = useCallback(patch =>
		setDraft(prev => ({ ...(prev ?? seed.data), ...patch })), [seed.data])

	if (!value) return <Page><p className="field-help">Loading the form…</p></Page>
	return <Outlet context={{ draft: value, update }} />
}

/* ---- step 1 ---- */

const ORDER_FIELDS = [
	{ name: 'order-vendor', label: 'Vendor', check: v =>
		!v ? 'Who did you buy from?' : v.length > 80 ? '80 characters at most.' : '' },
	/* An empty type=date is '' and so is a half-typed one -- the engine refuses to hand over
	   25.07.20 -- so "required" catches a malformed date as well. */
	{ name: 'order-date', label: 'Date', check: v =>
		!v ? 'When was the order placed?'
		: v > today() ? 'An order cannot be dated in the future.' : '' },
	{ name: 'order-kind', label: 'Kind', check: v =>
		!v ? 'Pick a kind.'
		: spendKinds.some(k => k.toLowerCase() === v.toLowerCase()) ? ''
		: 'Kind is one of: ' + spendKinds.join(', ') + '.' },
	{ name: 'order-shipping', label: 'Shipping fee', check: v =>
		!v || AMOUNT_PATTERN.test(v) ? '' : 'Amounts take a comma, such as 49,00.' }
]

export function NewOrderDetails() {
	const { draft, update } = useOutletContext()
	const navigate = useNavigate()
	const vendors = useApi(getVendors)
	const [more, setMore] = useState(true)
	const [status, setStatus] = useState({ message: '', good: true })

	const values = useMemo(() => ({
		'order-vendor': draft.vendor,
		'order-date': draft.date,
		'order-kind': draft.kind,
		'order-shipping': draft.shipping
	}), [draft])

	const { check, recheck, propsFor } = useFieldErrors(ORDER_FIELDS, values)

	const set = (name, key) => v => { update({ [key]: v }); recheck(name, v) }

	const next = () => {
		const failed = check()
		if (!failed.length) { setStatus({ message: '', good: true }); navigate('/orders/new/items'); return }
		/* Shipping fee lives inside the More-details disclosure, so a rejection there can sit
		   behind a closed panel -- a message nobody can open is the same as no message. */
		if (failed.some(f => f.name === 'order-shipping')) setMore(true)
		setStatus({ message: 'Cannot continue — ' + needFixing(failed), good: false })
		focusField(failed[0].name)
	}

	const vendorField = propsFor('order-vendor')
	const dateField = propsFor('order-date')
	const kindField = propsFor('order-kind')
	const shippingField = propsFor('order-shipping')

	return (
		<Page>
			<Stepper steps={STEPS(0)} />
			<div className="order-list-grid">
				<div className="order-list-column">
					<Card aria-label="Order details">
						<CardBody variant="card-body-page">
							<div className="card-headline">Order details</div>
							<p className="card-lead">Where you bought, when, and how it arrived.</p>
							<Form>
								<FormStatus message={status.message} good={status.good} />

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
											onSelect: name => update({ vendor: name }) }} />
								</Field>

								<FieldPair>
									<Field label="Date" error={dateField.error} errorId={dateField.errorId}>
										<DateInput id="order-date" label="Order date" value={draft.date}
											aria-required="true" trail={draft.date === today() ? 'today' : undefined}
											invalid={dateField.invalid} describedBy={dateField.describedBy}
											onChange={set('order-date', 'date')} />
									</Field>
									<Field label="Status" group>
										{/* Read left to right before shipping one: an order is placed, then
										    delivered, and only then can it be returned. This control once read
										    Delivered / Ordered / Returned in all three places it appears --
										    pixel-perfect in every engine, and saying an order was delivered
										    before it was placed. Geometry has no opinion about the order of
										    labels. README 13. */}
										<Segmented options={['Ordered', 'Delivered', 'Returned']} value={draft.status}
											onChange={v => update({ status: v })} label="Status" />
									</Field>
								</FieldPair>

								<FieldPair variant="field-pair-stack-early">
									<Field label="Categories">
										<FieldShell style={{ height: 'auto', minHeight: 48, padding: '8px 10px', flexWrap: 'wrap' }}>
											{draft.categories.map(name => (
												<Chip key={name} label={`Remove category ${name}`}
													onRemove={() => update({ categories: draft.categories.filter(c => c !== name) })}>
													{name}</Chip>
											))}
											<input type="text" placeholder="Add category…" aria-label="Add category"
												style={{ flex: '1 1 120px' }}
												onKeyDown={e => {
													if (e.key !== 'Enter' || !e.target.value.trim()) return
													e.preventDefault()
													const name = e.target.value.trim()
													if (!draft.categories.includes(name)) update({ categories: [...draft.categories, name] })
													e.target.value = ''
												}} />
										</FieldShell>
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
								</FieldPair>

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

								<FormActions split>
									<Button variant="ghost" to="/orders">CANCEL</Button>
									<Button variant="caps" onClick={next}>NEXT STEP</Button>
								</FormActions>
							</Form>
						</CardBody>
					</Card>
				</div>

				<div className="order-list-column">
					<OrderSummary draft={draft} estimate />
					<AiCard headline="Have the receipt? Skip the form."
						body="A photo or PDF fills every field for you; you only review it.">
						<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
						<AiCardMark size={34} />
					</AiCard>
				</div>
			</div>
		</Page>
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

const ITEM_FIELDS = [
	{ name: 'item-description', label: 'Description', check: v =>
		!v ? 'Describe the item.' : v.length > 120 ? '120 characters at most.' : '' },
	{ name: 'item-quantity', label: 'Quantity', check: v =>
		!v ? 'How many did you buy?'
		: !WHOLE_NUMBER_PATTERN.test(v) ? 'Whole pieces only, such as 2.'
		: Number(v) < 1 ? 'At least 1 pc.'
		: Number(v) > 9999 ? '9.999 pcs at most.' : '' },
	{ name: 'item-price', label: 'Price paid', check: v =>
		!v ? 'What did you pay?'
		: !AMOUNT_PATTERN.test(v) ? 'Amounts take a comma, such as 89,95.' : '' },
	{ name: 'item-retail', label: 'Retail price', check: v =>
		!v || AMOUNT_PATTERN.test(v) ? '' : 'Amounts take a comma, such as 104,95.' }
]

const BLANK_ITEM = { 'item-description': '', 'item-quantity': '', 'item-price': '', 'item-retail': '' }

export function NewOrderItems() {
	const { draft, update } = useOutletContext()
	const navigate = useNavigate()
	const [form, setForm] = useState(BLANK_ITEM)
	const [status, setStatus] = useState({ message: '', good: true })
	const [saving, setSaving] = useState(false)
	const nextId = useRef(0)

	const { check, recheck, clear, propsFor } = useFieldErrors(ITEM_FIELDS, form)
	const itemDescription = propsFor('item-description')
	const itemQuantity = propsFor('item-quantity')
	const itemPrice = propsFor('item-price')
	const itemRetail = propsFor('item-retail')

	const set = name => v => { setForm(f => ({ ...f, [name]: v })); recheck(name, v) }

	const clearForm = useCallback(() => {
		setForm(BLANK_ITEM)
		clear()
		focusField('item-description')
	}, [clear])

	const submit = () => {
		const failed = check()
		if (failed.length) {
			setStatus({ message: 'Not added — ' + needFixing(failed), good: false })
			focusField(failed[0].name)
			return
		}
		const item = {
			id: 'new-' + (nextId.current++),
			title: form['item-description'].trim(),
			quantity: Number(form['item-quantity']),
			price: parseAmount(form['item-price']),
			retail: form['item-retail'] ? parseAmount(form['item-retail']) : undefined
		}
		const items = [...draft.items, item]
		update({ items })
		clearForm()
		const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
		setStatus({ message: `${item.title} added. Items · ${items.length}, ${kr(total)}`, good: true })
	}

	const save = () => {
		setSaving(true)
		createOrder(draft)
			.then(order => {
				/* The list, the dashboard and the overview all count orders, so all three are
				   dropped from the cache rather than left showing the count from before. */
				invalidate(getOrders); invalidate(getHomeContent); invalidate(getOrdersOverview)
				navigate('/orders/' + order.id)
			})
			.catch(() => { setSaving(false); setStatus({ message: 'That did not save. Try again.', good: false }) })
	}

	return (
		<Page>
			<Stepper steps={STEPS(1)} />
			<div className="order-list-grid">
				<div className="order-list-column">
					<Card aria-label="Add the items">
						<CardBody variant="card-body-page">
							<div className="card-headline">Add the items</div>
							<p className="card-lead">Line by line, with the price you paid and what it would have cost at retail.</p>
							<Form>
								{/* The help text beside the button promises both keys, so the section owns
								    them: Enter adds and keeps the form, Escape empties it. Escape also
								    clears the verdict -- a red "Not added" over four blank fields describes
								    nothing. */}
								<FilterSection
									onKeyDown={e => {
										if (!(e.target instanceof HTMLInputElement)) return
										if (e.key === 'Enter') { e.preventDefault(); submit() }
										else if (e.key === 'Escape') {
											e.preventDefault(); e.stopPropagation()
											clearForm(); setStatus({ message: '', good: true })
										}
									}}>
									<FormStatus message={status.message} good={status.good} />

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
										<Field label="Photo"
											help="Uploaded state keeps the field height; the photo shows large on the item row below, not in the form.">
											<FieldShell as="label">
												<span className="field-thumb" aria-hidden="true"><Icon name="photo" /></span>
												<input type="file" accept="image/*" aria-label="Product photo" className="field-file-input" />
												<span className="field-file-name">shampoo-500ml.jpg</span>
												<IconButton variant="clear" icon="close" label="Remove photo" />
											</FieldShell>
										</Field>
									</FieldPair>

									<FormActions>
										<Button variant="caps compact" icon="plus" onClick={submit}>ADD ITEM</Button>
										<span className="field-help" style={{ alignSelf: 'center' }}>
											Enter adds and keeps the form; Escape clears it.</span>
									</FormActions>
								</FilterSection>

								<div>
									<div className="space-between space-between-tight">
										<span className="section-label">Items · {draft.items.length}</span>
										<span className="field-help">drag to reorder</span>
									</div>
									<InsetPanel>
										{draft.items.map(item => (
											<ItemRow key={item.id} grip icon="cube" title={item.title}
												meta={`${item.quantity} × ${kr(item.price)}`
													+ (item.retail ? ` · retail ${kr(item.retail)}` : '')}
												amount={kr(item.price * item.quantity)}>
												<span className="row-inline" style={{ gap: 2 }}>
													<IconButton icon="pencil" label={`Edit ${item.title}`} />
													<IconButton icon="trash" label={`Delete ${item.title}`}
														onClick={() => update({ items: draft.items.filter(i => i.id !== item.id) })} />
												</span>
											</ItemRow>
										))}
									</InsetPanel>
								</div>

								<FormActions split>
									<Button variant="ghost" icon="chevronLeft" to="/orders/new">BACK</Button>
									<Button variant="caps" onClick={save} disabled={saving}>
										{saving ? 'SAVING…' : 'SAVE ORDER'}</Button>
								</FormActions>
							</Form>
						</CardBody>
					</Card>
				</div>

				<div className="order-list-column">
					<OrderSummary draft={draft} estimate showItems />
					<Card aria-label="Tips">
						<CardHeader title="Good to know" />
						<CardDivider />
						<CardBody>
							<InsetPanel>
								<ItemRow icon="reorder" title="Drag to reorder"
									meta="The order here is the order on the receipt." />
								<ItemRow icon="undo" title="Escape cancels"
									meta="An inline edit rolls back untouched." />
							</InsetPanel>
						</CardBody>
					</Card>
				</div>
			</div>
		</Page>
	)
}
