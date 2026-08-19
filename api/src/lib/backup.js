import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import path from 'node:path'
import { db, DB_PATH } from '../db.js'
import { zipSingleFile } from './zip.js'

const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backup')

function todayStamp(date = new Date()) {
	// Local date, not UTC -- has to agree with the local midnight scheduleDailyBackups() fires on,
	// or the stamp can roll over hours away from the backup that's supposed to trigger it.
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const d = String(date.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

/* One backup per day, named for the day it was taken. SQLite's online backup API (better-sqlite3's
   db.backup()) copies a live WAL database to a consistent snapshot without blocking readers or
   writers, so this never needs the app to pause. Idempotent: a zip already sitting under
   `backup/` for today is left alone rather than retaken, so a restart or a second scheduled tick
   the same day is a no-op. */
export async function backupDatabase() {
	const stamp = todayStamp()
	const zipPath = path.join(BACKUP_DIR, `database-${stamp}.zip`)
	if (existsSync(zipPath)) return zipPath

	mkdirSync(BACKUP_DIR, { recursive: true })
	const snapshotPath = path.join(BACKUP_DIR, `.database-${stamp}.sqlite3`)
	try {
		await db.backup(snapshotPath)
		const zip = zipSingleFile(`database-${stamp}.sqlite3`, readFileSync(snapshotPath))
		writeFileSync(zipPath, zip)
	} finally {
		rmSync(snapshotPath, { force: true })
	}
	return zipPath
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function msUntilNextMidnight(now = new Date()) {
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
