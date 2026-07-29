import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createHashRouter } from 'react-router-dom'
import { routes } from './routes.jsx'
import './styles/spendly.css'

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
