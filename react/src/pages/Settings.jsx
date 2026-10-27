import { useEffect, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Icon } from '../components/Icon.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { Skeleton, Stacked } from '../components/Utilities.jsx'
import { useToast, Leaving } from '../components/Overlays.jsx'
import { SaveBar } from '../components/Touch.jsx'
import { useShellShape } from '../app/useMedia.js'
import { chosenTheme, followSystem, setDensity, setTheme, useTheme } from '../app/theme.js'
import { freshFetch, invalidate, useApi } from '../api/useApi.js'
import {
	failureMessage, getCategoryPage, getCategoryPages, getCurrentUser, getHomeAttention, getLimitedCategories, getMonthlySummary, getComparedMonth, getOrderDraft, getOrders, getSettings, getStatsSlice, getStatuses, getVendorPage, getVendorPages, listSorts, removePicture, saveSettings,
	setViewsShown, sorts, spendKinds, updateProfile, uploadPicture
} from '../api/client.js'
import { CURRENCIES, LOCALES, amount, localeSample, plural, setCurrency, setLocale } from '../api/format.js'
import { ImportCard, importLeaveBody, importUnsaved, useImportState } from './SettingsImport.jsx'
import { DemoCard } from './SettingsDemo.jsx'
import { AccountCard, StatusEmailCard } from './SettingsAccount.jsx'
import { PasskeysCard, usePasskeyCount } from './SettingsPasskeys.jsx'
import { TwoStepCard, useTwoStepWord } from './SettingsTwoStep.jsx'
import { AssistantsCard, useAssistantsState } from './SettingsAssistants.jsx'
import { BuildCard } from './SettingsBuild.jsx'
import { Choose, SettingRow, SettingRows, SettingsGroup, SwitchRow, landing, useSettingsHead } from './SettingsParts.jsx'
import { useAuthOptions } from './AuthParts.jsx'
import { LOOKS } from './needsLook.jsx'
import { StatusesCard, saveStatuses } from './SettingsStatuses.jsx'
import { useViews } from '../app/views.jsx'
import { useStatuses } from '../app/statuses.js'
import { useLeaveGuard } from './vendorsCategories.jsx'

/* Settings in five groups, one shown at a time (25). `sections` are its cards, in order, each also an
   address that opens the group at that card; `keys` are the stored settings its save bar saves. */
const GROUPS = [
	{ key: 'account', label: 'Account', sections: ['account'], keys: ['name', 'picture'] },
	{ key: 'security', label: 'Sign-in and security', sections: ['passkeys', 'two-step', 'assistants'], keys: [] },
	{
		key: 'preferences', label: 'Preferences', sections: ['appearance', 'money', 'defaults', 'lists'],
		keys: ['density', 'compareMonth', 'currency', 'locale', 'defaultKind', 'defaultStatus', 'scanOverrides', 'orderViews', 'pageSize', 'recentRows', 'sort', 'listSort']
	},
	{
		key: 'notifications', label: 'Notifications', sections: ['status-email', 'alerts', 'looks'],
		keys: ['notifyWhileSaving', 'notifyMonthlySummary', 'notifyEarly', ...LOOKS.map(l => `look.${l.id}`)]
	},
	{ key: 'data', label: 'Data', sections: ['statuses', 'import', 'build', 'demo'], keys: ['statuses'] }
]

const groupOf = section => GROUPS.find(g => g.key === section || g.sections.includes(section)) ?? null

const PAGE_SIZES = [5, 10, 15, 20, 25, 50, 100]
// how many orders Home's Recent orders card can show, as the server allows
const RECENT_ROWS = Array.from({ length: 15 }, (_, i) => i + 1)
// how many saved views the sidebar lists (11a), as the server allows
const VIEWS_SHOWN = [2, 3, 4, 5, 6, 8, 10]

// a phone fits three across only with the shorter name (25f)
const themes = touch => [
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
	{ value: 'system', label: touch ? 'System' : 'Follow system' }
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
// the chosen currency, not the saved one: the help shows what Save would make every amount
const previewAmount = code => {
	const c = CURRENCIES.find(x => x.code === code) ?? CURRENCIES[0]
	return c.before ? c.symbol + amount(1234.5) : `${amount(1234.5)} ${c.symbol}`
}

/* Saved settings are baked into these answers, so each is dropped the moment a save lands. */
const dropStale = () => {
	for (const fn of [getSettings, getOrderDraft, getOrders, getVendorPage, getVendorPages, getCategoryPage, getCategoryPages, getHomeAttention, getLimitedCategories, getMonthlySummary, getComparedMonth, getStatsSlice])
		invalidate(fn)
}

export default function Settings() {
	const { section } = useParams()
	// each opening of an address is its own visit, so opening the one already open goes back to it
	const visit = useLocation().key
	const shape = useShellShape()
	const touch = shape === 'touch'
	const settings = useApi(getSettings)
	const user = useApi(getCurrentUser)
	const statuses = useApi(getStatuses)
	const options = useAuthOptions()
	const toast = useToast()
	const [draft, setDraft] = useState({})
	// what a save just stored stays on screen until the page reads it back, so the old value never shows between
	const [landed, setLanded] = useState({})
	const [saving, setSaving] = useState(false)
	// the name is the account's and the sidebar's view count is kept with the views; both save with the rest
	const shown = useViews().data?.shown
	const saved = settings.data && user.data
		? { ...ALERT_DEFAULTS, ...settings.data, ...lookValues(settings.data), name: user.data.name ?? '', picture: user.data.picture ?? null, orderViews: shown ?? 4, statuses: statuses.data }
		: null
	// a phone without a group in the address shows the list of groups (25f); elsewhere /settings opens Account
	const group = groupOf(section) ?? (touch ? null : GROUPS[0])
	// the card an address names, which the group opens at
	const target = group?.sections.includes(section) ? section : null

	useEffect(() => setLanded({}), [settings.data, user.data, shown, statuses.data])
	const stored = key => (key in landed ? landed[key] : saved?.[key])
	const value = key => (key in draft ? draft[key] : stored(key))
	const change = (key, next) => setDraft(d => {
		const out = { ...d, [key]: next }
		if (saved && stored(key) === next) delete out[key]
		return out
	})
	const dirty = Object.keys(draft).length > 0
	const importing = useImportState()
	const assistants = useAssistantsState()

	// leaving a group asks first, so what it had open is gone once another group shows
	const open = useRef(group?.key)
	useEffect(() => {
		if (open.current === group?.key) return
		open.current = group?.key
		setDraft({})
		importing.setStage({ name: 'rest' })
		importing.setReuse(null)
		assistants.setNaming(false)
		assistants.setMade(null)
	}, [group?.key])

	const unimported = importUnsaved(importing)
	const leaveBody = !unimported ? undefined
		: !dirty ? importLeaveBody(unimported)
		: `Your changes in ${group.label} are not saved, and ${unimported} is not imported yet. If you leave now, they are lost. No orders have been written.`
	const guard = useLeaveGuard(dirty || unimported != null, { within: group ? `/settings/${group.key}` : '/settings', names: group ? [group.label] : [], body: leaveBody })

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
				setLanded(draft)
				setDraft({})
				toast({ message: 'Your settings are saved.' })
			})
			.catch(e => {
				const message = failureMessage(e, 'Your changes were not saved. Try again.')
				if (message) toast({ message, color: 'danger' })
			})
			.finally(() => setSaving(false))
	}

	const fields = { value, change, touch }
	const cards = {
		account: <AccountCard key="account" user={user.data} {...fields} />,
		passkeys: <PasskeysCard key="passkeys" />,
		'two-step': <TwoStepCard key="two-step" />,
		assistants: <AssistantsCard key="assistants" state={assistants} touch={touch} />,
		appearance: <AppearanceCard key="appearance" {...fields} />,
		money: <MoneyCard key="money" {...fields} />,
		defaults: <DefaultsCard key="defaults" reads={user.data?.scanAiEnabled} {...fields} />,
		lists: <ListsCard key="lists" {...fields} />,
		'status-email': <StatusEmailCard key="status-email" user={user.data} />,
		alerts: <AlertsCard key="alerts" {...fields} />,
		looks: <LooksCard key="looks" {...fields} />,
		statuses: <StatusesCard key="statuses" saved={saved?.statuses} {...fields} />,
		import: <ImportCard key="import" state={importing} />,
		build: <BuildCard key="build" />,
		demo: <DemoCard key="demo" />
	}

	const discard = () => setDraft({})
	// on a phone the bar takes the tab bar's place at the bottom edge (25f, 5b)
	const saveBar = !dirty ? null
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
					<span className="sp-data">Unsaved changes in {group.label}</span>
					<span className="sp-grow" />
					<Button variant="outline" size="small" disabled={saving} onClick={discard}>Discard</Button>
					<Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
				</ListItem>
			)

	const failed = settings.error ?? user.error
	const body = failed && !saved
		? <Failed what="Your settings" error={failed} onRetry={() => { settings.refresh(); user.refresh() }} />
		: !saved
			? <><LoadingCard /><LoadingCard /><LoadingCard /></>
			: null

	if (touch) {
		if (body) return body
		// the card whose head names the group: the first one this account has (25f)
		const first = !group ? null
			: group.key === 'security' ? (options?.passkeys ? 'passkeys' : 'two-step')
			: group.key === 'notifications' ? (user.data?.mail ? 'status-email' : 'alerts')
			: group.sections[0]
		return (
			<>
				{group
					? (
						<SettingsGroup.Provider value={{ name: group.label, first }}>
							<Arrive section={target} visit={visit}>{group.sections.map(s => cards[s])}</Arrive>
						</SettingsGroup.Provider>
					)
					: <PhoneIndex user={user.data} value={value} statuses={statuses.data} />}
				{saveBar}
				<Leaving>{guard.prompt}</Leaving>
			</>
		)
	}

	return (
		<div className="sp-stack sp-gap-12">
			<GroupPicker current={group.key} />
			{body ?? <Arrive section={target} visit={visit}>{group.sections.map(s => cards[s])}</Arrive>}
			{body ? null : saveBar}
			<Leaving>{guard.prompt}</Leaving>
		</div>
	)
}

/* The first card moves between the five groups (25): picking one opens its address. */
function GroupPicker({ current }) {
	const navigate = useNavigate()
	return (
		<Card>
			<CardHeader name="Settings" id="settings-groups-label" />
			<Segmented name="settings-group" fullWidth role="radiogroup" aria-labelledby="settings-groups-label"
				options={GROUPS.map(g => ({ value: g.key, label: g.label }))} value={current}
				onChange={key => navigate(`/settings/${key}`)} />
		</Card>
	)
}

/* An address that names a card brings that card to where the group's first card sits and moves
   focus to its heading (9c), so a keyboard reader knows where they landed. */
function Arrive({ section, visit, children }) {
	const column = useRef(null)
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
	const { named, back } = useSettingsHead('appearance')
	useTheme()
	const [, redraw] = useReducer(n => n + 1, 0)
	const pick = next => {
		if (next === 'system') followSystem()
		else setTheme(next)
		redraw()
	}
	return (
		<Card>
			<CardHeader name={named('Appearance')} {...landing('appearance')} actions={back} />
			<SettingRows>
				<SettingRow label="Theme" help={touch ? undefined : 'You can also switch this from the sidebar.'}>
					<Segmented name="theme" fullWidth role="radiogroup" aria-label="Theme"
						options={themes(touch)} value={chosenTheme() ?? 'system'} onChange={pick} />
				</SettingRow>
				<SettingRow label="Row density" help="Compact fits more rows on screen.">
					<Segmented name="density" fullWidth role="radiogroup" aria-label="Row density"
						options={DENSITIES} value={value('density') ?? 'comfortable'} onChange={v => change('density', v)} />
				</SettingRow>
				<SettingRow label="Compare this month with" help="What Home and the monthly summary measure this month against.">
					<Choose aria-label="Compare this month with" value={value('compareMonth') ?? 'last'} onChange={v => change('compareMonth', v)} options={COMPARES} />
				</SettingRow>
			</SettingRows>
		</Card>
	)
}

function MoneyCard({ value, change }) {
	return (
		<Card>
			<CardHeader name="Money, dates and times" {...landing('money')} />
			<SettingRows>
				<SettingRow label="Currency" help="The currency all amounts are shown in. This renames your figures. It does not convert them.">
					<Choose aria-label="Currency" value={value('currency')} onChange={v => change('currency', v)}
						options={CURRENCIES.map(c => ({ id: c.code, label: currencyLabel(c) }))} />
				</SettingRow>
				<SettingRow label="Date and time format" help={`How dates, times and numbers are written: ${previewAmount(value('currency'))} · ${localeSample(value('locale'))}`}>
					<Choose aria-label="Date and time format" value={value('locale')} onChange={v => change('locale', v)}
						options={LOCALES.map(l => ({ id: l.code, label: localeLabel(l) }))} />
				</SettingRow>
			</SettingRows>
		</Card>
	)
}

/* `reads` is whether this server reads receipts: without that a scan finds nothing to override with,
   so the switch is not offered. */
function DefaultsCard({ value, change, reads }) {
	const statuses = useStatuses()
	return (
		<Card>
			<CardHeader name="Defaults for a new order" {...landing('defaults')} />
			<SettingRows>
				<SettingRow label="Kind" help="What the Kind field opens with on a new order.">
					<Choose aria-label="Kind" value={value('defaultKind')} onChange={v => change('defaultKind', v)}
						options={spendKinds.map(k => ({ id: k, label: k }))} />
				</SettingRow>
				<SettingRow label="Status" help="What the Status field opens with.">
					<Choose aria-label="Status" value={value('defaultStatus')} onChange={v => change('defaultStatus', v)}
						options={statuses.map(s => ({ id: s.key, label: s.name }))} />
				</SettingRow>
				{reads
					? (
						<SwitchRow label="Let a scan override these" checked={value('scanOverrides')} onChange={v => change('scanOverrides', v)}
							help="When a scan shows what the paper is, such as an order confirmation or a return, it sets the status or the kind to match." />
					)
					: null}
			</SettingRows>
		</Card>
	)
}

// a stored sort the lists do not offer opens them on their first, so that is what shows here
const known = (options, id) => (options.some(o => o.id === id) ? id : options[0].id)

function ListsCard({ value, change }) {
	const views = value('orderViews')
	const rows = value('pageSize')
	const recent = value('recentRows')
	return (
		<Card>
			<CardHeader name="Lists" {...landing('lists')} />
			<SettingRows>
				<SettingRow label="Order views in the menu" help="How many order views the sidebar shows before the rest fold under More.">
					<Choose aria-label="Order views in the menu" value={views} onChange={v => change('orderViews', v)}
						figure={<span className="sp-data sp-number">{views}</span>}
						suffix={<span className="sp-data sp-ink-5">views</span>}
						options={VIEWS_SHOWN.map(n => ({ id: n, label: `${n} views` }))} />
				</SettingRow>
				<SettingRow label="Rows per page" help="How many rows the order, vendor and category lists show before Load more.">
					<Choose aria-label="Rows per page" value={rows} onChange={v => change('pageSize', v)}
						figure={<span className="sp-data sp-number">{rows}</span>}
						suffix={<span className="sp-data sp-ink-5">rows</span>}
						options={PAGE_SIZES.map(n => ({ id: n, label: `${n} rows` }))} />
				</SettingRow>
				<SettingRow label="Recent orders on Home" help="How many of your newest orders Home shows.">
					<Choose aria-label="Recent orders on Home" value={recent} onChange={v => change('recentRows', v)}
						figure={<span className="sp-data sp-number">{recent}</span>}
						suffix={<span className="sp-data sp-ink-5">{recent === 1 ? 'order' : 'orders'}</span>}
						options={RECENT_ROWS.map(n => ({ id: n, label: plural(n, 'order') }))} />
				</SettingRow>
				<SettingRow label="Sort orders by" help="The order All orders opens with.">
					<Choose aria-label="Sort orders by" value={known(sorts, value('sort'))} onChange={v => change('sort', v)} options={sorts} />
				</SettingRow>
				<SettingRow label="Sort vendors and categories by" help="The order both lists open with.">
					<Choose aria-label="Sort vendors and categories by" value={known(listSorts, value('listSort'))} onChange={v => change('listSort', v)} options={listSorts} />
				</SettingRow>
			</SettingRows>
		</Card>
	)
}

/* How loudly a category's limit speaks up (8b), in the app only. */
function AlertsCard({ value, change }) {
	const { named, back } = useSettingsHead('alerts')
	const switchRow = (key, label, help) => (
		<SwitchRow key={key} label={label} help={help} checked={value(key)} onChange={v => change(key, v)} />
	)
	return (
		<Card>
			<CardHeader name={named('Limit alerts')} {...landing('alerts')} actions={back} />
			<SettingRows>
				{switchRow('notifyWhileSaving', 'Warn me while I am saving an order', 'When the order would take a category past its limit.')}
				{switchRow('notifyMonthlySummary', 'Monthly summary', 'On the first of the month, in the app.')}
				<SettingRow key="early" label="Tell me early, at" help="How close to a limit counts as near it.">
					<Segmented name="alerts-early" fullWidth role="radiogroup" aria-label="Tell me early, at"
						options={EARLY} value={value('notifyEarly')} onChange={v => change('notifyEarly', v)} />
				</SettingRow>
			</SettingRows>
		</Card>
	)
}

/* What Home's Needs a look points out: one switch per rule, in the order Home ranks them. */
function LooksCard({ value, change }) {
	return (
		<Card>
			<CardHeader name="Needs a look" {...landing('looks')} aside="Home shows at most three, in this order" />
			<SettingRows>
				{LOOKS.map(l => (
					<SwitchRow key={l.id} label={l.label} help={l.help} checked={value(`look.${l.id}`)} onChange={v => change(`look.${l.id}`, v)} />
				))}
			</SettingRows>
		</Card>
	)
}

/* On a phone Settings is a list of the five groups, each with what it is set to (25f). */
function PhoneIndex({ user, value, statuses }) {
	useTheme()
	const chevron = <Icon name="chevron-right" />
	const passkeys = usePasskeyCount()
	const twoStep = useTwoStepWord()
	const email = user?.email
	const currency = CURRENCIES.find(c => c.code === value('currency'))
	const emailWord = { weekly: 'Weekly email', monthly: 'Monthly email', none: 'No email' }[value('statusEmail') ?? 'none']
	const alertsOn = ['notifyWhileSaving', 'notifyMonthlySummary'].filter(key => value(key)).length
	const said = {
		account: user?.name || email?.split('@')[0],
		security: [passkeys == null ? null : plural(passkeys, 'passkey'), { On: 'two-step on', Off: 'two-step off' }[twoStep]],
		preferences: [themes(true).find(t => t.value === (chosenTheme() ?? 'system'))?.label, currency?.label, plural(value('pageSize'), 'row')],
		notifications: [user?.mail ? emailWord : null, alertsOn ? `${plural(alertsOn, 'alert')} on` : 'Alerts off'],
		data: [statuses ? plural(statuses.length, 'status', 'statuses') : null]
	}
	const line = key => [said[key]].flat().filter(Boolean).join(', ')
	return (
		<Card>
			<CardHeader name="Settings" />
			<div className="sp-stack sp-gap-6">
				{GROUPS.map(g => (
					<ListItem key={g.key} variant="card" chevron={chevron} to={`/settings/${g.key}`}>
						<Stacked>
							<span className="sp-data">{g.label}</span>
							{line(g.key) ? <span className="sp-meta">{line(g.key)}</span> : null}
						</Stacked>
					</ListItem>
				))}
			</div>
		</Card>
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
