import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createHashRouter } from 'react-router'
import { routes } from './routes.jsx'
import { applyTheme } from './app/theme.js'
import { MotionShell } from './components/motion.js'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/components.css'
import './styles/app.css'
import './styles/pages.js'

// before first paint, so a dark reader never sees a light frame
applyTheme()

/* Hash routing: a built copy has to open from anywhere - a static host with no rewrite rule,
   a file:// URL, a folder someone unzipped - and a path router needs the server's help. */
createRoot(document.getElementById('root')).render(
	<StrictMode>
		<MotionShell>
			<RouterProvider router={createHashRouter(routes)} />
		</MotionShell>
	</StrictMode>
)
