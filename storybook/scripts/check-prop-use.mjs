// Every place in react/src that draws a component gives each prop the kind of value the
// component's type comment asks for: a switch gets true or false, a choice one of its values, a
// handler a function. Storybook draws a part with its own settings, never the page's, so a page
// that hands a part the wrong kind of value is only seen here. A value the check cannot tell
// the kind of from the code (a variable, a call) is left alone.
// Run from storybook/: npm run props:check. In CI it also writes the report to the run's summary.

import { appendFileSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const src = join(root, 'react/src')
const componentsDir = join(src, 'components')
const known = new Set(JSON.parse(readFileSync(join(root, 'storybook/design-differences.json'), 'utf8')).propUse ?? [])

const walk = dir => readdirSync(dir).flatMap(name => {
	const p = join(dir, name)
	return statSync(p).isDirectory() ? walk(p) : [p]
})
const parse = p => ts.createSourceFile(p, readFileSync(p, 'utf8'), ts.ScriptTarget.Latest, true, p.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.JS)

/* ---- what each component takes ---- */

// the top-level keys of `const NAME = { ... }`, for a type written `keyof typeof NAME`
const objectKeys = file => Object.fromEntries(file.statements.filter(ts.isVariableStatement)
	.flatMap(s => s.declarationList.declarations)
	.filter(d => ts.isIdentifier(d.name) && d.initializer && ts.isObjectLiteralExpression(d.initializer))
	.map(d => [d.name.text, d.initializer.properties.map(p => p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) || ts.isNumericLiteral(p.name)) ? p.name.text : null).filter(Boolean)]))

// the values of `const NAME = [ 'a', 'b' ]`, for a type written `typeof NAME[number]`
const arrayValues = file => Object.fromEntries(file.statements.filter(ts.isVariableStatement)
	.flatMap(s => s.declarationList.declarations)
	.filter(d => ts.isIdentifier(d.name) && d.initializer && ts.isArrayLiteralExpression(d.initializer)
		&& d.initializer.elements.every(e => ts.isStringLiteral(e)))
	.map(d => [d.name.text, d.initializer.elements.map(e => e.text)]))

// One accepted kind per part of the type: boolean, string, number, function, node, or a set of
// words. A part the check cannot read accepts anything, so only a type it understands can fail.
const kindsOf = (type, file, keys, values) => {
	if (!type) return null
	if (ts.isParenthesizedTypeNode(type)) return kindsOf(type.type, file, keys, values)
	if (ts.isUnionTypeNode(type)) {
		const parts = type.types.map(t => kindsOf(t, file, keys, values))
		return parts.includes(null) ? null : parts.flat()
	}
	if (type.kind === ts.SyntaxKind.BooleanKeyword) return ['boolean']
	if (type.kind === ts.SyntaxKind.StringKeyword) return ['string']
	if (type.kind === ts.SyntaxKind.NumberKeyword) return ['number']
	if (type.kind === ts.SyntaxKind.NullKeyword || type.kind === ts.SyntaxKind.UndefinedKeyword) return ['empty']
	if (ts.isFunctionTypeNode(type)) return ['function']
	if (ts.isLiteralTypeNode(type)) {
		if (ts.isStringLiteral(type.literal)) return [{ word: type.literal.text }]
		if (type.literal.kind === ts.SyntaxKind.NullKeyword) return ['empty']
		if (type.literal.kind === ts.SyntaxKind.TrueKeyword || type.literal.kind === ts.SyntaxKind.FalseKeyword) return ['boolean']
		return null
	}
	const text = type.getText(file)
	if (/^import\('react'\)\.ReactNode$/.test(text)) return ['node']
	const key = /^keyof typeof (\w+)$/.exec(text)
	if (key && keys[key[1]]) return keys[key[1]].map(word => ({ word }))
	const item = /^typeof (\w+)\[number\]$/.exec(text)
	if (item && values[item[1]]) return values[item[1]].map(word => ({ word }))
	return null
}

// `@param {object} props` and the `props.<name>` lines under it, as [name, type]
const propTags = fn => ts.getJSDocTags(fn)
	.filter(t => ts.isJSDocParameterTag(t) && t.name.getText() === 'props' && t.typeExpression && ts.isJSDocTypeLiteral(t.typeExpression.type))
	.flatMap(t => t.typeExpression.type.jsDocPropertyTags ?? [])
	.map(t => [ts.isQualifiedName(t.name) ? t.name.right.text : t.name.getText(), t.typeExpression?.type])

const components = new Map()
for (const p of walk(componentsDir).filter(p => p.endsWith('.jsx'))) {
	const file = parse(p)
	const keys = objectKeys(file), values = arrayValues(file)
	for (const s of file.statements) {
		if (!ts.isFunctionDeclaration(s) || !s.name || !/^[A-Z]/.test(s.name.text)) continue
		const props = Object.fromEntries(propTags(s).map(([name, type]) => [name, kindsOf(type, file, keys, values)]))
		// a component that hands the rest of its props on takes any HTML attribute too, and one with
		// no prop list in its comment is not checked for unknown props
		const param = s.parameters[0]?.name
		const rest = !Object.keys(props).length || !param || !ts.isObjectBindingPattern(param) || param.elements.some(e => e.dotDotDotToken)
		components.set(`${p}#${s.name.text}`, { name: s.name.text, file: relative(root, p), props, rest })
	}
}

/* ---- every place that draws one ---- */

const kindOfValue = init => {
	if (!init) return 'boolean'
	if (ts.isStringLiteral(init)) return { word: init.text }
	if (ts.isJsxElement(init) || ts.isJsxSelfClosingElement(init) || ts.isJsxFragment(init)) return 'element'
	if (!ts.isJsxExpression(init) || !init.expression) return null
	let e = init.expression
	while (ts.isParenthesizedExpression(e)) e = e.expression
	if (e.kind === ts.SyntaxKind.TrueKeyword || e.kind === ts.SyntaxKind.FalseKeyword) return 'boolean'
	if (e.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(e) && e.text === 'undefined')) return 'empty'
	if (ts.isNumericLiteral(e)) return { number: e.text }
	if (ts.isPrefixUnaryExpression(e) && ts.isNumericLiteral(e.operand)) return 'number'
	if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return { word: e.text }
	if (ts.isTemplateExpression(e)) return 'string'
	if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) return 'function'
	if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e) || ts.isJsxFragment(e)) return 'element'
	if (ts.isObjectLiteralExpression(e)) return 'object'
	if (ts.isArrayLiteralExpression(e)) return 'array'
	return null
}

// a number written in the code is a number, and also the key it names in `keyof typeof NAME`
const accepts = (kinds, value) => kinds.some(k => {
	if (value === 'empty') return true
	if (value?.number) return k === 'number' || k === 'node' || (typeof k === 'object' && k.word === value.number)
	if (typeof value === 'object') return k === 'string' || k === 'node' || (typeof k === 'object' && k.word === value.word)
	if (k === 'node') return value !== 'function' && value !== 'object'
	return k === value
})

const said = value => value?.number ? 'a number' : typeof value === 'object' ? `the words '${value.word}'`
	: { boolean: 'a switch (true or false)', element: 'a drawn part', number: 'a number', string: 'text', function: 'a function', object: 'an object', array: 'a list' }[value]
const wanted = kinds => kinds.map(k => typeof k === 'object' ? `'${k.word}'` : { boolean: 'true or false', string: 'text', number: 'a number', function: 'a function', node: 'a drawn part or text', empty: 'nothing' }[k]).join(', ')

const findings = [], listed = [], seen = new Set()
const found = (p, what, line) => {
	const key = `${relative(root, p)}: ${what}`
	seen.add(key)
	if (known.has(key)) listed.push(line)
	else findings.push(`${line} To list it as waiting for an answer, add \`"${key}"\` to propUse in storybook/design-differences.json.`)
}
for (const p of walk(src).filter(p => /\.jsx?$/.test(p))) {
	const file = parse(p)
	// the names this file imports from a component file, mapped to the component
	const local = new Map()
	for (const s of file.statements) {
		if (!ts.isImportDeclaration(s) || !s.importClause?.namedBindings || !ts.isNamedImports(s.importClause.namedBindings)) continue
		const from = s.moduleSpecifier.text
		if (!from.startsWith('.')) continue
		const target = resolve(dirname(p), from)
		for (const el of s.importClause.namedBindings.elements) {
			const c = components.get(`${target}#${(el.propertyName ?? el.name).text}`)
			if (c) local.set(el.name.text, c)
		}
	}
	if (!local.size) continue
	const visit = node => {
		if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
			const c = ts.isIdentifier(node.tagName) ? local.get(node.tagName.text) : null
			if (c) for (const attr of node.attributes.properties) {
				if (!ts.isJsxAttribute(attr)) continue
				const prop = attr.name.getText(file)
				const where = `${relative(root, p)}:${file.getLineAndCharacterOfPosition(attr.getStart(file)).line + 1}`
				if (!(prop in c.props)) {
					if (!c.rest && !['key', 'ref', 'children'].includes(prop))
						found(p, `<${c.name} ${prop}> is not a prop`, `- \`${where}\`: \`<${c.name}>\` has no \`${prop}\` (${c.file}), so the value is dropped.`)
					continue
				}
				const kinds = c.props[prop], value = kindOfValue(attr.initializer)
				if (kinds && value && !accepts(kinds, value))
					found(p, `<${c.name} ${prop}> is given ${said(value)}`, `- \`${where}\`: \`<${c.name} ${prop}>\` is given ${said(value)}, and takes ${wanted(kinds)} (${c.file}).`)
			}
		}
		ts.forEachChild(node, visit)
	}
	visit(file)
}

for (const key of known)
	if (!seen.has(key)) findings.push(`- \`${key}\` is listed under propUse in storybook/design-differences.json, but it is not found any more: remove it from the list.`)

const summary = [
	'## How the pages use the components',
	'',
	`The props of ${components.size} components, at every place they are drawn, against the kind of value each type comment asks for, where the code shows the kind.`,
	'',
	...(findings.length ? ['### Given the wrong kind of value', '', ...findings, ''] : []),
	...(listed.length ? ['### Known, waiting for an answer', '', ...listed, ''] : [])
].join('\n')

console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n')
process.exit(findings.length ? 1 : 0)
