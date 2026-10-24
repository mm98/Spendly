// What Chromatic found, as a few lines for the CI run's summary, read from the report its run
// writes (chromatic-diagnostics.json). Run from storybook/ after `npx chromatic --diagnostics-file`.

import { readFileSync } from 'node:fs'

let build
try { build = JSON.parse(readFileSync('chromatic-diagnostics.json', 'utf8')).build } catch { build = null }

const lines = ['## Pictures in Chromatic', '']
if (!build?.webUrl) lines.push('Chromatic wrote no result. Its own lines in the step above say why.')
else {
	const changed = build.changeCount ?? 0, broken = build.errorCount ?? 0
	lines.push(changed || broken
		? `${changed} pictures changed and ${broken} could not be drawn. Look at them, and approve or turn them down: ${build.webUrl}`
		: `No picture changed: ${build.webUrl}`)
}
console.log(lines.join('\n') + '\n')
