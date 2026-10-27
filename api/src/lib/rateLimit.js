import { securityLog } from './securityLog.js'

/* Counts in memory: a restart forgets every count, which only lets a visitor start again. */

// past this many keys, the oldest go, so many visitors cannot fill the server's memory
const MAX_KEYS = 10000

/** A counter per key over a window of `perSeconds`: each call counts once for its key and answers
    the seconds to wait when that is more than `most` in the window, or 0. */
export function windowCounter({ most, perSeconds }) {
	const seen = new Map()
	return key => {
		const now = Date.now()
		let entry = seen.get(key)
		if (!entry || entry.until <= now) {
			seen.delete(key)
			entry = { count: 0, until: now + perSeconds * 1000 }
			seen.set(key, entry)
			while (seen.size > MAX_KEYS) seen.delete(seen.keys().next().value)
		}
		entry.count++
		return entry.count > most ? Math.ceil((entry.until - now) / 1000) : 0
	}
}

/** A route's limit per visitor, by the network address they came from: the same 429 the sign-in
    lock-out answers, which the pages already show as a wait. */
export function limitPerVisitor({ most, perSeconds }) {
	const take = windowCounter({ most, perSeconds })
	return (req, res, next) => {
		const wait = take(req.ip)
		if (wait) {
			securityLog(req, 'rate-limited', { waitSeconds: wait })
			return res.status(429).json({ error: 'Too many attempts.', retryAfter: wait })
		}
		next()
	}
}

/** Reading a receipt or suggesting categories with the model costs money per request, so an
    account gets this many a day. Seconds to wait, or 0 and the read is counted. */
export const paidReadWait = windowCounter({ most: 500, perSeconds: 24 * 60 * 60 })
