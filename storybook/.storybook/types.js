// The control for each prop, from the type comment the component gives it. The cases the reader
// leaves as "Set object" are settled here:
// - an icon name or a drawn icon: a choice of the icon names;
// - words or parts (ReactNode): a text box, since words are always allowed, unless the story draws a part;
// - parts only (ReactElement): no control, since a part is not typed into a box;
// - a prop with no type comment: its kind is read from its default, else from the story's value.

import { LOCALES } from '../../react/src/api/format.js'
import { ICONS } from '../../react/src/components/icons.js'

const WORDS = /\bReactNode\b/
const PARTS = /\bReactElement\b/
const ICON_NAMES = Object.keys(ICONS)
// the quoted values of a union, which the reader cuts short after the first few
// the reader writes a part's type out in full, which says nothing more than its name
const short = summary => summary.replaceAll('ReactElement<any, string | JSXElementConstructor<any>>', 'ReactElement')
const literals = text => [...(text ?? '').matchAll(/"([^"]+)"/g)].map(m => m[1])

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
		const summary = argType.table?.type?.summary ?? ''
		const named = literals(typeof argType.type?.value === 'string' ? argType.type.value : summary)
		if (PARTS.test(summary) && named.length && named.every(name => ICON_NAMES.includes(name))) {
			next[prop] = { ...argType, options: ICON_NAMES, control: { type: 'select' }, table: { ...argType.table, type: { summary: 'IconName | ReactElement' } } }
			continue
		}
		if (WORDS.test(summary)) {
			// a story that draws a part here keeps it: the box would show the part as code
			const drawn = initialArgs[prop] != null && typeof initialArgs[prop] !== 'string'
			next[prop] = { ...argType, control: drawn ? false : { type: 'text' } }
			continue
		}
		if (PARTS.test(summary)) {
			next[prop] = { ...argType, control: false, table: { ...argType.table, type: { summary: short(summary) } } }
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
// what the part around a control hands it (a Field, a List, a Combobox), never set by a story
const HANDED = {
	Combobox: ['trail', 'unit'],
	Slot: ['lead', 'trail', 'unit'],
	Stepper: ['fieldLabel'],
	ListCell: ['column', 'head', 'selectedCount', 'total', 'noun', 'checked', 'labelledBy', 'to'],
	ComboboxOption: ['active']
}

export const lookArgTypes = ({ component, argTypes, parameters }) => {
	const shown = parameters.variantsOf ?? component
	const shownName = shown?.__docgenInfo?.displayName ?? shown?.name
	const named = DRAWN_NAME.includes(shownName)
	const next = { ...argTypes }
	for (const prop of Object.keys(argTypes))
		if ((WIRING.test(prop) && !(prop === 'name' && named)) || HANDED[shownName]?.includes(prop))
			next[prop] = { ...argTypes[prop], control: false, table: { ...argTypes[prop].table, disable: true } }
	return next
}
