// for each component prop typed as a drawn part: every value the app passes it, by kind
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { parseAst } from 'rolldown/parseAst'
const walk = d => readdirSync(d).flatMap(n => statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)])
const visit = (n, fn) => { if (!n || typeof n !== 'object') return; if (n.type) fn(n); for (const k in n) { const v = n[k]; Array.isArray(v) ? v.forEach(x => visit(x, fn)) : (v && typeof v === 'object' && visit(v, fn)) } }
// the props typed as parts
const parts = {}
for (const p of walk('src/components').filter(p => p.endsWith('.jsx'))) {
	const src = readFileSync(p, 'utf8')
	for (const m of src.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*?)\*\/\s*export function (\w+)/g))
		for (const q of m[1].matchAll(/@param \{([^\n]*React(?:Node|Element)[^\n]*)\}\s+\[?props\.(\w+)/g)) (parts[m[2]] ||= {})[q[2]] = { file: basename(p), type: q[1], seen: [] }
}
const kind = (src, v) => {
	if (!v) return 'true'
	if (v.type === 'Literal') return 'text'
	const e = v.type === 'JSXExpressionContainer' ? v.expression : v
	const t = src.slice(e.start, e.end).replace(/\s+/g, ' ')
	if (e.type === 'Literal' || e.type === 'TemplateLiteral') return 'text'
	if (e.type === 'JSXElement') return '<' + src.slice(e.openingElement.name.start, e.openingElement.name.end) + '> ' + t.slice(0, 60)
	if (e.type === 'JSXFragment') return 'fragment ' + t.slice(0, 60)
	return 'expr ' + t.slice(0, 70)
}
for (const p of [...walk('src'), ...walk('../storybook/stories')].filter(p => p.endsWith('.jsx'))) {
	const src = readFileSync(p, 'utf8')
	visit(parseAst(src, { lang: 'jsx' }, p), n => {
		if (n.type !== 'JSXElement') return
		const name = n.openingElement.name.name, own = parts[name]
		if (!own) return
		const where = p.replace(/^.*\/(src|stories)\//, '$1/')
		for (const a of n.openingElement.attributes) if (a.name && own[a.name.name]) own[a.name.name].seen.push(where + '  ' + kind(src, a.value))
		if (own.children && n.children.some(c => c.type !== 'JSXText' || c.value.trim())) {
			const kids = n.children.filter(c => c.type !== 'JSXText' || c.value.trim())
			own.children.seen.push(where + '  ' + (kids.every(c => c.type === 'JSXText') ? 'text' : kids.map(c => c.type === 'JSXText' ? 'text' : kind(src, c)).join(' + ').slice(0, 90)))
		}
	})
}
writeFileSync('/tmp/claude-0/desc/survey.json', JSON.stringify(parts, null, 1))
let n = 0; for (const c in parts) for (const q in parts[c]) n++
console.log(n, 'props')
