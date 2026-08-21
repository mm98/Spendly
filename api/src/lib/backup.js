import { mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { db, DB_PATH } from '../db.js'
import { zipSingleFile } from './zip.js'

const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backup')
const MAX_BACKUPS = 5

function todayStamp(date = new Date()) {
	// Local date, not UTC -- has to agree with the local time scheduleDailyBackups() fires at
	// (see msUntilEndOfDay below), or the stamp names a different day than the one just backed up.
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
   rename-back rather than a rename to match. A restart or a second scheduled tick the same day
   retakes and overwrites today's zip rather than skipping it, so the file on disk is always the
   latest snapshot taken that day, not whichever one happened to be first. */
export async function backupDatabase() {
	const stamp = todayStamp()
	const zipPath = path.join(BACKUP_DIR, `database-${stamp}.zip`)

	mkdirSync(BACKUP_DIR, { recursive: true })
	const dbName = path.basename(DB_PATH)
	const snapshotPath = path.join(BACKUP_DIR, `.${stamp}-${dbName}`)
	try {
		await db.backup(snapshotPath)
		const zip = zipSingleFile(dbName, readFileSync(snapshotPath))
		rmSync(zipPath, { force: true })
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

/* One second before local midnight, not on it -- firing at 00:00:00.000 backs up the database
   at the very start of the new day but stamps the file with that new day's date, which names it
   a day ahead of the data it actually holds (todayStamp() reads the clock at the moment the
   backup runs). Firing at 23:59:59.000 instead means the stamp and the day being backed up are
   the same day, off by the same one second everywhere -- a difference nothing here can observe. */
export function msUntilEndOfDay(now = new Date()) {
	const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 0)
	if (target <= now) target.setDate(target.getDate() + 1)
	return target.getTime() - now.getTime()
}

const ONE_HOUR_MS = 60 * 60 * 1000

/* The app runs as one long-lived process with no cron alongside it (docker-compose.yml is a
   single container), so this is the cron job: a backup taken once at startup -- catching up a
   container that was stopped over a day boundary, where nothing else would ever trigger that
   day's backup -- then one timer that fires just before local midnight and re-arms itself every
   24 hours after that.

   That midnight timer only survives as long as the process does, and this process does not stay
   up for a full day at a stretch: watchtower (docker-compose.yml) polls for a new image every 15
   minutes and restarts the container the moment one lands, which throws away whatever setTimeout
   was waiting for 23:59:59 and starts a fresh one from the new startup time. On an actively
   developed install that redeploys several times a day, the exact-midnight timer routinely never
   gets a full day of uptime to fire in, and the only backup a day actually gets is the startup
   catch-up above -- which makes it look like backups only happen when something happens to
   restart the container, rather than on a schedule.

   The hourly tick below is the fix: on every hour that the process happens to be up, it retakes
   today's backup, so any restart anywhere in the day (not just one lucky enough to still be
   running at 23:59:59) leaves that day covered. backupDatabase() overwriting today's zip each
   time rather than skipping it means this costs nothing extra to run often -- the file on disk is
   just the most recent snapshot of the day, however many times it got retaken. */
export function scheduleDailyBackups() {
	backupDatabase().catch(err => console.error('Daily backup failed:', err))

	const timer = setTimeout(function runAndReschedule() {
		backupDatabase().catch(err => console.error('Daily backup failed:', err))
		const next = setInterval(() => {
			backupDatabase().catch(err => console.error('Daily backup failed:', err))
		}, ONE_DAY_MS)
		next.unref()
	}, msUntilEndOfDay())
	timer.unref()

	const hourly = setInterval(() => {
		backupDatabase().catch(err => console.error('Hourly backup catch-up failed:', err))
	}, ONE_HOUR_MS)
	hourly.unref()

	return timer
}
