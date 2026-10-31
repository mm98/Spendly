// The app loads its word files through Vite's import.meta.glob, which the converter's bundle has no
// way to fill, so every component fails on load. This writes a copy of react/src/language/phrases.js
// to .cache/ with both files imported directly, Danish filled from English as languageFiles in
// react/vite.config.js does, and English in place before the first draw.
// bundle-tsconfig.json points '../language/phrases.js' at it.
// Run before every build: node .design-sync/tools/phrases-for-bundle.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = join(here, '../../react/src/language/phrases.js')
const out = join(here, '../.cache/phrases.js')
const glob = "const files = import.meta.glob('./*.json', { import: 'default' })"
const start = 'let active = { code: null, phrases: {} }'
let code = readFileSync(source, 'utf8')
for (const line of [glob, start])
	if (!code.includes(line)) throw new Error(`phrases-for-bundle: "${line}" is no longer in ${source}; update this tool`)
code = code
	.replace(glob, [
		"import english from '../../react/src/language/en.json'",
		"import danish from '../../react/src/language/da.json'",
		"const files = { './en.json': async () => english, './da.json': async () => ({ ...english, ...danish }) }"
	].join('\n'))
	.replace(start, "let active = { code: 'en', phrases: english }")
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, code)
console.log(`wrote ${out}`)
