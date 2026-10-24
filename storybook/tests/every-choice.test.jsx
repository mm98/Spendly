// Every story, drawn once with its own args and once more for each value of each control that offers
// a list of values. Fails when a value crashes the story or makes it log an error, and when the story
// hands the Docs code panel something it cannot write out.

import { act, isValidElement } from 'react'
import { createRoot } from 'react-dom/client'
import { composeStories, setProjectAnnotations } from '@storybook/react'
import { includeConditionalArg } from 'storybook/internal/csf'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import preview from '../.storybook/preview.jsx'

setProjectAnnotations(preview)

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
beforeEach(() => {
	logged.length = 0
	console.error = (...parts) => { logged.push(parts.map(String).join(' ')); consoleError(...parts) }
})
afterEach(() => { console.error = consoleError })

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
			const choices = Object.entries(Story.argTypes ?? {}).filter(([, type]) => Array.isArray(type.options))
			test(name, async () => {
				for (const [prop, type] of [[null, null], ...choices])
					for (const value of prop ? type.options : [undefined]) {
						const args = prop ? shown(Story, { ...Story.args, [prop]: value }) : {}
						logged.length = 0
						const result = await draw(Story, args)
						expect({ [prop ? `${prop}=${JSON.stringify(value)}` : 'as written']: result })
							.toEqual({ [prop ? `${prop}=${JSON.stringify(value)}` : 'as written']: { thrown: [], logged: [], source: null } })
					}
			})
		}
	})
}
