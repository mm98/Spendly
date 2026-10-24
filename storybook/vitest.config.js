import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import main from './.storybook/main.js'

const browser = {
	enabled: true,
	headless: true,
	provider: playwright(),
	instances: [{ browser: 'chromium' }]
}

export default defineConfig({
	test: {
		projects: [
			// Every story is a test: it renders in Chromium, runs its play steps and its accessibility check.
			{
				plugins: [storybookTest({ configDir: fileURLToPath(new URL('.storybook', import.meta.url)) })],
				test: { name: 'storybook', browser }
			},
			// Tests over all the stories at once, built the way Storybook builds them.
			{
				...main.viteFinal({ plugins: [] }),
				test: { name: 'stories', include: ['tests/*.test.jsx'], browser }
			}
		]
	}
})
