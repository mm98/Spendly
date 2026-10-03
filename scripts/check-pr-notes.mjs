// A pull request says what it changes for the person using the app, in its own section, so the
// update notice can show it (api/src/lib/prNotes.js). Reads the body from the pull_request event.
import { readFileSync } from 'node:fs'
import { MAX_NOTES, NOTES_HEADING, notesOf } from '../api/src/lib/prNotes.js'

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
const notes = notesOf(event.pull_request?.body)
if (notes === null) {
	console.error(`The pull request has no "## ${NOTES_HEADING}" section. Add it, with up to ${MAX_NOTES} lines in plain words, or leave it empty when nothing changes for the person using the app.`)
	process.exit(1)
}
if (notes.length > MAX_NOTES) {
	console.error(`"## ${NOTES_HEADING}" has ${notes.length} lines; the update notice shows at most ${MAX_NOTES}.`)
	process.exit(1)
}
console.log(notes.length ? `${notes.length} line(s) for the update notice:\n${notes.map(n => `  - ${n}`).join('\n')}` : 'Nothing changes for the person using the app.')
