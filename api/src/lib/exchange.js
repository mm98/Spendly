import { CURRENCIES } from './constants.js'

/* A scanned document printed in another currency than the account's is restated in the account's,
   at the rate of the document's date. The rate source is the only call besides the reading itself
   that leaves the server, and it carries two currency codes and a date -- nothing from the document. */

const RATE_URL = 'https://api.frankfurter.dev/v1'
const RATE_TIMEOUT_MS = 5_000
const cents = n => Math.round(n * 100) / 100
const KNOWN = new Set(CURRENCIES.map(c => c.code))

/** Units of `to` for one unit of `from` on `date` (the latest rate when null), or null when none could be had. */
export async function rateFor(from, to, date, fetchRate = fetch) {
	try {
		const response = await fetchRate(`${RATE_URL}/${date ?? 'latest'}?base=${from}&symbols=${to}`, { signal: AbortSignal.timeout(RATE_TIMEOUT_MS) })
		if (!response.ok) return null
		const rate = (await response.json())?.rates?.[to]
		return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : null
	} catch {
		return null
	}
}

/** `read` (lib/scanParse.js's normalised answer) with every amount in `account`'s currency.
    A document with no currency printed, or already in the account's, is returned as it is.
    When no rate can be had the amounts stay as printed and `converted.rate` is null, so the
    review screen can say so rather than show them as if they were the account's. */
export async function inAccountCurrency(read, account, fetchRate) {
	if (!read.currency || read.currency === account || !KNOWN.has(account)) return read
	const rate = KNOWN.has(read.currency) ? await rateFor(read.currency, account, read.date, fetchRate) : null
	const converted = { from: read.currency, to: account, rate }
	if (!rate) return { ...read, converted }
	const scale = n => (n == null ? n : cents(n * rate))
	return {
		...read, converted,
		shipping: scale(read.shipping), discount: scale(read.discount), total: scale(read.total),
		lines: read.lines.map(l => ({ ...l, price: scale(l.price), retail: scale(l.retail) }))
	}
}
