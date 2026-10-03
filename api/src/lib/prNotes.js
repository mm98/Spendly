/* What a merged pull request changed for the person using the app: the lines under its
   "## What changed for you" heading, up to the next heading. The update notice shows them. */
export const NOTES_HEADING = 'What changed for you'
export const MAX_NOTES = 3

/** The section's bullet lines, or null when the body has no such section. */
export function notesOf(body) {
	const lines = String(body ?? '').split(/\r?\n/)
	const start = lines.findIndex(l => new RegExp(`^##\\s+${NOTES_HEADING}\\s*$`, 'i').test(l.trim()))
	if (start < 0) return null
	const out = []
	for (const line of lines.slice(start + 1)) {
		if (/^#/.test(line.trim())) break
		const item = line.match(/^\s*[-*]\s+(.*\S)\s*$/)?.[1]
		if (item) out.push(item)
	}
	return out
}
