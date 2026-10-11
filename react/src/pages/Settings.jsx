import { Fragment, useEffect, useReducer, useRef, useState } from 'react'
import { EmailLine } from '../components/EmailLine.jsx'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { Field } from '../components/Field.jsx'
import { Choice, FieldGroup, Switch } from '../components/Choice.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark, initialsOf } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { NavItem } from '../components/Shell.jsx'
import { Skeleton } from '../components/Utilities.jsx'
import { useToast } from '../components/Overlays.jsx'
import { Halves } from '../components/Well.jsx'
import { SaveBar } from '../components/Touch.jsx'
import { useMedia, useShellShape } from '../app/useMedia.js'
import { chosenTheme, followSystem, setDensity, setTheme, useTheme } from '../app/theme.js'
import { freshFetch, invalidate, useApi } from '../api/useApi.js'
import {
	failureMessage, getCategoryPage, getCategoryPages, getCurrentUser, getHomeAttention, getHomeCategories, getMonthlySummary, getComparedMonth, getOrderDraft, getOrders, getSettings, getStatsSlice, getStatuses, getVendorPage, getVendorPages, listSorts, removePicture, saveSettings,
	setViewsShown, sorts, spendKinds, updateProfile, uploadPicture
} from '../api/client.js'
import { CURRENCIES, LOCALES, amount, localeSample, plural, setCurrency, setLocale } from '../api/format.js'
import { ImportCard } from './SettingsImport.jsx'
import { DemoCard } from './SettingsDemo.jsx'
import { AccountCard } from './SettingsAccount.jsx'
import { PasskeysCard, usePasskeyCount } from './SettingsPasskeys.jsx'
import { BuildCard } from './SettingsBuild.jsx'
import { Choose, landing } from './SettingsParts.jsx'
import { LOOKS } from './needsLook.jsx'
import { StatusesCard, saveStatuses } from './SettingsStatuses.jsx'
import { useViews } from '../app/views.jsx'
import { useStatuses } from '../app/statuses.js'
import { useLeaveGuard } from './vendorsCategories.jsx'

// `keys` are the stored settings a pane edits, which is what decides the pane the save bar names
const SECTIONS = [
	{ key: 'account', label: 'Account and profile', keys: ['name', 'picture'] },
	{ key: 'appearance', label: 'Appearance', keys: ['density', 'compareMonth'] },
	{ key: 'money', label: 'Money, dates and times', keys: ['currency', 'locale'] },
	{ key: 'defaults', label: 'Defaults', keys: ['defaultKind', 'defaultStatus', 'scanOverrides'] },
	{ key: 'lists', label: 'Lists', keys: ['orderViews', 'pageSize', 'recentRows', 'sort', 'listSort'] },
	{ key: 'alerts', label: 'Limit alerts', keys: ['notifyWhileSaving', 'notifyMonthlySummary', 'notifyEarly'] },
	{ key: 'looks', label: 'Needs a look', keys: LOOKS.map(l => `look.${l.id}`) },
	{ key: 'statuses', label: 'Statuses', keys: ['statuses'] },
	{ key: 'import', label: 'Import' },
	{ key: 'demo', label: 'Demo data' },
	{ key: 'build', label: 'This build' }
]

// the first of the panes that are tools rather than preferences, which the nav sets apart (11a)
const TOOLS = 'import'

const PAGE_SIZES = [5, 10, 15, 20, 25, 50, 100]
// how many orders Home's Recent orders card can show, as the server allows
const RECENT_ROWS = Array.from({ length: 15 }, (_, i) => i + 1)
// how many saved views the sidebar lists (11a), as the server allows
const VIEWS_SHOWN = [2, 3, 4, 5, 6, 8, 10]

const THEMES = [
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
	{ value: 'system', label: 'Follow system' }
]

const DENSITIES = [
	{ value: 'comfortable', label: 'Comfortable' },
	{ value: 'compact', label: 'Compact' }
]

const COMPARES = [
	{ id: 'last', label: 'Last month' },
	{ id: 'year', label: 'Same month last year' }
]

// the share of a limit a warning starts at (8b); 100 is only once it is passed
const EARLY = [
	{ value: 75, label: '75%' },
	{ value: 90, label: '90%' },
	{ value: 100, label: 'Only over' }
]
// what a key the server does not send yet stands at, as 8b draws it
const ALERT_DEFAULTS = { notifyWhileSaving: true, notifyMonthlySummary: true, notifyEarly: 90, scanOverrides: true }
// a rule of Needs a look is kept in the draft as `look.<rule>` and saved as one `looks` map
const lookValues = settings => Object.fromEntries(LOOKS.map(l => [`look.${l.id}`, settings?.looks?.[l.id] ?? l.on]))

const currencyLabel = c => `${c.label} (${c.symbol})`
const localeLabel = l => `${l.label} (${localeSample(l.code)})`
// the chosen currency, not the saved one: the preview shows what Save would make every amount
const previewAmount = code => {
	const c = CURRENCIES.find(x => x.code === code) ?? CURRENCIES[0]
	return c.before ? c.symbol + amount(1234.5) : `${amount(1234.5)} ${c.symbol}`
}

/* Saved settings are baked into these answers, so each is dropped the moment a save lands. */
const dropStale = () => {
	for (const fn of [getSettings, getOrderDraft, getOrders, getVendorPage, getVendorPages, getCategoryPage, getCategoryPages, getHomeAttention, getHomeCategories, getMonthlySummary, getComparedMonth, getStatsSlice])
		invalidate(fn)
}

export default function Settings() {
	const { section } = useParams()
	// each opening of a section is its own visit, so opening the one already open goes back to it
	const visit = useLocation().key
	const row = useRef(null)
	const shape = useShellShape()
	const narrow = useMedia('(max-width: 899.98px)')
	const settings = useApi(getSettings)
	const user = useApi(getCurrentUser)
	const statuses = useApi(getStatuses)
	const toast = useToast()
	const [draft, setDraft] = useState({})
	const [saving, setSaving] = useState(false)
	// the name is the account's and the sidebar's view count is kept with the views; both save with the rest
	const shown = useViews().data?.shown
	const saved = settings.data && user.data
		? { ...ALERT_DEFAULTS, ...settings.data, ...lookValues(settings.data), name: user.data.name ?? '', picture: user.data.picture ?? null, orderViews: shown ?? 4, statuses: statuses.data }
		: null
	// Passkeys is a card under Account and profile, and on a phone a page of its own (7a)
	const current = SECTIONS.some(s => s.key === section) || section === 'passkeys' ? section : null
	const navCurrent = key => (key === 'passkeys' ? 'account' : key)

	const value = key => (key in draft ? draft[key] : saved?.[key])
	const change = (key, next) => setDraft(d => {
		const out = { ...d, [key]: next }
		if (saved && saved[key] === next) delete out[key]
		return out
	})
	const dirty = SECTIONS.filter(s => s.keys?.some(k => k in draft))
	// moving between panes keeps the draft, so only leaving Settings asks first, naming what is lost
	const guard = useLeaveGuard(dirty.length > 0, { within: '/settings', names: dirty.map(s => s.label) })

	const save = () => {
		setSaving(true)
		const { name, picture, orderViews, statuses: edited, ...rest } = draft
		const prefs = {}
		for (const [key, v] of Object.entries(rest)) {
			if (key.startsWith('look.')) prefs.looks = { ...prefs.looks, [key.slice(5)]: v }
			else prefs[key] = v
		}
		const account = name !== undefined || picture !== undefined
		const prefsSaved = Object.keys(prefs).length ? saveSettings(prefs) : null
		Promise.all([
			prefsSaved,
			name !== undefined ? updateProfile({ name }) : null,
			picture !== undefined ? (picture ? uploadPicture(picture) : removePicture()) : null,
			orderViews ? setViewsShown(orderViews) : null,
			// after the defaults, so a status the default just moved off can be deleted
			edited ? Promise.resolve(prefsSaved).then(() => saveStatuses(edited)).then(() => freshFetch(getStatuses)) : null
		])
			// the account's own answer is in before the draft goes, so the old picture never shows between
			.then(out => (account ? freshFetch(getCurrentUser).catch(() => {}).then(() => out) : out))
			.then(([next]) => {
				setCurrency(next?.currency ?? value('currency'))
				setLocale(next?.locale ?? value('locale'))
				setDensity(next?.density ?? value('density'))
				dropStale()
				settings.refresh()
				setDraft({})
				toast({ message: 'Your settings are saved.' })
			})
			.catch(e => {
				const message = failureMessage(e, 'Your changes were not saved. Try again.')
				if (message) toast({ message, color: 'danger' })
			})
			.finally(() => setSaving(false))
	}

	const touch = shape === 'touch'
	const fields = { value, change, touch }
	const cards = {
		account: touch
			? <AccountCard key="account" user={user.data} {...fields} />
			: [<AccountCard key="account" user={user.data} {...fields} />, <PasskeysCard key="passkeys" />],
		passkeys: <PasskeysCard key="passkeys" />,
		appearance: <AppearanceCard key="appearance" {...fields} />,
		money: <MoneyCard key="money" {...fields} />,
		defaults: <DefaultsCard key="defaults" reads={user.data?.scanAiEnabled} {...fields} />,
		lists: <ListsCard key="lists" {...fields} />,
		alerts: <AlertsCard key="alerts" {...fields} />,
		looks: <LooksCard key="looks" {...fields} />,
		statuses: <StatusesCard key="statuses" saved={saved?.statuses} {...fields} />,
		import: <ImportCard key="import" />,
		demo: <DemoCard key="demo" />,
		build: <BuildCard key="build" />
	}

	const discard = () => setDraft({})
	// on a phone the bar takes the tab bar's place at the bottom edge (r13, 5b)
	const saveBar = !dirty.length ? null
		: touch
			? (
				<SaveBar>
					<span className="sp-subtitle sp-grow">Unsaved changes</span>
					<Button variant="outline" disabled={saving} onClick={discard}>Discard</Button>
					<Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
				</SaveBar>
			)
			: (
				<ListItem variant="sticky">
					<span className="sp-data">
						{dirty.length === 1 ? `Unsaved changes in ${dirty[0].label}` : `Unsaved changes in ${dirty.length} sections`}
					</span>
					<span className="sp-grow" />
					<Button variant="outline" size="small" disabled={saving} onClick={discard}>Discard</Button>
					<Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
				</ListItem>
			)

	const seen = useSeenSection(!touch && saved != null)
	const failed = settings.error ?? user.error
	const body = failed && !saved
		? <Failed what="Your settings" error={failed} onRetry={() => { settings.refresh(); user.refresh() }} />
		: !saved
			? <><LoadingCard /><LoadingCard /><LoadingCard /></>
			: null

	if (touch) {
		if (body) return body
		return (
			<>
				{current ? <Arrive section={current} visit={visit}>{cards[current]}</Arrive> : <PhoneIndex user={user.data} />}
				{saveBar}
				{guard.prompt}
			</>
		)
	}

	return (
		<div className="sp-row-flex sp-top sp-gap-16" ref={row}>
			{narrow ? null : <SectionNav current={navCurrent(seen ?? current)} />}
			<div className="sp-stack sp-gap-12 sp-grow sp-column--form st-cards">
				{narrow ? <SectionPicker current={navCurrent(seen ?? current)} /> : null}
				{body ?? <Arrive section={current} visit={visit} room={row}>{SECTIONS.map(s => cards[s.key])}</Arrive>}
				{body ? null : saveBar}
			</div>
			{guard.prompt}
		</div>
	)
}

/* The section the nav marks is the last one whose heading has reached where opening a section puts
   it; the room under the last card lets every heading get there. The address stays as it is. */
function useSeenSection(active) {
	const [seen, setSeen] = useState(null)
	useEffect(() => {
		if (!active) return
		let frame = 0
		const look = () => {
			frame = 0
			const heads = [...document.querySelectorAll('[data-section]')]
			if (!heads.length) return
			const tops = heads.map(h => h.getBoundingClientRect().top)
			const line = tops[0] + window.scrollY + 24
			setSeen(heads[Math.max(0, tops.findLastIndex(t => t <= line))].dataset.section)
		}
		const onScroll = () => { if (!frame) frame = requestAnimationFrame(look) }
		window.addEventListener('scroll', onScroll, { passive: true })
		window.addEventListener('resize', onScroll)
		onScroll()
		return () => {
			window.removeEventListener('scroll', onScroll)
			window.removeEventListener('resize', onScroll)
			if (frame) cancelAnimationFrame(frame)
		}
	}, [active])
	return seen
}

function SectionNav({ current }) {
	return (
		<nav className="st-subnav" aria-label="Settings">
			<div className="sp-stack sp-gap-8 st-subnav__body">
				<span className="sp-section-label">Settings</span>
				<div className="sp-nav-list">
					{SECTIONS.map(s => (
						<Fragment key={s.key}>
							{s.key === TOOLS ? <span className="sp-rule" role="separator" /> : null}
							<NavItem variant="light" to={`/settings/${s.key}`} current={s.key === current}>{s.label}</NavItem>
						</Fragment>
					))}
				</div>
			</div>
		</nav>
	)
}

/* Below 900 the section nav is a select above the cards (11a). */
function SectionPicker({ current }) {
	const navigate = useNavigate()
	const chosen = SECTIONS.find(s => s.key === current)
	return (
		<Combobox value={chosen?.label ?? 'Go to a section'} aria-label="Settings section">
			{SECTIONS.map(s => (
				<ComboboxOption key={s.key} selected={s.key === current} onSelect={() => navigate(`/settings/${s.key}`)}>{s.label}</ComboboxOption>
			))}
		</Combobox>
	)
}

/* Arriving at /settings/<section> brings that card to where the first card sits and moves
   focus to its heading (9c), so a keyboard reader knows where they landed. */
function Arrive({ section, visit, room, children }) {
	const column = useRef(null)
	// after the page's own refs are in place, and before the scroll below that may need the room
	useEffect(() => {
		const box = column.current
		const holder = room?.current
		if (!holder || !box) return
		// room for the last heading to scroll up to where the first one sits: in the menu's column when
		// there is one, so the menu stays in view to the end; measured, so set where it is measured
		const fit = () => {
			const heads = box.querySelectorAll('[data-section]')
			if (heads.length < 2) return
			const nav = holder.querySelector(':scope > .st-subnav')
			if (nav) holder.style.removeProperty('padding-bottom')
			const cards = box.parentElement.getBoundingClientRect().height
			const now = nav ? parseFloat(nav.style.minHeight) || 0 : parseFloat(holder.style.paddingBottom) || 0
			const extra = nav ? Math.max(0, now - cards) : now
			const end = document.documentElement.scrollHeight - extra - window.innerHeight
			const need = Math.max(0, Math.ceil(heads[heads.length - 1].getBoundingClientRect().top - heads[0].getBoundingClientRect().top - end))
			if (nav) nav.style.minHeight = need ? cards + need + 'px' : ''
			else holder.style.paddingBottom = need ? need + 'px' : ''
		}
		fit()
		const watch = new ResizeObserver(fit)
		watch.observe(box.parentElement)
		window.addEventListener('resize', fit)
		return () => {
			watch.disconnect()
			window.removeEventListener('resize', fit)
			holder.style.paddingBottom = ''
			holder.querySelector(':scope > .st-subnav')?.style.removeProperty('min-height')
		}
	}, [room])
	useEffect(() => {
		const box = column.current
		const target = section && box?.querySelector(`[data-section="${section}"]`)
		if (!target) {
			window.scrollTo({ top: 0 })
			return
		}
		const first = box.querySelector('[data-section]')
		window.scrollTo({ top: target.getBoundingClientRect().top - first.getBoundingClientRect().top })
		target.focus({ preventScroll: true })
	}, [section, visit])
	return <div className="sp-stack sp-gap-12" ref={column}>{children}</div>
}

/* The theme lives in this browser, and applies the moment it is picked, as the sidebar's switch does. */
function AppearanceCard({ value, change, touch }) {
	useTheme()
	const [, redraw] = useReducer(n => n + 1, 0)
	const pick = next => {
		if (next === 'system') followSystem()
		else setTheme(next)
		redraw()
	}
	return (
		<Card>
			<CardHeader name="Appearance" {...landing('appearance')} />
			<Field label="Theme" message={touch ? undefined : 'You can also switch this from the sidebar.'}>
				<Segmented name="theme" options={THEMES} value={chosenTheme() ?? 'system'} onChange={pick} />
			</Field>
			<span className="sp-rule" />
			<Field label="Row density" message="Compact fits more rows on screen.">
				<Segmented name="density" variant={touch ? 'default' : 'narrow'} options={DENSITIES} value={value('density') ?? 'comfortable'} onChange={v => change('density', v)} />
			</Field>
			<span className="sp-rule" />
			<Field label="Compare this month with" message="What Home and the monthly summary measure this month against.">
				<Choose narrow={!touch} value={value('compareMonth') ?? 'last'} onChange={v => change('compareMonth', v)} options={COMPARES} />
			</Field>
		</Card>
	)
}

/* Two fields side by side on a wide screen; stacked on a phone, where a half is too narrow. */
function Pair({ touch, children }) {
	return touch ? children : <Halves>{children}</Halves>
}

function MoneyCard({ value, change, touch }) {
	return (
		<Card>
			<CardHeader name="Money, dates and times" {...landing('money')} />
			<Pair touch={touch}>
				<Field label="Currency" message="The currency all amounts are shown in. This renames your figures. It does not convert them.">
					<Choose narrow={!touch} value={value('currency')} onChange={v => change('currency', v)}
						options={CURRENCIES.map(c => ({ id: c.code, label: currencyLabel(c) }))} />
				</Field>
				<Field label="Date and time format" message="How dates, times and numbers are written. Times always show in your own clock.">
					<Choose narrow={!touch} value={value('locale')} onChange={v => change('locale', v)}
						options={LOCALES.map(l => ({ id: l.code, label: localeLabel(l) }))} />
				</Field>
			</Pair>
			<ListItem>
				<span className="sp-section-label">Preview</span>
				<span className="sp-amount">{previewAmount(value('currency'))}</span>
				<span className="sp-rule sp-rule--vertical" />
				<span className="sp-data">{localeSample(value('locale'))}</span>
			</ListItem>
		</Card>
	)
}

/* `reads` is whether this server reads receipts: without that a scan finds nothing to override with,
   so the switch is not offered. */
function DefaultsCard({ value, change, touch, reads }) {
	const statuses = useStatuses()
	return (
		<Card>
			<CardHeader name="Defaults for a new order" {...landing('defaults')} />
			<Pair touch={touch}>
				<Field label="Kind" message="What the Kind field opens with on a new order.">
					<Choose narrow={!touch} value={value('defaultKind')} onChange={v => change('defaultKind', v)}
						options={spendKinds.map(k => ({ id: k, label: k }))} />
				</Field>
				<Field label="Status">
					<Choose narrow={!touch} value={value('defaultStatus')} onChange={v => change('defaultStatus', v)}
						options={statuses.map(s => ({ id: s.key, label: s.name }))} />
				</Field>
			</Pair>
			{reads
				? (
					<>
						<span className="sp-rule" />
						<div className="sp-stack">
							<Choice variant="described"
								control={<Switch role="switch" checked={value('scanOverrides')} onChange={ev => change('scanOverrides', ev.target.checked)} />}
								description="When a scan shows what the paper is, such as an order confirmation or a return, the scan sets the status or the kind to match. Off means your defaults always apply.">
								Let a scan override these
							</Choice>
						</div>
					</>
				)
				: null}
		</Card>
	)
}

/* How loudly a category's limit speaks up (8b), in the app only. */
function AlertsCard({ value, change }) {
	const switchOf = (key, label, rest) => (
		<Choice control={<Switch role="switch" checked={value(key)} onChange={ev => change(key, ev.target.checked)} {...rest} />}>{label}</Choice>
	)
	return (
		<Card footerLayout="stack" footer={[
			<span key="label" className="sp-section-label" id="alerts-early">Tell me early, at</span>,
			<Segmented key="early" variant="facet" name="alerts-early" options={EARLY} value={value('notifyEarly')}
				onChange={v => change('notifyEarly', v)} role="radiogroup" aria-labelledby="alerts-early" />
		]}>
			<CardHeader name="Limit alerts" {...landing('alerts')} />
			{switchOf('notifyWhileSaving', 'Warn me while I am saving an order')}
			{switchOf('notifyMonthlySummary', 'Monthly summary on the first of the month')}
		</Card>
	)
}

/* What Home's Needs a look points out (Settings 11a): one switch per rule, in the order Home ranks them. */
function LooksCard({ value, change }) {
	return (
		<Card>
			<CardHeader name="Needs a look" {...landing('looks')} />
			<span className="sp-data">What Home points out. It shows at most three at a time, in this order.</span>
			<FieldGroup aria-label="Rows Home can show">
				{LOOKS.map(l => (
					<Choice key={l.id} variant="described" description={l.help}
						control={<Switch role="switch" aria-label="On" checked={value(`look.${l.id}`)} onChange={ev => change(`look.${l.id}`, ev.target.checked)} />}>
						{l.label}
					</Choice>
				))}
			</FieldGroup>
		</Card>
	)
}

// a stored sort the lists do not offer opens them on their first, so that is what shows here
const known = (options, id) => (options.some(o => o.id === id) ? id : options[0].id)

function ListsCard({ value, change, touch }) {
	const rows = value('pageSize')
	const recent = value('recentRows')
	return (
		<Card>
			<CardHeader name="Lists" {...landing('lists')} />
			<Field label="Order views in the menu" message="How many order views the sidebar shows before the rest fold under More.">
				<Choose value={value('orderViews')} onChange={v => change('orderViews', v)}
					figure={<span className="sp-data sp-number">{value('orderViews')}</span>}
					suffix={<span className="sp-data sp-ink-5">views</span>}
					options={VIEWS_SHOWN.map(n => ({ id: n, label: `${n} views` }))} />
			</Field>
			<span className="sp-rule" />
			<Field label="Rows per page" message="How many rows the order, vendor and category lists show before Load more.">
				<Choose value={rows} onChange={v => change('pageSize', v)}
					figure={<span className="sp-data sp-number">{rows}</span>}
					suffix={<span className="sp-data sp-ink-5">rows</span>}
					options={PAGE_SIZES.map(n => ({ id: n, label: `${n} rows` }))} />
			</Field>
			<span className="sp-rule" />
			<Field label="Recent orders on Home" message="How many of your newest orders Home shows.">
				<Choose value={recent} onChange={v => change('recentRows', v)}
					figure={<span className="sp-data sp-number">{recent}</span>}
					suffix={<span className="sp-data sp-ink-5">{recent === 1 ? 'order' : 'orders'}</span>}
					options={RECENT_ROWS.map(n => ({ id: n, label: plural(n, 'order') }))} />
			</Field>
			<Pair touch={touch}>
				<Field label="Sort orders by" message="The order All orders opens with.">
					<Choose value={known(sorts, value('sort'))} onChange={v => change('sort', v)} options={sorts} />
				</Field>
				<Field label="Sort vendors and categories by" message="The order both lists open with.">
					<Choose value={known(listSorts, value('listSort'))} onChange={v => change('listSort', v)} options={listSorts} />
				</Field>
			</Pair>
		</Card>
	)
}

/* Below 640 the panes are a list (7a): the account first, then its passkeys, then one row per pane. */
function PhoneIndex({ user }) {
	const chevron = <Icon name="chevron-right" />
	const passkeys = usePasskeyCount()
	const email = user?.email
	const name = user?.name || email?.split('@')[0]
	return (
		<>
			<ListItem variant="card" chevron={chevron} to="/settings/account" aria-label="Account and profile"
				mark={!email ? null : user.picture
					? <Mark size="large" fill="photo" round aria-label="Your picture"><img src={user.picture} alt="" /></Mark>
					: <Mark size="large" fill="solid" swatch="green-3" round role="img" aria-label={name}><>{initialsOf(name)}</></Mark>}>
				{email
					? (
						<span className="sp-stack sp-gap-6 sp-grow">
							{user.name ? <span className="sp-title sp-truncate">{user.name}</span> : null}
							<EmailLine email={email} tone="meta" />
						</span>
					)
					: <Skeleton shape="line" />}
			</ListItem>
			{passkeys === undefined
				? null
				: (
					<ListItem variant="card" chevron={chevron} to="/settings/passkeys">
						<span className="sp-data sp-grow">Passkeys</span>
						{passkeys === null ? null : <span className="sp-meta">{passkeys}</span>}
					</ListItem>
				)}
			{SECTIONS.filter(s => s.key !== 'account').map(s => (
				<ListItem key={s.key} variant="card" chevron={chevron} to={`/settings/${s.key}`}>
					<span className="sp-data sp-grow">{s.label}</span>
				</ListItem>
			))}
		</>
	)
}

function LoadingCard() {
	return (
		<Card aria-busy="true">
			<span className="sp-stack sp-gap-8">
				<Skeleton shape="title" />
				<Skeleton shape="line" />
				<Skeleton shape="short" />
			</span>
		</Card>
	)
}

