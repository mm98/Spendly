// Usage: node scripts/check-language-files.mjs
//
// The language files in src/language against each other and against the code. Every file holds the
// same keys as en.json, and in each phrase only the places English has. A folder in TEXT_FREE holds
// no words of its own: no text between tags, and no written words in a name, tip or hint attribute
// or a default prop.
// Every phrase parses, every key the code names is in en.json, and every key in en.json is named in
// the code. Exits 1 on any finding.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TYPE, parse } from '@formatjs/icu-messageformat-parser'
import { parseAst } from 'rolldown/parseAst'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'src')
const folder = join(src, 'language')
// the folders whose every word comes from the language files; a folder joins once its words have moved
const TEXT_FREE = ['components']
// a name, not a word to translate
const NAMES = new Set(['Spendly'])
const findings = []
const fail = (where, detail) => findings.push(`${where}: ${detail}`)

// the names of the places a phrase takes values into, at any depth
const placesOf = elements => elements.flatMap(e => {
	const inner = e.options ? Object.values(e.options).flatMap(o => placesOf(o.value)) : e.children ? placesOf(e.children) : []
	return e.type === TYPE.argument || e.type === TYPE.plural || e.type === TYPE.select || e.type === TYPE.number || e.type === TYPE.date || e.type === TYPE.tag
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

// what a reader would read: a word of two letters or more, never a name from NAMES
const words = text => /[A-Za-z]{2,}/.test(text) && !NAMES.has(text.trim())
// two words or more starting with a capital, or words ending a sentence
const sentence = text => /^[A-Z][a-z']*[ ,][A-Za-z]/.test(text) || /[a-z]{2}[.…?!]$/.test(text)
const ATTRIBUTES = /^(aria-label|title|placeholder|alt|data-tip|label)$/
const visit = (node, at) => {
	if (!node || typeof node !== 'object') return
	if (Array.isArray(node)) return node.forEach(n => visit(n, at))
	if (node.type === 'JSXText' && words(node.value)) at(node, node.value.trim())
	if (node.type === 'JSXAttribute' && ATTRIBUTES.test(node.name?.name ?? '')) {
		const strings = []
		const collect = n => {
			if (!n || typeof n !== 'object') return
			if (Array.isArray(n)) return n.forEach(collect)
			// a call, a key looked up or a value compared is code, not words on screen
			if (n.type === 'CallExpression' || n.type === 'BinaryExpression') return
			if (n.type === 'MemberExpression') return collect(n.object)
			if (n.type === 'Literal' && typeof n.value === 'string' && words(n.value)) strings.push(n.value)
			if (n.type === 'TemplateLiteral' && n.quasis.some(q => words(q.value.cooked))) strings.push(n.quasis.map(q => q.value.cooked).join('…'))
			for (const k in n) if (k !== 'type' && typeof n[k] === 'object') collect(n[k])
		}
		collect(node.value)
		for (const text of strings) at(node, text)
	}
	// a default prop written in words: `kind = 'Photo'`
	if (node.type === 'AssignmentPattern' && node.right?.type === 'Literal' && typeof node.right.value === 'string' && /^[A-Z][a-z]/.test(node.right.value) && words(node.right.value)) at(node, node.right.value)
	// a sentence anywhere else: a message kept in a constant, a toast, a fallback
	else if (node.type === 'Literal' && typeof node.value === 'string' && sentence(node.value)) at(node, node.value)
	else if (node.type === 'TemplateLiteral' && node.quasis.some(q => sentence(q.value.cooked))) at(node, node.quasis.map(q => q.value.cooked).join('…'))
	if (node.type === 'JSXAttribute' || node.type === 'TemplateLiteral') return
	// a message for a developer, in the console or in an error the code throws
	if (node.type === 'CallExpression' && node.callee?.object?.name === 'console') return
	if ((node.type === 'NewExpression' || node.type === 'CallExpression') && /Error$/.test(node.callee?.name ?? '')) return
	for (const k in node) {
		// where a module comes from, and the name of a key, are code
		if (k === 'type' || k === 'source' || (k === 'key' && node.type === 'Property' && !node.computed)) continue
		if (typeof node[k] === 'object') visit(node[k], at)
	}
}
for (const folder of TEXT_FREE) {
	for (const [p, text] of code.filter(([p]) => p.startsWith(join(src, folder) + '/'))) {
		let ast
		try { ast = parseAst(text, { lang: 'jsx' }) } catch (e) { fail(relative(root, p), `does not parse: ${e.message}`); continue }
		const lineOf = offset => text.slice(0, offset).split('\n').length
		visit(ast, (node, words) => fail(`${relative(root, p)}:${lineOf(node.start)}`, `"${words}" is written in the code, not in the language files`))
	}
}

if (findings.length) {
	for (const f of findings) console.error(f)
	console.error(`\n${findings.length} finding${findings.length === 1 ? '' : 's'}`)
	process.exit(1)
}
console.log(`language files: ${Object.keys(files).length} files, ${Object.keys(english).length} phrases, no findings`)
