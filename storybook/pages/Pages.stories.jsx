import { useState } from 'react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { userEvent, waitFor } from 'storybook/test'
import { routes } from '../../react/src/routes.jsx'
import { forgetAll } from '../../react/src/api/useApi.js'
import kept from './answers.json'
import { PAGE_STATES, nameOf, pathOf, pressOn } from './states.js'
import { serveAnswers, setClock } from './serve.js'

// The app's own pages, drawn by its own routes and shell from answers kept from a real account
// (pages/states.js says which, scripts/record-pages.mjs keeps them). A part looks right on its own
// in its story and can still be drawn wrong by the page that sets it up: these show the page.
// Chromatic takes each one on a phone and a computer, light and dark.

const Page = ({ path }) => {
	const [router] = useState(() => createMemoryRouter(routes, { initialEntries: [path] }))
	return <RouterProvider router={router} />
}

export default {
	title: 'Pages',
	component: Page,
	parameters: {
		layout: 'fullscreen',
		ownRouter: true,
		controls: { disable: true },
		chromatic: {
			modes: {
				'computer light': { viewport: 'desktop', theme: 'light' },
				'computer dark': { viewport: 'desktop', theme: 'dark' },
				'phone light': { viewport: 'phone', theme: 'light' },
				'phone dark': { viewport: 'phone', theme: 'dark' }
			}
		}
	},
	tags: ['!autodocs']
}

// A whole page changes size as it fills, and the browser reports a size change it had to put off
// to the next frame as an error, which fails the story. Nothing is lost, so the page is told of
// each change on the next frame, where the browser has nothing to put off.
const sizesNextFrame = () => {
	const Real = window.ResizeObserver
	window.ResizeObserver = class extends Real {
		constructor(tell) { super((entries, observer) => requestAnimationFrame(() => tell(entries, observer))) }
	}
	return () => { window.ResizeObserver = Real }
}

const phone = () => matchMedia('(max-width: 639.98px)').matches

// the page has drawn its content: the shell's main area holds more than a loading state
const drawn = canvasElement => waitFor(() => {
	const main = canvasElement.querySelector('main')
	if (!main || main.querySelector('[aria-busy="true"]') || !main.textContent.trim()) throw new Error('The page is still loading')
}, { timeout: 5000 })

const storyOf = name => {
	const state = PAGE_STATES.find(s => s.name === name)
	if (!state) throw new Error(`pages/states.js has no state named ${name}`)
	return {
		name: state.name,
		args: { path: pathOf(state, kept.ids) },
		beforeEach: () => {
			forgetAll()
			const undo = [setClock(kept.recordedAt), serveAnswers(kept.states[state.name] ?? {}), sizesNextFrame()]
			return () => undo.forEach(fn => fn())
		},
		play: async ({ canvas, canvasElement }) => {
			await drawn(canvasElement)
			for (const step of state.press ?? []) {
				const press = pressOn(step, phone())
				const [control] = await canvas.findAllByRole(press.role, { name: nameOf(press, kept.ids) }, { timeout: 5000 })
				await userEvent.click(control)
			}
		}
	}
}

export const Home = storyOf('Home')
export const Orders = storyOf('Orders')
export const Order = storyOf('Order')
export const OrderDeleteAsked = storyOf('Order, delete asked')
export const OrderEdited = storyOf('Order, edited')
export const OrderLineOpen = storyOf('Order, a line open')
export const NewOrder = storyOf('New order')
export const Budget = storyOf('Budget')
export const BudgetEdited = storyOf('Budget, edited')
export const Statistics = storyOf('Statistics')
export const Vendors = storyOf('Vendors')
export const VendorEdited = storyOf('Vendor, edited')
export const Categories = storyOf('Categories')
export const CategoryEdited = storyOf('Category, edited')
export const Bookmarks = storyOf('Bookmarks')
export const Settings = storyOf('Settings')
