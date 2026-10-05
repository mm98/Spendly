// Usage: node scripts/check-design.mjs
//
// The design handoff's mechanical rules (design/styles/check.js, CONVERSION-CHECKS.md), held
// against the app's own source. Exits 1 on any finding.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseAst } from 'rolldown/parseAst'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'src')
const read = p => readFileSync(p, 'utf8')
const tokens = read(join(src, 'styles/tokens.css'))
const components = read(join(src, 'styles/components.css'))
// what the app adds to the design's stylesheet: a real window, and what the design states in words only
const app = read(join(src, 'styles/app.css'))
// one layout file per screen, as the handoff's styles/pages/ has; never a component rule
const layoutDir = join(src, 'styles/pages')
const pageCss = (() => { try { return readdirSync(layoutDir).filter(n => n.endsWith('.css')).map(n => join(layoutDir, n)) } catch { return [] } })()
const pages = pageCss.map(p => [p, read(p)])

const findings = []
const seen = new Set()
const fail = (rule, where, detail) => {
	const key = `${rule}|${where}|${detail}`
	if (!seen.has(key)) { seen.add(key); findings.push({ rule, where, detail }) }
}

const walk = dir => readdirSync(dir).flatMap(name => {
	const p = join(dir, name)
	return statSync(p).isDirectory() ? walk(p) : [p]
})

const checked = walk(src).filter(p => /\.(jsx?|mjs)$/.test(p))
const rel = p => relative(root, p)

const parsed = new Map(checked.map(p => [p, parseAst(read(p), { lang: p.endsWith('.jsx') ? 'jsx' : 'js' }, p)]))

const visit = (node, fn, above = []) => {
	if (!node || typeof node !== 'object') return
	if (Array.isArray(node)) return node.forEach(n => visit(n, fn, above))
	if (typeof node.type === 'string') fn(node, above)
	const next = typeof node.type === 'string' ? [...above, node] : above
	for (const [k, v] of Object.entries(node)) if (v && typeof v === 'object') visit(v, fn, next)
}

// a string handed to pick() names a prop or a component, never a class
const stringsIn = node => {
	const out = []
	visit(node, (n, above) => {
		const named = above.at(-1)?.type === 'CallExpression' && above.at(-1).callee.name === 'pick'
		if (n.type === 'Literal' && typeof n.value === 'string' && !named) out.push(n.value)
		if (n.type === 'TemplateElement') out.push(n.value.cooked ?? n.value.raw)
		if (n.type === 'JSXText') out.push(n.value)
	})
	return out
}

/* ---- the design's own stylesheets, copied byte for byte ---- */

for (const name of ['tokens.css', 'components.css'])
	if (read(join(root, '../design/styles', name)) !== read(join(src, 'styles', name)))
		fail('copies of the design', `src/styles/${name}`, `differs from design/styles/${name}: copy it over, and put anything the app adds in app.css`)

/* ---- classes resolve, tokens are defined ---- */

const cssClasses = new Set([...[components, app, ...pages.map(([, css]) => css)].join('\n').matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1]))
const defined = new Set([...(tokens + components).matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))
// set per instance by a component, which is the one place a fallback is legitimate
const HOOKS = ['--swatch', '--p', '--a', '--b']

for (const [name, css] of [['components.css', components], ['app.css', app]])
	for (const m of new Set([...css.matchAll(/var\((--[\w-]+)/g)].map(m => m[1])))
		if (!defined.has(m) && !HOOKS.includes(m)) fail('tokens defined', name, `${m} is not defined`)
for (const m of new Set([...components.matchAll(/var\((--[\w-]+),\s*[^)]+\)/g)].map(m => m[0])))
	if (!HOOKS.some(h => m.startsWith(`var(${h},`))) fail('no var() fallbacks', 'components.css', m)

for (const [p, ast] of parsed) {
	visit(ast, n => {
		if (n.type !== 'JSXAttribute' || n.name?.name !== 'className' || !n.value) return
		const literal = n.value.type === 'Literal'
		for (const s of stringsIn(n.value))
			for (const c of s.split(/\s+/).filter(Boolean))
				if ((literal || c.startsWith('sp-')) && c !== 'sp' && !cssClasses.has(c)) fail('classes resolve', rel(p), `.${c} has no rule in components.css, app.css or a page layout file`)
	})
	// a class chosen from a variant map or join() never sits in a className literal
	for (const s of stringsIn(ast)) {
		const parts = s.trim().split(/\s+/)
		if (parts.length && parts.every(c => /^sp-[\w-]+$/.test(c)))
			for (const c of parts) if (!cssClasses.has(c)) fail('classes resolve', rel(p), `.${c} has no rule in components.css, app.css or a page layout file`)
		for (const v of s.matchAll(/var\((--[\w-]+)/g))
			if (!defined.has(v[1])) fail('tokens defined', rel(p), `${v[1]} is not defined`)
	}
}

/* ---- spacing: only the scale's tokens ----
   Gap, padding and margin are written as tokens. These are the design's own optical nudges,
   frozen by count: a new raw value anywhere is a regression. */
const RAW_SPACING = { '-4px': 4, '1px': 4, '3px': 3, '-2px': 2, '2px': 2, '-12px': 1, '40px': 2 }
{
	const plain = components.replace(/\/\*[\s\S]*?\*\//g, '')
	const found = {}
	for (const m of plain.matchAll(/(?<![\w-])(?:gap|row-gap|column-gap|padding|margin)(?:-[a-z]+)?\s*:\s*([^;}]+)/g))
		// zero is no step on the scale, as the page files' check below already reads it
		for (const px of m[1].matchAll(/(?<![\w.-])-?\d*\.?\d+px/g)) if (parseFloat(px[0])) found[px[0]] = (found[px[0]] ?? 0) + 1
	for (const [px, n] of Object.entries(found))
		if (n > (RAW_SPACING[px] ?? 0)) fail('spacing on the scale', 'components.css', `${n - (RAW_SPACING[px] ?? 0)} new spacing value(s) of ${px}: use a --sp-* token`)
}

/* ---- page layout files: in @layer base, page-prefixed, spacing from tokens only ---- */
for (const [p, css] of pages) {
	const plain = css.replace(/\/\*[\s\S]*?\*\//g, '')
	if (!/^\s*@layer base\s*\{[\s\S]*\}\s*$/.test(plain)) fail('page css in @layer base', rel(p), 'wrap the whole file in @layer base { }')
	for (const m of plain.matchAll(/\.(sp-[\w-]+)\s*[{,]/g)) fail('page css styles no component', rel(p), `.${m[1]} is a component's class`)
	for (const m of plain.matchAll(/(?<![\w-])(?:gap|row-gap|column-gap|padding|margin)(?:-[a-z]+)?\s*:\s*([^;}]+)/g))
		if (/(?<![\w.-])-?\d*\.?[1-9]\d*px/.test(m[1])) fail('spacing on the scale', rel(p), m[0].trim())
	for (const v of plain.matchAll(/var\((--[\w-]+)/g))
		if (!defined.has(v[1])) fail('tokens defined', rel(p), `${v[1]} is not defined`)
}

/* ---- the variant sets, read from the components themselves ---- */

const library = checked.filter(p => p.includes('/src/components/'))
const sets = {} // Component -> prop -> allowed values
for (const p of library) {
	const ast = parsed.get(p)
	const maps = {}
	visit(ast, n => {
		if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init?.type === 'ObjectExpression')
			maps[n.id.name] = n.init.properties.map(pr => pr.key?.name ?? pr.key?.value).filter(k => k !== undefined)
	})
	visit(ast, n => {
		if (n.type !== 'CallExpression' || n.callee.name !== 'pick' || n.arguments.length < 4) return
		const [set, , prop, comp] = n.arguments
		if (set.type !== 'Identifier' || !maps[set.name] || prop.type !== 'Literal' || comp.type !== 'Literal') return
		const into = ((sets[comp.value] ||= {})[prop.value] ||= new Set())
		for (const k of maps[set.name]) into.add(k)
	})
	// a value the component branches on before it reaches pick() is in the set too
	visit(ast, (n, above) => {
		if (n.type !== 'BinaryExpression' || n.operator !== '===' || n.left.type !== 'Identifier' || n.right.type !== 'Literal') return
		const owner = above.findLast(a => a.type === 'FunctionDeclaration')?.id?.name
		sets[owner]?.[n.left.name]?.add(n.right.value)
	})
}

const isLibraryImport = s => /^\.{1,2}\/(\.\.\/)?components\//.test(s)
const pagesDir = join(src, 'pages')
for (const [p, ast] of parsed) {
	const fromLibrary = new Set()
	visit(ast, n => {
		if (n.type !== 'ImportDeclaration') return
		const from = n.source.value
		const inLibrary = p.includes('/src/components/') ? from.startsWith('./') : isLibraryImport(from)
		if (inLibrary) for (const s of n.specifiers) fromLibrary.add(s.local.name)
	})
	visit(ast, n => {
		if (n.type !== 'JSXOpeningElement' || n.name.type !== 'JSXIdentifier') return
		const name = n.name.name
		for (const a of n.attributes) {
			if (a.type !== 'JSXAttribute') continue
			const prop = a.name.name
			if (p.startsWith(pagesDir) && fromLibrary.has(name) && (prop === 'className' || prop === 'style'))
				fail('no styling on a library control', rel(p), `<${name} ${prop}=...>`)
			if (p.startsWith(pagesDir) && prop === 'style')
				fail('no inline style in a page', rel(p), `<${name} style=...>`)
			const allowed = sets[name]?.[prop]
			if (allowed && a.value?.type === 'Literal' && !allowed.has(a.value.value))
				fail('variant values', rel(p), `<${name} ${prop}="${a.value.value}"> is not one of ${[...allowed].join(' | ')}`)
		}
	})
}

/* ---- every component a file draws is one it imports or defines ---- */

for (const [p, ast] of parsed) {
	const known = new Set()
	visit(ast, n => {
		if (n.type === 'ImportSpecifier' || n.type === 'ImportDefaultSpecifier' || n.type === 'ImportNamespaceSpecifier') known.add(n.local.name)
		if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id) known.add(n.id.name)
		if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') known.add(n.id.name)
		if (n.type === 'VariableDeclarator' && n.id.type === 'ObjectPattern')
			for (const prop of n.id.properties) if (prop.value?.type === 'Identifier') known.add(prop.value.name)
		if ((n.type === 'FunctionDeclaration' || n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression'))
			for (const param of n.params) visit(param, m => { if (m.type === 'Identifier') known.add(m.name) })
	})
	visit(ast, n => {
		if (n.type !== 'JSXOpeningElement' || n.name.type !== 'JSXIdentifier') return
		const name = n.name.name
		if (/^[A-Z]/.test(name) && !known.has(name)) fail('components resolve', rel(p), `<${name}> is neither imported nor defined`)
	})
}

/* ---- what the product says ---- */

const TELLS = [/—/, /–/, /[‘’“”]/, /&(mdash|ndash|rsquo|lsquo|ldquo|rdquo);/, /\p{Extended_Pictographic}/u]
const sweep = [...checked, ...pageCss, join(root, 'index.html'), join(src, 'styles/tokens.css'), join(src, 'styles/components.css'), join(src, 'styles/app.css')]
for (const p of sweep) read(p).split('\n').forEach((line, i) => {
	for (const t of TELLS) if (t.test(line)) fail('typographic tells', `${rel(p)}:${i + 1}`, line.trim().slice(0, 90))
})

for (const [p, ast] of parsed) {
	visit(ast, (n, above) => {
		const inMarkup = above.some(a => a.type === 'JSXAttribute' || a.type === 'JSXExpressionContainer')
		const userFacing = n.type === 'JSXText'
			|| (inMarkup && ((n.type === 'Literal' && typeof n.value === 'string') || n.type === 'TemplateElement'))
		if (!userFacing) return
		const text = n.type === 'TemplateElement' ? n.value.cooked ?? '' : n.value
		if (/saved?\b[^.]*%|%[^.]*\bsaved?\b|vs\.? retail|compared to retail/i.test(text))
			fail('a saving is an amount', rel(p), text.trim().slice(0, 90))
		if (/wish ?list/i.test(text)) fail('the product says Bookmarks', rel(p), text.trim().slice(0, 90))
	})
}
{
	const routes = join(src, 'routes.jsx')
	if (parsed.has(routes)) visit(parsed.get(routes), n => {
		if (n.type === 'Property' && (n.key.name === 'path' || n.key.name === 'to') && n.value.type === 'Literal'
			&& /wish/i.test(String(n.value.value)))
			fail('the product says Bookmarks', 'src/routes.jsx', `route "${n.value.value}"`)
	})
}

/* ---- report ---- */

const byRule = {}
for (const f of findings) (byRule[f.rule] ||= []).push(f)
for (const [rule, list] of Object.entries(byRule)) {
	console.log(`\n${rule} (${list.length})`)
	for (const f of list.slice(0, 40)) console.log(`  ${f.where}  ${f.detail}`)
	if (list.length > 40) console.log(`  ... and ${list.length - 40} more`)
}
console.log(`\n${checked.length} files checked, ${findings.length} findings.`)
process.exit(findings.length ? 1 : 0)
