import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/* The whole Tabler outline set, flattened to one path string per icon and cut into shards.

   The app's own 39 glyphs live in src/components/Icon.jsx and are the ones the interface
   draws: a chevron, a receipt, a trash can. This directory is the *catalogue* the category
   picker offers, which is a different job -- 5,129 icons nobody's interface uses more than a
   handful of. It is generated rather than hand-written, since 5,129 icons is nobody's job to
   type out one by one, so it cannot drift from the package it came from.

   Two things are dropped on the way through:

   - Every Tabler icon opens with `<path stroke="none" d="M0 0h24v24H0z" fill="none" />`, a
     transparent 24x24 box that exists to fix the bounds. Stroked like the rest of the icon it
     would draw a square around every glyph.
   - A handful of outline icons carry a filled path as well. Everything here is rendered with
     one stroke and no fill, so those paths are left out and the icon is listed without them --
     the alternative is a per-path fill attribute in every record, for about 1% of the set.

   The rest are joined into a single `d`. They are all subpaths of one stroke with the same
   width, cap and join, so `M… M… M…` draws exactly what the separate elements did -- which is
   the form the 39 built-in glyphs were already in.

   What comes out is one file of names, one of search words and twelve of paths, because the
   three answer different questions and the picker never draws more than a screenful. See
   src/api/tabler.js for the argument; this file only has to keep the split honest.

   Run: npm run icons:sync    (and icons:check, which fails if the directory is out of date) */

const here = path.dirname(fileURLToPath(import.meta.url))
const SOURCE = path.join(here, '..', 'node_modules', '@tabler', 'icons', 'icons', 'outline')
const META = path.join(here, '..', 'node_modules', '@tabler', 'icons', 'icons.json')
const TARGET = path.join(here, '..', 'src', 'api', 'tabler')

const BOUNDS = 'M0 0h24v24H0z'

/* Icons per shard, fixed rather than derived from the count: 5,129 / 12 would renumber every
   boundary the day Tabler ships one more icon, and a shard is only ever fetched whole. 440
   holds the largest of them to about 72 kB of path data -- a seventh of the 500 kB Rollup
   warns at, and small enough that a search matching four letters' worth of icons pulls a
   fraction of the set rather than all of it. */
const PER_SHARD = 440

/* Path data is one long string of numbers, and a minus sign is its own separator: `2 -2` and
   `2-2` are the same two numbers to every SVG parser, so the space before a minus is 32,874
   bytes the catalogue does not have to carry. It is only safe while no number is written in
   exponential form -- `1e -5` would not survive it -- so the build asserts that below rather
   than trusting the package to stay that way. */
const tighten = d => d.replace(/ -/g, '-')

/* Both generated forms are template literals with one record per line, so a diff reads as one
   icon changed rather than one file changed. That holds only while the data cannot close the
   literal or open a substitution in it. */
const SAFE = /^[^`\\\n\r]*$/

/* Tabler ships a keyword list per icon, and it is the half of the search a file name cannot
   carry: "fuel" is not in `gas-station`, and someone looking for a petrol pump types "fuel".
   The words are split on anything that is not a letter or a digit, since a keyword may be a
   phrase ("field glasses") and a few are written as numbers rather than strings. A word that
   is already a part of the icon's own name is left out -- the name search finds it, and 5,129
   copies of "arrow" is the file's size for nothing. */
const keywords = (name, tags) => {
	const own = new Set(name.split('-'))
	const words = []
	for (const tag of tags ?? []) {
		for (const word of String(tag).toLowerCase().split(/[^a-z0-9]+/)) {
			if (!word || /^[0-9]+$/.test(word) || own.has(word) || words.includes(word)) continue
			words.push(word)
		}
	}
	return words.join(' ')
}

const collect = () => {
	const files = fs.readdirSync(SOURCE).filter(f => f.endsWith('.svg')).sort()
	const icons = {}
	let dropped = 0

	for (const file of files) {
		const svg = fs.readFileSync(path.join(SOURCE, file), 'utf8')
		const paths = [...svg.matchAll(/<path\b([^>]*)>/g)]
			.map(m => m[1])
			.filter(attrs => {
				const d = /\bd="([^"]*)"/.exec(attrs)?.[1] ?? ''
				if (!d || d === BOUNDS) return false
				const fill = /\bfill="([^"]*)"/.exec(attrs)?.[1]
				if (fill && fill !== 'none') { dropped++; return false }
				return true
			})
			.map(attrs => /\bd="([^"]*)"/.exec(attrs)[1].trim())

		if (paths.length) icons[file.slice(0, -4)] = tighten(paths.join(' '))
	}

	return { icons, dropped }
}

const build = () => {
	const { icons, dropped } = collect()
	const names = Object.keys(icons)
	const paths = Object.values(icons)

	for (const [i, d] of paths.entries()) {
		if (/[eE]/.test(d)) throw new Error(`${names[i]} writes a number in exponential form; see tighten()`)
		if (!SAFE.test(d) || !SAFE.test(names[i])) throw new Error(`${names[i]} cannot be written into a template literal`)
	}

	const meta = JSON.parse(fs.readFileSync(META, 'utf8'))
	const words = names.map(name => keywords(name, meta[name]?.tags))
	for (const [i, line] of words.entries()) {
		if (!SAFE.test(line)) throw new Error(`${names[i]}'s search words cannot be written into a template literal`)
	}

	const shards = []
	for (let at = 0; at < paths.length; at += PER_SHARD) shards.push(paths.slice(at, at + PER_SHARD))

	const files = new Map()

	files.set('index.js', `/* Generated by scripts/sync-icons.mjs from @tabler/icons. Do not edit.

   The ${names.length} outline icon names, sorted, and one loader per shard of paths. Names and
   paths travel separately and a shard is fetched only when something in it is about to be
   drawn -- see ../tabler.js, which is where the reasoning lives. */

export const NAMES = \`${names.join('\n')}\`.split('\\n')

/** Icons per shard. The names are sorted and the shards were cut along that order, so an
    icon's shard is its position in NAMES divided by this -- the picker needs no index. */
export const PER_SHARD = ${PER_SHARD}

/** One dynamic import each, so the bundler gives each shard a chunk of its own. */
export const SHARDS = [
${shards.map((_, i) => `\t() => import('./paths-${i}.js')`).join(',\n')}
]
`)

	files.set('tags.js', `/* Generated by scripts/sync-icons.mjs from @tabler/icons. Do not edit.
   Search words for each of the ${names.length} icons, in NAMES order -- see ../tabler.js. */

export default \`${words.join('\n')}\`.split('\\n')
`)

	shards.forEach((shard, i) => {
		const from = i * PER_SHARD
		files.set(`paths-${i}.js`, `/* Generated by scripts/sync-icons.mjs from @tabler/icons. Do not edit.

   Icons ${from}–${from + shard.length - 1} of ${names.length}, in NAMES order: this array is read by
   position, not by name, so nothing here may be reordered independently of ../tabler/index.js. */

export default \`${shard.join('\n')}\`.split('\\n')
`)
	})

	return { files, dropped, count: names.length, shards: shards.length }
}

const built = build()
const check = process.argv.includes('--check')

const current = new Map()
if (fs.existsSync(TARGET)) {
	for (const name of fs.readdirSync(TARGET).sort()) {
		current.set(name, fs.readFileSync(path.join(TARGET, name), 'utf8'))
	}
}

/* A file the generator no longer writes is as much of a drift as one it writes differently --
   a shard left behind by a smaller icon set still resolves, and still draws the wrong glyph. */
const stale = [...current.keys()].filter(name => !built.files.has(name))
const changed = [...built.files].filter(([name, text]) => current.get(name) !== text).map(([name]) => name)

if (check) {
	if (!stale.length && !changed.length) {
		console.log(`src/api/tabler matches @tabler/icons (${built.count} icons in ${built.shards} shards)`)
		process.exit(0)
	}
	console.error('src/api/tabler is out of date. Run: npm run icons:sync')
	for (const name of changed) console.error(`  differs: ${name}`)
	for (const name of stale) console.error(`  no longer generated: ${name}`)
	process.exit(1)
}

fs.mkdirSync(TARGET, { recursive: true })
for (const name of stale) fs.unlinkSync(path.join(TARGET, name))
for (const [name, text] of built.files) fs.writeFileSync(path.join(TARGET, name), text)

const bytes = [...built.files.values()].reduce((sum, text) => sum + Buffer.byteLength(text), 0)
console.log(`src/api/tabler written: ${built.count} icons, ${built.shards} shards, `
	+ `${built.dropped} filled paths dropped, ${(bytes / 1024).toFixed(0)} kB`
	+ (stale.length ? `, ${stale.length} stale file(s) removed` : ''))
