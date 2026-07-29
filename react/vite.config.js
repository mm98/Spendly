import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base is relative so a build can be opened from any path -- the prototype it ports
// opens from a file:// URL, and a dist that only works when served from / would be a
// step down from that.
export default defineConfig({
	base: './',
	plugins: [react()],
	server: { port: 5173 }
})
