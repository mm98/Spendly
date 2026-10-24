// The control for each prop, from the type comment the component gives it. Two cases the reader
// leaves as "Set object" are settled here:
// - content (text or other parts drawn inside): a text box when the story gives it words, else no
//   control, since a part is not typed into a box;
// - a prop with no type comment: its kind is read from its default, else from the story's value.

const CONTENT = /\bReact(Node|Element)\b/

const kindOfDefault = summary => {
	if (summary === 'true' || summary === 'false') return 'boolean'
	if (summary !== '' && !Number.isNaN(Number(summary))) return 'number'
	if (/^(['"`]).*\1$/.test(summary ?? '')) return 'string'
	return null
}

const kindOfValue = value => ['boolean', 'number', 'string'].includes(typeof value) ? typeof value : null

const CONTROLS = { boolean: 'boolean', number: 'number', string: 'text' }

const untyped = argType => !argType.type?.name || (argType.type.name === 'other' && argType.type.value === 'any')

export const typeArgTypes = ({ argTypes, initialArgs = {} }) => {
	const next = { ...argTypes }
	for (const [prop, argType] of Object.entries(argTypes)) {
		if (argType.options || argType.control !== undefined) continue
		if (CONTENT.test(argType.table?.type?.summary ?? '')) {
			next[prop] = { ...argType, control: typeof initialArgs[prop] === 'string' ? { type: 'text' } : false }
			continue
		}
		if (!untyped(argType)) continue
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
