#!/usr/bin/env node
/* Writes src/styles/spendly.css into the <style> block of ../spendly.html.

   The direction used to be the other way round, because the prototype was where the design
   system was built and this was the port. The app is the source now, so the stylesheet here
   is the original and the prototype's <style> block is the copy that follows it.

   A copy is exactly the near-miss the uniformity rule is about: the two agree until the day
   one of them is fixed, and nothing renders the disagreement. So the copy is not maintained
   by hand. `npm run css:sync` rewrites it and `npm run css:check` fails if the two have
   drifted, which is the half that catches a fix landing in one file and not the other.

   The block is found by its two <style> markers rather than by line number: the prototype
   grows, and a hard-coded range would go on succeeding while quietly taking the wrong lines. */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const SOURCE = path.join(here, '..', 'src', 'styles', 'spendly.css')
const TARGET = path.join(here, '..', '..', 'spendly.html')

const css = fs.readFileSync(SOURCE, 'utf8')
const html = fs.readFileSync(TARGET, 'utf8')
const open = html.indexOf('<style>')
const close = html.indexOf('</style>', open)
if (open < 0 || close < 0) {
	console.error('No <style> block in ' + TARGET)
	process.exit(1)
}
const current = html.slice(open + '<style>'.length, close).replace(/^\n/, '')

const check = process.argv.includes('--check')

if (current === css) {
	console.log(`the prototype matches spendly.css (${css.split('\n').length} lines)`)
	process.exit(0)
}

if (check) {
	console.error("the <style> block in ../spendly.html has drifted from src/styles/spendly.css.")
	console.error('Run `npm run css:sync` -- the app is the source, the prototype follows it.')
	process.exit(1)
}

fs.writeFileSync(TARGET, html.slice(0, open + '<style>'.length) + '\n' + css + html.slice(close))
console.log(`the prototype rewritten from spendly.css (${css.split('\n').length} lines)`)
