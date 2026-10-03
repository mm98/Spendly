import { useRouteError } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { Empty, EmptyBody, EmptyTitle } from '../components/Utilities.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { useShellShape } from './useMedia.js'

const words = error => (error?.status === 404
	? { title: 'This page does not exist', body: 'The address may be old, or the record was deleted.' }
	: { title: 'This page could not be shown', body: 'Reload the page to try again. If it happens again, Spendly may be down.' })

const reload = () => window.location.reload()

/** What a page that failed to load shows in its place, inside the shell. */
export function RouteError() {
	const { title, body } = words(useRouteError())
	return (
		<Empty>
			<Mark size="medium" fill="none" aria-label="Problem"><Icon name="alert-circle" /></Mark>
			<EmptyTitle>{title}</EmptyTitle>
			<EmptyBody>{body}</EmptyBody>
			<Button variant="outline" onClick={reload}>Reload</Button>
		</Empty>
	)
}

/** The same when the shell itself could not be shown: the centred card of 20e's first level,
    with the brand on it, since nothing else on screen carries it. */
export function ShellError() {
	const { title, body } = words(useRouteError())
	const touch = useShellShape() === 'touch'
	return (
		<main className={touch ? 'sp-auth sp-touch' : 'sp-auth'}>
			<Card variant="float">
				<div className="sp-stack sp-gap-12 sp-center au-centred">
					<Mark size="large" fill="solid" aria-label="Spendly"><span>S</span></Mark>
					<div className="sp-stack sp-gap-6">
						<span className="sp-heading">{title}</span>
						<span className="sp-data">{body}</span>
					</div>
				</div>
				<Button size="small" fullWidth onClick={reload}>Reload</Button>
			</Card>
		</main>
	)
}
