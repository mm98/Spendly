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

// the server sends the design's emails as they are, so its copies match file for file
const emailsOf = dir => readdirSync(dir).filter(n => /\.(html|txt)$/.test(n)).sort()
const designEmails = join(root, '../design/emails'), apiEmails = join(root, '../api/src/emails')
for (const name of new Set([...emailsOf(designEmails), ...emailsOf(apiEmails)]))
	if ((() => { try { return read(join(designEmails, name)) !== read(join(apiEmails, name)) } catch { return true } })())
		fail('copies of the design', `api/src/emails/${name}`, `differs from design/emails/${name}: copy design/emails over api/src/emails`)

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
const RAW_SPACING = { '-4px': 4, '1px': 6, '3px': 3, '-2px': 2, '2px': 2, '-12px': 1, '40px': 2, '16px': 1 }
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
const tagOf = el => el.openingElement.name.name

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

/* ---- where an element stands: up its own tree, then out through every place that draws it ---- */

const texts = new Map()
const at = (p, node) => `${rel(p)}:${(texts.get(p) ?? texts.set(p, read(p)).get(p)).slice(0, node.start).split('\n').length}`
const attrOf = (el, name) => el.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name?.name === name)
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

/* ---- every rule of design/styles/check.js has an answer here ----
   A rule the design adds fails this check until it is placed in DESIGN_RULES: the name of the
   rule here that holds it, COPY, DESIGN or NOT_CHECKED. */

const COPY = 'held by the byte copy of tokens.css and components.css'
const DESIGN = 'about the design\'s own pages, notes, start page or react_handoff, which the app does not ship'
const NOT_CHECKED = 'applies to the app, not checked here yet'
const DESIGN_RULES = {
	'every page is checked': DESIGN,
	'Back is labelled Back': NOT_CHECKED,
	'Status and Kind are selects': NOT_CHECKED,
	'the Go to menu matches the page': DESIGN,
	'no shortcut badge in a list toolbar': NOT_CHECKED,
	'balanced markup': DESIGN,
	'no inline styles': 'no inline style in a page',
	'unique ids': NOT_CHECKED,
	'references resolve': NOT_CHECKED,
	'classes resolve': 'classes resolve',
	'tokens defined': 'tokens defined',
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
	'every control is named': NOT_CHECKED,
	'a group label is a span': NOT_CHECKED,
	'a visible label is bound': NOT_CHECKED,
	'one name per control': NOT_CHECKED,
	'a field label binds its control': NOT_CHECKED,
	'an action reads in sentence case': NOT_CHECKED,
	'a colour is not a variant': 'a colour is not a variant',
	'a colour is one we define': 'variant values',
	'a colour needs a component': 'a colour needs a component',
	'the notes name a class that exists': DESIGN,
	'one colour vocabulary': DESIGN,
	'mockup mail is example.net': DESIGN,
	'a required marker is an element': NOT_CHECKED,
	'a well sits inside a surface': 'a well sits inside a surface',
	'the row is one component': 'the row is one component',
	'a size is a size, not a place': COPY,
	'a screen uses the split body': 'a screen uses the split body',
	'a title with its second line is sp-stacked': NOT_CHECKED,
	'a card body stack is gap 6': NOT_CHECKED,
	'a card body does not truncate': NOT_CHECKED,
	'a pair starts with sp-title': NOT_CHECKED,
	'a button beside an input matches its height': NOT_CHECKED,
	'the sidebar divider sits above Settings': NOT_CHECKED,
	'the Views card keeps its rows in edit mode': NOT_CHECKED,
	'a body is not nested in a body': NOT_CHECKED,
	'a select-all box names its scope': NOT_CHECKED,
	'a saving is never a percentage': 'a saving is an amount',
	'a saving reads "Saved"': NOT_CHECKED,
	'HEIC is not offered and never named': NOT_CHECKED,
	'a saving never says "vs retail"': 'a saving is an amount',
	'a saving is green': NOT_CHECKED,
	'grey text after an amount is a sp-row-meta column': 'grey text after an amount is a sp-row-meta column',
	'a zero saving is grey': NOT_CHECKED,
	'a saving is an amount': 'a saving is an amount',
	'a saving sits under its amount': NOT_CHECKED,
	'no typographic tells': 'typographic tells',
	'gaps are on the scale': 'spacing on the scale',
	'a page stylesheet states only its own classes': 'page css styles no component',
	'one component per root class': NOT_CHECKED,
	'one word per object': NOT_CHECKED,
	'no component is only an arrangement': NOT_CHECKED,
	'no component is named for a device': NOT_CHECKED,
	'a table aligns with its card': COPY,
	'a stat row aligns to the top': NOT_CHECKED,
	'a faded mark is a photo': 'a faded mark is a photo',
	'a faded band photo is a photo': 'a faded band photo is a photo',
	'an order Categories field has the bulb': NOT_CHECKED,
	'order details fields in one order': NOT_CHECKED,
	'removed feature leaves no trace': NOT_CHECKED,
	'what is left to check leads the file name': NOT_CHECKED,
	'no head link rule is left': COPY,
	'a card head is the list toolbar height': COPY,
	'the small button height is a token': COPY,
	'the small button height is written with --btn-h-small': COPY,
	'the Showing bar is a card with a head': 'the Showing bar is a card with a head',
	'the Showing bar holds its path in the head line when it fits': 'the Showing bar holds its path in the head line when it fits',
	'a head button keeps its 34px box on touch': COPY,
	'a part changes only through the design': 'a part changes only through the design',
	'a part takes no page rule': 'a part takes no page rule',
	'a row that opens something is drawn as one': NOT_CHECKED,
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
	'a field tail mark is centred on the field': COPY
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
