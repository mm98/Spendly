// What react/index.html and react/src/main.jsx give every page: the `sp` class on <body>, which the
// stylesheet's font, ink and ground hang from, a router for the components that link, and MotionShell.
import { createElement, useLayoutEffect } from 'react'
import { MemoryRouter } from 'react-router'
// the JSX-free copy tools/motion-for-bundle.mjs writes, the same module the components import
import { MotionShell } from '../.cache/motion.js'

export { MemoryRouter }

export function SpendlyRoot({ children }) {
	useLayoutEffect(() => { document.body.classList.add('sp') }, [])
	return createElement(MemoryRouter, null, createElement(MotionShell, null, children))
}
