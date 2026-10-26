import { useEffect, useId, useState } from 'react'
import { Card, CardHeader } from '../components/Card.jsx'
import { Switch } from '../components/Choice.jsx'
import { getOfferPicksOf, saveOfferPicksOf } from '../api/client.js'
import { useApi } from '../api/useApi.js'

/* The Offers card on a vendor's or a category's page (Vendors and categories 5c, 5f): one switch per offer
   source the account can use, the same pick as its row in Settings, Offers. It saves with the page. */

const WHOSE = { vendor: 'Orders from this vendor', category: 'Orders in this category' }

/** The switches of vendor or category `id` (none yet on a create page): `values` by source, `changed`, and
    `save(id)` to send them once the record is saved. */
export function useOfferSwitches(kind, id) {
	const read = useApi(getOfferPicksOf, [kind, id ?? 'new'])
	const sources = read.data?.sources ?? null
	const start = Object.fromEntries((sources ?? []).map(s => [s.key, s.picked]))
	const [values, setValues] = useState(null)
	useEffect(() => setValues(null), [read.data])
	const now = values ?? start
	const changed = Object.keys(start).some(key => now[key] !== start[key])
	return {
		sources,
		values: now,
		set: (key, on) => setValues({ ...now, [key]: on }),
		changed,
		save: savedId => (changed ? saveOfferPicksOf(kind, savedId, now) : Promise.resolve(null))
	}
}

/** The card itself; nothing when the account can use no source. `hold` draws a control while the page loads. */
export function OfferSwitchesCard({ kind, switches, hold = control => control }) {
	const id = useId()
	if (!switches.sources?.length) return null
	return (
		<Card>
			<CardHeader name="Offers" />
			{switches.sources.map(source => (
				<div className="sp-field" key={source.key}>
					<label className="sp-row-flex sp-gap-12">
						{hold(<Switch id={`${id}-${source.key}`} aria-describedby={`${id}-${source.key}-help`} checked={!!switches.values[source.key]}
							onChange={ev => switches.set(source.key, ev.target.checked)} />)}
						<span className="sp-data">Check {source.name} offers</span>
					</label>
					<span className="sp-field__help" id={`${id}-${source.key}-help`}>{WHOSE[kind]} from the last {source.months} months get Check offers, against this week's offers in every shop {source.name} covers.</span>
				</div>
			))}
		</Card>
	)
}
