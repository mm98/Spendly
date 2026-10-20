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
		exports.push({ p, n: fn.id.name, fn, cls: classAttr ? firstWord(classAttr.value) : null })
	})
	const roots = {}
	for (const e of exports) if (e.cls) (roots[e.cls] ||= []).push(e.n)
	for (const [cls, names] of Object.entries(roots))
		if (names.length > 1) fail('one component per root class', 'src/components', `.${cls} is rendered by ${names.join(' and ')}`)

	// a slot that takes a shared primitive for its look is reuse, not a second word for it
	const REUSED = { DialogTitle: 'sp-heading', RangeSlider: 'sp-track', Picker: 'sp-options' }
	for (const [cls, names] of Object.entries(roots))
		for (const n of names) {
			if (REUSED[n] === cls) continue
			const words = n.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(' ')
			if (!words.some(w => cls.includes(w.replace(/s$/, '')))) fail('one word per object', 'src/components', `${n} renders .${cls}`)
		}

	// only an arrangement: no classed element of its own, other components, and no decision
	for (const e of exports) {
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
	'one component per root class': 'one component per root class',
	'one word per object': 'one word per object',
	'no component is only an arrangement': 'no component is only an arrangement',
	'no component is named for a device': 'no component is named for a device',
	'a table aligns with its card': COPY,
	'a stat row aligns to the top': NOT_CHECKED,
	'a faded mark is a photo': NOT_CHECKED,
	'a faded band photo is a photo': NOT_CHECKED,
	'an order Categories field has the bulb': 'an order Categories field has the bulb',
	'order details fields in one order': 'order details fields in one order',
	'removed feature leaves no trace': 'removed feature leaves no trace',
	'what is left to check leads the file name': 'what is left to check leads the file name',
	'no head link rule is left': COPY,
	'a card head is the list toolbar height': COPY,
	'the small button height is a token': COPY,
	'the small button height is written with --btn-h-small': COPY,
	'the Showing bar is a card with a head': NOT_CHECKED,
	'the Showing bar holds its path in the head line when it fits': NOT_CHECKED,
	'a head button keeps its 34px box on touch': COPY,
	'a part changes only through the design': NOT_CHECKED,
	'a part takes no page rule': NOT_CHECKED,
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
