import { useLayoutEffect } from 'react'
import { MemoryRouter } from 'react-router'
import { ShellTouch } from '../../react/src/components/Shell.jsx'
import { useShellShape } from '../../react/src/app/useMedia.js'
import { Icon } from '../../react/src/components/Icon.jsx'
import { Kbd } from '../../react/src/components/Utilities.jsx'
import '../../react/src/styles/fonts.css'
import '../../react/src/styles/tokens.css'
import '../../react/src/styles/components.css'
import '../../react/src/styles/app.css'
import '../../react/src/styles/pages.js'
import { drawnArgTypes, lookArgTypes, typeArgTypes } from './types.js'
import { shownArgTypes, variantArgTypes } from './variants.js'

// The app's own switch: tokens.css draws each theme from the root's data-theme, on a body of class sp.
const withTheme = (Story, { globals }) => {
	document.documentElement.dataset.theme = globals.theme ?? 'light'
	document.body.classList.add('sp')
	return <Story />
}

const withRouter = Story => <MemoryRouter><Story /></MemoryRouter>

// The phone shape at the app's own breakpoint, as the app's shell hands it to every part inside it.
const withShape = Story => {
	const touch = useShellShape() === 'touch'
	useLayoutEffect(() => { document.body.classList.toggle('sp-touch', touch) }, [touch])
	return <ShellTouch.Provider value={touch}><Story /></ShellTouch.Provider>
}

// A prop Controls gives as an icon's name or a key's text, drawn as the app draws it there.
const withDrawnParts = (Story, { args, argTypes }) => {
	const drawn = Object.entries(argTypes).filter(([prop, argType]) => argType.drawn && typeof args[prop] === 'string' && args[prop] !== '')
	if (!drawn.length) return <Story />
	return Story({
		args: {
			...args,
			...Object.fromEntries(drawn.map(([prop, { drawn: part }]) =>
				[prop, part.key ? <Kbd>{args[prop]}</Kbd> : <Icon name={args[prop]} size={part.icon} />]))
		}
	})
}

// A component reports a wrong prop with console.error, and only there: a story that logs one
// fails its test, and shows why in the Interactions panel.
let reported = []
const consoleError = console.error
console.error = (...parts) => {
	reported.push(parts.map(String).join(' '))
	consoleError(...parts)
}
const failOnConsoleError = () => {
	if (reported.length) throw new Error(`The story logged an error:\n${reported.join('\n')}`)
}

export default {
	tags: ['autodocs'],
	decorators: [withDrawnParts, withShape, withRouter, withTheme],
	argTypesEnhancers: [shownArgTypes, variantArgTypes, drawnArgTypes, typeArgTypes, lookArgTypes],
	beforeEach: () => { reported = [] },
	afterEach: failOnConsoleError,
	globalTypes: {
		theme: {
			description: 'Light or dark',
			toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true }
		}
	},
	initialGlobals: { theme: 'light', viewport: { value: 'desktop', isRotated: false } },
	parameters: {
		layout: 'padded',
		backgrounds: { disable: true },
		controls: { expanded: true },
		a11y: { test: 'error' },
		viewport: {
			// the sizes the screenshots in docs/ are taken at
			options: {
				phone: { name: 'Phone (iPhone 15)', styles: { width: '393px', height: '852px' }, type: 'mobile' },
				desktop: { name: 'Desktop', styles: { width: '1440px', height: '900px' }, type: 'desktop' }
			}
		}
	}
}
