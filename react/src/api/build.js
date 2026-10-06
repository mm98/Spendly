// the commit this bundle was built from (vite.config.js); typeof, since an undeclared name throws
const BUNDLE_COMMIT = typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : null

let notify = null
let behind = null
let writing = 0

// held back while a save is going out: the moment a save was pressed is the worst one to ask in
function announce() {
	if (behind && !writing) notify?.(behind)
}

/** Every API answer names the build that served it (api/src/app.js), so an update of the server is
    noticed on the next request the app makes anyway. Two unstamped builds never count as different. */
export function noteServerBuild(commit) {
	if (BUNDLE_COMMIT && commit && commit !== BUNDLE_COMMIT && commit !== behind) behind = commit
	announce()
}

/** A page's files are gone, so the server runs a newer build than this tab, whatever it stamped. */
export function markBehind() {
	behind ??= 'newer'
	announce()
}

// counted, not flagged: saving a scanned receipt is several writes in a row
export function writeStarted() { writing++ }
export function writeSettled() { writing--; announce() }

/** One listener, told at once if the server is already known to be newer. */
export function onBuildChanged(fn) {
	notify = fn
	announce()
	return () => { if (notify === fn) notify = null }
}
