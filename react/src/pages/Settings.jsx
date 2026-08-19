import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Combobox } from '../components/Combobox.jsx'
import {
	CheckRow, Field, FieldPair, FilterSection, Form, FormActions, Segmented
} from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import {
	CURRENCIES, LOCALES, localStamp, localeSample, plural, setCurrency, setLocale
} from '../api/format.js'
import { invalidate, useApi } from '../api/useApi.js'
import {
	cardRowOptions, checkVersion, failureMessage, getCategories, getHomeContent, getOrderDraft, getOrders,
	getOrdersOverview, getSettings, getVendors, getVersion, listSorts, logout, markSetupSeen,
	populateDemoData, resetStoredData, saveSettings, sorts, spendKinds
} from '../api/client.js'

/* Settings.

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

const PAGE_SIZES = ['5', '10', '15', '20', '25', '50', '100']

/* "Danish (18.08.2026, 14.26)" -- the name and what it renders, in one string, used for both
   the option and the value the closed combobox shows so the two cannot drift. The sample
   comes from the formatter rather than from a literal: it is the only way the label is still
   true after ICU changes its mind about a locale. */
const localeLabel = l => `${l.label} (${localeSample(l.code)})`

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

export default function Settings() {
	const state = useApi(getSettings)
	/* Whether FILL WITH DEMO DATA may be pressed at all -- it replaces the account outright, so
	   an account that already holds real orders locks the card rather than risking a stray
	   click undoing someone's own entries. `total` is the same count CLEAR STORED DATA's own
	   card is warning about. */
	const orders = useApi(getOrders, [{ pageSize: 1 }])
	const hasOrders = Boolean(orders.data?.total)
	const toast = useToast()
	/* Set by the one-time detour a new account takes here (pages/Register.jsx, pages/Login.jsx).
	   Read from navigation state rather than fetched, because the two places that send a reader
	   here already know why, and an extra request would be asking the server a question the
	   redirect just answered. */
	const firstRun = Boolean(useLocation().state?.firstRun)
	/* Recorded on arrival rather than on save or on leaving: the flag means "has been shown
	   this page", and they are looking at it. Anything later turns a reader who reads the page
	   and closes the tab into a reader who gets sent back next time, which is the one thing a
	   welcome must not do. Its failure is nobody's problem -- one repeated detour. */
	useEffect(() => { if (firstRun) markSetupSeen().catch(() => {}) }, [firstRun])
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
			<Async state={state} label="Loading your settings"
				skeleton={<>
					<SkeletonCard lines={4} />
					<SkeletonCard lines={3} />
					<SkeletonCard lines={2} />
				</>}>{settings => (
				<SettingsBody settings={settings} set={set} toast={toast} firstRun={firstRun}
					confirming={confirming} setConfirming={setConfirming} refresh={refresh}
					filling={filling} setFilling={setFilling}
					demoCount={demoCount} setDemoCount={setDemoCount}
					demoPeriod={demoPeriod} setDemoPeriod={setDemoPeriod}
					hasOrders={hasOrders} refreshOrders={orders.refresh}
					reload={state.refresh} />
			)}</Async>
		</Page>
	)
}

function SettingsBody({ settings, set, toast, firstRun, confirming, setConfirming, refresh, reload,
	filling, setFilling, demoCount, setDemoCount, demoPeriod, setDemoPeriod, hasOrders, refreshOrders }) {
	const navigate = useNavigate()
	const signOut = () => logout().then(() => navigate('/login', { replace: true }))
	/* The controls are driven from the stored value, so what is on screen is what is saved --
	   there is no local copy to drift. `local` exists only to keep a control responsive while
	   the phantom API is answering. */
	const [local, setLocal] = useState(settings)
	useEffect(() => setLocal(settings), [settings])

	const change = (patch, said) => { setLocal(l => ({ ...l, ...patch })); set(patch, said) }

	const clear = () => {
		resetStoredData()
			.then(() => {
				/* The reset replaced the account's whole ledger, so no cached answer anywhere
				   survives it -- the bare call clears everything, not a list of endpoints. */
				invalidate()
				reload()
				refreshOrders()
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
				refreshOrders()
				setFilling(false)
				// The span in the unit it was chosen in: years when it is whole years, months when not.
				const span = months % 12 === 0 ? plural(months / 12, 'year') : plural(months, 'month')
				toast(`${plural(orders, 'order')} across ${span}, ${plural(vendors, 'vendor')} and ${plural(categories, 'category', 'categories')}.`)
			})
			.catch(e => toast(failureMessage(e, 'That did not fill.'), 'negative'))
			.finally(() => setBusy(false))
	}

	return (
		<div className="order-list-grid">
			<div className="order-list-column">
				<Card aria-label="General settings">
					<CardBody variant="card-body-page">
						<div className="card-headline">{firstRun ? 'Welcome to Spendly' : 'General settings'}</div>
						{/* A new account is sent here before it is sent to Home, so the lead says why
						    rather than leaving a preferences page to explain itself. It names the one
						    setting that was guessed -- the date format, worked out from this browser's
						    timezone -- because a value chosen on a reader's behalf should be pointed at,
						    not left for them to find. Nothing here is required: every setting has a
						    working default, so the line offers the page rather than gating on it. */}
						<p className="card-lead">{firstRun
							? "Nothing here needs changing to get started. Your date and time format was set from your browser's timezone, so it is worth a look, and you can change any of this later."
							: 'What a new order starts as, and how your lists behave.'}</p>
						<Form>
							<FilterSection>
								<span className="panel-heading">New orders</span>
								<FieldPair>
									<Field label="Kind" htmlFor="setting-default-kind" help="What the Kind field on step 1 opens with.">
										<Combobox id="setting-default-kind" label="Default kind" value={local.defaultKind}
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

							{/* One section, because the two controls answer one question: how this
							    account's own figures and dates are written. Split, the heading over
							    the currency read "Money" and the date format had nowhere to go that
							    was not a section of one. README: Language and Formats. */}
							<FilterSection>
								<span className="panel-heading">Money, dates and times</span>
								{/* The unit the ledger is kept in, not a conversion: changing it restates what
								    the figures are called, never what they are worth, and the help says so
								    because a currency picker that silently revalued a ledger is exactly what a
								    reader has to be able to rule out. The symbol follows the account
								    everywhere, so it is set here before the page it changes is left. */}
								<Field label="Currency" htmlFor="setting-currency"
									help="What every amount is printed in. This renames your figures, it does not convert them.">
									<Combobox id="setting-currency" label="Currency"
										value={(c => (c ? `${c.label} (${c.symbol})` : ''))(CURRENCIES.find(c => c.code === local.currency))}
										onChange={() => {}}
										onSelect={o => { setCurrency(o.id); change({ currency: o.id }, 'Currency saved.') }}
										groups={[{ heading: 'Currency', options: CURRENCIES.map(c => ({ id: c.code, label: `${c.label} (${c.symbol})` })) }]} />
								</Field>

								{/* Every option carries what it actually renders, drawn through the same
								    formatter the product uses, because "Danish" and "English (UK)" name a
								    shape the reader cannot see from the label -- and a sample typed in by
								    hand is a claim about ICU that goes stale without anyone noticing.
								    Default is "Match my browser", which is what the app did before this
								    control existed; it is offered as a choice rather than left implicit
								    because the browser answers with its UI language, not the reader's
								    region, and a reader whose two disagree has no other way to say so. */}
								<Field label="Date and time format" htmlFor="setting-locale"
									help="How every date and time is written. Times are always shown in your own clock; this is the shape they are written in.">
									<Combobox id="setting-locale" label="Date and time format"
										value={(l => (l ? localeLabel(l) : ''))(LOCALES.find(l => l.code === local.locale))}
										onChange={() => {}}
										onSelect={o => { setLocale(o.id); change({ locale: o.id }, 'Date and time format saved.') }}
										groups={[{ heading: 'Format', options: LOCALES.map(l => ({ id: l.code, label: localeLabel(l) })) }]} />
								</Field>
							</FilterSection>

							{/* Two sections, not one "Lists" section holding four controls. The four
							    answer two different questions -- how much of a list is shown, and what
							    order it arrives in -- and interleaved (count, sort, sort, count) they
							    read as one undifferentiated stack of preferences. Grouped by the
							    question, each section is two controls that share a heading and a
							    shape: both counts are segmented, both sorts are comboboxes.
							    README: Settings, Uniformity. */}
							<FilterSection>
								<span className="panel-heading">Rows and entries</span>
								<Field label="Rows per page" group
									help="How many rows the order, vendor and category lists show before the pager.">
									<Segmented options={PAGE_SIZES} value={String(local.pageSize)}
										onChange={v => change({ pageSize: Number(v) }, 'Page size saved.')}
										label="Rows per page" />
								</Field>
								<Field label="Entries per card" group
									help="How many rows a card on Home fills with: the latest orders, the top vendors, the favourites.">
									<Segmented options={cardRowOptions.map(String)}
										value={String(local.cardRows)}
										onChange={v => change({ cardRows: Number(v) }, 'Entries per card saved.')}
										label="Entries per card" />
								</Field>
							</FilterSection>

							<FilterSection>
								<span className="panel-heading">Sorting</span>
								<Field label="Sort orders by" htmlFor="setting-sort" help="What All orders opens sorted by.">
									<Combobox id="setting-sort" label="Default sort"
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
								<Field label="Sort vendors and categories by" htmlFor="setting-list-sort"
									help="What All vendors and All categories open sorted by. Both lists, one order.">
									<Combobox id="setting-list-sort" label="Default list sort"
										value={listSorts.find(s => s.id === local.listSort)?.label ?? ''}
										onChange={() => {}}
										onSelect={o => change({ listSort: o.id }, 'List order saved.')}
										groups={[{ heading: 'Sort', options: listSorts.map(s => ({ id: s.id, label: s.label })) }]} />
								</Field>
							</FilterSection>

							{/* The same checkbox rows the Import tab uses, for the same reason a reader
							    should not have to learn a second shape one tab over: an option is a
							    named row with its description hanging under the name, whether the act
							    that reads it is a button or the click itself. These two are read
							    immediately -- the toast under each is what says so, since the control
							    no longer does. README: Checkbox Row. */}
							<FilterSection>
								<span className="panel-heading">On screen</span>
								<CheckRow id="setting-scan-card" checked={local.showScanCard}
									label="Show the scan card on Home"
									help="LATER on the card itself turns this off too."
									onChange={v => change({ showScanCard: v },
										v ? 'The scan card is back on Home.' : 'The scan card is off.')} />
								<CheckRow id="setting-confirm-delete" checked={local.confirmDelete}
									label="Ask before deleting anything"
									help="An order, a category, a vendor, a line item, an attachment. With this off, the trash acts straight away."
									onChange={v => change({ confirmDelete: v },
										v ? 'Deleting will ask first.' : 'Deleting will not ask.')} />
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
							the account; signing back in returns you to them.
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
							Fill the account with made-up orders so the lists and charts have something
							in them to look at: as many as you choose, reaching as far back as you
							choose, every vendor and category its own colour. A different ledger
							every time: the orders, their days and their totals are rolled fresh on
							each fill.
						</p>
						{/* Only offered on an empty account: a fill replaces the ledger outright, and
						    that is a decision a stray click should never be able to make on real
						    orders. Locked rather than hidden, so the reason is on screen -- CLEAR
						    STORED DATA, right below, is what unlocks it. */}
						{hasOrders ? (
							<p className="field-help danger-note">
								This account already has orders in it. Clear your stored data first if
								you want to start over with demo orders instead.
							</p>
						) : null}
						<div className={hasOrders ? 'demo-data-controls demo-data-controls-locked' : 'demo-data-controls'}>
							<Field label="How many orders" htmlFor="demo-order-count" className="demo-count-field"
								help="Spread across the whole period. More orders take longer to write.">
								<Combobox id="demo-order-count" label="Orders to create"
									value={DEMO_ORDER_COUNTS.find(o => o.id === demoCount)?.label ?? ''}
									onChange={() => {}}
									onSelect={o => setDemoCount(o.id)}
									groups={[{ heading: 'Orders', options: DEMO_ORDER_COUNTS }]} />
							</Field>
							<Field label="Over how long" htmlFor="demo-period" className="demo-count-field"
								help="How far back the orders reach, ending today.">
								<Combobox id="demo-period" label="Period to create orders over"
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
								<Button variant="block" icon="sparkles" disabled={hasOrders}
									onClick={() => setFilling(true)}>FILL WITH DEMO DATA</Button>
							)}
						</div>
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
									This removes every order, vendor and category you have added, permanently,
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

				<BuildCard />
			</div>
		</div>
	)
}

/* Which build is serving this page. The Docker image stamps its build time and commit into
   /api/version, so a self-hosted box can be checked against the newest commit from here
   rather than by shelling into the container. Outside the image the endpoint answers nulls
   -- a dev server has no build to be out of date, and the card says so instead of dressing
   the absence up as a version. Its own fetch rather than a field on getSettings: the stamp
   is a fact about the deployment, not a setting, and the endpoint sits outside the auth
   gate for the same reason. */
function BuildCard() {
	const version = useApi(getVersion)
	/* The check is a button, not part of the card's load: it asks the registry over the
	   network, which is slow, can fail, and answers a question nobody asked on most visits.
	   The result lands in the card as a sentence, in the server's own words when it refuses
	   (failureMessage), because "could not read the registry" and "you are behind" are
	   different facts and only the server knows which one happened. */
	const [checking, setChecking] = useState(false)
	const [checked, setChecked] = useState(null)
	const check = () => {
		setChecking(true)
		setChecked(null)
		checkVersion()
			.then(setChecked)
			.catch(e => setChecked({ error: failureMessage(e, 'The registry could not be reached.') }))
			.finally(() => setChecking(false))
	}
	if (!version.data && !version.error) return null
	const { builtAt, commit } = version.data ?? {}
	return (
		<Card aria-label="This build">
			<CardHeader title="This build" />
			<CardDivider />
			<CardBody>
				<p className="card-lead card-lead-flush">
					{builtAt || commit ? (<>
						{/* The stamp carries the whole answer, so it is lifted out of the muted lead
						    rather than left at the weight of the sentence carrying it. It is written
						    in this account's own date format, in this reader's own clock, and names
						    no zone: it is their afternoon, on their machine. */}
						Image built <b>{builtAt ? localStamp(builtAt) : 'at an unrecorded time'}</b>
						{commit ? <> from commit <code>{commit.slice(0, 7)}</code></> : null}.
						{commit ? ' Checking asks the registry whether the published image is still this one.' : null}
					</>) : (
						'No build stamp: this server is not running from the Docker image, so what you see is whatever is on disk right now.'
					)}
				</p>
				{commit ? (<>
					{checked ? (
						<p className={'field-help' + (checked.error || checked.current === false ? ' danger-note' : '')}>
							{checked.error ? checked.error
								: checked.current ? 'Up to date: the newest published image is this build.'
								: checked.published ? 'Behind: a newer image than this build has been published. Pull and restart to catch up.'
								: "This build's commit has no published image, so there is nothing to compare it against. It is most likely a local build."}
						</p>
					) : null}
					<Button variant="block" icon="check" disabled={checking} onClick={check}>
						{checking ? 'CHECKING...' : 'CHECK FOR UPDATES'}
					</Button>
				</>) : null}
			</CardBody>
		</Card>
	)
}
