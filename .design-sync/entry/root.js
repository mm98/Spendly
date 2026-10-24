// What react/index.html and react/src/main.jsx give every page: the `sp` class on <body>, which the
// stylesheet's font, ink and ground hang from, and a router for the components that link.
import { createElement, useLayoutEffect } from 'react'
import { MemoryRouter } from 'react-router'

export { MemoryRouter }

export function SpendlyRoot({ children }) {
	useLayoutEffect(() => { document.body.classList.add('sp') }, [])
	return createElement(MemoryRouter, null, children)
}
