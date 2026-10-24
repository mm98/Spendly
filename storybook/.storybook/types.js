// The kind of each prop, for the Controls panel and the Docs table. The components declare no types,
// so Storybook knows a prop's default but not its kind, and offers "Set object" for all of them.
// The kind is read from the default the component gives the prop, else from the value the story
// gives it: a number box, a switch or a text box.

const kindOfDefault = summary => {
	if (summary === 'true' || summary === 'false') return 'boolean'
	if (summary !== '' && !Number.isNaN(Number(summary))) return 'number'
	if (/^(['"`]).*\1$/.test(summary ?? '')) return 'string'
	return null
}

const kindOfValue = value => ['boolean', 'number', 'string'].includes(typeof value) ? typeof value : null

const CONTROLS = { boolean: 'boolean', number: 'number', string: 'text' }

export const typeArgTypes = ({ argTypes, initialArgs = {} }) => {
	const next = { ...argTypes }
	for (const [prop, argType] of Object.entries(argTypes)) {
		if (argType.options) {
			next[prop] = { ...argType, table: { ...argType.table, type: { summary: argType.options.map(value => `'${value}'`).join(' | ') } } }
			continue
		}
		if (argType.type?.name || argType.control !== undefined) continue
		const kind = kindOfDefault(argType.table?.defaultValue?.summary) ?? kindOfValue(initialArgs[prop])
		if (!kind) continue
		next[prop] = {
			...argType,
			type: { ...argType.type, name: kind },
			control: { type: CONTROLS[kind] },
			table: { ...argType.table, type: { summary: kind } }
		}
	}
	return next
}
