import { readFileSync } from 'node:fs'

/* The colour schemes (11a), read from styles/schemes.css and styles/tokens.css, byte copies of design/styles
   that react's design:check holds equal. Each scheme's light and dark token values, by its data-scheme id. */

const css = readFileSync(new URL('../styles/schemes.css', import.meta.url), 'utf8')
const tokensOf = body => Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]))

// amber and red, which only some schemes turn, as every other scheme takes them
const base = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8')
const block = selector => tokensOf(base.match(new RegExp(`(?:^|\\n)${selector.replace(/[[\]]/g, '\\$&')}\\s*\\{([^}]*)\\}`))[1])
const WARNING_AND_PROBLEM = /^--(amber|red)(-|$)/
const only = tokens => Object.fromEntries(Object.entries(tokens).filter(([name]) => WARNING_AND_PROBLEM.test(name)))
const shared = {
	light: only({ ...block(':root'), ...block('[data-theme="light"]') }),
	dark: only(block('[data-theme="dark"]'))
}

const SCHEMES = {}
for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
	const id = selectors.match(/\[data-scheme="([\w-]+)"\]/)?.[1]
	if (!id) continue
	const theme = /data-theme="dark"/.test(selectors) ? 'dark' : 'light'
	SCHEMES[id] = { ...SCHEMES[id], [theme]: tokensOf(body) }
}
for (const scheme of Object.values(SCHEMES))
	for (const theme of ['light', 'dark']) scheme[theme] = { ...shared[theme], ...scheme[theme] }

export const DEFAULT_SCHEME = 'emerald'
export const WARNING_AND_PROBLEM_TOKENS = Object.keys(shared.light)
export const SCHEME_IDS = Object.keys(SCHEMES)

/** The scheme's tokens in one theme; an id that is not a scheme gets Emerald. */
export const schemeTokens = (id, theme) => (SCHEMES[id] ?? SCHEMES[DEFAULT_SCHEME])[theme]
