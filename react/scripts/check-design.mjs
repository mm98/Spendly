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

/* ---- a stack's lines, a pair's first line ---- */

const attrOf = (el, name) => el.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name?.name === name)
// every class string a className can take, one per branch
const classStrings = el => { const a = attrOf(el, 'className'); return a?.value ? stringsIn(a.value).map(s => s.trim()) : [] }
const hasClass = (el, c) => classStrings(el).some(s => s.split(/\s+/).includes(c))
const firstClass = el => classStrings(el).map(s => s.split(/\s+/)[0])
const literalOf = (el, name) => {
	const v = attrOf(el, name)?.value
	return v?.type === 'Literal' ? v.value : v?.type === 'JSXExpressionContainer' && v.expression.type === 'Literal' ? v.expression.value : undefined
}
const childElements = el => el.children.filter(c => !(c.type === 'JSXText' && !c.value.trim()))
const ownText = el => el.children.filter(c => c.type === 'JSXText').map(c => c.value).join('').trim()
const isTag = n => n.type === 'JSXElement' && n.openingElement.name.type === 'JSXIdentifier'
const CONTROL_PARTS = ['Button', 'IconButton', 'TextField', 'PasswordField', 'NumberField', 'SearchInput', 'TokensField', 'RangeSlider', 'Field', 'FieldGroup',
	'Gauge', 'Segmented', 'Stepper', 'Switch', 'Check', 'Radio', 'Choice', 'Chip', 'Picker', 'Combobox', 'DateField', 'PeriodPicker', 'Bars', 'Donut', 'Plot',
	'List', 'ListItem', 'Records', 'Shares', 'LineEditor', 'ThemeTiles', 'Well', 'Card', 'Cards', 'input', 'select', 'textarea', 'button']
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
			if (tagOf(m) === 'Button' && ['small', 'xsmall'].includes(literalOf(m, 'size'))) small = true
		})
		if (!apart && input && small) fail('a button beside an input matches its height', rel(p), 'a small button on a line with an input: use the standard size')
	})
}

/* ---- the sidebar's divider sits above Settings ---- */

for (const [p, ast] of parsed) visit(ast, (n, above) => {
	if (n.type !== 'JSXElement' || !above.some(a => isTag(a) && tagOf(a) === 'Sidebar') && !(isTag(n) && tagOf(n) === 'Sidebar')) return
	const kids = childElements(n)
	kids.forEach((c, i) => {
		if (!placed(c).some(el => ownText(el) === 'Settings' && /\/settings$/.test(literalOf(el, 'to') ?? ''))) return
		if (!placed(kids[i - 1]).some(el => tagOf(el) === 'SidebarDivider')) fail('the sidebar divider sits above Settings', rel(p), 'Settings does not follow a <SidebarDivider>')
	})
})

/* ---- the Views card lists in the same rows at rest and in edit mode ---- */

for (const [p, ast] of parsed) visit(ast, n => {
	if (!isTag(n) || tagOf(n) !== 'Card') return
	const kids = childElements(n).filter(c => c.type !== 'JSXExpressionContainer' || c.expression.type !== 'JSXEmptyExpression')
	const at = kids.findIndex(c => placed(c).some(el => tagOf(el) === 'CardHeader' && literalOf(el, 'name') === 'Views'))
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
		drawn(n.children, p, m => { if (isTag(m) && tagOf(m) === 'CardHeader' && OPENS.includes(String(literalOf(m, 'name')).toLowerCase())) named = true })
		if (!named) return
		drawn(n.children, p, m => {
			if (!isTag(m) || !classStrings(m).some(s => /^(sp-stack sp-gap-6|sp-row-flex sp-gap-12)(\s|$)/.test(s))) return
			// a loading shape is no row yet
			if (opens(m) || attrOf(m, 'aria-hidden')) return
			let holds = false, loading = false
			drawn(m.children, p, k => {
				if (!isTag(k)) return
				if (tagOf(k) === 'Gauge' || (tagOf(k) === 'Mark' && literalOf(k, 'size') === 'medium')) holds = true
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
	'a readout sits on the plot bars': NOT_CHECKED,
	'an open list is not faded': COPY,
	'every fade is a token': COPY,
	'parts read a meaning, not the scale': COPY,
	'fades are told apart': COPY,
	'notes name the fade token': DESIGN,
	'tooltips are not held in their container': NOT_CHECKED,
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
	'a colour is not a variant': NOT_CHECKED,
	'a colour is one we define': 'variant values',
	'a colour needs a component': NOT_CHECKED,
	'the notes name a class that exists': DESIGN,
	'one colour vocabulary': DESIGN,
	'mockup mail is example.net': DESIGN,
	'a required marker is an element': NOT_CHECKED,
	'a well sits inside a surface': NOT_CHECKED,
	'the row is one component': NOT_CHECKED,
	'a size is a size, not a place': COPY,
	'a screen uses the split body': NOT_CHECKED,
	'a title with its second line is sp-stacked': 'a title with its second line is sp-stacked',
	'a card body stack is gap 6': 'a card body stack is gap 6',
	'a card body does not truncate': 'a card body does not truncate',
	'a pair starts with sp-title': 'a pair starts with sp-title',
	'a button beside an input matches its height': 'a button beside an input matches its height',
	'the sidebar divider sits above Settings': 'the sidebar divider sits above Settings',
	'the Views card keeps its rows in edit mode': 'the Views card keeps its rows in edit mode',
	'a body is not nested in a body': 'a body is not nested in a body',
	'a select-all box names its scope': NOT_CHECKED,
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
	'one component per root class': NOT_CHECKED,
	'one word per object': NOT_CHECKED,
	'no component is only an arrangement': NOT_CHECKED,
	'no component is named for a device': NOT_CHECKED,
	'a table aligns with its card': COPY,
	'a stat row aligns to the top': 'a stat row aligns to the top',
	'a faded mark is a photo': NOT_CHECKED,
	'a faded band photo is a photo': NOT_CHECKED,
	'an order Categories field has the bulb': NOT_CHECKED,
	'order details fields in one order': NOT_CHECKED,
	'removed feature leaves no trace': NOT_CHECKED,
	'what is left to check leads the file name': NOT_CHECKED,
	'no head link rule is left': COPY,
	'a card head is the list toolbar height': COPY,
	'the small button height is a token': COPY,
	'the small button height is written with --btn-h-small': COPY,
	'the Showing bar is a card with a head': NOT_CHECKED,
	'the Showing bar holds its path in the head line when it fits': NOT_CHECKED,
	'a head button keeps its 34px box on touch': COPY,
	'a part changes only through the design': NOT_CHECKED,
	'a part takes no page rule': NOT_CHECKED,
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
	'a CardHeader is only a card\'s first child': NOT_CHECKED,
	'a CardHeader opens with the name': NOT_CHECKED,
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
