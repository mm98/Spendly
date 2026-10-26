import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Toast } from '../components/Overlays.jsx'
import { BUNDLE_VERSION, onBuildChanged } from '../api/build.js'
import { getReleaseNotes } from '../api/client.js'

// the line a version with no change you can see has (scripts/release-notes.mjs)
const NOTHING_TO_SEE = 'No change you can see.'
// the notice's list holds at most this many lines (6d)
const LINES_SHOWN = 3

// "1.10.0" after "1.9.3": compared part by part as numbers
const isNewer = (version, than) => {
	const [a, b] = [version, than].map(v => String(v).split('.').map(Number))
	for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0)
	return false
}

/** What the versions newer than this tab bring, newest first, at most three lines; the one line
    "No change you can see." when none of them has a change to tell. Null when it cannot be told. */
function newerLines(versions) {
	if (!BUNDLE_VERSION) return null
	const newer = versions.filter(({ version }) => isNewer(version, BUNDLE_VERSION))
	if (!newer.length) return null
	const lines = newer.flatMap(({ notes }) => notes).filter(note => note !== NOTHING_TO_SEE)
	return lines.length ? lines.slice(0, LINES_SHOWN) : [NOTHING_TO_SEE]
}

/** The server runs a newer version than this tab (Settings 11d's words, in 6d's notice that stays
    until answered), with what the newer versions bring. Wait for later hides it until the next page,
    and it asks again there. */
export function useUpdateNotice() {
	const [newer, setNewer] = useState(null)
	const [lines, setLines] = useState(null)
	// the page it was put off on; any other page asks again
	const [waitedOn, setWaitedOn] = useState(null)
	const { pathname } = useLocation()
	useEffect(() => onBuildChanged(setNewer), [])
	useEffect(() => { setWaitedOn(was => (was && was !== pathname ? null : was)) }, [pathname])
	// the server that answers now is the newer one, so its notes hold what this tab has not seen
	useEffect(() => {
		if (!newer) return
		const stop = new AbortController()
		getReleaseNotes(stop.signal).then(({ versions }) => setLines(newerLines(versions ?? [])), () => {})
		return () => stop.abort()
	}, [newer])
	if (!newer || waitedOn) return null
	return (
		<Toast asks mark="!" title="A newer version is available" list={lines ?? undefined} listLabel="What changed"
			actions={<>
				<Button variant="outline" size="small" onClick={() => setWaitedOn(pathname)}>Wait for later</Button>
				<Button size="small" color="warning" onClick={() => window.location.reload()}>Update</Button>
			</>}>
			Updating reloads the app. What you have saved stays. Text you typed but did not save will be lost.
		</Toast>
	)
}
