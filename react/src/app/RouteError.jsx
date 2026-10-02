import { useRouteError } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Empty, EmptyBody, EmptyTitle } from '../components/Utilities.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'

/** What a page that failed to load shows in place of itself. */
export function RouteError() {
	const error = useRouteError()
	const missing = error?.status === 404
	return (
		<Empty>
			<Mark size="medium" fill="none" aria-label="Problem"><Icon name="alert-circle" /></Mark>
			<EmptyTitle>{missing ? 'This page does not exist' : 'This page could not be shown'}</EmptyTitle>
			<EmptyBody>{missing ? 'The address may be old, or the record was deleted.' : 'Reload the page to try again. If it happens again, the server may be down.'}</EmptyBody>
			<Button variant="outline" onClick={() => window.location.reload()}>Reload</Button>
		</Empty>
	)
}
