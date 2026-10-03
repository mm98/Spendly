import { useEffect, useState } from 'react'
import { useMatches, useNavigate, useSearchParams } from 'react-router'
import { Card } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { Field } from '../components/Field.jsx'
import { TextField } from '../components/Inputs.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Spinner } from '../components/Utilities.jsx'
import { useShellShape } from '../app/useMedia.js'
import { CategoryIconPicker, SWATCHES } from '../app/categoryMark.jsx'
import {
	createCategory, failureMessage, finishSetup, getCategories, getCurrentUser, getOrders, getSettings, saveSettings
} from '../api/client.js'
import { CURRENCIES, LOCALES, amount, detectLocale, localeSample, setCurrency, setLocale } from '../api/format.js'
import { landing } from './SignIn.jsx'

// the currency a browser's region most likely keeps its books in
const CURRENCY_OF = { 'da-DK': 'DKK', 'sv-SE': 'SEK', 'nb-NO': 'NOK', 'de-DE': 'EUR', 'en-GB': 'GBP', 'en-US': 'USD' }

const SUGGESTED = [
	{ name: 'Home and decor', icon: 'flower', colour: SWATCHES.green },
	{ name: 'Furniture', icon: 'armchair', colour: SWATCHES['green-2'] },
	{ name: 'Electronics', icon: 'device-desktop', colour: SWATCHES['green-3'] }
]
const OTHER = 'other'

const priced = code => {
	const c = CURRENCIES.find(x => x.code === code) ?? CURRENCIES[0]
	return c.before ? c.symbol + amount(1234.5) : `${amount(1234.5)} ${c.symbol}`
}

/** /welcome, the first run (20d): how amounts and dates look, then one category, then Home. */
export default function Welcome() {
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const shape = useShellShape()
	const named = useMatches().at(-1)?.handle?.title
	useEffect(() => { if (named) document.title = `${named} - Spendly` }, [named])
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

	const fail = e => { setBusy(false); setProblem(failureMessage(e, 'Spendly could not be reached. Check your connection and try again.')) }
	const saveLooks = () => saveSettings({ currency, locale }).then(() => { setCurrency(currency); setLocale(locale) })

	// a category of the same name already there counts as made: the choice is kept, not doubled
	const makeCategory = chosen => createCategory(chosen.name, { icon: chosen.icon, colour: chosen.colour })
		.catch(e => { if (e?.status !== 409) throw e })

	const done = chosen => {
		setBusy(true)
		setProblem(null)
		return Promise.all([getCategories(), getOrders({ pageSize: 1 })])
			// an account that already holds records keeps them as they are
			.then(([cats, orders]) => (cats?.length || orders?.total ? null : makeCategory(chosen)))
			.then(() => finishSetup())
			.then(() => navigate(next, { replace: true }))
			.catch(fail)
	}

	const skip = () => {
		setBusy(true)
		saveLooks().then(() => done(SUGGESTED[0])).catch(fail)
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
		done(pick === OTHER ? { name: own.name.trim(), icon: own.icon, colour: SWATCHES['green-4'] } : SUGGESTED.find(s => s.name === pick))
	}

	if (!ready) return null
	const chosenLocale = LOCALES.find(l => l.code === locale) ?? LOCALES[0]
	const chosenCurrency = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]

	const head = (
		<div className="sp-stack sp-gap-12">
			<div className="sp-row-flex sp-gap-8">
				<span className="au-seg" />
				<span className={step === 2 ? 'au-seg' : 'au-seg au-seg--off'} />
				<span className="sp-grow" />
				<span className="sp-meta">Step {step} of 2</span>
			</div>
			<div className="sp-stack sp-gap-6">
				<span className="sp-heading">{step === 1 ? 'How should amounts look?' : 'What are you tracking?'}</span>
				<span className="sp-data">{step === 1
					? "We've guessed from your browser. Change it now or later in Settings."
					: 'Pick one to start with. You can add more from any order.'}</span>
			</div>
		</div>
	)

	const body = step === 1
		? (
			<div className="sp-stack sp-gap-12">
				<Field label="Currency" id="welcome-currency">
					<Combobox value={`${chosenCurrency.code} - ${chosenCurrency.label}`}>
						{CURRENCIES.map(c => (
							<ComboboxOption key={c.code} selected={c.code === currency} onSelect={() => setCurrencyCode(c.code)}>{`${c.code} - ${c.label}`}</ComboboxOption>
						))}
					</Combobox>
				</Field>
				<Field label="Date format" id="welcome-locale">
					<Combobox value={`${chosenLocale.label} (${localeSample(chosenLocale.code)})`}>
						{LOCALES.map(l => (
							<ComboboxOption key={l.code} selected={l.code === locale} onSelect={() => setLocaleCode(l.code)}>{`${l.label} (${localeSample(l.code)})`}</ComboboxOption>
						))}
					</Combobox>
				</Field>
				<ListItem>
					<span className="sp-section-label">Preview</span>
					<span className="sp-stat__figure sp-number sp-nowrap">{priced(currency)}</span>
					<span className="sp-rule sp-rule--vertical" />
					<span className="sp-data">{localeSample(locale)}</span>
				</ListItem>
			</div>
		)
		: (
			<div className="sp-stack sp-gap-8" role="radiogroup" aria-label="A first category">
				{SUGGESTED.map(s => {
					const on = pick === s.name
					return (
						<ListItem key={s.name} variant={on ? 'primary' : 'outline'} role="radio" aria-checked={on ? 'true' : 'false'}
							onClick={() => setPick(s.name)}
							mark={<Mark size="small" fill="solid" swatch={s.colour} aria-hidden="true" aria-label={s.name}><Icon name={s.icon} size={16} /></Mark>}>
							<span className="sp-title">{s.name}</span>
							<span className="sp-grow" />
							{on ? <Icon name="check" size={17} /> : null}
						</ListItem>
					)
				})}
				<ListItem variant={pick === OTHER ? 'primary' : 'outline'} role="radio" aria-checked={pick === OTHER ? 'true' : 'false'}
					onClick={() => { setPick(OTHER); requestAnimationFrame(() => document.getElementById('welcome-name')?.focus()) }}
					mark={<Mark size="small" fill="empty" aria-hidden="true" aria-label="Something else"><Icon name="plus" size={15} /></Mark>}>
					<span className={pick === OTHER ? 'sp-title' : 'sp-data'}>Something else…</span>
					<span className="sp-grow" />
					{pick === OTHER ? <Icon name="check" size={17} /> : null}
				</ListItem>
				{pick === OTHER
					? (
						<div className="sp-stack sp-gap-12">
							<Field label="Name" id="welcome-name">
								<TextField value={own.name} maxLength={60} onChange={v => setOwn(o => ({ ...o, name: v }))} />
							</Field>
							<Field label="Icon">
								<CategoryIconPicker value={own.icon} onChange={v => setOwn(o => ({ ...o, icon: v }))} />
							</Field>
						</div>
					)
					: null}
			</div>
		)

	const primary = step === 1 ? 'Next' : 'Finish'
	return (
		<main className={shape === 'touch' ? 'sp-auth sp-touch' : 'sp-auth'}>
			<Card variant="float-wide">
				{head}
				{body}
				{problem ? <span className="sp-meta sp-ink-danger" role="alert">{problem}</span> : null}
				<div className="sp-row-flex sp-gap-10">
					<Button variant="text" disabled={busy} onClick={skip}>Skip</Button>
					<span className="sp-grow" />
					<Button disabled={busy} onClick={step === 1 ? toStep2 : finish}>{busy ? <><Spinner />{primary}</> : primary}</Button>
				</div>
			</Card>
		</main>
	)
}
