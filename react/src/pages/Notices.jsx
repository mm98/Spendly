import { useEffect } from 'react'
import { Link, useMatches } from 'react-router'
import { Card } from '../components/Card.jsx'
import { Mark } from '../components/Mark.jsx'
import { Skeleton } from '../components/Utilities.jsx'
import { useShellShape } from '../app/useMedia.js'
import { useAuthOptions } from './AuthParts.jsx'

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
	useEffect(() => { if (named) document.title = `${named} - Spendly` }, [named])
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
					<Link className="sp-strong sp-ink-accent au-across" to="/register">Create your account</Link>
				</span>
			</Card>
		</main>
	)
}

export function Terms() {
	return (
		<Notice title="Terms of use" lead="The rules for an account on this copy of Spendly.">
			<Part title="Who runs it">
				<span className="sp-data">This copy of Spendly runs on a server that a person set up and looks after. That person decides who can have an account here. If they gave you terms of their own, those apply too.</span>
			</Part>
			<Part title="Your account">
				<span className="sp-data">The account is for your own records. Keep your password to yourself. If someone else learns it, change it in Settings.</span>
			</Part>
			<Part title="What you add">
				<span className="sp-data">The orders, receipts and other records you add are yours. You can change or delete them at any time.</span>
			</Part>
		</Notice>
	)
}

export function Privacy() {
	const options = useAuthOptions()
	return (
		<Notice title="Privacy notice" lead="What Spendly keeps about you, and where it goes.">
			<Part title="What is kept">
				<span className="sp-data">Your email. Your name and picture, if you add them. Your password, kept in a scrambled form that cannot be turned back into the password. And everything you add: orders, receipts, vendors, categories, bookmarks and budgets.</span>
			</Part>
			<Part title="Where it is kept">
				<span className="sp-data">In one database on the server that runs this copy of Spendly. The person who looks after that server can open the database.</span>
			</Part>
			<Part title="What leaves the server">
				{options
					? (
						<span className="sp-data">
							{options.receiptReading
								? 'When you scan a receipt, its picture is sent to Anthropic, the company that makes Claude, so the text on it can be read. '
									+ 'If the receipt is in another currency, the receipt\'s currency, your own currency and the receipt\'s date are sent to frankfurter.dev to find that day\'s exchange rate. Nothing else from the receipt is sent there. '
								: 'Receipts are not sent anywhere. '}
							When you add a bookmark with a web address, the server opens that address to read the page's name and picture.
							{options.mail ? ' Links to confirm your email or to reset your password are sent to your email address, through the email service this server uses.' : ''}
						</span>
					)
					: <Skeleton shape="line" />}
			</Part>
			<Part title="Cookies">
				<span className="sp-data">One cookie keeps you signed in. Your browser also remembers a few display choices on this device. There is no advertising and no tracking.</span>
			</Part>
		</Notice>
	)
}
