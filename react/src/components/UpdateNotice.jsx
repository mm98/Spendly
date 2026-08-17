import { useEffect, useRef, useState } from 'react'
import { Button, IconButton } from './Button.jsx'
import { getVersion } from '../api/client.js'

/* Is the server still running the build that served this tab?

   A Docker update replaces the container under whatever is already open. The server then
   answers with new code while a phone left on the home screen goes on running the bundle it
   downloaded days ago, and the gap only widens. routes.jsx already handles the end of that
   story -- a lazy chunk 404s because the file it names is not in the new image, and the page
   reloads itself to recover -- and this is the same problem caught before it breaks anything,
   by asking rather than by failing.

   The key is the commit, and there is only one of it: the image stamps it into /api/version
   (what the server is running now) and into the bundle at build time (what this tab is running).
   Both come from one build, so a difference between them means exactly one thing.

   Unstamped, both are null and nothing is ever claimed. A dev server has no build to be out of
   date -- and two nulls agreeing is not evidence that they match, so the comparison is not even
   attempted rather than being attempted and passing for the wrong reason. */

/* `typeof` rather than the bare name, and it is not superstition: vite.config.js supplies this
   two different ways -- a literal substituted into the build, a real global injected by the dev
   server -- and both were verified, but a bare identifier with neither in place is a
   ReferenceError, not an undefined. The Shell imports this module, so that error would take
   every page down rather than this bar, which is the shape of a defect this repository has
   already shipped once. `typeof` is the one operator that does not throw on an undeclared name,
   so the worst case degrades to what an unstamped build already does: never prompt. */
const BUNDLE_COMMIT = typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : null

const EVERY_MS = 15 * 60 * 1000

/* Coming back to the app is the moment worth asking at -- a phone reopened after a week is the
   case this exists for, and it can arrive long before the next interval. But a flick to another
   app and back fires the same event, so an answer this recent is reused rather than re-fetched. */
const QUIET_MS = 60 * 1000

export function UpdateNotice() {
	const [behind, setBehind] = useState(false)
	const [dismissed, setDismissed] = useState(false)
	const lastAsked = useRef(0)

	useEffect(() => {
		/* Nothing to compare, or the answer is already known: either way there is no question
		   left, and polling on would be one request per interval for a value that cannot change
		   back. A container that went backwards is a rollback, and a reload is still the fix. */
		if (!BUNDLE_COMMIT || behind) return
		let live = true

		const ask = () => {
			if (!live || document.hidden) return
			if (Date.now() - lastAsked.current < QUIET_MS) return
			lastAsked.current = Date.now()
			getVersion()
				.then(v => { if (live && v?.commit && v.commit !== BUNDLE_COMMIT) setBehind(true) })
				/* A background check nobody asked for does not get to report its own failure.
				   The server being briefly unreachable is exactly what a restart looks like from
				   here, and the next ask is a quarter of an hour away. */
				.catch(() => {})
		}

		const timer = setInterval(ask, EVERY_MS)
		document.addEventListener('visibilitychange', ask)
		return () => {
			live = false
			clearInterval(timer)
			document.removeEventListener('visibilitychange', ask)
		}
	}, [behind])

	if (!behind || dismissed) return null

	/* Never a reload of its own accord. The update is not urgent enough to be worth throwing
	   away a half-typed order for, and the reader is the only one who knows whether they are in
	   the middle of one -- so this offers, and dismissing leaves the old build running until
	   they reload on their own terms. README: Honest Affordances, Chrome. */
	return (
		<div className="update-notice" role="status">
			{/* Short enough to stay on one line at 390px beside both controls -- "A new version of
			    Spendly is ready" wrapped to two, and the app's own name is the one word a notice
			    inside the app does not have to spend room on. */}
			<span className="update-notice-text">A new version is ready.</span>
			<Button variant="invert" onClick={() => window.location.reload()}>UPDATE</Button>
			<IconButton variant="clear" icon="close" label="Dismiss until next time"
				onClick={() => setDismissed(true)} />
		</div>
	)
}
