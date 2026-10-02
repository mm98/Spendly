import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Well } from '../components/Well.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Icon } from '../components/Icon.jsx'
import { Skeleton, Spinner } from '../components/Utilities.jsx'
import { useApi } from '../api/useApi.js'
import { checkVersion, getVersion } from '../api/client.js'
import { activeLocaleCode } from '../api/format.js'
import { Heading } from './SettingsParts.jsx'

// a check that answers at once still shows Checking for this long, or it reads as nothing happening
const HOLD_MS = 2000
const ANSWERS = ['current', 'behind', 'unpublished', 'failed']

const stampOf = iso => {
	const at = new Date(iso)
	if (Number.isNaN(at.getTime())) return null
	return new Intl.DateTimeFormat(activeLocaleCode(), { dateStyle: 'short', timeStyle: 'short' }).format(at)
}

/* This build, through the five states of 11d. An answer holds until the card leaves the
   screen, then the card is back at rest: a stale "up to date" is worse than none. */
export function BuildCard() {
	const version = useApi(getVersion)
	const [state, setState] = useState('rest')
	const card = useRef(null)

	useEffect(() => {
		const box = card.current
		if (!ANSWERS.includes(state) || !box) return
		const watch = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) setState('rest') })
		watch.observe(box)
		return () => watch.disconnect()
	}, [state])

	const check = () => {
		setState('checking')
		Promise.allSettled([checkVersion(), new Promise(done => setTimeout(done, HOLD_MS))]).then(([answer]) => {
			if (answer.status === 'rejected') return setState('failed')
			setState(answer.value.current ? 'current' : answer.value.published ? 'behind' : 'unpublished')
		})
	}

	const heading = <Heading section="build">This build</Heading>
	const { builtAt, commit } = version.data ?? {}

	if (!version.data) return (
		<Card ref={card} aria-busy={version.error ? undefined : 'true'}>
			{heading}
			{version.error
				? <span className="sp-data">Couldn't read which version is running.</span>
				: <Skeleton shape="line" />}
		</Card>
	)

	if (!commit) return (
		<Card ref={card}>
			{heading}
			<span className="sp-data">This copy of Spendly was not installed from a published version, so there is nothing to check.</span>
		</Card>
	)

	const stamp = builtAt ? stampOf(builtAt) : null
	const running = (
		<span className="sp-data">
			You're running the version installed on <b className="sp-ink">{stamp ?? 'an unknown date'}</b> <span className="sp-ink-5">({commit.slice(0, 7)})</span>.
		</span>
	)
	const button = state === 'checking'
		? <Button key="check" variant="outline" fullWidth disabled><Spinner />Checking…</Button>
		: <Button key="check" variant="outline" fullWidth onClick={check}>{state === 'failed' ? 'Try again' : 'Check for updates'}</Button>

	return (
		<Card ref={card} footerCommits footer={button}>
			{heading}
			{running}
			{state === 'rest' || state === 'checking'
				? <span className="sp-meta">Press the button below to check online for a newer version.</span>
				: null}
			{state === 'current'
				? <ListItem color="success"><span className="sp-row-flex sp-flex-none"><Icon name="check" /></span>This is the newest version.</ListItem>
				: null}
			{state === 'behind'
				? (
					<Well color="warning">
						<span className="sp-title sp-ink-warning">A newer version is available.</span>
						<span className="sp-meta sp-ink-warning">The person who manages your Spendly can install it. Nothing you have saved is affected.</span>
					</Well>
				)
				: null}
			{state === 'unpublished'
				? (
					<Well>
						<span className="sp-title">There is nothing to compare this version with.</span>
						<span className="sp-meta">It was built on its own and never published.</span>
					</Well>
				)
				: null}
			{state === 'failed'
				? (
					<Well color="danger">
						<span className="sp-title sp-ink-danger">Couldn't reach the update server.</span>
						<span className="sp-meta sp-ink-danger">You can keep using the version you have.</span>
					</Well>
				)
				: null}
		</Card>
	)
}
