import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Toast } from '../components/Overlays.jsx'
import { onBuildChanged } from '../api/build.js'

/** The server runs a newer version than this tab (Settings 11d's words, in 6d's notice that stays
    until answered). Wait for later hides it until the next page, and it asks again there. */
export function useUpdateNotice() {
	const [newer, setNewer] = useState(null)
	// the page it was put off on; any other page asks again
	const [waitedOn, setWaitedOn] = useState(null)
	const { pathname } = useLocation()
	useEffect(() => onBuildChanged(setNewer), [])
	useEffect(() => { setWaitedOn(was => (was && was !== pathname ? null : was)) }, [pathname])
	if (!newer || waitedOn) return null
	return (
		<Toast asks mark="!" title="A newer version is available"
			actions={<>
				<Button variant="outline" size="small" onClick={() => setWaitedOn(pathname)}>Wait for later</Button>
				<Button size="small" color="warning" onClick={() => window.location.reload()}>Update</Button>
			</>}>
			Updating reloads the app. What you have saved stays. Text you typed but did not save will be lost.
		</Toast>
	)
}
