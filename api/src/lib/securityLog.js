/* One line per security event, so the log answers who tried what, from where, and how it ended:
   a wrong or refused attempt as much as a right one. Never a password, code, link or token. */
import { log } from './log.js'

const MAX_AGENT = 300

/** `<time> INFO  [security] <event> {...}`: the details as JSON, so nothing a visitor sends can break the line. */
export function securityLog(req, event, details = {}) {
	const from = req ? {
		ip: req.ip,
		// the address the forwarding proxy names, when it differs from the one trusted above
		...(req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'] !== req.ip ? { forwardedFor: String(req.headers['x-forwarded-for']) } : {}),
		agent: String(req.headers['user-agent'] ?? '').slice(0, MAX_AGENT),
		route: `${req.method} ${req.originalUrl.replace(/\/(reset|confirm|stop|mcp)\/[^/?#]+/, '/$1/***')}`,
		...(req.user ? { userId: req.user.id, email: req.user.email } : {})
	} : { by: 'server command' }
	log.info('security', `${event} ${JSON.stringify({ ...from, ...details })}`)
}
