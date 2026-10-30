// Usage: node scripts/check-language-files.mjs
//
// The language files in src/language against each other and against the code. Every file holds the
// same keys as en.json, and in each phrase only the places English has.
// Every phrase parses, every key the code names is in en.json, and every key in en.json is named in
// the code. Exits 1 on any finding.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TYPE, parse } from '@formatjs/icu-messageformat-parser'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'src')
const folder = join(src, 'language')
const findings = []
const fail = (where, detail) => findings.push(`${where}: ${detail}`)

// the names of the places a phrase takes values into, at any depth
const placesOf = elements => elements.flatMap(e => {
	const inner = e.options ? Object.values(e.options).flatMap(o => placesOf(o.value)) : []
	return e.type === TYPE.argument || e.type === TYPE.plural || e.type === TYPE.select || e.type === TYPE.number || e.type === TYPE.date
		? [e.value, ...inner] : inner
})

const files = Object.fromEntries(readdirSync(folder).filter(n => n.endsWith('.json')).map(n => [n, JSON.parse(readFileSync(join(folder, n), 'utf8'))]))
const english = files['en.json']
const placesIn = (name, key, message) => {
	try { return new Set(placesOf(parse(message))) } catch (e) { fail(name, `${key} does not parse: ${e.message}`); return null }
}
const places = Object.fromEntries(Object.entries(english).map(([key, message]) => [key, placesIn('en.json', key, message)]))
for (const [name, phrases] of Object.entries(files)) {
	if (name === 'en.json') continue
	for (const key of Object.keys(english)) if (!(key in phrases)) fail(name, `${key} is missing`)
	for (const [key, message] of Object.entries(phrases)) {
		if (!(key in english)) { fail(name, `${key} is not in en.json`); continue }
		const found = placesIn(name, key, message)
		for (const place of found ?? []) if (places[key] && !places[key].has(place)) fail(name, `${key} has a place {${place}} English does not`)
	}
}

const walk = dir => readdirSync(dir).flatMap(n => {
	const p = join(dir, n)
	return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(n) ? [p] : []
})
const code = walk(src).filter(p => !p.includes('/components/tabler/')).map(p => [p, readFileSync(p, 'utf8')])
const named = new Set()
for (const [p, text] of code) {
	for (const [, key] of text.matchAll(/phrase\('([^']+)'/g)) {
		named.add(key)
		if (!(key in english)) fail(relative(root, p), `phrase('${key}') is not in en.json`)
	}
}
// a key the code holds in a list, rather than passing straight to phrase(), is named as a string
const all = code.map(([, text]) => text).join('\n')
for (const key of Object.keys(english)) if (!named.has(key) && !all.includes(`'${key}'`)) fail('en.json', `${key} is not used anywhere`)

if (findings.length) {
	for (const f of findings) console.error(f)
	console.error(`\n${findings.length} finding${findings.length === 1 ? '' : 's'}`)
	process.exit(1)
}
console.log(`language files: ${Object.keys(files).length} files, ${Object.keys(english).length} phrases, no findings`)
