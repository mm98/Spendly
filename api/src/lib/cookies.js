/* Minimal cookie read/write — one session cookie, so a full cookie-parsing dependency buys
   nothing a dozen lines here doesn't already cover. */

export const SESSION_COOKIE = 'spendly_session'

export function readCookie(req, name) {
	const header = req.headers.cookie
	if (!header) return null
	for (const part of header.split(';')) {
		const eq = part.indexOf('=')
		if (eq < 0) continue
		if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim())
	}
	return null
}

export function setCookie(res, name, value, { maxAgeSeconds } = {}) {
	const attrs = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax']
	if (process.env.NODE_ENV === 'production') attrs.push('Secure')
	if (maxAgeSeconds != null) attrs.push(`Max-Age=${maxAgeSeconds}`)
	res.append('Set-Cookie', attrs.join('; '))
}

export function clearCookie(res, name) {
	res.append('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}
