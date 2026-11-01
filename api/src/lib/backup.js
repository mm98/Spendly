import { mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { db, DB_PATH } from '../db.js'
import { zipSingleFile } from './zip.js'
import { dropExpiredTokens } from './tokens.js'
import { pruneVectors } from './categoryModel.js'
import { dropExpiredUploads } from '../routes/scan.js'
import { todayIso as todayStamp } from './dates.js'
import { log } from './log.js'

const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backup')
const MAX_BACKUPS = 5

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
	compactDatabase()
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

// what has outlived its use, removed before the backup so the space it held is given back with the rest
const OUTLIVED = [dropExpiredUploads, dropExpiredTokens, pruneVectors]

/* Empty space and the WAL file never shrink on their own. VACUUM blocks writes while it runs, so only
   here, at night; a failure (it needs disk room for a second copy) must not stop the backup. */
function compactDatabase() {
	for (const job of OUTLIVED) {
		try { job() } catch (err) { log.fault('backup', 'Nightly clean-up failed', err) }
	}
	try {
		db.exec('VACUUM')
		db.pragma('wal_checkpoint(TRUNCATE)')
	} catch (err) {
		log.fault('backup', 'Nightly clean-up failed', err)
	}
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

function backupExistsToday() {
	return existsSync(path.join(BACKUP_DIR, `database-${todayStamp()}.zip`))
}

/* The app runs as one long-lived process with no cron alongside it (docker-compose.yml is a
   single container), so this is the cron job: one timer that fires just before local midnight
   and re-arms itself every 24 hours after that -- the only time a backup is meant to be taken.

   That timer only survives as long as the process does, and watchtower (docker-compose.yml)
   restarts the container the moment a new image lands, which throws away whatever setTimeout
   was waiting for 23:59:59 and starts a fresh one from the new startup time. So a startup check
   below stands in for the days that timer never got a chance to fire on -- but it only takes a
   backup when today does not already have one, specifically so a restart that lands mid-day (a
   deploy, a crash) does nothing: no new file, no overwrite, nothing to notice. It only ever
   fires for real on the rare day the exact-midnight timer was skipped over entirely -- a
   container stopped across the day boundary, with nothing else left to cover that day. */
export function scheduleDailyBackups() {
	if (!backupExistsToday()) backupDatabase().catch(err => log.fault('backup', 'Daily backup failed', err))

	const timer = setTimeout(function runAndReschedule() {
		backupDatabase().catch(err => log.fault('backup', 'Daily backup failed', err))
		const next = setInterval(() => {
			backupDatabase().catch(err => log.fault('backup', 'Daily backup failed', err))
		}, ONE_DAY_MS)
		next.unref()
	}, msUntilEndOfDay())
	timer.unref()

	return timer
}
