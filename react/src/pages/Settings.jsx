import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Combobox } from '../components/Combobox.jsx'
import {
	Field, FieldPair, FilterSection, Form, FormActions, Segmented, Switch
} from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import {
	cardRowOptions, failureMessage, getCategories, getHomeContent, getOrderDraft, getOrders, getOrdersOverview,
	getSettings, getVendors, listSorts, logout, populateDemoData, resetStoredData, saveSettings,
	sorts, spendKinds
} from '../api/client.js'

/* Order settings.

   The prototype draws an ORDER SETTINGS button at the foot of the Orders rail and it opens
   nothing. This is what it opens, and every switch on it is read somewhere: a settings page
   whose controls change nothing is the decorative-control rule one screen up, with more
   surface area. README: Honest Affordances.

   Each row below names where its value is used, because that is the fact a reader cannot
   check from the control itself.

   Saving is immediate. A settings page with a SAVE button has two states -- what is on
   screen and what is stored -- and the gap between them is a bug waiting for someone to
   navigate away. The status line says what happened; the caches that hold a stale copy of
   the answer are dropped in the same breath. */

const PAGE_SIZES = ['5', '10', '25', '50']

/* What FILL WITH DEMO DATA writes, chosen before it is pressed. Named counts rather than a
   free field: the point is a ledger big enough to look at, not a number to type, and the
   route caps at the largest of these anyway. */
const DEMO_ORDER_COUNTS = [
	{ id: 500, label: '500 orders' },
	{ id: 1000, label: '1K orders' },
	{ id: 5000, label: '5K orders' },
	{ id: 10000, label: '10K orders' },
	{ id: 25000, label: '25K orders' },
	{ id: 50000, label: '50K orders' }
]

/* How far back those orders reach, ending today. Stored in months because that is the unit
   the generator spreads by; labelled in years because that is the unit a person chooses in. */
const DEMO_PERIODS = [
	{ id: 12, label: '1 year' },
	{ id: 24, label: '2 years' },
	{ id: 48, label: '4 years' },
	{ id: 72, label: '6 years' },
	{ id: 96, label: '8 years' },
	{ id: 120, label: '10 years' },
	{ id: 144, label: '12 years' },
	{ id: 216, label: '18 years' },
	{ id: 288, label: '24 years' }
]

/* The import card's reference block. Every JSON fragment is JSON.stringify's own output over
   a real example value -- a hand-formatted block with annotation columns drifted out of
   alignment immediately -- and the colour is a small tokenizer over that output: keys strong,
   strings green, numbers blue, punctuation muted. The rules the annotations used to carry sit
   in the list under the block instead. */
const IMPORT_EXAMPLE = {
	orders: [{
		vendor: 'Bilka', date: '2026-07-18', kind: 'Expense', status: 'Delivered',
		categories: ['Groceries'], shipping: 0, reference: 'A-10419', note: '',
		items: [{
			title: 'Rugbrød', quantity: 1, price: 24.95, retail: 32.00, note: '',
			attachments: [{ filename: 'brod.jpg', contentType: 'image/jpeg', data: '<base64>' }]
		}],
		attachments: [{ filename: 'receipt.pdf', contentType: 'application/pdf', data: '<base64>' }]
	}]
}

const tokenizeJson = (text, prefix) => {
	const pattern = /("(?:[^"\\]|\\.)*")(\s*:)?|-?\d+(?:\.\d+)?|[{}[\],]/g
	const out = []
	let last = 0, n = 0, m
	while ((m = pattern.exec(text))) {
		if (m.index > last) out.push(text.slice(last, m.index))
		const key = `${prefix}-${n++}`
		if (m[1] != null) out.push(<span key={key} className={m[2] ? 'tok-key' : 'tok-str'}>{m[1]}</span>, m[2] ?? '')
		else if (/^[{}[\],]$/.test(m[0])) out.push(<span key={key} className="tok-pun">{m[0]}</span>)
		else out.push(<span key={key} className="tok-num">{m[0]}</span>)
		last = m.index + m[0].length
	}
	out.push(text.slice(last))
	return out
}

/* Three boxes, each holding only the request or response itself; what each one means is
   ordinary prose beneath its box, never annotation lines inside it. */
const RECIPE_LOGIN = [
	<span key="req" className="tok-req">POST /api/auth/login</span>, '\n',
	...tokenizeJson(JSON.stringify({ email: '...', password: '...' }, null, 2), 'login')
]
const RECIPE_REQUEST = [
	<span key="req" className="tok-req">POST /api/orders/import</span>, '\n',
	...tokenizeJson(JSON.stringify(IMPORT_EXAMPLE, null, 2), 'body')
]
const RECIPE_RESPONSE = [
	<span key="ok" className="tok-req">200</span>, '\n',
	...tokenizeJson(JSON.stringify({ imported: 1, orders: ['...'], failed: [{ index: 3, error: '...' }] }, null, 2), 'resp')
]

export default function Settings() {
	const state = useApi(getSettings)
	const toast = useToast()
	const [confirming, setConfirming] = useState(false)
	const [filling, setFilling] = useState(false)
	/* Beside `filling` rather than in the body for the same reason `filling` is: the body
	   remounts when the settings reload, and the chosen count and period should survive that. */
	const [demoCount, setDemoCount] = useState(DEMO_ORDER_COUNTS[0].id)
	const [demoPeriod, setDemoPeriod] = useState(DEMO_PERIODS[0].id)

	/* The endpoints that bake a setting into their answer. Anything cached from before the
	   change is wrong the moment it is saved, so it goes rather than being left to expire. */
	const refresh = useCallback(() => {
		invalidate(getSettings); invalidate(getOrderDraft); invalidate(getOrders); invalidate(getHomeContent)
		// Entries per card is baked into what Home and the orders overview answer, and the list
		// order into what the vendors and categories tabs open as -- so their caches are as
		// stale as the rest the moment either is saved.
		invalidate(getOrdersOverview)
		invalidate(getVendors); invalidate(getCategories)
	}, [])

	const set = useCallback((patch, said) => {
		saveSettings(patch)
			.then(() => { refresh(); toast(said) })
			.catch(e => toast(failureMessage(e, 'That did not save.'), 'negative'))
	}, [refresh, toast])

	return (
		<Page>
			<Async state={state} label="Loading your settings">{settings => (
				<SettingsBody settings={settings} set={set} toast={toast}
					confirming={confirming} setConfirming={setConfirming} refresh={refresh}
					filling={filling} setFilling={setFilling}
					demoCount={demoCount} setDemoCount={setDemoCount}
					demoPeriod={demoPeriod} setDemoPeriod={setDemoPeriod}
					reload={state.refresh} />
			)}</Async>
		</Page>
	)
}

function SettingsBody({ settings, set, toast, confirming, setConfirming, refresh, reload,
	filling, setFilling, demoCount, setDemoCount, demoPeriod, setDemoPeriod }) {
	const navigate = useNavigate()
	const signOut = () => logout().then(() => navigate('/login', { replace: true }))
	/* The controls are driven from the stored value, so what is on screen is what is saved --
	   there is no local copy to drift. `local` exists only to keep a control responsive while
	   the phantom API is answering. */
	const [local, setLocal] = useState(settings)
	useEffect(() => setLocal(settings), [settings])
	const [importOpen, setImportOpen] = useState(false)

	const change = (patch, said) => { setLocal(l => ({ ...l, ...patch })); set(patch, said) }

	const clear = () => {
		resetStoredData()
			.then(() => {
				/* The reset replaced the account's whole ledger, so no cached answer anywhere
				   survives it -- the bare call clears everything, not a list of endpoints. */
				invalidate()
				reload()
				setConfirming(false)
				toast('Everything stored in this browser was cleared.')
			})
			.catch(e => toast(failureMessage(e, 'That did not clear.'), 'negative'))
	}

	/* `busy` rather than only hiding the confirm: a year of orders is one request, and a
	   second press before it answers would run the whole replace twice. */
	const [busy, setBusy] = useState(false)
	const fill = () => {
		setBusy(true)
		populateDemoData(demoCount, demoPeriod)
			.then(({ orders, vendors, categories, months }) => {
				// A whole replaced ledger, same as the reset above: everything goes.
				invalidate()
				reload()
				setFilling(false)
				// The span in the unit it was chosen in: years when it is whole years, months when not.
				const span = months % 12 === 0 ? `${months / 12} year${months === 12 ? '' : 's'}` : `${months} months`
				toast(`${orders} orders across ${span}, ${vendors} vendors and ${categories} categories.`)
			})
			.catch(e => toast(failureMessage(e, 'That did not fill.'), 'negative'))
			.finally(() => setBusy(false))
	}

	return (
		<div className="order-list-grid">
			<div className="order-list-column">
				<Card aria-label="Order settings">
					<CardBody variant="card-body-page">
						<div className="card-headline">Order settings</div>
						<p className="card-lead">What a new order starts as, and how your lists behave.</p>
						<Form>
							<FilterSection>
								<span className="panel-heading">New orders</span>
								<FieldPair>
									<Field label="Kind" help="What the Kind field on step 1 opens with.">
										<Combobox label="Default kind" value={local.defaultKind}
											onChange={v => change({ defaultKind: v }, 'Default kind saved.')}
											onSelect={o => change({ defaultKind: o.label }, 'Default kind saved.')}
											groups={[{ heading: 'Kinds', options: spendKinds.map(k => ({ id: k, label: k })) }]} />
									</Field>
									<Field label="Status" group help="Which segment is selected on a new order.">
										<Segmented options={['Ordered', 'Delivered', 'Returned']}
											value={local.defaultStatus}
											onChange={v => change({ defaultStatus: v }, 'Default status saved.')}
											label="Default status" />
									</Field>
								</FieldPair>
							</FilterSection>

							<FilterSection>
								<span className="panel-heading">Lists</span>
								<Field label="Rows per page" group
									help="How many orders All orders shows before the pager.">
									<Segmented options={PAGE_SIZES} value={String(local.pageSize)}
										onChange={v => change({ pageSize: Number(v) }, 'Page size saved.')}
										label="Rows per page" />
								</Field>
								<Field label="Sort orders by" help="What All orders opens sorted by.">
									<Combobox label="Default sort"
										value={sorts.find(s => s.id === local.sort)?.label ?? ''}
										onChange={() => {}}
										onSelect={o => change({ sort: o.id }, 'Default sort saved.')}
										groups={[{ heading: 'Sort', options: sorts.map(s => ({ id: s.id, label: s.label })) }]} />
								</Field>
								{/* One control for two lists, because they are the same kind of list and
								    the answer is the same answer. Only the orders both of them have:
								    vendors can also sort by order count and categories by share, and a
								    default naming either would be a setting one of the two pages could
								    not obey. README: Settings. */}
								{/* The same control as the sort above it, because it is the same question:
								    a combobox over a named list of orders. It shipped once as a segmented
								    control -- two controls asking one kind of thing, side by side, drawn
								    differently. README: Uniformity, Fields and Forms. */}
								<Field label="Sort vendors and categories by"
									help="What All vendors and All categories open sorted by. Both lists, one order.">
									<Combobox label="Default list sort"
										value={listSorts.find(s => s.id === local.listSort)?.label ?? ''}
										onChange={() => {}}
										onSelect={o => change({ listSort: o.id }, 'List order saved.')}
										groups={[{ heading: 'Sort', options: listSorts.map(s => ({ id: s.id, label: s.label })) }]} />
								</Field>
								<Field label="Entries per card" group
									help="How many rows a card on Home fills with — the latest orders, the top vendors, the favourite categories.">
									<Segmented options={cardRowOptions.map(String)}
										value={String(local.cardRows)}
										onChange={v => change({ cardRows: Number(v) }, 'Entries per card saved.')}
										label="Entries per card" />
								</Field>
							</FilterSection>

							<FilterSection>
								<span className="panel-heading">On screen</span>
								<div className="space-between">
									<span className="field-help toggle-help">
										Show the scan card on Home. LATER on the card itself turns this off too.
									</span>
									<Switch checked={local.showScanCard} label="Show the scan card on Home"
										onChange={v => change({ showScanCard: v },
											v ? 'The scan card is back on Home.' : 'The scan card is off.')} />
								</div>
								<div className="space-between">
									<span className="field-help toggle-help">
										Ask before deleting anything — an order, a category, a vendor, a line
										item, an attachment. With this off, the trash acts straight away.
									</span>
									<Switch checked={local.confirmDelete} label="Ask before deleting anything"
										onChange={v => change({ confirmDelete: v },
											v ? 'Deleting will ask first.' : 'Deleting will not ask.')} />
								</div>
							</FilterSection>
						</Form>
					</CardBody>
				</Card>
			</div>

			<div className="order-list-column">
				<Card aria-label="Account">
					<CardHeader title="Account" />
					<CardDivider />
					<CardBody>
						<p className="card-lead card-lead-flush">
							Sign out on this device. Your orders, vendors, categories and settings stay on
							the account — signing back in returns you to them.
						</p>
						<Button variant="block" onClick={signOut}>
							SIGN OUT
						</Button>
					</CardBody>
				</Card>

				{/* Demo data is asked for, never given. A fresh account used to arrive holding a
				    stranger's shopping, which reads as a leak rather than a demo, so nothing
				    populates itself -- this is the door, and it is behind a confirm because it
				    replaces whatever is already here. */}
				<Card aria-label="Demo data">
					<CardHeader title="Demo data" />
					<CardDivider />
					<CardBody>
						<p className="card-lead card-lead-flush">
							Fill the account with made-up orders — as many as you choose, reaching as
							far back as you choose, every vendor and category its own colour — so the
							lists and charts have something in them to look at. A different ledger
							every time: the orders, their days and their totals are rolled fresh on
							each fill.
						</p>
						<Field label="How many orders" className="demo-count-field"
							help="Spread across the whole period. More orders take longer to write.">
							<Combobox label="Orders to create"
								value={DEMO_ORDER_COUNTS.find(o => o.id === demoCount)?.label ?? ''}
								onChange={() => {}}
								onSelect={o => setDemoCount(o.id)}
								groups={[{ heading: 'Orders', options: DEMO_ORDER_COUNTS }]} />
						</Field>
						<Field label="Over how long" className="demo-count-field"
							help="How far back the orders reach, ending today.">
							<Combobox label="Period to create orders over"
								value={DEMO_PERIODS.find(p => p.id === demoPeriod)?.label ?? ''}
								onChange={() => {}}
								onSelect={p => setDemoPeriod(p.id)}
								groups={[{ heading: 'Period', options: DEMO_PERIODS }]} />
						</Field>
						{filling ? (
							<>
								<p className="field-help danger-note">
									This replaces what is here now. Every order, vendor and category you have
									added is removed first, and the demo year is written in its place.
								</p>
								<FormActions>
									<Button variant="caps compact" disabled={busy} onClick={fill}>
										{busy ? 'FILLING...' : 'YES, FILL IT'}
									</Button>
									<Button variant="ghost compact" disabled={busy}
										onClick={() => setFilling(false)}>CANCEL</Button>
								</FormActions>
							</>
						) : (
							<Button variant="block" icon="sparkles"
								onClick={() => setFilling(true)}>FILL WITH DEMO DATA</Button>
						)}
					</CardBody>
				</Card>

				<Card aria-label="Stored data">
					<CardHeader title="Your data" />
					<CardDivider />
					<CardBody>
						<p className="card-lead card-lead-flush">
							Orders you save, vendors and categories you add, your dashboard and these
							settings belong to this account.
						</p>
						{confirming ? (
							<>
								<p className="field-help danger-note">
									This removes every order, vendor and category you have added — permanently,
									and there is no demo data to fall back to. The ledger goes back to empty.
								</p>
								<FormActions>
									<Button variant="caps compact" onClick={clear}>YES, CLEAR IT</Button>
									<Button variant="ghost compact" onClick={() => setConfirming(false)}>CANCEL</Button>
								</FormActions>
							</>
						) : (
							<Button variant="block" icon="trash"
								onClick={() => setConfirming(true)}>CLEAR STORED DATA</Button>
						)}
					</CardBody>
				</Card>

				{/* Documentation, not a control -- the one thing on this page that is, which is why
				    it is also the one card that opens closed: reference material for the day a
				    script gets written, not a screenful to scroll past on every visit. The example
				    mirrors validateOrderDraft and the import route; change those and change this.
				    Every JSON fragment is JSON.stringify's own output, coloured by a
				    ten-line tokenizer -- hand-aligned annotation columns drifted immediately. */}
				<Card aria-label="Import orders">
					<CardHeader title="Import from another system"
						onToggle={() => setImportOpen(open => !open)} open={importOpen}
						controls="import-reference"
						label={importOpen ? 'Hide the import reference' : 'Show the import reference'} />
					{importOpen ? (
						<>
							<CardDivider />
							<CardBody id="import-reference">
								<p className="card-lead card-lead-flush">
									Bring orders in from another expense tracker — vendors, categories, line
									items and receipt files — with a script of your own: sign in, post the
									orders, read back what landed.
								</p>
								<pre className="import-schema" aria-label="Sign-in request">{RECIPE_LOGIN}</pre>
								<span className="field-help import-caption">
									Signing in sets the <code>spendly_session</code> cookie and returns the same
									token in the body. Every later call takes either credential: the cookie, or{' '}
									<code>Authorization: Bearer</code> with that token.
								</span>
								<pre className="import-schema" aria-label="Import request shape">{RECIPE_REQUEST}</pre>
								<ul className="import-rules">
									<li>Required: <code>vendor</code>, <code>date</code>, <code>kind</code>, and at
										least one item with <code>title</code>, <code>quantity</code> and{' '}
										<code>price</code>. Everything else is optional, and every amount ≥ 0.</li>
									<li><code>vendor</code> ≤ 80 characters.</li>
									<li><code>title</code> ≤ 120 characters.</li>
									<li><code>quantity</code> a whole number, 1–9999.</li>
									<li><code>date</code> is YYYY-MM-DD and never in the future.</li>
									<li><code>kind</code>: Expense, Gift, Sold, Work or Other.</li>
									<li><code>status</code>: Ordered, Delivered or Returned — Delivered when omitted.</li>
									<li>Attachments carry base64 bytes: on the order for the receipt, on an item
										for its photo.</li>
									<li>Vendors and categories are matched by name, case-insensitively, and
										created when new.</li>
								</ul>
								<pre className="import-schema" aria-label="Import response shape">{RECIPE_RESPONSE}</pre>
								<span className="field-help">
									Each order imports in its own transaction, so one bad row fails alone — the
									response names every failure by its index, and the status is 400 only when
									the array is empty or nothing imported. Batch large exports: the request body
									is capped at 50&nbsp;MB, and base64 grows files by a third.
								</span>
							</CardBody>
						</>
					) : null}
				</Card>
			</div>
		</div>
	)
}
