/** The API's date boundary: the frontend sends/reads plain "YYYY-MM-DD" strings (order dates
    carry no time-of-day anywhere in the UI), the database stores unix seconds at 00:00:00 UTC
    of that date. Every route converts at the edge so nothing past this file sees an epoch. */

export const toEpoch = isoDate => Math.floor(Date.parse(isoDate + 'T00:00:00Z') / 1000)

export const fromEpoch = epoch => new Date(epoch * 1000).toISOString().slice(0, 10)

export const nowEpoch = () => Math.floor(Date.now() / 1000)

/* "What day is it right now" -- for a default date and for rejecting a future one, both of
   which are questions about the reader's own calendar day, not about UTC. new Date().toISOString()
   answers in UTC regardless of the container's TZ, so a reader in a zone ahead of UTC (Denmark,
   any time of year) sees their local "today" as still "tomorrow" in UTC terms for the first hour
   or two after their own midnight -- a receipt dated today, typed in during that window, would
   read as dated in the future. getFullYear/getMonth/getDate read the container's local clock
   (TZ in docker-compose.yml), the same local reading todayStamp() in backup.js already uses. */
export function todayIso(date = new Date()) {
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const d = String(date.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}
