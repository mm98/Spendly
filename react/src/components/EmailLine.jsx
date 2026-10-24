import { join, pick, reject } from './variants.js'

const TONE = { plain: null, meta: 'sp-meta', nav: 'sp-nav-item__sub' }

/** An email on one line (9c, 11a): the part before the @ shortens and the @domain never does,
    since the domain says which account it is. Inside a sentence an email is .sp-break instead.
    @param {object} props
    @param {string} props.email The address, kept on one line. When it does not fit, the part before the @ is cut first.
    @param {keyof typeof TONE} [props.tone] `plain` in the body text colour, `meta` in grey, `nav` as the second line of a menu row. */
export function EmailLine({ email, tone = 'plain', ...rest }) {
	reject(rest, 'EmailLine')
	const at = email.lastIndexOf('@')
	return (
		<span className={join(pick(TONE, tone, 'tone', 'EmailLine'), 'sp-email-line')}>
			<span className="sp-email-line__local">{at > 0 ? email.slice(0, at) : email}</span>
			{at > 0 ? <span className="sp-email-line__domain">{email.slice(at)}</span> : null}
		</span>
	)
}
