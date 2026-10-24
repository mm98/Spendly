// The control for each prop, from the type comment the component gives it. Two cases the reader
// leaves as "Set object" are settled here:
// - content (text or other parts drawn inside): a text box when the story gives it words, else no
//   control, since a part is not typed into a box;
// - a prop with no type comment: its kind is read from its default, else from the story's value.

import { LOCALES } from '../../react/src/api/format.js'

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
		if (prop === 'locale' && argType.control === undefined) {
			// the ways of writing numbers and dates an account can choose; none is the browser's own
			next[prop] = { ...argType, options: LOCALES.map(l => l.code).filter(code => code !== 'auto'), control: { type: 'select' } }
			continue
		}
		if (argType.options || argType.control !== undefined) continue
		if (CONTENT.test(argType.table?.type?.summary ?? '')) {
			next[prop] = { ...argType, control: typeof initialArgs[prop] === 'string' ? { type: 'text' } : false }
			continue
		}
		// one allowed value: a choice of it or nothing, never a box that takes any text
		const only = [argType.type?.raw, argType.type?.name, argType.table?.type?.summary]
			.map(text => /^(["'])([^"']*)\1$/.exec(text ?? '')).find(Boolean)
		if (only) {
			next[prop] = { ...argType, options: [only[2]], control: { type: 'select' } }
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

// Controls and the props table hold what changes how the part looks. A plain HTML attribute, a
// handle on an element, or a handler is wiring: it stays out of both, and a handler's calls still
// show in Actions. `name` is wiring except where the part draws it as text.
const WIRING = /^(id|name|key|ref|role|tabIndex|htmlFor|form|autoComplete|autoFocus|required|aria-.*|data-.*|on[A-Z].*|\w+Ref)$/
const DRAWN_NAME = ['CardHeader', 'Attachment', 'Crumb', 'ChatChart', 'SidebarAccount']

export const lookArgTypes = ({ component, argTypes, parameters }) => {
	const shown = parameters.variantsOf ?? component
	const named = DRAWN_NAME.includes(shown?.__docgenInfo?.displayName ?? shown?.name)
	const next = { ...argTypes }
	for (const prop of Object.keys(argTypes))
		if (WIRING.test(prop) && !(prop === 'name' && named))
			next[prop] = { ...argTypes[prop], control: false, table: { ...argTypes[prop].table, disable: true } }
	return next
}
