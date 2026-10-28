import { readFileSync } from 'node:fs'

/* The colour schemes (11a), read from styles/schemes.css, a byte copy of design/styles/schemes.css
   that react's design:check holds equal. Each scheme's light and dark token values, by its data-scheme id. */

const css = readFileSync(new URL('../styles/schemes.css', import.meta.url), 'utf8')
const tokensOf = body => Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]))

const SCHEMES = {}
for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
	const id = selectors.match(/\[data-scheme="([\w-]+)"\]/)?.[1]
	if (!id) continue
	const theme = /data-theme="dark"/.test(selectors) ? 'dark' : 'light'
	SCHEMES[id] = { ...SCHEMES[id], [theme]: tokensOf(body) }
}

export const DEFAULT_SCHEME = 'green'
export const SCHEME_IDS = Object.keys(SCHEMES)

/** The scheme's tokens in one theme; an id that is not a scheme gets Green. */
export const schemeTokens = (id, theme) => (SCHEMES[id] ?? SCHEMES[DEFAULT_SCHEME])[theme]
