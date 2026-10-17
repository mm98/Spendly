import { db } from '../db.js'
import { nowEpoch } from './dates.js'
import { CHECK_LOOKUPS_A_DAY, LOOKUPS_A_DAY, RECHECK_DAYS, checkLookupsLeft, lookUpNumber, searchName } from './cvrRegister.js'

/* Keeps Danish vendors' company details current (5m): new numbers first, then weekly rechecks, then
   name searches. Runs hourly and stops when the day's lookups for it are used. */

const HOUR_MS = 60 * 60 * 1000
const FIRST_RUN_MS = 60 * 1000

// numbers a vendor names that the register has never answered for
const selectNewNumbers = db.prepare(`SELECT DISTINCT v.cvr FROM vendors v
	WHERE v.cvr IS NOT NULL AND v.country = 'DK' AND NOT EXISTS (SELECT 1 FROM cvr_companies c WHERE c.cvr = v.cvr)`)
// companies a vendor names, last checked over a week ago, oldest first; a company that has ceased trading stays as it ended
const selectDueNumbers = db.prepare(`SELECT c.cvr FROM cvr_companies c
	WHERE c.found = 1 AND c.ceased_on IS NULL AND c.checked_at < ?
		AND EXISTS (SELECT 1 FROM vendors v WHERE v.cvr = c.cvr AND v.country = 'DK')
	ORDER BY c.checked_at LIMIT ?`)
// Danish vendors in use without a number, whose Name has not been searched or has changed since
const selectUnsearched = db.prepare(`SELECT id, name FROM vendors
	WHERE country = 'DK' AND cvr IS NULL AND archived = 0
		AND (cvr_match_searched_name IS NULL OR cvr_match_searched_name <> name)
		AND (cvr_match_dismissed_name IS NULL OR cvr_match_dismissed_name <> name)
	LIMIT ?`)
const setMatch = db.prepare('UPDATE vendors SET cvr_match = ?, cvr_match_searched_name = ? WHERE id = ?')

let running = false

/** One pass of the check. New numbers first, then the weekly checks, then the name searches. */
export async function checkCompanies() {
	if (running) return
	running = true
	try {
		for (const { cvr } of selectNewNumbers.all()) {
			if ((await lookUpNumber(cvr, LOOKUPS_A_DAY)).status === 'limit') return
		}
		const due = nowEpoch() - RECHECK_DAYS * 86400
		for (const { cvr } of selectDueNumbers.all(due, CHECK_LOOKUPS_A_DAY)) {
			if (!checkLookupsLeft() || (await lookUpNumber(cvr, CHECK_LOOKUPS_A_DAY)).status === 'limit') return
		}
		for (const vendor of selectUnsearched.all(CHECK_LOOKUPS_A_DAY)) {
			if (!checkLookupsLeft()) return
			const answer = await searchName(vendor.name, CHECK_LOOKUPS_A_DAY)
			if (answer.status === 'limit') return
			// a failed lookup is tried again at the next pass
			if (answer.status === 'failed') continue
			setMatch.run(answer.status === 'found' ? answer.company.cvr : null, vendor.name, vendor.id)
		}
	} catch (e) {
		console.error('The company check failed:', e)
	} finally {
		running = false
	}
}

/** Starts the hourly check. Like the backups, it lives as long as the process does. */
export function scheduleCompanyChecks() {
	const first = setTimeout(() => {
		checkCompanies()
		setInterval(checkCompanies, HOUR_MS).unref()
	}, FIRST_RUN_MS)
	first.unref()
	return first
}
