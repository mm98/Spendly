// Every story, drawn once with its own args, once more for each value of each control that offers a
// list of values, and once with each text box of a prop it may leave out emptied. Fails when one
// crashes the story or makes it log an error or a warning, and when the story hands the Docs code
// panel something it cannot write out.

import { act, isValidElement } from 'react'
import { createRoot } from 'react-dom/client'
import { composeStories, setProjectAnnotations } from '@storybook/react'
import { includeConditionalArg } from 'storybook/internal/csf'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import * as argTypesFromTypes from '@storybook/react/entry-preview-argtypes'
import preview from '../.storybook/preview.jsx'

// the controls Storybook builds from each component's types, then the project's own rules
setProjectAnnotations([argTypesFromTypes, preview])

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const files = import.meta.glob('../stories/*.stories.jsx', { eager: true })

// What the code panel writes out: elements, text, numbers and lists of them. Anything else stops it.
const unwritable = (node, path = 'story') => {
	if (node == null || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') return null
	if (Array.isArray(node)) return node.map((child, i) => unwritable(child, `${path}[${i}]`)).find(Boolean) ?? null
	if (!isValidElement(node)) return `${path} is not an element`
	const { children } = node.props ?? {}
	return typeof children === 'function' ? null : unwritable(children, `${path} > ${node.type?.displayName ?? node.type?.name ?? String(node.type)}`)
}

// the same call the code panel makes for its text
const sources = []
const writeOut = (Story, context) => {
	sources.push(unwritable(context.originalStoryFn(context.args, context)))
	return <Story />
}

const logged = []
const consoleError = console.error
const consoleWarn = console.warn
beforeEach(() => {
	logged.length = 0
	console.error = (...parts) => { logged.push(parts.map(String).join(' ')); consoleError(...parts) }
	console.warn = (...parts) => { logged.push(parts.map(String).join(' ')); consoleWarn(...parts) }
})
afterEach(() => { console.error = consoleError; console.warn = consoleWarn })

// Storybook leaves out an arg whose argType's `if` does not hold; a story is drawn with the rest.
const shown = (Story, args) => Object.fromEntries(Object.entries(args).map(([key, value]) =>
	[key, includeConditionalArg(Story.argTypes[key] ?? {}, args, Story.globals) ? value : undefined]))

const draw = async (Story, args) => {
	const host = document.body.appendChild(document.createElement('div'))
	const thrown = []
	const root = createRoot(host, { onUncaughtError: error => thrown.push(error), onCaughtError: error => thrown.push(error) })
	sources.length = 0
	try {
		await act(async () => root.render(<Story {...args} />))
	} finally {
		await act(async () => root.unmount())
		host.remove()
		document.querySelectorAll('body > *:not(script)').forEach(el => el !== host && el.childElementCount === 0 && el.remove())
	}
	return { thrown: thrown.map(String), logged: [...logged], source: sources.find(Boolean) ?? null }
}

for (const [file, module] of Object.entries(files)) {
	const stories = composeStories(module, { decorators: [writeOut] })
	describe(file.replace('../stories/', ''), () => {
		for (const [name, Story] of Object.entries(stories)) {
			const choices = Object.entries(Story.argTypes ?? {}).flatMap(([prop, type]) =>
				Array.isArray(type.options) ? [[prop, type.options]]
					: type.control?.type === 'text' && !type.control.disable ? [[prop, ['']]]
						: [])
			test(name, async () => {
				for (const [prop, values] of [[null, [undefined]], ...choices])
					for (const value of values) {
						const args = prop ? shown(Story, { ...Story.args, [prop]: value }) : {}
						logged.length = 0
						const result = await draw(Story, args)
						// an emptied text the component needs is its own "needs" message, which is right; a value
						// outside a fixed set, a crash or a warning from React is not
						if (value === '') result.logged = result.logged.filter(line => !line.startsWith('<') || line.includes('is not one of'))
						const key = prop ? `${prop}=${JSON.stringify(value)}` : 'as written'
						expect({ [key]: result }).toEqual({ [key]: { thrown: [], logged: [], source: null } })
					}
			})
		}
	})
}
