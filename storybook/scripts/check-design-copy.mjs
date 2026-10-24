// Every file in react/src/components that Claude Design hands over in design/react_handoff is the
// same code as the handoff. Comments may differ, since the build may edit JSDoc; the code may not.
// A difference that is known and waiting for Claude Design is listed in design-differences.json
// and reported on every run; a new one, a changed one, or a listed one that is gone fails.
// Run from storybook/: npm run design:check. In CI it also writes the report to the run's summary.

import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import ts from 'typescript'

const design = new URL('../../design/react_handoff/', import.meta.url)
const app = new URL('../../react/src/components/', import.meta.url)
const known = JSON.parse(readFileSync(new URL('../design-differences.json', import.meta.url), 'utf8'))

const read = (dir, name) => readFileSync(new URL(name, dir), 'utf8')
const codeFiles = dir => readdirSync(dir).filter(n => /\.(jsx?|mjs)$/.test(n)).sort()

const parse = (name, text) => ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, name.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.JS)
const printer = ts.createPrinter({ removeComments: true })
const codeOf = (file, node) => printer.printNode(ts.EmitHint.Unspecified, node, file)

// the file's top-level statements by the name they declare, printed without comments
const declarations = (name, text) => {
	const file = parse(name, text)
	const out = new Map()
	file.statements.forEach((s, i) => {
		const named = s.name?.text ?? s.declarationList?.declarations.map(d => d.name.getText(file)).join(', ')
		// a statement that declares nothing is named by its own first line
		const key = named || (ts.isImportDeclaration(s) ? `import ${s.moduleSpecifier.text}` : codeOf(file, s).split('\n')[0].slice(0, 60))
		out.set(out.has(key) ? `${key} (${i + 1})` : key, codeOf(file, s))
	})
	return { file, out }
}

// what a component's comment says it takes: the props.<name> lines under `@param {object} props`
const propsOf = (file, node) => Object.fromEntries(ts.getJSDocTags(node)
	.filter(t => ts.isJSDocParameterTag(t) && t.name.getText(file) === 'props' && t.typeExpression && ts.isJSDocTypeLiteral(t.typeExpression.type))
	.flatMap(t => t.typeExpression.type.jsDocPropertyTags ?? [])
	.map(t => [ts.isQualifiedName(t.name) ? t.name.right.text : t.name.getText(file), t.typeExpression?.type.getText(file) ?? '']))

const components = file => new Map(file.statements
	.filter(s => ts.isFunctionDeclaration(s) && s.name && /^[A-Z]/.test(s.name.text))
	.map(s => [s.name.text, propsOf(file, s)]))

const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 16)

const report = { same: [], comments: [], known: [], failed: [] }
const lines = { failed: [], known: [] }

for (const name of codeFiles(design)) {
	if (!existsSync(new URL(name, app))) {
		report.failed.push(name)
		lines.failed.push(`- **${name}** is in Claude Design but not in the app.`)
		continue
	}
	const ours = read(app, name), theirs = read(design, name)
	if (ours === theirs) { report.same.push(name); continue }
	const a = declarations(name, theirs), b = declarations(name, ours)
	const differs = [...new Set([...a.out.keys(), ...b.out.keys()])].filter(k => a.out.get(k) !== b.out.get(k))
	if (!differs.length) { report.comments.push(name); continue }

	const detail = differs.map(k => !b.out.has(k) ? `\`${k}\` is missing in the app`
		: !a.out.has(k) ? `\`${k}\` is only in the app`
		: `\`${k}\` is written differently`)
	// a prop added, removed or given another type in a component's comment, named on its own
	const ca = components(a.file), cb = components(b.file)
	for (const [component, props] of ca) {
		const mine = cb.get(component)
		if (!mine) continue
		for (const p of Object.keys({ ...props, ...mine }))
			if (!(p in mine)) detail.push(`\`${component}\` has no \`${p}\` in the app`)
			else if (!(p in props)) detail.push(`\`${component}\` has \`${p}\` only in the app`)
			else if (props[p] !== mine[p]) detail.push(`\`${component}\`'s \`${p}\` is \`${props[p]}\` in Claude Design and \`${mine[p]}\` in the app`)
	}

	const now = hash(differs.map(k => `${k}\n${a.out.get(k)}\n${b.out.get(k)}`).join('\n'))
	const entry = known.files?.[name]
	const block = `- **${name}**: ${detail.join('; ')}.`
	if (entry?.hash === now) { report.known.push(name); lines.known.push(block) }
	else {
		report.failed.push(name)
		lines.failed.push(entry
			? `${block} This differs from the difference listed for it in storybook/design-differences.json (\`${entry.hash}\`, now \`${now}\`).`
			: `${block} To list it as waiting for Claude Design, add \`"${name}": { "hash": "${now}" }\` to storybook/design-differences.json.`)
	}
}

// a listed difference that is gone is taken off the list, so the list stays true
for (const name of Object.keys(known.files ?? {}))
	if (!report.known.includes(name) && !report.failed.includes(name)) {
		report.failed.push(name)
		lines.failed.push(`- **${name}** is listed in storybook/design-differences.json, but it is now the same as Claude Design: remove it from the list.`)
	}

// a file only the app has, such as the icon set, is named in the list so a new one is seen
const handed = new Set(codeFiles(design))
const appOnly = codeFiles(app).filter(n => !handed.has(n))
for (const name of appOnly)
	if (!known.appOnly?.includes(name)) {
		report.failed.push(name)
		lines.failed.push(`- **${name}** is in the app's components but not in Claude Design. Only Claude Design adds a component: ask for it there, or add \`"${name}"\` to \`appOnly\` in storybook/design-differences.json if it is not a component.`)
	}

const summary = [
	'## Components against Claude Design',
	'',
	`${report.same.length + report.comments.length} files are the same code as in Claude Design` +
		(report.comments.length ? ` (${report.comments.length} differ only in their comments: ${report.comments.join(', ')})` : '') + '.',
	'',
	...(lines.failed.length ? ['### Not as Claude Design has it', '', ...lines.failed, ''] : []),
	...(lines.known.length ? ['### Known, waiting for Claude Design', '', ...lines.known, ''] : [])
].join('\n')

console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n')
process.exit(report.failed.length ? 1 : 0)
