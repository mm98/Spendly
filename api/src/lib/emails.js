import { readFileSync } from 'node:fs'
import { DEFAULT_SCHEME, SCHEME_IDS, schemeTokens } from './schemes.js'

/* The account, status and conversation emails (20f): byte copies of design/emails, which design:check holds equal.
   Each .txt opens with its subject line, "Subject: ..." or the status email's {{subject}}. */

const dir = new URL('../emails/', import.meta.url)

function load(name) {
	const txt = readFileSync(new URL(`${name}.txt`, dir), 'utf8')
	const head = txt.match(/^(?:Subject: )?(.+)\r?\n\r?\n/)
	if (!head) throw new Error(`emails/${name}.txt does not open with its subject line`)
	return { subject: head[1], text: txt.slice(head[0].length), html: readFileSync(new URL(`${name}.html`, dir), 'utf8') }
}

const TEMPLATES = Object.fromEntries(['confirm-email', 'reset-password', 'password-changed', 'passkey-added', 'two-step-on', 'two-step-off', 'recovery-code-used', 'account-deleted', 'status', 'status-quiet', 'ask-chat']
	.map(n => [n, load(n)]))

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const isEmpty = value => !value || (Array.isArray(value) && !value.length)

/* Mustache sections (emails/README.md): {{#key}} repeats over a list or shows when true, {{^key}}
   shows when false or empty. A list item adds its fields to the ones around it. */
function merge(template, values, write) {
	return template
		.replace(/\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g, (section, kind, key, inner) => {
			const value = values[key]
			if (kind === '^') return isEmpty(value) ? merge(inner, values, write) : ''
			if (Array.isArray(value)) return value.map(item => merge(inner, { ...values, ...item }, write)).join('')
			if (!value) return ''
			return merge(inner, typeof value === 'object' ? { ...values, ...value } : values, write)
		})
		.replace(/\{\{(\w+)\}\}/g, (field, key) => {
			if (values[key] == null) throw new Error(`no value for ${field}`)
			return write(values[key])
		})
}

/* The emails follow the account's colour scheme (20f). The templates are drawn in Green, so each
   Green literal is swapped for the scheme's value of the token it is: the primary scale outside the
   dark block, and every token inside it. A square fill is the mark tile, which takes --shell-action. */
const LIGHT_TOKENS = ['--green', '--green-2', '--green-3', '--green-tint', '--green-tint-2']
// the templates' saving and link green is --shell-action-hover in Green, --green-2 in every other scheme
const LIGHT_ALIASES = { '#2f7a51': '--green-2' }
// the dark links are Green's light --green-4, and take the scheme's
const DARK_ALIASES = { '#8caf97': ['light', '--green-4'] }

const byHex = (tokens, names) => {
	const out = {}
	for (const name of names) out[tokens[name].toLowerCase()] ??= name
	return out
}

function recolour(html, scheme) {
	const green = { light: schemeTokens(DEFAULT_SCHEME, 'light'), dark: schemeTokens(DEFAULT_SCHEME, 'dark') }
	const own = { light: schemeTokens(scheme, 'light'), dark: schemeTokens(scheme, 'dark') }
	const light = { ...byHex(green.light, LIGHT_TOKENS), ...LIGHT_ALIASES }
	const dark = byHex(green.dark, Object.keys(green.dark).filter(n => /^#[0-9a-f]{6}$/i.test(green.dark[n])))
	const swap = (text, pick) => text.replace(/#[0-9a-f]{6}\b/gi, hex => pick(hex.toLowerCase()) ?? hex)
	const square = tag => {
		const attrs = tag.match(/width="(\d+)" height="(\d+)"/) ?? tag.match(/width:(\d+)px;height:(\d+)px/)
		return attrs && attrs[1] === attrs[2]
	}
	const start = html.indexOf('@media (prefers-color-scheme: dark)')
	const end = html.indexOf('</style>', start)
	const darkBlock = swap(html.slice(start, end), hex => {
		if (DARK_ALIASES[hex]) return own[DARK_ALIASES[hex][0]][DARK_ALIASES[hex][1]]
		return dark[hex] && own.dark[dark[hex]]
	})
	const outside = text => text.replace(/<[^>]+>|[^<]+/g, part => swap(part, hex => {
		if (hex === green.light['--shell-action'] && part.startsWith('<') && square(part)) return own.light['--shell-action']
		return light[hex] && own.light[light[hex]]
	}))
	return outside(html.slice(0, start)) + darkBlock + outside(html.slice(end))
}

const recoloured = new Map()
const htmlIn = (name, scheme) => {
	if (scheme === DEFAULT_SCHEME || !SCHEME_IDS.includes(scheme)) return TEMPLATES[name].html
	const key = `${name}|${scheme}`
	if (!recoloured.has(key)) recoloured.set(key, recolour(TEMPLATES[name].html, scheme))
	return recoloured.get(key)
}

/** The message `name` to `to`, ready for sendMail: the HTML version and the plain one, with `values` merged in,
    drawn in the account's colour `scheme` (Green when none is given). */
export function emailMessage(name, to, values, { scheme } = {}) {
	const t = TEMPLATES[name]
	return { to, subject: merge(t.subject, values, String), text: merge(t.text, values, String), html: merge(htmlIn(name, scheme), values, escapeHtml) }
}
