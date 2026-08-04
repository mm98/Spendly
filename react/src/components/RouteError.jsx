import { useRouteError } from 'react-router'
import { Card, CardBody, EmptyState } from './Card.jsx'
import { Button } from './Button.jsx'

/** The route's own `errorElement` (see routes.jsx). Without one, a throw during render --
    an unknown icon name, anything else uncaught -- takes the whole app to a blank white
    screen: React unmounts every component above the nearest error boundary, and this router
    had none. Reloading is the only recovery offered because the error is a bug, not a state
    the app can route around; the message stays generic since the reader is not the person
    who can act on a stack trace. */
export function RouteError() {
	const error = useRouteError()
	if (import.meta.env.DEV) console.error(error)
	return (
		<Card>
			<CardBody>
				<EmptyState icon="alert">
					<p>Something went wrong loading this page.</p>
					<Button variant="outline" onClick={() => window.location.reload()}>Reload</Button>
				</EmptyState>
			</CardBody>
		</Card>
	)
}
