import { defineConfig } from 'vite'
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
	transformIndexHtml: html => html.replace(/<!--(?!\[if)[\s\S]*?-->\n?/g, '')
})

export default defineConfig({
	base: './',
	plugins: [react(), stripHtmlComments()],
	/* The commit this bundle was built from, baked in as a literal so a running tab can tell
	   whether the server has since been replaced under it -- see src/components/UpdateNotice.jsx,
	   which compares it against the same commit the image stamps into /api/version. The
	   Dockerfile passes GIT_SHA to the build stage for exactly this; anywhere else (a dev
	   server, a bare `docker build .`) it is null, which the notice reads as "no build to be out
	   of date" and never prompts on.

	   `define` rather than `import.meta.env`: this has to be a compile-time literal in both the
	   dev server and the build, and a VITE_-prefixed variable would additionally have to be
	   present in the environment at dev time to exist at all. */
	define: { __BUILD_COMMIT__: JSON.stringify(process.env.GIT_SHA || null) },
	server: {
		port: 5173,
		// Same-origin from the browser's point of view, so the session cookie the API sets is a
		// first-party cookie rather than a cross-site one a browser might refuse.
		proxy: { '/api': { target: process.env.SPENDLY_API_URL ?? 'http://localhost:4000', changeOrigin: true } }
	},
	// `vite preview` serves the production build but does not inherit `server.proxy` -- it
	// reads its own `preview.proxy`, so without this a built app has no way to reach the API
	// locally and every fetch('/api/...') 404s against the preview server itself.
	preview: {
		port: 4173,
		proxy: { '/api': { target: process.env.SPENDLY_API_URL ?? 'http://localhost:4000', changeOrigin: true } }
	},
	build: {
		/* A stack trace off the built bundle names `index-<hash>.js:1:24817` and nothing else --
		   the minifier renamed everything and put the whole app on one line, so a report from a
		   running container is unreadable without the map that undoes it. This writes
		   `<chunk>.js.map` beside each chunk and a `sourceMappingURL` comment pointing at it, so
		   a browser's devtools and any error reporter resolve frames back to src/. The maps are
		   fetched only when devtools is open, so no visitor pays for them; the cost is disk and
		   that the sources are readable from the deployed app -- which they already are, this
		   being a public repository.

		   Whether a given install *offers* them is not decided here: the maps are always built,
		   and `SPENDLY_SOURCE_MAPS=0` makes the server 404 them (api/src/app.js). That way the
		   same image does both and turning them off is a restart rather than a rebuild.
		   precompress.mjs already counts `.map` among the text extensions it gzips and brotlis,
		   so the files are covered without touching it. */
		sourcemap: true,
		rolldownOptions: {
			output: {
				// React, the DOM renderer and the router are the half of the entry chunk this
				// repository never edits, and they carry their own version in the hash. Split
				// out, an edit to a page invalidates the app's chunk and leaves the dependency
				// cached; left in, every edit re-downloads all of it.
				/* Recharts and its dependency tree get their own chunk: in vendor they would load
				   and parse on every page, charts or not, and they are the bulk of node_modules
				   by weight. Split out, only a route whose module graph reaches recharts fetches
				   them. Vendor is the explicit list and matches first -- a group also captures
				   its matches' CommonJS interop wrappers, and react's own wrapper has to live
				   with react, not wherever a chart dependency first referenced it. */
				codeSplitting: {
					groups: [
						{ name: 'vendor', test: /node_modules[\\/](react|react-dom|scheduler|react-router|cookie-es)[\\/]/ },
						{ name: 'charts', test: /node_modules/ }
					]
				}
			}
		}
	}
})
