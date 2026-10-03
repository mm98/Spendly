import { Fragment, useEffect, useReducer, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
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
import { Skeleton } from '../components/Utilities.jsx'
import { useToast } from '../components/Overlays.jsx'
import { Halves } from '../components/Well.jsx'
import { SaveBar } from '../components/Touch.jsx'
import { useMedia, useShellShape } from '../app/useMedia.js'
import { chosenTheme, followSystem, setTheme, useTheme } from '../app/theme.js'
import { invalidate, useApi } from '../api/useApi.js'
import {
	failureMessage, getCategories, getCurrentUser, getOrderDraft, getOrders, getSettings, getVendors, listSorts, saveSettings, setViewsShown, sorts, spendKinds
} from '../api/client.js'
import { CURRENCIES, LOCALES, amount, localeSample, setCurrency, setLocale } from '../api/format.js'
import { ImportCard } from './SettingsImport.jsx'
import { DemoCard } from './SettingsDemo.jsx'
import { BuildCard } from './SettingsBuild.jsx'
import { Choose, Heading } from './SettingsParts.jsx'
import { StatusesCard } from './SettingsStatuses.jsx'
import { useViews } from '../app/views.jsx'
import { useStatuses } from '../app/statuses.js'
import { useLeaveGuard } from './vendorsCategories.jsx'

// `keys` are the stored settings a pane edits, which is what decides the pane the save bar names
const SECTIONS = [
	{ key: 'account', label: 'Account and profile' },
	{ key: 'appearance', label: 'Appearance' },
	{ key: 'money', label: 'Money, dates and times', keys: ['currency', 'locale'] },
	{ key: 'defaults', label: 'Defaults', keys: ['defaultKind', 'defaultStatus'] },
	{ key: 'lists', label: 'Lists', keys: ['orderViews', 'pageSize', 'sort', 'listSort'] },
	{ key: 'statuses', label: 'Statuses' },
	{ key: 'import', label: 'Import' },
	{ key: 'demo', label: 'Demo data' },
	{ key: 'build', label: 'This build' }
]

// the first of the panes that are tools rather than preferences, which the nav sets apart (11a)
const TOOLS = 'import'

const PAGE_SIZES = [5, 10, 15, 20, 25, 50, 100]
// how many saved views the sidebar lists (11a), as the server allows
const VIEWS_SHOWN = [2, 3, 4, 5, 6, 8, 10]

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
	for (const fn of [getSettings, getOrderDraft, getOrders, getVendors, getCategories])
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
	// the sidebar's view count is kept with the views, and saved with them
	const shown = useViews().data?.shown
	const saved = settings.data && { ...settings.data, orderViews: shown ?? 4 }
	const current = SECTIONS.some(s => s.key === section) ? section : null

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
		const { orderViews, ...rest } = draft
		Promise.all([orderViews ? setViewsShown(orderViews) : null, Object.keys(rest).length ? saveSettings(rest) : null])
			.then(([, next]) => next)
			.then(next => {
				setCurrency(next?.currency ?? value('currency'))
				setLocale(next?.locale ?? value('locale'))
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
		account: <AccountCard key="account" email={user.data?.email} />,
		appearance: <AppearanceCard key="appearance" touch={touch} />,
		money: <MoneyCard key="money" {...fields} />,
		defaults: <DefaultsCard key="defaults" {...fields} />,
		lists: <ListsCard key="lists" {...fields} />,
		statuses: <StatusesCard key="statuses" />,
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

	const seen = useSeenSection(!touch && saved != null, current)
	const body = settings.error && !saved
		? <Failed what="Your settings" error={settings.error} onRetry={settings.refresh} />
		: !saved
			? <><LoadingCard /><LoadingCard /><LoadingCard /></>
			: null

	if (touch) {
		if (body) return body
		const open = current && current !== 'account' ? current : null
		return (
			<>
				{open ? <Arrive section={open}>{cards[open]}</Arrive> : <PhoneIndex email={user.data?.email} />}
				{saveBar}
				{guard.prompt}
			</>
		)
	}

	return (
		<div className="sp-row-flex sp-top sp-gap-16">
			{narrow ? null : <SectionNav current={seen ?? current} />}
			<div className="sp-stack sp-gap-12 sp-grow sp-column--form">
				{narrow ? <SectionPicker current={seen ?? current} /> : null}
				{body ?? <Arrive section={current}>{SECTIONS.map(s => cards[s.key])}</Arrive>}
				{body ? null : saveBar}
			</div>
			{guard.prompt}
		</div>
	)
}

/* The section whose heading has passed the upper 40% of the window is the one the nav marks; at the
   end of the page, the last one. The address stays as it is, so nothing scrolls. */
function useSeenSection(active, current) {
	const [seen, setSeen] = useState(null)
	useEffect(() => {
		setSeen(null)
		if (!active) return
		let frame = 0
		const look = () => {
			frame = 0
			const heads = [...document.querySelectorAll('[data-section]')]
			if (!heads.length) return
			const bar = document.querySelector('.sp-topbar')?.getBoundingClientRect().bottom ?? 0
			const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
			const line = bar + (window.innerHeight - bar) * 0.4
			const passed = heads.filter(h => h.getBoundingClientRect().top <= line)
			const head = atEnd ? heads.at(-1) : passed.at(-1) ?? heads[0]
			setSeen(head.dataset.section)
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
	}, [active, current])
	return seen
}

function SectionNav({ current }) {
	return (
		<nav className="st-subnav sp-stack sp-gap-8" aria-label="Settings">
			<span className="sp-section-label">Settings</span>
			<div className="sp-nav-list st-subnav__list">
				{SECTIONS.map(s => (
					<Fragment key={s.key}>
						{s.key === TOOLS ? <span className="sp-rule" role="separator" /> : null}
						<NavItem variant="light" to={`/settings/${s.key}`} current={s.key === current}>{s.label}</NavItem>
					</Fragment>
				))}
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
			<Halves>
				<Field label="Email">
					<TextField type="email" variant="readonly" readOnly value={email ?? ''} />
				</Field>
			</Halves>
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
	return touch ? children : <Halves>{children}</Halves>
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
	const statuses = useStatuses()
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
						options={statuses.map(s => ({ id: s.key, label: s.name }))} />
				</Field>
			</Pair>
		</Card>
	)
}

// a stored sort the lists do not offer opens them on their first, so that is what shows here
const known = (options, id) => (options.some(o => o.id === id) ? id : options[0].id)

function ListsCard({ value, change, touch }) {
	const rows = value('pageSize')
	return (
		<Card>
			<Heading section="lists">Lists</Heading>
			<Field label="Order views in the menu" message="How many order views the sidebar shows before the rest fold under More.">
				<Choose value={value('orderViews')} onChange={v => change('orderViews', v)}
					figure={<span className="sp-data sp-number">{value('orderViews')}</span>}
					suffix={<span className="sp-data sp-ink-5">views</span>}
					options={VIEWS_SHOWN.map(n => ({ id: n, label: `${n} views` }))} />
			</Field>
			<Field label="Rows per page" message="How many rows the order, vendor and category lists show before Load more.">
				<Choose value={rows} onChange={v => change('pageSize', v)}
					figure={<span className="sp-data sp-number">{rows}</span>}
					suffix={<span className="sp-data sp-ink-5">rows</span>}
					options={PAGE_SIZES.map(n => ({ id: n, label: `${n} rows` }))} />
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

