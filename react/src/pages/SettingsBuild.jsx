import { useEffect, useRef, useState } from 'react'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Well } from '../components/Well.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Icon } from '../components/Icon.jsx'
import { Skeleton, Spinner } from '../components/Utilities.jsx'
import { useApi } from '../api/useApi.js'
import { checkVersion, failureMessage, getVersion, startUpdate } from '../api/client.js'
import { activeLocaleCode } from '../api/format.js'
import { landing } from './SettingsParts.jsx'

// a check that answers at once still shows Checking for this long, or it reads as nothing happening
const HOLD_MS = 2000
const ANSWERS = ['current', 'behind', 'unpublished', 'failed', 'update-failed']
// while the server restarts on the new version, it is asked this often which version runs, for this long
const POLL_MS = 2000
const UPDATE_LIMIT_MS = 5 * 60 * 1000

/** Waits for the server to come back on a version other than `commit`, then reloads the page on it. */
async function reloadOnNew(commit) {
	const end = Date.now() + UPDATE_LIMIT_MS
	while (Date.now() < end) {
		await new Promise(done => setTimeout(done, POLL_MS))
		const now = await fetch('/api/version', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null)
		if (now?.commit && now.commit !== commit) return window.location.reload()
	}
	throw new Error('The update did not finish.')
}

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
	const [why, setWhy] = useState(null)
	const [newest, setNewest] = useState(null)
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
			setNewest(answer.value.latestBuiltAt ? stampOf(answer.value.latestBuiltAt) : null)
			setState(answer.value.current ? 'current' : answer.value.published ? 'behind' : 'unpublished')
		})
	}

	// the update restarts the server; the page reloads once it answers with the new version (11d state 4)
	const update = () => {
		setState('updating')
		setWhy(null)
		const failed = fallback => e => { setWhy(failureMessage(e, fallback)); setState('update-failed') }
		startUpdate().then(
			() => reloadOnNew(version.data.commit).catch(failed('The update did not finish.')),
			failed('The update could not be started.'))
	}

	const heading = <CardHeader name="This build" {...landing('build')} />
	const { builtAt, commit, canUpdate } = version.data ?? {}

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
	const installs = canUpdate && (state === 'behind' || state === 'updating' || state === 'update-failed')
	// only an update on offer has a primary button: it is the one press here with a consequence
	const button = installs
		? state === 'updating'
			? <Button key="update" fullWidth disabled><Spinner />Updating…</Button>
			: <Button key="update" fullWidth onClick={update}>{state === 'update-failed' ? 'Try again' : 'Update and reload'}</Button>
		: state === 'checking'
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
						<span className="sp-meta sp-ink-warning">
							{canUpdate
								? `${newest ? `Installed ${newest}. ` : ''}Updating reloads the app; nothing you have saved is affected.`
								: 'The person who manages your Spendly can install it. Nothing you have saved is affected.'}
						</span>
					</Well>
				)
				: null}
			{state === 'updating'
				? (
					<Well color="warning">
						<span className="sp-title sp-ink-warning">Installing the newer version.</span>
						<span className="sp-meta sp-ink-warning">Spendly restarts on it, and this page reloads by itself when it is back. This can take a few minutes.</span>
					</Well>
				)
				: null}
			{state === 'update-failed'
				? (
					<Well color="danger">
						<span className="sp-title sp-ink-danger">{why}</span>
						<span className="sp-meta sp-ink-danger">You can keep using the version you have.</span>
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
