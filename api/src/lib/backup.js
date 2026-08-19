import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { db, DB_PATH } from '../db.js'
import { zipSingleFile } from './zip.js'

const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backup')
const MAX_BACKUPS = 5

function todayStamp(date = new Date()) {
	// Local date, not UTC -- has to agree with the local midnight scheduleDailyBackups() fires on,
	// or the stamp can roll over hours away from the backup that's supposed to trigger it.
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const d = String(date.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

/* One backup per day, named for the day it was taken. SQLite's online backup API (better-sqlite3's
   db.backup()) walks the live database page by page over its own connection, which reads through
   the WAL the same way any other reader on that connection would -- so a row committed but not yet
   checkpointed out of spendly.sqlite3-wal is already in the snapshot, not left behind in a file the
   zip never looks at. Confirmed directly: a row inserted and left uncheckpointed (WAL file still
   present, main file still without it) came back from a backup taken in the same run. The snapshot
   itself is written with no WAL of its own -- one plain .sqlite3 file goes into the zip, never a
   trio of .sqlite3/-wal/-shm -- and the temp-file cleanup below removes any -wal/-shm the snapshot
   connection might leave beside it, so nothing but that one consistent file can reach the archive.
   Only the zip's own filename carries the date; the file inside it keeps the database's actual
   name (spendly.sqlite3, or whatever SPENDLY_DB names it) so restoring is a straight unzip-and-
   rename-back rather than a rename to match. Idempotent: a zip already sitting under `backup/` for
   today is left alone rather than retaken, so a restart or a second scheduled tick the same day is
   a no-op. */
export async function backupDatabase() {
	const stamp = todayStamp()
	const zipPath = path.join(BACKUP_DIR, `database-${stamp}.zip`)
	if (existsSync(zipPath)) return zipPath

	mkdirSync(BACKUP_DIR, { recursive: true })
	const dbName = path.basename(DB_PATH)
	const snapshotPath = path.join(BACKUP_DIR, `.${stamp}-${dbName}`)
	try {
		await db.backup(snapshotPath)
		const zip = zipSingleFile(dbName, readFileSync(snapshotPath))
		writeFileSync(zipPath, zip)
	} finally {
		rmSync(snapshotPath, { force: true })
		rmSync(`${snapshotPath}-wal`, { force: true })
		rmSync(`${snapshotPath}-shm`, { force: true })
	}
	pruneOldBackups()
	return zipPath
}

const BACKUP_NAME = /^database-\d{4}-\d{2}-\d{2}\.zip$/

/* database-YYYY-MM-DD.zip sorts the same lexically as chronologically, so the oldest are just
   the ones off the front of a plain sort -- no date parsing needed to find them. */
function pruneOldBackups() {
	const files = readdirSync(BACKUP_DIR).filter(f => BACKUP_NAME.test(f)).sort()
	for (const stale of files.slice(0, Math.max(0, files.length - MAX_BACKUPS)))
		rmSync(path.join(BACKUP_DIR, stale), { force: true })
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export function msUntilNextMidnight(now = new Date()) {
	const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
	return next.getTime() - now.getTime()
}

/* The app runs as one long-lived process with no cron alongside it (docker-compose.yml is a
   single container), so this is the cron job: a backup taken once at startup -- catching up a
   container that was stopped over a day boundary, where nothing else would ever trigger that
   day's backup -- then one timer that fires at the next local midnight and re-arms itself every
   24 hours after that. backupDatabase()'s same-day check keeps the startup catch-up and the
   first midnight run from ever taking two backups for one day. */
export function scheduleDailyBackups() {
	backupDatabase().catch(err => console.error('Daily backup failed:', err))

	const timer = setTimeout(function runAndReschedule() {
		backupDatabase().catch(err => console.error('Daily backup failed:', err))
		const next = setInterval(() => {
			backupDatabase().catch(err => console.error('Daily backup failed:', err))
		}, ONE_DAY_MS)
		next.unref()
	}, msUntilNextMidnight())
	timer.unref()
	return timer
}
