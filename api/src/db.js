import Database from 'better-sqlite3'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createHash } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DB_PATH = process.env.SPENDLY_DB ?? path.join(__dirname, '..', 'spendly.sqlite3')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')       // readers don't block the writer, writer doesn't block readers
db.pragma('journal_size_limit = 16777216')  // 16MB: a checkpoint cuts the WAL file back to this, else it keeps its largest size
db.pragma('synchronous = NORMAL')     // safe with WAL (durable at each checkpoint); FULL fsyncs every commit for no benefit here
db.pragma('foreign_keys = ON')
db.pragma('temp_store = MEMORY')      // sort/group temp structures off disk
db.pragma('cache_size = -20000')      // ~20MB page cache, keeps a personal dataset resident

// the fingerprint order_attachments.sha256 holds, for a migration to compare a stored picture with
db.function('sha256_hex', { deterministic: true }, bytes => (bytes == null ? null : createHash('sha256').update(bytes).digest('hex')))

db.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL DEFAULT (unixepoch()))`)

const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map(r => r.name))
const migrationsDir = path.join(__dirname, 'migrations')
const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
const pending = files.filter(f => !applied.has(f))

/* Foreign keys are off for the duration of the migrations, which is what SQLite's own
   table-rebuild procedure requires and not a corner cut.

   A migration that has to change a column SQLite cannot ALTER -- a generated column's
   expression, a CHECK, a type -- rebuilds the table: create the new shape, copy the rows,
   DROP the old, rename. With foreign keys enforced, that DROP is not just a schema edit. It
   performs an implicit DELETE of every row first, and that delete fires ON DELETE CASCADE:
   rebuilding `orders` (migrations/009) took all of order_items and their attachments with it,
   silently, leaving a valid-looking database with every line item gone.

   The pragma is a no-op inside a transaction, so it cannot live in the .sql file -- each
   migration runs in one. It has to be set here, around the loop. `foreign_key_check` below is
   what pays for it: it reports any row left pointing at a parent that is not there, which is
   the class of damage enforcement would have caught as it happened. */
if (pending.length) db.pragma('foreign_keys = OFF')

try {
	for (const file of pending) {
		const sql = readFileSync(path.join(migrationsDir, file), 'utf8')
		db.exec('BEGIN')
		try {
			db.exec(sql)
			db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
			db.exec('COMMIT')
		} catch (e) {
			db.exec('ROLLBACK')
			throw new Error(`Migration ${file} failed: ${e.message}`)
		}
	}

	if (pending.length) {
		const violations = db.pragma('foreign_key_check')
		if (violations.length)
			throw new Error(`Migrations left ${violations.length} foreign key violation(s): ${JSON.stringify(violations.slice(0, 5))}`)
	}
} finally {
	db.pragma('foreign_keys = ON')
}

/* Planner statistics. Without them SQLite ties equal-looking indexes by schema order and
   cannot see how selective a bound is, and both misfires were measured on a 50,000-order
   account: an amount-filtered list ran through idx_orders_user_total and re-sorted every
   matched row (28.9ms for a page that costs 0.3ms with statistics), and any
   SUM-over-the-account read tie-broke onto whichever user-prefixed index came last, paying a
   table probe per row. ANALYZE costs ~90ms at that size (bounded by analysis_limit), and is
   re-run whenever a migration may have changed the schema's shape; `PRAGMA optimize` on the
   other boots re-analyzes only what SQLite itself flags as stale. The one measured cost of
   having statistics: the category-filtered list's shallow page plans off the category's own
   link list and sorts it, ~6ms against ~1ms without -- taken deliberately, because the paths
   statistics fix are 30-66ms filter-panel controls and the path it taxes stays interactive.
   maybe_stale keeps a fresh database honest too: statistics gathered over an empty ledger
   claim every table is tiny, so the first boot after the demo fill (or a big import) must not
   trust them -- routes/account.js re-runs ANALYZE after the fill for the same reason. */
db.pragma('analysis_limit = 400')
const hasStats = db.prepare(`SELECT 1 FROM sqlite_master WHERE name = 'sqlite_stat1'`).get()
if (pending.length || !hasStats) db.exec('ANALYZE')
else db.pragma('optimize')
