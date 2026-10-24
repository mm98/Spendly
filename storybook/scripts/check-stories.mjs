// Every component file in react/src/components is shown by at least one story, so a new part
// cannot land without one, and every story file names the component it is about, so its examples
// get controls and a Docs page. Run from storybook/: npm run check.

import { readdirSync, readFileSync } from 'node:fs'

const components = new URL('../../react/src/components/', import.meta.url)
const stories = new URL('../stories/', import.meta.url)

const exportsAComponent = text => /^export function [A-Z]/m.test(text)
const storyFiles = readdirSync(stories).filter(f => f.endsWith('.stories.jsx'))
const texts = Object.fromEntries(storyFiles.map(f => [f, readFileSync(new URL(f, stories), 'utf8')]))
const shown = Object.values(texts).join('\n')

const missing = readdirSync(components)
	.filter(f => f.endsWith('.jsx') && exportsAComponent(readFileSync(new URL(f, components), 'utf8')))
	.filter(f => !shown.includes(`/react/src/components/${f}'`))
const unnamed = storyFiles.filter(f => !/^export default \{[\s\S]*?^\tcomponent: [A-Z]/m.test(texts[f]))

for (const f of missing) console.error(`react/src/components/${f} has no story: add one in storybook/stories/`)
for (const f of unnamed) console.error(`storybook/stories/${f} names no component: add component to its default export`)
process.exit(missing.length + unnamed.length ? 1 : 0)
