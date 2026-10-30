import { useEffect, useState } from 'react'
import { useMatches, useNavigate, useSearchParams } from 'react-router'
import { Card } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { Gauge } from '../components/Data.jsx'
import { Field } from '../components/Field.jsx'
import { TextField } from '../components/Inputs.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Spinner } from '../components/Utilities.jsx'
import { useShellShape } from '../app/useMedia.js'
import { CategoryIconPicker, SWATCHES } from '../app/categoryMark.jsx'
import {
	createCategory, failureMessage, finishSetup, getCounts, getCurrentUser, getSettings, saveSettings
} from '../api/client.js'
import { CURRENCIES, LOCALES, amount, detectLocale, localeSample, setCurrency, setLocale } from '../api/format.js'
import { landing } from './AuthParts.jsx'
import { useAfterDraw } from '../app/afterDraw.js'
import { usePhrase } from '../language/phrases.js'

// the currency a browser's region most likely keeps its books in
const CURRENCY_OF = { 'da-DK': 'DKK', 'sv-SE': 'SEK', 'nb-NO': 'NOK', 'de-DE': 'EUR', 'en-GB': 'GBP', 'en-US': 'USD' }

// `name` is a phrase key; the category is made under its words in the language in use
const SUGGESTED = [
	{ name: 'welcome.suggest.home', icon: 'flower', colour: SWATCHES.primary },
	{ name: 'welcome.suggest.furniture', icon: 'armchair', colour: SWATCHES['primary-2'] },
	{ name: 'welcome.suggest.electronics', icon: 'device-desktop', colour: SWATCHES['primary-3'] }
]
const OTHER = 'other'

const priced = code => {
	const c = CURRENCIES.find(x => x.code === code) ?? CURRENCIES[0]
	return c.before ? c.symbol + amount(1234.5) : `${amount(1234.5)} ${c.symbol}`
}

/** /welcome, the first run (20d): how amounts and dates look, then one category, then Home. */
export default function Welcome() {
	const phrase = usePhrase()
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const shape = useShellShape()
	const named = useMatches().at(-1)?.handle?.title
	useEffect(() => { if (named) document.title = `${phrase(named)} - Spendly` }, [named])
	// a picker's sheet renders on the body, so the touch sizes have to reach it there too
	useEffect(() => {
		if (shape !== 'touch') return
		document.body.classList.add('sp-touch')
		return () => document.body.classList.remove('sp-touch')
	}, [shape])
	const [ready, setReady] = useState(false)
	const [step, setStep] = useState(1)
	const [currency, setCurrencyCode] = useState('DKK')
	const [locale, setLocaleCode] = useState('auto')
	const [pick, setPick] = useState(SUGGESTED[0].name)
	const afterDraw = useAfterDraw()
	const [own, setOwn] = useState({ name: '', icon: 'tag' })
	const [problem, setProblem] = useState(null)
	const [busy, setBusy] = useState(false)
	const next = landing(params)

	useEffect(() => {
		Promise.all([getCurrentUser(), getSettings()])
			.then(([me, settings]) => {
				if (!me.needsSetup) return navigate(next, { replace: true })
				// the account's own region first, then the browser's
				const guessed = [settings?.locale, detectLocale(), navigator.language].find(l => CURRENCY_OF[l])
				setLocaleCode(settings?.locale ?? 'auto')
				setCurrencyCode(CURRENCY_OF[guessed] ?? settings?.currency ?? 'DKK')
				setReady(true)
			})
			.catch(e => navigate(e?.status === 401 ? '/signin' : next, { replace: true }))
	}, [])

	const fail = e => { setBusy(false); setProblem(failureMessage(e, phrase('failed.unreachable'))) }
	const saveLooks = () => saveSettings({ currency, locale }).then(() => { setCurrency(currency); setLocale(locale) })

	// a category of the same name already there counts as made: the choice is kept, not doubled
	const makeCategory = chosen => createCategory(chosen.name, { icon: chosen.icon, colour: chosen.colour })
		.catch(e => { if (e?.status !== 409) throw e })

	const done = chosen => {
		setBusy(true)
		setProblem(null)
		return getCounts()
			// an account that already holds records keeps them as they are
			.then(counts => (counts.categories || counts.orders ? null : makeCategory(chosen)))
			.then(() => finishSetup())
			.then(() => navigate(next, { replace: true }))
			.catch(fail)
	}

	const suggested = s => ({ ...s, name: phrase(s.name) })
	const skip = () => {
		setBusy(true)
		saveLooks().then(() => done(suggested(SUGGESTED[0]))).catch(fail)
	}
	const toStep2 = () => {
		setBusy(true)
		setProblem(null)
		saveLooks().then(() => { setBusy(false); setStep(2) }).catch(fail)
	}
	const finish = () => {
		if (pick === OTHER && !own.name.trim()) {
			setProblem(null)
			return document.getElementById('welcome-name')?.focus()
		}
		done(pick === OTHER ? { name: own.name.trim(), icon: own.icon, colour: SWATCHES['primary-4'] } : suggested(SUGGESTED.find(s => s.name === pick)))
	}

	if (!ready) return null
	const chosenLocale = LOCALES.find(l => l.code === locale) ?? LOCALES[0]
	const chosenCurrency = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]

	const head = (
		<div className="sp-stack sp-gap-12">
			<div className="sp-row-flex sp-gap-8">
				<span className="sp-grow"><Gauge thin value={step * 50} aria-hidden="true" /></span>
				<span className="sp-meta">{phrase('welcome.step', { step, steps: 2 })}</span>
			</div>
			<div className="sp-stack sp-gap-6">
				<span className="sp-heading">{phrase(step === 1 ? 'welcome.looks' : 'welcome.tracking')}</span>
				<span className="sp-data">{phrase(step === 1 ? 'welcome.looksLead' : 'welcome.trackingLead')}</span>
			</div>
		</div>
	)

	const body = step === 1
		? (
			<div className="sp-stack sp-gap-12">
				<Field label={phrase('field.currency')} id="welcome-currency">
					<Combobox value={`${chosenCurrency.code} - ${phrase(chosenCurrency.label)}`}>
						{CURRENCIES.map(c => (
							<ComboboxOption key={c.code} selected={c.code === currency} onSelect={() => setCurrencyCode(c.code)}>{`${c.code} - ${phrase(c.label)}`}</ComboboxOption>
						))}
					</Combobox>
				</Field>
				<Field label={phrase('field.dateFormat')} id="welcome-locale">
					<Combobox value={`${phrase(chosenLocale.label)} (${localeSample(chosenLocale.code)})`}>
						{LOCALES.map(l => (
							<ComboboxOption key={l.code} selected={l.code === locale} onSelect={() => setLocaleCode(l.code)}>{`${phrase(l.label)} (${localeSample(l.code)})`}</ComboboxOption>
						))}
					</Combobox>
				</Field>
				<ListItem>
					<span className="sp-section-label">{phrase('welcome.preview')}</span>
					<span className="sp-stat__figure sp-number sp-nowrap">{priced(currency)}</span>
					<span className="sp-rule sp-rule--vertical" />
					<span className="sp-data">{localeSample(locale)}</span>
				</ListItem>
			</div>
		)
		: (
			<div className="sp-stack sp-gap-8" role="radiogroup" aria-label={phrase('welcome.firstCategory')}>
				{SUGGESTED.map(s => {
					const on = pick === s.name
					return (
						<ListItem key={s.name} variant={on ? 'primary' : 'outline'} role="radio" aria-checked={on ? 'true' : 'false'}
							onClick={() => setPick(s.name)}
							mark={<Mark size="small" fill="solid" swatch={s.colour} aria-hidden="true" aria-label={phrase(s.name)}><Icon name={s.icon} size={16} /></Mark>}>
							<span className="sp-title">{phrase(s.name)}</span>
							<span className="sp-grow" />
							{on ? <Icon name="check" size={17} /> : null}
						</ListItem>
					)
				})}
				<ListItem variant={pick === OTHER ? 'primary' : 'outline'} role="radio" aria-checked={pick === OTHER ? 'true' : 'false'}
					onClick={() => { setPick(OTHER); afterDraw(() => document.getElementById('welcome-name')?.focus()) }}
					mark={<Mark size="small" fill="empty" aria-hidden="true" aria-label={phrase('welcome.somethingElse')}><Icon name="plus" size={15} /></Mark>}>
					<span className={pick === OTHER ? 'sp-title' : 'sp-data'}>{phrase('welcome.somethingElseOpen')}</span>
					<span className="sp-grow" />
					{pick === OTHER ? <Icon name="check" size={17} /> : null}
				</ListItem>
				{pick === OTHER
					? (
						<div className="sp-stack sp-gap-12">
							<Field label={phrase('field.name')} id="welcome-name">
								<TextField value={own.name} maxLength={60} onChange={v => setOwn(o => ({ ...o, name: v }))} />
							</Field>
							<Field label={phrase('field.icon')}>
								<CategoryIconPicker value={own.icon} onChange={v => setOwn(o => ({ ...o, icon: v }))} />
							</Field>
						</div>
					)
					: null}
			</div>
		)

	const primary = phrase(step === 1 ? 'action.next' : 'action.finish')
	return (
		<main className={shape === 'touch' ? 'sp-auth sp-touch' : 'sp-auth'}>
			<Card variant="float-wide">
				{head}
				{body}
				{problem ? <span className="sp-meta sp-ink-danger" role="alert">{problem}</span> : null}
				<div className="sp-row-flex sp-gap-10">
					<Button variant="outline" disabled={busy} onClick={skip}>{phrase('action.skip')}</Button>
					<span className="sp-grow" />
					<Button disabled={busy} onClick={step === 1 ? toStep2 : finish}>{busy ? <><Spinner />{primary}</> : primary}</Button>
				</div>
			</Card>
		</main>
	)
}
