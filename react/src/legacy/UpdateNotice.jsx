import { useEffect, useState } from 'react'
import { Button, IconButton } from './Button.jsx'
import { ConfirmDialog } from './ConfirmDialog.jsx'
import { onBuildChanged } from '../api/build.js'

/* Is the server still running the build that served this tab?

   A Docker update replaces the container under whatever is already open. The server then
   answers with new code while a phone left on the home screen goes on running the bundle it
   downloaded days ago, and the gap only widens. routes.jsx already handles the end of that
   story -- a lazy chunk 404s because the file it names is not in the new image, and the page
   reloads itself to recover -- and this is the same problem caught before it breaks anything.

   The key is the commit, and there is only one of it: the image stamps it into the header on
   every API response (api/src/app.js) and into the bundle at build time. api/build.js compares
   the two on traffic the app already makes, so the answer arrives with the next thing the reader
   does, and there is no timer for a background tab's browser to stretch or suspend.

   Unstamped, both are null and nothing is ever claimed. A dev server has no build to be out of
   date -- and two nulls agreeing is not evidence that they match, so the comparison is not even
   attempted rather than being attempted and passing for the wrong reason. */

export function UpdateNoticeProvider({ children }) {
	const [behind, setBehind] = useState(false)
	/* Asked once, the moment it is known. Declining drops to the bar and never re-opens this on
	   its own -- being asked twice about the same build is the nagging the bar exists to avoid. */
	const [asking, setAsking] = useState(true)
	const [dismissed, setDismissed] = useState(false)

	useEffect(() => onBuildChanged(() => setBehind(true)), [])

	return (
		<>
			{children}
			<UpdateNotice behind={behind} asking={asking} setAsking={setAsking}
				dismissed={dismissed} setDismissed={setDismissed} />
		</>
	)
}

function UpdateNotice({ behind, asking, setAsking, dismissed, setDismissed }) {
	if (!behind) return null

	/* Two stages, and the reason for both is the same: the reader may be halfway through an
	   order, and only they know it.

	   The app asks as soon as it knows -- a notice that waits to be noticed is one that gets
	   found a week later -- but it asks, it never reloads by itself. A reload throws away every
	   field typed and not yet saved, so it is exactly the kind of act the app already puts
	   behind a confirmation everywhere else, and it uses the same dialog to do it. Focus lands
	   on NOT NOW for the same reason it lands on CANCEL there: an Enter still in flight from the
	   form underneath must not be the keystroke that discards it.

	   Declining is not dismissing. "Not now" means later, so the question folds down into the
	   bar rather than disappearing -- still true, still reachable, and never asked twice. */
	if (asking) {
		return (
			<ConfirmDialog
				title="An update is available"
				detail="Reload now to use the new version. Anything typed and not saved will be lost."
				confirmLabel="RELOAD" cancelLabel="NOT NOW"
				onConfirm={() => window.location.reload()}
				onCancel={() => setAsking(false)} />
		)
	}

	if (dismissed) return null

	return (
		<div className="update-notice" role="status">
			{/* Short enough to stay on one line at 390px beside both controls -- "A new version of
			    Spendly is ready" wrapped to two, and the app's own name is the one word a notice
			    inside the app does not have to spend room on. */}
			<span className="update-notice-text">An update is available.</span>
			<Button variant="invert" onClick={() => setAsking(true)}>UPDATE</Button>
			<IconButton variant="clear" icon="close" label="Hide this notice"
				onClick={() => setDismissed(true)} />
		</div>
	)
}
