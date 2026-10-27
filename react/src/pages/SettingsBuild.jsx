import { useEffect, useRef, useState } from 'react'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Well } from '../components/Well.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Icon } from '../components/Icon.jsx'
import { Skeleton, Spinner } from '../components/Utilities.jsx'
import { useApi } from '../api/useApi.js'
import { checkVersion, failureMessage, getReleaseNotes, getVersion, startUpdate } from '../api/client.js'
import { activeLocaleCode } from '../api/format.js'
import { SettingRow, landing } from './SettingsParts.jsx'

// a check that answers at once still shows Checking for this long, or it reads as nothing happening
const HOLD_MS = 2000
const ANSWERS = ['current', 'behind', 'unpublished', 'failed', 'update-failed']
// while the server restarts on the new version, it is asked this often which version runs, for this long
const POLL_MS = 2000
const UPDATE_LIMIT_MS = 2 * 60 * 1000
// longer than the server's own limits on the updater (api/src/routes/account.js): a request still open after these has hung
const START_LIMIT_MS = 15000
const ASK_LIMIT_MS = 5000

/** Waits for the server to come back on a version other than `commit`, then reloads the page on it. */
async function reloadOnNew(commit) {
	const end = Date.now() + UPDATE_LIMIT_MS
	while (Date.now() < end) {
		await new Promise(done => setTimeout(done, POLL_MS))
		const now = await fetch('/api/version', { cache: 'no-store', signal: AbortSignal.timeout(ASK_LIMIT_MS) }).then(r => (r.ok ? r.json() : null)).catch(() => null)
		if (now?.commit && now.commit !== commit) return window.location.reload()
	}
	throw new Error('The update did not finish.')
}

// the running version and the two before it, until Show earlier versions is pressed; never more than
// VERSIONS_AT_MOST, the running one included (11d)
const VERSIONS_AT_FIRST = 3
const VERSIONS_AT_MOST = 20

/** One version's number and its lines, in the 6d notice's list; `ink` colours both, as inside the amber notice. */
function VersionNotes({ version, notes, ink }) {
	return (
		<div className="sp-stack sp-gap-6">
			<span className={ink ? `sp-meta ${ink}` : 'sp-meta'}>{ink ? <b>{version}</b> : <b className="sp-ink">{version}</b>}</span>
			<ul className={ink ? `sp-toast__changes ${ink}` : 'sp-toast__changes'}>{notes.map((note, i) => <li key={i}>{note}</li>)}</ul>
		</div>
	)
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
	const releaseNotes = useApi(getReleaseNotes)
	const [state, setState] = useState('rest')
	const [why, setWhy] = useState(null)
	const [newest, setNewest] = useState(null)
	const [newestVersion, setNewestVersion] = useState(null)
	const [newerNotes, setNewerNotes] = useState([])
	const [allShown, setAllShown] = useState(false)
	const [notesOpen, setNotesOpen] = useState(false)
	const card = useRef(null)

	useEffect(() => {
		const box = card.current
		if (!allShown || !box) return
		const watch = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) setAllShown(false) })
		watch.observe(box)
		return () => watch.disconnect()
	}, [allShown])

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
			setNewestVersion(answer.value.latestVersion ?? null)
			setNewerNotes(answer.value.newerNotes ?? [])
			setState(answer.value.current ? 'current' : answer.value.published ? 'behind' : 'unpublished')
		})
	}

	// the update restarts the server; the page reloads once it answers with the new version (11d state 4)
	const update = () => {
		setState('updating')
		setWhy(null)
		const failed = fallback => e => { setWhy(failureMessage(e, fallback)); setState('update-failed') }
		startUpdate(AbortSignal.timeout(START_LIMIT_MS)).then(
			() => reloadOnNew(version.data.commit).catch(failed('The update did not finish.')),
			failed('The update could not be started.'))
	}

	const heading = <CardHeader name="This build" {...landing('build')} />
	const { version: versionNumber, builtAt, commit, canUpdate } = version.data ?? {}

	if (!version.data) return (
		<Card ref={card} aria-busy={version.error ? undefined : 'true'}>
			{heading}
			{version.error
				? <SettingRow label="This build" help="Couldn't read which version is running." />
				: <Skeleton shape="line" />}
		</Card>
	)

	if (!commit) return (
		<Card ref={card}>
			{heading}
			<SettingRow label={versionNumber ? `Version ${versionNumber}` : 'This build'}
				help="This copy of Spendly was not installed from a published version, so there is nothing to check." />
		</Card>
	)

	const stamp = builtAt ? stampOf(builtAt) : null
	const versions = (releaseNotes.data?.versions ?? []).slice(0, VERSIONS_AT_MOST)
	// the button counts the earlier versions the list will hold, whether or not the running one has notes
	const earlier = versions.filter(v => v.version !== versionNumber).length
	const shown = allShown ? versions : versions.slice(0, VERSIONS_AT_FIRST)
	const whatChanged = notesOpen && versions.length > 0 && (
		<div className="sp-stack sp-gap-12" aria-label="What changed">
			<span className="sp-section-label">WHAT CHANGED</span>
			{shown.map(v => <VersionNotes key={v.version} {...v} />)}
			{shown.length < versions.length
				? (
					<div className="sp-row-flex">
						<Button variant="outline" size="small" onClick={() => setAllShown(true)}>{`Show ${earlier} earlier versions`}</Button>
					</div>
				)
				: null}
		</div>
	)
	const installed = `Installed on ${stamp ?? 'an unknown date'} (${commit.slice(0, 7)}).`
	const installs = canUpdate && (state === 'behind' || state === 'updating' || state === 'update-failed')
	// only an update on offer has a primary button: it is the one press here with a consequence
	const button = installs
		? state === 'updating'
			? <Button key="update" size="small" disabled><Spinner />Updating…</Button>
			: <Button key="update" size="small" onClick={update}>{state === 'update-failed' ? 'Try again' : 'Update and reload'}</Button>
		: state === 'checking'
			? <Button key="check" variant="outline" size="small" disabled><Spinner />Checking…</Button>
			: <Button key="check" variant="outline" size="small" onClick={check}>{state === 'failed' ? 'Try again' : 'Check for updates'}</Button>

	return (
		<Card ref={card}>
			{heading}
			<SettingRow label={versionNumber ? `Version ${versionNumber}` : 'This build'} help={installed}>
				<span className="sp-row-flex sp-gap-8">
					{button}
					{versions.length
						? <Button variant="outline" size="small" aria-expanded={notesOpen} onClick={() => setNotesOpen(o => !o)}>What changed</Button>
						: null}
				</span>
			</SettingRow>
			{state === 'current'
				? <ListItem color="success"><Icon name="check" />This is the newest version.</ListItem>
				: null}
			{state === 'behind'
				? (
					<Well color="warning">
						<span className="sp-title sp-ink-warning">{newestVersion ? `Version ${newestVersion} is available.` : 'A newer version is available.'}</span>
						<span className="sp-meta sp-ink-warning">
							{canUpdate
								? `${newest ? `Installed ${newest}. ` : ''}Updating reloads the app; nothing you have saved is affected.`
								: 'The person who manages your Spendly can install it. Nothing you have saved is affected.'}
						</span>
						{newerNotes.map(v => <VersionNotes key={v.version} {...v} ink="sp-ink-warning" />)}
					</Well>
				)
				: null}
			{state === 'updating'
				? (
					<Well color="warning">
						<span className="sp-title sp-ink-warning">Installing the newer version.</span>
						<span className="sp-meta sp-ink-warning">Spendly restarts on it, and this page reloads by itself when it is back. This can take up to two minutes.</span>
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
			{whatChanged}
		</Card>
	)
}
