import fs from 'fs'
import path from 'path'
import { defineConfig, minifySync, transformWithOxc } from 'vite'
import react from '@vitejs/plugin-react'

// base is relative so a build can be opened from any path -- the prototype it ports
// opens from a file:// URL, and a dist that only works when served from / would be a
// step down from that.
/* The comments in index.html are tripwires for whoever edits index.html, and nobody edits the
   built copy. Vite minifies the JS and the CSS -- 0 comments left in either, measured -- and
   leaves the HTML exactly as written, which shipped the doctype and charset notes to every
   visitor: 519 of the entry document's 1,060 bytes. They stay in the source, where they work.
   Conditional comments are not touched, since a stripper that eats `<!--[if` breaks the one
   kind of comment a browser reads. */
const stripHtmlComments = () => ({
	name: 'strip-html-comments',
	enforce: 'post',
	apply: 'build',
	// The leading tabs go with it: left behind, they land in front of the next line's own
	// indentation and the built document is one line wider than it was written.
	transformIndexHtml: html => html.replace(/[ \t]*<!--(?!\[if)[\s\S]*?-->\n?/g, '')
})

/* Vite copies public/ as written, comments and all. theme.js blocks the first paint, so its built copy
   is minified in place; the source keeps its comments. precompress.mjs runs after this. */
const minifyPublicScripts = () => {
	let outDir
	return {
		name: 'minify-public-scripts',
		apply: 'build',
		configResolved: config => { outDir = path.resolve(config.root, config.build.outDir) },
		closeBundle() {
			for (const name of ['theme.js']) {
				const file = path.join(outDir, name)
				const result = minifySync(name, fs.readFileSync(file, 'utf8'), { compress: true, mangle: true })
				if (result.errors?.length) throw new Error(`${name}: ${result.errors.map(e => e.message).join('; ')}`)
				fs.writeFileSync(file, result.code)
			}
		}
	}
}

/* motion.js (from design/react_handoff) is a .js file that holds JSX, which Vite only reads in a .jsx.
   Storybook imports this plugin too. */
export const jsxInComponentJs = () => ({
	name: 'jsx-in-component-js',
	enforce: 'pre',
	transform(code, id) {
		if (!/[\\/]src[\\/]components[\\/][^\\/]+\.js$/.test(id) || !/<[A-Za-z]/.test(code)) return null
		return transformWithOxc(code, id, { lang: 'jsx', jsx: { runtime: 'automatic' } })
	}
})

// the scan for packages to bundle ahead does not run plugins: it reads the same files as markup
export const componentJsScan = { rolldownOptions: { moduleTypes: { '.js': 'jsx' } } }

// /.well-known/change-password is answered by the API, as it is when the API serves the build
const api = { target: process.env.SPENDLY_API_URL ?? 'http://localhost:4000', changeOrigin: true }

export default defineConfig({
	base: './',
	plugins: [jsxInComponentJs(), react(), stripHtmlComments(), minifyPublicScripts()],
	optimizeDeps: componentJsScan,
	// the commit and version this bundle was built from (the Dockerfile passes GIT_SHA and VERSION);
	// null anywhere else, which the update notice reads as "nothing to be out of date with"
	define: {
		__BUILD_COMMIT__: JSON.stringify(process.env.GIT_SHA || null),
		__BUILD_VERSION__: JSON.stringify(process.env.VERSION || null)
	},
	server: {
		port: 5173,
		// Same-origin from the browser's point of view, so the session cookie the API sets is a
		// first-party cookie rather than a cross-site one a browser might refuse.
		proxy: { '/api': api, '/.well-known': api, '/open': api, '/mcp': api }
	},
	// `vite preview` serves the production build but does not inherit `server.proxy` -- it
	// reads its own `preview.proxy`, so without this a built app has no way to reach the API
	// locally and every fetch('/api/...') 404s against the preview server itself.
	preview: {
		port: 4173,
		proxy: { '/api': api, '/.well-known': api, '/open': api, '/mcp': api }
	},
	build: {
		/* No maps: a stack trace off this bundle names `index-<hash>.js:1:24817`, and the source
		   it points into is read from the repository, at the commit /api/version names. */
		sourcemap: false,
		rolldownOptions: {
			output: {
				// React, the DOM renderer and the router are the half of the entry chunk this
				// repository never edits, and they carry their own version in the hash. Split
				// out, an edit to a page invalidates the app's chunk and leaves the dependency
				// cached; left in, every edit re-downloads all of it.
				codeSplitting: {
					groups: [
						{ name: 'vendor', test: /node_modules[\\/](react|react-dom|scheduler|react-router|cookie-es)[\\/]/ }
					]
				}
			}
		}
	}
})
