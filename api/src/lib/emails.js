import { readFileSync } from 'node:fs'

/* The account and status emails (20f): byte copies of design/emails, which design:check holds equal.
   Each .txt opens with its subject line, "Subject: ..." or the status email's {{subject}}. */

const dir = new URL('../emails/', import.meta.url)

function load(name) {
	const txt = readFileSync(new URL(`${name}.txt`, dir), 'utf8')
	const head = txt.match(/^(?:Subject: )?(.+)\r?\n\r?\n/)
	if (!head) throw new Error(`emails/${name}.txt does not open with its subject line`)
	return { subject: head[1], text: txt.slice(head[0].length), html: readFileSync(new URL(`${name}.html`, dir), 'utf8') }
}

const TEMPLATES = Object.fromEntries(['confirm-email', 'reset-password', 'password-changed', 'passkey-added', 'status', 'status-quiet']
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

/** The message `name` to `to`, ready for sendMail: the HTML version and the plain one, with `values` merged in. */
export function emailMessage(name, to, values) {
	const t = TEMPLATES[name]
	return { to, subject: merge(t.subject, values, String), text: merge(t.text, values, String), html: merge(t.html, values, escapeHtml) }
}
