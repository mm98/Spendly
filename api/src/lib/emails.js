import { readFileSync } from 'node:fs'

/* The account emails (20f). src/emails holds byte copies of design/emails, which design:check
   holds equal; each .txt opens with its subject line. */

const dir = new URL('../emails/', import.meta.url)

function load(name) {
	const txt = readFileSync(new URL(`${name}.txt`, dir), 'utf8')
	const head = txt.match(/^Subject: (.+)\r?\n\r?\n/)
	if (!head) throw new Error(`emails/${name}.txt does not open with a "Subject: " line`)
	return { subject: head[1], text: txt.slice(head[0].length), html: readFileSync(new URL(`${name}.html`, dir), 'utf8') }
}

const TEMPLATES = Object.fromEntries(['confirm-email', 'reset-password', 'password-changed', 'passkey-added'].map(n => [n, load(n)]))

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function merge(template, values, write) {
	return template.replace(/\{\{(\w+)\}\}/g, (field, key) => {
		if (values[key] == null) throw new Error(`no value for ${field}`)
		return write(values[key])
	})
}

/** The message `name` to `to`, ready for sendMail: the HTML version and the plain one, with `values` merged in. */
export function emailMessage(name, to, values) {
	const t = TEMPLATES[name]
	return { to, subject: t.subject, text: merge(t.text, values, String), html: merge(t.html, values, escapeHtml) }
}
