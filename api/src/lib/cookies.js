/* Minimal cookie read/write — one session cookie, so a full cookie-parsing dependency buys
   nothing a dozen lines here doesn't already cover. */

export const SESSION_COOKIE = 'spendly_session'

export function readCookie(req, name) {
	const header = req.headers.cookie
	if (!header) return null
	for (const part of header.split(';')) {
		const eq = part.indexOf('=')
		if (eq < 0) continue
		if (part.slice(0, eq).trim() === name) {
			/* Never throw on a value this server did not write: a malformed percent-escape (a
			   stray '%' set by another app on the same origin, or a corrupted jar) made
			   decodeURIComponent raise URIError out of requireAuth on every gated request --
			   including the logout that would have cleared the bad cookie, so the 500 was a
			   lockout. Returned raw, a real token is unaffected (session ids are URL-safe) and
			   garbage fails the sessions lookup into the ordinary 401. */
			const raw = part.slice(eq + 1).trim()
			try { return decodeURIComponent(raw) } catch { return raw }
		}
	}
	return null
}

export function setCookie(res, name, value, { maxAgeSeconds } = {}) {
	const attrs = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax']
	/* Secure cookies are refused by browsers over plain http, so a LAN deploy with no TLS
	   (a NAS at http://192.168.x.x) opts out via SPENDLY_PLAIN_HTTP -- sessions can't stick
	   there otherwise. Anything reachable over https should not set it. */
	if (process.env.NODE_ENV === 'production' && process.env.SPENDLY_PLAIN_HTTP !== '1') attrs.push('Secure')
	if (maxAgeSeconds != null) attrs.push(`Max-Age=${maxAgeSeconds}`)
	res.append('Set-Cookie', attrs.join('; '))
}

export function clearCookie(res, name) {
	res.append('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}
