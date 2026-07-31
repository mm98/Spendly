import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const stripHtmlComments = () => ({
	name: 'strip-html-comments',
	enforce: 'post',
	apply: 'build',
	transformIndexHtml: html => html.replace(/<!--(?!\[if)[\s\S]*?-->\n?/g, '')
})

export default defineConfig({
	base: './',
	plugins: [react(), stripHtmlComments()],
	server: { port: 5173 },
	build: {
		rolldownOptions: {
			output: {
				codeSplitting: {
					groups: [{ name: 'vendor', test: /node_modules/ }]
				}
			}
		}
	}
})
