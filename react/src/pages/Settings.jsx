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
	getHomeContent, getOrderDraft, getOrders, getSettings, logout, populateDemoData,
	resetStoredData, saveSettings, sorts, spendKinds
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

export default function Settings() {
	const state = useApi(getSettings)
	const toast = useToast()
	const [confirming, setConfirming] = useState(false)
	const [filling, setFilling] = useState(false)

	/* The endpoints that bake a setting into their answer. Anything cached from before the
	   change is wrong the moment it is saved, so it goes rather than being left to expire. */
	const refresh = useCallback(() => {
		invalidate(getSettings); invalidate(getOrderDraft); invalidate(getOrders); invalidate(getHomeContent)
	}, [])

	const set = useCallback((patch, said) => {
		saveSettings(patch)
			.then(() => { refresh(); toast(said) })
			.catch(() => toast('That did not save.', 'negative'))
	}, [refresh, toast])

	return (
		<Page>
			<Async state={state} label="Loading your settings">{settings => (
				<SettingsBody settings={settings} set={set} toast={toast}
					confirming={confirming} setConfirming={setConfirming} refresh={refresh}
					filling={filling} setFilling={setFilling}
					reload={state.refresh} />
			)}</Async>
		</Page>
	)
}

function SettingsBody({ settings, set, toast, confirming, setConfirming, refresh, reload,
	filling, setFilling }) {
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
				refresh()
				reload()
				setConfirming(false)
				toast('Everything stored in this browser was cleared.')
			})
			.catch(() => toast('That did not clear.', 'negative'))
	}

	/* `busy` rather than only hiding the confirm: a year of orders is one request, and a
	   second press before it answers would run the whole replace twice. */
	const [busy, setBusy] = useState(false)
	const fill = () => {
		setBusy(true)
		populateDemoData()
			.then(({ orders, vendors, categories, months }) => {
				refresh()
				reload()
				setFilling(false)
				toast(`${orders} orders across ${months} months, ${vendors} vendors and ${categories} categories.`)
			})
			.catch(() => toast('That did not fill.', 'negative'))
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
						<p className="card-lead" style={{ marginTop: 0 }}>
							Sign out on this device. Your orders, vendors, categories and settings stay on
							the account — signing back in returns you to them.
						</p>
						<Button variant="block" style={{ marginTop: 8 }} onClick={signOut}>
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
						<p className="card-lead" style={{ marginTop: 0 }}>
							Fill the account with a year of made-up orders — twelve months back, every
							vendor and category its own colour — so the lists and charts have something
							in them to look at. A different year every time: the orders, their days
							and their totals are rolled fresh on each fill.
						</p>
						{filling ? (
							<>
								<p className="field-help" style={{ color: 'var(--text-negative)', fontWeight: 600 }}>
									This replaces what is here now. Every order, vendor and category you have
									added is removed first, and the demo year is written in its place.
								</p>
								<FormActions>
									<Button variant="caps compact" disabled={busy} onClick={fill}>
										{busy ? 'FILLING…' : 'YES, FILL IT'}
									</Button>
									<Button variant="ghost compact" disabled={busy}
										onClick={() => setFilling(false)}>CANCEL</Button>
								</FormActions>
							</>
						) : (
							<Button variant="block" icon="sparkles" style={{ marginTop: 8 }}
								onClick={() => setFilling(true)}>FILL WITH DEMO DATA</Button>
						)}
					</CardBody>
				</Card>

				<Card aria-label="Stored data">
					<CardHeader title="Your data" />
					<CardDivider />
					<CardBody>
						<p className="card-lead" style={{ marginTop: 0 }}>
							Orders you save, vendors and categories you add, your dashboard and these
							settings belong to this account.
						</p>
						{confirming ? (
							<>
								<p className="field-help" style={{ color: 'var(--text-negative)', fontWeight: 600 }}>
									This removes every order, vendor and category you have added — permanently,
									and there is no demo data to fall back to. The ledger goes back to empty.
								</p>
								<FormActions>
									<Button variant="caps compact" onClick={clear}>YES, CLEAR IT</Button>
									<Button variant="ghost compact" onClick={() => setConfirming(false)}>CANCEL</Button>
								</FormActions>
							</>
						) : (
							<Button variant="block" icon="trash" style={{ marginTop: 8 }}
								onClick={() => setConfirming(true)}>CLEAR STORED DATA</Button>
						)}
					</CardBody>
				</Card>
			</div>
		</div>
	)
}
