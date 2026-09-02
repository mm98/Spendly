/* The commit this bundle was built from, against the one the server reports. `typeof` because
   an undeclared name throws where an undefined one only reads as null -- vite.config.js bakes it in. */
const BUNDLE_COMMIT = typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : null

let notify = null
let behind = false
let writing = 0

/* Held back while a write is in flight: what it opens is a modal over whatever the reader was
   doing, and the moment they pressed save is the worst one to put a RELOAD button under a cursor. */
function announce() {
	if (behind && !writing) notify?.()
}

/* Every API response names the build that served it (api/src/app.js), so a replaced container
   is caught on the next request the app already makes rather than on a timer a browser throttles. */
export function noteServerBuild(commit) {
	if (!behind && BUNDLE_COMMIT && commit && commit !== BUNDLE_COMMIT) behind = true
	announce()
	return behind
}

/* Counted rather than flagged: saving a scanned receipt is several writes in a row, and the
   answer to the first must not raise the prompt while the rest are still going out. */
export function writeStarted() { writing++ }
export function writeSettled() { writing--; announce() }

/* One listener, told immediately if the mismatch is already known: the bar it opens stays until
   the reader reloads, so a provider mounting after the fact still has to hear about it. */
export function onBuildChanged(fn) {
	notify = fn
	announce()
	return () => { if (notify === fn) notify = null }
}
