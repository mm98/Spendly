import { useEffect, useReducer, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Card } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { Field } from '../components/Field.jsx'
import { TextField } from '../components/Inputs.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { NavItem } from '../components/Shell.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton } from '../components/Utilities.jsx'
import { useToast } from '../components/Overlays.jsx'
import { useMedia, useShellShape } from '../app/useMedia.js'
import { chosenTheme, followSystem, setTheme, useTheme } from '../app/theme.js'
import { invalidate, useApi } from '../api/useApi.js'
import {
	failureMessage, getCategories, getCurrentUser, getHomeContent, getOrderDraft, getOrders, getOrdersOverview,
	getSettings, getVendors, listSorts, orderStatuses, saveSettings, sorts, spendKinds
} from '../api/client.js'
import { CURRENCIES, LOCALES, amount, localeSample, setCurrency, setLocale } from '../api/format.js'
import { ImportCard } from './SettingsImport.jsx'
import { DemoCard } from './SettingsDemo.jsx'
import { BuildCard } from './SettingsBuild.jsx'
import { Choose, Heading } from './SettingsParts.jsx'

// `keys` are the stored settings a pane edits, which is what decides the pane the save bar names
const SECTIONS = [
	{ key: 'account', label: 'Account and profile' },
	{ key: 'appearance', label: 'Appearance' },
	{ key: 'money', label: 'Money, dates and times', keys: ['currency', 'locale'] },
	{ key: 'defaults', label: 'Defaults', keys: ['defaultKind', 'defaultStatus'] },
	{ key: 'lists', label: 'Lists', keys: ['pageSize', 'sort', 'listSort'] },
	{ key: 'import', label: 'Import' },
	{ key: 'demo', label: 'Demo data' },
	{ key: 'build', label: 'This build' }
]

const PAGE_SIZES = [5, 10, 15, 20, 25, 50, 100]

const THEMES = [
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
	{ value: 'system', label: 'Follow system' }
]

const currencyLabel = c => `${c.label} (${c.symbol})`
const localeLabel = l => `${l.label} (${localeSample(l.code)})`
// the chosen currency, not the saved one: the preview shows what Save would make every amount
const previewAmount = code => {
	const c = CURRENCIES.find(x => x.code === code) ?? CURRENCIES[0]
	return c.before ? c.symbol + amount(1234.5) : `${amount(1234.5)} ${c.symbol}`
}

/* Saved settings are baked into these answers, so each is dropped the moment a save lands. */
const dropStale = () => {
	for (const fn of [getSettings, getOrderDraft, getOrders, getHomeContent, getOrdersOverview, getVendors, getCategories])
		invalidate(fn)
}

export default function Settings() {
	const { section } = useParams()
	const shape = useShellShape()
	const narrow = useMedia('(max-width: 899.98px)')
	const settings = useApi(getSettings)
	const user = useApi(getCurrentUser)
	const toast = useToast()
	const [draft, setDraft] = useState({})
	const [saving, setSaving] = useState(false)
	const saved = settings.data
	const current = SECTIONS.some(s => s.key === section) ? section : null

	const value = key => (key in draft ? draft[key] : saved?.[key])
	const change = (key, next) => setDraft(d => {
		const out = { ...d, [key]: next }
		if (saved && saved[key] === next) delete out[key]
		return out
	})
	const dirty = SECTIONS.filter(s => s.keys?.some(k => k in draft))

	const save = () => {
		setSaving(true)
		saveSettings(draft)
			.then(next => {
				setCurrency(next?.currency ?? value('currency'))
				setLocale(next?.locale ?? value('locale'))
				dropStale()
				settings.refresh()
				setDraft({})
				toast({ message: 'Your settings are saved.' })
			})
			.catch(e => toast({ message: failureMessage(e, 'Your changes were not saved. Try again.'), color: 'danger' }))
			.finally(() => setSaving(false))
	}

	const fields = { value, change, touch: shape === 'touch' }
	const cards = {
		account: <AccountCard key="account" email={user.data?.email} />,
		appearance: <AppearanceCard key="appearance" touch={shape === 'touch'} />,
		money: <MoneyCard key="money" {...fields} />,
		defaults: <DefaultsCard key="defaults" {...fields} />,
		lists: <ListsCard key="lists" {...fields} />,
		import: <ImportCard key="import" />,
		demo: <DemoCard key="demo" />,
		build: <BuildCard key="build" />
	}

	const saveBar = dirty.length
		? (
			<ListItem variant="sticky">
				<span className="sp-data">
					{dirty.length === 1 ? `Unsaved changes in ${dirty[0].label}` : `Unsaved changes in ${dirty.length} sections`}
				</span>
				<span className="sp-grow" />
				<Button variant="outline" size="small" disabled={saving} onClick={() => setDraft({})}>Discard</Button>
				<Button disabled={saving} onClick={save}>Save</Button>
			</ListItem>
		)
		: null

	const body = settings.error && !saved
		? <LoadFailed onRetry={settings.refresh} />
		: !saved
			? <><LoadingCard /><LoadingCard /><LoadingCard /></>
			: null

	if (shape === 'touch') {
		if (body) return body
		const open = current && current !== 'account' ? current : null
		return (
			<>
				{open ? <Arrive section={open}>{cards[open]}</Arrive> : <PhoneIndex email={user.data?.email} />}
				{saveBar}
			</>
		)
	}

	return (
		<div className="sp-row-flex sp-top sp-gap-12">
			{narrow ? null : <SectionNav current={current} />}
			<div className="sp-stack sp-gap-12 sp-grow">
				{narrow ? <SectionPicker current={current} /> : null}
				{body ?? <Arrive section={current}>{SECTIONS.map(s => cards[s.key])}</Arrive>}
				{body ? null : saveBar}
			</div>
		</div>
	)
}

function SectionNav({ current }) {
	return (
		<nav className="sp-rail sp-stack sp-gap-8" aria-label="Settings">
			<span className="sp-section-label">Settings</span>
			<div className="sp-nav-list">
				{SECTIONS.map(s => (
					<NavItem key={s.key} variant="light" to={`/settings/${s.key}`} current={s.key === current}>{s.label}</NavItem>
				))}
			</div>
		</nav>
	)
}

/* Below 900 the section nav is a select above the cards (11a). */
function SectionPicker({ current }) {
	const navigate = useNavigate()
	const [open, setOpen] = useState(false)
	const chosen = SECTIONS.find(s => s.key === current)
	return (
		<Combobox open={open} onOpenChange={setOpen} value={chosen?.label ?? 'Go to a section'} aria-label="Settings section">
			{SECTIONS.map(s => (
				<ComboboxOption key={s.key} selected={s.key === current}
					onSelect={() => { setOpen(false); navigate(`/settings/${s.key}`) }}>{s.label}</ComboboxOption>
			))}
		</Combobox>
	)
}

/* Arriving at /settings/<section> brings that card to where the first card sits and moves
   focus to its heading (9c), so a keyboard reader knows where they landed. */
function Arrive({ section, children }) {
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
	}, [section])
	return <div className="sp-stack sp-gap-12" ref={column}>{children}</div>
}

function AccountCard({ email }) {
	return (
		<Card>
			<Heading section="account">Account and profile</Heading>
			<div className="sp-halves">
				<Field label="Email">
					<TextField type="email" variant="readonly" readOnly value={email ?? ''} />
				</Field>
			</div>
		</Card>
	)
}

/* The theme lives in this browser, and applies the moment it is picked, as the sidebar's switch does. */
function AppearanceCard({ touch }) {
	useTheme()
	const [, redraw] = useReducer(n => n + 1, 0)
	const pick = next => {
		if (next === 'system') followSystem()
		else setTheme(next)
		redraw()
	}
	return (
		<Card>
			<Heading section="appearance">Appearance</Heading>
			<Field label="Theme" message={touch ? undefined : 'You can also switch this from the sidebar.'}>
				<Segmented name="theme" options={THEMES} value={chosenTheme() ?? 'system'} onChange={pick} />
			</Field>
		</Card>
	)
}

/* Two fields side by side on a wide screen; stacked on a phone, where a half is too narrow. */
function Pair({ touch, children }) {
	return touch ? children : <div className="sp-halves">{children}</div>
}

function MoneyCard({ value, change, touch }) {
	return (
		<Card>
			<Heading section="money">Money, dates and times</Heading>
			<Pair touch={touch}>
				<Field label="Currency" message="The currency all amounts are shown in. This renames your figures. It does not convert them.">
					<Choose value={value('currency')} onChange={v => change('currency', v)}
						options={CURRENCIES.map(c => ({ id: c.code, label: currencyLabel(c) }))} />
				</Field>
				<Field label="Date and time format" message="How dates and times are written. Times always show in your own clock.">
					<Choose value={value('locale')} onChange={v => change('locale', v)}
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

function DefaultsCard({ value, change, touch }) {
	return (
		<Card>
			<Heading section="defaults">Defaults for a new order</Heading>
			<Pair touch={touch}>
				<Field label="Kind" message="What the Kind field opens with on a new order.">
					<Choose value={value('defaultKind')} onChange={v => change('defaultKind', v)}
						options={spendKinds.map(k => ({ id: k, label: k }))} />
				</Field>
				<Field label="Status">
					<Choose value={value('defaultStatus')} onChange={v => change('defaultStatus', v)}
						options={orderStatuses.map(s => ({ id: s, label: s }))} />
				</Field>
			</Pair>
		</Card>
	)
}

function ListsCard({ value, change, touch }) {
	const rows = value('pageSize')
	return (
		<Card>
			<Heading section="lists">Lists</Heading>
			<Field label="Rows per page" message="How many rows the order, vendor and category lists show before Load more.">
				<Choose value={rows} onChange={v => change('pageSize', v)}
					figure={<span className="sp-data sp-number">{rows}</span>}
					suffix={<span className="sp-data sp-ink-5">rows</span>}
					options={PAGE_SIZES.map(n => ({ id: n, label: `${n} rows` }))} />
			</Field>
			<Pair touch={touch}>
				<Field label="Sort orders by" message="The order All orders opens with.">
					<Choose value={value('sort')} onChange={v => change('sort', v)} options={sorts} />
				</Field>
				<Field label="Sort vendors and categories by" message="The order both lists open with.">
					<Choose value={value('listSort')} onChange={v => change('listSort', v)} options={listSorts} />
				</Field>
			</Pair>
		</Card>
	)
}

/* Below 640 the panes are a list (7a): the account first, then one row per pane. */
function PhoneIndex({ email }) {
	const chevron = <Icon name="chevron-right" />
	return (
		<>
			<Card>
				<span className="sp-section-label">Account</span>
				{email
					? (
						<div className="sp-cell-flex">
							<Mark size="large" fill="solid" round>{email.split('@')[0]}</Mark>
							<div className="sp-stack sp-gap-6 sp-grow"><span className="sp-meta sp-truncate">{email}</span></div>
						</div>
					)
					: <Skeleton shape="line" />}
			</Card>
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

function LoadFailed({ onRetry }) {
	return (
		<Empty>
			<Mark size="medium" fill="none" aria-label="Problem"><Icon name="alert-circle" /></Mark>
			<EmptyTitle>Your settings could not be shown</EmptyTitle>
			<EmptyBody>Try again. If it happens again, the server may be down.</EmptyBody>
			<Button variant="outline" onClick={onRetry}>Try again</Button>
		</Empty>
	)
}
