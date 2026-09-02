import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Button, IconButton } from './Button.jsx'
import { ConfirmDialog } from './ConfirmDialog.jsx'
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

const EVERY_MS = 5 * 60 * 1000

/* Coming back to the app is the moment worth asking at -- a phone reopened after a week is the
   case this exists for, and it can arrive long before the next interval. But a flick to another
   app and back fires the same event, so an answer this recent is reused rather than re-fetched. */
const QUIET_MS = 60 * 1000

/* The bar and the registry check in Settings answer different questions -- one server has
   updated, the other has not -- so a reader who presses CHECK FOR UPDATES and hears "you have
   the newest version" has only heard about the server. This tab could still be running
   whatever it loaded days ago. `useUpdateCheck` is how that button also asks the tab's own
   question, on demand, instead of waiting for the next five-minute poll. */
const UpdateCheckContext = createContext(() => Promise.resolve(false))

/** Runs the same tab-vs-server comparison the background poll runs, right now. Resolves
    `true` when it opened the reload prompt, `false` otherwise -- including when there is
    nothing to compare, so a caller can tell "current" from "unknown" if it ever needs to. */
export const useUpdateCheck = () => useContext(UpdateCheckContext)

export function UpdateNoticeProvider({ children }) {
	const [behind, setBehind] = useState(false)
	/* Asked once, the moment it is known. Declining drops to the bar and never re-opens this on
	   its own -- being asked twice about the same build is the nagging the bar exists to avoid. */
	const [asking, setAsking] = useState(true)
	const [dismissed, setDismissed] = useState(false)
	const lastAsked = useRef(0)

	const ask = useCallback(() => {
		if (!BUNDLE_COMMIT || document.hidden) return Promise.resolve(false)
		lastAsked.current = Date.now()
		return getVersion()
			.then(v => {
				if (!v?.commit || v.commit === BUNDLE_COMMIT) return false
				setBehind(true)
				setAsking(true)
				return true
			})
			/* A background check nobody asked for does not get to report its own failure.
			   The server being briefly unreachable is exactly what a restart looks like from
			   here, and the next ask is a quarter of an hour away. */
			.catch(() => false)
	}, [])

	/* A press of CHECK FOR UPDATES is a question asked on purpose, so it skips the quiet
	   window the background poll uses to avoid hammering the server on every tab-switch --
	   that throttle is for polling nobody asked for, not for a button someone just pressed. */
	const checkNow = useCallback(() => ask(), [ask])

	useEffect(() => {
		/* Nothing to compare, or the answer is already known: either way there is no question
		   left, and polling on would be one request per interval for a value that cannot change
		   back. A container that went backwards is a rollback, and a reload is still the fix. */
		if (!BUNDLE_COMMIT || behind) return
		let live = true

		const poll = () => {
			if (!live) return
			if (Date.now() - lastAsked.current < QUIET_MS) return
			ask()
		}

		const timer = setInterval(poll, EVERY_MS)
		document.addEventListener('visibilitychange', poll)
		return () => {
			live = false
			clearInterval(timer)
			document.removeEventListener('visibilitychange', poll)
		}
	}, [behind, ask])

	return (
		<UpdateCheckContext.Provider value={checkNow}>
			{children}
			<UpdateNotice behind={behind} asking={asking} setAsking={setAsking}
				dismissed={dismissed} setDismissed={setDismissed} />
		</UpdateCheckContext.Provider>
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
