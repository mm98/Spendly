import { useState } from 'react'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { Well } from '../components/Well.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Icon } from '../components/Icon.jsx'
import { Gauge } from '../components/Data.jsx'
import { invalidate } from '../api/useApi.js'
import { populateDemoData } from '../api/client.js'
import { amount, plural } from '../api/format.js'
import { Choose, SettingRow, landing, useStepFocus } from './SettingsParts.jsx'

const COUNTS = [500, 1000, 5000, 10000, 25000, 50000]
// months, which is the unit the fill spreads by; offered in years
const SPANS = [12, 24, 48, 72, 96, 120, 144, 216, 288]

const orders = n => `${amount(n, 0)} ${n === 1 ? 'order' : 'orders'}`
const lastSpan = months => (months === 12 ? 'the last year' : `the last ${months / 12} years`)

const COUNT_ID = 'demo-count'

const INTRO = 'Fill the account with made-up orders so the lists and charts have something to show. Each fill creates a new, different set.'

/* Demo data, through the five states of 11c. The fill reports its count as it writes. */
export function DemoCard() {
	const [stage, setStage] = useState({ name: 'rest' })
	const [count, setCount] = useState(COUNTS[0])
	const [months, setMonths] = useState(SPANS[0])
	const { box, then } = useStepFocus(stage)
	const go = (next, target = 'heading') => { then(target); setStage(next) }
	// choosing asks how many first, so a second Enter never lands on Yes, fill it
	const choose = () => go({ name: 'choosing' }, COUNT_ID)

	const fill = () => {
		go({ name: 'filling', done: 0 })
		populateDemoData(count, months, { onRows: done => setStage(s => (s.name === 'filling' ? { ...s, done } : s)) })
			.then(made => {
				invalidate()
				go({ name: 'done', made })
			})
			// `landed` comes only after the wipe: without it, an answer from Spendly itself means
			// nothing changed; a gateway's (502 to 504) or none means it may still be running
			.catch(error => {
				const landed = error?.body?.landed
				if (Number.isFinite(landed)) invalidate()
				go({ name: 'failed', landed, answered: error?.status > 0 && !(error.status >= 502 && error.status <= 504) })
			})
	}

	const heading = <CardHeader name="Demo data" {...landing('demo')} />

	if (stage.name === 'choosing') return (
		<Card ref={box} footerCommits footerLayout="split" footer={[
			<Button key="cancel" variant="outline" onClick={() => go({ name: 'rest' })}>Cancel</Button>,
			<Button key="confirm" color="danger" onClick={fill}>Yes, fill it</Button>
		]}>
			{heading}
			<span className="sp-data">{INTRO}</span>
			<Field label="How many orders" id={COUNT_ID}>
				<Choose value={count} onChange={setCount} options={COUNTS.map(n => ({ id: n, label: orders(n) }))} />
			</Field>
			<Field label="Over how long" message="How far back the orders reach, ending today.">
				<Choose value={months} onChange={setMonths} options={SPANS.map(m => ({ id: m, label: plural(m / 12, 'year') }))} />
			</Field>
			<Well color="danger">
				<span className="sp-title sp-ink-danger">This replaces what is here now</span>
				<span className="sp-meta sp-ink-danger">Every order, bookmark, vendor and category you have added is removed first.</span>
			</Well>
		</Card>
	)

	if (stage.name === 'filling') return (
		<Card ref={box} aria-busy="true">
			{heading}
			<span className="sp-data">Creating {orders(count)} over {lastSpan(months)}.</span>
			<Gauge thin value={(stage.done / count) * 100} aria-label="Demo data progress" />
			<div className="sp-sum">
				<span className="sp-meta">{amount(stage.done, 0)} of {amount(count, 0)}</span>
				<span className="sp-grow" />
				<span className="sp-meta">This can take a moment.</span>
			</div>
		</Card>
	)

	if (stage.name === 'done') {
		const { made } = stage
		return (
			<Card ref={box} footerCommits footerLayout="split" footer={[
				<Button key="again" variant="outline" onClick={choose}>Fill again</Button>,
				<Button key="see" to="/orders">See the orders</Button>
			]}>
				{heading}
				<ListItem color="success">
					<Icon name="check" />
					<span className="sp-subtitle sp-ink-accent">
						{orders(made.orders)} created across {plural(made.vendors, 'vendor')} and {plural(made.categories, 'category', 'categories')}.
					</span>
				</ListItem>
			</Card>
		)
	}

	if (stage.name === 'failed') return (
		<Card ref={box} footerCommits footer={<Button key="again" variant="outline" fullWidth onClick={choose}>Try again</Button>}>
			{heading}
			<Well color="danger">
				<span className="sp-title sp-ink-danger">Couldn't finish filling.</span>
				<span className="sp-meta sp-ink-danger">
					{stage.landed > 0
						? `${orders(stage.landed)} ${stage.landed === 1 ? 'was' : 'were'} created before it stopped. They are in your lists now.`
						: stage.landed === 0
							? 'No orders were created before it stopped. Everything you had added was removed first.'
							: stage.answered
								? 'Nothing was changed. Your lists are as they were.'
								: 'Spendly did not answer. The fill may still finish, so look at your orders in a minute.'}
				</span>
			</Well>
		</Card>
	)

	return (
		<Card ref={box}>
			{heading}
			<SettingRow label="Demo data" help="Fill the account with made-up orders so the lists and charts have something to show.">
				<span className="sp-row-flex">
					<Button variant="outline" size="small" onClick={choose}>Fill with demo data</Button>
				</span>
			</SettingRow>
		</Card>
	)
}
