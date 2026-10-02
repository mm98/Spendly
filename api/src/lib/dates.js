/** The API's date boundary: the frontend sends/reads plain "YYYY-MM-DD" strings (order dates
    carry no time-of-day anywhere in the UI), the database stores unix seconds at 00:00:00 UTC
    of that date. Every route converts at the edge so nothing past this file sees an epoch. */

export const toEpoch = isoDate => Math.floor(Date.parse(isoDate + 'T00:00:00Z') / 1000)

export const fromEpoch = epoch => new Date(epoch * 1000).toISOString().slice(0, 10)

export const nowEpoch = () => Math.floor(Date.now() / 1000)

/* The server's own calendar day, in the container's local zone (TZ in docker-compose.yml): the
   fallback whenever the reader's own day is not known. */
export function todayIso(date = new Date()) {
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const d = String(date.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86400000

/** The reader's own date, as the browser sends it in X-Spendly-Today. A real date within one day
    of the server's UTC date is trusted; anything else falls back to the server's date. */
export function readerToday(sent, now = new Date()) {
	if (ISO_DATE.test(sent ?? '')) {
		const at = Date.parse(sent + 'T00:00:00Z')
		const utcToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
		if (Math.abs(at - utcToday) <= DAY_MS && fromEpoch(at / 1000) === sent) return sent
	}
	return todayIso(now)
}

/** Sets `req.today` (YYYY-MM-DD) for every route that asks what day it is. */
export function readTodayHeader(req, res, next) {
	req.today = readerToday(req.get('X-Spendly-Today'))
	next()
}
