#!/usr/bin/env node
/* Keeps src/styles/spendly.css identical to the <style> block in ../spendly.html.

   The stylesheet here is a copy, and a copy is exactly the near-miss the uniformity rule is
   about: the two agree until the day one of them is fixed, and nothing renders the
   disagreement. So the copy is not maintained by hand. `npm run css:sync` re-extracts it and
   `npm run css:check` fails if the two have drifted, which is the half that can catch a fix
   landing in one file and not the other.

   Extraction is by the two <style> markers rather than by line number: the prototype grows,
   and a hard-coded range would go on succeeding while quietly taking the wrong lines. */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const SOURCE = path.join(here, '..', '..', 'spendly.html')
const TARGET = path.join(here, '..', 'src', 'styles', 'spendly.css')

const html = fs.readFileSync(SOURCE, 'utf8')
const open = html.indexOf('<style>')
const close = html.indexOf('</style>', open)
if (open < 0 || close < 0) {
	console.error('No <style> block in ' + SOURCE)
	process.exit(1)
}
const css = html.slice(open + '<style>'.length, close).replace(/^\n/, '')

const check = process.argv.includes('--check')
const current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, 'utf8') : null

if (current === css) {
	console.log(`spendly.css matches the prototype (${css.split('\n').length} lines)`)
	process.exit(0)
}

if (check) {
	console.error('spendly.css has drifted from the <style> block in ../spendly.html.')
	console.error('Run `npm run css:sync` -- and check that the change belongs in both files.')
	process.exit(1)
}

fs.writeFileSync(TARGET, css)
console.log(`spendly.css rewritten from the prototype (${css.split('\n').length} lines)`)
