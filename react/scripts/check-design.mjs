// Usage: node scripts/check-design.mjs
//
// The design handoff's mechanical rules (design/styles/check.js, CONVERSION-CHECKS.md), held
// against the app's own source. Exits 1 on any finding.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname, resolve, sep } from 'node:path'
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

const parsed = new Map(checked.map(p => [p, parseAst(read(p), { lang: p.endsWith('.jsx') || p.includes(`${sep}components${sep}`) ? 'jsx' : 'js' }, p)]))

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

for (const name of ['tokens.css', 'components.css', 'schemes.css'])
	if (read(join(root, '../design/styles', name)) !== read(join(src, 'styles', name)))
		fail('copies of the design', `src/styles/${name}`, `differs from design/styles/${name}: copy it over, and put anything the app adds in app.css`)

// the server colours its emails from the same schemes and tokens the app draws
for (const name of ['schemes.css', 'tokens.css'])
	if (read(join(root, '../design/styles', name)) !== read(join(root, '../api/src/styles', name)))
		fail('copies of the design', `api/src/styles/${name}`, `differs from design/styles/${name}: copy it over`)

// the server sends the design's emails as they are, so its copies match file for file
// except a fix the build made, each one written in later.md and removed here once design/ carries it
const EMAIL_FIXES = []
const emailsOf = dir => readdirSync(dir).filter(n => /\.(html|txt)$/.test(n)).sort()
const designEmails = join(root, '../design/emails'), apiEmails = join(root, '../api/src/emails')
for (const name of new Set([...emailsOf(designEmails), ...emailsOf(apiEmails)]))
	if (!EMAIL_FIXES.includes(name) && (() => { try { return read(join(designEmails, name)) !== read(join(apiEmails, name)) } catch { return true } })())
		fail('copies of the design', `api/src/emails/${name}`, `differs from design/emails/${name}: copy design/emails over api/src/emails`)

/* ---- classes resolve, tokens are defined ---- */

const cssClasses = new Set([...[components, app, ...pages.map(([, css]) => css)].join('\n').matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1]))
const defined = new Set([...(tokens + components).matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))
// set per instance by a component, which is the one place a fallback is legitimate
const HOOKS = ['--swatch', '--p', '--a', '--b', '--h']

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
	// a class chosen from a variant map or join() never sits in a className literal; a layoutId is a name, not a class
	const ids = new Set()
	visit(ast, n => { if (n.type === 'JSXAttribute' && n.name?.name === 'layoutId' && n.value) for (const s of stringsIn(n.value)) ids.add(s) })
	for (const s of stringsIn(ast)) {
		if (ids.has(s)) continue
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
const RAW_SPACING = { '-4px': 4, '1px': 7, '3px': 3, '-2px': 2, '2px': 6, '-12px': 1, '40px': 2, '16px': 1, '8px': 1 }
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

// what a child expression can put in its place: the element itself, or either branch of a condition
const placed = c => {
	if (!c) return []
	if (c.type === 'JSXElement') return [c]
	if (c.type === 'JSXExpressionContainer') return placed(c.expression)
	if (c.type === 'ConditionalExpression') return [...placed(c.consequent), ...placed(c.alternate)]
	if (c.type === 'LogicalExpression') return placed(c.right)
	if (c.type === 'ParenthesizedExpression') return placed(c.expression)
	return []
}
// a Motion element (m.div, Reorder.Item) is drawn as the plain element it names
const tagOf = el => {
	const name = el.openingElement.name
	if (name.type !== 'JSXMemberExpression') return name.name
	return name.object.name === 'm' ? name.property.name : name.object.name === 'Reorder' ? 'div' : undefined
}

/* ---- a card's head is CardHeader, and nothing else draws one ---- */

{
	const home = join(src, 'components/Card.jsx')
	const classOf = el => {
		const a = el.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name.name === 'className')
		return a?.value?.type === 'Literal' ? a.value.value : ''
	}
	const isName = el => el?.type === 'JSXElement' && /\bsp-section-label\b/.test(classOf(el))
	const firstChild = el => el.children.find(c => c.type === 'JSXElement'
		|| (c.type === 'JSXExpressionContainer' && c.expression.type !== 'JSXEmptyExpression'))
	for (const [p, ast] of parsed) {
		if (p === home) continue
		for (const s of stringsIn(ast)) if (/\bsp-card__head\b/.test(s)) fail('a card head is CardHeader', rel(p), 'writes .sp-card__head: use <CardHeader>')
		visit(ast, n => {
			if (n.type !== 'JSXElement') return
			const rows = n.children.filter(c => c.type === 'JSXElement')
			if (/\bsp-row-flex\b/.test(classOf(n)) && isName(rows[0])) fail('a card head is CardHeader', rel(p), 'a row that opens with a card name: use <CardHeader>')
			if (n.openingElement.name.name === 'Card' && placed(firstChild(n)).some(isName))
				fail('a card head is CardHeader', rel(p), 'a card that opens with a name written by hand: use <CardHeader>')
		})
	}
}

/* ---- a chart's key is under the chart, a crumb is text, a chart's loading bar is in a chart ---- */

const charts = join(src, 'components/Data.jsx')
for (const [p, ast] of parsed) {
	visit(ast, n => {
		if (n.type !== 'JSXElement') return
		const shape = n.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name.name === 'shape')
		if (p !== charts && tagOf(n) === 'Skeleton' && shape?.value?.value === 'bar')
			fail('a loading shape fits its job', rel(p), 'a chart\'s loading bar outside a chart: a part held at its own box takes shape="fill"')
		const holds = (c, tags) => placed(c).some(el => tags.includes(tagOf(el)))
		const key = n.children.findIndex(c => holds(c, ['Legend']))
		if (key >= 0 && !n.children.slice(0, key).some(c => holds(c, ['Plot', 'Bars', 'Donut'])))
			fail('a legend is under its chart', rel(p), 'a <Legend> with no chart before it')
		// one child, so a mark held in a variable cannot ride in beside the words
		const words = n.children.filter(c => !(c.type === 'JSXText' && !c.value.trim()))
		if (tagOf(n) === 'Crumb' && (words.length > 1 || words.some(c => placed(c).length || c.type === 'JSXFragment')))
			fail('a crumb is text only', rel(p), 'a <Crumb> holding more than its words')
	})
}

/* ---- a label-line button is xsmall, a checkbox is the input, an action is a link or a button ---- */

{
	const classOf = el => {
		const a = el.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name?.name === 'className')
		return a?.value?.type === 'Literal' ? a.value.value : ''
	}
	const attr = (el, name) => el.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name?.name === name)
	// the design's own sweep (design/styles/check.js): green bold words in a span or div, numbers aside
	const ACTION_INK = [/^(?:sp-title|sp-strong)(?: sp-center)? sp-ink-accent(?: sp-center)?$/, /^sp-(?:ink-accent sp-strong|strong sp-ink-accent)$/]
	for (const [p, ast] of parsed) {
		const declared = new Map()
		visit(ast, n => { if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') declared.set(n.id.name, n.init) })
		visit(ast, n => {
			if (n.type === 'JSXAttribute' && n.name?.name === 'labelAction' && n.value?.type === 'JSXExpressionContainer') {
				const value = n.value.expression.type === 'Identifier' ? declared.get(n.value.expression.name) : n.value.expression
				for (const el of placed(value)) if (tagOf(el) === 'Button' && attr(el, 'size')?.value?.value !== 'xsmall')
					fail('a button beside a field label is xsmall', rel(p), '<Field labelAction={<Button>}> without size="xsmall"')
			}
			if (n.type !== 'JSXElement' || !['div', 'span'].includes(tagOf(n))) return
			if (/\bsp-check\b/.test(classOf(n))) fail('a checkbox is the input', rel(p), `<${tagOf(n)} className="${classOf(n)}">`)
			const words = n.children.filter(c => c.type === 'JSXText').map(c => c.value).join('').trim()
			if (ACTION_INK.some(r => r.test(classOf(n))) && words && words.length <= 40 && !/^[\d.,]+\s*(px|kr\.)?$/.test(words))
				fail('an action is a link or a button', rel(p), words)
		})
	}
}

/* ---- an email on one line keeps its domain; an email in a sentence wraps ---- */

{
	const classOf = el => {
		const a = el.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name?.name === 'className')
		return a?.value?.type === 'Literal' ? a.value.value : ''
	}
	// the design's own sweep (design/styles/check.js) reads an @ in the text; here the value is named for what it holds
	const holdsEmail = node => {
		let found = false
		visit(node, n => { if (n.type === 'Identifier' && /email|address|sentTo/i.test(n.name)) found = true })
		return found
	}
	for (const [p, ast] of parsed) {
		for (const s of stringsIn(ast)) if (/sp-nav-item__(sub--email|local|domain)/.test(s))
			fail('an email on one line is .sp-email-line', rel(p), 'the old nav-only name is back')
		visit(ast, (n, above) => {
			if (n.type !== 'JSXElement' || !/^[a-z]/.test(tagOf(n))) return
			if (!n.children.some(c => c.type === 'JSXExpressionContainer' && holdsEmail(c.expression))) return
			const cls = classOf(n)
			if (/\bsp-truncate\b/.test(cls)) fail('an email on one line is .sp-email-line', rel(p), `<${tagOf(n)} className="${cls}">`)
			const around = above.findLast(a => a.type === 'JSXElement' || a.type === 'JSXFragment')
			const inProse = around?.children.some(c => c.type === 'JSXText' && /[a-z]{2}/i.test(c.value))
			if (inProse && !/\bsp-(break|email-line)/.test(cls)) fail('a typed value in a sentence is .sp-break', rel(p), `<${tagOf(n)} className="${cls}">`)
		})
	}
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

/* ---- grey text after an amount in a row is the row meta column ---- */

{
	// a className's possible classes: its strings, and those of a local helper it calls
	const helpers = ast => {
		const found = new Map()
		visit(ast, n => { if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init) found.set(n.id.name, n.init) })
		return found
	}
	const classesOf = (el, local) => {
		const a = el.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name?.name === 'className')
		if (!a?.value) return ''
		const out = stringsIn(a.value)
		visit(a.value, n => { if (n.type === 'CallExpression' && local.has(n.callee.name)) out.push(...stringsIn(local.get(n.callee.name))) })
		return out.join(' ')
	}
	// a row's parts in order, through fragments and both branches of a condition
	const parts = c => {
		if (!c) return []
		if (c.type === 'JSXFragment') return c.children.flatMap(parts)
		if (c.type === 'JSXExpressionContainer' || c.type === 'ParenthesizedExpression') return parts(c.expression)
		if (c.type === 'ConditionalExpression') return [...parts(c.consequent), ...parts(c.alternate)]
		if (c.type === 'LogicalExpression') return parts(c.right)
		return c.type === 'JSXElement' ? [c] : []
	}
	for (const [p, ast] of parsed) {
		const local = helpers(ast)
		const text = read(p)
		const lineOf = el => text.slice(0, el.start).split('\n').length
		visit(ast, n => {
			if (n.type !== 'JSXElement' || !/\bsp-row-flex\b/.test(classesOf(n, local))) return
			const row = n.children.flatMap(parts)
			row.forEach((el, i) => {
				const next = row[i + 1]
				if (!next || !/\bsp-amount\b/.test(classesOf(el, local))) return
				const cls = classesOf(next, local)
				if (/\bsp-meta\b/.test(cls) && !/\bsp-row-meta\b/.test(cls))
					fail('grey text after an amount is a sp-row-meta column', `${rel(p)}:${lineOf(next)}`, `<${tagOf(next)} className="${cls}">`)
			})
		})
	}
}

/* ---- a list row holding a switch keeps its ground ---- */

// without the setting variant the checked-row tint paints it green, as one option is always checked
for (const [p, ast] of parsed) {
	visit(ast, (n, above) => {
		if (n.type !== 'JSXElement' || tagOf(n) !== 'Segmented') return
		const row = above.findLast(a => a.type === 'JSXElement' && tagOf(a) === 'ListItem')
		if (!row) return
		const has = name => row.openingElement.attributes.some(a => a.type === 'JSXAttribute' && a.name?.name === name)
		if (!has('setting') && !has('color')) fail('a list row holding a control is .sp-list-item--setting', rel(p), '<ListItem> without setting')
	})
}

/* ---- a top-aligned list row is the row's own variant ---- */

// the variant carries the first-line offset for the row's icon; the sp-top utility does not
for (const [p, ast] of parsed) {
	visit(ast, n => {
		if (n.type !== 'JSXElement' || tagOf(n) !== 'ListItem') return
		const a = n.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name?.name === 'className')
		if (a?.value && stringsIn(a.value).some(s => /(^|\s)sp-top(\s|$)/.test(s))) fail('a top-aligned list row uses sp-list-item--top', rel(p), '<ListItem className="sp-top">: use variant="top"')
	})
}

/* ---- labels and names: every control named once, by the label drawn beside it ---- */

{
	const attr = (el, name) => el.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name?.name === name)
	const spreads = el => el.openingElement.attributes.some(a => a.type === 'JSXSpreadAttribute')
	const literal = a => a?.value?.type === 'Literal' ? a.value.value : null
	const classOf = el => stringsIn(attr(el, 'className')?.value ?? null).join(' ')
	// an id as written: its literal parts, and each expression by its source, so `${x}-from` matches itself
	const canon = (e, text) => {
		if (!e) return null
		if (e.type === 'JSXExpressionContainer' || e.type === 'ParenthesizedExpression') return canon(e.expression, text)
		if (e.type === 'Literal') return typeof e.value === 'string' ? e.value : null
		if (e.type === 'TemplateLiteral') return e.quasis.map((q, i) => (q.value.cooked ?? '') + (e.expressions[i] ? '${' + text.slice(e.expressions[i].start, e.expressions[i].end) + '}' : '')).join('')
		if (e.type === 'BinaryExpression' && e.operator === '+') { const l = canon(e.left, text), r = canon(e.right, text); return l === null || r === null ? null : l + r }
		if (e.type === 'Identifier' || e.type === 'MemberExpression') return '${' + text.slice(e.start, e.end) + '}'
		return null
	}
	// the elements a parent places in order, through fragments, conditions and a list of them
	const kids = list => list.flatMap(c => c.type === 'JSXFragment' ? kids(c.children)
		: c.type === 'JSXExpressionContainer' && c.expression.type === 'ArrayExpression' ? kids(c.expression.elements)
		: c.type === 'JSXElement' ? [c] : placed(c))
	const siblingLists = ast => {
		const out = []
		visit(ast, n => {
			if (n.type === 'JSXElement' || n.type === 'JSXFragment') out.push(kids(n.children))
			if (n.type === 'ArrayExpression' && n.elements.some(e => e?.type === 'JSXElement')) out.push(kids(n.elements.filter(Boolean)))
		})
		return out
	}

	// what a component draws as its outer element, followed through the app's own components
	const drawn = new Map()
	for (const [, ast] of parsed) visit(ast, n => {
		if (n.type !== 'FunctionDeclaration' || !/^[A-Z]/.test(n.id?.name ?? '')) return
		visit(n.body, (r, above) => {
			if (r.type !== 'ReturnStatement' || above.some(a => a !== n.body && /Function/.test(a.type))) return
			for (const el of placed(r.argument)) if (!drawn.has(n.id.name)) drawn.set(n.id.name, el)
		})
	})
	const libraryNames = new Set()
	for (const p of library) visit(parsed.get(p), n => { if (n.type === 'FunctionDeclaration' && n.id) libraryNames.add(n.id.name) })
	const outer = el => {
		let at = el
		for (let i = 0; i < 5 && !libraryNames.has(tagOf(at)) && drawn.has(tagOf(at)); i++) at = drawn.get(tagOf(at))
		return at
	}
	const groups = new Set()
	for (const p of library) for (const m of read(p).matchAll(/^(\w+)\.fieldRole = 'group'/gm)) groups.add(m[1])
	const isGroup = el => groups.has(tagOf(el)) || ['group', 'radiogroup'].includes(literal(attr(el, 'role')))
	// the library's controls a reader types or picks in; the sets (Segmented, Picker) name their own parts
	const CONTROLS = ['TextField', 'PasswordField', 'NumberField', 'SearchInput', 'DateField', 'Combobox', 'Stepper', 'Check', 'Radio', 'Switch']
	const VALUE_CONTROLS = ['input', 'select', 'textarea', 'TextField', 'PasswordField', 'NumberField', 'SearchInput', 'DateField', 'Stepper']
	// a combobox of several values is typed into, so a label binds it as it binds a text field
	const isValueControl = el => VALUE_CONTROLS.includes(tagOf(el)) || (tagOf(el) === 'Combobox' && !!attr(el, 'multiple'))
	const ACRONYMS = ['PDF', 'CSV', 'DKK', 'VAT', 'CVR', 'XLS', 'JSON', 'ID', 'OK', 'EAN', 'MOMS']
	const REFS = ['htmlFor', 'aria-labelledby', 'aria-describedby', 'aria-controls']

	const declared = new Set()
	for (const [p, ast] of parsed) {
		// two of one id are drawn together unless they sit in different returns or either side of a condition
		const apart = new Map()
		visit(ast, (n, above) => {
			const id = n.type === 'JSXAttribute' && n.name?.name === 'id' ? literal(n) : null
			if (typeof id !== 'string') return
			declared.add(id)
			const forks = new Map()
			above.forEach((a, i) => {
				if (a.type === 'ConditionalExpression') forks.set(`if${a.start}`, above[i + 1] === a.consequent ? 'then' : 'else')
				if (a.type === 'ReturnStatement') forks.set(`return${above.findLast((f, j) => j < i && /Function/.test(f.type))?.start}`, a.start)
			})
			const earlier = apart.get(id) ?? []
			if (earlier.some(e => ![...forks].some(([k, v]) => e.has(k) && e.get(k) !== v))) fail('unique ids', rel(p), `id "${id}" declared more than once`)
			apart.set(id, [...earlier, forks])
		})
	}

	for (const [p, ast] of parsed) {
		const text = read(p)
		const lineOf = node => `${rel(p)}:${text.slice(0, node.start).split('\n').length}`
		const owned = new Set()
		visit(ast, n => { if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init?.type === 'CallExpression' && n.init.callee.name === 'useId') owned.add(n.id.name) })
		const ids = new Set()
		visit(ast, n => {
			if (n.type === 'JSXAttribute' && n.name?.name === 'id' && n.value) ids.add(canon(n.value, text))
			if (n.type === 'Property' && (n.key?.name ?? n.key?.value) === 'id') ids.add(canon(n.value, text))
		})
		const fieldControls = new Set()
		visit(ast, n => { if (n.type === 'JSXElement' && tagOf(n) === 'Field') for (const c of kids(n.children)) fieldControls.add(c) })
		const bound = new Set()
		visit(ast, n => { if (n.type === 'JSXAttribute' && n.name?.name === 'htmlFor' && n.value) bound.add(canon(n.value, text)) })
		// an id the caller hands in names the control from the caller's own Field
		const handedIn = a => a?.value?.type === 'JSXExpressionContainer' && a.value.expression.type === 'Identifier' && !owned.has(a.value.expression.name)

		// a reference names an id this file declares, or one written out somewhere in the app
		visit(ast, n => {
			const name = n.type === 'JSXAttribute' ? n.name?.name : n.type === 'Property' ? n.key?.name ?? n.key?.value : null
			if (!REFS.includes(name) || !n.value) return
			const value = n.value.type === 'JSXExpressionContainer' ? n.value.expression : n.value
			for (const one of value.type === 'ConditionalExpression' ? [value.consequent, value.alternate] : [value]) {
				const ref = canon(one, text)
				if (ref === null) continue
				const parts = [...ref.matchAll(/\$\{([^}]*)\}/g)].map(m => m[1])
				// an id handed in by the caller is the caller's to declare
				if (parts.some(x => !owned.has(x))) continue
				for (const token of parts.length ? [ref] : ref.split(/\s+/).filter(Boolean))
					if (!ids.has(token) && !declared.has(token)) fail('references resolve', lineOf(n), `${name}="${token}" points at no id`)
			}
		})

		visit(ast, (n, above) => {
			if (n.type !== 'JSXElement') return
			const tag = tagOf(n)
			const has = a => !!attr(n, a)

			// a control is named by a Field, a wrapping label, a bound id or an aria attribute
			if ((['input', 'select', 'textarea'].includes(tag) || (CONTROLS.includes(tag) && !library.includes(p)))
				&& literal(attr(n, 'type')) !== 'hidden' && !has('hidden') && !spreads(n) && !has('aria-label') && !has('aria-labelledby') && !has('prefix')
				&& !fieldControls.has(n) && !bound.has(canon(attr(n, 'id')?.value, text)) && !handedIn(attr(n, 'id'))
				&& !above.some(a => a.type === 'JSXElement' && ['label', 'Choice', 'Field'].includes(tagOf(a)))
				&& !above.some(a => a.type === 'JSXAttribute' && a.name?.name === 'control'))
				fail('every control is named', lineOf(n), `<${tag}> has no name`)

			// on touch a switch and its line are one label, so the whole row takes a tap
			if (tag === 'Switch' && !above.some(a => a.type === 'JSXElement' && ['label', 'Choice'].includes(tagOf(a)))
				&& !above.some(a => a.type === 'JSXAttribute' && a.name?.name === 'control'))
				fail('a switch row is one label', lineOf(n), '<Switch> outside a <label> or <Choice>')

			if (tag === 'Field') {
				const label = attr(n, 'label')
				const words = label ? stringsIn(label.value).join('') : ''
				for (const c of kids(n.children)) {
					if (/^(Status|Kind)$/.test(words.trim()) && tagOf(outer(c)) !== 'Combobox')
						fail('Status and Kind are selects', lineOf(c), `the ${words.trim()} field holds a <${tagOf(c)}>`)
					// a Stepper is named by a text label only, and keeps aria-label under any other
					const named = (tagOf(outer(c)) === 'Combobox' && !attr(outer(c), 'multiple')) || (tagOf(outer(c)) === 'Stepper' && label?.value?.type === 'Literal')
					if (named && (attr(outer(c), 'aria-label') || attr(c, 'aria-label')))
						fail('one name per control', lineOf(c), `<Field label=${label ? text.slice(label.value.start, label.value.end) : ''}> holds a <${tagOf(c)}> with its own aria-label`)
				}
				if (/\*/.test(words)) fail('a required marker is an element', lineOf(n), `"${words}": use <Field required>`)
			}
			if (/\bsp-field__label\b/.test(classOf(n)) && kids(n.children).length === 0 && n.children.some(c => c.type === 'JSXText' && c.value.includes('*')))
				fail('a required marker is an element', lineOf(n), 'an asterisk typed into a label: use .sp-field__required')

			// a back control is the one beside the title it leaves, in a phone's top bar
			if (tag === 'IconButton' && literal(attr(n, 'icon')) === 'chevron-left') {
				const row = siblingLists(above.findLast(a => a.type === 'JSXElement' || a.type === 'JSXFragment') ?? {}).find(r => r.includes(n)) ?? []
				const next = row[row.indexOf(n) + 1]
				if (next && /\bsp-stack(ed)?\b/.test(classOf(next)) && literal(attr(n, 'aria-label')) !== 'Back')
					fail('Back is labelled Back', lineOf(n), `back control labelled "${literal(attr(n, 'aria-label')) ?? '(not a word)'}"`)
			}

			// a chip that adds a value under a field ("+ Lighting") is the suggestion chip, smaller on touch
			if (tag === 'Chip' && n.closingElement) {
				const inner = text.slice(n.openingElement.end, n.closingElement.start).trim()
				if (/(^|[`'"])\+ /.test(inner) && literal(attr(n, 'variant')) !== 'suggestion')
					fail('a suggestion chip is sp-chip--suggestion', lineOf(n), `<Chip variant="${literal(attr(n, 'variant')) ?? 'outline'}"> adds a value`)
			}

			// the shortcut badge is the top bar's search only
			if ((tag === 'Controls' || /\bsp-controls\b/.test(classOf(n)))) visit(n.children, k => {
				if (k.type === 'JSXElement' && (attr(k, 'kbd') || tagOf(k) === 'Kbd' || tagOf(k) === 'kbd'))
					fail('no shortcut badge in a list toolbar', lineOf(k), 'toolbar search carries the badge')
			})

			const select = attr(n, 'aria-label')?.value
			const said = select ? canon(select, text) : null
			if (said && /^Select all/.test(said) && !/\d|\$\{[^}]*(total|count|length|size|amount|matched|\bn\b)[^}]*\}/i.test(said))
				fail('a select-all box names its scope', lineOf(n), said)

			if (['button', 'a', 'Button', 'MenuItem', 'Link', 'NavLink', 'FieldGroupMore'].includes(tag)) {
				const words = []
				visit(n.children, (k, up) => {
					if (up.some(u => u.type === 'JSXElement' && ['Icon', 'svg', 'Mark', 'Kbd', 'kbd'].includes(tagOf(u)))) return
					if (k.type === 'JSXText') words.push(k.value)
					if (k.type === 'Literal' && typeof k.value === 'string' && !up.some(u => u.type === 'JSXAttribute')) words.push(k.value)
				})
				const label = words.join(' ').replace(/\s+/g, ' ').trim()
				const letters = label.replace(/[^A-Za-zÆØÅæøå]/g, '')
				if (letters.length >= 2 && letters === letters.toUpperCase() && !ACRONYMS.includes(label))
					fail('an action reads in sentence case', lineOf(n), `<${tag}> label typed in capitals: "${label.slice(0, 40)}"`)
			}
		})

		// a label drawn beside a group or a pick list names it through aria-labelledby, once
		for (const row of siblingLists(ast)) row.forEach((el, i) => {
			const next = row[i + 1]
			if (!next || !/\bsp-field__label\b/.test(classOf(el))) return
			const words = stringsIn(el.children).join('').trim().slice(0, 40)
			const id = attr(el, 'id') ? canon(attr(el, 'id').value, text) : null
			if (isGroup(next)) {
				const by = attr(next, 'aria-labelledby') ? canon(attr(next, 'aria-labelledby').value, text) : null
				if (tagOf(el) === 'label') fail('a group label is a span', lineOf(el), `"${words}" is a <label>, which cannot name a group`)
				if (!id) fail('a visible label is bound', lineOf(el), `"${words}" names a group but carries no id`)
				else if (by !== id) fail('a visible label is bound', lineOf(el), `"${words}" has id ${id} but its group names ${by || 'nothing'}`)
				if (by && attr(next, 'aria-label')) fail('one name per control', lineOf(next), `"${words}" group carries both aria-label and aria-labelledby`)
				return
			}
			if (tagOf(outer(next)) === 'Combobox' && !attr(outer(next), 'multiple')) {
				// the trigger reads the label whose id is its own id and -label, when it has no aria-label
				const trigger = attr(next, 'id') ? canon(attr(next, 'id').value, text) : null
				if (!id) fail('a visible label is bound', lineOf(el), `"${words}" labels a pick list but carries no id`)
				else if (!trigger || id !== trigger + '-label') fail('a visible label is bound', lineOf(el), `"${words}" has id ${id}, which its pick list does not read`)
				if (attr(next, 'aria-label')) fail('one name per control', lineOf(next), `"${words}" pick list carries its own aria-label too`)
				return
			}
			let control = isValueControl(next) || tagOf(outer(next)) !== tagOf(next) && isValueControl(outer(next))
			visit(next, k => { if (k.type === 'JSXElement' && isValueControl(k)) control = true })
			if (control && tagOf(el) !== 'label') fail('a field label binds its control', lineOf(el), `"${words}" is a span, not a bound label`)
		})
	}

	// an action's words are never set in capitals by a rule the app adds
	for (const [name, css] of [['app.css', app], ...pages.map(([p, c]) => [rel(p), c])])
		for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
			if (!/text-transform:\s*uppercase/.test(m[2])) continue
			for (const part of m[1].split(',').map(x => x.trim()))
				if (/btn|-link|-action|-tab\b|^a[\s.:[]|\sa[\s.:[]|\sa$/.test(part)) fail('an action reads in sentence case', name, `${part} uppercases an action`)
		}
}

/* ---- the library's exports: one name per object, named for the object ---- */

{
	const unwrap = n => n?.type === 'ParenthesizedExpression' ? unwrap(n.expression) : n
	const firstWord = v => {
		v = unwrap(v)
		if (v?.type === 'JSXExpressionContainer') return firstWord(v.expression)
		if (v?.type === 'Literal' && typeof v.value === 'string') return v.value.trim().split(/\s+/)[0] || null
		if (v?.type === 'TemplateLiteral') return (v.quasis[0].value.cooked ?? '').trim().split(/\s+/)[0] || null
		if (v?.type === 'CallExpression' && v.callee.name === 'join') return firstWord(v.arguments[0])
		return null
	}
	const exports = []
	for (const p of library) visit(parsed.get(p), n => {
		const fn = n.type === 'ExportNamedDeclaration' ? n.declaration : null
		if (fn?.type !== 'FunctionDeclaration' || !/^[A-Z]/.test(fn.id.name)) return
		// the return at function-body level is the component's own output, not an early branch
		const own = unwrap(fn.body.body.findLast(st => st.type === 'ReturnStatement')?.argument)
		const rootTag = own?.type === 'JSXElement' && own.openingElement.name.name
		const classAttr = /^[a-z]/.test(rootTag || '') && own.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name?.name === 'className')
		exports.push({ p, n: fn.id.name, fn, cls: classAttr ? firstWord(classAttr.value) : null, at: n.start })
	})
	// Storybook's props table is built from the JSDoc right above the function
	for (const e of exports) {
		const props = e.fn.params[0]?.type === 'ObjectPattern' ? e.fn.params[0].properties.filter(q => q.type === 'Property').map(q => q.key.name ?? q.key.value) : []
		if (!props.length) continue
		const before = read(e.p).slice(0, e.at), end = before.lastIndexOf('*/'), start = before.lastIndexOf('/**')
		const doc = start >= 0 && end > start && /^\s*$/.test(before.slice(end + 2)) ? before.slice(start, end) : ''
		if (!/@param \{object\} props\b/.test(doc)) { fail('every component prop has JSDoc', rel(e.p), `${e.n} has no @param {object} props block`); continue }
		const missing = props.filter(q => !doc.includes(`props.${q}]`) && !doc.includes(`props.${q} `) && !doc.includes(`props.${q}\n`) && !doc.includes(`props['${q}']`))
		if (missing.length) fail('every component prop has JSDoc', rel(e.p), `${e.n} does not document ${missing.join(', ')}`)
	}
	// "take the room the control is given" has one name, fullWidth, on every control that can take it
	const FULL_WIDTH = ['Button', 'Combobox', 'Field', 'TextField', 'PasswordField', 'NumberField', 'SearchInput', 'DateField', 'Segmented', 'FileDrop']
	const docOf = e => {
		const before = read(e.p).slice(0, e.at), end = before.lastIndexOf('*/'), start = before.lastIndexOf('/**')
		return start >= 0 && end > start && /^\s*$/.test(before.slice(end + 2)) ? before.slice(start, end) : ''
	}
	for (const n of FULL_WIDTH) {
		const e = exports.find(x => x.n === n)
		if (!e) fail('one name for full width', 'src/components', `${n} is not exported`)
		else if (!docOf(e).includes('[props.fullWidth]')) fail('one name for full width', rel(e.p), `${n} does not take fullWidth`)
	}
	for (const e of exports)
		if (/@param \{boolean\} \[props\.(grow|fill|block)\]/.test(docOf(e))) fail('one name for full width', rel(e.p), `${e.n} takes its own name for fullWidth`)
	for (const p of library)
		if (/VARIANT\s*=\s*\{[^}]*\b(grow|fill|block)\s*:/.test(read(p))) fail('one name for full width', rel(p), 'a variant map carries grow, fill or block: that is fullWidth')
	// a slot that takes a shared primitive for its look is reuse, not a second word for it. The app's own two:
	const REUSED = { DialogTitle: 'sp-heading', RangeSlider: 'sp-track', Picker: 'sp-options' }
	const roots = {}
	for (const e of exports) if (e.cls) (roots[e.cls] ||= []).push(e.n)
	for (const [cls, names] of Object.entries(roots))
		if (names.filter(n => REUSED[n] !== cls).length > 1) fail('one component per root class', 'src/components', `.${cls} is rendered by ${names.join(' and ')}`)

	for (const [cls, names] of Object.entries(roots))
		for (const n of names) {
			if (REUSED[n] === cls) continue
			const words = n.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(' ')
			if (!words.some(w => cls.includes(w.replace(/s$/, '')))) fail('one word per object', 'src/components', `${n} renders .${cls}`)
		}

	// only an arrangement: no classed element of its own, other components, and no decision.
	// The two that only give what they hold Motion's settings or its presence are not arrangements.
	const MOTION_WRAPPERS = ['Leaving', 'MotionShell']
	for (const e of exports) {
		if (MOTION_WRAPPERS.includes(e.n)) continue
		let own = false, decides = false
		const kids = new Set()
		visit(e.fn.body, n => {
			if (n.type === 'JSXOpeningElement' && n.name.type === 'JSXIdentifier') {
				if (/^[a-z]/.test(n.name.name)) own ||= n.attributes.some(a => a.type === 'JSXAttribute' && a.name?.name === 'className')
				else if (n.name.name !== 'Icon') kids.add(n.name.name)
			}
			if (['ConditionalExpression', 'LogicalExpression', 'IfStatement', 'ChainExpression', 'SwitchStatement'].includes(n.type)) decides = true
			if (n.type === 'CallExpression' && /^(use[A-Z]\w*|pick|join)$/.test(n.callee.name ?? '')) decides = true
		})
		if (!own && kids.size && !decides)
			fail('no component is only an arrangement', rel(e.p), `${e.n} renders ${[...kids].join(' + ')} and nothing of its own`)
	}

	// `touch` is what the library switches on, never a screen size
	for (const e of exports)
		if (/phone|mobile|tablet|desktop|watch|ipad|android/i.test(e.n)) fail('no component is named for a device', rel(e.p), `${e.n} names a device`)
	for (const p of library)
		if (/phone|mobile|tablet|ipad|android/i.test(rel(p))) fail('no component is named for a device', rel(p), 'the file names a device')
}

/* ---- the order form: its Categories field and the order of its fields ---- */

// a value a file names once and draws elsewhere: a const, or a local function's returned markup,
// each found by its name in the innermost function that declares it
const localsOf = ast => {
	const found = new Map()
	const add = (name, init, above) => {
		const scope = above.findLast(a => /Function/.test(a.type)) ?? ast
		if (!found.has(name)) found.set(name, [])
		found.get(name).push({ init, from: scope.start, to: scope.end })
	}
	visit(ast, (n, above) => {
		if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init) add(n.id.name, n.init, above)
		if (n.type === 'FunctionDeclaration' && n.id) add(n.id.name, n, above)
	})
	return (name, at) => (found.get(name) ?? []).filter(d => d.from <= at && at <= d.to).sort((a, b) => (a.to - a.from) - (b.to - b.from))[0]?.init
}
// visits a tree in drawing order, stepping into the locals it draws by name
const walkDrawn = (node, local, fn, stack = new Set()) => visit(node, (n, above) => {
	fn(n, above)
	const via = above.at(-1)
	const name = n.type === 'Identifier' && ['JSXExpressionContainer', 'ConditionalExpression', 'LogicalExpression', 'ArrayExpression'].includes(via?.type) ? n.name
		: n.type === 'CallExpression' && n.callee.type === 'Identifier' ? n.callee.name : null
	const init = name && !stack.has(name) && local(name, n.start)
	if (!init || (n.type === 'Identifier' && /Function/.test(init.type))) return
	walkDrawn(/Function/.test(init.type) ? init.body : init, local, fn, new Set([...stack, name]))
})
const attrOf = (el, name) => el.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name?.name === name)
const literalOf = a => a?.value?.type === 'Literal' ? a.value.value
	: a?.value?.type === 'JSXExpressionContainer' && a.value.expression.type === 'Literal' ? a.value.expression.value : undefined

{
	const ORDER = ['Vendor', 'Date', 'Kind', 'Status', 'Categories', 'Reference', 'Note', 'Discount', 'Shipping fee']
	for (const [p, ast] of parsed) {
		const local = localsOf(ast)
		visit(ast, n => {
			if (n.type !== 'JSXElement') return
			// a filter's Categories (Bookmarks) is not an order's field
			if (tagOf(n) === 'Field' && literalOf(attrOf(n, 'label')) === 'Categories' && !/Bookmark/.test(rel(p))) {
				let tokens = false, bulb = false
				walkDrawn(n, local, m => {
					if (m.type !== 'JSXElement') return
					if (/Tokens(Field)?$/.test(tagOf(m))) tokens = true
					if (literalOf(attrOf(m, 'aria-label')) === 'Suggest categories') bulb = true
					if (m.type === 'JSXElement' && m.children.some(c => c.type === 'JSXText' && /Suggested from the items/.test(c.value))) bulb = true
				})
				if (tokens && !bulb) fail('an order Categories field has the bulb', rel(p), '<Field label="Categories"> with no Suggest categories trail')
			}
			if (tagOf(n) !== 'Card') return
			let details = false
			const got = []
			walkDrawn(n, local, m => {
				if (m.type === 'JSXText' && m.value.trim() === 'Order details') details = true
				if (m.type !== 'JSXElement') return
				if (tagOf(m) === 'CardHeader' && literalOf(attrOf(m, 'name')) === 'Order details') details = true
				const label = tagOf(m) === 'Field' && literalOf(attrOf(m, 'label'))
				if (ORDER.includes(label) && !got.includes(label)) got.push(label)
			})
			const want = ORDER.filter(x => got.includes(x))
			if (details && got.join() !== want.join()) fail('order details fields in one order', rel(p), got.join(', '))
		})
	}
}

/* ---- a removed feature leaves no trace ---- */

for (const p of [...checked, ...pageCss, join(src, 'styles/app.css')])
	if (/\/letters\b|monthly letter|sp-letter/i.test(read(p))) fail('removed feature leaves no trace', rel(p), 'monthly letter')

/* ---- what is left to check leads the file name ---- */

{
	// a file's name as the app holds it: file.name, draft.file?.name, fileName
	const isFileName = n => {
		n = n?.type === 'ChainExpression' ? n.expression : n
		if (n?.type === 'Identifier') return /^file_?name$/i.test(n.name)
		if (n?.type !== 'MemberExpression' || n.property.name !== 'name') return false
		const of = n.object.type === 'ChainExpression' ? n.object.expression : n.object
		return /file/i.test(of.type === 'Identifier' ? of.name : of.property?.name ?? '')
	}
	const said = n => !(n.type === 'JSXText' && !n.value.trim()) && !(n.type === 'TemplateElement' && !(n.value.cooked ?? '').trim())
	for (const [p, ast] of parsed) {
		const local = localsOf(ast)
		visit(ast, n => {
			if (n.type !== 'JSXElement') return
			const cls = attrOf(n, 'className')
			if (!cls?.value || !stringsIn(cls.value).some(s => /\bsp-meta\b/.test(s) && /\bsp-truncate\b/.test(s))) return
			walkDrawn({ type: 'JSXFragment', children: n.children }, local, m => {
				const parts = m.type === 'JSXFragment' || m.type === 'JSXElement' ? m.children.map(c => c.type === 'JSXExpressionContainer' ? c.expression : c)
					: m.type === 'ArrayExpression' ? m.elements
						: m.type === 'TemplateLiteral' ? [...m.quasis, ...m.expressions].sort((a, b) => a.start - b.start) : null
				const at = parts?.findIndex(isFileName) ?? -1
				if (at >= 0 && parts.slice(at + 1).some(said)) fail('what is left to check leads the file name', rel(p), 'a file name before what is left to check, in a one-line meta')
			})
		})
	}
}

/* ---- a stack's lines, a pair's first line ---- */

// every class string a className can take, one per branch
const classStrings = el => { const a = attrOf(el, 'className'); return a?.value ? stringsIn(a.value).map(s => s.trim()) : [] }
const hasClass = (el, c) => classStrings(el).some(s => s.split(/\s+/).includes(c))
const firstClass = el => classStrings(el).map(s => s.split(/\s+/)[0])
const attrLiteral = (el, name) => {
	const v = attrOf(el, name)?.value
	return v?.type === 'Literal' ? v.value : v?.type === 'JSXExpressionContainer' && v.expression.type === 'Literal' ? v.expression.value : undefined
}
const childElements = el => el.children.filter(c => !(c.type === 'JSXText' && !c.value.trim()))
const ownText = el => el.children.filter(c => c.type === 'JSXText').map(c => c.value).join('').trim()
const isTag = n => n.type === 'JSXElement' && n.openingElement.name.type === 'JSXIdentifier'
const CONTROL_PARTS = ['Button', 'IconButton', 'TextField', 'PasswordField', 'NumberField', 'SearchInput', 'RangeSlider', 'Field', 'FieldGroup',
	'Gauge', 'Segmented', 'Stepper', 'Switch', 'Check', 'Radio', 'Choice', 'Chip', 'Picker', 'Combobox', 'DateField', 'PeriodPicker', 'Bars', 'Donut', 'Plot',
	'List', 'ListItem', 'Shares', 'LineEditor', 'ThemeTiles', 'Well', 'Card', 'Cards', 'input', 'select', 'textarea', 'button']
const CONTROL_CLASS = /^sp-(tokens|input|select|textarea|field|gauge|segmented|stepper|switch|check|radio|btn|chip|options|option|tone|swatch|meter|bars|donut|table|list|lines|cards|note-row|choice|well|card|field__help|combobox|period)(?![\w-])/
const holdsControl = el => {
	let found = false
	visit(el.children, n => {
		if (isTag(n) && (CONTROL_PARTS.includes(tagOf(n)) || classStrings(n).some(s => s.split(/\s+/).some(c => CONTROL_CLASS.test(c))))) found = true
	})
	return found
}

for (const [p, ast] of parsed) {
	visit(ast, n => {
		if (!isTag(n)) return
		const kids = childElements(n)
		// a line is one element in its place, whichever branch draws it
		const lines = kids.map(c => placed(c)[0])
		const known = lines.length && lines.every(Boolean)
		const lineClass = el => (/^[a-z]/.test(tagOf(el)) ? firstClass(el)[0] ?? '' : '')
		const cls = classStrings(n).join(' ').split(/\s+/)
		if (cls.includes('sp-stack') && known && ['span', 'div'].includes(tagOf(lines[0])) && /^sp-(title|heading|strong|data)$/.test(lineClass(lines[0]))) {
			// a second line that ends a sentence is a message; one whose words come from a value cannot be told, so it is left
			const message = el => {
				let valued = false
				visit(el.children, m => { if (m.type === 'Identifier') valued = true })
				return valued || /[.!?]$/.test(stringsIn(el.children).join('').trim())
			}
			const notAPair = lines.length !== 2 || !/^sp-(subtitle|meta)$/.test(lineClass(lines[1])) || message(lines[1])
			const shown = `<${tagOf(n)} className="${cls.join(' ')}">`
			if (!notAPair && !holdsControl(n)) fail('a title with its second line is sp-stacked', rel(p), `${shown} holds a pair: use sp-stacked`)
			else {
				if (/^sp-(title|heading)$/.test(lineClass(lines[0])) && !cls.includes('sp-gap-6')) fail('a card body stack is gap 6', rel(p), shown)
				if (cls.includes('sp-truncate')) fail('a card body does not truncate', rel(p), `${shown} clips prose`)
			}
		}
		const stacked = tagOf(n) === 'Stacked' || firstClass(n).includes('sp-stacked')
		if (stacked && known && lines.length === 2 && lineClass(lines[0]) === 'sp-strong' && !childElements(lines[0]).some(c => placed(c).length)
			&& /^sp-(subtitle|meta)$/.test(lineClass(lines[1])))
			fail('a pair starts with sp-title', rel(p), 'sp-strong opens a pair')
	})
}

/* ---- a button on an input's line is the input's height ---- */

{
	const INPUTS = ['TextField', 'PasswordField', 'NumberField', 'SearchInput', 'DateField']
	const APART_PARTS = ['Field', 'Card', 'Well', 'Dialog', 'Popover', 'Menu', 'Palette']
	const APART_CLASS = /^sp-(field|card|well|dialog|popover|menu|palette)(?![\w-])/
	for (const [p, ast] of parsed) visit(ast, n => {
		if (!isTag(n) || (tagOf(n) !== 'ListItem' && !firstClass(n).some(c => c === 'sp-row-flex' || c === 'sp-list-item'))) return
		let apart = false, input = false, small = false
		visit(n.children, m => {
			if (!isTag(m)) return
			if (APART_PARTS.includes(tagOf(m)) || classStrings(m).some(s => s.split(/\s+/).some(c => APART_CLASS.test(c)))) apart = true
			if ((INPUTS.includes(tagOf(m)) && !attrOf(m, 'multiline')) || (tagOf(m) === 'input' && hasClass(m, 'sp-input'))) input = true
			if (tagOf(m) === 'Button' && ['small', 'xsmall'].includes(attrLiteral(m, 'size'))) small = true
		})
		if (!apart && input && small) fail('a button beside an input matches its height', rel(p), 'a small button on a line with an input: use the standard size')
	})
}

/* ---- the sidebar's foot: the divider, then Ask, then Settings ---- */

for (const [p, ast] of parsed) visit(ast, (n, above) => {
	if (n.type !== 'JSXElement' || !above.some(a => isTag(a) && tagOf(a) === 'Sidebar') && !(isTag(n) && tagOf(n) === 'Sidebar')) return
	const kids = childElements(n)
	kids.forEach((c, i) => {
		if (!placed(c).some(el => ownText(el) === 'Settings' && /\/settings$/.test(attrLiteral(el, 'to') ?? ''))) return
		if (!placed(kids[i - 1]).some(el => ownText(el) === 'Ask')) fail('the sidebar foot is the divider, Ask, Settings', rel(p), 'Settings does not follow Ask')
		else if (!placed(kids[i - 2]).some(el => tagOf(el) === 'SidebarDivider')) fail('the sidebar foot is the divider, Ask, Settings', rel(p), 'Ask does not follow a <SidebarDivider>')
	})
})

/* ---- the theme is set in Settings only: no sidebar row, on the wide sidebar or the rail, is Dark mode ---- */

for (const [p, ast] of parsed) visit(ast, n => {
	if (!isTag(n) || tagOf(n) !== 'NavItem') return
	if (ownText(n) === 'Dark mode' || attrLiteral(n, 'aria-label') === 'Dark mode') fail('the theme is set in Settings only', rel(p), 'a Dark mode row in the sidebar')
})

/* ---- a saved question keeps its text in .sp-truncate, so the 320px cap can cut it ---- */

for (const [p, ast] of parsed) visit(ast, (n, above) => {
	const owner = above.findLast(a => a.type === 'FunctionDeclaration')?.id?.name
	if (!isTag(n)) return
	if (owner === 'ChatPick' && tagOf(n) === 'Button') {
		const first = childElements(n)[0]
		if (!first || !isTag(first) || !hasClass(first, 'sp-truncate')) fail('a saved question is capped', rel(p), 'a saved question without .sp-truncate')
	}
	if (owner === 'ChatSavedMenu' && tagOf(n) === 'ComboboxOption' && !attrOf(n, 'truncate')) fail('a saved question is capped', rel(p), 'a Saved questions option without truncate')
})

/* ---- the Views card lists in the same rows at rest and in edit mode ---- */

for (const [p, ast] of parsed) visit(ast, n => {
	if (!isTag(n) || tagOf(n) !== 'Card') return
	const kids = childElements(n).filter(c => c.type !== 'JSXExpressionContainer' || c.expression.type !== 'JSXEmptyExpression')
	const at = kids.findIndex(c => placed(c).some(el => tagOf(el) === 'CardHeader' && attrLiteral(el, 'name') === 'Views'))
	if (at < 0) return
	const list = placed(kids[at + 1])
	if (!list.length) fail('the Views card keeps its rows in edit mode', rel(p), 'the views are not one .sp-nav-list under the head')
	for (const el of list) if (classStrings(el).join(' ') !== 'sp-nav-list')
		fail('the Views card keeps its rows in edit mode', rel(p), `the views list in <${tagOf(el)} className="${classStrings(el).join(' | ')}">`)
})

/* ---- a page body is the shell's one ShellContent ---- */

// every page renders inside the shell's ShellContent, so a second body adds the page's inset twice
for (const [p, ast] of parsed) {
	if (p === join(src, 'components/Shell.jsx')) continue
	for (const s of stringsIn(ast)) if (/(^|\s)sp-shell__body(\s|$)/.test(s)) fail('a body is not nested in a body', rel(p), 'writes .sp-shell__body: the shell\'s <ShellContent> is the body')
	visit(ast, (n, above) => {
		if (!isTag(n) || tagOf(n) !== 'ShellContent') return
		if (p.startsWith(pagesDir) || above.some(a => isTag(a) && tagOf(a) === 'ShellContent')) fail('a body is not nested in a body', rel(p), '<ShellContent> inside the shell\'s body')
	})
}

/* ---- a row of stats with different line counts aligns to the top ---- */

for (const [p, ast] of parsed) visit(ast, n => {
	if (!isTag(n) || !firstClass(n).includes('sp-row-flex') || hasClass(n, 'sp-top')) return
	const stats = childElements(n).flatMap(placed).filter(el => tagOf(el) === 'Stat' && !attrOf(el, 'bare'))
	const lines = stats.map(el => ['label', 'figure', 'delta', 'meta', 'help'].filter(a => attrOf(el, a)).length)
	if (new Set(lines).size > 1) fail('a stat row aligns to the top', rel(p), `stats of ${lines.join('/')} lines in a centred row`)
})

/* ---- a row that opens something is drawn as one ---- */

{
	// the app's own parts by name, so a card's rows are read through the parts that draw them
	const drawers = new Map()
	for (const [p, ast] of parsed) {
		if (p.includes('/src/components/')) continue
		visit(ast, n => {
			if (n.type === 'FunctionDeclaration' && /^[A-Z]/.test(n.id?.name ?? '')) drawers.set(n.id.name, n)
			if (n.type === 'VariableDeclarator' && /^[A-Z]/.test(n.id.name ?? '') && /Function/.test(n.init?.type ?? '')) drawers.set(n.id.name, n.init)
		})
	}
	const valuesIn = new Map([...parsed].map(([p, ast]) => {
		const found = new Map()
		visit(ast, n => { if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init) found.set(n.id.name, n.init) })
		return [p, found]
	}))
	const drawn = (node, p, fn, seen = new Set()) => visit(node, n => {
		fn(n)
		const name = isTag(n) ? tagOf(n) : n.type === 'JSXExpressionContainer' && n.expression.type === 'Identifier' ? n.expression.name : null
		const next = isTag(n) ? drawers.get(name) : name && valuesIn.get(p).get(name)
		if (next && !seen.has(name)) { seen.add(name); drawn(next, p, fn, seen) }
	})
	const OPENS = ['by status', 'top vendors', 'categories this month', 'drafts', 'recent orders']
	const drawsOpens = el => /sp-row-opens/.test(JSON.stringify(drawers.get(tagOf(el)) ?? null))
	const opens = el => (['a', 'button', 'Link'].includes(tagOf(el)) && hasClass(el, 'sp-row-opens')) || (/^[A-Z]/.test(tagOf(el)) && drawsOpens(el))
	for (const [p, ast] of parsed) visit(ast, n => {
		if (!isTag(n) || tagOf(n) !== 'Card') return
		let named = false
		drawn(n.children, p, m => { if (isTag(m) && tagOf(m) === 'CardHeader' && OPENS.includes(String(attrLiteral(m, 'name')).toLowerCase())) named = true })
		if (!named) return
		drawn(n.children, p, m => {
			if (!isTag(m) || !classStrings(m).some(s => /^(sp-stack sp-gap-6|sp-row-flex sp-gap-12)(\s|$)/.test(s))) return
			// a loading shape is no row yet
			if (opens(m) || attrOf(m, 'aria-hidden')) return
			let holds = false, loading = false
			drawn(m.children, p, k => {
				if (!isTag(k)) return
				if (tagOf(k) === 'Gauge' || (tagOf(k) === 'Mark' && attrLiteral(k, 'size') === 'medium')) holds = true
				if (tagOf(k) === 'Skeleton') loading = true
			})
			if (holds && !loading) fail('a row that opens something is drawn as one', rel(p), `<${tagOf(m)} className="${classStrings(m).join(' | ')}"> is a plain row: an <a>, <button> or Link with sp-row-opens`)
		})
	})
}

/* ---- a saving: "Saved", an amount, green unless zero, under its amount ---- */

{
	for (const p of [...checked, ...pageCss, join(root, 'index.html')])
		if (/heic/i.test(read(p))) fail('HEIC is not offered and never named', rel(p), 'HEIC present')
	for (const [p, ast] of parsed) visit(ast, (n, above) => {
		const parent = above.at(-1)
		const prop = above.findLast(a => a.type === 'JSXAttribute')?.name?.name ?? ''
		const inMarkup = above.some(a => a.type === 'JSXExpressionContainer' || a.type === 'JSXAttribute')
			&& !/^(key|className|id|to|href|src|type|role|htmlFor|value|variant|size|color|shape|data-.*|on[A-Z].*)$/.test(prop)
		// only words that open a line: "3 saved" is a count, not a saving
		const opensLine = n.type === 'JSXText' ? isTag(parent ?? {}) && childElements(parent)[0] === n
			: n.type === 'TemplateElement' ? inMarkup && parent?.quasis?.[0] === n
			: n.type === 'Literal' && typeof n.value === 'string' && inMarkup
		const text = String(n.type === 'TemplateElement' ? n.value.cooked ?? '' : n.value).trim()
		if (opensLine && /^saved\b/.test(text)) fail('a saving reads "Saved"', rel(p), `"${text.slice(0, 60)}"`)
	})
	// <Saving> is the one part that writes a saving; its looks are green when it saves and grey at zero
	const home = join(src, 'app/saving.jsx')
	let looks = null
	if (parsed.has(home)) visit(parsed.get(home), n => { if (n.type === 'VariableDeclarator' && n.id.name === 'LOOK') looks = n.init })
	if (!looks) fail('a saving is green', 'src/app/saving.jsx', 'no LOOK table to read a saving\'s colour from')
	for (const variant of looks?.properties ?? []) for (const state of variant.value.properties ?? []) {
		const green = stringsIn(state.value).some(s => /^(success|sp-stat__delta)$|\bsp-ink-success\b/.test(s))
		if (state.key.name === 'on' && !green) fail('a saving is green', 'src/app/saving.jsx', `${variant.key.name} is not green when it saves`)
		if (state.key.name === 'off' && green) fail('a zero saving is grey', 'src/app/saving.jsx', `${variant.key.name} is green at zero`)
	}
	for (const [p, ast] of parsed) {
		if (p === home) continue
		visit(ast, (n, above) => {
			if (!isTag(n)) return
			const kids = childElements(n)
			if (kids[0]?.type === 'JSXText' && /^\s*Saved\s*$/.test(kids[0].value) && kids[1]?.type === 'JSXExpressionContainer')
				fail('a saving is green', rel(p), '"Saved" and an amount written by hand: use <Saving>')
			if (tagOf(n) === 'Saving' && above.some(a => isTag(a) && hasClass(a, 'sp-meta')))
				fail('a saving sits under its amount', rel(p), 'a <Saving> inside a meta line')
			if (tagOf(n) !== 'Stat') return
			const card = above.findLast(a => isTag(a) && tagOf(a) === 'Card')
			const head = card && childElements(card).flatMap(placed).find(el => tagOf(el) === 'CardHeader')
			const names = [attrOf(n, 'label'), head && attrOf(head, 'name')].filter(a => a?.value).flatMap(a => stringsIn(a.value))
			if (!names.includes('Saved')) return
			const colours = attrOf(n, 'color')?.value ? stringsIn(attrOf(n, 'color').value) : ['default']
			if (!colours.includes('success')) fail('a saving is green', rel(p), '<Stat> named Saved without color="success"')
			else if (colours.every(c => c === 'success')) fail('a zero saving is grey', rel(p), '<Stat> named Saved is green at zero too')
		})
	}
}

/* ---- where an element stands: up its own tree, then out through every place that draws it ---- */

const texts = new Map()
const at = (p, node) => `${rel(p)}:${(texts.get(p) ?? texts.set(p, read(p)).get(p)).slice(0, node.start).split('\n').length}`
// a name's value, from the nearest function above that declares it
const declaredIn = new Map()
const valueOf = (name, above) => {
	for (const scope of [...above].reverse()) {
		if (!isFunction(scope) && scope.type !== 'Program') continue
		if (!declaredIn.has(scope)) {
			const names = new Map()
			visit(scope.body, n => { if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && !names.has(n.id.name)) names.set(n.id.name, n.init) })
			declaredIn.set(scope, names)
		}
		if (declaredIn.get(scope).has(name)) return declaredIn.get(scope).get(name)
	}
}
// a className's classes, through a name it is held in
const classesIn = (el, above) => {
	const value = attrOf(el, 'className')?.value
	if (!value) return []
	const out = stringsIn(value)
	visit(value, n => { if (n.type === 'Identifier') { const held = valueOf(n.name, above); if (held) out.push(...stringsIn(held)) } })
	return out.join(' ').split(/\s+/).filter(Boolean)
}
const sourceOf = (p, from) => {
	const base = resolve(dirname(p), from)
	return [base, `${base}.jsx`, `${base}.js`].find(f => parsed.has(f))
}
const importedFrom = new Map([...parsed].map(([p, ast]) => {
	const names = new Map()
	visit(ast, n => {
		if (n.type !== 'ImportDeclaration' || !n.source.value.startsWith('.')) return
		const from = sourceOf(p, n.source.value)
		if (from) for (const s of n.specifiers) if (s.type === 'ImportSpecifier') names.set(s.local.name, from)
	})
	return [p, names]
}))
const isFunction = n => ['FunctionDeclaration', 'ArrowFunctionExpression', 'FunctionExpression'].includes(n?.type)
const definitionOf = (p, name) => {
	let found = null
	visit(parsed.get(p), n => {
		if (found) return
		if (n.type === 'FunctionDeclaration' && n.id?.name === name) found = n
		if (n.type === 'VariableDeclarator' && n.id.name === name && isFunction(n.init)) found = n.init
	})
	return found
}
// each file's elements by tag and names by name, with what is above them
const indexed = new Map()
const indexOf = p => {
	if (!indexed.has(p)) {
		const index = new Map()
		visit(parsed.get(p), (node, above) => {
			const key = node.type === 'JSXElement' ? `<${tagOf(node)}` : node.type === 'Identifier' ? node.name : null
			if (key) (index.get(key) ?? index.set(key, []).get(key)).push({ p, node, above })
		})
		indexed.set(p, index)
	}
	return indexed.get(p)
}
// a name read as a value, not declared, keyed or reached as a member
const readsName = name => (n, above) => {
	if (n.type !== 'Identifier' || n.name !== name) return false
	const up = above.at(-1)
	if (up?.type === 'VariableDeclarator' && up.id === n) return false
	if (isFunction(up) && (up.id === n || up.params.includes(n))) return false
	if (up?.type === 'MemberExpression' && up.property === n && !up.computed) return false
	if (up?.type === 'Property' && up.key === n && !up.shorthand) return false
	return !['ImportSpecifier', 'ExportSpecifier', 'ImportDefaultSpecifier'].includes(up?.type)
}
const readings = (p, name) => (indexOf(p).get(name) ?? []).filter(o => readsName(name)(o.node, o.above))
const drawnAs = (p, name) => [...parsed.keys()].flatMap(q => (q === p || importedFrom.get(q).get(name) === p)
	? indexOf(q).get(`<${name}`) ?? []
	: [])

// every place the element can end up is inside an element that `holds`; a page's own root is not
const within = (p, above, holds, seen = new Set()) => {
	if (above.some((a, i) => a.type === 'JSXElement' && holds(a, p, above.slice(0, i)))) return true
	const top = above.findIndex(a => a.type === 'JSXElement' || a.type === 'JSXFragment')
	const outside = top < 0 ? above : above.slice(0, top)
	for (let i = outside.length - 1; i >= 0; i--) {
		const a = outside[i]
		if (a.type === 'Property') return false
		const name = a.type === 'VariableDeclarator' && a.id.type === 'Identifier' ? a.id.name
			: a.type === 'FunctionDeclaration' ? a.id?.name : null
		if (!name) continue
		const key = `${p}|${name}`
		if (seen.has(key)) return true
		seen.add(key)
		const component = /^[A-Z]/.test(name) && (a.type === 'FunctionDeclaration' || isFunction(a.init))
		// a component handed on as a value is drawn where this script cannot follow
		if (component && readings(p, name).length) return true
		const places = component ? drawnAs(p, name) : readings(p, name)
		return places.length > 0 && places.every(o => within(o.p, o.above, holds, seen))
	}
	return false
}

// an element is one of `classes` when it carries one, or is a component that draws one
const drawing = classes => {
	const memo = new Map()
	const draws = (el, p, above) => {
		const name = tagOf(el)
		if (!name) return false
		if (/^[a-z]/.test(name)) return classesIn(el, above).some(c => classes.includes(c))
		const home = importedFrom.get(p).get(name) ?? p
		const key = `${home}|${name}`
		if (!memo.has(key)) {
			memo.set(key, false)
			let found = false
			visit(definitionOf(home, name), (n, inside) => { if (!found && n.type === 'JSXElement' && draws(n, home, [parsed.get(home), ...inside])) found = true })
			memo.set(key, found)
		}
		return memo.get(key)
	}
	return draws
}

/* ---- a well sits inside a surface ---- */

{
	const surface = drawing(['sp-card', 'sp-list', 'sp-popover', 'sp-dialog', 'sp-sheet', 'sp-line-editor'])
	for (const [p, ast] of parsed) {
		if (p === join(src, 'components/Well.jsx')) continue
		visit(ast, (n, above) => {
			if (n.type !== 'JSXElement' || (tagOf(n) !== 'Well' && !classesIn(n, above).includes('sp-well'))) return
			if (!within(p, above, surface)) fail('a well sits inside a surface', at(p, n), `<${tagOf(n)}> on the page ground is a card`)
		})
	}
}

/* ---- a screen uses the split body ---- */

{
	// a main column beside a rail; a symmetric grid is a pair of equals, not a screen
	const rail = /grid-template-columns:[^;]*(?:2fr[^;]*1fr|1fr[^;]*(?:max-content|\d+px))/
	const screens = new Set()
	for (const css of [app, ...pages.map(([, css]) => css)])
		for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.([a-z]{2}-[\w-]+)\s*\{([^{}]*)\}/g))
			if (/display:\s*grid/.test(m[2]) && rail.test(m[2])) screens.add(m[1])
	const content = drawing(['sp-card', 'sp-well', 'sp-list'])
	for (const [p, ast] of parsed) visit(ast, (n, above) => {
		if (n.type !== 'JSXElement') return
		const cls = classesIn(n, above).find(c => screens.has(c))
		if (cls && !within(p, above, content)) fail('a screen uses the split body', at(p, n),`.${cls} draws a two-column screen; use the split layout with a <Panel> rail`)
	})
}

/* ---- a readout sits on the bars that place it ---- */

{
	const variants = {}
	visit(parsed.get(charts), n => {
		if (n.type === 'VariableDeclarator' && n.id.name === 'BARS')
			for (const pr of n.init.properties) variants[pr.key.name ?? pr.key.value] = String(pr.value.value ?? '').split(/\s+/).filter(Boolean)
	})
	const css = components + app
	const places = v => (variants[v] ?? []).some(c => new RegExp(`\\.${c} \\.sp-bars__tip \\{[^}]*position: absolute`).test(css))
	// the names known true where the bars are drawn: `touch ? <Bars> : ...`, `touch && <Bars>`
	const holding = (n, above) => above.flatMap((a, i) => {
		const child = above[i + 1] ?? n
		if (a.type === 'ConditionalExpression' && a.consequent === child && a.test.type === 'Identifier') return [a.test.name]
		if (a.type === 'LogicalExpression' && a.operator === '&&' && a.right === child && a.left.type === 'Identifier') return [a.left.name]
		return []
	})
	// a tip left out under one of those names: `touch || column.future ? undefined : <ChartTip>`
	const leftOut = (value, known) => {
		if (value.type !== 'ConditionalExpression' || !(value.consequent.type === 'Identifier' && value.consequent.name === 'undefined')) return false
		const names = t => t.type === 'Identifier' ? [t.name] : t.type === 'LogicalExpression' && t.operator === '||' ? [...names(t.left), ...names(t.right)] : []
		return names(value.test).some(name => known.includes(name))
	}
	for (const [p, ast] of parsed) {
		const declared = new Map()
		visit(ast, n => { if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init) declared.set(n.id.name, [...(declared.get(n.id.name) ?? []), n.init]) })
		visit(ast, (n, above) => {
			if (n.type !== 'JSXElement' || tagOf(n) !== 'Bars') return
			const variant = attrOf(n, 'variant')
			if (variant && variant.value?.type !== 'Literal') return
			if (places(variant?.value.value ?? 'default')) return
			const columns = attrOf(n, 'columns')?.value?.expression
			if (!columns) return
			const known = holding(n, above)
			for (const from of columns.type === 'Identifier' ? declared.get(columns.name) ?? [] : [columns])
				visit(from, m => {
					if (m.type === 'Property' && (m.key.name ?? m.key.value) === 'tip' && !leftOut(m.value, known))
						fail('a readout sits on the plot bars', rel(p), `<Bars variant="${variant?.value.value ?? 'default'}"> with a readout: no rule places one there`)
				})
		})
	}
}

/* ---- a readout is never pinned inside its container ---- */

for (const [p, ast] of parsed) {
	if (stringsIn(ast).some(s => /\bdata-pin\b/.test(s))) fail('tooltips are not held in their container', rel(p), 'data-pin on a readout')
	visit(ast, n => {
		if ((n.type === 'JSXAttribute' && n.name?.name === 'data-pin')
			|| (n.type === 'MemberExpression' && n.property.name === 'pin' && n.object.property?.name === 'dataset'))
			fail('tooltips are not held in their container', rel(p), 'data-pin on a readout')
	})
}
for (const [p, css] of [[join(src, 'styles/app.css'), app], ...pages])
	if (/\[data-pin/.test(css)) fail('tooltips are not held in their container', rel(p), 'a [data-pin] rule')

/* ---- a colour is a colour, on a component that reads one ---- */

{
	const COLOUR_WORD = /^(warning|danger|success|destructive|attention|problem|positive|error)$/
	const IN_CLASS = /\bsp-[\w-]*?--[\w-]*(?:destructive|attention|problem|positive|error)[\w-]*/g
	for (const [p, css] of [[join(src, 'styles/app.css'), app], ...pages])
		for (const m of css.matchAll(IN_CLASS)) fail('a colour is not a variant', rel(p), `.${m[0]} puts a colour in a class name; use [data-color]`)
	for (const [p, ast] of parsed)
		for (const s of stringsIn(ast)) for (const m of s.matchAll(IN_CLASS)) fail('a colour is not a variant', rel(p), `${m[0]}: use color=`)
	for (const [component, props] of Object.entries(sets))
		for (const v of props.variant ?? []) if (COLOUR_WORD.test(v)) fail('a colour is not a variant', component, `variant="${v}": a colour is color=`)

	const reads = new Set([...(components + app).matchAll(/\.(sp-[\w-]+)\[data-color/g)].map(m => m[1]))
	const paints = node => {
		let found = false
		visit(node, n => { if (n.type === 'Property' && (n.key.value ?? n.key.name) === 'data-color') found = true })
		return found
	}
	for (const [p, ast] of parsed) visit(ast, (n, above) => {
		const resolved = node => node?.type === 'Identifier' ? valueOf(node.name, above) : node
		let classes
		if (n.type === 'JSXElement' && /^[a-z]/.test(tagOf(n) ?? '')) {
			if (!n.openingElement.attributes.some(a => (a.type === 'JSXAttribute' && a.name?.name === 'data-color')
				|| (a.type === 'JSXSpreadAttribute' && paints(resolved(a.argument))))) return
			classes = classesIn(n, above)
		} else if (n.type === 'ObjectExpression' && n.properties.some(pr => pr.type === 'Property' && pr.key.value === 'data-color')) {
			const name = n.properties.find(pr => pr.type === 'Property' && (pr.key.name ?? pr.key.value) === 'className')
			if (!name) return
			classes = stringsIn(resolved(name.value)).join(' ').split(/\s+/)
		} else return
		if (!classes.some(c => reads.has(c))) fail('a colour needs a component', at(p, n), `data-color on "${classes.join(' ')}", which no rule colours`)
	})
}

/* ---- the row is one component ---- */

// .sp-line was merged into .sp-list-item; .sp-line-editor is a form and keeps its name
for (const [p, css] of [[join(src, 'styles/app.css'), app], ...pages])
	for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.sp-line(--|__|[\s:.[,{])/g))
		fail('the row is one component', rel(p), `${m[0]} - the row is <ListItem>`)
for (const [p, ast] of parsed)
	for (const s of stringsIn(ast)) for (const m of s.matchAll(/(?<![\w-])\.?sp-line(?:--[\w-]*|__[\w-]*)?(?![\w-])/g))
		fail('the row is one component', rel(p), `${m[0]} - the row is <ListItem>`)

/* ---- a fade is a photo's ---- */

for (const [p, ast] of parsed) visit(ast, (n, above) => {
	if (n.type !== 'JSXElement') return
	const fill = attrOf(n, 'fill')?.value
	if (tagOf(n) === 'Mark' && attrOf(n, 'faded') && !(fill?.type === 'Literal' && fill.value === 'photo'))
		fail('a faded mark is a photo', at(p, n), '<Mark faded> without fill="photo"')
	// Mark draws the fade from its prop, held above
	const classes = p === join(src, 'components/Mark.jsx') ? [] : classesIn(n, above)
	if (classes.includes('sp-mark--faded') && !classes.includes('sp-mark--photo')) fail('a faded mark is a photo', at(p, n), classes.join(' '))
	if (classes.includes('sp-record__photo--faded') && !classes.includes('sp-record__photo')) fail('a faded band photo is a photo', at(p, n), classes.join(' '))
})

/* ---- a part changes only through the design, and takes no page rule ---- */

for (const [p, css] of [[join(src, 'styles/app.css'), app], ...pages])
	for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{};]+)\{([^{}]*)\}/g))
		if (/\.sp-card(--[\w-]+)?\b/.test(m[1]) && /justify-content|align-content/.test(m[2])) fail('a part changes only through the design', rel(p), m[1].trim())
// the page rules the design's own spread, narrow field and reading column replaced
const RETIRED_PAGE_RULES = ['st-w280', 'oc-narrow']
for (const [p, ast] of parsed) {
	for (const s of stringsIn(ast)) {
		const c = s.split(/\s+/)
		if (c.some(x => /^sp-/.test(x)) && c.some(x => RETIRED_PAGE_RULES.includes(x))) fail('a part takes no page rule', rel(p), s.trim())
	}
	visit(ast, (n, above) => {
		if (n.type !== 'JSXElement') return
		const c = classesIn(n, above)
		if (c.some(x => /^sp-/.test(x)) && c.some(x => RETIRED_PAGE_RULES.includes(x))) fail('a part takes no page rule', at(p, n), c.join(' '))
	})
}

/* ---- the Showing bar is a card with a head, its path in the head line ---- */

for (const [p, css] of [[join(src, 'styles/app.css'), app], ...pages])
	if (/sp-crumbs-bar/.test(css)) fail('the Showing bar is a card with a head', rel(p), 'sp-crumbs-bar is back')
for (const [p, ast] of parsed) {
	if (stringsIn(ast).some(s => /\bsp-crumbs-bar\b/.test(s))) fail('the Showing bar is a card with a head', rel(p), 'sp-crumbs-bar is back')
	visit(ast, (n, above) => {
		if (n.type !== 'JSXElement' || tagOf(n) !== 'Crumbs') return
		const card = above.findLast(a => a.type === 'JSXElement' || a.type === 'JSXFragment')
		const headed = card?.type === 'JSXElement' && tagOf(card) === 'Card' && card.children.some(c => placed(c).some(el => tagOf(el) === 'CardHeader'))
		if (!headed) fail('the Showing bar is a card with a head', rel(p), '<Crumbs> not in a <Card> with a <CardHeader>')
		else if (attrOf(card, 'variant')?.value?.value !== 'path') fail('the Showing bar holds its path in the head line when it fits', rel(p), '<Card> holding <Crumbs> without variant="path"')
	})
}

/* ---- a CardHeader is a card's first child, and opens with the name ---- */

{
	// the elements an element is placed straight into, through the names it is held in: { node, child }
	const parentsOf = (p, node, above, seen = new Set()) => {
		const i = above.findLastIndex(a => a.type === 'JSXElement' || a.type === 'JSXFragment')
		if (i >= 0) return [{ parent: above[i], child: above[i + 1] ?? node }]
		const held = above.findLast(a => (a.type === 'VariableDeclarator' && a.id.type === 'Identifier') || a.type === 'FunctionDeclaration')
		const name = held?.id.name
		// a component's root is placed as that component, never as the head itself
		if (!name || /^[A-Z]/.test(name) || seen.has(name)) return [{ parent: null }]
		seen.add(name)
		return readings(p, name).flatMap(o => parentsOf(p, o.node, o.above, seen))
	}
	const opens = (card, child) => card.children.find(c => c.type === 'JSXElement' || (c.type === 'JSXExpressionContainer' && c.expression.type !== 'JSXEmptyExpression')) === child
	for (const [p, ast] of parsed) visit(ast, (n, above) => {
		if (n.type !== 'JSXElement' || tagOf(n) !== 'CardHeader') return
		for (const { parent, child } of parentsOf(p, n, above)) {
			if (parent?.type !== 'JSXElement' || tagOf(parent) !== 'Card') fail('a CardHeader is only a card\'s first child', at(p, n), '<CardHeader> outside a <Card>')
			else if (!opens(parent, child)) fail('a CardHeader is only a card\'s first child', at(p, n), '<CardHeader> after other children of its <Card>')
		}
		const name = attrOf(n, 'name')?.value
		if (!name || (name.type === 'Literal' && !String(name.value).trim())) fail('a CardHeader opens with the name', at(p, n), '<CardHeader> without a name')
	})
}

/* ---- a hover state shows only where a pointer can hover ----
   A phone keeps :hover on the last thing tapped, so every :hover rule the app adds sits under
   @media (hover: hover), as the design's own do. */

for (const [p, css] of [[join(src, 'styles/app.css'), app], ...pages]) {
	let s = css.replace(/\/\*[\s\S]*?\*\//g, '')
	for (let k = s.indexOf('@media (hover: hover)'); k >= 0; k = s.indexOf('@media (hover: hover)')) {
		let j = s.indexOf('{', k), d = 0
		for (; j < s.length; j++) { if (s[j] === '{') d++; else if (s[j] === '}' && --d === 0) break }
		s = s.slice(0, k) + s.slice(j + 1)
	}
	for (const m of s.matchAll(/([^{};]*:hover[^{};]*)\{/g))
		fail('hover only where a pointer hovers', relative(root, p), `${m[1].trim().slice(0, 80)} is outside @media (hover: hover)`)
}

/* ---- the section nav is .sp-section-nav (c35) ----
   A nav beside a page's pane is SectionNav: no page draws its own nav element, and no page
   stylesheet restyles the component. app.css places it in the real window. */

if (!/\.sp-section-nav \{/.test(components)) fail('the section nav is .sp-section-nav', 'src/styles/components.css', 'the component is missing')
for (const p of checked) {
	if (p.includes(`${sep}components${sep}`)) continue
	const text = read(p)
	if (/\bst-subnav\b/.test(text)) fail('the section nav is .sp-section-nav', rel(p), 'uses the retired .st-subnav')
	if (/<nav\b/.test(text)) fail('the section nav is .sp-section-nav', rel(p), 'draws its own nav: use SectionNav')
}
for (const [p, css] of pages) {
	const rules = css.replace(/\/\*[\s\S]*?\*\//g, '')
	if (/\bst-subnav\b/.test(rules)) fail('the section nav is .sp-section-nav', rel(p), 'styles the retired .st-subnav')
	if (/\.sp-section-nav\b/.test(rules)) fail('the section nav is .sp-section-nav', rel(p), 'restyles .sp-section-nav outside components.css and app.css')
}

/* ---- one left column (Layout rules 15a) ----
   The facet rail and the section nav take their width from --rail-left-w in components.css, held
   by the byte copy. No app stylesheet gives either another width. */

for (const [p, css] of [[join(src, 'styles/app.css'), app], ...pages])
	for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]*)\{([^{}]*)\}/g))
		if (/\.sp-(rail|section-nav)(?![\w-])/.test(m[1]) && /(^|;)\s*(min-|max-)?width\s*:/.test(m[2]))
			fail('One left column', rel(p), `${m[1].trim()} sets a width: the left column is --rail-left-w`)

/* ---- one right rail (Layout rules) ----
   The panel takes its width from --rail-right-w and --rail-right-w-wide in components.css, held by
   the byte copy. No app stylesheet gives it another width. */

for (const [p, css] of [[join(src, 'styles/app.css'), app], ...pages])
	for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]*)\{([^{}]*)\}/g))
		if (/\.sp-panel(?![\w-])/.test(m[1]) && /(^|;)\s*(min-|max-)?width\s*:/.test(m[2]))
			fail('One right rail', rel(p), `${m[1].trim()} sets a width: the right rail is --rail-right-w`)

/* ---- one monospaced face (Typography 13b) ----
   --font-mono and the classes that take it are held by the byte copy. fonts.css loads the face at
   400 and 500, no app stylesheet states a monospace stack of its own, a field typed as a code is a
   code field, and a recovery code in its list is .sp-code. */

{
	const fonts = read(join(src, 'styles/fonts.css'))
	for (const weight of [400, 500])
		if (!new RegExp(`font-family:\\s*'Red Hat Mono';[^}]*font-weight:\\s*${weight};`).test(fonts))
			fail('One monospaced face', 'src/styles/fonts.css', `Red Hat Mono ${weight} is not loaded`)
	for (const [p, css] of [[join(src, 'styles/app.css'), app], ...pages])
		if (/font-family:[^;]*monospace/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')))
			fail('One monospaced face', rel(p), 'states a monospace stack: use var(--font-mono)')
	for (const [p, ast] of parsed) {
		if (p.includes(`${sep}components${sep}`)) continue
		visit(ast, n => {
			if (n.type !== 'JSXElement') return
			if (tagOf(n) === 'TextField' && (literalOf(attrOf(n, 'autoCapitalize')) === 'characters' || literalOf(attrOf(n, 'autoComplete')) === 'one-time-code') && !attrOf(n, 'code'))
				fail('One monospaced face', rel(p), 'a code field is a TextField with code')
			if (literalOf(attrOf(n, 'className')) === 'st-codes')
				visit(n, c => { if (c !== n && c.type === 'JSXElement' && !hasClass(c, 'sp-code')) fail('One monospaced face', rel(p), 'a recovery code is not .sp-code') })
		})
	}
}

/* ---- a described choice's second line is grey, as c5 draws it ---- */

for (const p of checked.filter(p => !p.includes(`${sep}components${sep}`)))
	if (/descriptionTone=["{']*help/.test(read(p))) fail('a described choice uses sp-meta', rel(p), 'a Choice describes itself in the help style: leave descriptionTone at meta')

// a clip handed to Motion as a value stays after a move it should have ended with
for (const p of checked.filter(p => p.includes(`${sep}components${sep}`))) {
	const s = read(p)
	if (/transitionEnd/.test(s)) fail('Motion never holds a clip', rel(p), 'uses transitionEnd: set the end value on the element in onAnimationComplete')
	for (const m of s.matchAll(/\b(initial|animate|exit|whileHover|whileTap|whileFocus|whileInView|whileDrag)=\{\{([\s\S]*?)\}\}/g))
		if (/\boverflow[XY]?\s*:/.test(m[2])) fail('Motion never holds a clip', rel(p), `${m[1]} animates overflow`)
	for (const m of s.matchAll(/\banimate\(\s*[\w.]+\s*,\s*\{([^}]*)\}/g))
		if (/\boverflow[XY]?\s*:/.test(m[1])) fail('Motion never holds a clip', rel(p), 'animate() sets overflow')
	if (/style\.overflow\s*=\s*on\b|style\.overflow\s*=\s*'(clip|hidden)'/.test(s) && !/onAnimationComplete/.test(s))
		fail('Motion never holds a clip', rel(p), 'sets a clip on the element and never clears it when the move completes')
}

/* ---- every rule of design/styles/check.js has an answer here ----
   A rule the design adds fails this check until it is placed in DESIGN_RULES: the name of the
   rule here that holds it, COPY, DESIGN or NOT_CHECKED. */

const COPY = 'held by the byte copy of tokens.css and components.css'
const DESIGN = 'about the design\'s own pages, notes, start page or react_handoff, which the app does not ship'
const NOT_CHECKED = 'applies to the app, not checked here yet'
const DESIGN_RULES = {
	'every page is checked': DESIGN,
	'Motion never holds a clip': 'Motion never holds a clip',
	'mark letters reach 4.5:1': COPY,
	'Back is labelled Back': 'Back is labelled Back',
	'figures in an answer fit a phone': COPY,
	'the chat placeholder is one line': COPY,
	'a saved question is cut at the column': COPY,
	'figures in an answer are never cut': COPY,
	'an answer is one text size': COPY,
	'a conversation is the body size': COPY,
	'a wide answer table scrolls in its frame': COPY,
	'every scrolling region shows the shared bar': COPY,
	'the tab bar fits the screen': COPY,
	'the theme is set in Settings only': 'the theme is set in Settings only',
	'nothing but search in the top bar': NOT_CHECKED,
	'no saved row above the field': 'classes resolve',
	'a saved question is capped': 'a saved question is capped',
	'a described choice uses sp-meta': 'a described choice uses sp-meta',
	'a filling text column has no spacer after it': COPY,
	'Status and Kind are selects': 'Status and Kind are selects',
	'one tweak bar on every page': DESIGN,
	'no shortcut badge in a list toolbar': 'no shortcut badge in a list toolbar',
	'a suggestion chip is sp-chip--suggestion': 'a suggestion chip is sp-chip--suggestion',
	'balanced markup': DESIGN,
	'no inline styles': 'no inline style in a page',
	'unique ids': 'unique ids',
	'references resolve': 'references resolve',
	'classes resolve': 'classes resolve',
	'tokens defined': 'tokens defined',
	'a turned icon turns about its own box': COPY,
	'a narrow field fills a half': COPY,
	'a floating layer is never trapped under a stacking context': NOT_CHECKED,
	'a readout sits on the plot bars': 'a readout sits on the plot bars',
	'an open list is not faded': COPY,
	'every fade is a token': COPY,
	'parts read a meaning, not the scale': COPY,
	'fades are told apart': COPY,
	'notes name the fade token': DESIGN,
	'tooltips are not held in their container': 'tooltips are not held in their container',
	'no var() fallbacks': 'no var() fallbacks',
	'bars share one shape': COPY,
	'one rule per selector per scope': COPY,
	'at-rules come after their base': COPY,
	'no duplicate rules': COPY,
	'the hand means a click': COPY,
	'one name per role': COPY,
	'the text red is --red-ink': COPY,
	'a named token exists': DESIGN,
	'every control is named': 'every control is named',
	'a group label is a span': 'a group label is a span',
	'a visible label is bound': 'a visible label is bound',
	'one name per control': 'one name per control',
	'a field label binds its control': 'a field label binds its control',
	'an action reads in sentence case': 'an action reads in sentence case',
	'a colour is not a variant': 'a colour is not a variant',
	'a colour is one we define': 'variant values',
	'a colour needs a component': 'a colour needs a component',
	'the notes name a class that exists': DESIGN,
	'One left column': 'One left column',
	'One right rail': 'One right rail',
	'One monospaced face': 'One monospaced face',
	'one colour vocabulary': DESIGN,
	'mockup mail is example.net': DESIGN,
	'a required marker is an element': 'a required marker is an element',
	'a well sits inside a surface': 'a well sits inside a surface',
	'the row is one component': 'the row is one component',
	'a size is a size, not a place': COPY,
	'a screen uses the split body': 'a screen uses the split body',
	'a title with its second line is sp-stacked': 'a title with its second line is sp-stacked',
	'a card body stack is gap 6': 'a card body stack is gap 6',
	'a card body does not truncate': 'a card body does not truncate',
	'a pair starts with sp-title': 'a pair starts with sp-title',
	'a button beside an input matches its height': 'a button beside an input matches its height',
	'the sidebar foot is the divider, Ask, Settings': 'the sidebar foot is the divider, Ask, Settings',
	'the Views card keeps its rows in edit mode': 'the Views card keeps its rows in edit mode',
	'a body is not nested in a body': 'a body is not nested in a body',
	'a select-all box names its scope': 'a select-all box names its scope',
	'a saving is never a percentage': 'a saving is an amount',
	'a saving reads "Saved"': 'a saving reads "Saved"',
	'HEIC is not offered and never named': 'HEIC is not offered and never named',
	'a saving never says "vs retail"': 'a saving is an amount',
	'a saving is green': 'a saving is green',
	'grey text after an amount is a sp-row-meta column': 'grey text after an amount is a sp-row-meta column',
	'a zero saving is grey': 'a zero saving is grey',
	'a saving is an amount': 'a saving is an amount',
	'a saving sits under its amount': 'a saving sits under its amount',
	'no typographic tells': 'typographic tells',
	'gaps are on the scale': 'spacing on the scale',
	'a page stylesheet states only its own classes': 'page css styles no component',
	'one component per root class': 'one component per root class',
	'one word per object': 'one word per object',
	'no component is only an arrangement': 'no component is only an arrangement',
	'no component is named for a device': 'no component is named for a device',
	'a table aligns with its card': COPY,
	'a stat row aligns to the top': 'a stat row aligns to the top',
	'a faded mark is a photo': 'a faded mark is a photo',
	'a faded band photo is a photo': 'a faded band photo is a photo',
	'an order Categories field has the bulb': 'an order Categories field has the bulb',
	'order details fields in one order': 'order details fields in one order',
	'removed feature leaves no trace': 'removed feature leaves no trace',
	'what is left to check leads the file name': 'what is left to check leads the file name',
	'no head link rule is left': COPY,
	'a card head is the list toolbar height': COPY,
	'the small button height is a token': COPY,
	'the small button height is written with --btn-h-small': COPY,
	'the Showing bar is a card with a head': 'the Showing bar is a card with a head',
	'the Showing bar holds its path in the head line when it fits': 'the Showing bar holds its path in the head line when it fits',
	'a head button keeps its 34px box on touch': COPY,
	'a part changes only through the design': 'a part changes only through the design',
	'a part takes no page rule': 'a part takes no page rule',
	'a row that opens something is drawn as one': 'a row that opens something is drawn as one',
	'every part of a head is centred': COPY,
	'the start page lists each page\'s screens': DESIGN,
	'the start page names only files that exist': DESIGN,
	'the start page counts the screens': DESIGN,
	'the docs name only classes that exist': DESIGN,
	'the docs name only tokens that exist': DESIGN,
	'a field on touch is 16px': COPY,
	'a token field keeps its height': COPY,
	'a loading shape fits its job': 'a loading shape fits its job',
	'a chart label is centred under its bar': COPY,
	'a legend is under its chart': 'a legend is under its chart',
	'a card name is in a CardHeader': 'a card head is CardHeader',
	'a CardHeader takes no other class': 'a card head is CardHeader',
	'a CardHeader is only a card\'s first child': 'a CardHeader is only a card\'s first child',
	'a CardHeader opens with the name': 'a CardHeader opens with the name',
	'a CardHeader is a class, not a structure': COPY,
	'a CardHeader is a component': DESIGN,
	'a CardHeader is only a child of Card': DESIGN,
	'a button beside a field label is xsmall': 'a button beside a field label is xsmall',
	'a checkbox is the input': 'a checkbox is the input',
	'an action is a link or a button': 'an action is a link or a button',
	'an email on one line is .sp-email-line': 'an email on one line is .sp-email-line',
	'a typed value in a sentence is .sp-break': 'a typed value in a sentence is .sp-break',
	'a list row holding a control is .sp-list-item--setting': 'a list row holding a control is .sp-list-item--setting',
	'a top-aligned list row uses sp-list-item--top': 'a top-aligned list row uses sp-list-item--top',
	'an icon in a top-aligned row centres on the first line': COPY,
	'a danger row icon takes the danger ink': COPY,
	'a field tail mark is centred on the field': COPY,
	'hover only where a pointer hovers': 'hover only where a pointer hovers',
	'a switch row is one label': 'a switch row is one label',
	'an alert mark sits on the title line': COPY,
	'a toast icon sits on the first line': COPY,
	'a stretched combobox keeps its chevron at the edge': COPY,
	'a wrapped trail sits in its row': COPY,
	'a shortcut hint is centred in its field': COPY,
	'a stepper shows its digit': COPY,
	'every component prop has JSDoc': 'every component prop has JSDoc',
	'top bar rules reach the screen slot': COPY,
	'one name for full width': 'one name for full width',
	'the section nav is .sp-section-nav': 'the section nav is .sp-section-nav'
}
{
	const designCheck = read(join(root, '../design/styles/check.js'))
	const ruleNames = new Set([...designCheck.matchAll(/fail\('((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, '\'')))
	const ours = new Set([...read(fileURLToPath(import.meta.url)).matchAll(/fail\('((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, '\'')))
	for (const name of ruleNames) {
		const held = DESIGN_RULES[name]
		if (held === undefined) fail('every design rule has an answer here', 'scripts/check-design.mjs', `"${name}" is new in design/styles/check.js: port it, or place it in DESIGN_RULES`)
		else if (![COPY, DESIGN, NOT_CHECKED].includes(held) && !ours.has(held)) fail('every design rule has an answer here', 'scripts/check-design.mjs', `"${name}" names "${held}", which is no rule here`)
	}
	for (const name of Object.keys(DESIGN_RULES))
		if (!ruleNames.has(name)) fail('every design rule has an answer here', 'scripts/check-design.mjs', `"${name}" is no longer in design/styles/check.js: remove it from DESIGN_RULES`)
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
