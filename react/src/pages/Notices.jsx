import { useEffect } from 'react'
import { Link, useMatches } from 'react-router'
import { Card } from '../components/Card.jsx'
import { Mark } from '../components/Mark.jsx'
import { Skeleton } from '../components/Utilities.jsx'
import { useShellShape } from '../app/useMedia.js'
import { useAuthOptions } from './AuthParts.jsx'
import { phrase, usePhrase } from '../language/phrases.js'

/* The terms and the privacy notice that Create your account links to, for a copy whose operator
   has set no pages of their own. Each sentence states what this app does, nothing more. */

function Part({ title, children }) {
	return (
		<div className="sp-stack sp-gap-6">
			<span className="sp-title">{title}</span>
			{children}
		</div>
	)
}

function Notice({ title, lead, children }) {
	const shape = useShellShape()
	const named = useMatches().at(-1)?.handle?.title
	useEffect(() => { if (named) document.title = `${phrase(named)} - Spendly` }, [named])
	return (
		<main className={shape === 'touch' ? 'sp-auth sp-touch' : 'sp-auth'}>
			<Card variant="float">
				<div className="sp-stack sp-gap-12 sp-center au-centred">
					<Mark size="large" fill="solid" aria-label="Spendly"><span>S</span></Mark>
					<div className="sp-stack sp-gap-6">
						<span className="sp-heading">{title}</span>
						<span className="sp-data">{lead}</span>
					</div>
				</div>
				{children}
				<span className="sp-data sp-center">
					<Link className="sp-strong sp-ink-accent au-across" to="/register">{phrase('page.createYourAccount')}</Link>
				</span>
			</Card>
		</main>
	)
}

export function Terms() {
	const phrase = usePhrase()
	return (
		<Notice title={phrase('page.termsOfUse')} lead={phrase('notice.terms.lead')}>
			<Part title={phrase('notice.terms.whoTitle')}>
				<span className="sp-data">{phrase('notice.terms.who')}</span>
			</Part>
			<Part title={phrase('notice.terms.accountTitle')}>
				<span className="sp-data">{phrase('notice.terms.account')}</span>
			</Part>
			<Part title={phrase('notice.terms.addTitle')}>
				<span className="sp-data">{phrase('notice.terms.add')}</span>
			</Part>
		</Notice>
	)
}

export function Privacy() {
	const phrase = usePhrase()
	const options = useAuthOptions()
	return (
		<Notice title={phrase('page.privacyNotice')} lead={phrase('notice.privacy.lead')}>
			<Part title={phrase('notice.privacy.keptTitle')}>
				<span className="sp-data">{phrase('notice.privacy.kept')}</span>
			</Part>
			<Part title={phrase('notice.privacy.whereTitle')}>
				<span className="sp-data">{phrase('notice.privacy.where')}</span>
			</Part>
			<Part title={phrase('notice.privacy.leavesTitle')}>
				{options
					? (
						<span className="sp-data">
							{[
								...(options.receiptReading ? [phrase('notice.privacy.receiptScan'), phrase('notice.privacy.receiptRate')] : [phrase('notice.privacy.receiptNone')]),
								phrase('notice.privacy.bookmark'),
								...(options.mail ? [phrase('notice.privacy.mail')] : [])
							].join(' ')}
						</span>
					)
					: <Skeleton shape="line" />}
			</Part>
			<Part title={phrase('notice.privacy.cookiesTitle')}>
				<span className="sp-data">{phrase('notice.privacy.cookies')}</span>
			</Part>
		</Notice>
	)
}
