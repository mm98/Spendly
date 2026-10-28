/* Every SQL statement the API runs, checked against the plan SQLite chooses for it.

   The audit this came out of measured 258 statements by hand and found the expensive ones by
   reading plans one at a time. That is the wrong shape for a standing guarantee: a query added
   next month gets the same treatment only if somebody remembers to give it. This script asks
   the question automatically, and -- because it compares against a committed baseline -- asks
   it loudly only about the statements that are new or have changed. An untouched query that
   was already blessed stays silent.

   How it works:

     1. A demo account is seeded at the size this install actually reaches (ORDER_COUNT below),
        so the planner is given the same shape of data it has in production and answers with the
        same plans. db.js gathers its statistics over that database exactly as it does on a
        deployed server.
     2. better-sqlite3's prepare and the statement methods are wrapped before the app is
        imported, so every statement is recorded WITH the parameters it was actually run with --
        no guessing at plausible bindings, and dynamically built SQL (the orders list assembles
        its WHERE per request) is captured the same way as a module-level prepare.
     3. The app is booted and driven through REQUESTS below, which is what makes the dynamic
        statements appear. A route added without a line here still gets its module-level
        statements checked; adding the request is what covers the SQL it builds per call.
     4. Each recorded statement is EXPLAINed with its own parameters, and the plan is reduced to
        the facts worth failing over: does it scan a big table, does it sort in a temp B-tree,
        which indexes does it use.

   The gate. A statement is a finding when its plan holds a SCAN of a table big enough to
   matter, a temp B-tree sort, a walk of one account's whole table through an index that does
   not carry the columns being read (the plan says INDEX rather than COVERING INDEX and the
   only constraint is user_id -- the shape behind the audit's biggest wins, where summing an
   account's totals cost a table probe per row), or a read of a per-account table that never
   names user_id. Some of those are correct answers -- a scan of a twelve-row vendors table is
   cheaper than any index, and the orders list walks the date index precisely because LIMIT
   stops it early -- which is what the baseline is for: `npm run queries:bless` records the
   current plans as accepted, and from then on the check reports only what changed. So the
   reviewer's question is never "are all of these plans still right", it is "is this one new
   plan right", which is a question a person can actually answer.

   The other direction, which matters just as much: an index is not free, and a check that only
   rewarded read plans would argue for adding them forever. Every index is rewritten whenever a
   covered column changes -- and because the order totals are trigger-maintained, editing one
   line item rewrites its order row and every index carrying total, saved or discount with it.
   So the baseline also records the schema's whole index inventory and which statements use
   each one. An index no captured plan reads is reported as a write cost with no reader, and
   adding an index shows up as a baseline change that has to be justified in review like any
   other. Read wins are measured; write cost is counted.

   Timings are printed but never fail the run: a plan is deterministic and a wall clock on a
   shared CI runner is not. Plans and index counts are the gate; milliseconds are context. */

import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire, syncBuiltinESMExports } from 'node:module'
import Database from 'better-sqlite3'

/* Deterministic ids, patched in before lib/ids.js is imported. Not cosmetic: ids are TEXT
   primary keys, so random ones lay the b-trees out differently on every run, ANALYZE samples
   the different layout, and two indexes of equal rank swap places in a plan -- which reads as
   "the plan changed" on a tree nobody touched. Real randomness is what the app must ship
   (ids.js is the security boundary here); a fixed sequence is what a comparison needs. */
// a scan below is sent to be read when a key is set, and every reading is paid
delete process.env.ANTHROPIC_API_KEY

const require = createRequire(import.meta.url)
const crypto = require('node:crypto')
let idCounter = 0n
crypto.randomBytes = size => {
	// The counter itself, big-endian across the buffer: unique for every call, which a byte
	// pattern is not -- ids collide on the primary key once the pattern repeats.
	const buffer = Buffer.alloc(size)
	let n = ++idCounter
	for (let i = size - 1; i >= 0; i--) { buffer[i] = Number(n & 0xffn); n >>= 8n }
	return buffer
}
// an `import { randomBytes } from 'node:crypto'` made before this line still sees the patch
syncBuiltinESMExports()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASELINE = path.join(__dirname, '..', 'query-plans.json')
const UPDATE = process.argv.includes('--update')
const VERBOSE = process.argv.includes('--verbose')

/* The size this install actually reaches: about 2,000 orders in the biggest account, with
   fifty vendors and fifty categories behind them. Deliberately not the 50,000 the demo button
   can fill to -- a fixture inflated past the truth makes the planner choose plans production
   never gets (at 2,000 rows a scan is often genuinely the cheapest answer, and pretending
   otherwise would have the check demand indexes for costs nobody here pays).

   That the plans stay meaningful at this size is why the gate reads plan SHAPE rather than
   milliseconds: a scan of 2,000 rows takes a fraction of one, so a timing threshold would pass
   everything, while "this walks the whole table and sorts it" is a fact about the query that is
   just as true small. The timings printed alongside are context, and mostly they say that
   nothing here is worth touching. */
const ORDER_COUNT = 2000
const VENDOR_COUNT = 50
const CATEGORY_COUNT = 50
const MONTHS = 24
const SEED = 20260818
const USER = 'u-checkqueries000'
const SESSION = 'sess-checkqueries0'

/* Nine neighbours, because this install holds about ten accounts and always will. That number
   is the fixture's whole shape: what grows here is one person's ledger, not the number of
   people, so the account under test carries a big one and the other nine are there to stop the
   check drawing conclusions a single-account database cannot support. With one user, that
   user's rows ARE the table -- `WHERE user_id = ?` matches everything, SQLite reads the table
   directly, and every per-account index reports itself as having no reader, which would argue
   for dropping indexes on the grounds that nobody else exists. Nine small ledgers make the
   user_id filter mean something without pretending this is a service with thousands of
   tenants: an index that earns nothing at ten accounts should be reported as earning nothing,
   because ten accounts is the truth here. */
const NEIGHBOURS = 9
const NEIGHBOUR_ORDER_COUNT = 60

/* Tables where a scan is a real cost -- they grow with the account. Everything else (vendors,
   categories, user_settings) is a handful of rows per user, where SQLite reading
   the table directly is the right plan and flagging it would train the reader to ignore this. */
const BIG_TABLES = new Set(['orders', 'order_items', 'order_categories', 'order_attachments', 'uploads'])
/* Per-account tables: a read of one of these that never names user_id is either a bug or a
   lookup by primary key that reached the row through an already-scoped query. The baseline
   carries the ones that are the latter. */
const SCOPED_TABLES = new Set([...BIG_TABLES, 'vendors', 'categories', 'vendor_aliases', 'user_settings',
	'bookmarks', 'budget_years', 'budget_accounts', 'budget_groups', 'budget_lines', 'budget_bank_links'])

const tmp = mkdtempSync(path.join(tmpdir(), 'spendly-queries-'))
const DB_PATH = path.join(tmp, 'check.sqlite3')
process.env.SPENDLY_DB = DB_PATH

/* ---- capture, installed before the app imports better-sqlite3 ---- */

const captured = new Map()   // normalised SQL -> { sql, params }
const record = (sql, params) => {
	const key = normalise(sql)
	// First binding wins: one representative call per statement is what the plan needs, and a
	// later call with emptier parameters would explain a narrower query than the app runs.
	if (!captured.has(key)) captured.set(key, { sql, params })
}
const normalise = sql => sql.replace(/\s+/g, ' ').trim()

const realPrepare = Database.prototype.prepare
Database.prototype.prepare = function (sql, ...rest) {
	const statement = realPrepare.call(this, sql, ...rest)
	if (/^\s*(SELECT|WITH)/i.test(sql)) {
		for (const method of ['all', 'get', 'iterate']) {
			const real = statement[method]
			if (typeof real !== 'function') continue
			statement[method] = function (...args) {
				record(sql, args)
				return real.apply(this, args)
			}
		}
	}
	return statement
}

/* ---- seed, then drive ---- */

// the plans do not depend on which model turns an item name into numbers, so none is loaded
process.env.SPENDLY_EMBEDDER = 'shapes'
// passkeys answer only at a public address, so the check gives the server one
process.env.SPENDLY_PUBLIC_URL = 'http://localhost'
const { db } = await import('../src/db.js')
const { seedAccountDefaults } = await import('../src/seed.js')
const { populateDemoData } = await import('../src/lib/demoData.js')
const { hashPassword } = await import('../src/lib/auth.js')

// adding a passkey asks for the account's password, so this one account has a real one
const PASSWORD = 'queries-check-password'
db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
	.run(USER, 'queries@check.local', await hashPassword(PASSWORD))
db.prepare('INSERT INTO user_sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
	.run(SESSION, USER, Math.floor(Date.now() / 1000) + 86400)
db.transaction(() => seedAccountDefaults(db, USER))()
populateDemoData(USER, { months: MONTHS, seed: SEED, orders: ORDER_COUNT })

/* The demo generator ships a dozen vendors and ten categories; the accounts here carry fifty of
   each, so the lists, the comboboxes and the breakdown rollups are measured over the number a
   real account holds rather than the number the fixture happened to come with. Padding rows
   rather than orders: what matters is how many names a lookup or a sort has to walk. */
const padVendor = db.prepare(`INSERT INTO vendors (id, user_id, name, initials, colour, favourite)
	VALUES (?, ?, ?, ?, '#4F5BD5', 0)`)
const padCategory = db.prepare(`INSERT INTO categories (id, user_id, name, icon, colour, budget, favourite)
	VALUES (?, ?, ?, 'tag', '#177DA7', 0, 0)`)
function padNames(userId, tag) {
	const vendors = db.prepare('SELECT COUNT(*) c FROM vendors WHERE user_id = ?').get(userId).c
	for (let i = vendors; i < VENDOR_COUNT; i++)
		padVendor.run(`v-${tag}-${i}`, userId, `Vendor ${String(i).padStart(2, '0')}`, 'V' + (i % 10))
	const categories = db.prepare('SELECT COUNT(*) c FROM categories WHERE user_id = ?').get(userId).c
	for (let i = categories; i < CATEGORY_COUNT; i++)
		padCategory.run(`c-${tag}-${i}`, userId, `Category ${String(i).padStart(2, '0')}`)
}
padNames(USER, 'main')

const insertUpload = db.prepare(`INSERT INTO uploads (id, user_id, name, size, kind, content_type)
	VALUES (?, ?, 'kvittering.jpg', 1024, 'image', 'image/jpeg')`)
for (let i = 0; i < NEIGHBOURS; i++) {
	const id = `u-neighbour${String(i).padStart(6, '0')}`
	db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
		.run(id, `n${i}@check.local`, '16384.8.1.00.00')
	db.prepare('INSERT INTO user_sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
		.run(`sess-neighbour${String(i).padStart(4, '0')}`, id, Math.floor(Date.now() / 1000) + 86400)
	db.transaction(() => seedAccountDefaults(db, id))()
	populateDemoData(id, { months: 6, seed: SEED + i + 1, orders: NEIGHBOUR_ORDER_COUNT })
	padNames(id, `n${i}`)
	// A pending scan upload each, so uploads is not an empty table whose index looks unread
	// because nothing is in it rather than because nothing asks for it.
	insertUpload.run(`su-neighbour${String(i).padStart(5, '0')}`, id)
}
/* A budget in every account, written after every other row so the ids above stay the ones the
   baseline was taken with: three years of seven groups here, one year each next door. */
const { replaceYears } = await import('../src/lib/budget.js')
const fixtureMonths = (row, known) => Array.from({ length: 12 }, (_, m) =>
	(m < known ? { expected: null, real: 100 * (row + 1) } : { expected: 100 * (row + 1), real: null }))
const fixtureBudget = year => ({
	year,
	groups: [
		{ kind: 'income', name: 'Income', lines: [{ name: 'Salary', account: 'Salary', months: fixtureMonths(300, 9) }] },
		...Array.from({ length: 6 }, (_, g) => ({ kind: 'expense', name: `Group ${g}`,
			lines: Array.from({ length: 6 }, (_, row) => ({ name: `Row ${g}.${row}`,
				account: ['Budget', 'Salary', 'Savings'][row % 3], months: fixtureMonths(row, 9) })) }))
	]
})
const fixtureAccounts = ['Salary', 'Budget', 'Savings']
// the fixture's budget replaces the demo fill's, so its shape stays the one the baseline was taken with
db.exec('DELETE FROM budget_years; DELETE FROM budget_accounts;')
replaceYears(USER, [2024, 2025, 2026].map(fixtureBudget), fixtureAccounts)
for (let i = 0; i < NEIGHBOURS; i++)
	replaceYears(`u-neighbour${String(i).padStart(6, '0')}`, [fixtureBudget(2026)], fixtureAccounts)

// one import on record, so the single-import read answers rather than 404s, with orders, a vendor and
// a category it wrote, so what its undo deletes is counted over real rows
db.prepare('INSERT INTO order_imports (id, user_id, file_name, created_at) VALUES (?, ?, ?, ?)').run('im-fixture', USER, 'fixture.csv', 1)
db.prepare(`UPDATE orders SET import_id = 'im-fixture', import_revision = revision
	WHERE id IN (SELECT id FROM orders WHERE user_id = ? ORDER BY id LIMIT 40)`).run(USER)
for (const table of ['vendors', 'categories'])
	db.prepare(`UPDATE ${table} SET import_id = 'im-fixture' WHERE id IN (SELECT id FROM ${table} WHERE user_id = ? ORDER BY id LIMIT 2)`).run(USER)
// two drafts, so every list request plans its orders beside them, one to keep and one to create
const draftVendor = db.prepare('SELECT name FROM vendors WHERE user_id = ? ORDER BY name LIMIT 1').get(USER).name
const draftForm = JSON.stringify({ values: { vendor: draftVendor, date: '2026-08-20', kind: 'Expense', categories: ['Groceries'], shipping: 0, discount: 0, reference: '', note: '' },
	lines: [{ key: 'k', title: 'Kaffe', quantity: 1, price: 40, include: true }], files: [] })
for (const id of ['od-fixture', 'od-created']) db.prepare('INSERT INTO order_drafts (id, user_id, form) VALUES (?, ?, ?)').run(id, USER, draftForm)
// every account next door has drafts too, one scanned with a file added to it, so the drafts' plans meet a spread like a real one
const insertDraft = db.prepare('INSERT INTO order_drafts (id, user_id, upload_id, form) VALUES (?, ?, ?, ?)')
for (let i = 0; i < NEIGHBOURS; i++) {
	const id = `u-neighbour${String(i).padStart(6, '0')}`
	insertUpload.run(`su-draft-n${i}`, id)
	insertUpload.run(`su-file-n${i}`, id)
	insertDraft.run(`od-n${i}-0`, id, `su-draft-n${i}`, null)
	for (let j = 1; j < 4; j++) insertDraft.run(`od-n${i}-${j}`, id, null, draftForm)
	db.prepare('INSERT INTO order_draft_files (draft_id, upload_id) VALUES (?, ?)').run(`od-n${i}-0`, `su-file-n${i}`)
}
// passkeys: two on the account and one next door each, so the list and the sign-in read meet a spread
const insertPasskey = db.prepare("INSERT INTO user_passkeys (id, user_id, public_key, transports, name) VALUES (?, ?, x'00', '[]', ?)")
for (const id of ['pk-fixture', 'pk-removed']) insertPasskey.run(id, USER, 'iPhone')
for (let i = 0; i < NEIGHBOURS; i++) insertPasskey.run(`pk-n${i}`, `u-neighbour${String(i).padStart(6, '0')}`, 'Mac')
// assistant tokens: two on the account and one next door each, as the passkeys above
const MCP_TOKEN = 'spendly_mcp_check'
const insertMcpToken = db.prepare('INSERT INTO user_mcp_tokens (id, user_id, token_hash, name) VALUES (?, ?, ?, ?)')
const mcpHash = token => crypto.createHash('sha256').update(token).digest('hex')
insertMcpToken.run('mcp-fixture', USER, mcpHash(MCP_TOKEN), 'Claude')
insertMcpToken.run('mcp-removed', USER, mcpHash(`${MCP_TOKEN}_removed`), 'Old laptop')
for (let i = 0; i < NEIGHBOURS; i++) insertMcpToken.run(`mcp-n${i}`, `u-neighbour${String(i).padStart(6, '0')}`, mcpHash(`${MCP_TOKEN}_n${i}`), 'Claude')
// saved questions on Ask Spendly: two on the account and one next door each, beside the three every account starts with
const insertQuestion = db.prepare('INSERT INTO user_ask_questions (id, user_id, question) VALUES (?, ?, ?)')
insertQuestion.run('aq-fixture', USER, 'How much did I save this month?')
insertQuestion.run('aq-removed', USER, 'Am I over budget this month?')
for (let i = 0; i < NEIGHBOURS; i++) insertQuestion.run(`aq-n${i}`, `u-neighbour${String(i).padStart(6, '0')}`, 'Where did I spend the most last month?')
// chats kept on Ask: two on the account with their turns, and one next door each
const insertChat = db.prepare(`INSERT INTO user_ask_chats (id, user_id, heading, first_question, question_count, asked_at, kept_until, expires_at)
	VALUES (?, ?, 'Orders at Bilka in 2026', 'Make a spreadsheet of my orders at Bilka', 2, unixepoch(), '2026-11-21', unixepoch() + 2592000)`)
const insertTurn = db.prepare("INSERT INTO user_ask_chat_turns (chat_id, question, answer, state) VALUES (?, 'Make a spreadsheet of my orders at Bilka', 'Here it is.', 'answered')")
for (const id of ['ch-fixture', 'ch-removed']) { insertChat.run(id, USER); insertTurn.run(id); insertTurn.run(id) }
for (let i = 0; i < NEIGHBOURS; i++) { insertChat.run(`ch-n${i}`, `u-neighbour${String(i).padStart(6, '0')}`); insertTurn.run(`ch-n${i}`) }
// files and charts Ask made: two files and a chart on the account, and one of each next door
// the account's file has bytes on disk, so its download answers rather than 404s
const { storeFile } = await import('../src/lib/storage.js')
const storedFixture = storeFile(USER, 'ask-files', Buffer.from('xlsx'))
const insertFile = db.prepare(`INSERT INTO user_ask_files (id, user_id, chat_id, title, type, asked_at, size, stored_name, kept_until, expires_at)
	VALUES (?, ?, ?, 'Make a spreadsheet of my orders this month', 'xlsx', '2026-10-22T14-05', 4, '${storedFixture}', '2026-11-21', unixepoch() + 2592000)`)
const insertChart = db.prepare(`INSERT INTO user_ask_charts (id, user_id, chart, expires_at) VALUES (?, ?, '{"kind":"bars"}', unixepoch() + 2592000)`)
insertFile.run('af-fixture', USER, 'ch-fixture')
insertFile.run('af-removed', USER, 'ch-removed')
insertChart.run('ac-fixture', USER)
for (let i = 0; i < NEIGHBOURS; i++) {
	insertFile.run(`af-n${i}`, `u-neighbour${String(i).padStart(6, '0')}`, `ch-n${i}`)
	insertChart.run(`ac-n${i}`, `u-neighbour${String(i).padStart(6, '0')}`)
}

// The demo fill rewrites the whole ledger, so the statistics db.js gathered over an empty
// account are stale -- exactly what routes/account.js re-runs ANALYZE for after a fill.
db.exec('ANALYZE')

const { app } = await import('../src/app.js')
const { idle } = await import('../src/lib/categoryModel.js')
const server = app.listen(0)
await new Promise(resolve => server.once('listening', resolve))
const BASE = `http://127.0.0.1:${server.address().port}/api`
const H = { Authorization: `Bearer ${SESSION}` }

const ids = {
	vendor: db.prepare('SELECT id FROM vendors WHERE user_id = ? ORDER BY name LIMIT 1').get(USER).id,
	category: db.prepare('SELECT id FROM categories WHERE user_id = ? ORDER BY name LIMIT 1').get(USER).id,
	order: db.prepare('SELECT id FROM orders WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(USER).id,
	bookmark: db.prepare('SELECT id FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(USER).id
}
// one receipt on that order, with its full-size copy, so the file reads answer rather than 404
db.prepare(`INSERT INTO order_attachments (id, order_id, name, kind, meta, content_type, size, data, original, original_content_type)
	VALUES ('a-fixture', ?, 'receipt.jpg', 'image', '', 'image/webp', 4, x'00000000', x'ffd8ffd9', 'image/jpeg')`).run(ids.order)

/* Every read the app serves, and every shape of the orders list -- each filter, each sort, and
   the combinations whose plans differ from either half alone. A route or a filter missing here
   is a query this script cannot see, so a new one belongs in this list at the same time. */
const REQUESTS = [
	'/orders', '/orders?page=40', '/orders?sort=date-asc', '/orders?sort=amount-desc',
	'/orders?pageSize=0', '/orders?pageSize=0&with=amountScale', '/orders?status=Draft&pageSize=0', `/orders?vendorId=${ids.vendor}&status=Returned&pageSize=0`,
	'/orders?pageSize=0&with=facets', '/bookmarks?pageSize=0',
	'/orders?sort=amount-asc&page=20', '/orders?sort=discount-desc', '/orders?sort=discount-asc',
	'/orders?sort=vendor-asc', '/orders?sort=vendor-asc&page=20',
	`/orders?vendorId=${ids.vendor}`, `/orders?vendorId=${ids.vendor}&page=10`,
	`/orders?categoryId=${ids.category}`, '/orders?categoryId=none',
	'/orders?status=Delivered', '/orders?kind=Expense', '/orders?status=Returned&kind=Gift',
	'/orders?minAmount=100', '/orders?maxAmount=2000', '/orders?minAmount=100&maxAmount=2000',
	'/orders?from=2026-01-01', '/orders?to=2026-06-30', '/orders?from=2026-01-01&to=2026-06-30',
	'/orders?query=kaffe', '/orders?query=zzznomatch', '/orders?query=æg',
	`/orders?vendorId=${ids.vendor}&status=Delivered&sort=amount-desc`,
	'/orders?pageSize=6&with=itemTitles', '/orders/draft', `/orders/${ids.order}`,
	`/orders/${ids.order}/attachments/a-fixture/file`, `/orders/${ids.order}/attachments/a-fixture/file?download=1`,
	'/orders?pageSize=25&with=rows', '/orders?pageSize=1&with=facets',
	`/orders?pageSize=1&with=facets&status=Delivered,Ordered&vendorId=${ids.vendor},v-main-1&categoryId=${ids.category},none`,
	'/orders?receipt=missing', '/orders?receipt=attached&files=1&discounted=1', '/orders?importId=im-fixture',
	'/orders/lines', '/orders/lines?status=Delivered&sort=amount-desc', '/orders/lines?sort=vendor-asc',
	`/orders/lines?ids=${ids.order}&sort=date-desc`, '/orders/impact', '/orders/impact?status=Delivered&from=2026-01-01',
	`/orders/impact?ids=${ids.order}`,
	'/vendors', '/vendors/recent', `/vendors/${ids.vendor}`, `/vendors/${ids.vendor}/year`,
	`/vendors/${ids.vendor}/orders-carrying?categories=${encodeURIComponent(JSON.stringify(['Groceries']))}`,
	'/vendors?pageSize=0', '/vendors?archived=all&pageSize=0', '/vendors?name=Netto&pageSize=0', '/vendors?name=Netto&pageSize=1&shape=brief',
	'/vendors?like=Netto%20ApS&aka=Netto%20Aarhus&pageSize=1&shape=brief',
	// the paged vendor list: each sort, page 2, each filter, and the lookups the pickers and forms make
	...['name-asc', 'name', 'spend-desc', 'spend-asc', 'orders-desc', 'saved-desc', 'saved-asc', 'use', 'recent'].map(sort => `/vendors?sort=${sort}&pageSize=10`),
	'/vendors?pageSize=10&page=2', '/vendors?sort=spend-desc&pageSize=10&page=2', '/vendors?archived=yes&pageSize=10',
	'/vendors?archived=all&sort=spend-desc&pageSize=10', '/vendors?query=bil&pageSize=10', '/vendors?query=bil&sort=spend-desc&pageSize=10',
	'/vendors?query=æg&pageSize=10', '/vendors?flag=possible-duplicate&pageSize=10', '/vendors?flag=possible-duplicate&sort=spend-desc&pageSize=10',
	'/vendors?flag=possible-duplicate&query=bil&pageSize=10', `/vendors?ids=${ids.vendor},v-main-1&archived=all&with=duplicates&pageSize=2`,
	`/vendors?near=${ids.vendor}&except=${ids.vendor}&sort=recent&favourites=first&pageSize=10`, `/vendors?near=${ids.vendor}&except=${ids.vendor}&sort=recent&favourites=first&query=bil&pageSize=10`,
	'/vendors?name=Netto&pageSize=1', `/vendors?name=Netto&except=${ids.vendor}&pageSize=1`, '/vendors?like=Netto%20ApS&aka=Netto%20Aarhus&pageSize=1',
	'/categories', '/categories/recent', `/categories/${ids.category}`, '/categories/colour',
	'/categories?pageSize=0', '/categories?flag=near-limit&early=80&pageSize=0', '/categories?flag=near-limit&early=80&sort=limit-desc&pageSize=10', '/categories?name=Groceries&pageSize=1&shape=brief', `/categories?ids=${ids.category}&pageSize=1&shape=brief`,
	'/categories/limited', '/categories/limited?over=yes',
	// the paged category list, as above
	...['name-asc', 'month-desc', 'month-asc', 'limit-desc', 'orders-desc'].map(sort => `/categories?sort=${sort}&with=month&pageSize=10`),
	'/categories?pageSize=10&page=2', '/categories?sort=month-desc&with=month&pageSize=10&page=2', '/categories?query=mad&pageSize=10',
	'/categories?query=æg&sort=orders-desc&pageSize=10', `/categories?ids=${ids.category},c-main-1&with=month,bookmarks&pageSize=2`,
	`/categories?except=${ids.category}&sort=orders-desc&favourites=first&pageSize=10`, '/categories?name=Groceries&pageSize=1',
	'/categories?flag=over-limit&pageSize=1000', '/categories?month=2026-09&with=month&pageSize=10', '/categories?flag=over-limit&month=2026-09&with=month&pageSize=10', '/categories?bookmarks=open&with=bookmarks&pageSize=10', '/categories?bookmarks=archived&with=bookmarks&query=a&pageSize=10',
	'/bookmarks/categories', '/bookmarks/categories?archived=yes',
	'/stats?range=week', '/stats?range=month', '/stats?range=quarter', '/stats?range=year',
	'/stats?range=all', '/stats?range=month&summary=1',
	'/stats?range=month&flow=expenses&step=day', '/stats?range=quarter&flow=expenses&step=week', '/stats?range=year&flow=expenses&step=month&excluded=include',
	'/stats?range=days30', '/stats?range=custom&windowId=2026-03-08~2026-04-19',
	'/stats?range=year&flow=expenses', '/stats?range=year&flow=net', '/stats?range=year&flow=refunds',
	`/stats?range=year&flow=expenses&vendorId=${ids.vendor}`, `/stats?range=year&flow=expenses&categoryId=${ids.category}`,
	'/stats?range=year&flow=expenses&categoryId=none', '/stats?range=year&flow=expenses&status=Delivered&from=2026-08-01&to=2026-08-31',
	'/stats/orders?range=year&flow=expenses', `/stats/orders?range=year&flow=expenses&vendorId=${ids.vendor}&page=2`,
	'/stats/home', '/stats/summary',
	'/counts', '/bookmarks', '/bookmarks?archived=yes',
	'/bookmarks?sort=added-asc', '/bookmarks?sort=price-desc', '/bookmarks?sort=name-asc',
	`/bookmarks?categoryId=${ids.category}`, '/bookmarks?categoryId=none',
	'/bookmarks?query=sko', '/bookmarks?query=æg', '/bookmarks?from=2020-01-01&to=2030-12-31',
	`/bookmarks/${ids.bookmark}`,
	'/settings', '/imports', '/imports/im-fixture', '/imports/im-fixture/undo', '/statuses', '/views', '/account/passkeys', '/account/mcp-tokens', '/ask', '/ask/questions',
	'/ask/chats', '/ask/chats?q=bilka', '/ask/chats?pageSize=0', '/ask/chats/ch-fixture',
	'/ask/files', '/ask/files?q=bilka', '/ask/files?pageSize=0', '/ask/files/states?ids=af-fixture,af-gone', '/ask/files/af-fixture/download',
	'/search?query=bil', '/search?query=zzznomatch', '/search?query=æg', '/search?query=w',
	'/search/names?span=groceries&span=netto&span=zzz', '/search/names?span=føtex&span=mad',
	'/budget', '/budget/2026', '/budget/due?year=2026&month=3', '/budget/accounts', '/budget/links',
	// Home's Drafts card and its Recent orders, which leaves drafts out, and a draft opened as an order
	'/drafts', '/orders?pageSize=4&drafts=none', '/orders/od-fixture', '/drafts/od-fixture'
]

for (const request of REQUESTS) {
	const response = await fetch(BASE + request, { headers: H })
	if (!response.ok) {
		console.error(`  ${request} answered ${response.status} -- the check cannot read plans for it`)
		process.exitCode = 1
	}
	await response.arrayBuffer()
}
// a monthly limit's spend for an order's categories (8b), named as the app itself names them
const limited = (await (await fetch(BASE + '/categories', { headers: H })).json()).filter(c => c.budget > 0).slice(0, 2)
if (!limited.length) console.error('  no category with a limit: /orders/limits reads nothing to plan')
await (await fetch(BASE + `/orders/limits?date=2026-08-15&${limited.map(c => `categories=${encodeURIComponent(c.name)}`).join('&')}`, { headers: H })).arrayBuffer()
// the order one being entered may repeat, asked about an order the account has
const [like] = (await (await fetch(BASE + '/orders?pageSize=1', { headers: H })).json()).orders
if (!like) console.error('  no order: /orders/lookalike reads nothing to plan')
else await (await fetch(BASE + `/orders/lookalike?${new URLSearchParams({ vendor: like.vendor.name, date: like.date, total: like.total })}`, { headers: H })).arrayBuffer()

/* The writes, run last because each one rewrites the fixture every read above is captured
   against. The budget's ids come out of the sheet the app itself answers with, so no SELECT of
   this script's own joins the baseline. */
const sheet = await (await fetch(BASE + '/budget/2026', { headers: H })).json()
// an order saved from the copy it was read as, and one sent twice under one key (6d)
const order = await (await fetch(BASE + `/orders/${ids.order}`, { headers: H })).json()
const asSaved = {
	vendor: order.vendor.name, date: order.date, status: order.status, kind: order.kind, categories: order.categories.map(c => c.name),
	items: order.items.map(i => ({ id: i.id, title: i.title, quantity: i.quantity, price: i.price }))
}
const [group, second] = sheet.groups.filter(g => g.kind === 'expense')
const line = group.lines[1]
const [account, other] = sheet.accounts
// a typed status stays, so the delete below is of one the account added
const spare = (await (await fetch(BASE + '/statuses', {
	method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Spare', tone: 'neutral' })
})).json()).find(s => s.name === 'Spare').key
for (const [method, path, body] of [
	['POST', '/account/passkeys/start', { password: PASSWORD }],
	['PATCH', '/account/passkeys/pk-fixture', { name: 'Work laptop' }],
	['DELETE', '/account/passkeys/pk-removed'],
	['POST', '/account/mcp-tokens', { name: 'Claude Desktop' }],
	['DELETE', '/account/mcp-tokens/mcp-removed'],
	['POST', '/ask/questions', { question: 'How much did I save this month?' }],
	['DELETE', '/ask/questions/aq-removed'],
	['DELETE', '/ask/chats/ch-removed'],
	['POST', '/ask/chats/ch-removed/restore'],
	['DELETE', '/ask/files/af-removed'],
	['POST', '/ask/files/af-removed/restore'],
	['POST', '/vendors/known', { names: ['Netto', 'Netto ApS', 'Nowhere Shop'] }],
	// a line removed from Previous imports, and put back by its toast's Undo
	['PATCH', '/imports/im-fixture', { hidden: true }],
	['PATCH', '/imports/im-fixture', { hidden: false }],
	['POST', '/categories/known', { names: ['Groceries', 'groceries', 'Nothing'] }],
	['PATCH', `/budget/lines/${line.id}`, { month: 3, real: 123.45 }],
	['PATCH', `/budget/lines/${line.id}`, { name: 'Renamed', accountId: other.id }],
	['PATCH', `/budget/lines/${line.id}`, { groupId: second.id, index: 0 }],
	['POST', `/budget/groups/${group.id}/lines`, { name: 'New row', accountId: account.id, months: fixtureMonths(1, 0) }],
	['PATCH', `/budget/groups/${second.id}`, { name: 'Moved', index: 0 }],
	['POST', '/budget/2026/groups', { kind: 'expense', name: 'New group' }],
	['POST', '/budget', { year: 2027, from: 2026, amounts: 'expected' }],
	['DELETE', `/budget/lines/${group.lines[0].id}`],
	['DELETE', `/budget/groups/${group.id}`],
	['POST', '/budget/accounts', { name: 'Holiday' }],
	['PATCH', `/budget/accounts/${other.id}`, { name: 'Budget account', index: 0 }],
	['DELETE', `/budget/accounts/${account.id}`],
	['PUT', '/budget/links', { pattern: 'betalingsservice aquaren aftalenr', kind: 'expense', lineId: line.id }],
	['DELETE', '/budget/links?pattern=betalingsservice%20aquaren%20aftalenr&kind=expense'],
	['PUT', `/orders/${ids.order}`, { ...asSaved, note: 'Saved from its copy', revision: order.revision, clientKey: 'check-put' }],
	['POST', '/orders', { ...asSaved, items: asSaved.items.map(({ id, ...i }) => i), clientKey: 'check-post' }],
	['POST', '/orders', { ...asSaved, items: asSaved.items.map(({ id, ...i }) => i), clientKey: 'check-post' }],
	['POST', '/orders/bulk', { ids: [ids.order], status: 'Returned', addCategories: ['Bulk'], removeCategories: [ids.category] }],
	['POST', '/orders/bulk', { ids: [ids.order], status: 'Delivered', deliveredToday: true }],
	['POST', '/orders/bulk', { restore: [{ id: ids.order, status: 'Ordered', events: [{ status: 'Ordered', date: 1 }] }] }],
	// a draft's form kept as it is edited, a draft created into an order, and one discarded
	['POST', '/drafts', { form: JSON.parse(draftForm) }],
	['PUT', '/drafts/od-fixture', { form: JSON.parse(draftForm) }],
	['POST', '/orders', { ...asSaved, items: asSaved.items.map(({ id, ...i }) => i), clientKey: 'check-draft', draftId: 'od-created' }],
	['DELETE', '/drafts/od-fixture'],
	['POST', '/statuses', { name: 'Waiting', tone: 'progress' }],
	['PATCH', '/statuses/Delivered', { name: 'Received' }],
	['DELETE', `/statuses/${spare}`],
	['POST', '/views', { name: 'This month', query: 'period=month&status=Ordered', attention: true }],
	['PATCH', `/views/sv-${USER}-awaiting`, { name: 'Waiting', query: 'status=Ordered&receipt=missing', isDefault: true, attention: true }],
	['PUT', '/views/shown', { shown: 6 }],
	// Home counts a rule only while it is on, and the receipt rule starts off
	['PATCH', '/settings', { looks: { receipt: true } }],
	['PUT', '/settings/status-email', { weekly: true, monthly: true, zone: 'Europe/Copenhagen', locale: 'da-DK' }],
	['GET', '/stats/home'],
	['GET', '/stats/months?count=8'],
	['PUT', '/stats/summary/seen', { month: '2026-07' }],
	['POST', '/categories/suggestions', { items: ['Ceiling lamp', 'Duvet cover'] }],
	// the names it embedded in the background are stored by now, so the next one reads them back
	['POST', '/categories/suggestions', { items: ['Ceiling lamp', 'Duvet cover'], wait: true }],
	['DELETE', `/views/sv-${USER}-receipt`],
	// a padded name with no orders, so each delete runs its in-use counts and then deletes
	['DELETE', `/categories/c-main-${CATEGORY_COUNT - 1}`],
	['DELETE', `/vendors/v-main-${VENDOR_COUNT - 1}`],
	// last, since it takes the order every write above was made against
	['POST', '/orders/bulk', { ids: [ids.order], delete: true }]
]) {
	if (body?.wait) await idle()
	const response = await fetch(BASE + path, {
		method, headers: { ...H, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body)
	})
	if (!response.ok) {
		console.error(`  ${method} ${path} answered ${response.status} -- the check cannot read plans for it`)
		process.exitCode = 1
	}
	await response.arrayBuffer()
}

// the status email is written on a timer, not for a request, so a month's and a week's are written here
const { latestDuePeriod, statusEmailFor } = await import('../src/lib/statusEmail.js')
const today = new Date()
const local = { day: today.toISOString().slice(0, 10), hour: 9, weekday: (today.getUTCDay() + 6) % 7 }
for (const frequency of ['monthly', 'weekly']) statusEmailFor(USER, latestDuePeriod(frequency, local), '')

// a file and a chart Ask makes while it answers, the day's count of files, and the sweep that removes them after 30 days
const { fileWriter, makeFile, sweepFiles } = await import('../src/lib/askFiles.js')
const { makeChart, chartsById, sweepCharts } = await import('../src/lib/askCharts.js')
makeFile({ userId: USER, day: local.day, unlimited: false, title: 'Make a spreadsheet', askedAt: '2026-10-22T14-05', type: 'csv',
	doc: { title: 'Orders', sections: [{ table: { columns: [{ name: 'Shop', kind: 'text' }], rows: [['Netto']] } }] }, write: fileWriter(USER, 'da-DK') })
makeChart(USER, { kind: 'bars', name: 'Spending', columns: [{ tick: 'Aug', values: [10] }] })
chartsById(USER, ['ac-fixture'])
// a question asked in a new chat and in a kept one, asked again after it failed, ended, and the chat named
const { answeredTurnsOf, endTurn, nameChat, restartFailedTurn, startTurn, sweepChats } = await import('../src/lib/askChats.js')
const started = startTurn({ userId: USER, chatId: null, question: 'Which shop did I use most?', day: local.day, pairsMost: 9 })
const followed = startTurn({ userId: USER, chatId: 'ch-fixture', question: 'And last year?', day: local.day, pairsMost: 9 })
endTurn(followed.turnId, 'failed')
endTurn(restartFailedTurn({ userId: USER, chatId: 'ch-fixture', turnId: followed.turnId, day: local.day, pairsMost: 9 }).turnId, 'answered', 'Netto.')
nameChat(started.chatId, 'Most used shop')
answeredTurnsOf(USER, 'ch-fixture')
sweepChats()
sweepFiles()
sweepCharts()

// a passkey sign-in reads its passkey before the device's answer is checked, so a made-up answer runs the read and is refused
const { ticket } = await (await fetch(BASE + '/auth/passkey/start', { method: 'POST' })).json()
const refused = await fetch(BASE + '/auth/passkey/finish', {
	method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket, response: { id: 'pk-fixture', response: {} } })
})
if (refused.status !== 401) { console.error(`  POST /auth/passkey/finish answered ${refused.status}, not 401`); process.exitCode = 1 }
await refused.arrayBuffer()

// an assistant's tool call: /mcp reads the token, then asks a read route with it
const called = await (await fetch(BASE.replace(/\/api$/, '/mcp'), {
	method: 'POST', headers: { Authorization: `Bearer ${MCP_TOKEN}`, 'Content-Type': 'application/json' },
	body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_monthly_totals', arguments: { months: 3 } } })
})).json()
if (!called.result || called.result.isError) { console.error(`  the /mcp tool call failed: ${JSON.stringify(called)}`); process.exitCode = 1 }

// a scan, which only a file reaches: it becomes a draft, the same bytes again point to it, and each goes
const sharp = (await import('sharp')).default
const receipt = new Blob([await sharp({ create: { width: 8, height: 8, channels: 3, background: '#ffffff' } }).png().toBuffer()], { type: 'image/png' })
const scanned = []
for (let i = 0; i < 2; i++) {
	const form = new FormData()
	form.append('file', receipt, 'receipt.png')
	const response = await fetch(BASE + '/scan/documents?scan=1', { method: 'POST', headers: H, body: form })
	if (!response.ok) { console.error(`  POST /scan/documents answered ${response.status}`); process.exitCode = 1 }
	scanned.push((await response.json()).key)
}
for (const [method, path] of [
	['GET', `/scan/draft/${scanned[1]}?draft=1`], ['POST', `/scan/documents/${scanned[1]}/reread`],
	['DELETE', `/scan/documents/${scanned[1]}`], ['DELETE', `/scan/documents/${scanned[0]}`]
]) {
	const response = await fetch(BASE + path, { method, headers: H })
	if (!response.ok) { console.error(`  ${method} ${path} answered ${response.status}`); process.exitCode = 1 }
	await response.arrayBuffer()
}

server.close()

/* ---- explain what was captured ---- */

const explainer = new Database(DB_PATH, { readonly: true })
// The non-ASCII text filter (lib/textSearch.js) registers these on the app's own connection;
// this second connection needs its own copy, and it is the real implementation rather than a
// stub so the timings printed below are the ones the app actually pays.
explainer.function('contains_fold', { deterministic: true }, (haystack, needle) =>
	haystack != null && String(haystack).toLowerCase().includes(needle) ? 1 : 0)
explainer.function('lower_fold', { deterministic: true }, text => (text == null ? null : String(text).toLowerCase()))

const median = xs => xs.sort((a, b) => a - b)[xs.length >> 1]

function analyse({ sql, params }) {
	const plan = explainer.prepare('EXPLAIN QUERY PLAN ' + sql).all(...params).map(r => r.detail)
	const statement = explainer.prepare(sql)
	const run = () => (statement.reader ? statement.all(...params) : null)
	run()
	const times = []
	for (let i = 0; i < 7; i++) { const t0 = performance.now(); run(); times.push(performance.now() - t0) }

	const scans = plan.flatMap(line => {
		const m = /^SCAN (\w+)(?: AS (\w+))?/.exec(line) ?? /^SCAN (\w+)/.exec(line)
		return m && BIG_TABLES.has(m[1]) ? [m[1]] : []
	})
	// The alias form ("SCAN ot") hides the table name, so resolve aliases out of the SQL itself.
	const aliasedScans = plan.flatMap(line => {
		const m = /^SCAN (\w+)$/.exec(line)
		if (!m) return []
		const table = tableForAlias(sql, m[1])
		return table && BIG_TABLES.has(table) ? [table] : []
	})
	const indexes = plan.flatMap(line => [...line.matchAll(/USING (?:COVERING )?INDEX (\w+)/g)].map(m => m[1]))
	const tables = [...sql.matchAll(/\b(?:FROM|JOIN)\s+(\w+)/gi)].map(m => m[1].toLowerCase())

	/* A whole account read through an index that does not carry what the query selects: the
	   plan says INDEX rather than COVERING INDEX, and user_id is the only thing constraining
	   it, so SQLite walks every entry this user has and fetches the row behind each one. This
	   is the shape that made summing an account's spend cost 32ms where the covering index
	   answers in 2.6ms, and it is invisible to a SCAN check because it is technically a seek. */
	const wholeAccountProbes = plan.flatMap(line => {
		const m = /^SEARCH (\w+) USING INDEX (\w+) \(([^)]*)\)/.exec(line)
		if (!m) return []
		const table = tableForAlias(sql, m[1]) ?? m[1].toLowerCase()
		const constraints = m[3].split(/\s+AND\s+/).map(c => c.trim())
		return BIG_TABLES.has(table) && constraints.length === 1 && constraints[0].startsWith('user_id')
			? [`walks one account's ${table} through non-covering ${m[2]}`] : []
	})

	return {
		plan,
		findings: [
			...new Set([...scans, ...aliasedScans]).values().map(t => `scans ${t}`),
			...new Set(wholeAccountProbes),
			...(plan.some(l => l.includes('TEMP B-TREE')) ? ['sorts in a temp B-tree'] : []),
			...(tables.some(t => SCOPED_TABLES.has(t)) && !/user_id/i.test(sql) ? ['reads a per-account table without naming user_id'] : [])
		],
		indexes: [...new Set(indexes)].sort(),
		ms: Math.round(median(times) * 1000) / 1000
	}
}

/** Which table an alias belongs to, read off the FROM/JOIN clause that introduced it. */
function tableForAlias(sql, alias) {
	const m = new RegExp(`\\b(?:FROM|JOIN)\\s+(\\w+)\\s+(?:AS\\s+)?${alias}\\b`, 'i').exec(sql)
	return m ? m[1].toLowerCase() : null
}

const statements = {}
const readers = new Map()   // index name -> how many statements plan through it
for (const [key, entry] of [...captured].sort(([a], [b]) => a.localeCompare(b))) {
	const { plan, findings, indexes, ms } = analyse(entry)
	statements[key] = { plan, findings, indexes }
	for (const index of indexes) readers.set(index, (readers.get(index) ?? 0) + 1)
	if (VERBOSE) console.log(`${ms.toFixed(3)}ms  ${findings.length ? '! ' : '  '}${key.slice(0, 110)}`)
}

/* The write side. Every index here is rewritten whenever a covered column changes, and the
   order totals are trigger-maintained -- so editing one line item rewrites its order row and
   every index carrying total, saved or discount along with it. Counting them per table, and
   naming which statements read each one, is what keeps "add an index" an argument rather than
   a reflex: an index with no reader is pure write cost, and a new one has to show up in review
   as a baseline change. Automatic indexes (sqlite_autoindex_*, created by UNIQUE and PRIMARY
   KEY) are listed as readers but never counted against the budget -- they are the constraint,
   not a choice. */
const inventory = {}
for (const row of explainer.prepare(
	`SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY tbl_name, name`).all()) {
	const columns = explainer.prepare(`SELECT name FROM pragma_index_info(?)`).all(row.name).map(r => r.name)
	inventory[row.name] = { table: row.tbl_name, columns, readers: readers.get(row.name) ?? 0 }
}

/* How long the writes actually take, on the seeded account, through the app's own statements
   and triggers -- printed rather than gated (a shared runner's clock is not evidence), but it
   is the number to look at when an index is proposed. */
const writeCost = (() => {
	const order = db.prepare('SELECT id FROM orders WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(USER)
	const item = db.prepare('SELECT id, price FROM order_items WHERE order_id = ? LIMIT 1').get(order.id)
	if (!item) return null
	const update = db.prepare('UPDATE order_items SET price = ? WHERE id = ?')
	const times = []
	for (let i = 0; i < 25; i++) {
		const t0 = performance.now()
		update.run(item.price + (i % 2 ? 0.01 : -0.01), item.id)
		times.push(performance.now() - t0)
	}
	update.run(item.price, item.id)
	return Math.round(median(times) * 1000) / 1000
})()

explainer.close()
db.close()
rmSync(tmp, { recursive: true, force: true })

const results = { statements, inventory }

/* ---- compare against the baseline ---- */

const indexCount = Object.keys(inventory).length
const unread = Object.entries(inventory).filter(([, v]) => !v.readers).map(([name]) => name)

if (UPDATE) {
	writeFileSync(BASELINE, JSON.stringify(results, null, '\t') + '\n')
	const flagged = Object.values(statements).filter(r => r.findings.length).length
	console.log(`Blessed ${Object.keys(statements).length} statements (${flagged} carrying an accepted finding)`)
	console.log(`and ${indexCount} indexes (${unread.length} with no reader) into ${path.relative(process.cwd(), BASELINE)}.`)
	if (writeCost != null) console.log(`One line-item edit, through the triggers and every index: ${writeCost}ms.`)
	process.exit(process.exitCode ?? 0)
}

if (!existsSync(BASELINE)) {
	console.error('No baseline yet. Run `npm run queries:bless` and commit query-plans.json.')
	process.exit(1)
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'))
const was = baseline.statements ?? {}
const wasIndexes = baseline.inventory ?? {}
const added = Object.keys(statements).filter(k => !(k in was))
const removed = Object.keys(was).filter(k => !(k in statements))
const changed = Object.keys(statements).filter(k => k in was
	&& JSON.stringify(was[k].plan) !== JSON.stringify(statements[k].plan))

let failures = 0
const report = (key, why) => {
	const r = statements[key]
	console.log(`\n${why}:\n  ${key.slice(0, 160)}`)
	for (const line of r.plan) console.log(`    ${line}`)
	for (const finding of r.findings) { console.log(`  FINDING: ${finding}`); failures++ }
}

for (const key of added) report(key, 'New statement')
for (const key of changed) {
	report(key, 'Plan changed')
	console.log('  was:')
	for (const line of was[key].plan) console.log(`    ${line}`)
	if (!statements[key].findings.length && was[key].findings.length)
		console.log('  (the finding the old plan carried is gone)')
}
for (const key of removed) console.log(`\nStatement gone (drop it from the baseline with queries:bless):\n  ${key.slice(0, 160)}`)

/* An index is a standing write cost, so the inventory is compared as strictly as the plans:
   a new one has to be argued for in review, and one that has lost its last reader is dead
   weight to remove rather than to keep paying for. */
const newIndexes = Object.keys(inventory).filter(k => !(k in wasIndexes))
const goneIndexes = Object.keys(wasIndexes).filter(k => !(k in inventory))
for (const name of newIndexes) {
	console.log(`\nNew index: ${name} on ${inventory[name].table} (${inventory[name].columns.join(', ')})`)
	console.log(`  read by ${inventory[name].readers} statement(s); every write touching those columns now maintains it`)
	if (!inventory[name].readers) { console.log('  FINDING: no statement plans through it'); failures++ }
}
for (const name of goneIndexes) console.log(`\nIndex gone: ${name}`)
for (const [name, entry] of Object.entries(inventory)) {
	if (entry.readers || !(name in wasIndexes) || !wasIndexes[name].readers) continue
	console.log(`\n${name} has lost its last reader -- it is write cost with nothing reading it now.`)
	failures++
}

const unchanged = Object.keys(statements).length - added.length - changed.length
const quiet = !added.length && !changed.length && !removed.length && !newIndexes.length && !goneIndexes.length
if (writeCost != null) console.log(`\nOne line-item edit, through the triggers and ${indexCount} indexes: ${writeCost}ms.`)
/* Said once, every run, without failing anything: an index no statement here reads is a write
   cost the schema is paying, and worth revisiting when someone is next in the area -- but a
   standing red build over a decision already taken is how a check gets ignored. */
if (unread.length) console.log(`No statement plans through: ${unread.join(', ')} (write cost, no reader).`)
if (quiet && !failures) {
	console.log(`${unchanged} statements and ${indexCount} indexes, all as blessed.`)
	process.exit(process.exitCode ?? 0)
}

console.log(`${unchanged} unchanged, ${added.length} new, ${changed.length} changed, ${removed.length} gone; ${indexCount} indexes.`)
if (failures) {
	console.log(`\n${failures} finding(s) in what changed. Before reaching for an index -- the option that`)
	console.log('costs every write from here on -- ask whether the path is hot enough to be worth anything')
	console.log('at all, then whether the query can be rewritten, then whether the row can carry the answer')
	console.log('(item_count and category_count are that trade already made). An index is the last option,')
	console.log('and a plan that is fine as it stands is accepted with `npm run queries:bless`.')
	process.exit(1)
}
console.log('\nNo findings in what changed. Record it with `npm run queries:bless`.')
process.exit(1)
