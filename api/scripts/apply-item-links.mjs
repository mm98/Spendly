import { readFileSync } from 'node:fs'
import { db } from '../src/db.js'
import { normaliseUrl } from '../src/lib/validate.js'

/* One-off: puts the links from an old export onto lines that already exist.
   Orders are found by their reference, lines by their name (the nth line of that name in the
   order, when a name is there twice). Only a line with no link yet is written.
   node scripts/apply-item-links.mjs <export.json> [--user <email>] [--apply] */

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const userAt = args.indexOf('--user')
const email = userAt >= 0 ? args[userAt + 1] : null
const file = args.find((a, i) => !a.startsWith('--') && i !== (userAt >= 0 ? userAt + 1 : -1))
if (!file) { console.error('Usage: node scripts/apply-item-links.mjs <export.json> [--user <email>] [--apply]'); process.exit(1) }

const users = db.prepare('SELECT id, email FROM users').all().filter(u => !email || u.email === email)
if (users.length !== 1) {
	console.error(email ? `No account with the email ${email}.` : `There are ${users.length} accounts. Name one with --user <email>:\n${users.map(u => '  ' + u.email).join('\n')}`)
	process.exit(1)
}
const userId = users[0].id

const orders = JSON.parse(readFileSync(file, 'utf8')).orders ?? []
const findOrders = db.prepare('SELECT id FROM orders WHERE user_id = ? AND reference = ?')
const findItems = db.prepare('SELECT id, title, url FROM order_items WHERE order_id = ? ORDER BY position')
const setUrl = db.prepare('UPDATE order_items SET url = ? WHERE id = ? AND url IS NULL')

const done = [], noOrder = [], noLine = [], hasLink = [], badLink = [], several = []
const plan = () => {
	for (const o of orders) {
		const wanted = (o.items ?? []).filter(i => i.url)
		if (!wanted.length) continue
		const found = findOrders.all(userId, o.reference)
		if (!found.length) { noOrder.push(o.reference); continue }
		if (found.length > 1) { several.push(o.reference); continue }
		const lines = findItems.all(found[0].id)
		const seen = new Map()
		for (const item of (o.items ?? [])) {
			const key = String(item.title).trim()
			const nth = seen.get(key) ?? 0
			seen.set(key, nth + 1)
			if (!item.url) continue
			const line = lines.filter(l => l.title.trim() === key)[nth]
			const at = `${o.reference} ${key}`
			if (!line) { noLine.push(at); continue }
			const url = normaliseUrl(item.url)
			if (!url) { badLink.push(`${at} ${item.url}`); continue }
			if (line.url) { hasLink.push(at); continue }
			done.push({ id: line.id, url, at })
		}
	}
}
plan()

if (apply) db.transaction(() => { for (const d of done) setUrl.run(d.url, d.id) })()

const show = (what, list) => { if (list.length) console.log(`\n${what} (${list.length}):\n` + list.map(x => '  ' + (typeof x === 'string' ? x : x.at)).join('\n')) }
console.log(`${apply ? 'Written' : 'Would write'}: ${done.length} links`)
show('Order not found', noOrder)
show('More than one order with the reference', several)
show('Line not found in the order', noLine)
show('Line already has a link, left as it is', hasLink)
show('Not a link, left out', badLink)
if (!apply) console.log('\nNothing was changed. Add --apply to write.')
