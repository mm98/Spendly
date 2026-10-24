import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'

// The app's own React and router, never a second copy: hooks fail when a component and the
// renderer each load their own React. react/ needs `npm ci` first.
const app = path => fileURLToPath(new URL(`../../react/${path}`, import.meta.url))

export default {
	framework: '@storybook/react-vite',
	stories: ['../stories/*.stories.jsx'],
	addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
	core: { disableTelemetry: true },
	typescript: {
		reactDocgen: 'react-docgen-typescript',
		reactDocgenTypescriptOptions: {
			include: ['../react/src/components/*.jsx'],
			compilerOptions: { allowJs: true, checkJs: true },
			shouldExtractLiteralValuesFromEnum: true,
			savePropValueAsString: true
		}
	},
	viteFinal: config => ({
		...config,
		// the app's own JSX transform (react/vite.config.js), and fast refresh in dev
		plugins: [...(config.plugins ?? []), react()],
		resolve: {
			...config.resolve,
			alias: [
				...(Array.isArray(config.resolve?.alias) ? config.resolve.alias
					: Object.entries(config.resolve?.alias ?? {}).map(([find, replacement]) => ({ find, replacement }))),
				{ find: /^react$/, replacement: app('node_modules/react') },
				{ find: /^react\/(.*)$/, replacement: app('node_modules/react/$1') },
				{ find: /^react-dom$/, replacement: app('node_modules/react-dom') },
				{ find: /^react-dom\/(.*)$/, replacement: app('node_modules/react-dom/$1') },
				{ find: /^react-router$/, replacement: app('node_modules/react-router') }
			]
		},
		// the dev server serves only files under its root unless told: react/ sits beside it
		server: { ...config.server, fs: { ...config.server?.fs, allow: [...(config.server?.fs?.allow ?? []), app('')] } },
		define: { ...config.define, __BUILD_COMMIT__: 'null' }
	})
}
