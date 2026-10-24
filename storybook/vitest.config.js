import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

// Every story is a test: it renders in Chromium, runs its play steps and its accessibility check.
export default defineConfig({
	plugins: [storybookTest({ configDir: fileURLToPath(new URL('.storybook', import.meta.url)) })],
	test: {
		name: 'storybook',
		browser: {
			enabled: true,
			headless: true,
			provider: playwright(),
			instances: [{ browser: 'chromium' }]
		}
	}
})
