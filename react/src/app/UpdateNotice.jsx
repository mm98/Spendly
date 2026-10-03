import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Toast } from '../components/Overlays.jsx'
import { BUNDLE_BUILT, onBuildChanged } from '../api/build.js'
import { getVersionChanges } from '../api/client.js'

/** The server runs a newer version than this tab (Settings 11d's words, in 6d's notice that stays
    until answered). Wait for later hides it until the next page, and it asks again there. */
export function useUpdateNotice() {
	const [newer, setNewer] = useState(null)
	// the page it was put off on; any other page asks again
	const [waitedOn, setWaitedOn] = useState(null)
	const { pathname } = useLocation()
	useEffect(() => onBuildChanged(setNewer), [])
	// what changed since this tab's build, asked once per newer version; none drawn when unknown (6d)
	const [changes, setChanges] = useState([])
	useEffect(() => {
		if (!newer || !BUNDLE_BUILT) return
		const asking = new AbortController()
		getVersionChanges(BUNDLE_BUILT, asking.signal).then(setChanges, () => setChanges([]))
		return () => asking.abort()
	}, [newer])
	useEffect(() => { setWaitedOn(was => (was && was !== pathname ? null : was)) }, [pathname])
	if (!newer || waitedOn) return null
	return (
		<Toast asks mark="!" title="A newer version is available" list={changes} listLabel="What changed"
			actions={<>
				<Button variant="outline" size="small" onClick={() => setWaitedOn(pathname)}>Wait for later</Button>
				<Button size="small" color="warning" onClick={() => window.location.reload()}>Update</Button>
			</>}>
			Updating reloads the app. What you have saved stays. Text you typed but did not save will be lost.
		</Toast>
	)
}
