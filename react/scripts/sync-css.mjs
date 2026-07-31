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
   grows, and a hard-coded range would go on succeeding while quietly taking the wrong lines.

   One exception: @font-face. The app serves the three Poppins faces as static files under
   public/fonts/ so they load in parallel instead of inline as 43.8% of a blocking stylesheet.
   spendly.html's own rule is no external asset in the single file, and a same-origin file is
   still external to it, so the prototype keeps the faces embedded as base64. prototype-fonts.css
   holds those three lines verbatim; every other line syncs byte-for-byte as before. */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const SOURCE = path.join(here, '..', 'src', 'styles', 'spendly.css')
const TARGET = path.join(here, '..', '..', 'spendly.html')
const PROTOTYPE_FONTS = path.join(here, 'prototype-fonts.css')

const appCss = fs.readFileSync(SOURCE, 'utf8')
const prototypeFontLines = fs.readFileSync(PROTOTYPE_FONTS, 'utf8').replace(/\n$/, '').split('\n')
const html = fs.readFileSync(TARGET, 'utf8')

let fontLineIndex = 0
const css = appCss
	.split('\n')
	.map(line => {
		if (!line.startsWith('@font-face')) return line
		if (fontLineIndex >= prototypeFontLines.length) {
			throw new Error(`more @font-face lines in ${SOURCE} than in ${PROTOTYPE_FONTS}`)
		}
		return prototypeFontLines[fontLineIndex++]
	})
	.join('\n')
if (fontLineIndex !== prototypeFontLines.length) {
	throw new Error(`${PROTOTYPE_FONTS} has ${prototypeFontLines.length} lines, ${SOURCE} has ${fontLineIndex} @font-face lines -- they must match 1:1`)
}
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
