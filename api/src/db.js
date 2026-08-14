import Database from 'better-sqlite3'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.SPENDLY_DB ?? path.join(__dirname, '..', 'spendly.sqlite3')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')       // readers don't block the writer, writer doesn't block readers
db.pragma('synchronous = NORMAL')     // safe with WAL (durable at each checkpoint); FULL fsyncs every commit for no benefit here
db.pragma('foreign_keys = ON')
db.pragma('temp_store = MEMORY')      // sort/group temp structures off disk
db.pragma('cache_size = -20000')      // ~20MB page cache, keeps a personal dataset resident

db.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL DEFAULT (unixepoch()))`)

const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map(r => r.name))
const migrationsDir = path.join(__dirname, 'migrations')
const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

for (const file of files) {
	if (applied.has(file)) continue
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
