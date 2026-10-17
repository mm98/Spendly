import { db } from '../db.js'
import { nowEpoch, todayIso } from './dates.js'

/* The Danish CVR register, through cvrapi.dk's free tier, and what it has answered. A company is
   stored by its CVR number once, for every vendor and invoice that names it. */

const API = process.env.SPENDLY_CVR_API || 'https://cvrapi.dk/api'
// cvrapi.dk asks every caller to name itself and a way to reach it
const CONTACT = process.env.SPENDLY_CVR_CONTACT || process.env.SPENDLY_SECURITY_CONTACT || process.env.SPENDLY_SMTP_USER || ''
const USER_AGENT = ['Spendly', 'company addresses for invoices', CONTACT].filter(Boolean).join(' - ')
const TIMEOUT_MS = 8000

// The free tier answers 50 lookups a day. The background check stops at 40, so the rest stay for
// the invoice dialog and newly saved numbers.
export const LOOKUPS_A_DAY = 50
export const CHECK_LOOKUPS_A_DAY = 40
export const RECHECK_DAYS = 7

export const isCvrNumber = text => /^\d{8}$/.test(text)

const selectDay = db.prepare('SELECT used FROM cvr_lookup_days WHERE day = ?')
const useOne = db.prepare(`INSERT INTO cvr_lookup_days (day, used) VALUES (?, 1)
	ON CONFLICT (day) DO UPDATE SET used = used + 1`)
const useAll = db.prepare(`INSERT INTO cvr_lookup_days (day, used) VALUES (@day, @all)
	ON CONFLICT (day) DO UPDATE SET used = MAX(used, @all)`)

/** Takes one of today's lookups, or answers false when `share` of them is spent. */
const takeLookup = db.transaction(share => {
	const day = todayIso()
	if ((selectDay.get(day)?.used ?? 0) >= share) return false
	useOne.run(day)
	return true
})

/** Whether the background check may still look anything up today. */
export const checkLookupsLeft = () => (selectDay.get(todayIso())?.used ?? 0) < CHECK_LOOKUPS_A_DAY

// the register said the day's lookups are used, whatever was counted here
const spendDay = () => useAll.run({ day: todayIso(), all: LOOKUPS_A_DAY })

/** "21/06 - 1999" as cvrapi.dk writes a date, to YYYY-MM-DD; null for none. */
const isoOf = text => {
	const m = /^(\d{2})\/(\d{2}) - (\d{4})$/.exec(String(text ?? '').trim())
	return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

const linesOf = answer => [
	answer.addressco ? `c/o ${answer.addressco}` : null,
	answer.address,
	[answer.zipcode, answer.city].filter(Boolean).join(' ')
].map(line => String(line ?? '').trim()).filter(Boolean)

/** One question to the register: `{ status: 'found', company }`, `'none'`, `'limit'` or `'failed'`.
    `share` is how many of the day's lookups this caller may use. */
async function ask(query, share) {
	if (!takeLookup(share)) return { status: 'limit' }
	let response, body
	try {
		const url = `${API}?${new URLSearchParams({ search: query, country: 'dk' })}`
		response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) })
		body = await response.json().catch(() => null)
	} catch {
		return { status: 'failed' }
	}
	const error = String(body?.error ?? '')
	if (/QUOTA/i.test(error) || response.status === 402 || response.status === 429) { spendDay(); return { status: 'limit' } }
	if (/NOT_FOUND/i.test(error) || response.status === 404) return { status: 'none' }
	if (!response.ok || !body?.vat || !body?.name) return { status: 'failed' }
	return {
		status: 'found',
		company: { cvr: String(body.vat).padStart(8, '0'), name: String(body.name).trim(), address: linesOf(body), ceasedOn: isoOf(body.enddate) }
	}
}

const selectCompany = db.prepare('SELECT cvr, found, name, ceased_on, checked_at FROM cvr_companies WHERE cvr = ?')
const selectAddresses = db.prepare('SELECT valid_from, address FROM cvr_company_addresses WHERE cvr = ? ORDER BY valid_from')
const upsertCompany = db.prepare(`INSERT INTO cvr_companies (cvr, found, name, ceased_on, checked_at)
	VALUES (@cvr, @found, @name, @ceasedOn, @checkedAt)
	ON CONFLICT (cvr) DO UPDATE SET found = excluded.found, name = COALESCE(excluded.name, name),
		ceased_on = excluded.ceased_on, checked_at = excluded.checked_at`)
const insertAddress = db.prepare(`INSERT INTO cvr_company_addresses (cvr, valid_from, address) VALUES (?, ?, ?)
	ON CONFLICT (cvr, valid_from) DO UPDATE SET address = excluded.address`)

/** What the register holds for a number: `{ cvr, found, name, ceasedOn, checkedAt, addresses }`, or
    null when it has not been looked up. `addresses` are oldest first, each `{ validFrom, lines }`. */
export function storedCompany(cvr) {
	const row = cvr ? selectCompany.get(cvr) : null
	if (!row) return null
	return {
		cvr: row.cvr, found: Boolean(row.found), name: row.name, ceasedOn: row.ceased_on,
		checkedAt: new Date(row.checked_at * 1000).toISOString().slice(0, 10),
		checkedEpoch: row.checked_at,
		addresses: selectAddresses.all(cvr).map(a => ({ validFrom: a.valid_from, lines: a.address.split('\n') }))
	}
}

/** The company's address on a day: the last one seen by then, or its first when the day is older. */
export const addressOn = (company, day) =>
	(company?.addresses.filter(a => a.validFrom <= day).at(-1) ?? company?.addresses[0])?.lines ?? []

/** The company's address now. */
export const currentAddress = company => company?.addresses.at(-1)?.lines ?? []

/* An answer is kept: a changed address is added from today, the register's name and end date replace
   the stored ones, and a number the register does not know is kept as not found. */
const storeAnswer = db.transaction((cvr, answer) => {
	const today = todayIso()
	if (answer.status === 'none') {
		upsertCompany.run({ cvr, found: 0, name: null, ceasedOn: null, checkedAt: nowEpoch() })
		return
	}
	const { company } = answer
	upsertCompany.run({ cvr: company.cvr, found: 1, name: company.name, ceasedOn: company.ceasedOn, checkedAt: nowEpoch() })
	const lines = company.address.join('\n')
	const last = selectAddresses.all(company.cvr).at(-1)
	if (lines && last?.address !== lines) insertAddress.run(company.cvr, today, lines)
})

/** Looks a CVR number up in the register and keeps the answer: `{ status, company }` as `ask` gives it. */
export async function lookUpNumber(cvr, share = LOOKUPS_A_DAY) {
	const answer = await ask(cvr, share)
	if (answer.status === 'found' || answer.status === 'none') storeAnswer(cvr, answer)
	return answer
}

/** Searches the register for a company by name. A company found is kept like a looked-up number. */
export async function searchName(name, share = LOOKUPS_A_DAY) {
	const answer = await ask(name, share)
	if (answer.status === 'found') storeAnswer(answer.company.cvr, answer)
	return answer
}

const fresh = company => company && nowEpoch() - company.checkedEpoch < RECHECK_DAYS * 86400

/** The invoice dialog's live lookup by CVR number or name; a number checked this week costs no lookup.
    `{ status: 'found', company: { cvr, name, address } }`, `'none'`, `'limit'` or `'failed'`. */
export async function findCompany(query) {
	const text = String(query ?? '').trim()
	const digits = text.replace(/\s+/g, '')
	if (isCvrNumber(digits)) {
		const stored = storedCompany(digits)
		if (fresh(stored)) return stored.found
			? { status: 'found', company: { cvr: stored.cvr, name: stored.name, address: currentAddress(stored) } }
			: { status: 'none' }
	}
	const answer = isCvrNumber(digits) ? await lookUpNumber(digits) : await searchName(text)
	if (answer.status !== 'found') return answer
	const { cvr, name, address } = answer.company
	return { status: 'found', company: { cvr, name, address } }
}
