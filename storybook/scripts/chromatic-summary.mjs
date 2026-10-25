// Where Chromatic's pictures are, as a few lines for the CI run's summary, read from the report its run
// writes (chromatic-diagnostics.json). Run from storybook/ after `npx chromatic --diagnostics-file`.
// CI runs it with --exit-once-uploaded, so the report holds no count of changed pictures yet.

import { readFileSync } from 'node:fs'

let build
try { build = JSON.parse(readFileSync('chromatic-diagnostics.json', 'utf8')).build } catch { build = null }

const lines = ['## Pictures in Chromatic', '']
if (!build?.webUrl) lines.push('Chromatic wrote no result. Its own lines in the step above say why.')
else lines.push(`The pictures are sent. Chromatic compares them and puts its result on this commit. Look at them, and approve or turn them down: ${build.webUrl}`)
console.log(lines.join('\n') + '\n')
