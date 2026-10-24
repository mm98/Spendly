// The allowed values of each prop a component checks with pick() in variants.js, read from the
// component's own source, so a select control always offers exactly what the component accepts.

const sources = import.meta.glob('../../react/src/components/*.jsx', { query: '?raw', import: 'default', eager: true })

// The keys of the object literal whose opening brace is at `start`, top level only.
const keysOf = (text, start) => {
	const parts = ['']
	let depth = 0
	for (const c of text.slice(start).replace(/\/\/.*$/gm, '')) {
		if ('{[('.includes(c)) depth++
		if ('}])'.includes(c) && --depth === 0) break
		if (depth === 1 && c === ',') parts.push('')
		else if (depth > 0) parts[parts.length - 1] += c
	}
	return parts.map(part => /^\s*\{?\s*(?:'([^']+)'|([\w$]+))\s*:/.exec(part)).filter(Boolean).map(m => m[1] ?? m[2])
}

const options = {}
for (const text of Object.values(sources)) {
	const sets = {}
	for (const m of text.matchAll(/^const ([A-Z_]+) = \{/gm)) sets[m[1]] = keysOf(text, m.index + m[0].length - 1)
	// pick(SET, prop, 'prop', 'Component'): only a prop read straight from the component's props
	for (const [, set, value, prop, component] of text.matchAll(/pick\(([A-Z_]+), (\w+), '(\w+)', '(\w+)'\)/g))
		if (value === prop && sets[set]?.length) (options[component] ??= {})[prop] = sets[set]
}

// A story about another component of the file than the one its file is named for says which in
// parameters.variantsOf.
export const variantArgTypes = ({ component, argTypes, parameters }) => {
	const shown = parameters.variantsOf ?? component
	const own = options[shown?.__docgenInfo?.displayName ?? shown?.name]
	if (!own) return argTypes
	const next = { ...argTypes }
	for (const [prop, values] of Object.entries(own))
		next[prop] = {
			name: prop,
			...next[prop],
			options: values,
			control: { type: values.length > 4 ? 'select' : 'inline-radio' }
		}
	return next
}

// A story about another component of the file takes that component's props as its controls, in
// place of the file's own component's, which it does not draw.
export const shownArgTypes = ({ component, argTypes, parameters, initialArgs = {} }) => {
	const shown = parameters.variantsOf
	const extract = parameters.docs?.extractArgTypes
	if (!shown || shown === component || !extract) return argTypes
	const own = extract(shown) ?? {}
	const next = {}
	for (const [prop, argType] of Object.entries(argTypes))
		if (prop in own || prop in initialArgs || argType.control !== undefined) next[prop] = argType
	for (const [prop, argType] of Object.entries(own)) {
		const told = next[prop] ?? {}
		next[prop] = {
			...told,
			...argType,
			description: told.description || argType.description,
			...(told.control !== undefined ? { control: told.control } : {}),
			...(told.options ? { options: told.options } : {}),
			...(told.if ? { if: told.if } : {})
		}
	}
	return next
}
