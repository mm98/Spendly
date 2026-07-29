import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base is relative so a build can be opened from any path -- the prototype it ports
// opens from a file:// URL, and a dist that only works when served from / would be a
// step down from that.
export default defineConfig({
	base: './',
	plugins: [react()],
	server: { port: 5173 },
	build: {
		rolldownOptions: {
			output: {
				// React, the DOM renderer and the router are the half of the entry chunk this
				// repository never edits, and they carry their own version in the hash. Split
				// out, an edit to a page invalidates the app's chunk and leaves the dependency
				// cached; left in, every edit re-downloads all of it.
				codeSplitting: {
					groups: [{ name: 'vendor', test: /node_modules/ }]
				}
			}
		}
	}
})
