import { useState } from 'react'
import { Card } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { Well } from '../components/Well.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Icon } from '../components/Icon.jsx'
import { invalidate } from '../api/useApi.js'
import { populateDemoData } from '../api/client.js'
import { amount, plural } from '../api/format.js'
import { Choose, Heading } from './SettingsParts.jsx'

const COUNTS = [500, 1000, 5000, 10000, 25000, 50000]
// months, which is the unit the fill spreads by; offered in years
const SPANS = [12, 24, 48, 72, 96, 120, 144, 216, 288]

const orders = n => `${amount(n, 0)} ${n === 1 ? 'order' : 'orders'}`
const lastSpan = months => (months === 12 ? 'the last year' : `the last ${months / 12} years`)

const INTRO = 'Fill the account with made-up orders so the lists and charts have something to show. Each fill creates a new, different set.'

/* Demo data, through the five states of 11c. A fill is one request, so there is no running
   count to show while it works. */
export function DemoCard() {
	const [stage, setStage] = useState({ name: 'rest' })
	const [count, setCount] = useState(COUNTS[0])
	const [months, setMonths] = useState(SPANS[0])

	const fill = () => {
		setStage({ name: 'filling' })
		populateDemoData(count, months)
			.then(made => {
				invalidate()
				setStage({ name: 'done', made })
			})
			.catch(error => setStage({ name: 'failed', answered: error?.name === 'ApiError' }))
	}

	const heading = <Heading section="demo">Demo data</Heading>

	if (stage.name === 'choosing') return (
		<Card footerCommits footerLayout="split" footer={[
			<Button key="cancel" variant="outline" onClick={() => setStage({ name: 'rest' })}>Cancel</Button>,
			<Button key="fill" color="danger" onClick={fill}>Yes, fill it</Button>
		]}>
			{heading}
			<span className="sp-data">{INTRO}</span>
			<Field label="How many orders">
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
		<Card aria-busy="true">
			{heading}
			<span className="sp-data">Creating {orders(count)} over {lastSpan(months)}.</span>
			<span className="sp-meta">This can take a moment.</span>
		</Card>
	)

	if (stage.name === 'done') {
		const { made } = stage
		return (
			<Card footerCommits footerLayout="split" footer={[
				<Button key="again" variant="outline" onClick={() => setStage({ name: 'choosing' })}>Fill again</Button>,
				<Button key="see" to="/orders">See the orders</Button>
			]}>
				{heading}
				<ListItem color="success">
					<span className="sp-row-flex sp-flex-none"><Icon name="check" /></span>
					<span className="sp-subtitle sp-ink-accent">
						{orders(made.orders)} created across {plural(made.vendors, 'vendor')} and {plural(made.categories, 'category', 'categories')}.
					</span>
				</ListItem>
			</Card>
		)
	}

	if (stage.name === 'failed') return (
		<Card footerCommits footer={<Button key="again" variant="outline" fullWidth onClick={() => setStage({ name: 'choosing' })}>Try again</Button>}>
			{heading}
			<Well color="danger">
				<span className="sp-title sp-ink-danger">Couldn't finish filling.</span>
				<span className="sp-meta sp-ink-danger">
					{stage.answered
						? 'Nothing was changed. Your lists are as they were.'
						: 'The server did not answer. The fill may still finish, so look at your orders in a minute.'}
				</span>
			</Well>
		</Card>
	)

	return (
		<Card footerCommits footer={<Button key="fill" variant="outline" fullWidth onClick={() => setStage({ name: 'choosing' })}>Fill with demo data</Button>}>
			{heading}
			<span className="sp-data">{INTRO}</span>
		</Card>
	)
}
