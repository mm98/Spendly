// Every component file in react/src/components is shown by at least one story, so a new part
// cannot land without one. Run from storybook/: npm run check.

import { readdirSync, readFileSync } from 'node:fs'

const components = new URL('../../react/src/components/', import.meta.url)
const stories = new URL('../stories/', import.meta.url)

const exportsAComponent = text => /^export function [A-Z]/m.test(text)
const shown = readdirSync(stories).filter(f => f.endsWith('.stories.jsx'))
	.map(f => readFileSync(new URL(f, stories), 'utf8')).join('\n')

const missing = readdirSync(components)
	.filter(f => f.endsWith('.jsx') && exportsAComponent(readFileSync(new URL(f, components), 'utf8')))
	.filter(f => !shown.includes(`/react/src/components/${f}'`))

for (const f of missing) console.error(`react/src/components/${f} has no story: add one in storybook/stories/`)
process.exit(missing.length ? 1 : 0)
