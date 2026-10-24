// Builds dtsPropsFor bodies from each exported component's JSDoc @param lines, into .design-sync/.cache/dts.json.
// Run from the repo root after the sync scripts are staged, since ts-morph comes from .ds-sync/node_modules.
import { createRequire } from 'node:module'
const { Project, SyntaxKind } = createRequire(process.cwd() + '/.ds-sync/')('ts-morph')
import fs from 'node:fs'
const dir = 'react/src/components'
const project = new Project({ compilerOptions: { allowJs: true } })
const files = fs.readdirSync(dir).filter(f => /\.jsx?$/.test(f)).map(f => project.addSourceFileAtPath(`${dir}/${f}`))
const lits = {}   // file -> NAME -> [keys]
const literal = n => {
	if (!n) return null
	const k = n.getKind()
	if (k === SyntaxKind.StringLiteral || k === SyntaxKind.NoSubstitutionTemplateLiteral) return `'${n.getLiteralText()}'`
	if (k === SyntaxKind.NumericLiteral) return n.getText()
	return null
}
for (const sf of files) {
	const m = lits[sf.getBaseName()] = {}
	for (const v of sf.getVariableDeclarations()) {
		let init = v.getInitializer(); if (!init) continue
		for (;;) {
			const k = init.getKind()
			if (k === SyntaxKind.ParenthesizedExpression || k === SyntaxKind.AsExpression) init = init.getExpression()
			else if (k === SyntaxKind.CallExpression && /freeze/.test(init.getExpression().getText())) init = init.getArguments()[0]
			else break
		}
		if (init.getKind() === SyntaxKind.ObjectLiteralExpression) m[v.getName()] = { keys: init.getProperties().map(p => p.getName?.()).filter(Boolean).map(n => `'${n.replace(/^['"]|['"]$/g, '')}'`) }
		else if (init.getKind() === SyntaxKind.ArrayLiteralExpression) { const els = init.getElements().map(literal); if (els.every(Boolean)) m[v.getName()] = { items: els } }
	}
}
const typedefs = {}
for (const sf of files) for (const m of sf.getFullText().matchAll(/@typedef \{([^}]+)\} (\w+)/g)) typedefs[m[2]] = { file: sf.getBaseName(), type: m[1] }
const resolveIn = (file, name) => lits[file]?.[name] ?? Object.values(lits).find(x => x[name])?.[name]
const fix = (file, t, misses) => t
	.replace(/import\('\.\/\w+\.jsx'\)\.(\w+)|\b(\w+)\b/g, (s, a, b) => { const n = a ?? b; const d = typedefs[n]; return d && n !== 'IconName' ? d.type.replace(/keyof typeof (\w+)/g, (x, c) => '(' + resolveIn(d.file, c).keys.join(' | ') + ')') : s })
	.replace(/import\('react'\)\./g, 'React.')
	.replace(/import\('\.\/Icon\.jsx'\)\.IconName|\bIconName\b/g, () => resolveIn('Icon.jsx', 'ICONS').keys.join(' | '))
	.replace(/keyof typeof (\w+)/g, (s, n) => { const r = resolveIn(file, n); if (r?.keys) return '(' + r.keys.join(' | ') + ')'; misses.push(s); return 'string' })
	.replace(/typeof (\w+)\[number\]/g, (s, n) => { const r = resolveIn(file, n); if (r?.items) return '(' + r.items.join(' | ') + ')'; misses.push(s); return 'string' })
	.replace(/import\('[^']+'\)\.(\w+)/g, (s, n) => { misses.push(s); return 'any' })
	.replace(/\(([^()|]+)\)(?!\s*=>)/g, (s, inner) => /^'[^']*'$|^[\w.]+$/.test(inner.trim()) ? inner : s)
const out = {}, report = {}
for (const sf of files) {
	for (const [name, decls] of sf.getExportedDeclarations()) {
		if (!/^[A-Z][a-z]/.test(name)) continue
		const d = decls[0]
		const node = d.getKind() === SyntaxKind.VariableDeclaration ? d.getVariableStatement() : d
		const docs = node.getJsDocs?.() ?? []
		const text = docs.map(j => j.getText()).join('\n')
		const params = [...text.matchAll(/@param\s+\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}\s+(\[?)props\.([\w'-]+|'[^']+')(\]?)/g)]
		if (!params.length) continue
		const misses = []
		out[name] = params.map(([, type, opt, prop]) => {
			const key = /^[\w$]+$/.test(prop) ? prop : `'${prop.replace(/'/g, '')}'`
			return `${key}${opt ? '?' : ''}: ${fix(sf.getBaseName(), type.replace(/\s+/g, ' ').trim(), misses)}`
		}).join('; ')
		if (misses.length) report[name] = misses
	}
}
fs.writeFileSync('.design-sync/.cache/dts.json', JSON.stringify(out, null, '\t'))
console.log(Object.keys(out).length, 'components;', 'unresolved:', JSON.stringify(report))
