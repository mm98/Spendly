import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createHashRouter } from 'react-router'
import { routes } from './routes.jsx'
import './styles/app.css'

/* The dark theme follows the system, before first paint and live on change. The stylesheet
   keys every dark value off html[data-theme="dark"] rather than a prefers-color-scheme block
   so there is exactly one switch: this is where it is thrown, and an in-app choice would be
   stored and written here too, overriding the OS answer rather than fighting it in CSS. */
const themeQuery = matchMedia('(prefers-color-scheme: dark)')
const applyTheme = () => { document.documentElement.dataset.theme = themeQuery.matches ? 'dark' : 'light' }
applyTheme()
themeQuery.addEventListener('change', applyTheme)

/* Hash routing, for the same reason the prototype is one file: a built copy of this app has
   to open from anywhere -- a static host with no rewrite rule, a file:// URL, a folder
   someone unzipped -- and a path router needs the server to send every URL to index.html.
   The prototype answered `#detail`; this answers `#/orders/o-303`, which is the same promise
   with a real address behind it. */

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<RouterProvider router={createHashRouter(routes)} />
	</StrictMode>
)
