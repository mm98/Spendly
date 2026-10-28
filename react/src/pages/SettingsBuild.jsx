import { useEffect, useRef, useState } from 'react'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Well } from '../components/Well.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Icon } from '../components/Icon.jsx'
import { Dialog, DialogActions, DialogTitle, Leaving } from '../components/Overlays.jsx'
import { Skeleton, Spinner } from '../components/Utilities.jsx'
import { useApi } from '../api/useApi.js'
import { checkVersion, failureMessage, getReleaseNotes, getVersion, startUpdate } from '../api/client.js'
import { activeLocaleCode } from '../api/format.js'
import { landing } from './SettingsParts.jsx'

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

// the card holds the running version and the two before it; Show earlier versions opens all of them,
// never more than VERSIONS_AT_MOST, the running one included (11d)
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

// marks which edges of the list have more past them, for the fade in app.css
function markEdges(box) {
	const edge = (name, more) => (more ? box.setAttribute(name, 'true') : box.removeAttribute(name))
	edge('data-above', box.scrollTop > 1)
	edge('data-below', box.scrollTop + box.clientHeight < box.scrollHeight - 1)
}

/** Every listed version, in the What changed dialog's list that scrolls (11d state 6). */
function AllVersions({ versions }) {
	const box = useRef(null)
	useEffect(() => {
		const list = box.current
		if (!list) return
		const mark = () => markEdges(list)
		mark()
		const watch = new ResizeObserver(mark)
		watch.observe(list)
		return () => watch.disconnect()
	}, [])
	return (
		<div className="sp-dialog__scroll" aria-label="What changed" ref={box} onScroll={ev => markEdges(ev.currentTarget)}>
			{versions.map(v => <VersionNotes key={v.version} {...v} />)}
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
	const [allOpen, setAllOpen] = useState(false)
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
	const versions = (releaseNotes.data?.versions ?? []).slice(0, VERSIONS_AT_MOST)
	// the button counts the earlier versions the list will hold, whether or not the running one has notes
	const earlier = versions.filter(v => v.version !== versionNumber).length
	const shown = versions.slice(0, VERSIONS_AT_FIRST)
	const whatChanged = versions.length > 0 && (
		<div className="sp-stack sp-gap-12" aria-label="What changed">
			<span className="sp-section-label">WHAT CHANGED</span>
			{shown.map(v => <VersionNotes key={v.version} {...v} />)}
			{shown.length < versions.length
				? (
					<div className="sp-row-flex">
						<Button variant="outline" size="small" onClick={() => setAllOpen(true)}>{`Show ${earlier} earlier versions`}</Button>
					</div>
				)
				: null}
			<Leaving>
				{allOpen
					? (
						<Dialog onCancel={() => setAllOpen(false)}>
							<DialogTitle>What changed</DialogTitle>
							<AllVersions versions={versions} />
							<DialogActions>
								<Button variant="outline" onClick={() => setAllOpen(false)}>Close</Button>
							</DialogActions>
						</Dialog>
					)
					: null}
			</Leaving>
		</div>
	)
	const running = (
		<span className="sp-data">
			{versionNumber
				? <>You're running version <b className="sp-ink">{versionNumber}</b>, installed on </>
				: "You're running the version installed on "}
			<b className="sp-ink">{stamp ?? 'an unknown date'}</b> <span className="sp-ink-5">({commit.slice(0, 7)})</span>.
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
