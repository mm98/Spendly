import { useEffect, useState } from 'react'
import { COMMON, PARTS } from './tabler/parts.js'

/* The Tabler library a category's icon comes from (c7), beside the register in icons.js.
   A part loads once, when an icon in it is first drawn, and stays for the life of the page. */

export { COMMON }

const partOf = name => (COMMON.includes(name) ? 'common' : /^[0-9]/.test(name) ? '0' : name[0])

const loaded = new Map()
const pending = new Map()

function loadPart(key) {
	if (!PARTS[key]) return Promise.resolve(new Map())
	if (!pending.has(key)) {
		pending.set(key, PARTS[key]().then(module => {
			const paths = new Map(module.default.map(line => line.split('\t')))
			loaded.set(key, paths)
			return paths
		}))
	}
	return pending.get(key)
}

/** The path data for an icon already loaded: a string, null when Tabler has no such icon, undefined while unknown. */
export function pathOf(name) {
	const part = loaded.get(partOf(String(name)))
	return part ? part.get(name) ?? null : undefined
}

export const loadIcon = name => loadPart(partOf(String(name))).then(() => pathOf(name))

/** The path data for `name`, re-rendering when its part arrives. */
export function useTablerPath(name) {
	const [, arrived] = useState(0)
	const known = pathOf(name)
	useEffect(() => {
		if (known !== undefined) return
		let live = true
		loadIcon(name).then(() => { if (live) arrived(n => n + 1) })
		return () => { live = false }
	}, [name, known])
	return known
}

/** Re-renders as the parts holding `names` arrive; the caller reads each with pathOf. */
export function useTablerPaths(names) {
	const [, arrived] = useState(0)
	const keys = [...new Set(names.map(name => partOf(String(name))))].filter(key => !loaded.has(key)).join(' ')
	useEffect(() => {
		if (!keys) return
		let live = true
		keys.split(' ').forEach(key => loadPart(key).then(() => { if (live) arrived(n => n + 1) }))
		return () => { live = false }
	}, [keys])
}

let index = null
/** Every icon's name, category and search words, loaded when the picker opens. */
export const loadIndex = () => (index ??= import('./tabler/index.js').then(module => module.default.map(line => {
	const [name, category, words] = line.split('\t')
	return { name, category, words: words ? words.split(' ') : [] }
})))

/** The icons matching `needle`, best first: names, then tags, then categories (c7). */
export function searchIcons(entries, needle) {
	const tokens = needle.toLowerCase().trim().split(/[\s-]+/).filter(Boolean)
	if (!tokens.length) return []
	const joined = tokens.join('-')
	const scored = []
	for (const entry of entries) {
		const parts = entry.name.split('-')
		const score = entry.name === joined ? 0
			: entry.name.startsWith(joined) ? 1
			: tokens.every(t => parts.some(p => p.startsWith(t))) ? 2
			: tokens.every(t => parts.some(p => p.startsWith(t)) || entry.words.some(w => w.startsWith(t))) ? 3
			: tokens.every(t => parts.some(p => p.startsWith(t)) || entry.words.some(w => w.startsWith(t)) || entry.category.split(' ').some(w => w.startsWith(t))) ? 4
			: null
		if (score === null) continue
		// among tag matches, an icon whose tags list the word earlier ranks first
		const at = score === 3 ? Math.min(...tokens.map(t => entry.words.findIndex(w => w.startsWith(t))).filter(i => i >= 0), 99) : 0
		scored.push([score + at / 100, entry.name])
	}
	return scored.sort((a, b) => a[0] - b[0] || a[1].length - b[1].length || a[1].localeCompare(b[1])).map(([, name]) => name)
}
