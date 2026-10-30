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
import { Choose, landing, useStepFocus } from './SettingsParts.jsx'
import { usePhrase } from '../language/phrases.js'

const COUNTS = [500, 1000, 5000, 10000, 25000, 50000]
// months, which is the unit the fill spreads by; offered in years
const SPANS = [12, 24, 48, 72, 96, 120, 144, 216, 288]

const orders = n => plural(n, 'order')

const COUNT_ID = 'demo-count'

/* Demo data, through the five states of 11c. The fill reports its count as it writes. */
export function DemoCard() {
	const phrase = usePhrase()
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

	const heading = <CardHeader name={phrase('settings.section.demo')} {...landing('demo')} />

	if (stage.name === 'choosing') return (
		<Card ref={box} footerCommits footerLayout="split" footer={[
			<Button key="cancel" variant="outline" onClick={() => go({ name: 'rest' }, 'action')}>{phrase('action.cancel')}</Button>,
			<Button key="confirm" color="danger" onClick={fill}>{phrase('demo.confirm')}</Button>
		]}>
			{heading}
			<span className="sp-data">{phrase('demo.intro')}</span>
			<Field label={phrase('demo.howMany')} id={COUNT_ID}>
				<Choose value={count} onChange={setCount} options={COUNTS.map(n => ({ id: n, label: orders(n) }))} />
			</Field>
			<Field label={phrase('demo.howLong')} message={phrase('demo.howLongHint')}>
				<Choose value={months} onChange={setMonths} options={SPANS.map(m => ({ id: m, label: plural(m / 12, 'year') }))} />
			</Field>
			<Well color="danger">
				<span className="sp-title sp-ink-danger">{phrase('demo.replaces')}</span>
				<span className="sp-meta sp-ink-danger">{phrase('demo.replacesBody')}</span>
			</Well>
		</Card>
	)

	if (stage.name === 'filling') return (
		<Card ref={box} aria-busy="true">
			{heading}
			<span className="sp-data">{phrase('demo.creating', { orders: orders(count), years: months / 12 })}</span>
			<Gauge thin value={(stage.done / count) * 100} aria-label={phrase('demo.progress')} />
			<div className="sp-sum">
				<span className="sp-meta">{phrase('demo.done', { done: amount(stage.done, 0), count: amount(count, 0) })}</span>
				<span className="sp-grow" />
				<span className="sp-meta">{phrase('demo.moment')}</span>
			</div>
		</Card>
	)

	if (stage.name === 'done') {
		const { made } = stage
		return (
			<Card ref={box} footerCommits footerLayout="split" footer={[
				<Button key="again" variant="outline" onClick={choose}>{phrase('demo.fillAgain')}</Button>,
				<Button key="see" to="/orders">{phrase('demo.seeOrders')}</Button>
			]}>
				{heading}
				<ListItem color="success">
					<Icon name="check" />
					<span className="sp-subtitle sp-ink-accent">
						{phrase('demo.made', { orders: orders(made.orders), vendors: plural(made.vendors, 'vendor'), categories: plural(made.categories, 'category') })}
					</span>
				</ListItem>
			</Card>
		)
	}

	if (stage.name === 'failed') return (
		<Card ref={box} footerCommits footer={<Button key="again" variant="outline" fullWidth onClick={choose}>{phrase('action.tryAgain')}</Button>}>
			{heading}
			<Well color="danger">
				<span className="sp-title sp-ink-danger">{phrase('demo.failed')}</span>
				<span className="sp-meta sp-ink-danger">
					{stage.landed > 0
						? phrase('demo.failedSome', { count: stage.landed, orders: orders(stage.landed) })
						: stage.landed === 0
							? phrase('demo.failedNone')
							: stage.answered
								? phrase('demo.failedNothing')
								: phrase('demo.failedNoAnswer')}
				</span>
			</Well>
		</Card>
	)

	return (
		<Card ref={box} footerCommits footer={<Button key="start" variant="outline" fullWidth onClick={choose}>{phrase('demo.start')}</Button>}>
			{heading}
			<span className="sp-data">{phrase('demo.intro')}</span>
		</Card>
	)
}
